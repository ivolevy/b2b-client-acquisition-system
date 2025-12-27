
import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def verify_schema():
    if not url or not key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return

    supabase: Client = create_client(url, key)
    
    print("Checking 'promo_codes' table...")
    try:
        response = supabase.table("promo_codes").select("*").limit(1).execute()
        print("Success! Table 'promo_codes' exists.")
        print(f"Data sample: {response.data}")
        
    except Exception as e:
        print(f"Error checking 'promo_codes': {e}")
        # Check specifically if it's a 'relation does not exist' error
        if "relation" in str(e) and "does not exist" in str(e):
             print("\nCONCLUSION: The database schema is missing. The 'supabase_admin_system.sql' script has not been run.")
        else:
             print("\nCONCLUSION: An unexpected error occurred.")

    print("\nChecking 'activate_subscription_with_code' RPC...")
    try:
        # Try to call it with dummy data just to see if it exists (it might fail validation, but shouldn't 404)
        response = supabase.rpc("activate_subscription_with_code", {"p_user_id": "00000000-0000-0000-0000-000000000000", "p_code": "TEST"}).execute()
        print("RPC 'activate_subscription_with_code' exists (call completed).")
    except Exception as e:
        print(f"RPC check failed: {e}")
        if "function" in str(e) and "does not exist" in str(e):
             print("\nCONCLUSION: The RPC function is missing.")


if __name__ == "__main__":
    asyncio.run(verify_schema())
