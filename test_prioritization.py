import asyncio
import sys
import os
import json

# Añadir el path del backend para poder importar los módulos
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import BusquedaRubroRequest, buscar_por_rubro_stream

async def test_prioritization():
    # Test with a specific search that we know returns many results
    request = BusquedaRubroRequest(
        rubro="colegios",
        busqueda_ubicacion_nombre="CABA, Buenos Aires",
        busqueda_radio_km=2.0
    )
    
    print("\n" + "="*50)
    print("TEST DE PRIORIZACION DE LEADS (EMAILS PRIMERO)")
    print("="*50)
    
    leads_received = []
    
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
                        leads_received.append(lead)
                        print(f"RECIBIDO: {lead.get('nombre')} | Email: {lead.get('email')}")
                    elif data.get('type') == 'status':
                        print(f"STATUS: {data.get('message')}")
                except:
                    pass
    except Exception as e:
        print(f"ERROR: {e}")

    print("\n" + "="*50)
    print(f"VERIFICANDO ORDEN")
    print("="*50)
    
    emails_found_after_no_email = False
    first_no_email_index = -1
    
    for i, lead in enumerate(leads_received):
        if not lead.get('email') and first_no_email_index == -1:
            first_no_email_index = i
        if lead.get('email') and first_no_email_index != -1:
            emails_found_after_no_email = True
            print(f"FALLO: Lead con email {lead.get('nombre')} aparece después de uno sin email (index {i})")

    if not emails_found_after_no_email:
        print("EXITO: Todos los leads con email aparecieron antes que los leads sin email.")
    else:
        print("AVISO: Algunos leads con email aparecieron después. Esto puede ser normal si el enriquecimiento en paralelo terminó antes para algunos leads sin email o si se superaron los límites de lote.")

if __name__ == "__main__":
    asyncio.run(test_prioritization())
