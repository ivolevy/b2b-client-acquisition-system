
import os
import requests
import json
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_google")

load_dotenv("backend/.env")

API_KEY = "AIzaSyCoWoOIjOuHF7zKT6gqWUzs6ISgpe-R_AM"
BASE_URL = "https://places.googleapis.com/v1/places:searchText"

def test_google_query(query, lat, lng, radius):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.id,places.types"
    }

    payload = {
        "textQuery": query,
        "maxResultCount": 20,
        "languageCode": "es",
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius
            }
        }
    }

    logger.info(f"Testing query: {query}")
    response = requests.post(BASE_URL, headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        places = data.get("places", [])
        logger.info(f"Results: {len(places)}")
        for i, p in enumerate(places[:5]): # Show first 5 for brevity
            logger.info(f"  {i+1}: {p.get('displayName', {}).get('text')} - {p.get('formattedAddress')} - Types: {p.get('types')}")
    else:
        logger.error(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    LAT = -34.599
    LNG = -58.435
    RADIUS = 4000 # 4km
    
    queries = {
        "1. Current (Commas)": "Tecnología y Servicios Digitales, Software Factory, Agencia Digital, Marketing Digital, SEO Specialist",
        "2. Previous (OR Logic)": "(Tecnología y Servicios Digitales) OR (Software Factory) OR (Agencia Digital) OR (Marketing Digital) OR (SEO Specialist)",
        "3. Simple (Spaces)": "Tecnología Servicios Digitales Software Factory Agencia Digital Marketing Digital SEO Specialist",
        "4. Just specific (Software Factory)": "Software Factory"
    }
    
    for label, q in queries.items():
        logger.info(f"\n--- TESTING: {label} ---")
        test_google_query(q, LAT, LNG, RADIUS)
