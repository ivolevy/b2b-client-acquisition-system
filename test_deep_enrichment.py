import sys
import os
import logging
from pprint import pprint

# Adjust path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from backend.scraper import scrapear_empresa_b2b
from backend.ai_service import generate_icebreaker

# URL test (una empresa real o mock)
TEST_URL = "https://www.globant.com"  # Ejemplo robusto

def test_deep_enrichment():
    print(f"--- Inicio Test Deep Enrichment con {TEST_URL} ---")
    
    # 1. Scraping
    print("1. Scraping website...")
    data = scrapear_empresa_b2b(TEST_URL, rubro="Technology")
    
    print("\n[RESULTADOS SCRAPING]")
    print(f"Title: {data.get('website_title')}")
    print(f"Description: {data.get('website_description')}")
    print(f"Content Length: {len(data.get('website_content', ''))} chars")
    print(f"Content Preview: {data.get('website_content', '')[:200]}...")
    
    if not data.get('website_title') and not data.get('website_content'):
        print("❌ FALLO: No se extrajo contenido del sitio.")
        return

    # 2. Mock lead data for AI
    lead_data = {
        'nombre': 'Globant',
        'rubro': 'Technology',
        'ciudad': 'Buenos Aires',
        'website': TEST_URL,
        'website_title': data.get('website_title'),
        'website_description': data.get('website_description'),
        'website_content': data.get('website_content'),
        'instagram': 'globant',
        'linkedin': 'globant'
    }
    
    # 3. Generate Icebreaker
    print("\n2. Generating Icebreaker with AI...")
    icebreaker = generate_icebreaker(lead_data)
    
    print("\n[RESULTADO ICEBREAKER]")
    print(icebreaker)
    
    if "Globant" in icebreaker or "tecnología" in icebreaker or "digital" in icebreaker.lower():
        print("✅ ÉXITO: El icebreaker parece relevante.")
    else:
        print("⚠️ WARNING: El icebreaker podría ser genérico.")

if __name__ == "__main__":
    test_deep_enrichment()
