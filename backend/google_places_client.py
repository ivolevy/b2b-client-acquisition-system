import os
import requests
import logging
from typing import List, Dict, Optional, Any
import time
from dotenv import load_dotenv
import math
from backend.db_supabase import increment_api_usage, get_current_month_usage, log_api_call

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache de coordenadas para evitar None en distancias
_SEARCH_CENTER_CACHE = {}

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
        self.BUDGET_LIMIT_USD = 500.00 # Umbral elevado para evitar bloqueos preventivos ($500)

    def is_within_budget(self) -> bool:
        """Verifica si aún queda crédito mensual disponible (No bloqueante para evitar 0 resultados)"""
        try:
            current_spend = get_current_month_usage()
            is_ok = current_spend < self.BUDGET_LIMIT_USD
            if not is_ok:
                logger.warning(f"⚠️ Alerta de Presupuesto: Gasto actual ${current_spend} excede límite configurado ${self.BUDGET_LIMIT_USD}")
            return True # Retornamos True SIEMPRE para no bloquear la entrega de valor al cliente
        except Exception as e:
            logger.error(f"Error consultando presupuesto: {e}")
            return True

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
        if bbox and isinstance(bbox, dict):
            payload["locationRestriction"] = {
                "rectangle": {
                    "low": {"latitude": bbox.get("south", 0), "longitude": bbox.get("west", 0)},
                    "high": {"latitude": bbox.get("north", 0), "longitude": bbox.get("east", 0)}
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
            logger.info(f"Buscando en Google Places: '{query}' | Center: {lat}, {lng}")
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

            # 2. Registrar el gasto si la llamada fue exitosa (No bloqueante)
            try:
                increment_api_usage(provider='google', sku='pro', cost_usd=self.COST_PER_PRO_CALL)
            except Exception as e_usage:
                logger.error(f"Error no-bloqueante incrementando uso: {e_usage}")
            
            data = response.json()
            places_count = len(data.get('places', []))
            
            # Log success detail (No bloqueante)
            try:
                log_api_call(
                    provider='google',
                    endpoint='places:searchText',
                    sku='pro',
                    cost_usd=self.COST_PER_PRO_CALL,
                    status_code=200,
                    duration_ms=duration_ms,
                    metadata={"query": query, "results_count": places_count}
                )
            except Exception as e_log:
                logger.error(f"Error no-bloqueante registrando log: {e_log}")

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
        max_total_results: int = 100,
        depth: int = 0,
        max_depth: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Versión avanzada de búsqueda que implementa Paginación (60)
        y Subdivisión Espacial (Quadtree) si se detecta saturación.
        """
        # No clutter the query with too many keywords; Google Places (New) is smart enough.
        # We just use the query as is for higher quality results.
        optimized_query = query
        
        all_results = {} # Usamos dict con google_id para deduplicar

        # 1. Búsqueda con Paginación (hasta 100 resultados de Google por área)
        current_page_token = None
        results_this_area = []
        
        for _ in range(5): # Max 5 páginas de 20 = 100
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
                # LA CLAVE: lat/lng aquí DEBEN ser las originales del centro de búsqueda
                mapped = self.map_to_internal_format(p, rubro_nombre, rubro_key, lat, lng)
                
                if mapped['google_id'] not in all_results:
                    all_results[mapped['google_id']] = mapped
                    results_this_area.append(mapped)
                    
                    if len(all_results) >= max_total_results:
                        break
                
            current_page_token = data.get("nextPageToken")
            if not current_page_token or len(all_results) >= max_total_results:
                break

        # 2. Lógica de Quadtree (Subdivisión)
        # Si llegamos a 20 en esta área (zona con densidad) y no hemos alcanzado el límite de profundidad, subdividimos
        # Bajamos el umbral de 60 a 20 para ser más agresivos en la búsqueda de leads en zonas densas.
        if len(results_this_area) >= 20 and depth < max_depth and bbox:
            logger.info(f" Área con densidad detectada ({len(results_this_area)} leads). Subdividiendo cuadrante (Nivel {depth+1})...")
            
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
                if len(all_results) >= max_total_results:
                    break

                sub_results = self.search_all_places(
                    query=query,
                    rubro_nombre=rubro_nombre,
                    rubro_key=rubro_key,
                    lat=lat, # PERSISTENCIA: Mantener centro original para distancia
                    lng=lng,
                    bbox=sub_bbox,
                    max_total_results=max_total_results,
                    depth=depth + 1,
                    max_depth=max_depth
                )
                for res in sub_results:
                    if len(all_results) >= max_total_results: break
                    all_results[res['google_id']] = res

        return list(all_results.values())[:max_total_results]

    def calcular_distancia(self, lat1, lon1, lat2, lon2):
        """Calcula la distancia en km entre dos puntos usando Haversine."""
        if None in (lat1, lon1, lat2, lon2): return None
        R = 6371  # Radio de la Tierra en km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) * math.sin(dlon / 2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    def map_to_internal_format(self, google_place: Dict[str, Any], rubro_nombre: str, rubro_key: str, 
                               center_lat: Optional[float] = None, center_lng: Optional[float] = None) -> Dict[str, Any]:
        """
        Mapea un resultado de Google al formato interno 'Empresa' usado en el sistema.
        """
        display_name = google_place.get("displayName", {})
        location = google_place.get("location", {})
        lat_res = location.get("latitude")
        lng_res = location.get("longitude")
        
        distancia = self.calcular_distancia(center_lat, center_lng, lat_res, lng_res)

        # Mapeo según el formato de overflow_client.py / main.py
        return {
            'id': google_place.get("id"), # Frontend expects 'id'
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
            'latitud': lat_res,
            'longitud': lng_res,
            'distancia_km': distancia, # Nueva columna solicitada
            'google_id': google_place.get("id"),
            'rubros_google': google_place.get("types", []),
            'rating': google_place.get("rating"),
            'user_ratings_total': google_place.get("userRatingCount"),
            'fuente': 'google'
        }

# Singleton para uso en la app
google_client = GooglePlacesClient()
