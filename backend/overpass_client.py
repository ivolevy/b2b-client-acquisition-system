"""
Cliente B2B para búsqueda de empresas por rubro en OpenStreetMap
Enfocado en captación de clientes, no en propiedades por zona
"""

import requests
import logging
from typing import List, Dict, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Mapeo de rubros a tags de OpenStreetMap
RUBROS_DISPONIBLES = {
    "desarrolladoras_inmobiliarias": {
        "nombre": "Desarrolladoras Inmobiliarias",
        "tags": [
            '["office"="developer"]',
            '["office"="estate_agent"]',
            '["office"="property_developer"]'
        ]
    },
    "constructoras": {
        "nombre": "Empresas Constructoras",
        "tags": [
            '["office"="construction"]',
            '["craft"="builder"]',
            '["industrial"="construction"]'
        ]
    },
    "arquitectura": {
        "nombre": "Estudios de Arquitectura",
        "tags": [
            '["office"="architect"]',
            '["office"="architectural"]'
        ]
    },
    "ingenieria": {
        "nombre": "Empresas de Ingeniería",
        "tags": [
            '["office"="engineer"]',
            '["office"="engineering"]',
            '["office"="civil_engineering"]'
        ]
    },
    "consultoria": {
        "nombre": "Consultorías",
        "tags": [
            '["office"="consulting"]',
            '["office"="consultant"]'
        ]
    },
    "tecnologia": {
        "nombre": "Empresas de Tecnología",
        "tags": [
            '["office"="it"]',
            '["office"="technology"]',
            '["office"="software"]'
        ]
    },
    "legal": {
        "nombre": "Despachos Legales",
        "tags": [
            '["office"="lawyer"]',
            '["office"="legal"]',
            '["amenity"="law_firm"]'
        ]
    },
    "marketing": {
        "nombre": "Agencias de Marketing",
        "tags": [
            '["office"="advertising"]',
            '["office"="marketing"]',
            '["shop"="advertising_agency"]'
        ]
    },
    "financiero": {
        "nombre": "Servicios Financieros",
        "tags": [
            '["office"="financial"]',
            '["office"="accountant"]',
            '["amenity"="bank"]'
        ]
    },
    "salud": {
        "nombre": "Servicios de Salud",
        "tags": [
            '["amenity"="clinic"]',
            '["amenity"="hospital"]',
            '["healthcare"="yes"]'
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
    
    query = f"""
    [out:json][timeout:30];
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
        
        response = requests.post(
            OVERPASS_URL,
            data=query,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=60
        )
        
        if response.status_code != 200:
            logger.error(f"Error en Overpass API: {response.status_code}")
            return []
        
        data = response.json()
        elements = data.get('elements', [])
        
        logger.info(f"Se encontraron {len(elements)} empresas")
        
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
                'direccion': tags_elem.get('addr:street', ''),
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
        logger.error("Timeout en consulta a Overpass API")
        return []
    except Exception as e:
        logger.error(f"Error en búsqueda de empresas: {e}")
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
    
    query = f"""
    [out:json][timeout:60];
    (
      {' '.join(query_parts)}
    );
    out center {limite};
    """
    
    try:
        logger.info(f"🔍 Búsqueda por bbox: {bbox}")
        logger.info(f"📋 Rubro: {rubro_info['nombre']}")
        
        response = requests.post(
            OVERPASS_URL,
            data=query,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=60
        )
        
        if response.status_code != 200:
            logger.error(f"Error en Overpass API: {response.status_code}")
            return []
        
        data = response.json()
        elements = data.get('elements', [])
        
        logger.info(f"✓ Se encontraron {len(elements)} empresas en el área")
        
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
                'direccion': tags_elem.get('addr:street', ''),
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
        logger.error("Timeout en consulta a Overpass API")
        return []
    except Exception as e:
        logger.error(f"Error en búsqueda por bbox: {e}")
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

