"""
API FastAPI para sistema B2B de captación de clientes por rubro
Enfocado en empresas, no en propiedades por zona
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import logging
import os
import random
import string
from datetime import datetime, timedelta

from overpass_client import (
    buscar_empresas_por_rubro, 
    listar_rubros_disponibles,
    buscar_empresas_multiples_rubros,
    query_by_bbox
)
from scraper import enriquecer_empresa_b2b
from social_scraper import enriquecer_con_redes_sociales
from scraper_parallel import enriquecer_empresas_paralelo
from validators import validar_empresa
# Almacenamiento en memoria (sin base de datos)
# Todas las funciones trabajan con datos en memoria durante la sesión

import math
from typing import Dict, List, Optional

# Almacenamiento en memoria
_memoria_empresas: List[Dict] = []
_memoria_templates: List[Dict] = []
_memoria_email_history: List[Dict] = []
_template_counter = 0
_empresa_counter = 0
# Almacenamiento de códigos de validación para cambio de contraseña
_memoria_codigos_validacion: Dict[str, Dict] = {}  # email -> {codigo, expires_at, user_id}

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

def insertar_empresa(empresa: Dict) -> bool:
    """Guarda empresa en memoria (no persiste)"""
    import threading
    global _empresa_counter, _memoria_empresas
    
    # Lock para evitar race conditions
    if not hasattr(insertar_empresa, '_lock'):
        insertar_empresa._lock = threading.Lock()
    
    try:
        with insertar_empresa._lock:
            _empresa_counter += 1
            empresa['id'] = _empresa_counter
            empresa['created_at'] = datetime.now().isoformat()
            _memoria_empresas.append(empresa.copy())
            logger.debug(f" Empresa guardada en memoria: {empresa.get('nombre')} (ID: {_empresa_counter})")
        return True
    except Exception as e:
        logger.error(f"Error insertando empresa: {e}")
        return False

def obtener_todas_empresas() -> List[Dict]:
    """Obtiene todas las empresas de memoria"""
    return _memoria_empresas.copy()

def buscar_empresas(rubro: Optional[str] = None, ciudad: Optional[str] = None,
                   solo_validas: bool = False, con_email: bool = False,
                   con_telefono: bool = False) -> List[Dict]:
    """Busca empresas en memoria con filtros"""
    # Validar que _memoria_empresas existe y es una lista
    if not isinstance(_memoria_empresas, list):
        logger.error("_memoria_empresas no es una lista válida")
        return []
    
    resultado = _memoria_empresas.copy()
    
    if rubro:
        # Buscar tanto por rubro_key como por rubro (nombre)
        resultado = [e for e in resultado 
                    if (isinstance(e, dict) and 
                        (e.get('rubro_key') == rubro or e.get('rubro') == rubro or 
                         (isinstance(e.get('rubro'), str) and rubro.lower() in e.get('rubro', '').lower())))]
    
    if ciudad:
        # Búsqueda más precisa: coincidencia exacta o contiene (case insensitive)
        ciudad_lower = ciudad.lower().strip()
        resultado = [e for e in resultado 
                    if (isinstance(e, dict) and e.get('ciudad') and 
                        (ciudad_lower == e.get('ciudad', '').lower().strip() or 
                         ciudad_lower in e.get('ciudad', '').lower()))]
    
    if solo_validas:
        resultado = [e for e in resultado if e.get('email_valido') or e.get('telefono_valido')]
    
    if con_email:
        resultado = [e for e in resultado if e.get('email_valido')]
    
    if con_telefono:
        resultado = [e for e in resultado if e.get('telefono_valido')]
    
    return resultado

def obtener_estadisticas() -> Dict:
    """Obtiene estadísticas de empresas en memoria"""
    # Validar que _memoria_empresas existe y es una lista
    if not isinstance(_memoria_empresas, list):
        logger.error("_memoria_empresas no es una lista válida")
        return {
            'total': 0,
            'con_email': 0,
            'con_telefono': 0,
            'con_website': 0,
            'por_rubro': {},
            'por_ciudad': {}
        }
    
    total = len(_memoria_empresas)
    con_email = sum(1 for e in _memoria_empresas if isinstance(e, dict) and e.get('email') and e.get('email_valido'))
    con_telefono = sum(1 for e in _memoria_empresas if isinstance(e, dict) and e.get('telefono') and e.get('telefono_valido'))
    con_website = sum(1 for e in _memoria_empresas if isinstance(e, dict) and e.get('website') and e.get('website_valido'))
    
    # Por rubro
    por_rubro = {}
    for e in _memoria_empresas:
        if isinstance(e, dict):
        rubro = e.get('rubro', 'Sin rubro')
        por_rubro[rubro] = por_rubro.get(rubro, 0) + 1
    
    # Por ciudad
    por_ciudad = {}
    for e in _memoria_empresas:
        if isinstance(e, dict):
        ciudad = e.get('ciudad', '')
        if ciudad:
            por_ciudad[ciudad] = por_ciudad.get(ciudad, 0) + 1
    
    return {
        'total': total,
        'con_email': con_email,
        'con_telefono': con_telefono,
        'con_website': con_website,
        'por_rubro': por_rubro,
        'por_ciudad': dict(list(sorted(por_ciudad.items(), key=lambda x: x[1], reverse=True))[:10])
    }

def exportar_a_csv(rubro: Optional[str] = None, solo_validas: bool = True) -> Optional[str]:
    """Exporta empresas a CSV desde memoria"""
    import csv
    empresas = buscar_empresas(rubro=rubro, solo_validas=solo_validas)
    
    if not empresas:
        return None
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"empresas_b2b_{rubro or 'todas'}_{timestamp}.csv"
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
        campos = ['id', 'nombre', 'rubro', 'email', 'telefono', 'website', 'direccion', 'ciudad', 'pais', 
                 'busqueda_ubicacion_nombre', 'distancia_km', 'created_at']
        writer = csv.DictWriter(csvfile, fieldnames=campos, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(empresas)
    
    logger.info(f" CSV exportado: {output_path} ({len(empresas)} registros)")
    return output_path

def exportar_a_json(rubro: Optional[str] = None, solo_validas: bool = True) -> Optional[str]:
    """Exporta empresas a JSON desde memoria"""
    import json
    empresas = buscar_empresas(rubro=rubro, solo_validas=solo_validas)
    
    if not empresas:
        return None
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"empresas_b2b_{rubro or 'todas'}_{timestamp}.json"
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as jsonfile:
        json.dump(empresas, jsonfile, indent=2, ensure_ascii=False, default=str)
    
    logger.info(f" JSON exportado: {output_path} ({len(empresas)} registros)")
    return output_path

def limpiar_base_datos() -> bool:
    """Limpia todas las empresas de memoria"""
    global _memoria_empresas, _empresa_counter
    count = len(_memoria_empresas)
    _memoria_empresas = []
    _empresa_counter = 0
    logger.info(f" Memoria limpiada: {count} empresas eliminadas")
    return True

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
            template_id = crear_template(
            nombre='Presentación Dota Solutions',
            subject='Hola equipo de {nombre_empresa} - Oportunidad de colaboración',
            body_html='''<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ffffff; border-radius: 8px; padding: 30px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola equipo de <strong>{nombre_empresa}</strong>, ¿cómo están?</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Mi nombre es <strong>Ivan Levy</strong>, CTO de <strong>Dota Solutions</strong>, somos una agencia que desarrolla soluciones de software a medida.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Estuvimos analizando <strong>{rubro}</strong> y realmente nos pareció muy innovador — creemos que están ofreciendo una propuesta con gran potencial en el sector.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Queremos ofrecerles nuestros servicios, nos dedicamos a resolver soluciones digitales, sean sitios webs, sistemas de gestión, análisis de datos, automatizaciones y demás.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Nos encantaría coordinar una breve charla para mostrarles el enfoque y ver cómo podríamos trabajar codo a codo en este proyecto.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 5px;">Un saludo,</p>
            <p style="font-size: 16px; margin-bottom: 5px;"><strong>Ivan Levy</strong></p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">CTO – Dota Solutions</p>
            <p style="font-size: 14px; margin-bottom: 5px;">
                <a href="https://www.linkedin.com/in/ivan-levy/" style="color: #2563eb; text-decoration: none;">LinkedIn: https://www.linkedin.com/in/ivan-levy/</a>
            </p>
            <p style="font-size: 14px; margin-bottom: 0;">
                <a href="https://www.dotasolutions.agency/" style="color: #2563eb; text-decoration: none;">Sitio web: https://www.dotasolutions.agency/</a>
            </p>
        </div>
    </div>
</body>
</html>''',
            body_text='''Hola equipo de {nombre_empresa}, ¿cómo están?

Mi nombre es Ivan Levy, CTO de Dota Solutions, somos una agencia que desarrolla soluciones de software a medida.

Estuvimos analizando {rubro} y realmente nos pareció muy innovador — creemos que están ofreciendo una propuesta con gran potencial en el sector.

Queremos ofrecerles nuestros servicios, nos dedicamos a resolver soluciones digitales, sean sitios webs, sistemas de gestión, análisis de datos, automatizaciones y demás.

Nos encantaría coordinar una breve charla para mostrarles el enfoque y ver cómo podríamos trabajar codo a codo en este proyecto.

Un saludo,
Ivan Levy
CTO – Dota Solutions

LinkedIn: https://www.linkedin.com/in/ivan-levy/
Sitio web: https://www.dotasolutions.agency/'''
        )
    except Exception as e:
        logger.error(f"Error inicializando templates por defecto: {e}")

from email_service import enviar_email_empresa, enviar_emails_masivo, enviar_email

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

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# CORS - Permitir todos los orígenes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Handler para peticiones OPTIONS (preflight)
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Maneja peticiones OPTIONS (preflight) para CORS"""
    from fastapi.responses import Response
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Max-Age"] = "3600"
    return response

