"""
API FastAPI para sistema B2B de captación de clientes por rubro
Enfocado en empresas, no en propiedades por zona
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse, RedirectResponse, HTMLResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
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



class SuggestReplyRequest(BaseModel):
    messages: List[Dict[str, Any]]
    lead_data: Optional[Dict[str, Any]] = None

class DraftTemplateRequest(BaseModel):

    instruction: str
    type: str = 'email'
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
    """Maneja HTTPException con headers CORS"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.get("/api/users/{user_id}/credits")
async def api_get_user_credits(user_id: str):
    """Obtiene créditos y próxima fecha de reset"""
    # Primero verificar si corresponde reset
    check_reset_monthly_credits(user_id)
    return get_user_credits(user_id)

@app.post("/api/users/{user_id}/cancel-plan")
async def api_cancel_user_plan(user_id: str):
    """Cancela el plan activo del usuario"""
    success = cancel_user_plan(user_id)
    if not success:
        raise HTTPException(status_code=400, detail="No se pudo cancelar el plan")
    return {"success": True, "message": "Plan cancelado correctamente"}

# Exception handler global para asegurar que CORS siempre se incluya
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Maneja cualquier error no controlado con headers CORS"""
    import traceback
    logger.error(f"Error fatal: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor",
            "error": str(exc),
            "trace": traceback.format_exc().split('\n')
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
SEARCH_PROGRESS = {}  # Diccionario global para guardar el progreso de las búsquedas: {task_id: {progress: int, message: str}}

def get_memoria_codigos():
    global _memoria_codigos_validacion
    return _memoria_codigos_validacion

def update_search_progress(task_id, current, total, phase="scraping"):
    """
    Actualiza el progreso de una búsqueda globalmente con soporte de fases
    Phases:
      - searching: 0 - 15%
      - scraping: 15 - 85%
      - finalizing: 85 - 100%
    """
    if not task_id:
        return
        
    global SEARCH_PROGRESS
    
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
    
    SEARCH_PROGRESS[task_id] = {
        "progress": percent,
        "message": msg
    }


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

# Modelos

async def get_current_admin(request: Request):
    """
    Dependencia para validar que el usuario es admin.
    Valida la presencia del Bearer token.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        # Para no bloquear en esta fase de migración si el frontend aún no envía el token
        # pero registrar la advertencia
        logger.warning("Falta header de Authorization en endpoint admin")
        return {"role": "admin"}
    return {"role": "admin"}

class BusquedaRubroRequest(BaseModel):
    rubro: str
    bbox: Optional[str] = None  # "south,west,north,east"
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    scrapear_websites: bool = True
    solo_validadas: bool = False  # Solo empresas con email o teléfono válido
    limpiar_anterior: bool = True  # True = nueva búsqueda (limpia), False = agregar a resultados
    # Información de ubicación de búsqueda
    busqueda_ubicacion_nombre: Optional[str] = None
    busqueda_centro_lat: Optional[float] = None
    busqueda_centro_lng: Optional[float] = None
    busqueda_radio_km: Optional[float] = None
    task_id: Optional[str] = None  # ID único de la tarea para tracking de progreso
    user_id: Optional[str] = None # ID del usuario para créditos
    smart_filter_text: Optional[str] = None
    smart_filter_audio_blob: Optional[str] = None # Aunque en realidad enviamos text desde frontend si ya transcribimos

class BusquedaMultipleRequest(BaseModel):
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    user_id: Optional[str] = None

class FiltroRequest(BaseModel):
    rubro: Optional[str] = None
    ciudad: Optional[str] = None
    solo_validas: bool = True
    con_email: bool = False
    con_telefono: bool = False

class ExportRequest(BaseModel):
    rubro: Optional[str] = None
    formato: str = "csv"  # csv o json
    solo_validas: bool = True
    user_id: Optional[str] = None

class ActualizarEstadoRequest(BaseModel):
    id: str
    estado: str
    notas: Optional[str] = None

class ActualizarNotasRequest(BaseModel):
    id: str
    notas: str

class TemplateCreateRequest(BaseModel):
    user_id: str
    nombre: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    type: str = 'email'  # email | whatsapp

class TemplateModifyRequest(BaseModel):
    user_id: str
    nombre: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    type: Optional[str] = None




class EmailAttachment(BaseModel):
    filename: str
    content_base64: str
    content_type: str

class LogWhatsAppRequest(BaseModel):
    empresa_id: str
    phone: str
    message: str
    direction: str = 'outbound'

class SendEmailReplyRequest(BaseModel):
    conversation_id: str
    recipient_email: str
    subject: str
    message: str
    attachments: Optional[List[EmailAttachment]] = None

class UpdateConversationStatusRequest(BaseModel):
    status: str

class CreateLinkTrackingRequest(BaseModel):
    original_url: str
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None

class CreateShortLinkRequest(BaseModel):
    destination_url: str
    conversation_id: Optional[str] = None

class MPPreferenceRequest(BaseModel):
    user_id: str
    email: str
    name: str
    phone: str
    plan_id: str
    amount: float
    description: str

class GenerateIcebreakerRequest(BaseModel):
    empresas: List[Dict[str, Any]]
    user_id: str

@app.post("/api/leads/generate-icebreakers")
async def api_generate_icebreakers(req: GenerateIcebreakerRequest):
    """
    Genera icebreakers para una lista de empresas.
    """
    logger.info(f"RECIBIDA PETICIÓN ICEBREAKERS: user_id={req.user_id}, count={len(req.empresas)}")
    
    # Log the first empresa to see the structure
    if req.empresas:
        logger.info(f"Primera empresa recibida: {json.dumps(req.empresas[0])[:200]}...")
    results = []
    for item in req.empresas:
        try:
            # Si recibimos el objeto completo, lo usamos. 
            # Si solo recibimos un ID, lo buscamos.
            empresa = item
            empresa_id = item.get('id') or item.get('google_id')
            
            # Si el objeto está vacío, solo tiene ID, o le faltan datos clave, buscamos en DB
            # Esto corrige el error donde objetos con {id, selected: true} no traían datos
            needs_fetch = len(item.keys()) <= 3 or not item.get('nombre') or not item.get('rubro')
            
            logger.info(f"Procesando item {empresa_id}. Keys: {list(item.keys())}. Needs fetch: {needs_fetch}")

            if needs_fetch and empresa_id:
                empresa_db = get_empresa_by_id(empresa_id)
                if empresa_db:
                    empresa = empresa_db
                    logger.info(f"Recuperado de DB: {empresa.get('nombre')}")
                else:
                    logger.warning(f"No se encontró en DB: {empresa_id}")
            
            if not empresa:
                results.append({"id": empresa_id, "status": "error", "message": "No data for lead"})
                continue
                
            # Generar icebreaker
            icebreaker = generate_icebreaker(empresa)
            
            # Intentar guardar en DB si tenemos un ID
            success_db = False
            if empresa_id:
                success_db = update_empresa_icebreaker(empresa_id, icebreaker)
            
            results.append({
                "id": empresa_id,
                "icebreaker": icebreaker,
                "status": "success"
            })
            
        except Exception as e:
            logger.error(f"Error generando icebreaker: {e}")
            results.append({"id": item.get('id'), "status": "error", "message": str(e)})
            
    return {"results": results}

@app.post("/api/ai/draft-template")
async def api_draft_template(req: DraftTemplateRequest):
    """
    Drafts a template message based on user instruction.
    """
    try:
        draft = draft_message_from_instruction(req.instruction, req.type)
        return draft
    except Exception as e:
        logger.error(f"Error in draft endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/transcribe")
async def api_transcribe_audio(file: UploadFile = File(...)):
    """
    Recibe un archivo de audio y devuelve la transcripción.
    """
    try:
        content = await file.read()
        text = await transcribe_audio_file(content)
        return {"text": text}
    except Exception as e:
        logger.error(f"Error transcribing audio endpoint: {e}")
        raise HTTPException(status_code=500, detail="Error transcribing audio")

@app.post("/api/ai/suggest-reply")
async def api_suggest_reply(req: SuggestReplyRequest):
    """
    Generates a suggested AI reply based on conversation history.
    """
    try:
        reply = generate_suggested_reply(req.messages, req.lead_data)
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Error suggesting reply: {e}")
        raise HTTPException(status_code=500, detail="Error suggesting reply")

@app.post("/api/ai/interpret")

async def api_interpret_intent(req: DraftTemplateRequest):
    """
    Interprets the user's search intent before executing a search.
    Reuses DraftTemplateRequest (instruction field) for simplicity.
    """
    try:
        result = interpret_search_intent(req.instruction)
        return result
    except Exception as e:
        logger.error(f"Error interpreting intent endpoint: {e}")
        raise HTTPException(status_code=500, detail="Error interpreting intent")

# Endpoints de Pagos
@app.post("/api/payments/mercadopago/create_preference")
async def create_mp_preference(req: MPPreferenceRequest):
    """
    Crea una preferencia de pago en MercadoPago y devuelve el ID y el punto de inicio.
    """
    try:
        # Precios hardcoded en backend para seguridad (Source of Truth)
        PLAN_PRICES = {
            "essential": 70900,
            "growth": 127900,
            "agency": 286900
        }
        
        # Determinar precio real basado en el plan_id
        real_price = float(req.amount) # Fallback al valor del frontend si no machea
        if req.plan_id and req.plan_id.lower() in PLAN_PRICES:
            real_price = float(PLAN_PRICES[req.plan_id.lower()])
            logger.info(f"💰 Precio corregido por Backend para plan {req.plan_id}: ${real_price}")
            
        preference_data = {
            "items": [
                {
                    "title": req.description,
                    "quantity": 1,
                    "unit_price": real_price,
                    "currency_id": "ARS"
                }
            ],
            "back_urls": {
                "success": f"{os.getenv('FRONTEND_URL')}/payment-success?plan_id={req.plan_id}",
                "failure": f"{os.getenv('FRONTEND_URL')}/landing",
                "pending": f"{os.getenv('FRONTEND_URL')}/landing"
            },
            "auto_return": "approved",
            "external_reference": f"{req.user_id}:{req.plan_id}",
            "metadata": {
                "user_id": req.user_id,
                "plan_id": req.plan_id,
                "email": req.email,
                "name": req.name,
                "phone": req.phone
            },
            "notification_url": f"{os.getenv('BACKEND_URL', os.getenv('FRONTEND_URL', 'https://b2b-client-acquisition-system.vercel.app')).rstrip('/')}/api/webhooks/mercadopago"
        }
        
        # LOG URL CHOICE TO SUPABASE FOR DEBUGGING
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": "MP_DEBUG_URL",
                    "payload": {
                        "notification_url": preference_data['notification_url'],
                        "BACKEND_URL_ENV": os.getenv('BACKEND_URL'),
                        "FRONTEND_URL_ENV": os.getenv('FRONTEND_URL')
                    }
                }).execute()
        except:
            pass
        
        if not os.getenv('BACKEND_URL'):
            logger.warning("⚠️ BACKEND_URL no configurado. Usando fallback automático de Vercel para el webhook.")
        else:
            logger.info(f"Webhook URL configurada: {preference_data['notification_url']}")

        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]
        
        init_point = preference["init_point"]
        logger.info(f"Preferencia MP creada: {preference['id']} para user {req.user_id}")
        logger.info(f"MP Init Point: {init_point}")
        
        # Check for sandbox in URL
        if "sandbox" in init_point:
            logger.warning(f"⚠️ ATENCIÓN: Se generó una URL de SANDBOX: {init_point}")
        else:
            logger.info(f"✅ URL de Producción generada: {init_point}")
        
        # LOG TO SUPABASE FOR PRODUCTION DEBUGGING
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": "MP_PREFERENCE_CREATED",
                    "payload": {
                        "preference_id": preference['id'],
                        "notification_url": preference_data['notification_url'],
                        "user_id": req.user_id
                    }
                }).execute()
        except:
            pass
            
        return {"id": preference["id"], "init_point": preference["init_point"]}
    except Exception as e:
        logger.error(f"Error creando preferencia de MP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/webhooks/mercadopago")
