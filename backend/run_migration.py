import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
    sys.exit(1)

# Unfortunately supabase-py does not have a direct sql() executor
# We must use an RPC if available or REST API
import requests

with open("migrations/05_search_tasks_and_triggers.sql", "r") as f:
    sql_script = f.read()
    
# We will use the REST API to execute SQL if PostgREST allows it, 
# but typically Supabase restricts raw SQL from the REST API.
# So we ask the user to run it via the Supabase Dashboard SQL Editor
print("PLEASE RUN THE SQL SCRIPT IN THE SUPABASE SQL EDITOR DIRECTLY")

