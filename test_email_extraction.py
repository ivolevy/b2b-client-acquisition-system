import asyncio
import sys
import os
import json

# Añadir el path del backend para poder importar los módulos
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import buscar_por_rubro_stream
from scraper import ScraperSession
from pydantic import BaseModel
from typing import Optional

class BusquedaRubroRequest(BaseModel):
    rubro: str
    busqueda_ubicacion_nombre: str
    busqueda_radio_km: float = 1.0
    busqueda_centro_lat: float = -34.6037
    busqueda_centro_lng: float = -58.3816
    user_id: str = "anonymous"
    bbox: Optional[str] = None

async def verify_deep_scraping():
    # Test with a specific URL or a real search
    request = BusquedaRubroRequest(
        rubro="colegios",
        busqueda_ubicacion_nombre="CABA, Buenos Aires",
        busqueda_radio_km=2.0
    )
    
    print("\n" + "="*50)
    print("INICIANDO TEST DE EXTRACCION DE EMAILS")
    print("="*50)
    
    count = 0
    leads_with_email = 0
    
    try:
        response = await buscar_por_rubro_stream(request)
        
        async for chunk in response.body_iterator:
            if chunk.startswith("data: "):
                data_str = chunk.replace("data: ", "").strip()
                if not data_str: continue
                
                try:
                    data = json.loads(data_str)
                    if data.get('type') == 'lead':
                        lead = data.get('data')
                        count += 1
                        email = lead.get('email')
                        if email:
                            leads_with_email += 1
                            print(f"[SUCCESS] Lead #{count}: {lead.get('nombre')} -> EMAIL ENCONTRADO: {email}")
                        else:
                            # print(f"[INFO] Lead #{count}: {lead.get('nombre')} -> Sin email")
                            pass
                    elif data.get('type') == 'status':
                        print(f"STATUS: {data.get('message')}")
                except:
                    pass
    except Exception as e:
        print(f"ERROR: {e}")

    print("\n" + "="*50)
    print(f"RESUMEN FINAL")
    print(f"Leads procesados: {count}")
    print(f"Leads con EMAIL: {leads_with_email}")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(verify_deep_scraping())
