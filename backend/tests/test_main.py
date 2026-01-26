from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_get_rubros():
    response = client.get("/rubros")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "rubros" in data
