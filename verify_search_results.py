import asyncio
import json
import logging
import sys
import os

# Añadir el path del backend para poder importar los módulos
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import buscar_por_rubro_stream
from pydantic import BaseModel
from typing import Optional, Dict

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BusquedaRubroRequest(BaseModel):
    rubro: str
    busqueda_ubicacion_nombre: str
    busqueda_radio_km: float = 1.0
    busqueda_centro_lat: float = -34.6037
    busqueda_centro_lng: float = -58.3816
    user_id: str = "anonymous"
    bbox: Optional[str] = None

async def test_search_stream():
    request = BusquedaRubroRequest(
        rubro="colegios",
        busqueda_ubicacion_nombre="CABA, Buenos Aires",
        busqueda_radio_km=2.0
    )
    
    print(f"--- Probando búsqueda stream para: {request.rubro} ---")
    
    count = 0
    leads = []
    status_messages = []
    
    try:
        # Llamar directamente al generador de eventos
        # Nota: necesitamos mockear el request de FastAPI si fuera necesario, 
        # pero aquí estamos llamando a la lógica interna que extrajimos o mockeamos.
        
        # Simulamos el comportamiento de StreamingResponse llamando al generador
        response = await buscar_por_rubro_stream(request)
        # El endpoint retorna un StreamingResponse. Accedemos al iterador de contenido.
        
        async for chunk in response.body_iterator:
            if chunk.startswith("data: "):
                data_str = chunk.replace("data: ", "").strip()
                if not data_str: continue
                
                try:
                    data = json.loads(data_str)
                    if data.get('type') == 'lead':
                        count += 1
                        leads.append(data.get('data'))
                        print(f"LEAD #{count}: {data['data'].get('nombre')} - Email: {data['data'].get('email')}")
                    elif data.get('type') == 'status':
                        status_messages.append(data.get('message'))
                        print(f"STATUS: {data['message']}")
                    elif data.get('type') == 'error':
                        print(f"ERROR: {data['message']}")
                except json.JSONDecodeError:
                    pass

    except Exception as e:
        print(f"ERROR DURANTE EL TEST: {e}")

    print(f"\n--- Resumen del Test ---")
    print(f"Total Leads encontrados: {count}")
    print(f"Mensajes de status: {len(status_messages)}")
    
    if count > 0:
        print("SUCCESS: La búsqueda está devolviendo resultados.")
    else:
        print("FAILURE: No se encontraron resultados. Revisa los logs.")

if __name__ == "__main__":
    asyncio.run(test_search_stream())
