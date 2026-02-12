import os
import requests
import urllib.parse
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID")
CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET")
REDIRECT_URI = os.getenv("OUTLOOK_REDIRECT_URI")

# Microsoft Graph API Endpoints
AUTHORITY = "https://login.microsoftonline.com/common"
AUTHORIZE_ENDPOINT = f"{AUTHORITY}/oauth2/v2.0/authorize"
TOKEN_ENDPOINT = f"{AUTHORITY}/oauth2/v2.0/token"
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"

# Scopes needed for sending email, reading profile, and reading mail (Tracking)
SCOPES = ["User.Read", "Mail.Send", "Mail.Read", "offline_access"]

def get_outlook_auth_url(state: str = "") -> str:
    """Genera la URL de autorización para Outlook"""
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "response_mode": "query",
        "scope": " ".join(SCOPES),
        "state": state
    }
    qs = urllib.parse.urlencode(params)
    return f"{AUTHORIZE_ENDPOINT}?{qs}"

def exchange_code_for_token(code: str) -> Dict[str, Any]:
    """Intercambia el código de autorización por tokens"""
    data = {
        "client_id": CLIENT_ID,
        "scope": " ".join(SCOPES),
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
        "client_secret": CLIENT_SECRET,
    }
    
    response = requests.post(TOKEN_ENDPOINT, data=data)
    if response.status_code != 200:
        return {"error": response.text}
        
    return response.json()

def refresh_outlook_token(refresh_token: str) -> Dict[str, Any]:
    """Renueva el access token usando el refresh token"""
    data = {
        "client_id": CLIENT_ID,
        "scope": " ".join(SCOPES),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
        "client_secret": CLIENT_SECRET,
    }
    
    response = requests.post(TOKEN_ENDPOINT, data=data)
    if response.status_code != 200:
        return {"error": response.text}
        
    return response.json()

def get_user_profile(access_token: str) -> Dict[str, Any]:
    """Obtiene el perfil del usuario (email, nombre)"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    response = requests.get(f"{GRAPH_API_ENDPOINT}/me", headers=headers)
    if response.status_code != 200:
        return {"error": response.text}
        
    return response.json()

def send_outlook_email(
    access_token: str, 
    to_email: str, 
    subject: str, 
    body_html: str, 
    from_email: Optional[str] = None,
    attachments: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """Envía un correo usando Microsoft Graph API"""
    
    # Construir el mensaje base
    msg_payload = {
        "subject": subject,
        "body": {
            "contentType": "HTML",
            "content": body_html
        },
        "toRecipients": [
            {
                "emailAddress": {
                    "address": to_email
                }
            }
        ]
    }

    # Procesar adjuntos
    if attachments:
        formatted_attachments = []
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
                    formatted_attachments.append({
                        "@odata.type": "#microsoft.graph.fileAttachment",
                        "name": filename,
                        "contentBytes": content_b64,
                        "contentType": content_type or "application/octet-stream"
                    })
            except Exception as e:
                pass # Ignorar adjuntos mal formados

        if formatted_attachments:
            msg_payload["attachments"] = formatted_attachments

    message = {
        "message": msg_payload,
        "saveToSentItems": "true"
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{GRAPH_API_ENDPOINT}/me/sendMail",
        headers=headers,
        json=message
    )
    
    if response.status_code == 202:
        return {"success": True, "message": "Email enviado (Accepted)"}
    elif response.status_code == 200: 
        return {"success": True, "message": "Email enviado (OK)"}
    else:
        return {"success": False, "error": response.text}
