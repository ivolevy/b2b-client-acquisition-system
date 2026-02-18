import logging
import base64
from datetime import datetime
from typing import Dict, List, Optional
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import requests

from backend.db_supabase import get_supabase_admin
from backend.auth_google import CLIENT_ID, CLIENT_SECRET, SCOPES as GOOGLE_SCOPES
from backend.auth_outlook import GRAPH_API_ENDPOINT

logger = logging.getLogger(__name__)

# --- GOOGLE SYNC LOGIC ---

def get_gmail_service_for_sync(token_data: Dict):
    """Obtiene servicio Gmail con credenciales actualizadas"""
    creds = Credentials(
        token=token_data.get('access_token'),
        refresh_token=token_data.get('refresh_token'),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=GOOGLE_SCOPES
    )

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # TODO: Actualizar token en DB
    
    return build('gmail', 'v1', credentials=creds, static_discovery=False)

def sync_gmail_account(user_id: str, token_data: Dict):
    """Sincroniza correos recientes de Gmail"""
    try:
        service = get_gmail_service_for_sync(token_data)
        
        # Buscar mensajes de los últimos 7 días (ajustable)
        # query = 'newer_than:7d' 
        # Para MVP: Traer últimos 10 mensajes
        results = service.users().messages().list(userId='me', maxResults=10).execute()
        messages = results.get('messages', [])

        if not messages:
            logger.info(f"No hay mensajes nuevos en Gmail para usuario {user_id}")
            return

        for msg in messages:
            try:
                msg_detail = service.users().messages().get(userId='me', id=msg['id']).execute()
                process_gmail_message(user_id, msg_detail)
            except Exception as e:
                logger.error(f"Error procesando mensaje Gmail {msg['id']}: {e}")

    except Exception as e:
        logger.error(f"Error general sync Gmail para usuario {user_id}: {e}")

def sync_outlook_account(user_id: str, token_data: Dict):
    """Sincroniza correos recientes de Outlook (Microsoft Graph)"""
    try:
        access_token = token_data.get('access_token')
        account_email = token_data.get('account_email', '')
        
        if not account_email:
            # Si no viene en el token, intentar obtenerlo del perfil guardado
            from backend.db_supabase import obtener_perfil_usuario
            profile = obtener_perfil_usuario(user_id)
            account_email = profile.get('email', '') if profile else ''

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Traer los últimos 20 mensajes
        response = requests.get(
            f"{GRAPH_API_ENDPOINT}/me/messages?$top=20&$select=subject,sender,toRecipients,internetMessageId,bodyPreview,receivedDateTime,body",
            headers=headers
        )
        
        if response.status_code == 401:
            logger.warning(f"Token Outlook potencialmente expirado para usuario {user_id}")
            return

        if response.status_code != 200:
            logger.error(f"Error fetching Outlook messages: {response.text}")
            return

        messages = response.json().get('value', [])
        for msg in messages:
            try:
                process_outlook_message(user_id, msg, account_email)
            except Exception as e:
                logger.error(f"Error procesando mensaje Outlook individual: {e}")

    except Exception as e:
        logger.error(f"Error general sync Outlook para usuario {user_id}: {e}")


def get_or_create_conversation(user_id: str, lead_email: str, subject: str, lead_name: str = None, channel: str = 'email', lead_phone: str = None, initial_status: str = 'open') -> str:
    """Busca una conversación existente o crea una nueva"""
    admin = get_supabase_admin()
    
    # 1. Buscar conversación con ese lead y canal
    res = admin.table("email_conversations")\
        .select("id")\
        .eq("user_id", user_id)\
        .eq("lead_email", lead_email)\
        .eq("channel", channel)\
        .execute()
        
    if res.data:
        return res.data[0]['id']
        
    # 2. Si no existe, crear nueva
    new_conv = {
        "user_id": user_id,
        "lead_email": lead_email,
        "lead_name": lead_name or lead_email.split('@')[0],
        "subject": subject,
        "status": initial_status,
        "channel": channel,
        "lead_phone": lead_phone,
        "last_message_at": datetime.now().isoformat()
    }
    res_create = admin.table("email_conversations").insert(new_conv).execute()
    if res_create.data:
        return res_create.data[0]['id']
    return None

