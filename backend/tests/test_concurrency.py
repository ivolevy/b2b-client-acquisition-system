import pytest
import threading
import time
from unittest.mock import patch, MagicMock
from backend.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_credit_deduction_concurrency():
    """
    Test to simulate multiple concurrent credit deductions for the same user.
    Note: Real concurrency depends on DB transactions/locking.
    In this unit test, we verify that the logic is called correctly.
    """
    user_id = "concurrent-user"
    
    # We want to check if multiple calls to an endpoint that deducts credits
    # behave safely. For example, /buscar often deducts credits.
    
    with patch("backend.main.deduct_credits") as mock_deduct:
        mock_deduct.return_value = {"success": True, "new_balance": 900}
        
        def call_buscar():
            # Minimal payload for /buscar
            payload = {
                "rubro": "test",
                "user_id": user_id,
                "ciudad": "Tester City"
            }
            client.post("/buscar", json=payload)

        threads = []
        for i in range(5):
            t = threading.Thread(target=call_buscar)
            threads.append(t)
            t.start()
            
        for t in threads:
            t.join()
            
        # Verify it was called 5 times
        assert mock_deduct.call_count == 5

if __name__ == "__main__":
    test_credit_deduction_concurrency()
