import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse

try:
    from backend.api.schemas import *
    from backend.api.dependencies import get_current_admin
    from backend.db_supabase import *
except ImportError:
    pass

logger = logging.getLogger(__name__)

def replace_app(text):
    return text.replace("@app.", "@router.")

router = APIRouter(tags=["Communications"])
# ========== FUNCIONES HELPER PARA PERSISTENCIA (Supabase) ==========

def obtener_template(template_id: str) -> Optional[Dict]:
    """Helper para obtener un template por ID (sin validar owner)"""
    try:
        from backend.db_supabase import get_supabase_admin
        client = get_supabase_admin()
        if not client: return None
        
        # Primero buscar en user templates
        res = client.table('email_templates').select('*').eq('id', template_id).execute()
        if res.data:
            return res.data[0]
            
        return None
    except Exception as e:
        logger.error(f"Error en obtener_template helper: {e}")
        return None

def guardar_email_history(**kwargs):
    """Helper para loguear historial de email"""
    try:
        from backend.db_supabase import db_log_email_history
        # Intentar determinar el user_id (usualmente en kwargs o necesitamos pasarlo)
        user_id = kwargs.get('user_id', 'system')
        return db_log_email_history(user_id, kwargs)
    except Exception as e:
        logger.error(f"Error guardando email history: {e}")
        return False

def obtener_email_history(empresa_id=None, template_id=None, limit=100):
    """Helper para leer historial de email"""
    try:
        from backend.db_supabase import get_supabase_admin
        client = get_supabase_admin()
        if not client: return []
        
        query = client.table('email_history').select('*').order('sent_at', desc=True).limit(limit)
        if empresa_id:
            query = query.eq('company_id', empresa_id)
        if template_id:
            query = query.eq('template_id', template_id)
            
        res = query.execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error obteniendo email history: {e}")
        return []

# ========== ENDPOINTS DE EMAIL TEMPLATES ==========

