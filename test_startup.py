import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    print("Attempting to import app...")
    from backend.main import app
    print("Import successful.")
    
    print("Attempting to initialize DB...")
    from backend.db_supabase import init_db_b2b
    # Mock env vars if needed, but they should be loaded by dotenv inside modules
    # We assume .env exists or we rely on defaults.
    # Note: user environment might not have .env, but code uses os.getenv
    
    conn = init_db_b2b()
    print(f"DB Init result: {conn}")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
