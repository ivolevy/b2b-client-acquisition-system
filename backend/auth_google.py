import os
import json
import logging
from typing import Dict, Optional, List, Any
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
from email.message import EmailMessage

logger = logging.getLogger(__name__)

import urllib.parse
from datetime import datetime, timedelta

def get_credentials():
    raw_client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("VITE_GOOGLE_CLIENT_ID") or ""
    raw_client_secret = os.getenv("GOOGLE_CLIENT_SECRET") or ""
    raw_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or "https://b2b-client-acquisition-system-hlll.vercel.app/auth/google/callback"
    
    # Strict character whitelisting to eliminate any hidden \n, \r, %0A, or control chars from Vercel env vars
    client_id = "".join(c for c in urllib.parse.unquote(raw_client_id) if c.isalnum() or c in '-._')
    client_secret = "".join(c for c in urllib.parse.unquote(raw_client_secret) if c.isalnum() or c in '-._')
    redirect_uri = "".join(c for c in urllib.parse.unquote(raw_redirect_uri) if c.isalnum() or c in ':-_./')
    
    if not redirect_uri:
        redirect_uri = "https://b2b-client-acquisition-system-hlll.vercel.app/auth/google/callback"
        
    return client_id, client_secret, redirect_uri

# Permitir que los scopes cambien sin lanzar error (necesario si el usuario modifica permisos o google devuelve diferente orden)
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

# Scopes necesarios para enviar correos y ver el perfil, y leer para tracking
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly', # Scope para leer emails (Tracking)
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
]

import requests

def get_google_auth_url(state: str) -> str:
    """Genera la URL para iniciar el flujo de OAuth de forma stateless"""
    client_id, client_secret, redirect_uri = get_credentials()
    if not client_id or not client_secret:
        logger.error(f"Faltan credenciales: CLIENT_ID={bool(client_id)}, CLIENT_SECRET={bool(client_secret)}")
        raise ValueError("Google OAuth no está configurado en las variables de entorno del servidor.")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    return f"https://accounts.google.com/o/oauth2/auth?{urllib.parse.urlencode(params)}"

def exchange_code_for_token(code: str) -> Dict:
    """Intercambia el código de autorización por tokens sin requerir PKCE"""
    client_id, client_secret, redirect_uri = get_credentials()
    
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri
    }
    
    response = requests.post("https://oauth2.googleapis.com/token", data=data)
    if response.status_code != 200:
        logger.error(f"Error intercambiando código Google: {response.text}")
        raise ValueError(f"Error intercambiando código: {response.text}")
        
    token_data = response.json()
    
    # Obtener el email del usuario para guardarlo
    creds = Credentials(token=token_data['access_token'])
    service = build('oauth2', 'v2', credentials=creds, static_discovery=False)
    user_info = service.userinfo().get().execute()
    
    return {
        "access_token": token_data['access_token'],
        "refresh_token": token_data.get('refresh_token'),
        "expiry": (datetime.now() + timedelta(seconds=token_data.get('expires_in', 3600))).isoformat(),
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": client_id,
        "client_secret": client_secret,
        "scopes": SCOPES,
        "account_email": user_info.get("email")
    }

def get_gmail_service(token_data: Dict):
    """Obtiene el servicio de Gmail API, refrescando el token si es necesario"""
    client_id, client_secret, _ = get_credentials()
    creds = Credentials(
        token=token_data.get('access_token'),
        refresh_token=token_data.get('refresh_token'),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES
    )

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Aquí se debería guardar el nuevo token en la DB
            # Lo manejaremos en el llamador para actualizar si cambió
            return build('gmail', 'v1', credentials=creds, static_discovery=False), creds
    
    return build('gmail', 'v1', credentials=creds, static_discovery=False), None

def send_gmail_api(token_data: Dict, to: str, subject: str, body_html: str, attachments: Optional[List[Any]] = None):
    """Envía un email usando la Gmail API"""
    service, new_creds = get_gmail_service(token_data)
    
    message = EmailMessage()
    message.set_content("Para ver este mensaje, por favor usa un lector compatible con HTML.")
    message.add_alternative(body_html, subtype='html')
    
    message['To'] = to
    message['From'] = token_data.get('account_email')
    message['Subject'] = subject
    
    # Procesar adjuntos
    if attachments:
        for attachment in attachments:
            try:
                # Soporte para dicts u objetos (Pydantic)
                if isinstance(attachment, dict):
                    filename = attachment.get('filename')
                    content_b64 = attachment.get('content_base64')
                    content_type = attachment.get('content_type')
                else:
                    filename = getattr(attachment, 'filename', None)
                    content_b64 = getattr(attachment, 'content_base64', None)
                    content_type = getattr(attachment, 'content_type', None)

                if filename and content_b64:
                    file_data = base64.b64decode(content_b64)
                    
                    # Determinar tipo MIME
                    maintype, subtype = 'application', 'octet-stream'
                    if content_type and '/' in content_type:
                        maintype, subtype = content_type.split('/', 1)
                    
                    message.add_attachment(
                        file_data,
                        maintype=maintype,
                        subtype=subtype,
                        filename=filename
                    )
            except Exception as e:
                logger.error(f"Error agregando adjunto {getattr(attachment, 'filename', 'desconocido')}: {e}")

    # Codificar mensaje en base64url
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    create_message = {'raw': raw_message}
    
    try:
        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        logger.info(f'Email enviado vía Gmail API: {send_message["id"]}')
        return True, new_creds
    except Exception as error:
        logger.error(f'Error enviando vía Gmail API: {error}')
        return False, None
