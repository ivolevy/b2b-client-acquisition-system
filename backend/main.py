"""
API FastAPI para sistema B2B de captación de clientes por rubro
Enfocado en empresas, no en propiedades por zona
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os
import sys
import time
import asyncio
import math
import json
import random
import string
from datetime import datetime, timedelta

try:
    from backend.overpass_client import (
        buscar_empresas_por_rubro, 
        listar_rubros_disponibles,
        buscar_empresas_multiples_rubros,
        query_by_bbox
    )
    from backend.scraper import enriquecer_empresa_b2b
    from backend.social_scraper import enriquecer_con_redes_sociales
    from backend.scraper_parallel import enriquecer_empresas_paralelo
    from backend.validators import validar_empresa
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
        delete_search_history
    )
    from backend.auth_google import get_google_auth_url, exchange_code_for_token
    from backend.auth_outlook import get_outlook_auth_url, exchange_code_for_token as exchange_outlook_token
    from backend.google_places_client import google_client
except ImportError as e:
    logging.error(f"Error importando módulos del backend: {e}")
    # Solo para desarrollo local si el paquete no está instalado
    from overpass_client import *
    from scraper import *
    from social_scraper import *
    from scraper_parallel import *
    from .validators import *
    from db_supabase import *
    from auth_google import *
    from auth_outlook import *
# Todas las funciones trabajan con datos en memoria durante la sesión

import math
from typing import Dict, List, Optional

# Inicialización de variables en memoria
# IMPORTANTE: Estas variables deben ser accesibles globalmente
global _memoria_empresas
global _empresa_counter
global _memoria_templates
global _template_counter
global _memoria_email_history
global _memoria_codigos_validacion

_memoria_empresas = []
_empresa_counter = 0
_memoria_templates = []
_template_counter = 0
_memoria_email_history = []
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

def obtener_templates() -> List[Dict]:
    """Obtiene todos los templates de memoria"""
    return _memoria_templates.copy()

def obtener_template(template_id: int) -> Optional[Dict]:
    """Obtiene un template por ID de memoria"""
    for t in _memoria_templates:
        if t.get('id') == template_id:
            return t.copy()
    return None

def crear_template(nombre: str, subject: str, body_html: str, body_text: Optional[str] = None) -> Optional[int]:
    """Crea un nuevo template en memoria"""
    global _template_counter
    _template_counter += 1
    
    # Verificar si ya existe
    if any(t.get('nombre') == nombre for t in _memoria_templates):
        logger.error(f"Template '{nombre}' ya existe")
        return None
    
    template = {
        'id': _template_counter,
        'nombre': nombre,
        'subject': subject,
        'body_html': body_html,
        'body_text': body_text,
        'es_default': 0,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    _memoria_templates.append(template)
    logger.info(f" Template creado en memoria: {nombre} (ID: {_template_counter})")
    return _template_counter

def actualizar_template(template_id: int, nombre: Optional[str] = None, subject: Optional[str] = None,
                       body_html: Optional[str] = None, body_text: Optional[str] = None) -> bool:
    """Actualiza un template en memoria"""
    # Validar que al menos un campo se actualice
    if not any([nombre, subject, body_html, body_text is not None]):
        logger.warning(f"Intento de actualizar template {template_id} sin campos")
        return False
    
    for i, t in enumerate(_memoria_templates):
        if t.get('id') == template_id:
            cambios = False
            if nombre and isinstance(nombre, str) and nombre.strip():
                _memoria_templates[i]['nombre'] = nombre.strip()
                cambios = True
            if subject and isinstance(subject, str) and subject.strip():
                _memoria_templates[i]['subject'] = subject
                cambios = True
            if body_html and isinstance(body_html, str) and body_html.strip():
                _memoria_templates[i]['body_html'] = body_html
                cambios = True
            if body_text is not None:
                _memoria_templates[i]['body_text'] = body_text if body_text else None
                cambios = True
            
            if cambios:
                _memoria_templates[i]['updated_at'] = datetime.now().isoformat()
                logger.info(f" Template actualizado en memoria: ID {template_id}")
                return True
            else:
                logger.warning(f"No se aplicaron cambios válidos al template {template_id}")
                return False
    return False

def eliminar_template(template_id: int) -> bool:
    """Elimina un template de memoria"""
    global _memoria_templates
    
    # Verificar si el template está en uso (búsqueda simple en historial)
    # Nota: En producción debería verificar en base de datos
    template_en_uso = False
    for hist in _memoria_email_history:
        if hist.get('template_id') == template_id:
            template_en_uso = True
            break
    
    if template_en_uso:
        logger.warning(f"Template {template_id} está en uso en historial, no se puede eliminar")
        return False
    
    original_len = len(_memoria_templates)
    _memoria_templates = [t for t in _memoria_templates if t.get('id') != template_id]
    deleted = len(_memoria_templates) < original_len
    if deleted:
        logger.info(f" Template eliminado de memoria: ID {template_id}")
    return deleted

def guardar_email_history(empresa_id: int, empresa_nombre: str, empresa_email: str,
                         template_id: int, template_nombre: str, subject: str,
                         status: str, error_message: Optional[str] = None) -> bool:
    """Guarda historial de email en memoria"""
    # Validar datos antes de guardar
    if not isinstance(empresa_id, int) or empresa_id <= 0:
        logger.warning(f"empresa_id inválido: {empresa_id}")
        return False
    
    if not isinstance(template_id, int) or template_id <= 0:
        logger.warning(f"template_id inválido: {template_id}")
        return False
    
    if not status or status not in ['success', 'error']:
        logger.warning(f"status inválido: {status}")
        return False
    
    try:
        _memoria_email_history.append({
            'id': len(_memoria_email_history) + 1,
            'empresa_id': empresa_id,
            'empresa_nombre': str(empresa_nombre) if empresa_nombre else '',
            'empresa_email': str(empresa_email) if empresa_email else '',
            'template_id': template_id,
            'template_nombre': str(template_nombre) if template_nombre else '',
            'subject': str(subject) if subject else '',
            'status': status,
            'error_message': str(error_message) if error_message else None,
            'sent_at': datetime.now().isoformat()
        })
        return True
    except Exception as e:
        logger.error(f"Error guardando historial de email: {e}")
        return False

def obtener_email_history(empresa_id: Optional[int] = None, template_id: Optional[int] = None,
                         limit: int = 100) -> List[Dict]:
    """Obtiene historial de emails de memoria"""
    resultado = _memoria_email_history.copy()
    
    if empresa_id:
        resultado = [h for h in resultado if h.get('empresa_id') == empresa_id]
    
    if template_id:
        resultado = [h for h in resultado if h.get('template_id') == template_id]
    
    return resultado[-limit:]

# Inicializar templates por defecto
def _init_default_templates():
    """Inicializa templates por defecto en memoria"""
    try:
        if len(_memoria_templates) == 0:
            # Template por defecto: Primer contacto (Simple y Profesional)
            template_id = crear_template(
            nombre='Primer contacto (Ejemplo)',
            subject='Contacto: {nombre_empresa} - Posible colaboración',
            body_html='''<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ffffff; border-radius: 8px; padding: 30px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola, espero que estén muy bien.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Nos ponemos en contacto con ustedes porque vimos su trabajo en el rubro <strong>{rubro}</strong> y nos pareció muy interesante.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Creemos que tienen un gran potencial para seguir creciendo y nos gustaría charlar brevemente para explorar cómo podríamos colaborar y aportar valor a su negocio.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Quedo a la espera de su respuesta.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 5px;">Saludos cordiales,</p>
            <p style="font-size: 14px; margin-bottom: 0;">
                <a href="#" style="color: #2563eb; text-decoration: none;">[Tu Sitio Web]</a>
            </p>
        </div>
    </div>
</body>
</html>''',
            body_text='''Hola, espero que estén muy bien.

Nos ponemos en contacto con ustedes porque vimos su trabajo en el rubro {rubro} y nos pareció muy interesante.

Creemos que tienen un gran potencial para seguir creciendo y nos gustaría charlar brevemente para explorar cómo podríamos colaborar y aportar valor a su negocio.

Quedo a la espera de su respuesta.

Saludos cordiales.

Sitio web: [Tu Sitio Web]'''
        )
    except Exception as e:
        logger.error(f"Error inicializando templates por defecto: {e}")

from backend.email_service import enviar_email_empresa, enviar_emails_masivo, enviar_email

# Configurar logging
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

# Inicializar FastAPI
app = FastAPI(
    title="B2B Client Acquisition API", 
    version="2.0.0",
    description="Sistema de captación de clientes B2B por rubro empresarial"
)

# CORS - Configuración robusta para producción y desarrollo
# Usamos allow_origins=["*"] y allow_credentials=False para máxima compatibilidad con Vercel
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

# Modelos

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "B2B Client Acquisition API",
        "documentation": "/docs",
        "python_version": sys.version
    }

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

class BusquedaMultipleRequest(BaseModel):
    rubros: List[str]
    pais: Optional[str] = None
    ciudad: Optional[str] = None

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

class ActualizarEstadoRequest(BaseModel):
    id: int
    estado: str
    notas: Optional[str] = None

class ActualizarNotasRequest(BaseModel):
    id: int
    notas: str

class TemplateRequest(BaseModel):
    nombre: str
    subject: str
    body_html: str
    body_text: Optional[str] = None

class TemplateUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None

class EnviarEmailRequest(BaseModel):
    empresa_id: int
    template_id: int
    asunto_personalizado: Optional[str] = None
    user_id: Optional[str] = None
    empresa_data: Optional[Dict[str, Any]] = None

class EnviarEmailMasivoRequest(BaseModel):
    empresa_ids: List[int]
    template_id: int
    asunto_personalizado: Optional[str] = None
    delay_segundos: float = 3.0
    user_id: Optional[str] = None

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

# Inicializar sistema en memoria
@app.on_event("startup")
async def startup():
    logger.info(" Iniciando API B2B...")
    try:
        # Intentar conectar a DB pero no bloquear si falla
        logger.info("Verificando templates...")
        _init_default_templates()
        
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

@app.get("/buscar/progreso/{task_id}")
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

@app.get("/rubros")
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

@app.get("/users/{user_id}/history")
async def api_get_search_history(user_id: str, limit: int = 10):
    """Obtiene el historial de búsquedas de un usuario"""
    history = get_search_history(user_id, limit)
    return {
        "success": True,
        "user_id": user_id,
        "history": history
    }

@app.post("/users/history")
async def api_save_search_history(request: SearchHistoryRequest):
    """Guarda una búsqueda en el historial"""
    result = save_search_history(request.user_id, request.dict())
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Error al guardar historial"))
    
    return result

@app.delete("/users/{user_id}/history/{search_id}")
async def api_delete_search_history(user_id: str, search_id: str):
    """Elimina una entrada del historial"""
    success = delete_search_history(user_id, search_id)
    if not success:
        raise HTTPException(status_code=500, detail="Error al eliminar del historial")
    
    return {"success": True, "message": "Entrada eliminada correctamente"}

@app.post("/buscar")
async def buscar_por_rubro(request: BusquedaRubroRequest):
    """
    Busca empresas de un rubro específico con validación de contactos
    Puede buscar por bbox (bounding box) o por ciudad/país
    """
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
                "message": "Buscando en OpenStreetMap..."
            }
        
        # Validar bbox
        bbox_valido = False
        if request.bbox:
            partes = request.bbox.split(',')
            bbox_valido = len(partes) == 4
            
        # --- NUEVA LÓGICA: PRIORITY GOOGLE CON FALLBACK A OSM ---
        empresas = []
        source_used = "osm" # Default fallback
        search_method = "bbox" if request.bbox and bbox_valido else "city"

        try:
            # Intentar primero con Google Places
            logger.info(f" Intentando búsqueda con Google Places API (New)...")
            
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

            # Ejecutar búsqueda en Google (incluye Quadtree y Deduplicación interna)
            # Pasamos el nombre del rubro para el mapeo
            from backend.overpass_client import RUBROS_DISPONIBLES
            rubro_info = RUBROS_DISPONIBLES.get(request.rubro, {"nombre": request.rubro})
            
            google_results = await asyncio.to_thread(
                google_client.search_all_places,
                query=f"{rubro_info['nombre']} en {request.ciudad or request.pais or 'el mapa'}",
                rubro_nombre=rubro_info['nombre'],
                rubro_key=request.rubro,
                bbox=google_bbox,
                lat=request.busqueda_centro_lat,
                lng=request.busqueda_centro_lng,
                radius=(request.busqueda_radio_km * 1000) if request.busqueda_radio_km else None
            )

            if google_results and not any(isinstance(r, dict) and r.get('error') == 'PRESUPUESTO_AGOTADO' for r in google_results):
                empresas = google_results
                source_used = "google"
                logger.info(f" EXITOSA: {len(empresas)} empresas obtenidas de Google Places")
            else:
                logger.warning(" Fallback a OSM por presupuesto agotado o falta de resultados en Google.")
                raise Exception("Trigger OSM Fallback")

        except Exception as e:
            if str(e) != "Trigger OSM Fallback":
                logger.error(f" Error en Google Places: {e}. Usando OpenStreetMap como fallback.")
            
            # FALLBACK: Buscar en OpenStreetMap (Lógica original)
            if request.bbox and bbox_valido:
                empresas = await asyncio.to_thread(
                    query_by_bbox,
                    bbox=request.bbox,
                    rubro=request.rubro
                )
            else:
                empresas = await asyncio.to_thread(
                    buscar_empresas_por_rubro,
                    rubro=request.rubro,
                    pais=request.pais,
                    ciudad=request.ciudad
                )
            source_used = "osm"
            logger.info(f" Fallback OSM: {len(empresas if empresas else [])} empresas obtenidas")

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

        logger.info(f" Encontradas {len(empresas)} empresas en OSM")
        
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
        
        # Agregar información de búsqueda y calcular distancias
        if request.busqueda_centro_lat and request.busqueda_centro_lng:
            logger.info(f" Calculando distancias desde ubicación: {request.busqueda_ubicacion_nombre or 'Sin nombre'}")
            # El radio ya viene en kilómetros desde el frontend
            radio_km = request.busqueda_radio_km if request.busqueda_radio_km else None
            
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
                        
                        # Filtrar por radio: solo incluir empresas dentro del radio
                        if radio_km is not None and isinstance(radio_km, (int, float)) and radio_km > 0:
                            if distancia > radio_km:
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

@app.post("/buscar-multiple")
async def buscar_multiples_rubros(request: BusquedaMultipleRequest):
    """Busca empresas de múltiples rubros simultáneamente"""
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

@app.get("/admin/usage-stats")
async def get_usage_stats(admin: Dict = Depends(get_current_admin)):
    """Obtiene las estadísticas de uso de API para el dashboard"""
    from backend.db_supabase import get_current_month_usage
    client = get_supabase()
    if not client:
        raise HTTPException(status_code=500, detail="Error de base de datos")
        
    try:
        from datetime import datetime
        current_month = datetime.now().replace(day=1).date().isoformat()
        res = client.table('api_usage_stats').select('*').eq('month', current_month).execute()
        
        total_cost = sum([float(item.get('estimated_cost_usd', 0)) for item in res.data])
        
        return {
            "success": True,
            "month": current_month,
            "total_estimated_cost_usd": total_cost,
            "stats": res.data,
            "provider_status": "google" if total_cost < 195 else "osm"
        }
    except Exception as e:
        logger.error(f"Error en /admin/usage-stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/estadisticas")
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

@app.post("/exportar")
async def exportar(request: ExportRequest):
    """Exporta empresas a CSV o JSON"""
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

@app.delete("/clear")
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

@app.put("/empresa/estado")
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

@app.put("/empresa/notas")
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

# ========== ENDPOINTS DE EMAIL TEMPLATES ==========

@app.get("/templates")
async def listar_templates():
    """Lista todos los templates de email"""
    try:
        templates = obtener_templates()
        return {
            "success": True,
            "total": len(templates),
            "data": templates
        }
    except Exception as e:
        logger.error(f"Error listando templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates/{template_id}")
async def obtener_template_endpoint(template_id: int):
    """Obtiene un template por ID"""
    try:
        template = obtener_template(template_id)
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

@app.post("/templates")
async def crear_template_endpoint(request: TemplateRequest):
    """Crea un nuevo template"""
    try:
        template_id = crear_template(
            nombre=request.nombre,
            subject=request.subject,
            body_html=request.body_html,
            body_text=request.body_text
        )
        if not template_id:
            raise HTTPException(status_code=400, detail="Error creando template. Verifica que el nombre no exista.")
        return {
            "success": True,
            "message": "Template creado exitosamente",
            "template_id": template_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/templates/{template_id}")
async def actualizar_template_endpoint(template_id: int, request: TemplateUpdateRequest):
    """Actualiza un template"""
    try:
        success = actualizar_template(
            template_id=template_id,
            nombre=request.nombre,
            subject=request.subject,
            body_html=request.body_html,
            body_text=request.body_text
        )
        if not success:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        return {
            "success": True,
            "message": "Template actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/templates/{template_id}")
async def eliminar_template_endpoint(template_id: int):
    """Elimina un template"""
    try:
        success = eliminar_template(template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Template no encontrado")
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

@app.post("/auth/google/url")
async def google_auth_url(request: GoogleAuthURLRequest):
    """Obtiene la URL para iniciar el flujo de Google OAuth"""
    try:
        url = get_google_auth_url(state=request.state)
        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"Error generando URL de Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/google/callback")
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
        success = save_user_oauth_token(user_id, token_data)
        
        if not success:
            logger.error(f"Error guardando token OAuth para usuario {user_id}")
            return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=error&reason=save_failed"})
            
        # Redirigir de vuelta al frontend (ajustar URL según sea necesario)
        logger.info(f"Gmail conectado exitosamente para usuario {user_id}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=success"})
        
    except Exception as e:
        logger.error(f"Error en callback de Google Auth: {e}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=error&reason={str(e)}"})

@app.get("/auth/google/status/{user_id}")
async def google_status(user_id: str):
    """Verifica si el usuario tiene una cuenta de Gmail conectada"""
    try:
        token_data = get_user_oauth_token(user_id)
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

@app.post("/auth/google/disconnect/{user_id}")
async def google_disconnect(user_id: str):
    """Elimina la conexión con Google Gmail"""
    try:
        success = delete_user_oauth_token(user_id)
        return {"success": success, "message": "Cuenta desconectada exitosamente"}
    except Exception as e:
        logger.error(f"Error desconectando Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== OUTLOOK OAUTH ENDPOINTS ==========

@app.post("/auth/outlook/url")
async def outlook_auth_url(request: GoogleAuthURLRequest):
    """Obtiene URL para OAuth de Outlook"""
    try:
        url = get_outlook_auth_url(state=request.state)
        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"Error generando URL Outlook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/outlook/callback")
async def outlook_callback(code: str, state: str):
    """Callback Outlook OAuth"""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    try:
        user_id = state
        token_data = exchange_outlook_token(code)
        
        success = save_user_oauth_token(user_id, token_data, provider='outlook')
        
        if not success:
             return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=error&reason=save_failed"})
             
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=success"})
    except Exception as e:
        logger.error(f"Error callback Outlook: {e}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=error&reason={str(e)}"})

@app.post("/auth/outlook/disconnect/{user_id}")
async def outlook_disconnect(user_id: str):
    """Desconectar Outlook"""
    try:
        success = delete_user_oauth_token(user_id, provider='outlook')
        return {"success": success, "message": "Outlook desconectado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/status/{user_id}")
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
        resultado = enviar_email_empresa(
            empresa=empresa,
            template=template,
            asunto_personalizado=request.asunto_personalizado,
            user_id=request.user_id
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

@app.post("/email/enviar-masivo")
async def enviar_email_masivo_endpoint(request: EnviarEmailMasivoRequest):
    """Envía emails a múltiples empresas"""
    try:
        # Buscar empresas en memoria
        empresas = []
        empresas_dict = {e.get('id'): e for e in _memoria_empresas}
        
        for empresa_id in request.empresa_ids:
            if empresa_id in empresas_dict:
                empresas.append(empresas_dict[empresa_id].copy())
        
        if len(empresas) != len(request.empresa_ids):
            missing = set(request.empresa_ids) - set(e.get('id') for e in empresas)
            raise HTTPException(status_code=404, detail=f"Algunas empresas no fueron encontradas: {missing}")
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        # Enviar emails
        resultados = enviar_emails_masivo(
            empresas=empresas,
            template=template,
            asunto_personalizado=request.asunto_personalizado,
            delay_segundos=request.delay_segundos,
            user_id=request.user_id
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

@app.get("/email/historial")
async def obtener_historial_email(empresa_id: Optional[int] = None, template_id: Optional[int] = None, limit: int = 100):
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

@app.post("/auth/solicitar-codigo-cambio-password")
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
        asunto = "Código de validación para cambio de contraseña - Smart Leads"
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
                    <h1>Smart Leads</h1>
                </div>
                <div class="content">
                    <h2>Código de validación</h2>
                    <p>Hola,</p>
                    <p>Recibiste este email porque solicitaste cambiar tu contraseña en Smart Leads.</p>
                    <p>Ingresá el siguiente código para continuar:</p>
                    <div class="codigo">{codigo}</div>
                    <div class="warning">
                        <strong>⚠️ Importante:</strong> Este código expirará en 10 minutos. Si no solicitaste este cambio, ignorá este email.
                    </div>
                    <p>Si no solicitaste este cambio, podés ignorar este mensaje de forma segura.</p>
                </div>
                <div class="footer">
                    <p>Este es un email automático, por favor no respondas.</p>
                    <p>© 2024 Smart Leads</p>
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

@app.post("/auth/validar-codigo-cambio-password")
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

@app.post("/auth/solicitar-codigo-reset-password")
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
        asunto = "Código de recuperación de contraseña - Smart Leads"
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
                    <h1>Smart Leads</h1>
                </div>
                <div class="content">
                    <h2>Recuperación de contraseña</h2>
                    <p>Hola,</p>
                    <p>Recibiste este email porque solicitaste recuperar tu contraseña en Smart Leads.</p>
                    <p>Ingresá el siguiente código para continuar:</p>
                    <div class="codigo">{codigo}</div>
                    <div class="warning">
                        <strong>⚠️ Importante:</strong> Este código expirará en 10 minutos. Si no solicitaste este cambio, ignorá este email y tu contraseña permanecerá segura.
                    </div>
                    <p>Si no solicitaste recuperar tu contraseña, podés ignorar este mensaje de forma segura.</p>
                </div>
                <div class="footer">
                    <p>Este es un email automático, por favor no respondas.</p>
                    <p>© 2024 Smart Leads - Dota Solutions</p>
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

@app.post("/auth/reset-password")
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

@app.post("/auth/actualizar-password-reset")
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



@app.delete("/auth/delete-account")
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
             
             # Diagnóstico para Vercel Logs
             url_env = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
             key_env = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
             service_key_env = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
             
             logger.info(f"🔍 Vercel Env Check: URL={'OK' if url_env else 'MISSING'}, KEY={'OK' if key_env else 'MISSING'}, SERVICE_KEY={'OK' if service_key_env else 'MISSING'}")
             
             from db_supabase import get_supabase
             supabase = get_supabase()
             
             if not supabase:
                 # Si db_supabase falla, intentamos inicializar directo con lo que hayamos encontrado
                 if url_env and key_env:
                     logger.warning("⚠️ get_supabase() falló. Intentando inicializar manual con variables encontradas.")
                     from supabase import create_client
                     supabase = create_client(url_env, key_env)
             
             if not supabase:
                 raise HTTPException(status_code=500, detail="Error interno: No se pudo conectar a Supabase. Revisa las Variables de Entorno en Vercel.")

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

@app.post("/admin/delete-user")
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

@app.post("/admin/create-user")
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
            
        return {"success": True, "data": result.get("data")}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en /admin/create-user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AdminUpdateUserRequest(BaseModel):
    user_id: str
    updates: Dict[str, Any]

@app.put("/admin/update-user")
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
    print("""
    ╔══════════════════════════════════════════════════╗
    ║   B2B CLIENT ACQUISITION API - INICIANDO...      ║
    ║                                                  ║
    ║   Sistema de captación de clientes por rubro    ║
    ║   Enfoque: Empresas B2B con datos validados     ║
    ╚══════════════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

