import os
import requests
import logging
from typing import List, Dict, Optional, Any
import time
from dotenv import load_dotenv
from backend.db_supabase import increment_api_usage, get_current_month_usage, log_api_call

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class GooglePlacesClient:
    """
    Cliente para Google Places API (New) optimizado para B2B.
    Utiliza el endpoint de Text Search para máxima flexibilidad.
    """
    
    BASE_URL = "https://places.googleapis.com/v1/places:searchText"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            logger.error("No se encontró GOOGLE_MAPS_API_KEY en las variables de entorno.")
        
        # Máscaras de campo para optimización de costos según Tiers de Google
        self.FIELD_MASK_ESSENTIALS = [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.rating",
            "places.userRatingCount"
        ]
        
        self.FIELD_MASK_PRO = [
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.internationalPhoneNumber",
            "places.businessStatus"
        ]
        
        
        # Por defecto usamos ambas para B2B, pero se puede configurar
        self.default_field_mask = ",".join(self.FIELD_MASK_ESSENTIALS + self.FIELD_MASK_PRO)
        
        # Configuración de costos y límites
        # Precio oficial Text Search (Advanced) al 2025: $32.00 USD por 1000 calls
        self.COST_PER_PRO_CALL = 0.032 
        self.COST_PER_ESSENTIAL_CALL = 0.00 # Text Search ID Only es free, Basic es $0.017
        self.BUDGET_LIMIT_USD = 195.00 # Umbral para fallback (de los $200)

    def is_within_budget(self) -> bool:
        """Verifica si aún queda crédito mensual disponible"""
        current_spend = get_current_month_usage()
        return current_spend < self.BUDGET_LIMIT_USD

    def search_places(
        self, 
        query: str, 
        lat: Optional[float] = None, 
        lng: Optional[float] = None, 
        radius: Optional[float] = None,
        bbox: Optional[Dict[str, float]] = None,
        max_results: int = 20,
        page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Realiza una búsqueda de lugares usando Text Search (New).
        """
        if not self.api_key:
            return {"error": "API Key faltante", "places": []}

        # 1. Verificar presupuesto antes de llamar
        if not self.is_within_budget():
            logger.warning(" Presupuesto de Google agotado o cerca del límite ($195). Activando protección.")
            return {"error": "PRESUPUESTO_AGOTADO", "places": []}

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.default_field_mask + ",nextPageToken"
        }

        payload = {
            "textQuery": query,
            "maxResultCount": min(max_results, 20),
            "languageCode": "es"
        }

        if page_token:
            payload["pageToken"] = page_token

        # Configurar restricciones geográficas
        if bbox:
            payload["locationRestriction"] = {
                "rectangle": {
                    "low": {"latitude": bbox["south"], "longitude": bbox["west"]},
                    "high": {"latitude": bbox["north"], "longitude": bbox["east"]}
                }
            }
        elif lat is not None and lng is not None and radius:
            payload["locationBias"] = {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": radius
                }
            }

        start_time = time.time()
        try:
            logger.info(f"Buscando en Google Places: '{query}'")
            response = requests.post(self.BASE_URL, headers=headers, json=payload, timeout=30)
            duration_ms = int((time.time() - start_time) * 1000)
            
            if response.status_code != 200:
                logger.error(f"Error en Google Places API: {response.status_code} - {response.text}")
                
                # Log failure
                log_api_call(
                    provider='google',
                    endpoint='places:searchText',
                    sku='pro',
                    cost_usd=0, # No cost on error usually
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    metadata={"query": query, "error": response.text}
                )
                
                return {"error": f"API Error {response.status_code}", "places": []}

            # 2. Registrar el gasto si la llamada fue exitosa
            # Si usamos Pro fields, cobramos el Tier Pro
            increment_api_usage(provider='google', sku='pro', cost_usd=self.COST_PER_PRO_CALL)
            
            data = response.json()
            places_count = len(data.get('places', []))
            
            # Log success detail
            log_api_call(
                provider='google',
                endpoint='places:searchText',
                sku='pro',
                cost_usd=self.COST_PER_PRO_CALL,
                status_code=200,
                duration_ms=duration_ms,
                metadata={"query": query, "results_count": places_count}
            )

            return data

        except Exception as e:
            logger.error(f"Excepción en search_places: {e}")
            # Log exception
            try:
                duration_ms = int((time.time() - start_time) * 1000)
                log_api_call(
                    provider='google', 
                    endpoint='places:searchText',
                    sku='pro',
                    cost_usd=0,
                    status_code=500,
                    duration_ms=duration_ms,
                    metadata={"query": query, "exception": str(e)}
                )
            except:
                pass
                
            return {"error": str(e), "places": []}

    def search_all_places(
        self,
        query: str,
        rubro_nombre: str,
        rubro_key: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: Optional[float] = None,
        bbox: Optional[Dict[str, float]] = None,
        max_total_results: int = 200,
        depth: int = 0,
        max_depth: int = 2 # Evitar recursión infinita y costos descontrolados
    ) -> List[Dict[str, Any]]:
        """
        Versión avanzada de búsqueda que implementa Paginación (60)
        y Subdivisión Espacial (Quadtree) si se detecta saturación.
        """
        # 1. Búsqueda con Paginación (hasta 60 resultados de Google)
        # Combinamos rubro + keywords en un string plano para máxima compatibilidad con Google (v1)
        search_terms = [query] + keywords[:5] # Tomamos las primeras 5 keywords para no saturar
        optimized_query = ", ".join(search_terms)
        
        all_results = {} # Usamos dict con google_id para deduplicar

        # 1. Búsqueda con Paginación (hasta 60 resultados de Google)
        current_page_token = None
        results_this_area = []
        
        for _ in range(3): # Max 3 páginas de 20 = 60
            data = self.search_places(
                query=optimized_query,
                lat=lat,
                lng=lng,
                radius=radius,
                bbox=bbox,
                page_token=current_page_token
            )
            
            if "error" in data:
                break
                
            places = data.get("places", [])
            for p in places:
                mapped = self.map_to_internal_format(p, rubro_nombre, rubro_key)
                all_results[mapped['google_id']] = mapped
                results_this_area.append(mapped)
                
            current_page_token = data.get("nextPageToken")
            if not current_page_token or len(all_results) >= max_total_results:
                break

        # 2. Lógica de Quadtree (Subdivisión)
        # Si llegamos a 60 en esta área y no hemos alcanzado el límite de profundidad, subdividimos
        if len(results_this_area) >= 60 and depth < max_depth and bbox:
            logger.info(f" Área saturada (60 leads). Subdividiendo cuadrante (Nivel {depth+1})...")
            
            # Calcular subdivisión de bbox
            s, w, n, e = bbox["south"], bbox["west"], bbox["north"], bbox["east"]
            mid_lat = (s + n) / 2
            mid_lng = (w + e) / 2
            
            # 4 nuevos cuadrantes
            sub_bboxes = [
                {"south": s, "west": w, "north": mid_lat, "east": mid_lng}, # SW
                {"south": s, "west": mid_lng, "north": mid_lat, "east": e}, # SE
                {"south": mid_lat, "west": w, "north": n, "east": mid_lng}, # NW
                {"south": mid_lat, "west": mid_lng, "north": n, "east": e}  # NE
            ]
            
            for sub_bbox in sub_bboxes:
                sub_results = self.search_all_places(
                    query=query,
                    rubro_nombre=rubro_nombre,
                    rubro_key=rubro_key,
                    bbox=sub_bbox,
                    max_total_results=max_total_results,
                    depth=depth + 1,
                    max_depth=max_depth
                )
                for res in sub_results:
                    all_results[res['google_id']] = res

        return list(all_results.values())

    def map_to_internal_format(self, google_place: Dict[str, Any], rubro_nombre: str, rubro_key: str) -> Dict[str, Any]:
        """
        Mapea un resultado de Google al formato interno 'Empresa' usado en el sistema.
        """
        display_name = google_place.get("displayName", {})
        location = google_place.get("location", {})
        
        # Mapeo según el formato de overflow_client.py / main.py
        return {
            'nombre': display_name.get("text", "Sin nombre"),
            'rubro': rubro_nombre,
            'rubro_key': rubro_key,
            'website': google_place.get("websiteUri", ""),
            'email': "", # Google no da emails directamente
            'telefono': google_place.get("nationalPhoneNumber", google_place.get("internationalPhoneNumber", "")),
            'direccion': google_place.get("formattedAddress", "Sin dirección"),
            'ciudad': "", # Se puede extraer de address_components si es necesario
            'pais': "", 
            'codigo_postal': "",
            'latitud': location.get("latitude"),
            'longitud': location.get("longitude"),
            'google_id': google_place.get("id"),
            'rubros_google': google_place.get("types", []),
            'rating': google_place.get("rating"),
            'user_ratings_total': google_place.get("userRatingCount"),
            'fuente': 'google'
        }

# Singleton para uso en la app
google_client = GooglePlacesClient()
