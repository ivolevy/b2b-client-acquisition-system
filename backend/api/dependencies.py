from fastapi import Request, HTTPException, Depends
import logging
from typing import Dict, Any

try:
    from backend.db_supabase import get_supabase, get_supabase_admin, SUPABASE_URL, SUPABASE_ANON_KEY
    from supabase import create_client, ClientOptions
except ImportError:
    from db_supabase import get_supabase, get_supabase_admin, SUPABASE_URL, SUPABASE_ANON_KEY
    from supabase import create_client, ClientOptions

logger = logging.getLogger(__name__)

async def get_current_user_client(request: Request) -> Dict[str, Any]:
    """
    Dependencia que extrae el Bearer token, lo valida, y crea un cliente Supabase
    efímero autenticado como el usuario, para hacer cumplir RLS en la base de datos.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Header de Authorization faltante o inválido")
    
    token = auth_header.split(" ")[1]
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Credenciales de base de datos no configuradas")
    
    try:
        # Inyectar el token Bearer en los headers del cliente para RLS
        opts = ClientOptions(
            headers={'Authorization': f'Bearer {token}'},
            postgrest_client_timeout=20
        )
        user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY, options=opts)
        
        # Opcionalmente, podemos pedir el usuario actual para validar el token y obtener el ID
        user_res = user_client.auth.get_user()
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Token inválido o expirado")
            
        return {
            "client": user_client,
            "user_id": user_res.user.id,
            "email": user_res.user.email
        }
    except Exception as e:
        logger.error(f"Error verificando token de usuario: {e}")
        raise HTTPException(status_code=401, detail="No autorizado")

async def get_current_admin(request: Request):
    """
    Dependencia para validar que el usuario es admin.
    Valida la presencia del Bearer token y el rol del usuario.
    """
    user_data = await get_current_user_client(request)
    user_id = user_data["user_id"]
    
    try:
        # Consultar el rol del usuario en public.users
        admin_client = get_supabase_admin()
        profile_res = admin_client.table('users').select('role').eq('id', user_id).single().execute()
        
        if not profile_res.data or profile_res.data.get('role') != 'admin':
            logger.warning(f"Intento de acceso denegado a admin: {user_data['email']}")
            raise HTTPException(status_code=403, detail="Acceso denegado: Se requieren privilegios de administrador")
            
        return {"role": "admin", "user_id": user_id, "email": user_data["email"], "client": user_data["client"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando privilegios de admin: {e}")
        raise HTTPException(status_code=500, detail="Error interno al validar permisos")
