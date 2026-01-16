
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

user_id = "70b45ff3-4dfa-47be-b147-5a5c6b42d490"

print(f"Checking search_history for user: {user_id}")

try:
    response = supabase.table("users").select("id, email, name, plan").limit(20).execute()
    print(f"Found {len(response.data)} users")
    for row in response.data:
        print(f"- {row['email']} (ID: {row['id']}, Plan: {row['plan']})")
except Exception as e:
    print(f"Error listing users: {e}")
