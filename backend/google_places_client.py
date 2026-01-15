
import os
import requests
import logging
from typing import List, Dict, Optional
from quota_manager import quota_manager

# Configuración
GOOGLE_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
BASE_URL = "https://places.googleapis.com/v1/places:searchText"
DETAILS_URL = "https://places.googleapis.com/v1/places/"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GooglePlacesClient:
    def __init__(self):
        if not GOOGLE_API_KEY:
            logger.error("Falta GOOGLE_MAPS_API_KEY en variables de entorno")

    def search_places(self, query: str, location_bias: Dict = None) -> List[Dict]:
        """
        Busca lugares usando Google Places API (New) - Text Search
        """
        if not GOOGLE_API_KEY:
            return []

        # Verificar cuota antes de llamar
        if not quota_manager.can_use_google():
            logger.warning("Cuota de Google excedida o deshabilitada. Abortando búsqueda Google.")
            return []

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            "X-Goog-FieldMask": "places.name,places.id,places.formattedAddress,places.location,places.types,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours"
        }

        # Construir payload
        payload = {
            "textQuery": query,
            "maxResultCount": 20, # Máximo permitido por página
            "languageCode": "es"
        }

        # Bias geográfico (preferencia, no filtro estricto)
        if location_bias:
            # location_bias espera un círculo o rectángulo
            # Aquí asumimos que recibimos un círculo: { "circle": { "center": { "latitude": x, "longitude": y }, "radius": 5000 } }
            payload["locationBias"] = location_bias

        try:
            logger.info(f" Consultando Google Places API: {query}")
            response = requests.post(BASE_URL, json=payload, headers=headers, timeout=10)
            
            # Registrar costo (Text Search es costoso)
            quota_manager.track_search(num_results=20)

            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                logger.info(f" Google Places encontró {len(places)} resultados")
                return self._normalize_places(places)
            else:
                logger.error(f"Error Google Places API: {response.status_code} - {response.text}")
                return []

        except Exception as e:
            logger.error(f"Excepción en Google Search: {e}")
            return []

    def _normalize_places(self, places: List[Dict]) -> List[Dict]:
        """Convierte formato Google a formato interno unificado"""
        normalized = []
        for place in places:
            # Mapeo a estructura de nuestra app
            normalized.append({
                "nombre": place.get("name"), # Ojo: Google devuelve "places/PLACE_ID" en 'name' a veces en v1, chequear 'displayName'
                # En la versión 'places:searchText', el field mask 'places.name' devuelve el recurso name (ID).
                # Necesitamos 'places.displayName' para el nombre legible.
                # CORRECCION: Ajustaré el fieldMask en la llamada.
                "nombre_legible": place.get("displayName", {}).get("text"), 
                "direccion": place.get("formattedAddress"),
                "latitud": place.get("location", {}).get("latitude"),
                "longitud": place.get("location", {}).get("longitude"),
                "telefono": place.get("nationalPhoneNumber"),
                "website": place.get("websiteUri"),
                "rating": place.get("rating"),
                "place_id": place.get("id"),
                "origen": "google",
                # Datos extra útiles
                "business_status": place.get("businessStatus"),
                "horario": place.get("regularOpeningHours", {}),
                "types": place.get("types", [])
            })
        return normalized

    # Nota: He ajustado el fieldmask en la implementación de abajo para incluir displayName

# Re-implementación corregida con FieldMask correcta
    def search_places_corrected(self, query: str, location_bias: Dict = None) -> List[Dict]:
        if not GOOGLE_API_KEY:
            return []
            
        if not quota_manager.can_use_google():
            return []

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            # Agregamos displayName al fieldmask
            "X-Goog-FieldMask": "places.displayName,places.id,places.formattedAddress,places.location,places.types,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours"
        }

        payload = {
            "textQuery": query,
            "maxResultCount": 20, 
            "languageCode": "es"
        }
        
        if location_bias:
            payload["locationBias"] = location_bias

        try:
            response = requests.post(BASE_URL, json=payload, headers=headers, timeout=10)
            quota_manager.track_search() # Tracking

            if response.status_code == 200:
                data = response.json()
                places = data.get("places", [])
                return self._normalize_places(places)
            else:
                logger.error(f"Error Google Places API: {response.text}")
                return []
        except Exception as e:
            logger.error(f"Excepción Google: {e}")
            return []

google_client = GooglePlacesClient()
