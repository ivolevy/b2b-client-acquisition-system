import logging
import threading
import json
from datetime import datetime
from typing import Dict, Any

from backend.db_supabase import get_supabase_admin

logger = logging.getLogger(__name__)

def process_email_triggers_async(user_id: str, conversation_id: str, msg_data: Dict[str, Any]):
    """
    Kicks off the trigger evaluation in a background thread to avoid blocking the main server/sync.
    """
    thread = threading.Thread(
        target=_evaluate_email_triggers,
        args=(user_id, conversation_id, msg_data),
        daemon=True
    )
    thread.start()

def _evaluate_email_triggers(user_id: str, conversation_id: str, msg_data: Dict[str, Any]):
    """
    Actual logic running in background.
    """
    try:
        admin = get_supabase_admin()
        
        # 1. Fetch active rules for the user on 'email_received'
        rules_res = admin.table("automation_rules")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .eq("trigger_event", "email_received")\
            .execute()
            
        rules = rules_res.data
        if not rules:
            return  # No rules, nothing to do
            
        # Optimization: only run AI once if any rule requires ai_intent
        needs_ai = any(r.get('condition_type') == 'ai_intent' for r in rules)
        detected_intent = None
        
        if needs_ai:
            from backend.ai_service import classify_email_intent
            body = msg_data.get('body_text') or msg_data.get('snippet') or ""
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
                    body = (msg_data.get('body_text') or msg_data.get('snippet') or "").lower()
                    if keyword in body:
                        match = True
                
                if match:
                    _execute_action(user_id, conversation_id, msg_data, rule, admin)
            except Exception as rule_e:
                logger.error(f"Error ejecutando regla {rule.get('id')}: {rule_e}")
                _log_execution(admin, rule.get('id'), user_id, msg_data, "error", str(rule_e))

    except Exception as e:
        logger.error(f"Error in background trigger evaluation: {e}")

def _execute_action(user_id: str, conversation_id: str, msg_data: Dict[str, Any], rule: Dict[str, Any], admin: Any):
    action_type = rule.get('action_type')
    action_payload = rule.get('action_payload', {})
    
    logger.info(f"Executing action {action_type} for rule {rule.get('id')}")
    
    try:
        if action_type == 'change_status':
            new_status = action_payload.get('status')
            if new_status:
                admin.table("email_conversations").update({"status": new_status}).eq("id", conversation_id).execute()
                
        elif action_type == 'send_template':
            template_id = action_payload.get('template_id')
            if template_id:
                # Need to use email_service to send it
                from backend.email_service import enviar_email
                # We would fetch the company details from the conversation
                conv_res = admin.table("email_conversations").select("lead_email, lead_name").eq("id", conversation_id).execute()
                if conv_res.data:
                    lead_email = conv_res.data[0]['lead_email']
                    enviar_email(
                        empresa_id=None, # Not strictly tied to an empresa in some flows
                        template_id=template_id,
                        user_id=user_id,
                        empresa_data={"email": lead_email, "nombre": conv_res.data[0]['lead_name']}
                    )
        
        # Log success
        _log_execution(admin, rule.get('id'), user_id, msg_data, "success", None)
    except Exception as e:
        logger.error(f"Fallo ejecutando accion {action_type}: {e}")
        _log_execution(admin, rule.get('id'), user_id, msg_data, "error", str(e))
        raise

def _log_execution(admin, rule_id, user_id, msg_data, status, error_msg):
    try:
        admin.table("automation_logs").insert({
            "rule_id": rule_id,
            "user_id": user_id,
            "event_type": "email_received",
            "event_payload": json.dumps({"sender": msg_data.get('sender')}),
            "execution_status": status,
            "error_message": error_msg
        }).execute()
    except Exception as log_e:
        logger.error(f"Failed to log automation execution: {log_e}")
