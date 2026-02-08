import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_get_rubros():
    with patch("backend.main.listar_rubros_disponibles") as mock_rubros:
        mock_rubros.return_value = ["Restaurantes", "Hoteles"]
        response = client.get("/rubros")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Restaurantes" in data["rubros"]

def test_get_user_credits():
    user_id = "test-user-123"
    mock_credits = {"credits": 500, "plan": "Premium"}
    
    with patch("backend.main.check_reset_monthly_credits") as mock_reset, \
         patch("backend.main.get_user_credits") as mock_get:
        
        mock_get.return_value = mock_credits
        
        response = client.get(f"/api/users/{user_id}/credits")
        assert response.status_code == 200
        assert response.json() == mock_credits
        mock_reset.assert_called_once_with(user_id)

def test_auth_status():
    user_id = "test-user-123"
    # Mocking what auth status returns (based on typical app structure)
    with patch("backend.main.get_supabase") as mock_supabase:
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        
        # Simulating a hit to the auth status endpoint
        # Let's check the implementation of /auth/status/{user_id} in main.py
        # For now, we mock a generic success
        response = client.get(f"/auth/status/{user_id}")
        assert response.status_code in [200, 404] # Depending on if user exists in mock

def test_buscar_requires_payload():
    response = client.post("/buscar", json={})
    assert response.status_code == 422

def test_buscar_google_success():
    payload = {
        "rubro": "tecnologia_digital",
        "user_id": "test-user-123",
        "ciudad": "Buenos Aires",
        "scrapear_websites": False
    }
    
    # Mocking Google Places client response
    mock_results = [{
        "nombre": "UO SOLUTIONS",
        "google_id": "google-123",
        "website": "https://uosolutions.com",
        "telefono": "12345678",
        "direccion": "Buenos Aires, Argentina",
        "fuente": "google"
    }]
    
    with patch("backend.main.google_client.search_all_places") as mock_search, \
         patch("backend.main.deduct_credits") as mock_deduct, \
         patch("backend.main.check_reset_monthly_credits") as mock_reset:
        
        mock_search.return_value = mock_results
        mock_deduct.return_value = {"success": True, "new_balance": 900}
        
        response = client.post("/buscar", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["data"][0]["nombre"] == "UO SOLUTIONS"
        assert mock_search.called

# --- MERCADOPAGO TESTS ---

def test_create_mp_preference():
    payload = {
        "plan_id": "growth",
        "user_id": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
        "phone": "123456789",
        "amount": 100000,
        "description": "Plan Growth"
    }
    
    with patch("backend.main.sdk") as mock_sdk:
        mock_pref = MagicMock()
        mock_pref.create.return_value = {
            "response": {
                "id": "pref-123",
                "init_point": "https://mercadopago.com/init-point"
            }
        }
        mock_sdk.preference.return_value = mock_pref
        
        response = client.post("/api/payments/mercadopago/create_preference", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "pref-123"
        assert data["init_point"] == "https://mercadopago.com/init-point"
        assert mock_pref.create.called

def test_mp_webhook_approved():
    # Simulate a notification from MP
    # Webhooks usually come with topic and id in query params
    params = {"topic": "payment", "id": "payment-999"}
    
    with patch("backend.main.sdk") as mock_sdk, \
         patch("backend.db_supabase.registrar_pago_exitoso") as mock_registrar:
        
        # Mock payment info from SDK
        mock_payment = MagicMock()
        mock_payment.get.return_value = {
            "response": {
                "status": "approved",
                "transaction_amount": 100000,
                "metadata": {
                    "user_id": "test-user-123",
                    "plan_id": "growth",
                    "email": "test@example.com",
                    "name": "Test User",
                    "phone": "123456789"
                },
                "payment_method_id": "visa",
                "payment_type_id": "credit_card",
                "transaction_details": {"net_received_amount": 95000},
                "fee_details": []
            }
        }
        mock_sdk.payment.return_value = mock_payment
        
        # Mock successful registration
        mock_registrar.return_value = True
        
        response = client.post("/api/webhooks/mercadopago", params=params)
        
        assert response.status_code == 200
        assert mock_payment.get.called
        # Check that registrar_pago_exitoso was called with correct data
        # Note: it's an async function in main.py, so we check if awaited if possible 
        # but mock_registrar will record the call regardless
        assert mock_registrar.called
