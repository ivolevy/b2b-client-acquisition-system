from fastapi.testclient import TestClient
from backend.main import app
import os

# Set dummy env vars to avoid errors during startup if needed
os.environ['MP_ACCESS_TOKEN'] = 'dummy'

client = TestClient(app)

print("Testing /email/enviar-masivo availability...")
# We just want to check if it exists (method not allowed 405 or 422 validation error is fine, 404 is bad)
response = client.post("/email/enviar-masivo", json={})
print(f"Status Code: {response.status_code}")
if response.status_code != 404:
    print("Endpoint FOUND!")
else:
    print("Endpoint NOT FOUND")
