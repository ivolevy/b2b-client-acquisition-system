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

# Mapeo de rubros a tags de OpenStreetMap
RUBROS_DISPONIBLES = {
    # CONSTRUCCIÓN E INMOBILIARIA
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
    "diseño_interiores": {
        "nombre": "Diseño de Interiores",
        "tags": [
            '["office"="interior_design"]',
            '["craft"="interior_designer"]'
        ]
    },
    "reformas": {
        "nombre": "Empresas de Reformas",
        "tags": [
            '["craft"="carpenter"]',
            '["craft"="plumber"]',
            '["craft"="electrician"]',
            '["craft"="painter"]'
        ]
    },
    
    # SERVICIOS PROFESIONALES
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
    "legal": {
        "nombre": "Despachos Legales",
        "tags": [
            '["office"="lawyer"]',
            '["office"="legal"]',
            '["amenity"="law_firm"]'
        ]
    },
    "contabilidad": {
        "nombre": "Servicios Contables",
        "tags": [
            '["office"="accountant"]',
            '["office"="tax_advisor"]'
        ]
    },
    "auditoria": {
        "nombre": "Servicios de Auditoría",
        "tags": [
            '["office"="auditor"]'
        ]
    },
    "recursos_humanos": {
        "nombre": "Recursos Humanos",
        "tags": [
            '["office"="employment_agency"]',
            '["office"="recruiter"]'
        ]
    },
    
    # TECNOLOGÍA Y MARKETING
    "tecnologia": {
        "nombre": "Empresas de Tecnología",
        "tags": [
            '["office"="it"]',
            '["office"="technology"]',
            '["office"="software"]'
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
    "diseño_grafico": {
        "nombre": "Diseño Gráfico",
        "tags": [
            '["office"="graphic_design"]',
            '["craft"="graphic_designer"]'
        ]
    },
    "comunicacion": {
        "nombre": "Agencias de Comunicación",
        "tags": [
            '["office"="public_relations"]',
            '["office"="communication"]'
        ]
    },
    "desarrollo_web": {
        "nombre": "Desarrollo Web",
        "tags": [
            '["office"="web_design"]',
            '["office"="web_development"]'
        ]
    },
    
    # FINANZAS Y SEGUROS
    "financiero": {
        "nombre": "Servicios Financieros",
        "tags": [
            '["office"="financial"]',
            '["office"="financial_advisor"]',
            '["amenity"="bank"]'
        ]
    },
    "seguros": {
        "nombre": "Compañías de Seguros",
        "tags": [
            '["office"="insurance"]',
            '["office"="insurance_agent"]'
        ]
    },
    "inversiones": {
        "nombre": "Gestión de Inversiones",
        "tags": [
            '["office"="investment"]',
            '["office"="asset_management"]'
        ]
    },
    
    # SALUD Y BIENESTAR
    "salud": {
        "nombre": "Servicios de Salud",
        "tags": [
            '["amenity"="clinic"]',
            '["amenity"="hospital"]',
            '["healthcare"="yes"]'
        ]
    },
    "fisioterapia": {
        "nombre": "Fisioterapia",
        "tags": [
            '["amenity"="physiotherapist"]',
            '["healthcare"="physiotherapist"]'
        ]
    },
    "odontologia": {
        "nombre": "Clínicas Dentales",
        "tags": [
            '["amenity"="dentist"]',
            '["healthcare"="dentist"]'
        ]
    },
    "bienestar": {
        "nombre": "Centros de Bienestar",
        "tags": [
            '["amenity"="beauty_salon"]',
            '["amenity"="spa"]',
            '["leisure"="fitness_center"]'
        ]
    },
    
    # EDUCACIÓN
    "educacion": {
        "nombre": "Centros Educativos",
        "tags": [
            '["amenity"="school"]',
            '["amenity"="university"]',
            '["amenity"="college"]'
        ]
    },
    "formacion": {
        "nombre": "Centros de Formación",
        "tags": [
            '["amenity"="training"]',
            '["office"="education"]'
        ]
    },
    "idiomas": {
        "nombre": "Academias de Idiomas",
        "tags": [
            '["amenity"="language_school"]'
        ]
    },
    
    # HOSTELERÍA Y TURISMO
    "restaurantes": {
        "nombre": "Restaurantes",
        "tags": [
            '["amenity"="restaurant"]'
        ]
    },
    "hoteles": {
        "nombre": "Hoteles",
        "tags": [
            '["tourism"="hotel"]',
            '["amenity"="hotel"]'
        ]
    },
    "bares": {
        "nombre": "Bares y Cafeterías",
        "tags": [
            '["amenity"="bar"]',
            '["amenity"="cafe"]',
            '["amenity"="pub"]'
        ]
    },
    "turismo": {
        "nombre": "Agencias de Viajes",
        "tags": [
            '["shop"="travel_agency"]',
            '["office"="travel_agent"]'
        ]
    },
    "eventos": {
        "nombre": "Organización de Eventos",
        "tags": [
            '["office"="event_management"]',
            '["amenity"="events_venue"]'
        ]
    },
    
    # RETAIL Y COMERCIO
    "retail": {
        "nombre": "Tiendas Retail",
        "tags": [
            '["shop"="supermarket"]',
            '["shop"="department_store"]',
            '["shop"="mall"]',
            '["shop"="convenience"]'
        ]
    },
    "moda": {
        "nombre": "Tiendas de Moda",
        "tags": [
            '["shop"="clothes"]',
            '["shop"="fashion"]',
            '["shop"="shoes"]'
        ]
    },
    "decoracion": {
        "nombre": "Tiendas de Decoración",
        "tags": [
            '["shop"="interior_decoration"]',
            '["shop"="furniture"]',
            '["shop"="houseware"]'
        ]
    },
    "automocion": {
        "nombre": "Concesionarios y Talleres",
        "tags": [
            '["shop"="car"]',
            '["shop"="car_repair"]',
            '["amenity"="car_dealership"]'
        ]
    },
    "electrodomesticos": {
        "nombre": "Tiendas de Electrodomésticos",
        "tags": [
            '["shop"="electronics"]',
            '["shop"="appliance"]'
        ]
    },
    
    # TRANSPORTE Y LOGÍSTICA
    "transporte": {
        "nombre": "Empresas de Transporte",
        "tags": [
            '["office"="logistics"]',
            '["office"="transport"]',
            '["amenity"="taxi"]'
        ]
    },
    "mensajeria": {
        "nombre": "Servicios de Mensajería",
        "tags": [
            '["office"="courier"]',
            '["office"="delivery"]'
        ]
    },
    "almacenamiento": {
        "nombre": "Almacenes y Depósitos",
        "tags": [
            '["landuse"="warehouse"]',
            '["industrial"="warehouse"]'
        ]
    },
    
    # MANUFACTURA E INDUSTRIA
    "manufactura": {
        "nombre": "Manufactura",
        "tags": [
            '["industrial"="factory"]',
            '["industrial"="manufacturing"]',
            '["craft"="pottery"]',
            '["craft"="metal_construction"]',
            '["craft"="carpenter"]'
        ]
    },
    "alimentacion": {
        "nombre": "Industria Alimentaria",
        "tags": [
            '["industrial"="food"]',
            '["craft"="confectionery"]',
            '["craft"="bakery"]'
        ]
    },
    "textil": {
        "nombre": "Industria Textil",
        "tags": [
            '["craft"="tailor"]',
            '["industrial"="textile"]'
        ]
    },
    
    # SERVICIOS PERSONALES
    "peluqueria": {
        "nombre": "Peluquerías",
        "tags": [
            '["shop"="hairdresser"]',
            '["amenity"="hairdresser"]'
        ]
    },
    "fotografia": {
        "nombre": "Fotografía",
        "tags": [
            '["shop"="photo"]',
            '["craft"="photographer"]'
        ]
    },
    "veterinaria": {
        "nombre": "Clínicas Veterinarias",
        "tags": [
            '["amenity"="veterinary"]',
            '["healthcare"="veterinary"]'
        ]
    },
    
    # ENTRETENIMIENTO Y OCIO
    "gimnasios": {
        "nombre": "Gimnasios",
        "tags": [
            '["leisure"="fitness_center"]',
            '["leisure"="sports_centre"]'
        ]
    },
    "entretenimiento": {
        "nombre": "Entretenimiento",
        "tags": [
            '["amenity"="cinema"]',
            '["amenity"="theatre"]',
            '["leisure"="amusement_arcade"]'
        ]
    },
    "deportes": {
        "nombre": "Centros Deportivos",
        "tags": [
            '["leisure"="sports_centre"]',
            '["leisure"="stadium"]'
        ]
    },
    
    # SERVICIOS ESPECIALIZADOS
    "seguridad": {
        "nombre": "Empresas de Seguridad",
        "tags": [
            '["office"="security"]',
            '["office"="security_services"]'
        ]
    },
    "limpieza": {
        "nombre": "Servicios de Limpieza",
        "tags": [
            '["office"="cleaning"]',
            '["craft"="cleaner"]'
        ]
    },
    "jardineria": {
        "nombre": "Jardinería y Paisajismo",
        "tags": [
            '["craft"="gardener"]',
            '["office"="landscaping"]'
        ]
    },
    "energia": {
        "nombre": "Energía y Servicios Públicos",
        "tags": [
            '["office"="energy"]',
            '["office"="utility"]'
        ]
    },
    "medio_ambiente": {
        "nombre": "Medio Ambiente",
        "tags": [
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
        logger.info(f" Búsqueda por bbox: {bbox}")
        logger.info(f" Rubro: {rubro_info['nombre']}")
        
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
        
        logger.info(f" Se encontraron {len(elements)} empresas en el área")
        
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

