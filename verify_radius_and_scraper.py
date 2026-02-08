import asyncio
from main import BusquedaRubroRequest, buscar_por_rubro_stream
# Si falla, intentaremos importación directa
try:
    from backend.main import BusquedaRubroRequest, buscar_por_rubro_stream
except ImportError:
    pass

async def test_radius_and_scraper():
    print("--- Verificando Restricción de Radio (3km) ---")
    # Test 1: Requesting 5km, should be capped at 3km
    req = BusquedaRubroRequest(
        rubro="colegios",
        ubicacion_nombre="Villa Crespo, Buenos Aires",
        busqueda_centro_lat=-34.5982,
        busqueda_centro_lng=-58.4334,
        busqueda_radio_km=5.0  # Should be capped to 3.0
    )
    
    # We can check the logs or the emitted leads distance if we were to run the generator
    # For now, let's just see if it runs without error and check the printed radius in logs
    print(f"Solicitando radio de {req.busqueda_radio_km}km. Verificando logs del servidor...")

    print("\n--- Verificando Mejoras del Scraper (Simulación) ---")
    from scraper import ScraperSession, scrapear_empresa_b2b
    
    session = ScraperSession()
    print(f"User-Agent: {session.session.headers['User-Agent']}")
    
    # Test a known site if possible, or just verify logic
    # url = "https://www.google.com" # Just to check connectivity
    # result = scrapear_empresa_b2b(url, session=session)
    # print(f"Resultado scraping {url}: {result}")

if __name__ == "__main__":
    asyncio.run(test_radius_and_scraper())
