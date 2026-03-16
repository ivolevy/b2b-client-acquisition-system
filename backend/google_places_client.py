import os
import httpx
import logging
import asyncio
from typing import List, Dict, Optional, Any
import time
from dotenv import load_dotenv
import math
from backend.db_supabase import increment_api_usage, get_current_month_usage, log_api_call

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache de coordenadas y resultados para evitar llamadas duplicadas
_SEARCH_CACHE = {} 
_SEARCH_CACHE_TTL = 3600 # 1 hora

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
        # Basic: $17.00 USD por 1000 calls
        self.FIELD_MASK_BASIC = [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.rating",
            "places.userRatingCount",
            "places.businessStatus"
        ]
        
        # Advanced (Pro): $32.00 USD por 1000 calls
        self.FIELD_MASK_ADVANCED = [
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.internationalPhoneNumber"
        ]
        
        # Configuración de costos y límites
        self.COST_PER_ADVANCED_CALL = 0.032 # $32/1k
        self.COST_PER_BASIC_CALL = 0.017    # $17/1k
        self.BUDGET_LIMIT_USD = 150.00       # Límite estricto compartido
        
    async def is_within_budget(self) -> bool:
        """Verifica si aún queda crédito mensual disponible"""
        try:
            # Aunque get_current_month_usage es síncrona, la envolvemos para no bloquear
            current_spend = await asyncio.to_thread(get_current_month_usage)
            return current_spend < self.BUDGET_LIMIT_USD
        except Exception as e:
            logger.error(f"Error verificando presupuesto: {e}")
            return True # Por seguridad, permitimos si falla la verificación

    async def search_places(
        self, 
        query: str, 
        lat: Optional[float] = None, 
        lng: Optional[float] = None, 
        radius: Optional[float] = None,
        bbox: Optional[Dict[str, float]] = None,
        max_results: int = 20,
        page_token: Optional[str] = None,
        use_advanced: bool = True # Flag para optimizar costo - default True now to get website/phone
    ) -> Dict[str, Any]:
        """
        Realiza una búsqueda de lugares usando Text Search (New).
        Optimiza el costo seleccionando el FieldMask adecuado.
        """
        if not self.api_key:
            return {"error": "API Key faltante", "places": []}

        # 0. Caching (Simple key based on params)
        cache_key = f"{query}_{lat}_{lng}_{radius}_{page_token}_{use_advanced}"
        if cache_key in _SEARCH_CACHE:
            cached_data, timestamp = _SEARCH_CACHE[cache_key]
            if time.time() - timestamp < _SEARCH_CACHE_TTL:
                logger.info(f"Retornando resultado cacheado para: {query}")
                return cached_data

        # 1. Verificar presupuesto antes de llamar
        if not await self.is_within_budget():
            logger.error(f"⚠️ PRESUPUESTO AGOTADO: El sistema ha bloqueado la llamada para evitar cargos extra. Límite: ${self.BUDGET_LIMIT_USD}")
            return {"error": "PRESUPUESTO_AGOTADO", "places": []}

        # Determinar SKU y máscara de campos
        fields = self.FIELD_MASK_BASIC
        sku = 'basic'
        cost = self.COST_PER_BASIC_CALL
        
        if use_advanced:
            fields = self.FIELD_MASK_BASIC + self.FIELD_MASK_ADVANCED
            sku = 'pro' # Mantenemos 'pro' para consistencia con la DB de usuario
            cost = self.COST_PER_ADVANCED_CALL

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": ",".join(fields) + ",nextPageToken"
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
            payload["locationBias"] = {
                "rectangle": {
                    "low": {"latitude": bbox.get("south", 0), "longitude": bbox.get("west", 0)},
                    "high": {"latitude": bbox.get("north", 0), "longitude": bbox.get("east", 0)}
                }
            }
        elif lat is not None and lng is not None and radius:
            payload["locationBias"] = {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": float(radius)
                }
            }

        start_time = time.time()
        try:
            logger.info(f"Buscando en Google Places ({sku}): '{query}'")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.BASE_URL, headers=headers, json=payload)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            if response.status_code != 200:
                logger.error(f"Error en Google Places API: {response.status_code} - {response.text}")
                
                # Log failure
                asyncio.create_task(asyncio.to_thread(
                    log_api_call,
                    provider='google',
                    endpoint='places:searchText',
                    sku=sku,
                    cost_usd=0,
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    metadata={"query": query, "error": response.text}
                ))
                
                return {"error": f"API Error {response.status_code}", "places": []}

            # 2. Registrar el gasto (No bloqueante)
            # NOTA: Usamos 'pro' para consistencia con la configuración actual del usuario
            asyncio.create_task(asyncio.to_thread(
                increment_api_usage, provider='google', sku=sku, cost_usd=cost
            ))
            
            data = response.json()
            
            # Guardar en cache
            _SEARCH_CACHE[cache_key] = (data, time.time())
            
            # Log success
            asyncio.create_task(asyncio.to_thread(
                log_api_call,
                provider='google',
                endpoint='places:searchText',
                sku=sku,
                cost_usd=cost,
                status_code=200,
                duration_ms=duration_ms,
                metadata={"query": query, "results_count": len(data.get('places', []))}
            ))

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

    async def search_all_places(
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
        results_this_area = []

        # 1. Búsqueda INICIAL para determinar densidad
        # Solo hacemos 1 llamada inicial. Si hay muchos resultados (>15), 
        # saltamos directamente a la subdivisión sin paginar el área grande (ahorro de costos).
        data = await self.search_places(
            query=optimized_query,
            lat=lat,
            lng=lng,
            radius=radius,
            bbox=bbox,
            use_advanced=True # SKU avanzado ($32/1k) para traer website y phone
        )
        
        if "error" not in data:
            places = data.get("places", [])
            for p in places:
                mapped = self.map_to_internal_format(p, rubro_nombre, rubro_key, lat, lng)
                if mapped['google_id'] not in all_results:
                    all_results[mapped['google_id']] = mapped
                    results_this_area.append(mapped)

        # 2. Lógica de Paginación vs Subdivisión (Optimizada)
        # Si hay sospecha de que hay más resultados, elegimos la estrategia más eficiente
        if len(results_this_area) >= 15 and depth < max_depth and bbox:
            # Estrategia: "Go Deep" (Subdividir)
            # No paginamos más el área grande, vamos directo a las 4 sub-áreas
            logger.info(f" Área densa. Subdividiendo cuadrante (Nivel {depth+1}) para mayor resolución...")
            
            s, w, n, e = bbox["south"], bbox["west"], bbox["north"], bbox["east"]
            mid_lat = (s + n) / 2
            mid_lng = (w + e) / 2
            
            sub_bboxes = [
                {"south": s, "west": w, "north": mid_lat, "east": mid_lng}, # SW
                {"south": s, "west": mid_lng, "north": mid_lat, "east": e}, # SE
                {"south": mid_lat, "west": w, "north": n, "east": mid_lng}, # NW
                {"south": mid_lat, "west": mid_lng, "north": n, "east": e}  # NE
            ]
            for sub_bbox in sub_bboxes:
                if len(all_results) >= max_total_results: break
                sub_results = await self.search_all_places(
                    query=query, rubro_nombre=rubro_nombre, rubro_key=rubro_key,
                    lat=lat, lng=lng, bbox=sub_bbox,
                    max_total_results=max_total_results, depth=depth + 1, max_depth=max_depth
                )
                for res in sub_results:
                    if len(all_results) >= max_total_results: break
                    all_results[res['google_id']] = res
        elif data.get("nextPageToken") and len(all_results) < max_total_results:
            # Estrategia: "Stay Here" (Paginar)
            # Solo si no es tan densa como para subdividir, pero hay más páginas
            current_page_token = data.get("nextPageToken")
            for _ in range(4): # Max 4 páginas extra (total 100)
                if not current_page_token or len(all_results) >= max_total_results: break
                
                data_page = await self.search_places(
                    query=optimized_query, lat=lat, lng=lng, radius=radius, bbox=bbox,
                    page_token=current_page_token, use_advanced=True
                )
                if "error" in data_page: break
                
                for p in data_page.get("places", []):
                    mapped = self.map_to_internal_format(p, rubro_nombre, rubro_key, lat, lng)
                    if mapped['google_id'] not in all_results:
                        all_results[mapped['google_id']] = mapped
                        if len(all_results) >= max_total_results: break
                
                current_page_token = data_page.get("nextPageToken")

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
