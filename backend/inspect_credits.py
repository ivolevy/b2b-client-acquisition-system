
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(dotenv_path='/Users/ivanlevy/Desktop/b2b-client-acquisition-system/backend/.env')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"Error: Missing Supabase credentials. URL: {bool(SUPABASE_URL)}, KEY: {bool(SUPABASE_KEY)}")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_user():
    email = "tomilevy2003@gmail.com"
    print(f"Inspecting user: {email}")
    
    try:
        # Get user by email
        res = supabase.table('users').select('*').eq('email', email).execute()
        if not res.data:
            print("User not found.")
            return

        user = res.data[0]
        print(f"ID: {user.get('id')}")
        print(f"Email: {user.get('email')}")
        print(f"Credits: {user.get('credits')}")
        print(f"Plan: {user.get('plan')}")
        print(f"Subscription Status: {user.get('subscription_status')}")
        print(f"Next Reset: {user.get('next_credit_reset')}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_user()
