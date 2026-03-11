import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse

try:
    from backend.api.schemas import *
    from backend.api.dependencies import get_current_admin
    from backend.db_supabase import *
except ImportError:
    pass

logger = logging.getLogger(__name__)

def replace_app(text):
    return text.replace("@app.", "@router.")

router = APIRouter(prefix="/api/admin", tags=["Admin"])
@router.get("/api/admin/users")
async def get_usage_stats(admin: Dict = Depends(get_current_admin)):
    """Obtiene las estadísticas de uso de API para el dashboard"""
    # No es necesario el import local si ya está arriba
    client = get_supabase_admin()
    if not client:
        raise HTTPException(status_code=500, detail="Error de configuración administrativa")
        
    try:
        from datetime import datetime
        from backend.db_supabase import execute_with_retry
        current_month = datetime.now().replace(day=1).date().isoformat()
        res = execute_with_retry(lambda c: c.table('api_usage_stats').select('*').eq('month', current_month))
        
        total_cost = sum([float(item.get('estimated_cost_usd', 0)) for item in res.data])
        
        return {
            "success": True,
            "month": current_month,
            "total_estimated_cost_usd": total_cost,
            "stats": res.data,
            "provider_status": "google"
        }
    except Exception as e:
        logger.error(f"Error en /admin/usage-stats: {e}")
        return {
            "success": False,
            "error": str(e),
            "stats": [],
            "total_estimated_cost_usd": 0,
            "provider_status": "google"
        }

@router.get("/api/admin/api-logs")
async def get_api_logs_endpoint(
    limit: int = 100, 
    offset: int = 0, 
    admin: Dict = Depends(get_current_admin)
):
    """Obtiene el historial detallado de llamadas a API"""
    try:
        logs = get_api_logs(limit=limit, offset=offset)
        return {
            "success": True, 
            "logs": logs,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error en /admin/api-logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/admin/delete-user")
async def admin_delete_user(request: AdminDeleteUserRequest):
    """
    Endpoint administrativo para eliminar usuarios TOTALMENTE (Auth + DB)
    Esto permite reutilizar el email.
    """
    try:
        if not request.user_id:
             raise HTTPException(status_code=400, detail="ID de usuario requerido")

        # Ejecutar eliminación total (DB + Auth)
        result = eliminar_usuario_totalmente(request.user_id)
        
        if result.get("success"):
            return {
                "success": True, 
                "message": "Usuario eliminado permanentemente (Auth + Datos)"
            }
        else:
            # Si falla, devolvemos error 500
            raise HTTPException(status_code=500, detail=result.get("error", "Error desconocido"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en /admin/delete-user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/admin/create-user")
async def admin_create_user(user_data: AdminCreateUserRequest):
    """
    Endpoint administrativo para crear usuarios directamente en Supabase Auth
    """
    try:
        # Construir user_metadata
        metadata = {
            "name": user_data.name,
            "phone": user_data.phone,
            "role": user_data.role
        }
        
        result = crear_usuario_admin(user_data.email, user_data.password, metadata)
        
        if result.get("error"):
            # Si el error es "Falta SERVICE_ROLE_KEY", enviamos 501 Not Implemented o 500
            if "SERVICE_ROLE_KEY" in result["error"]:
                 raise HTTPException(status_code=500, detail="Configuración de servidor incompleta: falta SERVICE_ROLE_KEY")
            raise HTTPException(status_code=400, detail=result["error"])
            
        # Actualizar el perfil público con el plan y créditos si se crearon satisfactoriamente en Auth
        new_user = result.get("data")
        if new_user and hasattr(new_user, 'id'):
            admin_update_user(new_user.id, {
                "plan": user_data.plan,
                "credits": user_data.credits
            })
            
        return {"success": True, "data": result.get("data")}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en /admin/create-user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/admin/update-user")
async def admin_update_user_endpoint(request: AdminUpdateUserRequest):
    """Endpoint para actualizar usuario vía admin (bypassing RLS)"""
    try:
        result = admin_update_user(request.user_id, request.updates)
        
        if result.get("error"):
             raise HTTPException(status_code=400, detail=result["error"])
             
        return {"success": True, "message": "Usuario actualizado"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en /admin/update-user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# (Movido el bloque de uvicorn.run al final del archivo)
