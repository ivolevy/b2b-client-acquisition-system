from fastapi import Request, HTTPException, Depends
import logging

try:
    from backend.db_supabase import get_supabase, get_supabase_admin
except ImportError:
    from db_supabase import get_supabase, get_supabase_admin

logger = logging.getLogger(__name__)

async def get_current_admin(request: Request):
    """
    Dependencia para validar que el usuario es admin.
    Valida la presencia del Bearer token y el rol del usuario.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.error("Falta header de Authorization o formato inválido en endpoint admin")
        raise HTTPException(status_code=401, detail="Header de Authorization faltante o inválido")
    
    token = auth_header.split(" ")[1]
    
    try:
        supabase = get_supabase()
        if not supabase:
             raise HTTPException(status_code=500, detail="Error de conexión con la base de datos")
             
        # Verificar el token con Supabase
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Token inválido o expirado")
            
        user_id = user_res.user.id
        
        # Consultar el rol del usuario en public.users
        admin_client = get_supabase_admin()
        profile_res = admin_client.table('users').select('role').eq('id', user_id).single().execute()
        
        if not profile_res.data or profile_res.data.get('role') != 'admin':
            logger.warning(f"Intento de acceso denegado a admin: {user_res.user.email} (Rol: {profile_res.data.get('role') if profile_res.data else 'N/A'})")
            raise HTTPException(status_code=403, detail="Acceso denegado: Se requieren privilegios de administrador")
            
        return {"role": "admin", "user_id": user_id, "email": user_res.user.email}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando privilegios de admin: {e}")
        raise HTTPException(status_code=500, detail="Error interno al validar permisos")
