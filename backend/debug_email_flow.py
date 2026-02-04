
import os
import asyncio
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current dir to path if needed (for when running directly)
import sys
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Load env from the typical backend locations
env_local_path = os.path.join(current_dir, '.env.local')
env_path = os.path.join(current_dir, '.env')

print(f"Loading env from: {env_local_path}")
load_dotenv(env_local_path)
load_dotenv(env_path)

async def test_flow():
    print("--- Starting Debug Flow (Full Integration) ---")
    
    # 1. Check SMTP Config
    smtp_pass = os.getenv('SMTP_PASSWORD')
    if not smtp_pass:
        print("❌ CRITICAL: SMTP_PASSWORD not found")
        return

    # 2. Test registrar_pago_exitoso
    print("\nTesting registrar_pago_exitoso...")
    try:
        from backend.db_supabase import registrar_pago_exitoso
        import uuid
        
        # Use a random new email to trigger is_new_user=True
        # We need a domain that passes basic validation
        random_suffix = uuid.uuid4().hex[:6]
        test_email = f"test_full_{random_suffix}@gmail.com"
        
        print(f"Simulating payment for NEW user: {test_email}")
        
        # simulate webhook data
        await registrar_pago_exitoso(
            user_id='anonymous', # Trigger search/create
            plan_id='starter',
            amount=1500.0,
            external_id=f"debug_{random_suffix}",
            email=test_email,
            name="Test Debug User",
            phone="1122334455"
        )
        print("✅ registrar_pago_exitoso completed (Check logs for email sending)")
        
    except Exception as e:
        print(f"❌ Error in registrar_pago_exitoso: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_flow())
