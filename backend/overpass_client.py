"""
Cliente B2B para búsqueda de empresas por rubro en OpenStreetMap
Enfocado en captación de clientes, no en propiedades por zona
"""

import requests
import logging
import time
from typing import List, Dict, Optional
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
TIMEOUT_SECONDS = 90  # Aumentado a 90s
MAX_RETRIES = 3

def _get_session_with_retries():
    """Configura una sesión de requests con lógica de reintento"""
    session = requests.Session()
    retries = Retry(
        total=MAX_RETRIES,
        backoff_factor=2,  # Espera exponencial: 2s, 4s, 8s...
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"]
    )
    session.mount('https://', HTTPAdapter(max_retries=retries))
    return session

def _construir_direccion_completa(calle: str, numero: str) -> str:
    """
    Construye la dirección completa combinando calle y número.
    
    Args:
        calle: Nombre de la calle (addr:street)
        numero: Número de casa/edificio (addr:housenumber)
    
    Returns:
        Dirección completa (ej: "Loyola 202" o solo "Loyola" si no hay número)
    """
    calle = (calle or '').strip()
    numero = (numero or '').strip()
    
    if not calle:
        return ''
    
    if numero:
        return f"{calle} {numero}"
    
    return calle

# RUBROS UNIFICADOS Y NUEVOS
RUBROS_DISPONIBLES = {
    # NUEVOS RUBROS CLAVE (FASE 2 - EXPANDIDOS)
    "colegios": {
        "nombre": "Colegios e Instituciones Educativas",
        "tags": [
            '["amenity"="school"]',
            '["amenity"="university"]',
            '["amenity"="college"]',
            '["amenity"="kindergarten"]',
            '["amenity"="language_school"]',
            '["amenity"="training"]',
            '["office"="education"]',
            '["amenity"="club"]',
            '["amenity"="music_school"]',
            '["amenity"="arts_centre"]'
        ]
    },
    "metalurgicas": {
        "nombre": "Metalúrgicas e Industria del Metal",
        "tags": [
            '["craft"="metal_construction"]',
            '["craft"="blacksmith"]',
            '["craft"="sawmill"]',
            '["industrial"="metal_working"]',
            '["industrial"="foundry"]',
            '["industrial"="steel_works"]',
            '["shop"="metal_working"]',
            '["craft"="welder"]',
            '["craft"="precision_mechanic"]',
            '["shop"="hardware"]',
            '["industrial"="machine_shop"]',
            '["industrial"="steel"]'
        ],
        "keywords": ["Inox", "Hierros", "Corte Laser", "Metálica", "Metalúrgica", "Fundición"]
    },
    "madereras": {
        "nombre": "Madereras y Carpinterías",
        "tags": [
            '["craft"="carpenter"]',
            '["industrial"="sawmill"]',
            '["shop"="doityourself"]',
            '["shop"="lumber"]',
            '["industrial"="wood"]',
            '["craft"="furniture_maker"]',
            '["shop"="furniture"]',
            '["shop"="hardware"]'
        ],
        "keywords": ["Maderera", "Carpintería", "Aserradero", "Herrajes"]
    },
    "fabricas": {
        "nombre": "Fábricas e Industrias Generales",
        "tags": [
            '["industrial"="factory"]',
            '["industrial"="manufacturing"]',
            '["industrial"="food"]',
            '["industrial"="textile"]',
            '["industrial"="chemical"]',
            '["industrial"="electronics"]',
            '["industrial"="packaging"]',
            '["industrial"="plastics"]'
        ],
        "keywords": ["Fábrica", "Planta Industrial", "Manufactura", "Industrial"]
    },
    
    # CATEGORÍAS UNIFICADAS
    "construccion_arquitectura": {
        "nombre": "Construcción y Arquitectura",
        "tags": [
            '["office"="developer"]',
            '["office"="estate_agent"]',
            '["office"="property_developer"]',
            '["office"="construction"]',
            '["craft"="builder"]',
            '["industrial"="construction"]',
            '["office"="architect"]',
            '["office"="architectural"]',
            '["office"="interior_design"]',
            '["craft"="interior_designer"]',
            '["craft"="plumber"]',
            '["craft"="electrician"]',
            '["craft"="painter"]'
        ]
    },
    "servicios_profesionales": {
        "nombre": "Servicios Profesionales (Legal/Contable)",
        "tags": [
            '["office"="lawyer"]',
            '["office"="legal"]',
            '["amenity"="law_firm"]',
            '["office"="accountant"]',
            '["office"="tax_advisor"]',
            '["office"="auditor"]',
            '["office"="employment_agency"]',
            '["office"="recruiter"]',
            '["office"="consulting"]',
            '["office"="consultant"]'
        ]
    },
    "tecnologia_marketing": {
        "nombre": "Tecnología, Marketing y Diseño",
        "tags": [
            '["office"="it"]',
            '["office"="technology"]',
            '["office"="software"]',
            '["office"="advertising"]',
            '["office"="marketing"]',
            '["shop"="advertising_agency"]',
            '["office"="graphic_design"]',
            '["craft"="graphic_designer"]',
            '["office"="public_relations"]',
            '["office"="communication"]',
            '["office"="web_design"]',
            '["office"="web_development"]'
        ]
    },
    "salud_bienestar": {
        "nombre": "Salud y Bienestar",
        "tags": [
            '["amenity"="clinic"]',
            '["amenity"="hospital"]',
            '["healthcare"="yes"]',
            '["amenity"="physiotherapist"]',
            '["healthcare"="physiotherapist"]',
            '["amenity"="dentist"]',
            '["healthcare"="dentist"]',
            '["amenity"="beauty_salon"]',
            '["amenity"="spa"]',
            '["leisure"="fitness_center"]'
        ]
    },
    "comercio_retail": {
        "nombre": "Comercio y Retail",
        "tags": [
            '["shop"="supermarket"]',
            '["shop"="department_store"]',
            '["shop"="mall"]',
            '["shop"="convenience"]',
            '["shop"="clothes"]',
            '["shop"="fashion"]',
            '["shop"="shoes"]',
            '["shop"="interior_decoration"]',
            '["shop"="furniture"]',
            '["shop"="houseware"]',
            '["shop"="car"]',
            '["shop"="car_repair"]',
            '["amenity"="car_dealership"]',
            '["shop"="electronics"]',
            '["shop"="appliance"]'
        ]
    },
    "gastronomia": {
        "nombre": "Gastronomía",
        "tags": [
            '["amenity"="restaurant"]',
            '["amenity"="bar"]',
            '["amenity"="cafe"]',
            '["amenity"="pub"]',
            '["office"="event_management"]',
            '["amenity"="events_venue"]'
        ]
    },
    "logistica_transporte": {
        "nombre": "Logística y Transporte",
        "tags": [
            '["office"="logistics"]',
            '["office"="transport"]',
            '["amenity"="taxi"]',
            '["office"="courier"]',
            '["office"="delivery"]',
            '["landuse"="warehouse"]',
            '["industrial"="warehouse"]'
        ]
    },
    "mantenimiento_seguridad": {
        "nombre": "Mantenimiento y Seguridad",
        "tags": [
            '["office"="cleaning"]',
            '["craft"="cleaner"]',
            '["office"="security"]',
            '["office"="security_services"]'
        ]
    },
    "energia_medioambiente": {
        "nombre": "Energía y Medio Ambiente",
        "tags": [
            '["office"="energy"]',
            '["office"="utility"]',
            '["office"="environmental"]',
            '["office"="waste_management"]'
        ]
    }
}

