
import asyncio
import os
from dotenv import load_dotenv
from backend.db_supabase import get_supabase_admin

load_dotenv()

async def check_duplicates():
    print("Connecting to Supabase...")
    client = get_supabase_admin()
    if not client:
        print("❌ No admin client available.")
        return

    email = "tomilevy2003@gmail.com"
    print(f"Searching for ALL users with email '{email}'...")
    
    try:
        # List all users
        auth_users = client.auth.admin.list_users()
        matches = [u for u in auth_users if u.email == email]
        
        print(f"Found {len(matches)} matches in Auth:")
        for u in matches:
            print(f" - ID: {u.id} | Email: {u.email} | Provider: {u.app_metadata.get('provider') if hasattr(u, 'app_metadata') else 'unknown'} | Last Sign In: {u.last_sign_in_at}")
            
            # Check public data for each
            res = client.table('users').select('*').eq('id', u.id).execute()
            if res.data:
                ud = res.data[0]
                print(f"   [PublicDB] Plan: {ud.get('plan')}, Status: {ud.get('subscription_status')}, Credits: {ud.get('credits')}")
            else:
                print(f"   [PublicDB] ❌ No record in public.users")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_duplicates())
