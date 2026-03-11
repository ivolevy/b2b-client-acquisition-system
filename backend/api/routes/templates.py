import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request

try:
    from backend.api.schemas import TemplateCreateRequest, TemplateModifyRequest
    from backend.db_supabase import (
        db_get_templates,
        db_create_template,
        db_update_template,
        db_delete_template
    )
except ImportError:
    from api.schemas import TemplateCreateRequest, TemplateModifyRequest
    from db_supabase import (
        db_get_templates,
        db_create_template,
        db_update_template,
        db_delete_template
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["Templates"])

def get_user_id_from_header(request: Request) -> Optional[str]:
    return request.headers.get("X-User-ID")

@router.get("")
async def listar_templates(request: Request, type: Optional[str] = None, user_id: Optional[str] = None):
    """Lista todos los templates del usuario + defaults"""
    header_user_id = get_user_id_from_header(request)
    uid = header_user_id or user_id
    
    if not uid:
        raise HTTPException(status_code=401, detail="X-User-ID header or user_id query param missing")
    try:
        templates = db_get_templates(uid, tipo=type)
        return {
            "success": True,
            "total": len(templates),
            "data": templates
        }
    except Exception as e:
        logger.error(f"Error listando templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{template_id}")
async def obtener_template_endpoint(template_id: str, user_id: str):
    """Obtiene un template por ID (validando pertenencia o default)"""
    try:
        templates = db_get_templates(user_id)
        template = next((t for t in templates if t['id'] == template_id), None)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        return {
            "success": True,
            "data": template
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def crear_template_endpoint(data: TemplateCreateRequest):
    """Crea un nuevo template persistente"""
    try:
        logger.info(f"POST /api/templates - Received data type: {type(data)}")
        
        uid = getattr(data, 'user_id', None)
        if not uid:
             raise HTTPException(status_code=400, detail=f"Falta user_id en el objeto")

        template_id = db_create_template(
            user_id=uid,
            data={
                "nombre": data.nombre,
                "subject": data.subject,
                "body_html": data.body_html,
                "body_text": data.body_text,
                "type": data.type
            }
        )
        return {
            "success": True,
            "message": "Template creado exitosamente",
            "template_id": template_id
        }
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        if "23505" in error_str or "already exists" in error_str:
            raise HTTPException(status_code=409, detail="Ya existe una plantilla con ese nombre. Por favor elegí otro.")
            
        logger.error(f"Error creando template: {e}")
        raise HTTPException(status_code=500, detail=f"Error creando template: {str(e)}")

@router.put("/{template_id}")
async def actualizar_template_endpoint(template_id: str, data: TemplateModifyRequest):
    """Actualiza un template persistente"""
    try:
        uid = getattr(data, 'user_id', None)
        success = db_update_template(
            template_id=template_id,
            user_id=uid,
            updates={
                "nombre": data.nombre,
                "subject": data.subject,
                "body_html": data.body_html,
                "body_text": data.body_text,
                "type": data.type
            }
        )

        if not success:
            raise HTTPException(status_code=404, detail="Template no encontrado o sin permisos")
        return {
            "success": True,
            "message": "Template actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        if "23505" in error_str or "already exists" in error_str:
            raise HTTPException(status_code=409, detail="Ya existe una plantilla con ese nombre. Por favor elegí otro.")
        logger.error(f"Error actualizando template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{template_id}")
async def eliminar_template_endpoint(template_id: str, user_id: str):
    """Elimina un template"""
    try:
        success = db_delete_template(template_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Template no encontrado o sin permisos")
        return {
            "success": True,
            "message": "Template eliminado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
