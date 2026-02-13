
import os
import sys
from datetime import datetime
from typing import Dict

# HARDCODED ENV FOR TEST
os.environ['SUPABASE_URL'] = 'https://uweyfkmvidpfqcpajyje.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZXlma212aWRwZnFjcGFqeWplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI4ODAyNCwiZXhwIjoyMDgxODY0MDI0fQ.NjC7bC3O0SPSIyq8jQezfumJZglkUZNmxzRH_p8JxUs'

# Add the project root to sys.path
sys.path.append('/Users/ivanlevy/Desktop/b2b-client-acquisition-system')

from backend.db_supabase import db_log_email_history, get_supabase_admin

user_id = '6debfb04-7442-459d-a40f-1aa7e2dfe1ce'
test_email = 'test_lead_status@example.com'

print(f"--- Testing Communication Status Updates ---")

# 1. Simular envío de email vía campaña
print("\n1. Simulating campaign email send...")
history_data = {
    'empresa_nombre': 'Lead de Prueba',
    'empresa_email': test_email,
    'template_id': None,
    'subject': 'Propuesta de Negocio',
    'status': 'success'
}

success = db_log_email_history(user_id, history_data)
print(f"Log history success: {success}")

# 2. Verificar conversación creada
print("\n2. Verifying conversation status...")
admin = get_supabase_admin()
res = admin.table("email_conversations")\
    .select("*")\
    .eq("user_id", user_id)\
    .eq("lead_email", test_email)\
    .execute()

if res.data:
    conv = res.data[0]
    print(f"Conversation Found: {conv['id']}")
    print(f"Status (Expected: open): {conv['status']}")
    if conv['status'] != 'open':
        print(f"FAILED: Status mismatch")
    print(f"Channel: {conv['channel']}")
    
    # 3. Verificar mensaje creado
    res_msg = admin.table("email_messages").select("*").eq("conversation_id", conv['id']).execute()
    print(f"Messages created: {len(res_msg.data)}")
else:
    print("FAILED: Conversation not created")

# LIMPIEZA
# admin.table("email_conversations").delete().eq("lead_email", test_email).execute()
