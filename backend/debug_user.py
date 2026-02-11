
from fastapi import APIRouter, Depends, HTTPException
from backend.db_supabase import get_supabase_admin, execute_with_retry

router = APIRouter()

@router.get("/api/debug/user/{email}")
async def debug_user(email: str):
    client = get_supabase_admin()
    if not client:
        raise HTTPException(status_code=500, detail="No admin client")
    
    # Check Auth
    auth_users = client.auth.admin.list_users()
    user_auth = next((u for u in auth_users if u.email == email), None)
    
    auth_data = {}
    if user_auth:
        auth_data = {
            "id": user_auth.id,
            "email": user_auth.email,
            "confirmed_at": user_auth.confirmed_at
        }
    
    # Check Public Users
    public_data = {}
    if user_auth:
        res = execute_with_retry(lambda c: c.table('users').select('*').eq('id', user_auth.id), is_admin=True)
        if res.data:
            public_data = res.data[0]
            
    # Check Payments
    payments = []
    if user_auth:
        p_res = execute_with_retry(lambda c: c.table('payments').select('*').eq('user_id', user_auth.id).order('created_at', desc=True).limit(5), is_admin=True)
        payments = p_res.data

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
    
    return {"status": "fixed", "user_id": user_auth.id}
