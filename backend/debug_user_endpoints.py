
from fastapi import APIRouter, HTTPException
from backend.db_supabase import get_supabase_admin, execute_with_retry
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/debug/user/{email}")
async def debug_user(email: str):
    client = get_supabase_admin()
    if not client:
        raise HTTPException(status_code=500, detail="No admin client")
    
    # Check Auth
    try:
        # list_users returns a list directly in this version based on previous logs
        auth_users = client.auth.admin.list_users()
        user_auth = next((u for u in auth_users if u.email == email), None)
    except Exception as e:
        logger.error(f"Error listing auth users: {e}")
        return {"error": str(e)}
    
    auth_data = {}
    public_data = {}
    payments = []
    
    if user_auth:
        auth_data = {
            "id": user_auth.id,
            "email": user_auth.email,
            "confirmed_at": getattr(user_auth, 'confirmed_at', None)
        }
    
        # Check Public Users
        res = execute_with_retry(lambda c: c.table('users').select('*').eq('id', user_auth.id), is_admin=True)
        if res.data:
            public_data = res.data[0]
            
        # Check Payments
        p_res = execute_with_retry(lambda c: c.table('payments').select('*').eq('user_id', user_auth.id).order('created_at', desc=True).limit(5), is_admin=True)
        if p_res.data:
            payments = p_res.data
    else:
        auth_data = {"error": "User not found in Auth"}

    return {
        "auth": auth_data,
        "public": public_data,
        "recent_payments": payments
    }

@router.post("/api/debug/fix-status/{email}")
async def fix_user_status(email: str, plan: str = "growth"):
    client = get_supabase_admin()
    auth_users = client.auth.admin.list_users()
    user_auth = next((u for u in auth_users if u.email == email), None)
    
    if not user_auth:
         raise HTTPException(status_code=404, detail="User not found")
         
    # Force update
    execute_with_retry(lambda c: c.table('users').update({
        "subscription_status": "active",
        "plan": plan,
        "credits": 5000 if plan == 'growth' else 1500
    }).eq('id', user_auth.id), is_admin=True)
    
    return {"status": "fixed", "user_id": user_auth.id, "new_plan": plan}
