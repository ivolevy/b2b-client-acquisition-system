import requests
import json
import time

def test_streaming_search():
    url = "http://localhost:8000/api/buscar-stream"
    payload = {
        "rubro": "colegios",
        "busqueda_ubicacion_nombre": "Villa Crespo, CABA",
        "busqueda_centro_lat": -34.5986,
        "busqueda_centro_lng": -58.4354,
        "busqueda_radio_km": 1,
        "user_id": "anonymous"
    }

    print(f"Connecting to {url}...")
    try:
        # Use stream=True to process chunks
        with requests.post(url, json=payload, stream=True) as response:
            if response.status_code != 200:
                print(f"Error: {response.status_code}")
                print(response.text)
                return

            print("Stream opened. Waiting for events...")
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        event_json = decoded_line[6:]
                        try:
                            event = json.loads(event_json)
                            event_type = event.get('type')
                            
                            if event_type == 'status':
                                print(f"[STATUS] {event.get('message')}")
                            elif event_type == 'lead':
                                data = event.get('data', {})
                                print(f"[LEAD] {data.get('nombre')} - {data.get('website') or 'No website'}")
                            elif event_type == 'update':
                                data = event.get('data', {})
                                print(f"  [UPDATE] {data.get('nombre')} -> Email: {data.get('email')}, Phone: {data.get('telefono')}")
                            elif event_type == 'complete':
                                print("[COMPLETE] Search finished.")
                                break
                        except json.JSONDecodeError:
                            print(f"Failed to parse JSON: {event_json}")

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_streaming_search()