async def mp_webhook(request: Request):
    """
    Webhook para recibir notificaciones de pago de MercadoPago.
    """
    try:
        # Algunos webhooks vienen como query params (topic=payment&id=123)
        # Otros vienen en el body.
        query_params = request.query_params
        topic = query_params.get("topic") or query_params.get("type")
        resource_id = query_params.get("id") or query_params.get("data.id")
        
        if not topic or not resource_id:
            # Reintentar obtener del body si no está en params
            body = await request.json()
            topic = body.get("type")
            if body.get("data"):
                resource_id = body["data"].get("id")
        
        logger.info(f"MP Webhook received: topic={topic}, id={resource_id}")
        
        # LOG TO SUPABASE FOR PRODUCTION DEBUGGING
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": f"MP_WEBHOOK_{topic}",
                    "payload": {"id": resource_id, "params": str(query_params)}
                }).execute()
        except:
            pass
        
        if topic == "payment" and resource_id:
            payment_info = sdk.payment().get(resource_id)
            payment_data = payment_info["response"]
            
            if payment_data.get("status") == "approved":
                metadata = payment_data.get("metadata", {})
                user_id = metadata.get("user_id")
                plan_id = metadata.get("plan_id")
                email = metadata.get("email")
                name = metadata.get("name")
                phone = metadata.get("phone")
                amount = payment_data.get("transaction_amount")
                
                # Logica de acreditación
                logger.info(f"¡Pago APROBADO! User: {user_id}, Email: {email}, Plan: {plan_id}, Monto: {amount}")
                
                # Extraer detalles financieros
                payment_method_id = payment_data.get("payment_method_id")
                payment_type_id = payment_data.get("payment_type_id")
                net_amount = payment_data.get("transaction_details", {}).get("net_received_amount")
                fee_details = payment_data.get("fee_details", [])

                try:
                    from backend.db_supabase import registrar_pago_exitoso
                    await registrar_pago_exitoso(
                        user_id=user_id, 
                        plan_id=plan_id, 
                        amount=amount, 
                        external_id=resource_id,
                        email=email,
                        name=name,
                        phone=phone,
                        payment_method_id=payment_method_id,
                        payment_type_id=payment_type_id,
                        net_amount=net_amount,
                        fee_details=fee_details
                    )
                except Exception as db_err:
                    logger.error(f"Error registrando pago en DB: {db_err}")
                        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error procesando webhook MP: {e}")
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": "MP_WEBHOOK_ERROR",
                    "payload": {"error": str(e)}
                }).execute()
        except:
            pass
        return {"status": "error", "detail": str(e)}

@app.get("/api/admin/payments")
async def admin_get_payments(request: Request, admin=Depends(get_current_admin)):
    """
    Obtiene el historial completo de pagos para el dashboard de finanzas.
    """
    try:
        from backend.db_supabase import get_supabase_admin
        admin_client = get_supabase_admin()
        
        # Obtener pagos + datos básicos de usuario si es posible
        response = admin_client.table("payments").select("*").order("created_at", desc=True).limit(500).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error obteniendo pagos admin: {e}")
        return []

@app.get("/api/admin/usage")
async def admin_get_usage(request: Request, admin=Depends(get_current_admin)):
    """Obtiene el uso y costos de API del mes actual"""
    try:
        from backend.db_supabase import get_current_month_usage
        usage_usd = get_current_month_usage()
        return {"current_month_cost_usd": usage_usd}
    except Exception as e:
        logger.error(f"Error admin usage: {e}")
        return {"current_month_cost_usd": 0.0}

class EnviarEmailRequest(BaseModel):
    empresa_id: str
    empresa_data: Optional[Dict[str, Any]] = None
    template_id: str
    asunto_personalizado: Optional[str] = None
    user_id: Optional[str] = None
    provider: Optional[str] = None
    attachments: Optional[List[EmailAttachment]] = None

class EnviarEmailMasivoRequest(BaseModel):
    empresa_ids: List[str]
    empresas_data: Optional[List[Dict[str, Any]]] = None
    template_id: str
    asunto_personalizado: Optional[str] = None
    delay_segundos: float = 3.0
    user_id: Optional[str] = None
    auto_personalize: bool = False
    provider: Optional[str] = None
    attachments: Optional[List[EmailAttachment]] = None

# Modelos Gmail OAuth
class GoogleAuthURLRequest(BaseModel):
    state: str

class GoogleCallbackRequest(BaseModel):
    code: str
    user_id: str

class SearchHistoryRequest(BaseModel):
    user_id: str
    rubro: str
    ubicacion_nombre: Optional[str] = None
    centro_lat: Optional[float] = None
    centro_lng: Optional[float] = None
    radio_km: Optional[float] = None
    bbox: Optional[str] = None
    empresas_encontradas: Optional[int] = 0
    empresas_validas: Optional[int] = 0

class DisconnectRequest(BaseModel):
    user_id: str

class UserRubrosRequest(BaseModel):
    user_id: str
    rubro_keys: List[str]

# Inicializar sistema en memoria
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

@app.get("/api/buscar/progreso/{task_id}")
async def obtener_progreso_busqueda(task_id: str):
    """
    Obtiene el progreso actual de una búsqueda específica
    """
    global SEARCH_PROGRESS
    
    if not task_id:
        return {"progress": 0, "message": "ID de tarea inválido"}
        
    progreso = SEARCH_PROGRESS.get(task_id)
    
    if not progreso:
        # Si no existe, puede ser que ya terminó o nunca empezó
        # Asumimos 0 si es muy reciente, o verificamos si hay resultados
        return {"progress": 0, "message": "Iniciando..."}
        
    return progreso

@app.get("/api/rubros")
def obtener_rubros():
    """Lista todos los rubros disponibles para búsqueda"""
    rubros = listar_rubros_disponibles()
    
    if not rubros:
        rubros = {}
    
    return {
        "success": True,
        "total": len(rubros),
        "rubros": rubros,
        "ejemplo_uso": {
            "rubro": "construccion_arquitectura",
            "pais": "España",
            "ciudad": "Madrid"
        }
    }

@app.get("/api/users/{user_id}/history")
async def api_get_search_history(user_id: str, limit: int = 10):
    """Obtiene el historial de búsquedas de un usuario"""
    history = get_search_history(user_id, limit)
    return {
        "success": True,
        "user_id": user_id,
        "history": history
    }

@app.post("/api/users/history")
async def api_save_search_history(request: SearchHistoryRequest):
    """Guarda una búsqueda en el historial"""
    result = save_search_history(request.user_id, request.dict())
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Error al guardar historial"))
    
    return result

@app.delete("/api/users/{user_id}/history/{search_id}")
async def api_delete_search_history(user_id: str, search_id: str):
    """Elimina una entrada del historial"""
    success = delete_search_history(user_id, search_id)
    if not success:
        raise HTTPException(status_code=500, detail="Error al eliminar del historial")
    
    return {"success": True, "message": "Entrada eliminada correctamente"}

@app.post("/api/buscar-stream")
async def buscar_por_rubro_stream(request: BusquedaRubroRequest):
    """
    Versión Streaming de búsqueda: envía prospectos en tiempo real
    usando Server-Sent Events (SSE).
    """
    # 1. Validación de Créditos
    user_id = request.user_id
    if user_id and user_id != 'anonymous':
        check_reset_monthly_credits(user_id)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(status_code=402, detail=f"Créditos insuficientes. Balance: {deduction.get('current', 0)}")
            else:
                logger.error(f"Error sistémico en deducción de créditos: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Error en el sistema de créditos: {error_msg}")

    async def event_generator():
        seen_ids = set()
        all_candidates = []
        MAX_LEADS = 60
        
        # Centro de búsqueda para cálculo manual de distancia si falla el mapeo
        c_lat, c_lng = request.busqueda_centro_lat, request.busqueda_centro_lng
        
        rubro_obj = RUBROS_DISPONIBLES.get(request.rubro.lower())
        keywords = rubro_obj["keywords"] if rubro_obj and isinstance(rubro_obj, dict) else [request.rubro]
        
        if c_lat and c_lng:
            # Si tenemos coordenadas, no ensuciar la query con texto geográfico
            search_queries = [kw for kw in keywords]
        else:
            search_queries = [f"{kw} en {request.busqueda_ubicacion_nombre}" for kw in keywords]
        
        emitted_count = 0
        logger.info(f"Iniciando búsqueda stream optimizada para: {request.rubro} | Límite: {MAX_LEADS}")

        # Parsear bbox si viene como string
        google_bbox = None
        if request.bbox and isinstance(request.bbox, str):
            try:
                partes = request.bbox.split(',')
                if len(partes) == 4:
                    google_bbox = {
                        "south": float(partes[0]),
                        "west": float(partes[1]),
                        "north": float(partes[2]),
                        "east": float(partes[3])
                    }
            except Exception as e:
                logger.error(f"Error parseando bbox en stream: {e}")

        # Asegurar radio válido
        radius_m = (request.busqueda_radio_km * 1000) if request.busqueda_radio_km else None

        yield f"data: {json.dumps({'type': 'status', 'message': f'Buscando los {MAX_LEADS} mejores prospectos...'})}\n\n"

        # Ejecutar todas las queries en paralelo para obtener candidatos
        tasks = []
        for query in search_queries:
            tasks.append(asyncio.to_thread(
                google_client.search_all_places,
                query=query,
                rubro_nombre=request.rubro,
                rubro_key=request.rubro.lower(),
                lat=c_lat,
                lng=c_lng,
                radius=radius_m,
                bbox=google_bbox,
                max_total_results=20 # Buscamos 20 por query para tener candidatos de sobra sin gastar demasiado
            ))
        
        try:
            results_lists = await asyncio.gather(*tasks)
            for r_list in results_lists:
                for r in r_list:
                    if r['google_id'] not in seen_ids:
                        # Asegurar distancia
                        dist = r.get('distancia_km')
                        if dist is None:
                            dist = google_client.calcular_distancia(c_lat, c_lng, r.get('latitud'), r.get('longitud'))
                            r['distancia_km'] = dist
                        
                        # FILTRO ESTRICTO DE RADIO
                        # Si el usuario especificó un radio, no queremos leads que lo superen (con un margen del 5% por precisión)
                        if request.busqueda_radio_km and dist:
                            if dist > (request.busqueda_radio_km * 1.05):
                                continue
                        
                        seen_ids.add(r['google_id'])
                        all_candidates.append(r)
            
            # --- PRIORIZACIÓN Y FILTRADO DE LEADS ---
            def lead_score(lead):
                score = 0
                if lead.get('email'): score += 500  # Prioridad máxima para emails
                if lead.get('telefono'): score += 50
                if lead.get('website'): score += 20
                if lead.get('rating'): score += (lead.get('rating') * 2)
                # Penalizar un poco los que solo tienen redes pero no email
                if not lead.get('email') and (lead.get('instagram') or lead.get('facebook')):
                    score += 5
                return score

            # Filtro específico para "colegios" para evitar escuelas de fútbol/manejo/idiomas
            if request.rubro.lower() == "colegios":
                logger.info("Aplicando filtro de exclusión educativo...")
                unwanted_terms = ["futbol", "soccer", "tenis", "natacion", "deportes", "manejo", "conducir", "danza", "baile", "musica", "deportiva"]
                all_candidates = [
                    l for l in all_candidates 
                    if not any(term in l.get('nombre', '').lower() for term in unwanted_terms)
                ]

            # Ordenar por score para priorizar emails
            all_candidates.sort(key=lead_score, reverse=True)

            # --- ENRIQUECIMIENTO DE LEADS ---
            if all_candidates:
                # Limitamos a los mejores candidatos para no tardar demasiado
                leads_to_process = all_candidates[:MAX_LEADS]
                enriched_count = 0
                batch_size = 10
                
                yield f"data: {json.dumps({'type': 'status', 'message': f'Encontrados {len(all_candidates)} prospectos. Buscando datos de contacto...'})}\n\n"
                
                # Crear sesión persistente para todo el proceso
                session = ScraperSession()
                
                # Procesar en batches para fluidez en el stream
                accumulated_enriched = []
                
                for i in range(0, len(leads_to_process), batch_size):
                    batch = leads_to_process[i:i+batch_size]
                    
                    try:
                        # Enriquecer batch en paralelo
                        enriched_batch = await asyncio.to_thread(
                            enriquecer_empresas_paralelo,
                            empresas=batch,
                            session=session
                        )
                        
                        if isinstance(enriched_batch, list):
                            # Si hay Smart Filter, lo aplicamos INMEDIATAMENTE al batch para no hacer esperar al usuario
                            if request.smart_filter_text:
                                yield f"data: {json.dumps({'type': 'status', 'message': f'Analizando calidad con IA ({enriched_count + len(enriched_batch)}/{len(leads_to_process)})...'})}\n\n"
                                
                                # Aplicar filtro AI al batch actual
                                filtered_batch_leads = await apply_smart_filter(enriched_batch, request.smart_filter_text)
                                
                                for r in filtered_batch_leads:
                                    yield f"data: {json.dumps({'type': 'lead', 'data': r})}\n\n"
                                    emitted_count += 1
                                    enriched_count += 1
                                    await asyncio.sleep(0.02)
                                    
                            else:
                                # Comportamiento standard: emitir inmediatamente
                                for r in enriched_batch:
                                    yield f"data: {json.dumps({'type': 'lead', 'data': r})}\n\n"
                                    emitted_count += 1
                                    enriched_count += 1
                                    await asyncio.sleep(0.02) 
                                
                    except Exception as e:
                        logger.error(f"Error en enriquecimiento batch: {e}")
                        # Si falla, emitimos originales
                        # Fallback seguro para ambos casos
                        for r in batch:
                            yield f"data: {json.dumps({'type': 'lead', 'data': r})}\n\n"
                            emitted_count += 1
                            enriched_count += 1

                # (Bloque acumulado eliminado - ya se procesó en tiempo real)
                # Finalización normal
                logger.info(f"Búsqueda finalizada. Enriquecidos: {enriched_count}/{len(leads_to_process)}")
                yield f"data: {json.dumps({'type': 'status', 'message': f'Búsqueda finalizada. {emitted_count} prospectos procesados con éxito.'})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'status', 'message': 'No se encontraron resultados para los criterios seleccionados.'})}\n\n"

        except Exception as e:
            logger.error(f"Error en event_generator: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/buscar")
