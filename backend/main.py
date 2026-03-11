"""
API FastAPI para sistema B2B de captación de clientes por rubro
Enfocado en empresas, no en propiedades por zona
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse, RedirectResponse, HTMLResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from backend.api.schemas import *
from typing import Optional, List, Dict, Any
import logging
import sys
import os

# Asegurar que el directorio raíz esté en el path para soportar imports con "backend."
# tanto en local como en despliegues.
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)
import time
import asyncio
import math
import json
import random
import string
import mercadopago
from datetime import datetime, timedelta

try:
    from backend.rubros_config import (
        RUBROS_DISPONIBLES,
        listar_rubros_disponibles
    )
    from backend.scraper import enriquecer_empresa_b2b, ScraperSession
    from backend.social_scraper import enriquecer_con_redes_sociales
    from backend.scraper_parallel import enriquecer_empresas_paralelo
    from backend.validators import validar_empresa
    from backend.smart_filter_service import apply_smart_filter
    from backend.db_supabase import (
        insertar_empresa, 
        buscar_empresas, 
        obtener_estadisticas, 
        exportar_a_csv, 
        exportar_a_json, 
        init_db_b2b, 
        crear_usuario_admin,
        obtener_todas_empresas,
        get_user_oauth_token,
        save_user_oauth_token,
        delete_user_oauth_token,
        admin_update_user,
        eliminar_usuario_totalmente,
        save_search_history,
        get_search_history,
        delete_search_history,
        get_supabase,
        get_supabase_admin,
        get_api_logs,
        get_user_credits,
        check_reset_monthly_credits,
        deduct_credits,
        cancel_user_plan,
        db_get_templates,
        db_create_template,
        db_update_template,
        db_delete_template,
        get_empresa_by_id,
        update_empresa_icebreaker
    )
    from backend.auth_google import get_google_auth_url, exchange_code_for_token
    from backend.auth_outlook import get_outlook_auth_url, exchange_code_for_token as exchange_outlook_token
    from backend.google_places_client import google_client
    from backend.email_service import enviar_email, enviar_emails_masivo
    from backend.ai_service import generate_icebreaker, draft_message_from_instruction, filter_leads_by_description, transcribe_audio_file, interpret_search_intent, generate_suggested_reply
    from fastapi import UploadFile, File
except ImportError as e:
    logging.error(f"Error importando módulos del backend: {e}")
    # Solo para desarrollo local si el paquete no está instalado
    from rubros_config import *
    from scraper import *
    from social_scraper import *
    from scraper_parallel import *
    from validators import *
    from db_supabase import (
        insertar_empresa, 
        buscar_empresas, 
        obtener_estadisticas, 
        exportar_a_csv, 
        exportar_a_json, 
        init_db_b2b, 
        crear_usuario_admin,
        obtener_todas_empresas,
        get_user_oauth_token,
        save_user_oauth_token,
        delete_user_oauth_token,
        admin_update_user,
        eliminar_usuario_totalmente,
        save_search_history,
        get_search_history,
        delete_search_history,
        get_supabase,
        get_supabase_admin,
        get_api_logs,
        get_user_credits,
        check_reset_monthly_credits,
        deduct_credits,
        cancel_user_plan,
        db_get_templates,
        db_create_template,
        db_update_template,
        db_delete_template,
        get_empresa_by_id,
        update_empresa_icebreaker
    )
    from auth_google import get_google_auth_url, exchange_code_for_token
    from auth_outlook import get_outlook_auth_url, exchange_code_for_token as exchange_outlook_token
    from ai_service import generate_icebreaker, draft_message_from_instruction, interpret_search_intent


# --- Variables de estado Globales (En memoria por sesión) ---
_memoria_empresas = []
_empresa_counter = 1
_busqueda_progreso = {
    "total": 0,
    "actual": 0,
    "completado": False,
    "error": None,
    "ultima_actualizacion": None
}
_memoria_codigos_validacion = {}

# Inicializar FastAPI inmediatamente después de imports
app = FastAPI(
    title="B2B Client Acquisition API", 
    version="2.0.0",
    description="Sistema de captación de clientes B2B por rubro empresarial"
)

# CORS - Configuración robusta para producción y desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Exception handler para HTTPException limpio
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Maneja HTTPException con formato estandarizado y headers CORS"""
    logger.warning(f"HTTP Error {exc.status_code} en {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "code": f"ERR_HTTP_{exc.status_code}",
            "path": request.url.path
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Maneja cualquier error no controlado con formato estandarizado y headers CORS"""
    import traceback
    logger.error(f"Error fatal no controlado en {request.url.path}: {exc}", exc_info=True)
    
    # Determinar si es un error de base de datos para dar un código más específico
    error_msg = str(exc)
    code = "ERR_INTERNAL_SERVER"
    if "supabase" in error_msg.lower() or "db" in error_msg.lower() or "postgrest" in error_msg.lower():
        code = "ERR_DATABASE_ERROR"

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Error interno del servidor",
            "detail": error_msg,
            "code": code,
            "path": request.url.path,
            "trace": traceback.format_exc().split('\n') if os.getenv("DEBUG") == "true" else None
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "B2B Client Acquisition API",
        "documentation": "/docs",
        "python_version": sys.version,
        "version": "2.1.0 (Fixed NameError Vercel)"
    }

# MercadoPago SDK
mp_token = os.getenv("MP_ACCESS_TOKEN")
if mp_token:
    try:
        sdk = mercadopago.SDK(mp_token)
    except Exception as e:
        logging.error(f"Error configurando MercadoPago: {e}")
        sdk = None
else:
    logging.warning("MP_ACCESS_TOKEN no configurado. Pagos no disponibles.")
    sdk = None

_memoria_codigos_validacion = {}

def get_memoria_codigos():
    global _memoria_codigos_validacion
    return _memoria_codigos_validacion

def update_search_progress(task_id, current, total, phase="scraping"):
    """
    Actualiza el progreso de una búsqueda en la base de datos Supabase
    """
    if not task_id:
        return
        
    if phase == "searching":
        percent = int((current / (total or 1)) * 15)
        msg = "Buscando prospectos en el área..."
    elif phase == "scraping":
        percent = 15 + int((current / (total or 1)) * 70)
        msg = f"Rastreando sitios web ({current}/{total})..."
    else: # finalizing
        percent = 85 + int((current / (total or 1)) * 15)
        msg = f"Finalizando y validando ({current}/{total})..."
    
    # Asegurar que no pasamos de 100 ni bajamos de 0
    percent = max(0, min(100, percent))
    
    try:
        from backend.db_supabase import get_supabase_admin
        admin_client = get_supabase_admin()
        if admin_client:
            admin_client.table('search_tasks').update({
                'progress': percent,
                'message': msg,
                'updated_at': 'now()'
            }).eq('id', task_id).execute()
    except Exception as e:
        logger.error(f"Error actualizando progreso en Supabase para tarea {task_id}: {e}")


def calcular_distancia_km(lat1, lon1, lat2, lon2):
    """Calcula distancia entre dos puntos geográficos"""
    if not all(isinstance(coord, (int, float)) and not math.isnan(coord) for coord in [lat1, lon1, lat2, lon2]):
        return None
    R = 6371.0
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

# Función obtener_estadisticas importada de db_supabase

# Funciones exportar_a_csv y exportar_a_json importadas de db_supabase

def limpiar_base_datos() -> bool:
    """No implementado en Supabase por seguridad"""
    # En Supabase no permitimos borrar toda la DB desde un endpoint público
    logger.warning("Intento de limpiar base de datos bloqueado en modo Supabase")
    return False

# Funciones de persistencia delegadas a db_supabase
from backend.db_supabase import (
    db_get_templates,
    db_create_template,
    db_update_template,
    db_delete_template,
    db_log_email_history
)

# Endpoints Gmail OAuth
# ...
_default_log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
log_dir = os.getenv('LOG_DIR', _default_log_dir)

file_handler = None
try:
    os.makedirs(log_dir, exist_ok=True)
    file_path = os.path.join(log_dir, f'b2b_{datetime.now().strftime("%Y%m%d")}.log')
    file_handler = logging.FileHandler(file_path)
except OSError:
    fallback_dir = '/tmp/b2b_logs'
    try:
        os.makedirs(fallback_dir, exist_ok=True)
        file_path = os.path.join(fallback_dir, f'b2b_{datetime.now().strftime("%Y%m%d")}.log')
        file_handler = logging.FileHandler(file_path)
    except OSError:
        file_handler = None

handlers = [logging.StreamHandler()]
if file_handler:
    handlers.insert(0, file_handler)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=handlers
)

logger = logging.getLogger(__name__)

# Dependencias extraídas
from backend.api.dependencies import get_current_admin
@app.on_event("startup")
async def startup():
    logger.info(" Iniciando API B2B...")
    try:
        # Intentar conectar a DB pero no bloquear si falla
        logger.info("Verificando conexión DB...")
        if init_db_b2b():
            logger.info(" Sistema B2B listo (Conectado a Supabase)")
        else:
            logger.warning(" Advertencia: Conexión Supabase inestable, pero API inicia.")
    except Exception as e:
        logger.error(f"⚠️ Error no fatal en startup: {e}")
        # No relanzamos la excepción para permitir que la app inicie


@app.get("/")
async def root():
    """Información de la API"""
    return {
        "nombre": "B2B Client Acquisition API",
        "version": "2.0.0",
        "descripcion": "Sistema de captación de clientes por rubro empresarial",
        "enfoque": "Búsqueda B2B de empresas con datos de contacto validados",
        "endpoints": {
            "/rubros": "GET - Lista de rubros disponibles",
            "/buscar": "POST - Buscar empresas por rubro",
            "/empresas": "GET - Listar todas las empresas",
            "/filtrar": "POST - Filtrar empresas",
            "/estadisticas": "GET - Estadísticas del sistema",
            "/exportar": "POST - Exportar a CSV/JSON"
        }
    }

# --- ROUTERS ---
from backend.api.routes.ai import router as ai_router
from backend.api.routes.payments import router as payments_router
from backend.api.routes.users import router as users_router, admin_router as users_admin_router
from backend.api.routes.templates import router as templates_router
from backend.api.routes.leads import router as leads_router
from backend.api.routes.admin import router as admin_router
from backend.api.routes.auth import router as auth_router
from backend.api.routes.communications import router as comm_router

app.include_router(ai_router)
app.include_router(payments_router)
app.include_router(users_router)
app.include_router(users_admin_router)
app.include_router(templates_router)
app.include_router(leads_router)
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(comm_router)
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
