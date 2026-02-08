import requests
import json
import time

def test_optimized_search():
    url = "http://localhost:8000/api/buscar-stream"
    payload = {
        "rubro": "colegios",
        "busqueda_ubicacion_nombre": "Villa Crespo, CABA",
        "busqueda_centro_lat": -34.5986,
        "busqueda_centro_lng": -58.4354,
        "busqueda_radio_km": 2,
        "user_id": "anonymous"
    }

    print(f"Connecting to {url}...")
    start_time = time.time()
    lead_count = 0
    
    try:
        with requests.post(url, json=payload, stream=True) as response:
            if response.status_code != 200:
                print(f"Error: {response.status_code}")
                return

            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data: '):
                        event = json.loads(decoded[6:])
                        if event['type'] == 'status':
                            print(f"[STATUS] {event['message']}")
                        elif event['type'] == 'lead':
                            lead_count += 1
                            data = event['data']
                            dist = data.get('distancia_km')
                            print(f"#{lead_count} Lead: {data['nombre']} | Dist: {dist}km | Tel: {data.get('telefono') or 'No'}")
                        elif event['type'] == 'complete':
                            print(f"\n[COMPLETE] Found {lead_count} leads in {round(time.time() - start_time, 2)}s")
                            break
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_optimized_search()
