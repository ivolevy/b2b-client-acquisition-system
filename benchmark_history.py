import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv('backend/.env')

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing credentials")
    exit(1)

supabase: Client = create_client(url, key)

print("Finding user with most search history...")
try:
    # Grab the latest row from search_history to pick a user_id
    response = supabase.table("search_history").select("user_id").limit(1).order("created_at", desc=True).execute()
    
    if not response.data:
        print("No search history found at all.")
        exit(0)
        
    user_id = response.data[0]['user_id']
    print(f"Testing with User ID: {user_id}")
    
    # Benchmark
    start_time = time.time()
    print("Executing query...")
    
    # Simulate the frontend query
    history = supabase.table("search_history")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()
        
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"Query completed in {duration:.4f} seconds")
    print(f"Rows returned: {len(history.data)}")
    
except Exception as e:
    print(f"Error: {e}")