def store_message(user_id: str, conversation_id: str, msg_data: Dict):
    """Guarda el mensaje en la DB"""
    admin = get_supabase_admin()
    
    # Verificar si ya existe el mensaje (idempotencia)
    external_id = msg_data.get('external_id')
    if external_id:
        existing = admin.table("email_messages").select("id").eq("external_id", external_id).execute()
        if existing.data:
            return # Ya existe
            
    msg_record = {
        "conversation_id": conversation_id,
        "external_id": external_id,
        "sender_email": msg_data.get('sender'),
        "recipient_email": msg_data.get('recipient'),
        "direction": msg_data.get('direction'),
        "body_text": msg_data.get('snippet'),
        "body_html": msg_data.get('body_html'),
        "sent_at": msg_data.get('date'),
        "channel": msg_data.get('channel', 'email'),
        "is_read": False if msg_data.get('direction') == 'inbound' else True
    }
    
    admin.table("email_messages").insert(msg_record).execute()
    
    # Determinar nuevo estado base de la conversación
    # Obtenemos el estado actual para evitar "downgrades" (ej: de interested a waiting_reply)
    current_status = 'open'
    try:
        conv_res = admin.table("email_conversations").select("status").eq("id", conversation_id).execute()
        if conv_res.data:
            current_status = conv_res.data[0]['status']
    except:
        pass

    # Lógica de transición
    new_status = current_status
    if msg_data.get('direction') == 'outbound':
        if not str(external_id).startswith('hist_'):
            # Si respondo manualmente, pasa a 'waiting_reply'
            new_status = 'waiting_reply'
    else:
        # Si entra mensaje (inbound), por defecto lo marcamos para revisión
        # pero si ya estaba en 'interested', lo dejamos ahí para que no "vuelva atrás"
        if current_status != 'interested':
            new_status = 'waiting_reply'

    # Actualizar timestamp y estado
    update_data = {
        "last_message_at": msg_data.get('date') or datetime.now().isoformat(),
        "status": new_status,
        "unread_count": 0 if msg_data.get('direction') == 'outbound' else 1
    }
    
    # --- IA ANALYSIS (Solo para Inbound) ---
    if msg_data.get('direction') == 'inbound':
        try:
            from backend.ai_service import analyze_conversation_intent
            
            thread_res = admin.table("email_messages")\
                .select("body_text, direction")\
                .eq("conversation_id", conversation_id)\
                .order("sent_at", desc=True)\
                .limit(5)\
                .execute()
            
            if thread_res.data:
                ai_result = analyze_conversation_intent(thread_res.data[::-1])
                if ai_result and ai_result.get('status'):
                    ai_status = ai_result['status']
                    # Lógica de persistencia de interés:
                    # Si ya era 'interested', solo permitimos cambiar a 'not_interested' (si perdió interés)
                    if current_status == 'interested':
                        if ai_status == 'not_interested':
                            update_data["status"] = 'not_interested'
                        # De lo contrario, se queda en 'interested'
                    else:
                        update_data["status"] = ai_status
                        
                    logger.info(f"AI classified lead as: {update_data['status']}")
        except Exception as ai_err:
            logger.error(f"Error in AI analysis trigger: {ai_err}")

    admin.table("email_conversations").update(update_data).eq("id", conversation_id).execute()

def process_gmail_message(user_id: str, msg_detail: Dict, user_email: str):
    """Procesa un mensaje individual de Gmail y lo guarda en DB"""
    headers = {h['name'].lower(): h['value'] for h in msg_detail['payload']['headers']}
    
    subject = headers.get('subject', '(Sin Asunto)')
    sender = headers.get('from', '')
    recipient = headers.get('to', '')
    msg_id = headers.get('message-id', '')
    date_str = headers.get('date', '') # TODO: Parsear fecha correctamente
    
    # Extraer email limpio de "Nombre <email@domain.com>"
    sender_email = sender
    if '<' in sender:
        sender_email = sender.split('<')[1].split('>')[0]
        
    # Determinar dirección
    direction = 'outbound' if user_email in sender_email else 'inbound'
    lead_email = recipient if direction == 'outbound' else sender_email
    
    # Lógica de Threading Simple (Por Subject/Lead)
    # En un sistema real usaríamos In-Reply-To y References
    conversation_id = get_or_create_conversation(user_id, lead_email, subject)
    
    if conversation_id:
        msg_data = {
            "external_id": msg_id,
            "sender": sender_email,
            "recipient": recipient,
            "direction": direction,
            "snippet": msg_detail.get('snippet', ''),
            "date": datetime.now().isoformat(), # Simplificado para MVP
            "body_html": msg_detail.get('snippet', '') # Placeholder
        }
        store_message(user_id, conversation_id, msg_data)
        logger.info(f"Guardado mensaje Gmail: {subject} ({direction})")

def process_outlook_message(user_id: str, msg: Dict, user_email: str):
    """Procesa un mensaje individual de Outlook"""
    subject = msg.get('subject') or "(Sin Asunto)"
    sender = msg.get('sender', {}).get('emailAddress', {}).get('address')
    
    # Manejar caso de destinatarios múltiples o vacíos
    recipients = msg.get('toRecipients', [])
    recipient = recipients[0].get('emailAddress', {}).get('address') if recipients else ''
    
    if not sender or not recipient:
        logger.warning(f"Mensaje Outlook con remitente o destinatario incompleto")
        return

    id_externo = msg.get('internetMessageId')
    body_preview = msg.get('bodyPreview') or ""
    
    direction = 'outbound' if user_email.lower() == sender.lower() else 'inbound'
    lead_email = recipient if direction == 'outbound' else sender
    
    # Buscar o crear conversación con estado inicial open
    conversation_id = get_or_create_conversation(user_id, lead_email, subject, initial_status='open')
    
    if conversation_id:
        msg_data = {
            "external_id": id_externo,
            "sender": sender,
            "recipient": recipient,
            "direction": direction,
            "snippet": body_preview,
            "date": msg.get('receivedDateTime'),
            "body_html": body_preview # Placeholder
        }
        store_message(user_id, conversation_id, msg_data)
        logger.info(f"Guardado mensaje Outlook: {subject} ({direction})")

