import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict

try:
    from backend.api.schemas import SearchHistoryRequest, UserRubrosRequest
    from backend.db_supabase import (
        get_user_credits, check_reset_monthly_credits, cancel_user_plan,
        get_search_history, save_search_history, delete_search_history,
        get_supabase_admin, execute_with_retry
    )
    from backend.api.dependencies import get_current_admin
    from backend.rubros_config import listar_rubros_disponibles
except ImportError:
    from api.schemas import SearchHistoryRequest, UserRubrosRequest
    from db_supabase import (
        get_user_credits, check_reset_monthly_credits, cancel_user_plan,
        get_search_history, save_search_history, delete_search_history,
        get_supabase_admin, execute_with_retry
    )
    from api.dependencies import get_current_admin
    from rubros_config import listar_rubros_disponibles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/{user_id}/credits")
async def api_get_user_credits(user_id: str):
    """Obtiene créditos y próxima fecha de reset"""
    # Primero verificar si corresponde reset
    check_reset_monthly_credits(user_id)
    return get_user_credits(user_id)

@router.post("/{user_id}/cancel-plan")
async def api_cancel_user_plan(user_id: str):
    """Cancela el plan activo del usuario"""
    success = cancel_user_plan(user_id)
    if not success:
        raise HTTPException(status_code=400, detail="No se pudo cancelar el plan")
    return {"success": True, "message": "Plan cancelado correctamente"}

@router.get("/{user_id}/history")
async def api_get_search_history(user_id: str, limit: int = 10):
    """Obtiene el historial de búsquedas de un usuario"""
    history = get_search_history(user_id, limit)
    return {
        "success": True,
        "user_id": user_id,
        "history": history
    }

@router.post("/history")
async def api_save_search_history(request: SearchHistoryRequest):
    """Guarda una búsqueda en el historial"""
    result = save_search_history(request.user_id, request.dict())
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Error al guardar historial"))
    
    return result

@router.delete("/{user_id}/history/{search_id}")
async def api_delete_search_history(user_id: str, search_id: str):
    """Elimina una entrada del historial"""
    success = delete_search_history(user_id, search_id)
    if not success:
        raise HTTPException(status_code=500, detail="Error al eliminar del historial")
    
    return {"success": True, "message": "Entrada eliminada correctamente"}

@router.get("/{user_id}/rubros")
async def get_user_rubros(user_id: str):
    """Obtiene los rubros seleccionados por el usuario y todos los disponibles"""
    try:
        # Obtener todos los disponibles
        all_rubros = listar_rubros_disponibles()
        
        # Obtener seleccionados de la BD
        client = get_supabase_admin()
        selected_rubros = []
        
        if client:
            # Intentar leer de la tabla user_rubros
            # Asumimos estructura: user_id, rubro_key
            response = client.table('user_rubros').select('rubro_key').eq('user_id', user_id).execute()
            if response.data:
                selected_rubros = [item['rubro_key'] for item in response.data]
        
        return {
            "success": True,
            "all_rubros": all_rubros,
            "selected_rubros": selected_rubros
        }
    except Exception as e:
        logger.error(f"Error obteniendo rubros de usuario {user_id}: {e}")
        # Retornar al menos los disponibles para no romper el frontend
        return {
            "success": True,
            "all_rubros": listar_rubros_disponibles(),
            "selected_rubros": [],
            "error": str(e)
        }

@router.post("/rubros")
async def save_user_rubros(request: UserRubrosRequest):
    """Guarda los rubros seleccionados por el usuario"""
    try:
        client = get_supabase_admin()
        if not client:
            raise HTTPException(status_code=500, detail="Error de conexión a base de datos")
            
        # 1. Eliminar rubros actuales del usuario
        client.table('user_rubros').delete().eq('user_id', request.user_id).execute()
        
        # 2. Insertar nuevos si hay seleccionados
        if request.rubro_keys:
            data_to_insert = [
                {"user_id": request.user_id, "rubro_key": key, "created_at": datetime.now().isoformat()} 
                for key in request.rubro_keys
            ]
            client.table('user_rubros').insert(data_to_insert).execute()
            
        return {"success": True, "message": "Rubros actualizados correctamente"}
    except Exception as e:
        logger.error(f"Error guardando rubros para {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin routes
admin_router = APIRouter(prefix="/api/admin/users", tags=["Admin Users"])

@admin_router.get("")
async def list_users(admin: Dict = Depends(get_current_admin)):
    """Lista todos los usuarios usando Service Role y combina con Auth data"""
    client = None
    try:
        client = get_supabase_admin()
        if not client:
            return {"success": False, "error": "Supabase Admin (Service Role) not configured. Check env vars."}
            
        # 1. Obtener perfiles públicos
        start_time = datetime.now()
        res = execute_with_retry(lambda c: c.table('users').select('*').order('created_at', desc=True).limit(500))
        public_users = res.data
        logger.info(f"[Admin] Public users fetch took: {datetime.now() - start_time}")
        
        # 2. Obtener usuarios de Auth (para asegurar email) solo si es necesario o para los primeros N
        # Nota: list_users() es lento si hay miles. Limitamos a 500 para el dashboard rápido.
        auth_users_map = {}
        try:
            start_auth = datetime.now()
            auth_users_res = client.auth.admin.list_users(page=1, per_page=500)
            
            if hasattr(auth_users_res, 'users'):
                auth_users_list = auth_users_res.users
            elif isinstance(auth_users_res, list):
                auth_users_list = auth_users_res
            else:
                auth_users_list = []

            auth_users_map = {u.id: u.email for u in auth_users_list if hasattr(u, 'id') and hasattr(u, 'email')}
            logger.info(f"[Admin] Auth users fetch took: {datetime.now() - start_auth}")
        except Exception as e_auth:
            logger.error(f"Error fetching auth users: {e_auth}")
        
        # 3. Combinar datos
        final_users = []
        for p_user in public_users:
            user_id = p_user.get('id')
            # Priorizar email de Auth si existe, si no usar el de la tabla pública
            if user_id in auth_users_map:
                p_user['email'] = auth_users_map[user_id]
            
            final_users.append(p_user)
            
        return {"success": True, "users": final_users, "count": len(final_users)}
    except Exception as e:
        import traceback
        error_detail = str(e)
        logger.error(f"Error in /admin/users: {error_detail}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False, 
                "error": error_detail,
                "trace": traceback.format_exc().split('\n')[-5:]
            }
        )