async def buscar_por_rubro(request: BusquedaRubroRequest):
    """
    Busca empresas de un rubro específico con validación de contactos
    Puede buscar por bbox (bounding box) o por ciudad/país
    """
    # Lógica de Créditos
    user_id = request.user_id
    if user_id and user_id != 'anonymous':
        # 1. Verificar reset mensual
        check_reset_monthly_credits(user_id)
        
        # 2. Deducir créditos (100 por búsqueda)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(
                    status_code=402, 
                    detail=f"Créditos insuficientes. Necesitás 100 créditos para buscar. Balance actual: {deduction.get('current', 0)}"
                )
            else:
                logger.error(f"Error crítico deduciendo créditos para {user_id}: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Error al procesar créditos: {error_msg}")
            
    try:
        # Verificar que el parámetro se recibe correctamente
        solo_validadas = getattr(request, 'solo_validadas', False)
        limpiar_anterior = getattr(request, 'limpiar_anterior', True)
        
        # Si es nueva búsqueda, limpiar resultados anteriores
        if limpiar_anterior:
            global _memoria_empresas, _empresa_counter
            count_anterior = len(_memoria_empresas)
            _memoria_empresas = []
            _empresa_counter = 0
            if count_anterior > 0:
                logger.info(f" Nueva búsqueda: limpiando {count_anterior} empresas anteriores")
        else:
            logger.info(f" Agregando a resultados existentes ({len(_memoria_empresas)} empresas)")
        
        # Inicializar progreso si hay task_id
        if request.task_id:
            global SEARCH_PROGRESS
            SEARCH_PROGRESS[request.task_id] = {
                "progress": 5,
                "message": "Buscando prospectos..."
            }
        
        # Validar bbox
        bbox_valido = False
        if request.bbox:
            partes = request.bbox.split(',')
            bbox_valido = len(partes) == 4
            
        # --- LÓGICA EXCLUSIVA GOOGLE PLACES ---
        empresas = []
        source_used = "google"
        search_method = "bbox" if request.bbox and bbox_valido else "city"

        try:
            logger.info(f" Iniciando búsqueda con Google Places API (New)...")
            
            # Mapear bbox si existe
            google_bbox = None
            if request.bbox and bbox_valido:
                partes = request.bbox.split(',')
                google_bbox = {
                    "south": float(partes[0]),
                    "west": float(partes[1]),
                    "north": float(partes[2]),
                    "east": float(partes[3])
                }

            # Ejecutar búsqueda en Google (Pasada exhaustiva paralela para 100% cobertura)
            rubro_info = RUBROS_DISPONIBLES.get(request.rubro, {"nombre": request.rubro, "keywords": []})
            
            # Construir set de búsquedas
            if request.busqueda_centro_lat and request.busqueda_centro_lng:
                search_queries = [rubro_info['nombre']]
                if rubro_info.get('keywords'):
                    search_queries.extend(rubro_info['keywords'])
            else:
                search_queries = [f"{rubro_info['nombre']} en {request.ubicacion_nombre}"]
                if rubro_info.get('keywords'):
                    search_queries.extend([f"{kw} en {request.ubicacion_nombre}" for kw in rubro_info['keywords']])
            
            # Eliminar duplicados en las queries por si acaso
            search_queries = list(dict.fromkeys(search_queries))
            
            # Ejecutar búsquedas en paralelo para máxima potencia de descubrimiento
            tasks = []
            for q in search_queries:
                tasks.append(asyncio.to_thread(
                    google_client.search_all_places,
                    query=q,
                    rubro_nombre=rubro_info['nombre'],
                    rubro_key=request.rubro,
                    bbox=google_bbox,
                    lat=request.busqueda_centro_lat,
                    lng=request.busqueda_centro_lng,
                    radius=(request.busqueda_radio_km * 1000) if request.busqueda_radio_km else None
                ))
            
            # Reunir todos los resultados de las diferentes queries exhaustivamente
            results_lists = await asyncio.gather(*tasks)
            google_results = []
            seen_ids = set()
            
            for r_list in results_lists:
                if r_list and isinstance(r_list, list):
                    for r in r_list:
                        if isinstance(r, dict) and 'google_id' in r:
                            gid = r['google_id']
                            if gid not in seen_ids:
                                google_results.append(r)
                                seen_ids.add(gid)
            
            logger.info(f"Búsqueda EXHAUSTIVA completada. Total leads únicos encontrados: {len(google_results)}")

            if google_results:
                # Filtrar posibles errores de presupuesto si vienen en la lista
                empresas = [r for r in google_results if isinstance(r, dict) and 'error' not in r]
                logger.info(f" EXITOSA: {len(empresas)} empresas obtenidas de Google Places")
            else:
                logger.warning(" No se obtuvieron resultados de Google Places.")

        except Exception as e:
            logger.error(f" Error en Google Places: {e}")
            empresas = []

        # --- FIN DE LÓGICA GOOGLE ---

        # Asegurar que empresas es una lista
        if not isinstance(empresas, list):
            empresas = []
        
        # --- FIN DE LÓGICA HÍBRIDA ---

        if not empresas:
            return {
                "success": True,
                "count": 0,
                "message": "No se encontraron empresas para este rubro",
                "data": []
            }
        
        # Actualizar progreso: Encontradas
        if request.task_id:
            update_search_progress(request.task_id, 1, 1, phase="searching")
            SEARCH_PROGRESS[request.task_id]["message"] = f"Encontradas {len(empresas)} empresas. Iniciando enriquecimiento..."

        logger.info(f" Encontradas {len(empresas)} empresas en Google Places")
        
        # Guardar el número total encontrado ANTES de cualquier filtro
        total_encontradas_original = len(empresas)
        
        # Enriquecer con scraping paralelo si está habilitado
        if request.scrapear_websites:
            logger.info(" Iniciando enriquecimiento paralelo de empresas...")
            try:
                # Ejecutar scraping en un thread separado para no bloquear el event loop
                empresas_enriquecidas = await asyncio.to_thread(
                    enriquecer_empresas_paralelo,
                    empresas=empresas,
                    timeout_por_empresa=20,
                    progress_callback=lambda current, total: update_search_progress(request.task_id, current, total, phase="scraping")
                )
                
                # Validar que retornó una lista válida
                if isinstance(empresas_enriquecidas, list):
                    empresas = empresas_enriquecidas
                else:
                    logger.warning("enriquecer_empresas_paralelo no retornó una lista válida, usando empresas originales")
            except Exception as e:
                logger.error(f"Error en enriquecimiento paralelo: {e}, usando empresas originales")
                # Continuar con empresas sin enriquecer
        
        # Agregar información de búsqueda
        # Validar y limitar radio (Máximo 3km según solicitud del usuario)
        radio_solicitado = request.busqueda_radio_km or 1.0
        radius = min(float(radio_solicitado), 5.0)
        
        logger.info(f"Iniciando búsqueda: {request.rubro} en {request.ubicacion_nombre} (Radio: {radius}km, Bbox: {bool(request.bbox)})")

        if request.busqueda_centro_lat and request.busqueda_centro_lng:
            logger.info(f" Calculando distancias desde ubicación: {request.busqueda_ubicacion_nombre or 'Sin nombre'}")
            # El radio ya viene en kilómetros desde el frontend, ahora limitado por 'radius'
            radio_km = radius
            
            empresas_con_distancia = []
            for empresa in empresas:
                # Agregar información de búsqueda
                empresa['busqueda_ubicacion_nombre'] = request.busqueda_ubicacion_nombre
                empresa['busqueda_centro_lat'] = request.busqueda_centro_lat
                empresa['busqueda_centro_lng'] = request.busqueda_centro_lng
                empresa['busqueda_radio_km'] = request.busqueda_radio_km
                
                # Calcular distancia si la empresa tiene coordenadas válidas
                lat_empresa = empresa.get('latitud')
                lng_empresa = empresa.get('longitud')
                
                if (lat_empresa is not None and lng_empresa is not None and
                    isinstance(lat_empresa, (int, float)) and isinstance(lng_empresa, (int, float)) and
                    -90 <= lat_empresa <= 90 and -180 <= lng_empresa <= 180):
                    distancia = calcular_distancia_km(
                        request.busqueda_centro_lat,
                        request.busqueda_centro_lng,
                        lat_empresa,
                        lng_empresa
                    )
                    # Validar que la distancia sea válida
                    if distancia is not None and isinstance(distancia, (int, float)) and distancia >= 0:
                        empresa['distancia_km'] = distancia
                        
                        # Filtrar por radio: solo incluir empresas dentro del radio (con margen del 5%)
                        if radio_km is not None and isinstance(radio_km, (int, float)) and radio_km > 0:
                            if distancia > (radio_km * 1.05):
                                logger.debug(f" Empresa {empresa.get('nombre', 'Sin nombre')} fuera del radio: {distancia:.2f}km > {radio_km:.2f}km")
                                continue  # Saltar esta empresa, está fuera del radio
                    else:
                        empresa['distancia_km'] = None
                        logger.debug(f" Distancia inválida calculada para {empresa.get('nombre', 'Sin nombre')}")
                else:
                    empresa['distancia_km'] = None
                    # Si no tiene coordenadas y hay un radio definido, excluir la empresa
                    if radio_km is not None and isinstance(radio_km, (int, float)) and radio_km > 0:
                        logger.debug(f" Empresa {empresa.get('nombre', 'Sin nombre')} sin coordenadas válidas, excluida del radio")
                        continue
                
                empresas_con_distancia.append(empresa)
            
            empresas = empresas_con_distancia
            logger.info(f" Después del filtro por radio: {len(empresas)} empresas dentro del radio de {radio_km:.2f}km")
        
        # Validar empresas
        from backend.validators import validar_email, validar_telefono, validar_website
        
        empresas_validadas = []
        empresas_rechazadas = []
        empresas_sin_contacto = []
        
        for i, empresa in enumerate(empresas):
            # Actualizar progreso en CADA empresa para máxima fluidez, especialmente en lotes pequeños
            if request.task_id:
                update_search_progress(request.task_id, i + 1, len(empresas), phase="finalizing")

            # Validar nombre primero
            nombre = empresa.get('nombre', '').strip() if empresa.get('nombre') else ''
            if not nombre or nombre == '' or nombre == 'Sin nombre' or len(nombre) < 2:
                empresas_rechazadas.append(empresa)
                logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: Rechazada - Sin nombre válido")
                continue
            
            # Preparar empresa validada
            empresa_validada = empresa.copy()
            empresa_validada['nombre'] = nombre
            
            # Validar email
            email_valido, email_limpio = validar_email(empresa.get('email', ''))
            if email_valido:
                empresa_validada['email'] = email_limpio
                empresa_validada['email_valido'] = True
            else:
                empresa_validada['email'] = ''
                empresa_validada['email_valido'] = False
            
            # Validar teléfono
            tel_valido, tel_limpio = validar_telefono(empresa.get('telefono', ''))
            if tel_valido:
                empresa_validada['telefono'] = tel_limpio
                empresa_validada['telefono_valido'] = True
            else:
                empresa_validada['telefono'] = ''
                empresa_validada['telefono_valido'] = False
            
            # Validar website (opcional)
            web_valido, web_limpio = validar_website(empresa.get('website', ''))
            if web_valido:
                empresa_validada['website'] = web_limpio
                empresa_validada['website_valido'] = True
            else:
                empresa_validada['website'] = ''
                empresa_validada['website_valido'] = False
            
            # Verificar si tiene contacto válido (email O teléfono)
            tiene_contacto_valido = email_valido or tel_valido
            
            # Asegurar campos requeridos para DB
            empresa_validada['rubro'] = request.rubro
            # Generar rubro_key simple si no existe
            if not empresa_validada.get('rubro_key'):
                empresa_validada['rubro_key'] = request.rubro.lower().replace(' ', '_')
                
            # Log detallado para debugging
            logger.debug(f" Empresa: {nombre}, Email válido: {email_valido}, Teléfono válido: {tel_valido}, Tiene contacto: {tiene_contacto_valido}, Solo válidas: {request.solo_validadas}")
            
            try:
                # Agregar ID temporal si no tiene
                if 'id' not in empresa_validada:
                    _empresa_counter += 1
                    empresa_validada['id'] = _empresa_counter

                if tiene_contacto_valido:
                    # Empresa con contacto válido - siempre se guarda
                    empresa_validada['validada'] = True
                    empresas_validadas.append(empresa_validada)
                    _memoria_empresas.append(empresa_validada)
                    
                    try:
                        if insertar_empresa(empresa_validada):
                            mensaje = "Email y teléfono válidos" if (email_valido and tel_valido) else ("Email válido" if email_valido else "Teléfono válido")
                            logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - {mensaje}")
                        else:
                             logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: Falló inserción en DB (insertar_empresa retornó False)")
                    except Exception as e_db:
                         logger.error(f" {empresa.get('nombre', 'Sin nombre')}: Error crítico en insertar_empresa: {e_db}")

                elif not solo_validadas:
                    # Empresa sin contacto válido pero con nombre válido - solo se guarda si no se requiere solo válidas
                    empresa_validada['validada'] = False
                    empresas_sin_contacto.append(empresa_validada)
                    _memoria_empresas.append(empresa_validada)
                    
                    try:
                        if insertar_empresa(empresa_validada):
                            logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - Sin contacto válido (solo_validadas=False)")
                        else:
                             pass 
                    except Exception:
                        pass 
                else:
                    # Empresa sin contacto válido y se requiere solo válidas - NO se guarda
                    empresas_rechazadas.append(empresa)
                    logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: RECHAZADA - Sin contacto válido (email_valido={email_valido}, tel_valido={tel_valido}, solo_validadas={solo_validadas})")
            except Exception as e_insert:
                logger.error(f" Error procesando empresa {nombre}: {e_insert}")
                # No detener el proceso

        
        # Calcular empresas válidas (con email válido O teléfono válido)
        validas = len(empresas_validadas)
        total_guardadas = len(empresas_validadas) + len(empresas_sin_contacto)
        
        # Si solo_validadas es True, solo devolver empresas con contacto válido
        empresas_a_devolver = empresas_validadas if solo_validadas else (empresas_validadas + empresas_sin_contacto)
        
        # Estadísticas simples
        stats = {
            'total': total_encontradas_original,  # Total original antes de filtros
            'validas': validas,
            'sin_contacto': len(empresas_sin_contacto),
            'rechazadas': len(empresas_rechazadas),
            'guardadas': total_guardadas,
            'con_email': sum(1 for e in empresas_validadas if e.get('email_valido')),
            'con_telefono': sum(1 for e in empresas_validadas if e.get('telefono_valido')),
            'con_website': sum(1 for e in empresas_validadas if e.get('website_valido'))
        }
        
        logger.info(f"""
    === PROCESO COMPLETADO ===
    Total empresas encontradas en OSM: {total_encontradas_original}
    Empresas después de filtro por radio: {len(empresas)}
    Empresas con contacto válido: {stats['validas']}
    Empresas sin contacto válido: {stats['sin_contacto']}
    Empresas rechazadas: {stats['rechazadas']}
    Total guardadas: {stats['guardadas']}
    Con email: {stats['con_email']}
    Con teléfono: {stats['con_telefono']}
    Con website: {stats['con_website']}
    Solo válidas: {solo_validadas}
    """)
        
        logger.info(f" Proceso completado: {total_guardadas} empresas guardadas de {total_encontradas_original} encontradas ({validas} con contacto válido)")
        
        # Marcar como completado pero NO borrar inmediatamente para que el frontend pueda leer el 100%
        if request.task_id:
            SEARCH_PROGRESS[request.task_id] = {
                "progress": 100,
                "message": "¡Búsqueda completada!",
                "timestamp": time.time()
            }
            
            # Limpieza lazy de tareas viejas (más de 5 minutos)
            try:
                now = time.time()
                keys_to_delete = [
                    k for k, v in SEARCH_PROGRESS.items() 
                    if isinstance(v, dict) and v.get('timestamp') and (now - v.get('timestamp') > 300)
                ]
                for k in keys_to_delete:
                    del SEARCH_PROGRESS[k]
            except Exception as e:
                logger.warning(f"Error en limpieza lazy de tareas: {e}")

        return {
            "success": True,
            "total_encontradas": total_encontradas_original,
            "guardadas": total_guardadas,
            "validas": validas,
            "rechazadas": len(empresas_rechazadas),
            "estadisticas": stats,
            "data": empresas_a_devolver
        }
        
    except Exception as e:
        logger.error(f" Error en búsqueda: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/buscar-multiple")
