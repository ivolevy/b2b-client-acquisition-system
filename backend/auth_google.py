import os
import json
import logging
from typing import Dict, Optional, List
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
from email.message import EmailMessage

logger = logging.getLogger(__name__)

# Configuración desde variables de entorno
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

# Permitir que los scopes cambien sin lanzar error (necesario si el usuario modifica permisos o google devuelve diferente orden)
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

# Scopes necesarios para enviar correos y ver el perfil
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
]

def get_google_auth_url(state: str) -> str:
    """Genera la URL para iniciar el flujo de OAuth"""
    if not CLIENT_ID or not CLIENT_SECRET:
        logger.error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET")
        raise ValueError("Google OAuth no está configurado en el servidor")

    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI]
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        state=state
    )
    flow.redirect_uri = REDIRECT_URI

    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    return auth_url

def exchange_code_for_token(code: str) -> Dict:
    """Intercambia el código de autorización por tokens"""
    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI]
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES
    )
    flow.redirect_uri = REDIRECT_URI
    flow.fetch_token(code=code)

    credentials = flow.credentials
    
    # Obtener el email del usuario para guardarlo
    service = build('oauth2', 'v2', credentials=credentials)
    user_info = service.userinfo().get().execute()
    
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
        "account_email": user_info.get("email")
    }

def get_gmail_service(token_data: Dict):
    """Obtiene el servicio de Gmail API, refrescando el token si es necesario"""
    creds = Credentials(
        token=token_data.get('access_token'),
        refresh_token=token_data.get('refresh_token'),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=SCOPES
    )

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Aquí se debería guardar el nuevo token en la DB
            # Lo manejaremos en el llamador para actualizar si cambió
            return build('gmail', 'v1', credentials=creds), creds
    
    return build('gmail', 'v1', credentials=creds), None

def send_gmail_api(token_data: Dict, to: str, subject: str, body_html: str):
    """Envía un email usando la Gmail API"""
    service, new_creds = get_gmail_service(token_data)
    
    message = EmailMessage()
    message.set_content("Para ver este mensaje, por favor usa un lector compatible con HTML.")
    message.add_alternative(body_html, subtype='html')
    
    message['To'] = to
    message['From'] = token_data.get('account_email')
    message['Subject'] = subject
    
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
