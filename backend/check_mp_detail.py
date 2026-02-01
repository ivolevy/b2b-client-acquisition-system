import os
import mercadopago
from dotenv import load_dotenv
import json

load_dotenv()

def check_payment_detail(payment_id):
    sdk = mercadopago.SDK(os.getenv("MP_ACCESS_TOKEN"))
    res = sdk.payment().get(payment_id)
    payment = res["response"]
    
    print(f"Payment {payment_id} Details:")
    print(f"Status: {payment.get('status')}")
    print(f"Status Detail: {payment.get('status_detail')}")
    print(f"Metadata: {json.dumps(payment.get('metadata'), indent=2)}")
    print(f"External Ref: {payment.get('external_reference')}")
    
    # Check if there's any notification info
    # Usually the SDK response doesn't show the notification URL sent for that specific payment
    # but let's see.

if __name__ == "__main__":
    check_payment_detail("1344346069")