async def buscar_multiples_rubros(request: BusquedaMultipleRequest):
    """Busca empresas de múltiples rubros simultáneamente"""
    # Lógica de Créditos
    user_id = request.user_id
    if user_id and user_id != 'anonymous':
        # 1. Verificar reset mensual
        check_reset_monthly_credits(user_id)
        
        # 2. Deducir créditos (100 por búsqueda multiple también)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(
                    status_code=402, 
                    detail=f"Créditos insuficientes. Necesitás 100 créditos para buscar. Balance actual: {deduction.get('current', 0)}"
                )
            else:
                raise HTTPException(status_code=500, detail=f"Error de base de datos en créditos: {error_msg}")
            
    try:
        resultados = buscar_empresas_multiples_rubros(
            rubros=request.rubros,
            pais=request.pais,
            ciudad=request.ciudad
        )
        
        total = sum(len(empresas) for empresas in resultados.values())
        
        return {
            "success": True,
            "rubros_buscados": len(request.rubros),
            "total_empresas": total,
            "resultados_por_rubro": {
                rubro: len(empresas) 
                for rubro, empresas in resultados.items()
            },
            "data": resultados
        }
        
    except Exception as e:
        logger.error(f"Error en búsqueda múltiple: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/empresas")
async def listar_empresas():
    """Lista todas las empresas almacenadas en memoria (resultado de última búsqueda)"""
    try:
        global _memoria_empresas
        # Si la memoria está vacía, intentar cargar de DB como fallback
        if not _memoria_empresas:
             db_empresas = obtener_todas_empresas()
             if db_empresas:
                 _memoria_empresas = db_empresas
        
        return {
            "success": True,
            "total": len(_memoria_empresas),
            "data": _memoria_empresas
        }
        
    except Exception as e:
        logger.error(f"Error listando empresas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/filtrar")
async def filtrar(request: FiltroRequest):
    """Filtra empresas con criterios específicos"""
    try:
        empresas = buscar_empresas(
            rubro=request.rubro,
            ciudad=request.ciudad,
            solo_validas=request.solo_validas,
            con_email=request.con_email,
            con_telefono=request.con_telefono
        )
        
        return {
            "success": True,
            "filtros_aplicados": {
                "rubro": request.rubro,
                "ciudad": request.ciudad,
                "solo_validas": request.solo_validas,
                "con_email": request.con_email,
                "con_telefono": request.con_telefono
            },
            "total": len(empresas),
            "data": empresas
        }
        
    except Exception as e:
        logger.error(f"Error filtrando: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/users")
async def list_users(admin: Dict = Depends(get_current_admin)):
    """Lista todos los usuarios usando Service Role y combina con Auth data"""
    client = None
    try:
        client = get_supabase_admin()
        if not client:
            return {"success": False, "error": "Supabase Admin (Service Role) not configured. Check env vars."}
            
        # 1. Obtener perfiles públicos
        from backend.db_supabase import execute_with_retry
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

@app.get("/api/admin/usage-stats")
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

@app.get("/api/admin/api-logs")
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


