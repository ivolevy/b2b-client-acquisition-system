import asyncio
import os
from backend.db_supabase import registrar_pago_exitoso
import mercadopago
from dotenv import load_dotenv

load_dotenv()

async def rescue_payment(payment_id):
    print(f"🚀 Intentando rescatar pago {payment_id}...")
    
    sdk = mercadopago.SDK(os.getenv("MP_ACCESS_TOKEN"))
    payment_info = sdk.payment().get(payment_id)
    payment_data = payment_info["response"]
    
    if payment_data.get("status") == "approved":
        metadata = payment_data.get("metadata", {})
        user_id = metadata.get("user_id")
        plan_id = metadata.get("plan_id")
        email = metadata.get("email")
        name = metadata.get("name")
        phone = metadata.get("phone")
        amount = payment_data.get("transaction_amount")
        
        print(f"✅ Pago encontrado. Usuario: {user_id}, Email: {email}, Plan: {plan_id}")
        
        success = await registrar_pago_exitoso(
            user_id=user_id,
            plan_id=plan_id,
            amount=amount,
            external_id=payment_id,
            email=email,
            name=name,
            phone=phone
        )
        
        if success:
            print("🎉 ¡Pago rescatado exitosamente! El email debería haber sido enviado.")
        else:
            print("❌ Error al procesar el pago en la base de datos.")
    else:
        print(f"⚠️ El pago no está aprobado (Status: {payment_data.get('status')})")

if __name__ == "__main__":
    import sys
    pid = sys.argv[1] if len(sys.argv) > 1 else "1344346125"
    asyncio.run(rescue_payment(pid))
