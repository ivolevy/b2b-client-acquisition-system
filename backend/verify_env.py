import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
url = os.getenv("SUPABASE_URL")

print(f"URL Present: {bool(url)}")
print(f"Key Present: {bool(key)}")
if key:
    print(f"Key Length: {len(key)}")
    print(f"Key Start: {key[:5]}...")
else:
    print("KEY IS MISSING!")
