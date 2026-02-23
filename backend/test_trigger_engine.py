import os
import sys
import time
import json
from dotenv import load_dotenv

# Add the project root to sys.path so we can import backend packages
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from backend.db_supabase import get_supabase_admin
from backend.trigger_service import _evaluate_email_triggers

def test_engine():
    print("Iniciando prueba del motor de Triggers...")
    admin = get_supabase_admin()
    
    # 1. Get a random user
    user_res = admin.table("users").select("id").limit(1).execute()
    if not user_res.data:
        print("No users found to test with.")
        return
    user_id = user_res.data[0]['id']
    print(f"Usando usuario: {user_id}")
    
    # 2. Create a dummy conversation
    conv_data = {
        "user_id": user_id,
        "lead_email": "test_trigger@example.com",
        "lead_name": "Test Trigger",
        "subject": "Testing AI Trigger",
        "status": "open",
        "channel": "email"
    }
    conv_res = admin.table("email_conversations").insert(conv_data).execute()
    conversation_id = conv_res.data[0]['id']
    print(f"Conversación creada: {conversation_id}")
    
    # 3. Create a test automation rule
    rule_data = {
        "user_id": user_id,
        "name": "TEST AI RULE",
        "trigger_event": "email_received",
        "condition_type": "ai_intent",
        "condition_value": {"intent": "PIDE_PRECIO"},
        "action_type": "change_status",
        "action_payload": {"status": "interested"},
        "is_active": True
    }
    rule_res = admin.table("automation_rules").insert(rule_data).execute()
    rule_id = rule_res.data[0]['id']
    print(f"Regla de automatización creada: {rule_id}")
    
    # 4. Simulate incoming email that triggers rule
    # The condition is PIDE_PRECIO. We need the AI to classify it as such.
    # The prompt says "El usuario envió este correo: '{body}'..."
    # The body needs to be obviously asking for a price.
    msg_data = {
        "sender": "test_trigger@example.com",
        "recipient": "agency@example.com",
        "direction": "inbound",
        "body_text": "Hola, necesito que me pases el precio de tus servicios. Cuanto cuesta el plan mensual?",
        "date": "2026-02-20T12:00:00"
    }
    
    # Run evaluation synchronously for the test
    print("Ejecutando evaluación de triggers (mockeando el thread)....")
    _evaluate_email_triggers(user_id, conversation_id, msg_data)
    
    # 5. Verify the results
    time.sleep(2) # just in case DB needs a moment
    
    # Verify log
    log_res = admin.table("automation_logs").select("*").eq("rule_id", rule_id).execute()
    print("Logs generados:")
    for log in log_res.data:
        print(f" - {log['execution_status']}: {log.get('error_message')}")
        
    # Verify conversation status
    check_conv = admin.table("email_conversations").select("status").eq("id", conversation_id).execute()
    new_status = check_conv.data[0]['status']
    print(f"El estado de la conversación cambió a: {new_status}")
    
    if new_status == 'interested':
        print("✅ SUCCESS: El trigger de IA detectó la intención y cambió el estado correctamente.")
    else:
        print("❌ FAILED: El estado no cambió al esperado.")
        
    # 6. Cleanup
    admin.table("automation_rules").delete().eq("id", rule_id).execute()
    admin.table("email_conversations").delete().eq("id", conversation_id).execute()
    print("Test finalizado y entorno limpiado.")

if __name__ == "__main__":
    test_engine()