def listar_rubros_disponibles() -> Dict:
    """Retorna lista de rubros disponibles para búsqueda"""
    return {
        key: info["nombre"] 
        for key, info in RUBROS_DISPONIBLES.items()
    }

def buscar_empresas_por_rubro(
    rubro: str, 
    pais: Optional[str] = None,
    ciudad: Optional[str] = None,
    limite: int = 100
) -> List[Dict]:
    """
    Busca empresas de un rubro específico en OpenStreetMap
    
    Args:
        rubro: Clave del rubro (ver RUBROS_DISPONIBLES)
        pais: Nombre del país para limitar búsqueda (opcional)
        ciudad: Nombre de la ciudad para limitar búsqueda (opcional)
        limite: Número máximo de resultados
    
    Returns:
        Lista de empresas con datos de contacto
    """
    
    if rubro not in RUBROS_DISPONIBLES:
        logger.error(f"Rubro '{rubro}' no válido. Rubros disponibles: {list(RUBROS_DISPONIBLES.keys())}")
        return []
    
    rubro_info = RUBROS_DISPONIBLES[rubro]
    tags = rubro_info["tags"]
    
    # Construir filtro de área si se especifica
    area_filter = ""
    if ciudad:
        area_filter = f'area[name="{ciudad}"]->.searchArea;'
        area_suffix = "(area.searchArea)"
    elif pais:
        area_filter = f'area[name="{pais}"]["admin_level"="2"]->.searchArea;'
        area_suffix = "(area.searchArea)"
    else:
        area_suffix = ""
    
    # Construir query combinando todos los tags del rubro
    query_parts = []
    for tag in tags:
        query_parts.append(f'node{tag}{area_suffix};')
        query_parts.append(f'way{tag}{area_suffix};')
    
    # Agregar búsqueda por keywords en el nombre si existen
    keywords = rubro_info.get("keywords", [])
    if keywords:
        for kw in keywords:
            query_parts.append(f'node[name~"{kw}", i]{area_suffix};')
            query_parts.append(f'way[name~"{kw}", i]{area_suffix};')
    
    query = f"""
    [out:json][timeout:{TIMEOUT_SECONDS}];
    {area_filter}
    (
      {' '.join(query_parts)}
    );
    out center {limite};
    """
    
    try:
        logger.info(f"Buscando empresas del rubro: {rubro_info['nombre']}")
        if ciudad:
            logger.info(f"Área de búsqueda: {ciudad}")
        elif pais:
            logger.info(f"Área de búsqueda: {pais}")
        else:
            logger.info("Búsqueda global (sin filtro geográfico)")
        
        session = _get_session_with_retries()
        
        response = session.post(
            OVERPASS_URL,
            data=query,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=TIMEOUT_SECONDS
        )
        
        if response.status_code != 200:
            logger.error(f"Error en Overpass API: {response.status_code}")
            logger.error(f"Respuesta: {response.text[:500]}") # Loguear primeros 500 chars del error
            return []
        
        data = response.json()
        elements = data.get('elements', [])
        
        logger.info(f"Se encontraron {len(elements)} empresas")
        
        if len(elements) == 0:
            logger.warning(f"Consulta sin resultados. Query enviada:\n{query}")

        empresas = []
        for element in elements:
            tags_elem = element.get('tags', {})
            
            # Obtener coordenadas
            if element['type'] == 'node':
                lat = element.get('lat')
                lon = element.get('lon')
            elif element['type'] == 'way' and 'center' in element:
                lat = element['center'].get('lat')
                lon = element['center'].get('lon')
            else:
                lat = None
                lon = None
            
            empresa = {
                'nombre': tags_elem.get('name', 'Sin nombre'),
                'rubro': rubro_info['nombre'],
                'rubro_key': rubro,
                'website': tags_elem.get('website', tags_elem.get('contact:website', '')),
                'email': tags_elem.get('email', tags_elem.get('contact:email', '')),
                'telefono': tags_elem.get('phone', tags_elem.get('contact:phone', '')),
                'direccion': _construir_direccion_completa(
                    tags_elem.get('addr:street', ''),
                    tags_elem.get('addr:housenumber', '')
                ),
                'ciudad': tags_elem.get('addr:city', ciudad or ''),
                'pais': tags_elem.get('addr:country', pais or ''),
                'codigo_postal': tags_elem.get('addr:postcode', ''),
                'latitud': lat,
                'longitud': lon,
                'osm_id': str(element.get('id')),
                'osm_type': element.get('type'),
                'descripcion': tags_elem.get('description', ''),
                'horario': tags_elem.get('opening_hours', '')
            }
            
            empresas.append(empresa)
        
        return empresas
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout ({TIMEOUT_SECONDS}s) en consulta a Overpass API después de {MAX_RETRIES} intentos")
        return []
    except Exception as e:
        logger.error(f"Error en búsqueda de empresas: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return []

def query_by_bbox(bbox: str, rubro: str = None, keywords: List[str] = None, limite: int = 100) -> List[Dict]:
    """
    Consulta por bounding box (sur,oeste,norte,este) y rubro específico
    
    Args:
        bbox: String con formato "south,west,north,east" (ej: "40.4,-3.7,40.5,-3.6")
        rubro: Clave del rubro (ej: "tecnologia", "desarrolladoras_inmobiliarias")
        keywords: Lista de palabras clave (obsoleto, se usa rubro)
        limite: Número máximo de resultados
    
    Returns:
        Lista de empresas encontradas
    """
    # Si se pasó keywords pero no rubro, tomar el primero de keywords
    if not rubro and keywords:
        rubro = keywords[0]
    
    if rubro not in RUBROS_DISPONIBLES:
        logger.error(f"Rubro '{rubro}' no válido")
        return []
    
    rubro_info = RUBROS_DISPONIBLES[rubro]
    tags = rubro_info["tags"]
    
    # Construir query combinando todos los tags del rubro
    query_parts = []
    for tag in tags:
        query_parts.append(f'node{tag}({bbox});')
        query_parts.append(f'way{tag}({bbox});')

    # Agregar búsqueda por keywords en el nombre si existen
    keywords_list = rubro_info.get("keywords", [])
    if keywords_list:
        for kw in keywords_list:
            query_parts.append(f'node[name~"{kw}", i]({bbox});')
            query_parts.append(f'way[name~"{kw}", i]({bbox});')
    
    query = f"""
    [out:json][timeout:{TIMEOUT_SECONDS}];
    (
      {' '.join(query_parts)}
    );
    out center {limite};
    """
    
    try:
        logger.info(f" Búsqueda por bbox: {bbox}")
        logger.info(f" Rubro: {rubro_info['nombre']}")
        
        session = _get_session_with_retries()
        
        response = session.post(
            OVERPASS_URL,
            data=query,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=TIMEOUT_SECONDS
        )
        
        if response.status_code != 200:
            logger.error(f"Error en Overpass API: {response.status_code}")
            logger.error(f"Respuesta: {response.text[:500]}")
            return []
        
        data = response.json()
        elements = data.get('elements', [])
        
        logger.info(f" Se encontraron {len(elements)} empresas en el área")
        
        if len(elements) == 0:
            logger.warning(f"Consulta bbox sin resultados. Query:\n{query}")

        empresas = []
        for element in elements:
            tags_elem = element.get('tags', {})
            
            # Obtener coordenadas
            if element['type'] == 'node':
                lat = element.get('lat')
                lon = element.get('lon')
            elif element['type'] == 'way' and 'center' in element:
                lat = element['center'].get('lat')
                lon = element['center'].get('lon')
            else:
                lat = None
                lon = None
            
            empresa = {
                'nombre': tags_elem.get('name', 'Sin nombre'),
                'rubro': rubro_info['nombre'],
                'rubro_key': rubro,
                'website': tags_elem.get('website', tags_elem.get('contact:website', '')),
                'email': tags_elem.get('email', tags_elem.get('contact:email', '')),
                'telefono': tags_elem.get('phone', tags_elem.get('contact:phone', '')),
                'direccion': _construir_direccion_completa(
                    tags_elem.get('addr:street', ''),
                    tags_elem.get('addr:housenumber', '')
                ),
                'ciudad': tags_elem.get('addr:city', 'Desconocida'),
                'pais': tags_elem.get('addr:country', ''),
                'codigo_postal': tags_elem.get('addr:postcode', ''),
                'latitud': lat,
                'longitud': lon,
                'osm_id': str(element.get('id')),
                'osm_type': element.get('type'),
                'descripcion': tags_elem.get('description', ''),
                'horario': tags_elem.get('opening_hours', '')
            }
            
            empresas.append(empresa)
        
        return empresas
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout en consulta por bbox después de {MAX_RETRIES} intentos")
        return []
    except Exception as e:
        logger.error(f"Error en búsqueda por bbox: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return []

def buscar_empresas_multiples_rubros(
    rubros: List[str],
    pais: Optional[str] = None,
    ciudad: Optional[str] = None
) -> Dict[str, List[Dict]]:
    """
    Busca empresas de múltiples rubros
    
    Returns:
        Dict con rubro como key y lista de empresas como value
    """
    resultados = {}
    
    for rubro in rubros:
        empresas = buscar_empresas_por_rubro(rubro, pais, ciudad)
        resultados[rubro] = empresas
    
    return resultados

