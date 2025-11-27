"""
Base de datos - Preparado para Supabase
SQLite deshabilitado temporalmente. Las funciones están como stubs.
TODO: Implementar con Supabase cuando se agregue autenticación por usuario.
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime
import math

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQLite deshabilitado - Preparado para Supabase
logger.info(" SQLite deshabilitado - Modo sin persistencia activado")

def init_db_b2b():
    """Inicializa base de datos - STUB (no hace nada)"""
    logger.info(" init_db_b2b() llamado - SQLite deshabilitado, no se inicializa BD")
    return True

def calcular_distancia_km(lat1: float, lon1: float, lat2: float, lon2: float) -> Optional[float]:
    """
    Calcula la distancia en kilómetros entre dos puntos geográficos usando la fórmula de Haversine
    Esta función NO usa BD, solo cálculos matemáticos
    """
    if not all(isinstance(coord, (int, float)) and not math.isnan(coord) 
               for coord in [lat1, lon1, lat2, lon2]):
        return None
    
    # Radio de la Tierra en kilómetros
    R = 6371.0
    
    # Convertir grados a radianes
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Diferencia de latitud y longitud
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Fórmula de Haversine
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distancia = R * c
    return round(distancia, 2)

def insertar_empresa(empresa: Dict) -> bool:
    """Inserta empresa - STUB (no guarda, solo log)"""
    logger.debug(f" insertar_empresa() llamado - SQLite deshabilitado, no se guarda: {empresa.get('nombre')}")
    return True  # Retorna True para que el código no se rompa

def guardar_cache_scraping(
    website: Optional[str],
    data: Dict,
    status: str = "success",
    http_status: Optional[int] = None
) -> bool:
    """Guarda cache de scraping - STUB (no guarda)"""
    logger.debug(f" guardar_cache_scraping() llamado - SQLite deshabilitado, no se guarda cache para: {website}")
    return True

def obtener_cache_scraping(website: Optional[str]) -> Optional[Dict]:
    """Obtiene cache de scraping - STUB (siempre retorna None)"""
    return None  # Sin cache sin BD

def obtener_todas_empresas() -> List[Dict]:
    """Obtiene todas las empresas - STUB (retorna lista vacía)"""
    logger.info(" obtener_todas_empresas() llamado - SQLite deshabilitado, retornando lista vacía")
    return []

def buscar_empresas(
    rubro: Optional[str] = None,
    ciudad: Optional[str] = None,
    solo_validas: bool = False,
    con_email: bool = False,
    con_telefono: bool = False
) -> List[Dict]:
    """Busca empresas - STUB (retorna lista vacía)"""
    logger.info(" buscar_empresas() llamado - SQLite deshabilitado, retornando lista vacía")
    return []

def obtener_estadisticas() -> Dict:
    """Obtiene estadísticas - STUB (retorna estadísticas vacías)"""
    return {
        'total': 0,
        'con_email': 0,
        'con_telefono': 0,
        'con_website': 0,
        'por_rubro': {},
        'por_ciudad': {}
    }

def exportar_a_csv(rubro: Optional[str] = None, solo_validas: bool = True) -> Optional[str]:
    """Exporta a CSV - STUB (retorna None)"""
    logger.warning(" exportar_a_csv() llamado - SQLite deshabilitado, no se puede exportar")
    return None

def exportar_a_json(rubro: Optional[str] = None, solo_validas: bool = True) -> Optional[str]:
    """Exporta a JSON - STUB (retorna None)"""
    logger.warning(" exportar_a_json() llamado - SQLite deshabilitado, no se puede exportar")
    return None

def limpiar_base_datos() -> bool:
    """Limpia base de datos - STUB (no hace nada)"""
    logger.info(" limpiar_base_datos() llamado - SQLite deshabilitado, no hay nada que limpiar")
    return True

# ========== FUNCIONES PARA EMAIL TEMPLATES ==========

def obtener_templates() -> List[Dict]:
    """Obtiene templates - STUB (retorna lista vacía)"""
    logger.info(" obtener_templates() llamado - SQLite deshabilitado, retornando lista vacía")
    return []

def obtener_template(template_id: int) -> Optional[Dict]:
    """Obtiene template - STUB (retorna None)"""
    return None

def crear_template(nombre: str, subject: str, body_html: str, body_text: Optional[str] = None) -> Optional[int]:
    """Crea template - STUB (no guarda, retorna None)"""
    logger.info(f" crear_template() llamado - SQLite deshabilitado, no se guarda: {nombre}")
    return None

def actualizar_template(template_id: int, nombre: Optional[str] = None, subject: Optional[str] = None, 
                       body_html: Optional[str] = None, body_text: Optional[str] = None) -> bool:
    """Actualiza template - STUB (no hace nada)"""
    logger.info(f" actualizar_template() llamado - SQLite deshabilitado, no se actualiza: ID {template_id}")
    return False

def eliminar_template(template_id: int) -> bool:
    """Elimina template - STUB (no hace nada)"""
    logger.info(f" eliminar_template() llamado - SQLite deshabilitado, no se elimina: ID {template_id}")
    return False

# ========== FUNCIONES PARA EMAIL HISTORY ==========

def guardar_email_history(empresa_id: int, empresa_nombre: str, empresa_email: str,
                         template_id: int, template_nombre: str, subject: str,
                         status: str, error_message: Optional[str] = None) -> bool:
    """Guarda historial de email - STUB (no guarda)"""
    logger.debug(f" guardar_email_history() llamado - SQLite deshabilitado, no se guarda historial")
    return True

def obtener_email_history(empresa_id: Optional[int] = None, template_id: Optional[int] = None,
                         limit: int = 100) -> List[Dict]:
    """Obtiene historial de email - STUB (retorna lista vacía)"""
    return []
