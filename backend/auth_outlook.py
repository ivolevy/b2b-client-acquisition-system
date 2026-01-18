import os
import logging
import requests
import time
from typing import Dict, Optional, List, Tuple
from msal import ConfidentialClientApplication

logger = logging.getLogger(__name__)

# Configuración desde variables de entorno
CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID")
CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET")
REDIRECT_URI = os.getenv("OUTLOOK_REDIRECT_URI", "http://localhost:8000/auth/outlook/callback")

# Si faltan credenciales, activamos MOCK_MODE
MOCK_MODE = not (CLIENT_ID and CLIENT_SECRET)

if MOCK_MODE:
    logger.warning("⚠️  OUTLOOK AUTH EN MODO MOCK: Credenciales no encontradas. Se simulará la conexión.")

AUTHORITY = "https://login.microsoftonline.com/common"
SCOPES = ["User.Read", "Mail.Send", "offline_access"]

def get_msal_app():
    """Crea una instancia de la aplicación MSAL"""
    if MOCK_MODE:
        return None
        
    return ConfidentialClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET,
    )

def get_outlook_auth_url(state: str) -> str:
    """Genera la URL para iniciar el flujo de OAuth con Microsoft"""
    if MOCK_MODE:
        # Retorna una URL que redirige directamente al callback local con un código falso
        # Simulamos que Microsoft nos redirigió de vuelta
        logger.info(f"Generando URL Mock para usuario {state}")
        # El frontend esperará una URL externa, pero le damos la de nuestro propio backend callback
        # O mejor, redirigimos al frontend directamente simulando ser Microsoft
        # Pero el flujo espera URL -> User Click -> Microsoft -> Backend Callback.
        # Para simplificar, hacemos que el usuario vaya a un endpoint nuestro que redirija al callback.
        # O simplemente devolvemos el callback url con los params.
        
        # Estrategia: Devolver el link directo a nuestro backend callback
        # Así cuando el usuario haga click, "viajará" al backend y este procesará el "código"
        return f"{REDIRECT_URI}?code=MOCK_CODE_12345&state={state}"

    app = get_msal_app()
    if not app:
        raise ValueError("Outlook OAuth no está configurado")

    auth_url = app.get_authorization_request_url(
        SCOPES,
        state=state,
        redirect_uri=REDIRECT_URI
    )
    return auth_url

def exchange_code_for_token(code: str) -> Dict:
    """Intercambia el código de autorización por tokens"""
    if MOCK_MODE or code == "MOCK_CODE_12345":
        logger.info("Intercambiando código MOCK por tokens falsos")
        return {
            "access_token": "mock_access_token_" + str(int(time.time())),
            "refresh_token": "mock_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scopes": SCOPES,
            "account_email": "usuario@ejemplo-outlook.com",
            "id_token_claims": {"name": "Usuario Mock Outlook", "email": "usuario@ejemplo-outlook.com"}
        }

    app = get_msal_app()
    if not app:
        raise ValueError("Outlook OAuth no está configurado")

    result = app.acquire_token_by_authorization_code(
        code,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

    if "error" in result:
        logger.error(f"Error obteniendo token Outlook: {result.get('error_description')}")
        raise Exception(result.get("error_description"))

    # Extraer información del usuario del ID Token claims si está disponible
    account = result.get("id_token_claims", {})
    email = account.get("preferred_username") or account.get("email")

    return {
        "access_token": result.get("access_token"),
        "refresh_token": result.get("refresh_token"),
        "expires_in": result.get("expires_in"),
        "token_type": result.get("token_type"),
        "scopes": result.get("scope"),
        "account_email": email,
        "id_token_claims": account
    }

def refresh_outlook_token(refresh_token: str) -> Dict:
    """Refresca el token de acceso"""
    if MOCK_MODE or refresh_token == "mock_refresh_token":
        logger.info("Refrescando token MOCK")
        return {
            "access_token": "mock_access_token_refreshed_" + str(int(time.time())),
            "refresh_token": "mock_refresh_token",
            "expires_in": 3600,
            "account_email": "usuario@ejemplo-outlook.com"
        }

    app = get_msal_app()
    if not app:
        return None

    result = app.acquire_token_by_refresh_token(
        refresh_token,
        scopes=SCOPES
    )
    
    if "error" in result:
        logger.error(f"Error refrescando token Outlook: {result.get('error')}")
        return None
        
    return {
        "access_token": result.get("access_token"),
        "refresh_token": result.get("refresh_token"),
        "expires_in": result.get("expires_in"),
        "account_email": result.get("id_token_claims", {}).get("preferred_username")
    }

def send_outlook_email(token_data: Dict, to: str, subject: str, body_html: str) -> Tuple[bool, Optional[Dict]]:
    """
    Envía un email usando Microsoft Graph API o Mock.
    Retorna (success, new_token_data_if_refreshed)
    """
    access_token = token_data.get("access_token")
    
    if MOCK_MODE or (access_token and access_token.startswith("mock_")):
        logger.info(f"📧 [MOCK OUTLOOK] Enviando email a: {to}")
        logger.info(f"   Asunto: {subject}")
        # Simulamos éxito inmediato
        return True, None

    if not access_token:
        return False, None

    # Implementación real
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    email_msg = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": body_html
            },
            "toRecipients": [{"emailAddress": {"address": to}}]
        },
        "saveToSentItems": "true"
    }

    try:
        response = requests.post(
            "https://graph.microsoft.com/v1.0/me/sendMail",
            headers=headers,
            json=email_msg
        )
        
        if response.status_code == 202:
            return True, None
            
        if response.status_code == 401 and token_data.get("refresh_token"):
            logger.info("Token Outlook expirado, intentando refrescar...")
            new_tokens = refresh_outlook_token(token_data.get("refresh_token"))
            if new_tokens:
                headers["Authorization"] = f"Bearer {new_tokens['access_token']}"
                response_retry = requests.post(
                    "https://graph.microsoft.com/v1.0/me/sendMail",
                    headers=headers,
                    json=email_msg
                )
                if response_retry.status_code == 202:
                    updated_token_data = {**token_data, **new_tokens}
                    return True, updated_token_data
            
        logger.error(f"Error enviando outlook: {response.status_code} - {response.text}")
        return False, None

    except Exception as e:
        logger.error(f"Excepción enviando outlook: {e}")
        return False, None