@router.post("/email/enviar")
async def enviar_email_individual(request: EnviarEmailRequest):
    """Envía un email individual a una empresa"""
    try:
        # Buscar empresa: Primero en la solicitud, luego en memoria
        empresa = None
        
        if request.empresa_data:
            empresa = request.empresa_data.copy()
            # Asegurar que el ID coincida (o usar el del payload)
            if 'id' not in empresa:
                empresa['id'] = request.empresa_id
        else:
            # Fallback a memoria
            for e in _memoria_empresas:
                if e.get('id') == request.empresa_id:
                    empresa = e.copy()
                    break
        
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada en memoria ni en la solicitud")
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        # Enviar email
        resultado = enviar_email(
            empresa=empresa,
            template=template,
            asunto_personalizado=request.asunto_personalizado,
            user_id=request.user_id,
            provider=request.provider,
            attachments=request.attachments
        )
        
        # Guardar en historial
        guardar_email_history(
            empresa_id=empresa['id'],
            empresa_nombre=empresa.get('nombre', ''),
            empresa_email=empresa.get('email', ''),
            template_id=template['id'],
            template_nombre=template.get('nombre', ''),
            subject=resultado.get('message', ''),
            status='success' if resultado['success'] else 'error',
            error_message=resultado.get('error')
        )
        
        if not resultado['success']:
            raise HTTPException(status_code=400, detail=resultado['message'])
        
        return {
            "success": True,
            "message": resultado['message'],
            "data": resultado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/email/enviar-masivo")
async def enviar_email_masivo_endpoint(request: EnviarEmailMasivoRequest):
    """Envía emails a múltiples empresas"""
    try:
        # Priorizar datos enviados explícitamente (Stateless mode for Vercel)
        empresas = []
        
        if request.empresas_data and len(request.empresas_data) > 0:
             empresas = request.empresas_data
             logger.info(f"Usando {len(empresas)} empresas enviadas en payload (Stateless)")
        else:
            # Buscar empresas en memoria (Fallback local)
            empresas_dict = {e.get('id'): e for e in _memoria_empresas}
            
            for empresa_id in request.empresa_ids:
                if empresa_id in empresas_dict:
                    empresas.append(empresas_dict[empresa_id].copy())
            
            if len(empresas) != len(request.empresa_ids):
                missing = set(request.empresa_ids) - set(e.get('id') for e in empresas)
                # En Vercel esto fallará si no se envían datos, pero dejamos el warning/error
                logger.warning(f"Algunas empresas no encontradas en memoria: {missing}")
                if not empresas:
                     raise HTTPException(status_code=404, detail=f"Empresas no encontradas en memoria. Serverless requiere enviar datos completos.")
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        resultados = enviar_emails_masivo(
            empresas=empresas,
            template=template,
            asunto_personalizado=request.asunto_personalizado,
            delay_segundos=request.delay_segundos,
            user_id=request.user_id,
            provider=request.provider,
            attachments=request.attachments,
            auto_personalize=request.auto_personalize
        )
        
        # Guardar en historial
        for detalle in resultados['detalles']:
            if 'empresa_id' in detalle:
                guardar_email_history(
                    empresa_id=detalle['empresa_id'],
                    empresa_nombre=detalle.get('empresa_nombre', ''),
                    empresa_email=detalle.get('empresa_email', ''),
                    template_id=template['id'],
                    template_nombre=template.get('nombre', ''),
                    subject=template.get('subject', ''),
                    status='success' if detalle.get('success') else 'error',
                    error_message=detalle.get('error')
                )
        
        return {
            "success": True,
            "message": f"Proceso completado: {resultados['exitosos']} exitosos, {resultados['fallidos']} fallidos",
            "data": resultados
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando emails masivos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/email/historial")
async def obtener_historial_email(empresa_id: Optional[str] = None, template_id: Optional[str] = None, limit: int = 100):
    """Obtiene el historial de emails enviados"""
    try:
        historial = obtener_email_history(
            empresa_id=empresa_id,
            template_id=template_id,
            limit=limit
        )
        return {
            "success": True,
            "total": len(historial),
            "data": historial
        }
    except Exception as e:
        logger.error(f"Error obteniendo historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS DE VALIDACIÓN DE CÓDIGO PARA CAMBIO DE CONTRASEÑA ==========

# --- MODULE: COMMUNICATIONS (INBOX) ---

def get_user_id_from_header(request: Request) -> Optional[str]:
    # Helper simple para extraer user_id del header (usado en endpoints protegidos)
    return request.headers.get("X-User-ID")

@router.get("/api/communications/inbox")
async def get_inbox_conversations(request: Request, channel: Optional[str] = None):
    """Obtiene la lista de conversaciones (Inbox) filtrada opcionalmente por canal"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        query = admin.table("email_conversations").select("*").eq("user_id", user_id)
        
        if channel and channel != 'all':
            query = query.eq("channel", channel)
            
        res = query.order("last_message_at", desc=True).execute()
            
        return {"conversations": res.data}
    except Exception as e:
        logger.error(f"Error fetching inbox: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.get("/api/communications/stats")
async def get_communications_stats(request: Request):
    """Obtiene estadísticas detalladas para el módulo Insights"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        
        # 1. Agregación de estados (Funnel)
        raw_convs = admin.table("email_conversations").select("status").eq("user_id", user_id).execute()
        
        status_counts = {
            "open": 0,
            "waiting_reply": 0,
            "interested": 0,
            "not_interested": 0,
            "converted": 0
        }
        
        for c in (raw_convs.data or []):
            st = c.get('status', 'open') or 'open'
            if st in status_counts:
                status_counts[st] += 1
            else:
                status_counts["open"] += 1
                
        # 2. Activity Feed (Últimos 20 mensajes)
        # Necesitamos unir con email_conversations para tener el lead_name
        recent_messages = admin.table("email_messages")\
            .select("*, email_conversations(lead_name, channel)")\
            .order("sent_at", desc=True)\
            .limit(20)\
            .execute()
            
        # 3. Radar: Leads Olvidados (Interesados sin actividad por > 3 días)
        three_days_ago = (datetime.now() - timedelta(days=3)).isoformat()
        forgotten_leads = admin.table("email_conversations")\
            .select("id, lead_name, last_message_at, subject")\
            .eq("user_id", user_id)\
            .eq("status", "interested")\
            .lt("last_message_at", three_days_ago)\
            .order("last_message_at", desc=True)\
            .limit(10)\
            .execute()

        # 4. Análisis de Intenciones IA (Más valor: basado en Triggers)
        intent_stats = []
        try:
            # Traer reglas que tienen condición de intención
            rules_res = admin.table("automation_rules")\
                .select("id, name, condition_value")\
                .eq("user_id", user_id)\
                .eq("condition_type", "ai_intent")\
                .execute()
            
            if rules_res.data:
                rule_ids = [r['id'] for r in rules_res.data]
                # Contar ejecuciones exitosas por regla
                logs_res = admin.table("automation_logs")\
                    .select("rule_id")\
                    .eq("execution_status", "success")\
                    .in_("rule_id", rule_ids)\
                    .execute()
                
                counts = {}
                for l in (logs_res.data or []):
                    rid = l['rule_id']
                    counts[rid] = counts.get(rid, 0) + 1
                
                for r in rules_res.data:
                    intent_label = r['condition_value'].get('intent', 'Desconocido') if isinstance(r['condition_value'], dict) else 'Desconocido'
                    intent_stats.append({
                        "id": r['id'],
                        "label": r['name'] or intent_label,
                        "intent": intent_label,
                        "count": counts.get(r['id'], 0)
                    })
                # Ordenar por los más frecuentes
                intent_stats = sorted(intent_stats, key=lambda x: x['count'], reverse=True)
        except Exception as e:
            logger.error(f"Error calculating intent stats: {e}")

        # 5. Cálculo de Conversión
        total_leads = sum(status_counts.values())
        conversion_rate = round((status_counts["converted"] / total_leads * 100), 1) if total_leads > 0 else 0
        
        return {
            "funnel": status_counts,
            "intents": intent_stats,
            "activity": recent_messages.data or [],
            "radar": forgotten_leads.data or [],
            "kpis": {
                "total_leads": total_leads,
                "conversion_rate": conversion_rate,
                "hot_leads": status_counts["interested"]
            }
        }
    except Exception as e:
        logger.error(f"Error in stats endpoint: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.post("/api/communications/cleanup")
async def cleanup_inactive_leads(request: Request):
    """Elimina automáticamente leads en 'Poco Interés' inactivos por > 14 días"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        # Calculamos la fecha límite (hace 14 días)
        cutoff_date = (datetime.now() - timedelta(days=14)).isoformat()
        
        # 1. Buscar conversaciones que cumplen el criterio
        to_delete = admin.table("email_conversations")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("status", "not_interested")\
            .lt("last_message_at", cutoff_date)\
            .execute()
            
        deleted_count = 0
        if to_delete.data:
            for conv in to_delete.data:
                conv_id = conv['id']
                # Eliminar mensajes primero
                admin.table("email_messages").delete().eq("conversation_id", conv_id).execute()
                # Eliminar conversación
                admin.table("email_conversations").delete().eq("id", conv_id).execute()
                deleted_count += 1
                
        return {"status": "success", "deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Error in cleanup: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.delete("/api/communications/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request):
    """Elimina una conversación y sus mensajes asociados"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        # Primero eliminar mensajes (si no hay cascade delete en DB)
        admin.table("email_messages").delete().eq("conversation_id", conversation_id).execute()
        
        # Eliminar conversación (verificando user_id por seguridad)
        res = admin.table("email_conversations")\
            .delete()\
            .eq("id", conversation_id)\
            .eq("user_id", user_id)\
            .execute()
            
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id}: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.post("/api/communications/whatsapp/log")
async def log_whatsapp_message(req: LogWhatsAppRequest, request: Request):
    """Registra un mensaje de WhatsApp enviado manualmente"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        from backend.email_sync_service import get_or_create_conversation, store_message
        
        # 1. Buscar o crear conversación de WhatsApp
        # Buscamos por lead_phone y channel='whatsapp'
        conv_id = get_or_create_conversation(
            user_id=user_id,
            lead_email=f"{req.phone}@whatsapp", # Email sintético para match
            subject="WhatsApp Chat",
            channel="whatsapp",
            lead_phone=req.phone
        )
            
        if not conv_id:
            return JSONResponse(status_code=500, content={"detail": "Could not create/find conversation"})
            
        # 2. Registrar el mensaje y actualizar conversación vía store_message
        msg_data = {
            "external_id": f"wa_{datetime.now().timestamp()}",
            "sender": "me" if req.direction == 'outbound' else req.phone,
            "recipient": req.phone if req.direction == 'outbound' else "me",
            "direction": req.direction,
            "snippet": req.message,
            "date": datetime.now().isoformat(),
            "channel": "whatsapp",
            "body_html": f"<p>{req.message}</p>"
        }
        store_message(user_id, conv_id, msg_data)
        
        return {"status": "success", "conversation_id": conv_id}
    except Exception as e:
        logger.error(f"Error logging whatsapp: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.patch("/api/communications/conversations/{conversation_id}/status")
async def update_conversation_status(conversation_id: str, req: UpdateConversationStatusRequest, request: Request):
    """Actualiza el estado de una conversación"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        
        # Verificar pertenencia
        conv = admin.table("email_conversations").select("user_id").eq("id", conversation_id).execute()
        if not conv.data or str(conv.data[0]['user_id']) != user_id:
             return JSONResponse(status_code=403, content={"detail": "Forbidden"})

        # Actualizar estado
        res = admin.table("email_conversations").update({
            "status": req.status,
            "updated_at": datetime.now().isoformat()
        }).eq("id", conversation_id).execute()
        
        return {"status": "success", "data": res.data}
    except Exception as e:
        logger.error(f"Error updating status: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.get("/api/communications/thread/{conversation_id}")
async def get_conversation_thread(conversation_id: str, request: Request):
    """Obtiene el hilo de mensajes de una conversación"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        admin = get_supabase_admin()
        
        # Verificar pertenencia
        conv = admin.table("email_conversations").select("user_id").eq("id", conversation_id).execute()
        if not conv.data or str(conv.data[0]['user_id']) != user_id:
             return JSONResponse(status_code=403, content={"detail": "Forbidden"})

        # Traer mensajes
        res = admin.table("email_messages")\
            .select("*")\
            .eq("conversation_id", conversation_id)\
            .order("sent_at", desc=False)\
            .execute()
            
        return {"messages": res.data}
    except Exception as e:
        logger.error(f"Error fetching thread: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.post("/api/communications/sync")
async def trigger_email_sync(request: Request):
    """Dispara la sincronización manual de emails"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        # Importar dinámicamente para evitar ciclos
        from backend.email_sync_service import sync_gmail_account, sync_outlook_account
        from backend.db_supabase import get_all_user_oauth_tokens

        tokens = get_all_user_oauth_tokens(user_id)
        if not tokens:
             return {"status": "ok", "synced": {}, "message": "No connected accounts"}

        results = {"gmail": False, "outlook": False}
        
        # Sync Google
        google_token = next((t for t in tokens if t.get('provider') == 'google'), None)
        if google_token:
            sync_gmail_account(user_id, google_token)
            results["gmail"] = True
            
        # Sync Outlook
        outlook_token = next((t for t in tokens if t.get('provider') == 'outlook'), None)
        if outlook_token:
            sync_outlook_account(user_id, outlook_token)
            results["outlook"] = True
            
        return {"status": "ok", "synced": results}
    except Exception as e:
        logger.error(f"Error triggering sync: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.post("/api/debug/mock-inbound")
async def mock_inbound_email(req: Dict, request: Request):
    """Simula la llegada de un correo entrante para pruebas de UI"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    
    try:
        from backend.email_sync_service import store_message
        
        # Datos del mensaje mock
        msg_data = {
            "external_id": f"mock_{datetime.now().timestamp()}",
            "sender": req.get('lead_email', 'cliente@ejemplo.com'),
            "recipient": "me@example.com",
            "direction": 'inbound',
            "snippet": req.get('message', '¡Hola! Me interesa mucho la propuesta. ¿Podemos coordinar una reunión?'),
            "date": datetime.now().isoformat(),
            "body_html": f"<p>{req.get('message', '¡Hola! Me interesa mucho la propuesta. ¿Podemos coordinar una reunión?')}</p>"
        }
        
        store_message(user_id, req.get('conversation_id'), msg_data)
        return {"status": "success", "message": "Injected mock inbound email"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.post("/api/communications/email/reply")
async def send_email_reply(req: SendEmailReplyRequest, request: Request):
    """Envía una respuesta formal a un correo y actualiza el hilo"""
    user_id = get_user_id_from_header(request)
    if not user_id:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        
    try:
        from backend.email_service import enviar_email
        from backend.email_sync_service import store_message
        
        # 1. Enviar el correo físicamente
        # Nota: Por ahora usamos enviar_email genérico que busca provider
        res_send = enviar_email(
            destinatario=req.recipient_email,
            asunto=req.subject,
            cuerpo_html=req.message.replace('\n', '<br>'),
            cuerpo_texto=req.message,
            user_id=user_id,
            attachments=req.attachments # Pasar adjuntos
        )
        
        if not res_send.get('success'):
            return JSONResponse(status_code=500, content={"detail": res_send.get('message')})
            
        # 2. Guardar en DB y actualizar estado
        msg_data = {
            "external_id": res_send.get('message_id'),
            "sender": "me", 
            "recipient": req.recipient_email,
            "direction": 'outbound',
            "snippet": req.message[:100],
            "date": datetime.now().isoformat(),
            "body_html": req.message.replace('\n', '<br>'),
            "channel": 'email'
        }
        store_message(user_id, req.conversation_id, msg_data)
        
        return {"status": "success", "message_id": res_send.get('message_id')}
    except Exception as e:
        logger.error(f"Error sending email reply: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.get("/api/l/{slug}")
async def redirect_tracked_link(slug: str):
    """Redirige un link trackeado y registra el click"""
    try:
        admin = get_supabase_admin()
        
        # 1. Buscar el link original
        res = admin.table("link_tracking").select("*").eq("slug", slug).execute()
        
        if not res.data:
             return HTMLResponse(status_code=404, content="<h1>404 - Link Not Found</h1>")
            
        link_data = res.data[0]
        original_url = link_data['original_url']
        
        # 2. Incrementar contador de clicks
        admin.table("link_tracking").update({
            "clicks": link_data.get('clicks', 0) + 1,
            "last_click_at": datetime.now().isoformat()
        }).eq("slug", slug).execute()
        
        # 3. Redirigir
        return RedirectResponse(url=original_url)
    except Exception as e:
        logger.error(f"Error in redirector: {e}")
        return HTMLResponse(status_code=500, content="<h1>500 - Internal Server Error</h1>")

@router.post("/api/communications/link-tracking")
async def create_tracking_link(req: CreateLinkTrackingRequest, request: Request):
    """Crea un link trackeado manual"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    
    import secrets
    import string
    
    try:
        admin = get_supabase_admin()
        
        # Generar slug único
        slug = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        insert_data = {
            "user_id": user_id,
            "slug": slug,
            "original_url": req.original_url,
            "lead_id": req.lead_id,
            "conversation_id": req.conversation_id
        }
        
        admin.table("link_tracking").insert(insert_data).execute()
        
        # Construir URL pública
        api_url = os.getenv("API_URL", "http://localhost:8000")
        tracked_url = f"{api_url}/api/l/{slug}"
        
        return {"slug": slug, "tracked_url": tracked_url}
    except Exception as e:
        logger.error(f"Error creating link tracking: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.post("/api/ai/assistant")
async def chat_with_ai_assistant(req: AIAssistantRequest, request: Request):
    """Interactúa con el asistente de IA usando contexto de leads"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    
    try:
        from backend.ai_service import get_ai_assistant_response
        admin = get_supabase_admin()
        
        # 1. Traer contexto (Usuario / Leads recientes)
        user_res = admin.table("users").select("email, plan, credits").eq("id", user_id).single().execute()
        u = user_res.data or {}
        
        leads_res = admin.table("email_conversations")\
            .select("lead_name, lead_email, status, last_message_at, subject")\
            .eq("user_id", user_id)\
            .order("last_message_at", desc=True)\
            .limit(20)\
            .execute()
        
        context_data = f"DATOS DEL USUARIO ACTUAL (Tú): Email: {u.get('email')}, Plan: {u.get('plan')}, Créditos Disponibles: {u.get('credits')}/{u.get('monthly_credits')}\n\n"
        context_data += "Lista de 20 Conversaciones Recientes:\n"
        for l in (leads_res.data or []):
            context_data += f"- {l['lead_name']} ({l['lead_email']}): {l['status']}. Asunto: {l['subject']}. Última vez: {l['last_message_at']}\n"
            
        # 2. Obtener respuesta de Gemini
        response = get_ai_assistant_response(req.query, context_data)
        
        return {"response": response}
    except Exception as e:
        logger.error(f"Error in AI Assistant endpoint: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

# --- AI TRIGGERS ENGINE ---
@router.get("/api/automations/rules")
async def get_automation_rules(request: Request):
    """Obtiene las reglas de automatización del usuario"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    try:
        from backend.db_supabase import get_supabase_admin
        admin = get_supabase_admin()
        res = admin.table("automation_rules").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"Error fetching rules: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.post("/api/automations/rules")
async def create_automation_rule(req: AutomationRuleRequest, request: Request):
    """Crea una nueva regla de automatización"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    try:
        from backend.db_supabase import get_supabase_admin
        admin = get_supabase_admin()
        data = req.dict()
        data["user_id"] = user_id
        res = admin.table("automation_rules").insert(data).execute()
        return res.data[0]
    except Exception as e:
        logger.error(f"Error creating rule: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.put("/api/automations/rules/{rule_id}")
async def update_automation_rule(rule_id: str, req: AutomationRuleRequest, request: Request):
    """Actualiza una regla de automatización"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    try:
        from backend.db_supabase import get_supabase_admin
        admin = get_supabase_admin()
        data = req.dict()
        res = admin.table("automation_rules").update(data).eq("id", rule_id).eq("user_id", user_id).execute()
        # if res.data is empty it could throw IndexError but Supabase update returns updated row
        return res.data[0] if res.data else {"success": True}
    except Exception as e:
        logger.error(f"Error updating rule: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.delete("/api/automations/rules/{rule_id}")
async def delete_automation_rule(rule_id: str, request: Request):
    """Elimina una regla de automatización"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    try:
        from backend.db_supabase import get_supabase_admin
        admin = get_supabase_admin()
        admin.table("automation_rules").delete().eq("id", rule_id).eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting rule: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@router.get("/api/automations/logs")
async def get_automation_logs(request: Request):
    """Obtiene el historial de ejecuciones de reglas del usuario"""
    user_id = get_user_id_from_header(request)
    if not user_id: return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    try:
        from backend.db_supabase import get_supabase_admin
        admin = get_supabase_admin()
        # Try a join, but Supabase SDK joins require the foreign key to be explicitly set or valid
        # We'll just fetch flat logs to avoid GraphQL issues
        res = admin.table("automation_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
        return res.data
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

