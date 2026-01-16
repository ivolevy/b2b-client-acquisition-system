
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Testing query with None (undefined) user_id")
try:
    response = supabase.table("search_history").select("*").eq("user_id", None).execute()
    print(f"Response with None: {len(response.data)} records")
except Exception as e:
    print(f"Error with None: {e}")

print("\nTesting query with invalid UUID")
try:
    response = supabase.table("search_history").select("*").eq("user_id", "not-a-uuid").execute()
    print(f"Response with invalid UUID: {len(response.data)} records")
except Exception as e:
    print(f"Error with invalid UUID: {e}")
