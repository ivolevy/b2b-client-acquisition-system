import logging
import asyncio
import json
from datetime import datetime
from typing import Dict, Any

from backend.db_supabase import get_supabase_admin

logger = logging.getLogger(__name__)

def process_triggers_async(user_id: str, trigger_event: str, conversation_id: str = None, lead_data: Dict[str, Any] = None):
    """
    Kicks off the trigger evaluation. In Vercel serverless, 
    we use asyncio.create_task which has a slightly better chance of surviving 
    the request lifecycle compared to raw threading.Thread.
    - trigger_event: 'email_received', 'lead_extracted', 'lead_saved'
    """
    try:
        loop = asyncio.get_running_loop()
        # Schedule the evaluation on the asyncio event loop
        loop.run_in_executor(
            None, 
            _evaluate_rules, 
            user_id, 
            trigger_event, 
            conversation_id, 
            lead_data
        )
    except RuntimeError:
        # Fallback if no event loop is running
        import threading
        thread = threading.Thread(
            target=_evaluate_rules,
            args=(user_id, trigger_event, conversation_id, lead_data),
            daemon=True
        )
        thread.start()

def _evaluate_rules(user_id: str, trigger_event: str, conversation_id: str = None, lead_data: Dict[str, Any] = None):
    """
    Actual logic running in background.
    """
    try:
        admin = get_supabase_admin()
        
        # 1. Fetch active rules for the user and specific event
        rules_res = admin.table("automation_rules")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .eq("trigger_event", trigger_event)\
            .execute()
            
        rules = rules_res.data
        if not rules:
            return 
            
        # Optimization: only run AI once if any rule requires ai_intent
        needs_ai = any(r.get('condition_type') == 'ai_intent' for r in rules)
        detected_intent = None
        
        if needs_ai and trigger_event == "email_received" and lead_data:
            from backend.ai_service import classify_email_intent
            body = lead_data.get('body_text') or lead_data.get('snippet') or ""
            try:
                allowed_intents = set()
                for r in rules:
                    if r.get('condition_type') == 'ai_intent':
                        condition_val = r.get('condition_value', {})
                        if isinstance(condition_val, dict) and 'intent' in condition_val:
                            allowed_intents.add(condition_val['intent'].strip().upper())
                
                detected_intent = classify_email_intent(body, list(allowed_intents))
                logger.info(f"Trigger AI detectó intención: {detected_intent}")
            except Exception as ai_e:
                logger.error(f"Error clasificando intent para trigger: {ai_e}")
                detected_intent = "ERROR"

        # 2. Evaluate each rule
        for rule in rules:
            try:
                condition_type = rule.get('condition_type')
                condition_value = rule.get('condition_value', {})
                match = False
                
                if condition_type == 'ai_intent':
                    target_intent = (condition_value.get('intent') or "").upper()
                    if detected_intent == target_intent:
                        match = True
                        
                elif condition_type == 'keyword':
                    keyword = (condition_value.get('keyword') or "").lower()
                    
                    # Search context depends on trigger
                    content_to_search = ""
                    if trigger_event == 'email_received' and lead_data:
                        content_to_search = (lead_data.get('body_text') or lead_data.get('snippet') or "")
                    elif trigger_event in ['lead_extracted', 'lead_saved'] and lead_data:
                        content_to_search = f"{lead_data.get('nombre', '')} {lead_data.get('rubro', '')} {lead_data.get('descripcion', '')}"
                    
                    if keyword in content_to_search.lower():
                        match = True
                
                elif condition_type == 'no_condition' or not condition_type:
                    match = True
                
                if match:
                    _execute_action(user_id, conversation_id, lead_data, rule, admin)
            except Exception as rule_e:
                logger.error(f"Error ejecutando regla {rule.get('id')}: {rule_e}")
                _log_execution(admin, rule.get('id'), user_id, lead_data, trigger_event, "error", str(rule_e))

    except Exception as e:
        logger.error(f"Error in background trigger evaluation: {e}")

    except Exception as e:
        logger.error(f"Error in background trigger evaluation: {e}")

def _execute_action(user_id: str, conversation_id: str, lead_data: Dict[str, Any], rule: Dict[str, Any], admin: Any):
    action_type = rule.get('action_type')
    action_payload = rule.get('action_payload', {})
    trigger_event = rule.get('trigger_event')
    
    logger.info(f"Executing action {action_type} for rule {rule.get('id')}")
    
    try:
        if action_type == 'change_status':
            new_status = action_payload.get('status')
            if new_status and conversation_id:
                admin.table("email_conversations").update({"status": new_status}).eq("id", conversation_id).execute()
                
        elif action_type == 'send_template' or action_type == 'send_email':
            template_id = action_payload.get('template_id')
            if template_id:
                from backend.email_service import enviar_email_empresa
                
                # Fetch template details
                temp_res = admin.table("email_templates").select("*").eq("id", template_id).execute()
                if not temp_res.data:
                    logger.error(f"Template {template_id} not found for trigger action")
                    return
                
                template = temp_res.data[0]
                
                target_email = None
                target_name = None
                icebreaker = ""
                
                if conversation_id:
                    conv_res = admin.table("email_conversations").select("lead_email, lead_name").eq("id", conversation_id).execute()
                    if conv_res.data:
                        target_email = conv_res.data[0]['lead_email']
                        target_name = conv_res.data[0]['lead_name']
                elif lead_data:
                    target_email = lead_data.get('email')
                    target_name = lead_data.get('nombre')
                    icebreaker = lead_data.get('icebreaker', '')
                
                if target_email:
                    enviar_email_empresa(
                        empresa={"email": target_email, "nombre": target_name or "Prospecto", "icebreaker": icebreaker},
                        template=template,
                        user_id=user_id
                    )
        
        elif action_type == 'send_whatsapp':
            # Implementación placeholder para seguimiento o tarea manual
            logger.info(f"WhatsApp Trigger: Logueando tarea manual de envío para {lead_data.get('nombre')}")

        # Log success
        _log_execution(admin, rule.get('id'), user_id, lead_data, trigger_event, "success", None)
    except Exception as e:
        logger.error(f"Fallo ejecutando accion {action_type}: {e}")
        _log_execution(admin, rule.get('id'), user_id, lead_data, trigger_event, "error", str(e))
        raise

def _log_execution(admin, rule_id, user_id, lead_data, event_type, status, error_msg):
    try:
        sender_info = "Unknown"
        if lead_data:
            sender_info = lead_data.get('sender') or lead_data.get('nombre') or lead_data.get('email') or "Unknown"

        admin.table("automation_logs").insert({
            "rule_id": rule_id,
            "user_id": user_id,
            "event_type": event_type,
            "event_payload": json.dumps({"sender": sender_info}),
            "execution_status": status,
            "error_message": error_msg
        }).execute()
    except Exception as log_e:
        logger.error(f"Failed to log automation execution: {log_e}")
