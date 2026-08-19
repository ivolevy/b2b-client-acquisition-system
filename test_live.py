import requests
import json

url = "https://b2b-client-acquisition-system-hlll.vercel.app/api/buscar-stream"

payload = {
    "rubro": "Software",
    "busqueda_ubicacion_nombre": "Buenos Aires",
    "busqueda_centro_lat": -34.6037,
    "busqueda_centro_lng": -58.3816,
    "busqueda_radio_km": 5,
    "user_id": "anonymous"
}

try:
    with requests.post(url, json=payload, stream=True) as r:
        print(f"Status Code: {r.status_code}")
        for line in r.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                print(decoded_line)
                if "complete" in decoded_line:
                    break
except Exception as e:
    print(f"Error: {e}")