@app.get("/api/estadisticas")
async def estadisticas():
    """Obtiene estadísticas del sistema"""
    try:
        stats = obtener_estadisticas()
        
        if not stats:
            logger.warning("obtener_estadisticas retornó un diccionario vacío")
            stats = {
                'total': 0,
                'con_email': 0,
                'con_telefono': 0,
                'con_website': 0,
                'por_rubro': {},
                'por_ciudad': {}
            }
        
        return {
            "success": True,
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@app.post("/api/exportar")
async def exportar(request: ExportRequest):
    """Exporta empresas a CSV o JSON"""
    # Lógica de Créditos
    # Por ahora cobramos 100 créditos por exportación (valor a ajustar según feedback)
    user_id = getattr(request, 'user_id', None)
    if user_id and user_id != 'anonymous':
        check_reset_monthly_credits(user_id)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(
                    status_code=402, 
                    detail=f"Créditos insuficientes para exportar. Necesitás 100 créditos. Balance: {deduction.get('current', 0)}"
                )
            else:
                raise HTTPException(status_code=500, detail=f"Falla técnica al validar créditos: {error_msg}")

    try:
        if request.formato.lower() == "csv":
            archivo = exportar_a_csv(
                rubro=request.rubro,
                solo_validas=request.solo_validas
            )
        elif request.formato.lower() == "json":
            archivo = exportar_a_json(
                rubro=request.rubro,
                solo_validas=request.solo_validas
            )
        else:
            raise HTTPException(status_code=400, detail="Formato debe ser 'csv' o 'json'")
        
        if not archivo:
            raise HTTPException(status_code=404, detail="No hay datos para exportar")
        
        return {
            "success": True,
            "formato": request.formato,
            "archivo": archivo,
            "message": f"Datos exportados exitosamente a {request.formato.upper()}"
        }
        
    except Exception as e:
        logger.error(f"Error exportando: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/clear")
async def clear_database():
    """Elimina todas las empresas de la base de datos"""
    try:
        success = limpiar_base_datos()
        
        if success:
            return {
                "success": True,
                "message": "Base de datos limpiada correctamente"
            }
        else:
            raise HTTPException(status_code=500, detail="Error al limpiar la base de datos")
            
    except Exception as e:
        logger.error(f"Error limpiando base de datos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/empresa/estado")
async def actualizar_estado(request: ActualizarEstadoRequest):
    """Actualiza el estado Kanban de una empresa"""
    try:
        from lead_utils import validar_estado
        from datetime import datetime
        
        if not validar_estado(request.estado):
            raise HTTPException(
                status_code=400, 
                detail=f"Estado inválido. Estados válidos: por_contactar, contactada, interesada, no_interesa, convertida"
            )
        
        # Actualizar en memoria
        empresa_encontrada = False
        for i, e in enumerate(_memoria_empresas):
            if e.get('id') == request.id:
                _memoria_empresas[i]['estado'] = request.estado
                if request.notas:
                    _memoria_empresas[i]['notas'] = request.notas
                _memoria_empresas[i]['fecha_ultimo_contacto'] = datetime.now().isoformat()
                _memoria_empresas[i]['updated_at'] = datetime.now().isoformat()
                empresa_encontrada = True
                break
        
        if not empresa_encontrada:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        logger.info(f" Estado actualizado en memoria - ID: {request.id} → {request.estado}")
        
        return {
            "success": True,
            "message": f"Estado actualizado a '{request.estado}'",
            "id": request.id,
            "estado": request.estado
        }
        
    except Exception as e:
        logger.error(f"Error actualizando estado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/empresa/notas")
async def actualizar_notas(request: ActualizarNotasRequest):
    """Actualiza las notas de una empresa"""
    try:
        from datetime import datetime
        
        # Actualizar en memoria
        empresa_encontrada = False
        for i, e in enumerate(_memoria_empresas):
            if e.get('id') == request.id:
                _memoria_empresas[i]['notas'] = request.notas
                _memoria_empresas[i]['updated_at'] = datetime.now().isoformat()
                empresa_encontrada = True
                break
        
        if not empresa_encontrada:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        logger.info(f" Notas actualizadas en memoria - ID: {request.id}")
        
        return {
            "success": True,
            "message": "Notas actualizadas correctamente",
            "id": request.id
        }
        
    except Exception as e:
        logger.error(f"Error actualizando notas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== FUNCIONES HELPER PARA PERSISTENCIA (Supabase) ==========

def obtener_template(template_id: str) -> Optional[Dict]:
    """Helper para obtener un template por ID (sin validar owner)"""
    try:
        from backend.db_supabase import get_supabase_admin
        client = get_supabase_admin()
        if not client: return None
        
        # Primero buscar en user templates
        res = client.table('email_templates').select('*').eq('id', template_id).execute()
        if res.data:
            return res.data[0]
            
        return None
    except Exception as e:
        logger.error(f"Error en obtener_template helper: {e}")
        return None

def guardar_email_history(**kwargs):
    """Helper para loguear historial de email"""
    try:
        from backend.db_supabase import db_log_email_history
        # Intentar determinar el user_id (usualmente en kwargs o necesitamos pasarlo)
        user_id = kwargs.get('user_id', 'system')
        return db_log_email_history(user_id, kwargs)
    except Exception as e:
        logger.error(f"Error guardando email history: {e}")
        return False

def obtener_email_history(empresa_id=None, template_id=None, limit=100):
    """Helper para leer historial de email"""
    try:
        from backend.db_supabase import get_supabase_admin
        client = get_supabase_admin()
        if not client: return []
        
        query = client.table('email_history').select('*').order('sent_at', desc=True).limit(limit)
        if empresa_id:
            query = query.eq('company_id', empresa_id)
        if template_id:
            query = query.eq('template_id', template_id)
            
        res = query.execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error obteniendo email history: {e}")
        return []

# ========== ENDPOINTS DE EMAIL TEMPLATES ==========

@app.get("/api/templates")
async def listar_templates(user_id: str, type: Optional[str] = None):
    """Lista todos los templates del usuario + defaults"""
    try:
        templates = db_get_templates(user_id, tipo=type)
        return {
            "success": True,
            "total": len(templates),
            "data": templates
        }
    except Exception as e:
        logger.error(f"Error listando templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/templates/{template_id}")
async def obtener_template_endpoint(template_id: str, user_id: str):
    """Obtiene un template por ID (validando pertenencia o default)"""
    try:
        # Reutilizamos db_get_templates y filtramos localmente para simplicidad o agregamos db_get_template_by_id
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

@app.post("/api/templates")
async def crear_template_endpoint(data: TemplateCreateRequest):
    """Crea un nuevo template persistente"""
    try:
        # Debug logger
        logger.info(f"POST /api/templates - Received data type: {type(data)}")
        logger.info(f"POST /api/templates - Data dict keys: {data.dict().keys() if hasattr(data, 'dict') else 'no dict'}")
        
        uid = getattr(data, 'user_id', None)
        if not uid:
             raise HTTPException(status_code=400, detail=f"Falta user_id en el objeto {type(data)}")

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

@app.put("/api/templates/{template_id}")
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

@app.delete("/api/templates/{template_id}")
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

# ========== GMAIL OAUTH ENDPOINTS ==========

@app.post("/api/auth/google/url")
async def google_auth_url(request: GoogleAuthURLRequest):
    """Obtiene la URL para iniciar el flujo de Google OAuth"""
    try:
        url = get_google_auth_url(state=request.state)
        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"Error generando URL de Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/google/callback")
@app.get("/auth/google/callback") # Compatibilidad con consola Google
async def google_callback(code: str, state: str):
    """Maneja el callback de Google OAuth e intercambia el código por tokens"""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    try:
        # Extraer user_id del state (pasado como string o json)
        # Por simplicidad, asumimos que el state ES el user_id o contiene el user_id
        user_id = state
        
        # Intercambiar código por tokens
        token_data = exchange_code_for_token(code)
        
        # Guardar tokens en la base de datos
        success = save_user_oauth_token(user_id, 'google', token_data)
        
        if not success:
            logger.error(f"Error guardando token OAuth para usuario {user_id}")
            return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=error&reason=save_failed"})
            
        # Redirigir de vuelta al frontend (ajustar URL según sea necesario)
        logger.info(f"Gmail conectado exitosamente para usuario {user_id}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=success"})
        
    except Exception as e:
        logger.error(f"Error en callback de Google Auth: {e}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=error&reason={str(e)}"})

# ========== OUTLOOK OAUTH ENDPOINTS (CONSOLIDATED) ==========

@app.post("/api/auth/outlook/url")
async def outlook_auth_url(request: GoogleAuthURLRequest):
    """Obtiene la URL de autorización para Outlook/Microsoft 365"""
    try:
        from backend.auth_outlook import get_outlook_auth_url
        url = get_outlook_auth_url(state=request.state)
        logger.info(f"Generada URL de Outlook para usuario {request.state}")
        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"Error generando URL de Outlook Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/outlook/callback")
@app.get("/auth/outlook/callback") # Compatibilidad con consola Microsoft
async def outlook_callback(code: str, state: str):
    """Maneja el callback de Outlook OAuth"""
    frontend_url = os.getenv("FRONTEND_URL", "https://b2b-client-acquisition-system.vercel.app")
    try:
        user_id = state
        logger.info(f"Recibido callback de Outlook para usuario {user_id}")
        
        # Intercambiar código por tokens
        from backend.auth_outlook import exchange_code_for_token, get_user_profile
        token_data = exchange_code_for_token(code)
        
        if "error" in token_data:
            logger.error(f"Error en intercambio de token Outlook: {token_data['error']}")
            raise Exception(token_data["error"])
            
        # Obtener perfil para tener el email
        profile = get_user_profile(token_data['access_token'])
        
        if "error" in profile:
            logger.warning(f"No se pudo obtener el perfil de Outlook: {profile['error']}")
            email = "Cuenta Outlook"
        else:
            email = profile.get('mail') or profile.get('userPrincipalName') or "Cuenta Outlook"

        # Preparar data para guardar
        token_to_save = {
            'access_token': token_data['access_token'],
            'refresh_token': token_data.get('refresh_token'),
            'expiry': (datetime.now() + timedelta(seconds=token_data.get('expires_in', 3600))).isoformat(),
            'scope': token_data.get('scope'),
            'account_email': email
        }
        
        success = save_user_oauth_token(user_id, 'outlook', token_to_save)
        
        if not success:
            logger.error(f"Error guardando token Outlook en BD para usuario {user_id}")
            return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=error&reason=db_error"})
            
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=success"})
        
    except Exception as e:
        logger.error(f"Error crítico en callback de Outlook: {e}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=error&reason={str(e)}"})

class DisconnectRequest(BaseModel):
    user_id: str

class UserRubrosRequest(BaseModel):
    user_id: str
    rubro_keys: List[str]

@app.get("/api/auth/google/status/{user_id}")
async def google_status(user_id: str):
    """Verifica si el usuario tiene una cuenta de Gmail conectada"""
    try:
        token_data = get_user_oauth_token(user_id, 'google')
        if token_data:
            return {
                "success": True,
                "connected": True,
                "account_email": token_data.get("account_email")
            }
        return {"success": True, "connected": False}
    except Exception as e:
        logger.error(f"Error obteniendo estado de Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/google/disconnect")
async def google_disconnect(request: DisconnectRequest):
    """Elimina la conexión con Google Gmail"""
    try:
        success = delete_user_oauth_token(request.user_id, provider='google')
        return {"success": success, "message": "Cuenta desconectada exitosamente"}
    except Exception as e:
        logger.error(f"Error desconectando Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/outlook/disconnect")
async def outlook_disconnect(request: DisconnectRequest):
    """Desconectar Outlook"""
    try:
        success = delete_user_oauth_token(request.user_id, provider='outlook')
        return {"success": success, "message": "Outlook desconectado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/rubros")
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

@app.post("/api/users/rubros")
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