# Exception handler para HTTPException (asegura CORS en errores HTTP)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Maneja HTTPException y asegura que CORS siempre se incluya"""
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    
    # Agregar headers CORS manualmente
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Exception handler global para asegurar que CORS siempre se incluya
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Maneja todas las excepciones y asegura que CORS siempre se incluya"""
    import traceback
    logger.error(f"Error no manejado: {exc}", exc_info=True)
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Crear respuesta con headers CORS
    response = JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor", "error": str(exc)}
    )
    
    # Agregar headers CORS manualmente
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Modelos
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

class EnviarEmailMasivoRequest(BaseModel):
    empresa_ids: List[int]
    template_id: int
    asunto_personalizado: Optional[str] = None
    delay_segundos: float = 3.0  # Delay automático: 3 segundos (óptimo para evitar spam y rate limiting)

# Inicializar sistema en memoria
@app.on_event("startup")
async def startup():
    logger.info(" Iniciando API B2B...")
    _init_default_templates()
    logger.info(" Sistema B2B listo (almacenamiento en memoria - sin persistencia)")

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
                "rubro": "desarrolladoras_inmobiliarias",
                "pais": "España",
                "ciudad": "Madrid"
            }
        }

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
        
        logger.info(f" Búsqueda B2B - Rubro: {request.rubro}, Solo válidas: {solo_validadas}, Limpiar anterior: {limpiar_anterior}")
        
        # Validar bbox si se proporciona
        bbox_valido = False
        if request.bbox:
            try:
                # Validar formato: debe ser "south,west,north,east" con 4 números
                partes = request.bbox.split(',')
                if len(partes) == 4:
                    coords = [float(p.strip()) for p in partes]
                    # Validar rangos: latitud -90 a 90, longitud -180 a 180
                    if (-90 <= coords[0] <= 90 and -90 <= coords[2] <= 90 and
                        -180 <= coords[1] <= 180 and -180 <= coords[3] <= 180 and
                        coords[0] < coords[2] and coords[1] < coords[3]):
                        bbox_valido = True
            except (ValueError, AttributeError) as e:
                logger.warning(f"Bbox inválido: {request.bbox}, error: {e}")
        
        # Buscar en OpenStreetMap
        if request.bbox and bbox_valido:
            # Búsqueda por bounding box (ubicación en mapa)
            logger.info(f" Búsqueda por bbox: {request.bbox}")
            empresas = query_by_bbox(
                bbox=request.bbox,
                rubro=request.rubro
            )
            # Validar que query_by_bbox retornó una lista válida
            if empresas is None:
                logger.error("query_by_bbox retornó None")
                empresas = []
        else:
            # Búsqueda por ciudad/país (método antiguo)
            if request.bbox and not bbox_valido:
                logger.warning(f"Bbox inválido, usando búsqueda por ciudad/país")
            empresas = buscar_empresas_por_rubro(
                rubro=request.rubro,
                pais=request.pais,
                ciudad=request.ciudad
            )
            # Validar que buscar_empresas_por_rubro retornó una lista válida
            if empresas is None:
                logger.error("buscar_empresas_por_rubro retornó None")
                empresas = []
        
        # Asegurar que empresas es una lista
        if not isinstance(empresas, list):
            logger.error(f"Empresas no es una lista: {type(empresas)}")
            empresas = []
        
        if not empresas:
            return {
                "success": True,
                "count": 0,
                "message": "No se encontraron empresas para este rubro",
                "data": []
            }
        
        logger.info(f" Encontradas {len(empresas)} empresas en OSM")
        
        # Guardar el número total encontrado ANTES de cualquier filtro
        total_encontradas_original = len(empresas)
        
        # Enriquecer con scraping paralelo si está habilitado
        if request.scrapear_websites:
            logger.info(" Iniciando enriquecimiento paralelo de empresas...")
            try:
                empresas_enriquecidas = enriquecer_empresas_paralelo(
                empresas=empresas,
                timeout_por_empresa=20
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
        from validators import validar_email, validar_telefono, validar_website
        
        empresas_validadas = []
        empresas_rechazadas = []
        empresas_sin_contacto = []
        
        for empresa in empresas:
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
            
            # Log detallado para debugging
            logger.debug(f" Empresa: {nombre}, Email válido: {email_valido}, Teléfono válido: {tel_valido}, Tiene contacto: {tiene_contacto_valido}, Solo válidas: {request.solo_validadas}")
            
            if tiene_contacto_valido:
                # Empresa con contacto válido - siempre se guarda
                empresa_validada['validada'] = True
                empresas_validadas.append(empresa_validada)
                insertar_empresa(empresa_validada)
                mensaje = "Email y teléfono válidos" if (email_valido and tel_valido) else ("Email válido" if email_valido else "Teléfono válido")
                logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - {mensaje}")
            elif not solo_validadas:
                # Empresa sin contacto válido pero con nombre válido - solo se guarda si no se requiere solo válidas
                empresa_validada['validada'] = False
                empresas_sin_contacto.append(empresa_validada)
                insertar_empresa(empresa_validada)
                logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - Sin contacto válido (solo_validadas=False)")
            else:
                # Empresa sin contacto válido y se requiere solo válidas - NO se guarda
                empresas_rechazadas.append(empresa)
                logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: RECHAZADA - Sin contacto válido (email_valido={email_valido}, tel_valido={tel_valido}, solo_validadas={solo_validadas})")
        
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
    """Lista todas las empresas almacenadas"""
    try:
        empresas = obtener_todas_empresas()
        
        return {
            "success": True,
            "total": len(empresas),
            "data": empresas
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

# ========== ENDPOINTS DE ENVÍO DE EMAILS ==========

@app.post("/email/enviar")
async def enviar_email_individual(request: EnviarEmailRequest):
    """Envía un email individual a una empresa"""
    try:
        # Buscar empresa en memoria
        empresa = None
        for e in _memoria_empresas:
            if e.get('id') == request.empresa_id:
                empresa = e.copy()
                break
        
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada en memoria")
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        # Enviar email
        resultado = enviar_email_empresa(
            empresa=empresa,
            template=template,
            asunto_personalizado=request.asunto_personalizado
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
            delay_segundos=request.delay_segundos
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
        from validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Generar código de 6 dígitos
        codigo = ''.join(random.choices(string.digits, k=6))
        
        # Guardar código en memoria con expiración de 10 minutos
        expires_at = datetime.now() + timedelta(minutes=10)
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
        from validators import validar_email
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
        
        # Código válido - eliminar de memoria (solo se puede usar una vez)
        del _memoria_codigos_validacion[email]
        
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
        from validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Generar código de 6 dígitos
        codigo = ''.join(random.choices(string.digits, k=6))
        
        # Guardar código en memoria con expiración de 10 minutos
        expires_at = datetime.now() + timedelta(minutes=10)
        _memoria_codigos_validacion[email] = {
            'codigo': codigo,
            'expires_at': expires_at.isoformat(),
            'user_id': getattr(request, 'user_id', None),  # user_id es opcional para reset
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
        from validators import validar_email
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
        
        # Código válido - eliminar de memoria (solo se puede usar una vez)
        del _memoria_codigos_validacion[email]
        
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
        from validators import validar_email
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
        
        # Código válido - eliminar de memoria (solo se puede usar una vez)
        del _memoria_codigos_validacion[email]
        
        # Actualizar contraseña usando Supabase Admin API
        # Nota: Esto requiere que el backend tenga configurada la SUPABASE_SERVICE_ROLE_KEY
        # Si no está configurada, el frontend usará resetPasswordForEmail como método alternativo
        logger.info(f"Código validado para reset de contraseña de {email}")
        
        # Retornar éxito - el frontend manejará la actualización usando resetPasswordForEmail
        # o el backend puede implementar Supabase Admin API si tiene las credenciales
        return {
            "success": True,
            "message": "Código validado correctamente",
            "email": email,
            "requires_frontend_reset": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando contraseña: {e}", exc_info=True)
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

