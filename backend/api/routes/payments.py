import os
import logging
from fastapi import APIRouter, HTTPException, Request, Depends
from backend.api.schemas import MPPreferenceRequest
from backend.api.dependencies import get_current_admin
import mercadopago

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Payments"])

mp_token = os.getenv("MP_ACCESS_TOKEN")
if mp_token:
    try:
        sdk = mercadopago.SDK(mp_token)
    except Exception as e:
        logger.error(f"Error configurando MercadoPago: {e}")
        sdk = None
else:
    logger.warning("MP_ACCESS_TOKEN no configurado. Pagos no disponibles.")
    sdk = None

@router.post("/payments/mercadopago/create_preference")
async def create_mp_preference(req: MPPreferenceRequest):
    """
    Crea una preferencia de pago en MercadoPago y devuelve el ID y el punto de inicio.
    """
    try:
        # Precios hardcoded en backend para seguridad (Source of Truth)
        PLAN_PRICES = {
            "essential": 70900,
            "growth": 127900,
            "agency": 286900
        }
        
        # Determinar precio real basado en el plan_id
        real_price = float(req.amount) # Fallback al valor del frontend si no machea
        if req.plan_id and req.plan_id.lower() in PLAN_PRICES:
            real_price = float(PLAN_PRICES[req.plan_id.lower()])
            logger.info(f"💰 Precio corregido por Backend para plan {req.plan_id}: ${real_price}")
            
        preference_data = {
            "items": [
                {
                    "title": req.description,
                    "quantity": 1,
                    "unit_price": real_price,
                    "currency_id": "ARS"
                }
            ],
            "back_urls": {
                "success": f"{os.getenv('FRONTEND_URL')}/payment-success?plan_id={req.plan_id}",
                "failure": f"{os.getenv('FRONTEND_URL')}/landing",
                "pending": f"{os.getenv('FRONTEND_URL')}/landing"
            },
            "auto_return": "approved",
            "external_reference": f"{req.user_id}:{req.plan_id}",
            "metadata": {
                "user_id": req.user_id,
                "plan_id": req.plan_id,
                "email": req.email,
                "name": req.name,
                "phone": req.phone
            },
            "notification_url": f"{os.getenv('BACKEND_URL', os.getenv('FRONTEND_URL', 'https://b2b-client-acquisition-system.vercel.app')).rstrip('/')}/api/webhooks/mercadopago"
        }
        
        # LOG URL CHOICE TO SUPABASE FOR DEBUGGING
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": "MP_DEBUG_URL",
                    "payload": {
                        "notification_url": preference_data['notification_url'],
                        "BACKEND_URL_ENV": os.getenv('BACKEND_URL'),
                        "FRONTEND_URL_ENV": os.getenv('FRONTEND_URL')
                    }
                }).execute()
        except:
            pass
        
        if not os.getenv('BACKEND_URL'):
            logger.warning("⚠️ BACKEND_URL no configurado. Usando fallback automático de Vercel para el webhook.")
        else:
            logger.info(f"Webhook URL configurada: {preference_data['notification_url']}")

        if not sdk:
            raise Exception("SDK de MercadoPago no configurado (Falta Token).")

        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]
        
        init_point = preference["init_point"]
        logger.info(f"Preferencia MP creada: {preference['id']} para user {req.user_id}")
        logger.info(f"MP Init Point: {init_point}")
        
        # Check for sandbox in URL
        if "sandbox" in init_point:
            logger.warning(f"⚠️ ATENCIÓN: Se generó una URL de SANDBOX: {init_point}")
        else:
            logger.info(f"✅ URL de Producción generada: {init_point}")
        
        # LOG TO SUPABASE FOR PRODUCTION DEBUGGING
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": "MP_PREFERENCE_CREATED",
                    "payload": {
                        "preference_id": preference['id'],
                        "notification_url": preference_data['notification_url'],
                        "user_id": req.user_id
                    }
                }).execute()
        except:
            pass
            
        return {"id": preference["id"], "init_point": preference["init_point"]}
    except Exception as e:
        logger.error(f"Error creando preferencia de MP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhooks/mercadopago")
async def mp_webhook(request: Request):
    """
    Webhook para recibir notificaciones de pago de MercadoPago.
    """
    try:
        query_params = request.query_params
        topic = query_params.get("topic") or query_params.get("type")
        resource_id = query_params.get("id") or query_params.get("data.id")
        
        if not topic or not resource_id:
            body = await request.json()
            topic = body.get("type")
            if body.get("data"):
                resource_id = body["data"].get("id")
        
        logger.info(f"MP Webhook received: topic={topic}, id={resource_id}")
        
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": f"MP_WEBHOOK_{topic}",
                    "payload": {"id": resource_id, "params": str(query_params)}
                }).execute()
        except:
            pass
        
        if topic == "payment" and resource_id and sdk:
            payment_info = sdk.payment().get(resource_id)
            payment_data = payment_info["response"]
            
            if payment_data.get("status") == "approved":
                metadata = payment_data.get("metadata", {})
                user_id = metadata.get("user_id")
                plan_id = metadata.get("plan_id")
                email = metadata.get("email")
                name = metadata.get("name")
                phone = metadata.get("phone")
                amount = payment_data.get("transaction_amount")
                
                logger.info(f"¡Pago APROBADO! User: {user_id}, Email: {email}, Plan: {plan_id}, Monto: {amount}")
                
                payment_method_id = payment_data.get("payment_method_id")
                payment_type_id = payment_data.get("payment_type_id")
                net_amount = payment_data.get("transaction_details", {}).get("net_received_amount")
                fee_details = payment_data.get("fee_details", [])

                try:
                    from backend.db_supabase import registrar_pago_exitoso
                    await registrar_pago_exitoso(
                        user_id=user_id, 
                        plan_id=plan_id, 
                        amount=amount, 
                        external_id=resource_id,
                        email=email,
                        name=name,
                        phone=phone,
                        payment_method_id=payment_method_id,
                        payment_type_id=payment_type_id,
                        net_amount=net_amount,
                        fee_details=fee_details
                    )
                except Exception as db_err:
                    logger.error(f"Error registrando pago en DB: {db_err}")
                        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error procesando webhook MP: {e}")
        try:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": "MP_WEBHOOK_ERROR",
                    "payload": {"error": str(e)}
                }).execute()
        except:
            pass
        return {"status": "error", "detail": str(e)}

@router.get("/admin/payments")
async def admin_get_payments(request: Request, admin=Depends(get_current_admin)):
    """
    Obtiene el historial completo de pagos para el dashboard de finanzas.
    """
    try:
        from backend.db_supabase import get_supabase_admin
        admin_client = get_supabase_admin()
        
        response = admin_client.table("payments").select("*").order("created_at", desc=True).limit(500).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error obteniendo pagos admin: {e}")
        return []

@router.get("/admin/usage")
async def admin_get_usage(request: Request, admin=Depends(get_current_admin)):
    """Obtiene el uso y costos de API del mes actual"""
    try:
        from backend.db_supabase import get_current_month_usage
        usage_usd = get_current_month_usage()
        return {"current_month_cost_usd": usage_usd}
    except Exception as e:
        logger.error(f"Error admin usage: {e}")
        return {"current_month_cost_usd": 0.0}
