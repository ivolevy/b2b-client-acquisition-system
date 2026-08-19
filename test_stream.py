import sys
import json
from fastapi.testclient import TestClient

sys.path.append('/Users/ivanlevy/Desktop/smartleads')
from backend.main import app

def test_search_stream():
    from backend.api.dependencies import get_current_user_client
    app.dependency_overrides[get_current_user_client] = lambda: {"user_id": "anonymous"}
    
    payload = {
        "rubro": "Software",
        "busqueda_ubicacion_nombre": "Buenos Aires",
        "busqueda_centro_lat": -34.6037,
        "busqueda_centro_lng": -58.3816,
        "busqueda_radio_km": 5,
        "user_id": "anonymous"
    }
    
    with TestClient(app) as client:
        with client.stream("POST", "/api/buscar-stream", json=payload) as response:
            for chunk in response.iter_text():
                print(chunk, end="")

if __name__ == "__main__":
    test_search_stream()
