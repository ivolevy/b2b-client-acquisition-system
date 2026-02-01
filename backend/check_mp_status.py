import os
import mercadopago
from dotenv import load_dotenv

load_dotenv()

def check_preferences():
    MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")
    sdk = mercadopago.SDK(MP_ACCESS_TOKEN)
    
    try:
        res = sdk.payment().search({'limit': 20, 'sort': 'date_created', 'criteria': 'desc'})
        print("Recent payments (sorted desc):")
        for p in res["response"].get("results", []):
            print(f"- ID: {p.get('id')}, Status: {p.get('status')}, Date: {p.get('date_created')}, Email: {p.get('payer', {}).get('email')}")
    except Exception as e:
        print(f"Error checking payments: {e}")

if __name__ == "__main__":
    check_preferences()
