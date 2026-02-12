
import os
import sys
from datetime import datetime

# HARDCODED ENV FOR TEST
os.environ['SUPABASE_URL'] = 'https://uweyfkmvidpfqcpajyje.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZXlma212aWRwZnFjcGFqeWplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI4ODAyNCwiZXhwIjoyMDgxODY0MDI0fQ.NjC7bC3O0SPSIyq8jQezfumJZglkUZNmxzRH_p8JxUs'

# Add the project root to sys.path
sys.path.append('/Users/ivanlevy/Desktop/b2b-client-acquisition-system')

from backend.db_supabase import get_user_credits, check_reset_monthly_credits

user_id = '6debfb04-7442-459d-a40f-1aa7e2dfe1ce'

print(f"--- Checking reset for {user_id} ---")
reset_result = check_reset_monthly_credits(user_id)
print(f"Reset result: {reset_result}")

print(f"\n--- Fetching credits for {user_id} ---")
credits = get_user_credits(user_id)
print(f"Credits result: {credits}")
