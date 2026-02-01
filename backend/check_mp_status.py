import os
import mercadopago
from dotenv import load_dotenv

load_dotenv()

def check_preferences():
    MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")
    if not MP_ACCESS_TOKEN:
        print("❌ MP_ACCESS_TOKEN not found in .env")
        return
        
    sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
    
    # We can't easily list preferences from the SDK, but we can try to search or check status
    # Actually, MercadoPago doesn't have a simple 'list preferences' endpoint in the Python SDK
    # that is documented for easy searching without an ID.
    
    print(f"Checking with token starting with: {MP_ACCESS_TOKEN[:10]}...")
    
    # Let's try to get a fake payment just to see if the SDK is connected
    try:
        res = sdk.payment().search({'limit': 5})
        print("Recent payments:")
        for p in res["response"].get("results", []):
            print(f"- ID: {p.get('id')}, Status: {p.get('status')}, Date: {p.get('date_created')}, External Reference: {p.get('external_reference')}")
    except Exception as e:
        print(f"Error checking payments: {e}")

if __name__ == "__main__":
    check_preferences()