@app.get("/api/auth/status/{user_id}")
async def auth_status_global(user_id: str):
    """Estado de todas las conexiones"""
    google = get_user_oauth_token(user_id, 'google')
    outlook = get_user_oauth_token(user_id, 'outlook')
    
    return {
        "google": {
            "connected": bool(google),
            "email": google.get('account_email') if google else None
        },
        "outlook": {
            "connected": bool(outlook),
            "email": outlook.get('account_email') if outlook else None
        }
    }

# ========== ENDPOINTS DE ENVÍO DE EMAILS ==========

@app.post("/email/enviar")
async def enviar_email_individual(request: EnviarEmailRequest):
    """Envía un email individual a una empresa"""
    try:
        # Buscar empresa: Primero en la solicitud, luego en memoria
        empresa = None
        
        if request.empresa_data:
            empresa = request.empresa_data.copy()
            # Asegurar que el ID coincida (o usar el del payload)
            if 'id' not in empresa:
                empresa['id'] = request.empresa_id
        else:
            # Fallback a memoria
            for e in _memoria_empresas:
                if e.get('id') == request.empresa_id:
                    empresa = e.copy()
                    break
        
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada en memoria ni en la solicitud")
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        # Enviar email
        resultado = enviar_email(
            empresa=empresa,
            template=template,
            asunto_personalizado=request.asunto_personalizado,
            user_id=request.user_id,
            provider=request.provider,
            attachments=request.attachments
        )
        
        # Guardar en historial
        guardar_email_history(
            empresa_id=empresa['id'],
            empresa_nombre=empresa.get('nombre', ''),
            empresa_email=empresa.get('email', ''),
            template_id=template['id'],
            template_nombre=template.get('nombre', ''),
            subject=resultado.get('message', ''),
            status='success' if resultado['success'] else 'error',
            error_message=resultado.get('error')
        )
        
        if not resultado['success']:
            raise HTTPException(status_code=400, detail=resultado['message'])
        
        return {
            "success": True,
            "message": resultado['message'],
            "data": resultado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/email/enviar-masivo")
async def enviar_email_masivo_endpoint(request: EnviarEmailMasivoRequest):
    """Envía emails a múltiples empresas"""
    try:
        # Priorizar datos enviados explícitamente (Stateless mode for Vercel)
        empresas = []
        
        if request.empresas_data and len(request.empresas_data) > 0:
             empresas = request.empresas_data
             logger.info(f"Usando {len(empresas)} empresas enviadas en payload (Stateless)")
        else:
            # Buscar empresas en memoria (Fallback local)
            empresas_dict = {e.get('id'): e for e in _memoria_empresas}
            
            for empresa_id in request.empresa_ids:
                if empresa_id in empresas_dict:
                    empresas.append(empresas_dict[empresa_id].copy())
            
            if len(empresas) != len(request.empresa_ids):
                missing = set(request.empresa_ids) - set(e.get('id') for e in empresas)
                # En Vercel esto fallará si no se envían datos, pero dejamos el warning/error
                logger.warning(f"Algunas empresas no encontradas en memoria: {missing}")
                if not empresas:
                     raise HTTPException(status_code=404, detail=f"Empresas no encontradas en memoria. Serverless requiere enviar datos completos.")
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        resultados = enviar_emails_masivo(
            empresas=empresas,
            template=template,
            asunto_personalizado=request.asunto_personalizado,
            delay_segundos=request.delay_segundos,
            user_id=request.user_id,
            provider=request.provider,
            attachments=request.attachments,
            auto_personalize=request.auto_personalize
        )
        
        # Guardar en historial
        for detalle in resultados['detalles']:
            if 'empresa_id' in detalle:
                guardar_email_history(
                    empresa_id=detalle['empresa_id'],
                    empresa_nombre=detalle.get('empresa_nombre', ''),
                    empresa_email=detalle.get('empresa_email', ''),
                    template_id=template['id'],
                    template_nombre=template.get('nombre', ''),
                    subject=template.get('subject', ''),
                    status='success' if detalle.get('success') else 'error',
                    error_message=detalle.get('error')
                )
        
        return {
            "success": True,
            "message": f"Proceso completado: {resultados['exitosos']} exitosos, {resultados['fallidos']} fallidos",
            "data": resultados
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando emails masivos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/email/historial")
async def obtener_historial_email(empresa_id: Optional[str] = None, template_id: Optional[str] = None, limit: int = 100):
    """Obtiene el historial de emails enviados"""
    try:
        historial = obtener_email_history(
            empresa_id=empresa_id,
            template_id=template_id,
            limit=limit
        )
        return {
            "success": True,
            "total": len(historial),
            "data": historial
        }
    except Exception as e:
        logger.error(f"Error obteniendo historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS DE VALIDACIÓN DE CÓDIGO PARA CAMBIO DE CONTRASEÑA ==========

class SolicitarCodigoRequest(BaseModel):
    email: str
    user_id: Optional[str] = None

class ValidarCodigoRequest(BaseModel):
    email: str
    codigo: str

@app.post("/api/auth/solicitar-codigo-cambio-password")
async def solicitar_codigo_cambio_password(request: SolicitarCodigoRequest):
    """Genera y envía un código de validación por email para cambio de contraseña"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Generar código de 6 dígitos
        codigo = ''.join(random.choices(string.digits, k=6))
        
        # Guardar código en memoria con expiración de 10 minutos
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Asegurar acceso a la variable global
        global _memoria_codigos_validacion
        
        _memoria_codigos_validacion[email] = {
            'codigo': codigo,
            'expires_at': expires_at.isoformat(),
            'user_id': request.user_id,
            'created_at': datetime.now().isoformat()
        }
        
        # Enviar email con el código
        asunto = "Código de validación para cambio de contraseña"
        cuerpo_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .codigo {{ background: white; border: 2px solid #81D4FA; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Notificación de Seguridad</h1>
                </div>
                <div class="content">
                    <h2>Código de validación</h2>
                    <p>Hola,</p>
                    <p>Recibiste este email porque solicitaste cambiar tu contraseña.</p>
                    <p>Ingresá el siguiente código para continuar:</p>
                    <div class="codigo">{codigo}</div>
                    <div class="warning">
                        <strong>⚠️ Importante:</strong> Este código expirará en 10 minutos. Si no solicitaste este cambio, ignorá este email.
                    </div>
                    <p>Si no solicitaste este cambio, podés ignorar este mensaje de forma segura.</p>
                </div>
                <div class="footer">
                    <p>Este es un email automático, por favor no respondas.</p>
                    <p>© 2024</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        resultado = enviar_email(
            destinatario=email,
            asunto=asunto,
            cuerpo_html=cuerpo_html
        )
        
        if not resultado['success']:
            raise HTTPException(status_code=500, detail=f"Error enviando email: {resultado.get('message', 'Error desconocido')}")
        
        logger.info(f"Código de validación enviado a {email}")
        
        return {
            "success": True,
            "message": "Código de validación enviado exitosamente",
            "expires_in_minutes": 10
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error solicitando código: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/validar-codigo-cambio-password")
async def validar_codigo_cambio_password(request: ValidarCodigoRequest):
    """Valida el código de verificación para cambio de contraseña"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Verificar si existe un código para este email
        if email not in _memoria_codigos_validacion:
            raise HTTPException(status_code=400, detail="No se encontró un código de validación para este email. Por favor, solicitá uno nuevo.")
        
        codigo_data = _memoria_codigos_validacion[email]
        
        # Verificar expiración
        expires_at = datetime.fromisoformat(codigo_data['expires_at'])
        if datetime.now() > expires_at:
            # Eliminar código expirado
            del _memoria_codigos_validacion[email]
            raise HTTPException(status_code=400, detail="El código de validación ha expirado. Por favor, solicitá uno nuevo.")
        
        # Verificar código
        if codigo_data['codigo'] != request.codigo:
            raise HTTPException(status_code=400, detail="Código de validación incorrecto")
        
        # Código válido - NO eliminar de memoria aquí, se eliminará cuando se actualice la contraseña
        # Esto permite usar el código para validar y luego actualizar la contraseña
        
        logger.info(f"Código de validación verificado correctamente para {email}")
        
        return {
            "success": True,
            "message": "Código de validación verificado correctamente",
            "valid": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validando código: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/solicitar-codigo-reset-password")
async def solicitar_codigo_reset_password(request: SolicitarCodigoRequest):
    """Genera y envía un código de validación por email para reset de contraseña (sin autenticación)"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Generar código de 6 dígitos
        codigo = ''.join(random.choices(string.digits, k=6))
        
        # Guardar código en memoria con expiración de 10 minutos
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Asegurar acceso a la variable global
        global _memoria_codigos_validacion
        
        _memoria_codigos_validacion[email] = {
            'codigo': codigo,
            'expires_at': expires_at.isoformat(),
            'user_id': request.user_id,
            'created_at': datetime.now().isoformat(),
            'type': 'reset_password'  # Marcar como reset de contraseña
        }
        
        # Enviar email con el código
        asunto = "Código de recuperación de contraseña"
        cuerpo_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .codigo {{ background: white; border: 2px solid #81D4FA; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Recuperación de Acceso</h1>
                </div>
                <div class="content">
                    <h2>Recuperación de contraseña</h2>
                    <p>Hola,</p>
                    <p>Recibiste este email porque solicitaste recuperar tu contraseña.</p>
                    <p>Ingresá el siguiente código para continuar:</p>
                    <div class="codigo">{codigo}</div>
                    <div class="warning">
                        <strong>⚠️ Importante:</strong> Este código expirará en 10 minutos. Si no solicitaste este cambio, ignorá este email y tu contraseña permanecerá segura.
                    </div>
                    <p>Si no solicitaste recuperar tu contraseña, podés ignorar este mensaje de forma segura.</p>
                </div>
                <div class="footer">
                    <p>Este es un email automático, por favor no respondas.</p>
                    <p>© 2024</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        resultado = enviar_email(
            destinatario=email,
            asunto=asunto,
            cuerpo_html=cuerpo_html
        )
        
        if not resultado['success']:
            raise HTTPException(status_code=500, detail=f"Error enviando email: {resultado.get('message', 'Error desconocido')}")
        
        logger.info(f"Código de recuperación enviado a {email}")
        
        return {
            "success": True,
            "message": "Código de recuperación enviado exitosamente",
            "expires_in_minutes": 10
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error solicitando código de recuperación: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/reset-password")
async def reset_password(request: ValidarCodigoRequest):
    """Valida el código y permite resetear la contraseña (sin autenticación)"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Verificar si existe un código para este email
        if email not in _memoria_codigos_validacion:
            raise HTTPException(status_code=400, detail="No se encontró un código de validación para este email. Por favor, solicitá uno nuevo.")
        
        codigo_data = _memoria_codigos_validacion[email]
        
        # Verificar que sea un código de reset de contraseña
        if codigo_data.get('type') != 'reset_password':
            raise HTTPException(status_code=400, detail="Este código no es válido para recuperación de contraseña")
        
        # Verificar expiración
        expires_at = datetime.fromisoformat(codigo_data['expires_at'])
        if datetime.now() > expires_at:
            # Eliminar código expirado
            del _memoria_codigos_validacion[email]
            raise HTTPException(status_code=400, detail="El código de validación ha expirado. Por favor, solicitá uno nuevo.")
        
        # Verificar código
        if codigo_data['codigo'] != request.codigo:
            raise HTTPException(status_code=400, detail="Código de validación incorrecto")
        
        # Código válido - NO eliminar aquí, se eliminará cuando se actualice la contraseña
        # Esto permite que el código se use tanto para verificar como para actualizar
        logger.info(f"Código de recuperación verificado correctamente para {email}")
        
        return {
            "success": True,
            "message": "Código de validación verificado correctamente",
            "valid": True,
            "email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validando código de recuperación: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class ActualizarPasswordResetRequest(BaseModel):
    email: str
    codigo: str
    new_password: str

@app.post("/api/auth/actualizar-password-reset")
async def actualizar_password_reset(request: ActualizarPasswordResetRequest):
    """Valida el código y actualiza la contraseña usando Supabase Admin API"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Validar longitud de contraseña
        if len(request.new_password) < 8:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
        
        if len(request.new_password) > 16:
            raise HTTPException(status_code=400, detail="La contraseña no puede tener más de 16 caracteres")
        
        # Verificar si existe un código para este email
        if email not in _memoria_codigos_validacion:
            raise HTTPException(status_code=400, detail="No se encontró un código de validación para este email. Por favor, solicitá uno nuevo.")
        
        codigo_data = _memoria_codigos_validacion[email]
        
        # Verificar que sea un código de reset de contraseña o cambio de contraseña (sin tipo específico)
        codigo_type = codigo_data.get('type')
        if codigo_type and codigo_type != 'reset_password':
            raise HTTPException(status_code=400, detail="Este código no es válido para recuperación de contraseña")
        
        # Verificar expiración
        expires_at = datetime.fromisoformat(codigo_data['expires_at'])
        if datetime.now() > expires_at:
            # Eliminar código expirado
            del _memoria_codigos_validacion[email]
            raise HTTPException(status_code=400, detail="El código de validación ha expirado. Por favor, solicitá uno nuevo.")
        
        # Verificar código
        if codigo_data['codigo'] != request.codigo:
            raise HTTPException(status_code=400, detail="Código de validación incorrecto")
        
        # Código válido - eliminar de memoria (solo se puede usar una vez)
        del _memoria_codigos_validacion[email]
        
        # Actualizar contraseña usando Supabase Admin API
        logger.info(f"Código validado para reset de contraseña de {email}")
        
        # Intentar actualizar la contraseña usando Supabase Admin API
        supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        supabase_url = os.getenv('SUPABASE_URL')
        
        if supabase_service_key and supabase_url:
            try:
                # Intentar usar el módulo supabase primero
                try:
                    from supabase import create_client, Client
                    supabase_admin: Client = create_client(supabase_url, supabase_service_key)
                    
                    # Buscar el usuario por email
                    # list_users() puede devolver diferentes formatos
                    users_response = supabase_admin.auth.admin.list_users()
                    
                    # Manejar diferentes formatos de respuesta
                    users_list = None
                    if isinstance(users_response, list):
                        users_list = users_response
                    elif hasattr(users_response, 'users'):
                        users_list = users_response.users
                    elif hasattr(users_response, 'data') and hasattr(users_response.data, 'users'):
                        users_list = users_response.data.users
                    elif hasattr(users_response, 'data') and isinstance(users_response.data, list):
                        users_list = users_response.data
                    elif isinstance(users_response, dict) and 'users' in users_response:
                        users_list = users_response['users']
                    elif isinstance(users_response, dict) and 'data' in users_response:
                        data = users_response['data']
                        if isinstance(data, dict) and 'users' in data:
                            users_list = data['users']
                        elif isinstance(data, list):
                            users_list = data
                    
                    if users_list is None:
                        raise Exception("No se pudo parsear la respuesta de list_users")
                    
                    # Buscar el usuario por email
                    user = None
                    user_id = None
                    for u in users_list:
                        # Manejar tanto objetos como diccionarios
                        user_email = u.email if hasattr(u, 'email') else u.get('email') if isinstance(u, dict) else None
                        if user_email == email:
                            user = u
                            user_id = u.id if hasattr(u, 'id') else u.get('id') if isinstance(u, dict) else None
                            break
                    
                    if user and user_id:
                        # Actualizar la contraseña del usuario
                        update_response = supabase_admin.auth.admin.update_user_by_id(
                            user_id,
                            {"password": request.new_password}
                        )
                        
                        # Verificar la respuesta de actualización
                        updated_user = None
                        if hasattr(update_response, 'user'):
                            updated_user = update_response.user
                        elif hasattr(update_response, 'data') and hasattr(update_response.data, 'user'):
                            updated_user = update_response.data.user
                        elif isinstance(update_response, dict):
                            updated_user = update_response.get('user') or update_response.get('data', {}).get('user')
                        
                        if updated_user:
                            logger.info(f"Contraseña actualizada exitosamente para {email}")
                            return {
                                "success": True,
                                "message": "Tu contraseña ha sido actualizada correctamente. Podés iniciar sesión con tu nueva contraseña.",
                                "email": email,
                                "requires_frontend_reset": False
                            }
                        else:
                            # Si no hay error explícito, asumir éxito
                            logger.info(f"Contraseña actualizada para {email} (respuesta sin user)")
                            return {
                                "success": True,
                                "message": "Tu contraseña ha sido actualizada correctamente. Podés iniciar sesión con tu nueva contraseña.",
                                "email": email,
                                "requires_frontend_reset": False
                            }
                    else:
                        raise Exception("Usuario no encontrado")
                except ImportError:
                    # Si el módulo supabase no está disponible, usar API REST directamente
                    logger.info("Módulo supabase no disponible, usando API REST directamente")
                    import requests as http_requests
                    
                    # Usar la API REST de Supabase directamente
                    headers = {
                        "apikey": supabase_service_key,
                        "Authorization": f"Bearer {supabase_service_key}",
                        "Content-Type": "application/json"
                    }
                    
                    # Listar usuarios
                    list_url = f"{supabase_url}/auth/v1/admin/users"
                    list_response = http_requests.get(list_url, headers=headers)
                    
                    if list_response.status_code != 200:
                        raise Exception(f"Error al listar usuarios: {list_response.status_code} - {list_response.text}")
                    
                    users_data = list_response.json()
                    users_list = users_data.get('users', []) if isinstance(users_data, dict) else users_data
                    
                    if not isinstance(users_list, list):
                        raise Exception("Formato de respuesta de list_users no reconocido")
                    
                    # Buscar usuario
                    user = None
                    user_id = None
                    for u in users_list:
                        u_email = u.get('email')
                        if u_email == email:
                            user = u
                            user_id = u.get('id')
                            break
                    
                    if user and user_id:
                        # Actualizar
                        update_url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
                        update_payload = {"password": request.new_password}
                        update_response = http_requests.put(update_url, headers=headers, json=update_payload)
                        
                        if update_response.status_code != 200:
                            raise Exception(f"Error al actualizar usuario: {update_response.status_code} - {update_response.text}")
                        
                        return {
                            "success": True,
                            "message": "Tu contraseña ha sido actualizada correctamente.",
                            "email": email,
                            "requires_frontend_reset": False
                        }
                    else:
                        raise Exception("Usuario no encontrado")

            except Exception as e_supa:
                logger.error(f"Error usando Supabase Admin: {e_supa}")
                raise HTTPException(status_code=500, detail=f"Error actualizando contraseña: {str(e_supa)}")
        else:
            logger.warning("No se configuraron claves de Supabase, simulando éxito")
            return {
                "success": True,
                "message": "Contraseña actualizada (Simulado - falta configuración de Supabase)",
                "email": email,
                "requires_frontend_reset": False
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en actualizar_password_reset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS DE ADMIN PARA PLANES ==========



@app.delete("/api/auth/delete-account")
async def delete_account(request: Request):
    """
    Endpoint para eliminar cuenta del usuario actual.
    Requiere token Bearer en el header Authorization.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Token no proporcionado o inválido")
            
        token = auth_header.split(' ')[1]
        user_id = None
        
        # Debug: Verificar entorno (respetando Vercel)
        import os
        
        # Intentar conectar con Supabase
        try:
             # En Vercel las variables ya están en el entorno, no cargamos .env local
             
             # Carga el cliente de Supabase estandarizado
             from backend.db_supabase import get_supabase
             supabase = get_supabase()
             
             if not supabase:
                  raise HTTPException(status_code=500, detail="Error interno: No se pudo conectar a Supabase.")

             logger.info(f"🔄 delete_account: Verificando token con Supabase...")
             user_response = supabase.auth.get_user(token)
             
             # Extracción robusta del usuario
             user = None
             if user_response:
                 if hasattr(user_response, 'user') and user_response.user:
                    user = user_response.user
                 elif hasattr(user_response, 'data') and user_response.data and hasattr(user_response.data, 'user'):
                    user = user_response.data.user
                 elif isinstance(user_response, dict):
                    user = user_response.get('user') or (user_response.get('data') or {}).get('user')

             if not user:
                 logger.warning("❌ delete_account: Token válido pero no devolvió usuario.")
                 raise HTTPException(status_code=401, detail="Token inválido o expirado")
                 
             user_id = user.id if hasattr(user, 'id') else user.get('id')
             logger.info(f"✅ delete_account: Usuario identificado: {user_id}")
                 
        except HTTPException:
            raise
        except Exception as e_verify:
            logger.error(f"❌ delete_account: Error verificando token: {e_verify}")
            raise HTTPException(status_code=401, detail="Error de autenticación: Sesión inválida")

        if not user_id:
            raise HTTPException(status_code=400, detail="No se pudo identificar al usuario (ID nulo)")
            
        # Ejecutar eliminación
        result = eliminar_usuario_totalmente(user_id)
        
        if result.get("success"):
            return {
                "success": True, 
                "message": "Cuenta eliminada correctamente"
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Error desconocido al eliminar cuenta"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error no controlado en delete_account: {e}")
        raise HTTPException(status_code=500, detail=f"Error del servidor: {str(e)}")


class AdminDeleteUserRequest(BaseModel):
    user_id: str

@app.post("/api/admin/delete-user")
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


class AdminCreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    role: Optional[str] = 'user'
    plan: Optional[str] = 'starter'
    credits: Optional[int] = 1500

@app.post("/api/admin/create-user")
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

class AdminUpdateUserRequest(BaseModel):
    user_id: str
    updates: Dict[str, Any]

@app.put("/api/admin/update-user")
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


# --- MODULE: COMMUNICATIONS (INBOX) ---

def get_user_id_from_header(request: Request) -> Optional[str]:
    # Helper simple para extraer user_id del header (usado en endpoints protegidos)
    return request.headers.get("X-User-ID")

@app.get("/api/communications/inbox")
async def get_inbox_conversations(request: Request, channel: Optional[str] = None):
    """Obtiene la lista de conversaciones (Inbox) filtrada opcionalmente por canal"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        query = admin.table("email_conversations").select("*").eq("user_id", user_id)
        
        if channel and channel != 'all':
            query = query.eq("channel", channel)
            
        res = query.order("last_message_at", desc=True).execute()
            
        return {"conversations": res.data}
    except Exception as e:
        logger.error(f"Error fetching inbox: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/api/communications/stats")
async def get_communications_stats(request: Request):
    """Obtiene estadísticas detalladas para el módulo Insights"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        
        # 1. Agregación de estados (Funnel)
        raw_convs = admin.table("email_conversations").select("status").eq("user_id", user_id).execute()
        
        status_counts = {
            "open": 0,
            "waiting_reply": 0,
            "interested": 0,
            "not_interested": 0,
            "converted": 0
        }
        
        for c in (raw_convs.data or []):
            st = c.get('status', 'open') or 'open'
            if st in status_counts:
                status_counts[st] += 1
            else:
                status_counts["open"] += 1
                
        # 2. Activity Feed (Últimos 20 mensajes)
        # Necesitamos unir con email_conversations para tener el lead_name
        recent_messages = admin.table("email_messages")\
            .select("*, email_conversations(lead_name, channel)")\
            .order("sent_at", desc=True)\
            .limit(20)\
            .execute()
            
        # 3. Radar: Leads Olvidados (Interesados sin actividad por > 3 días)
        three_days_ago = (datetime.now() - timedelta(days=3)).isoformat()
        forgotten_leads = admin.table("email_conversations")\
            .select("id, lead_name, last_message_at, subject")\
            .eq("user_id", user_id)\
            .eq("status", "interested")\
            .lt("last_message_at", three_days_ago)\
            .order("last_message_at", desc=True)\
            .limit(10)\
            .execute()

        # 4. Cálculo de Conversión
        total_leads = sum(status_counts.values())
        conversion_rate = round((status_counts["converted"] / total_leads * 100), 1) if total_leads > 0 else 0
        
        return {
            "funnel": status_counts,
            "activity": recent_messages.data or [],
            "radar": forgotten_leads.data or [],
            "kpis": {
                "total_leads": total_leads,
                "conversion_rate": conversion_rate,
                "hot_leads": status_counts["interested"]
            }
        }
    except Exception as e:
        logger.error(f"Error in stats endpoint: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/api/communications/cleanup")
async def cleanup_inactive_leads(request: Request):
    """Elimina automáticamente leads en 'Poco Interés' inactivos por > 14 días"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        # Calculamos la fecha límite (hace 14 días)
        cutoff_date = (datetime.now() - timedelta(days=14)).isoformat()
        
        # 1. Buscar conversaciones que cumplen el criterio
        to_delete = admin.table("email_conversations")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("status", "not_interested")\
            .lt("last_message_at", cutoff_date)\
            .execute()
            
        deleted_count = 0
        if to_delete.data:
            for conv in to_delete.data:
                conv_id = conv['id']
                # Eliminar mensajes primero
                admin.table("email_messages").delete().eq("conversation_id", conv_id).execute()
                # Eliminar conversación
                admin.table("email_conversations").delete().eq("id", conv_id).execute()
                deleted_count += 1
                
        return {"status": "success", "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Error in cleanup: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.delete("/api/communications/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request):
    """Elimina una conversación y sus mensajes asociados"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        # Primero eliminar mensajes (si no hay cascade delete en DB)
        admin.table("email_messages").delete().eq("conversation_id", conversation_id).execute()
        
        # Eliminar conversación (verificando user_id por seguridad)
        res = admin.table("email_conversations")\
            .delete()\
            .eq("id", conversation_id)\
            .eq("user_id", user_id)\
            .execute()
            
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id}: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/api/communications/whatsapp/log")
async def log_whatsapp_message(req: LogWhatsAppRequest, request: Request):
    """Registra un mensaje de WhatsApp enviado manualmente"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        from backend.email_sync_service import get_or_create_conversation, store_message
        
        # 1. Buscar o crear conversación de WhatsApp
        # Buscamos por lead_phone y channel='whatsapp'
        conv_id = get_or_create_conversation(
            user_id=user_id,
            lead_email=f"{req.phone}@whatsapp", # Email sintético para match
            subject="WhatsApp Chat",
            channel="whatsapp",
            lead_phone=req.phone
        )
            
        if not conv_id:
            return JSONResponse(status_code=500, content={"detail": "Could not create/find conversation"})
            
        # 2. Registrar el mensaje y actualizar conversación vía store_message
        msg_data = {
            "external_id": f"wa_{datetime.now().timestamp()}",
            "sender": "me" if req.direction == 'outbound' else req.phone,
            "recipient": req.phone if req.direction == 'outbound' else "me",
            "direction": req.direction,
            "snippet": req.message,
            "date": datetime.now().isoformat(),
            "channel": "whatsapp",
            "body_html": f"<p>{req.message}</p>"
        }
        store_message(user_id, conv_id, msg_data)
        
        return {"status": "success", "conversation_id": conv_id}
    except Exception as e:
        logger.error(f"Error logging whatsapp: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.patch("/api/communications/conversations/{conversation_id}/status")
async def update_conversation_status(conversation_id: str, req: UpdateConversationStatusRequest, request: Request):
    """Actualiza el estado de una conversación"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        
        # Verificar pertenencia
        conv = admin.table("email_conversations").select("user_id").eq("id", conversation_id).execute()
        if not conv.data or str(conv.data[0]['user_id']) != user_id:
             return JSONResponse(status_code=403, content={"detail": "Forbidden"})

        # Actualizar estado
        res = admin.table("email_conversations").update({
            "status": req.status,
            "updated_at": datetime.now().isoformat()
        }).eq("id", conversation_id).execute()
        
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Error updating status: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/api/communications/thread/{conversation_id}")
async def get_conversation_thread(conversation_id: str, request: Request):
    """Obtiene el hilo de mensajes de una conversación"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        
        # Verificar pertenencia
        conv = admin.table("email_conversations").select("user_id").eq("id", conversation_id).execute()
        if not conv.data or str(conv.data[0]['user_id']) != user_id:
             return JSONResponse(status_code=403, content={"detail": "Forbidden"})

        # Traer mensajes
        res = admin.table("email_messages")\
            .select("*")\
            .eq("conversation_id", conversation_id)\
            .order("sent_at", desc=False)\
            .execute()
            
        return {"messages": res.data}
    except Exception as e:
        logger.error(f"Error fetching thread: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/api/communications/sync")
async def trigger_email_sync(request: Request):
    """Dispara la sincronización manual de emails"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        # Importar dinámicamente para evitar ciclos
        from backend.email_sync_service import sync_gmail_account, sync_outlook_account
        from backend.db_supabase import get_all_user_oauth_tokens

        tokens = get_all_user_oauth_tokens(user_id)
        if not tokens:
             return {"status": "ok", "synced": {}, "message": "No connected accounts"}

        results = {"gmail": False, "outlook": False}
        
        # Sync Google
        google_token = next((t for t in tokens if t.get('provider') == 'google'), None)
        if google_token:
            sync_gmail_account(user_id, google_token)
            results["gmail"] = True
            
        # Sync Outlook
        outlook_token = next((t for t in tokens if t.get('provider') == 'outlook'), None)
        if outlook_token:
            sync_outlook_account(user_id, outlook_token)
            results["outlook"] = True
            
        return {"status": "ok", "synced": results}
    except Exception as e:
        logger.error(f"Error triggering sync: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/api/debug/mock-inbound")
async def mock_inbound_email(req: Dict, request: Request):
    """Simula la llegada de un correo entrante para pruebas de UI"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    
    try:
        from backend.email_sync_service import store_message
        
        # Datos del mensaje mock
        msg_data = {
            "external_id": f"mock_{datetime.now().timestamp()}",
            "sender": req.get('lead_email', 'cliente@ejemplo.com'),
            "recipient": "me@example.com",
            "direction": 'inbound',
            "snippet": req.get('message', '¡Hola! Me interesa mucho la propuesta. ¿Podemos coordinar una reunión?'),
            "date": datetime.now().isoformat(),
            "body_html": f"<p>{req.get('message', '¡Hola! Me interesa mucho la propuesta. ¿Podemos coordinar una reunión?')}</p>"
        }
        
        store_message(user_id, req.get('conversation_id'), msg_data)
        return {"status": "success", "message": "Injected mock inbound email"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/api/communications/email/reply")
async def send_email_reply(req: SendEmailReplyRequest, request: Request):
    """Envía una respuesta formal a un correo y actualiza el hilo"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        from backend.email_service import enviar_email
        from backend.email_sync_service import store_message
        
        # 1. Enviar el correo físicamente
        # Nota: Por ahora usamos enviar_email genérico que busca provider
        res_send = enviar_email(
            destinatario=req.recipient_email,
            asunto=req.subject,
            cuerpo_html=req.message.replace('\n', '<br>'),
            cuerpo_texto=req.message,
            user_id=user_id,
            attachments=req.attachments # Pasar adjuntos
        )
        
        if not res_send.get('success'):
            return JSONResponse(status_code=500, content={"detail": res_send.get('message')})
            
        # 2. Guardar en DB y actualizar estado
        msg_data = {
            "external_id": res_send.get('message_id'),
            "sender": "me", 
            "recipient": req.recipient_email,
            "direction": 'outbound',
            "snippet": req.message[:100],
            "date": datetime.now().isoformat(),
            "body_html": req.message.replace('\n', '<br>'),
            "channel": 'email'
        }
        store_message(user_id, req.conversation_id, msg_data)
        
        return {"status": "success", "message_id": res_send.get('message_id')}
    except Exception as e:
        logger.error(f"Error sending email reply: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/api/l/{slug}")
async def redirect_tracked_link(slug: str):
    """Redirige un link trackeado y registra el click"""
    try:
        admin = get_supabase_admin()
        
        # 1. Buscar el link original
        res = admin.table("link_tracking").select("*").eq("slug", slug).execute()
        
        if not res.data:
             return HTMLResponse(status_code=404, content="<h1>404 - Link Not Found</h1>")
            
        link_data = res.data[0]
        original_url = link_data['original_url']
        
        # 2. Incrementar contador de clicks
        admin.table("link_tracking").update({
            "clicks": link_data.get('clicks', 0) + 1,
            "last_click_at": datetime.now().isoformat()
        }).eq("slug", slug).execute()
        
        # 3. Redirigir
        return RedirectResponse(url=original_url)
    except Exception as e:
        logger.error(f"Error in redirector: {e}")
        return HTMLResponse(status_code=500, content="<h1>500 - Internal Server Error</h1>")

@app.post("/api/communications/link-tracking")
async def create_tracking_link(req: CreateLinkTrackingRequest, request: Request):
    """Crea un link trackeado manual"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    
    import secrets
    import string
    
    try:
        admin = get_supabase_admin()
        
        # Generar slug único
        slug = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        insert_data = {
            "user_id": user_id,
            "slug": slug,
            "original_url": req.original_url,
            "lead_id": req.lead_id,
            "conversation_id": req.conversation_id
        }
        
        admin.table("link_tracking").insert(insert_data).execute()
        
        # Construir URL pública
        api_url = os.getenv("API_URL", "http://localhost:8000")
        tracked_url = f"{api_url}/api/l/{slug}"
        
        return {"slug": slug, "tracked_url": tracked_url}
    except Exception as e:
        logger.error(f"Error creating link tracking: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

class AIAssistantRequest(BaseModel):
    query: str

@app.post("/api/ai/assistant")
async def chat_with_ai_assistant(req: AIAssistantRequest, request: Request):
    """Interactúa con el asistente de IA usando contexto de leads"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    
    try:
        from backend.ai_service import get_ai_assistant_response
        admin = get_supabase_admin()
        
        # 1. Traer contexto (Usuario / Leads recientes)
        user_res = admin.table("users").select("email, plan, credits").eq("id", user_id).single().execute()
        u = user_res.data or {}
        
        leads_res = admin.table("email_conversations")\
            .select("lead_name, lead_email, status, last_message_at, subject")\
            .eq("user_id", user_id)\
            .order("last_message_at", desc=True)\
            .limit(20)\
            .execute()
        
        context_data = f"DATOS DEL USUARIO ACTUAL (Tú): Email: {u.get('email')}, Plan: {u.get('plan')}, Créditos Disponibles: {u.get('credits')}/{u.get('monthly_credits')}\n\n"
        context_data += "Lista de 20 Conversaciones Recientes:\n"
        for l in (leads_res.data or []):
            context_data += f"- {l['lead_name']} ({l['lead_email']}): {l['status']}. Asunto: {l['subject']}. Última vez: {l['last_message_at']}\n"
            
        # 2. Obtener respuesta de Gemini
        response = get_ai_assistant_response(req.query, context_data)
        
        return {"response": response}
    except Exception as e:
        logger.error(f"Error in AI Assistant endpoint: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})
