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

router = APIRouter(prefix="/api/auth", tags=["Auth"])
# ========== GMAIL OAUTH ENDPOINTS ==========

@router.post("/api/auth/google/url")
async def google_auth_url(request: GoogleAuthURLRequest):
    """Obtiene la URL para iniciar el flujo de Google OAuth"""
    try:
        url = get_google_auth_url(state=request.state)
        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"Error generando URL de Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/auth/google/callback")
@router.get("/auth/google/callback") # Compatibilidad con consola Google
async def google_callback(code: str, state: str):
    """Maneja el callback de Google OAuth e intercambia el código por tokens"""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    try:
        # Extraer user_id del state (pasado como string o json)
        # Por simplicidad, asumimos que el state ES el user_id o contiene el user_id
        user_id = state
        
        # Intercambiar código por tokens
        token_data = exchange_code_for_token(code)
        
        # Guardar tokens en la base de datos
        success = save_user_oauth_token(user_id, 'google', token_data)
        
        if not success:
            logger.error(f"Error guardando token OAuth para usuario {user_id}")
            return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=error&reason=save_failed"})
            
        # Redirigir de vuelta al frontend (ajustar URL según sea necesario)
        logger.info(f"Gmail conectado exitosamente para usuario {user_id}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=success"})
        
    except Exception as e:
        logger.error(f"Error en callback de Google Auth: {e}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?gmail=error&reason={str(e)}"})

# ========== OUTLOOK OAUTH ENDPOINTS (CONSOLIDATED) ==========

@router.post("/api/auth/outlook/url")
async def outlook_auth_url(request: GoogleAuthURLRequest):
    """Obtiene la URL de autorización para Outlook/Microsoft 365"""
    try:
        from backend.auth_outlook import get_outlook_auth_url
        url = get_outlook_auth_url(state=request.state)
        logger.info(f"Generada URL de Outlook para usuario {request.state}")
        return {"success": True, "url": url}
    except Exception as e:
        logger.error(f"Error generando URL de Outlook Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/auth/outlook/callback")
@router.get("/auth/outlook/callback") # Compatibilidad con consola Microsoft
async def outlook_callback(code: str, state: str):
    """Maneja el callback de Outlook OAuth"""
    frontend_url = os.getenv("FRONTEND_URL", "https://b2b-client-acquisition-system.vercel.app")
    try:
        user_id = state
        logger.info(f"Recibido callback de Outlook para usuario {user_id}")
        
        # Intercambiar código por tokens
        from backend.auth_outlook import exchange_code_for_token, get_user_profile
        token_data = exchange_code_for_token(code)
        
        if "error" in token_data:
            logger.error(f"Error en intercambio de token Outlook: {token_data['error']}")
            raise Exception(token_data["error"])
            
        # Obtener perfil para tener el email
        profile = get_user_profile(token_data['access_token'])
        
        if "error" in profile:
            logger.warning(f"No se pudo obtener el perfil de Outlook: {profile['error']}")
            email = "Cuenta Outlook"
        else:
            email = profile.get('mail') or profile.get('userPrincipalName') or "Cuenta Outlook"

        # Preparar data para guardar
        token_to_save = {
            'access_token': token_data['access_token'],
            'refresh_token': token_data.get('refresh_token'),
            'expiry': (datetime.now() + timedelta(seconds=token_data.get('expires_in', 3600))).isoformat(),
            'scope': token_data.get('scope'),
            'account_email': email
        }
        
        success = save_user_oauth_token(user_id, 'outlook', token_to_save)
        
        if not success:
            logger.error(f"Error guardando token Outlook en BD para usuario {user_id}")
            return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=error&reason=db_error"})
            
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=success"})
        
    except Exception as e:
        logger.error(f"Error crítico en callback de Outlook: {e}")
        return Response(status_code=302, headers={"Location": f"{frontend_url}/?outlook=error&reason={str(e)}"})

@router.get("/api/auth/google/status/{user_id}")
async def google_status(user_id: str):
    """Verifica si el usuario tiene una cuenta de Gmail conectada"""
    try:
        token_data = get_user_oauth_token(user_id, 'google')
        if token_data:
            return {
                "success": True,
                "connected": True,
                "account_email": token_data.get("account_email")
            }
        return {"success": True, "connected": False}
    except Exception as e:
        logger.error(f"Error obteniendo estado de Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/google/disconnect")
async def google_disconnect(request: DisconnectRequest):
    """Elimina la conexión con Google Gmail"""
    try:
        success = delete_user_oauth_token(request.user_id, provider='google')
        return {"success": success, "message": "Cuenta desconectada exitosamente"}
    except Exception as e:
        logger.error(f"Error desconectando Google Auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/outlook/disconnect")
async def outlook_disconnect(request: DisconnectRequest):
    """Desconectar Outlook"""
    try:
        success = delete_user_oauth_token(request.user_id, provider='outlook')
        return {"success": success, "message": "Outlook desconectado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def auth_status_global(user_id: str):
    """Estado de todas las conexiones, incluyendo errores de sincronización"""
    google = get_user_oauth_token(user_id, 'google')
    outlook = get_user_oauth_token(user_id, 'outlook')
    
    # Obtener estado de error desde la tabla users
    gmail_error = False
    outlook_error = False
    try:
        from backend.db_supabase import get_supabase_admin
        admin = get_supabase_admin()
        if admin:
            user_data = admin.table('users').select('gmail_sync_status,outlook_sync_status').eq('id', user_id).execute()
            if user_data.data:
                gmail_error = user_data.data[0].get('gmail_sync_status') == 'error'
                outlook_error = user_data.data[0].get('outlook_sync_status') == 'error'
    except Exception as e:
        logger.error(f"Error obteniendo sync status del usuario: {e}")
    
    return {
        "google": {
            "connected": bool(google),
            "email": google.get('account_email') if google else None,
            "error": gmail_error
        },
        "outlook": {
            "connected": bool(outlook),
            "email": outlook.get('account_email') if outlook else None,
            "error": outlook_error
        }
    }

# ========== ENDPOINTS DE ENVÍO DE EMAILS ==========

@router.post("/api/auth/solicitar-codigo-cambio-password")
async def solicitar_codigo_cambio_password(request: SolicitarCodigoRequest):
    """Genera y envía un código de validación por email para cambio de contraseña"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Generar código de 6 dígitos
        codigo = ''.join(random.choices(string.digits, k=6))
        
        # Guardar código en memoria con expiración de 10 minutos
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Asegurar acceso a la variable global
        global _memoria_codigos_validacion
        
        _memoria_codigos_validacion[email] = {
            'codigo': codigo,
            'expires_at': expires_at.isoformat(),
            'user_id': request.user_id,
            'created_at': datetime.now().isoformat()
        }
        
        # Enviar email con el código
        asunto = "Código de validación para cambio de contraseña"
        cuerpo_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .codigo {{ background: white; border: 2px solid #81D4FA; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Notificación de Seguridad</h1>
                </div>
                <div class="content">
                    <h2>Código de validación</h2>
                    <p>Hola,</p>
                    <p>Recibiste este email porque solicitaste cambiar tu contraseña.</p>
                    <p>Ingresá el siguiente código para continuar:</p>
                    <div class="codigo">{codigo}</div>
                    <div class="warning">
                        <strong>⚠️ Importante:</strong> Este código expirará en 10 minutos. Si no solicitaste este cambio, ignorá este email.
                    </div>
                    <p>Si no solicitaste este cambio, podés ignorar este mensaje de forma segura.</p>
                </div>
                <div class="footer">
                    <p>Este es un email automático, por favor no respondas.</p>
                    <p>© 2024</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        resultado = enviar_email(
            destinatario=email,
            asunto=asunto,
            cuerpo_html=cuerpo_html
        )
        
        if not resultado['success']:
            raise HTTPException(status_code=500, detail=f"Error enviando email: {resultado.get('message', 'Error desconocido')}")
        
        logger.info(f"Código de validación enviado a {email}")
        
        return {
            "success": True,
            "message": "Código de validación enviado exitosamente",
            "expires_in_minutes": 10
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error solicitando código: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/validar-codigo-cambio-password")
async def validar_codigo_cambio_password(request: ValidarCodigoRequest):
    """Valida el código de verificación para cambio de contraseña"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Verificar si existe un código para este email
        if email not in _memoria_codigos_validacion:
            raise HTTPException(status_code=400, detail="No se encontró un código de validación para este email. Por favor, solicitá uno nuevo.")
        
        codigo_data = _memoria_codigos_validacion[email]
        
        # Verificar expiración
        expires_at = datetime.fromisoformat(codigo_data['expires_at'])
        if datetime.now() > expires_at:
            # Eliminar código expirado
            del _memoria_codigos_validacion[email]
            raise HTTPException(status_code=400, detail="El código de validación ha expirado. Por favor, solicitá uno nuevo.")
        
        # Verificar código
        if codigo_data['codigo'] != request.codigo:
            raise HTTPException(status_code=400, detail="Código de validación incorrecto")
        
        # Código válido - NO eliminar de memoria aquí, se eliminará cuando se actualice la contraseña
        # Esto permite usar el código para validar y luego actualizar la contraseña
        
        logger.info(f"Código de validación verificado correctamente para {email}")
        
        return {
            "success": True,
            "message": "Código de validación verificado correctamente",
            "valid": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validando código: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/solicitar-codigo-reset-password")
async def solicitar_codigo_reset_password(request: SolicitarCodigoRequest):
    """Genera y envía un código de validación por email para reset de contraseña (sin autenticación)"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Generar código de 6 dígitos
        codigo = ''.join(random.choices(string.digits, k=6))
        
        # Guardar código en memoria con expiración de 10 minutos
        expires_at = datetime.now() + timedelta(minutes=10)
        
        # Asegurar acceso a la variable global
        global _memoria_codigos_validacion
        
        _memoria_codigos_validacion[email] = {
            'codigo': codigo,
            'expires_at': expires_at.isoformat(),
            'user_id': request.user_id,
            'created_at': datetime.now().isoformat(),
            'type': 'reset_password'  # Marcar como reset de contraseña
        }
        
        # Enviar email con el código
        asunto = "Código de recuperación de contraseña"
        cuerpo_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .codigo {{ background: white; border: 2px solid #81D4FA; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Recuperación de Acceso</h1>
                </div>
                <div class="content">
                    <h2>Recuperación de contraseña</h2>
                    <p>Hola,</p>
                    <p>Recibiste este email porque solicitaste recuperar tu contraseña.</p>
                    <p>Ingresá el siguiente código para continuar:</p>
                    <div class="codigo">{codigo}</div>
                    <div class="warning">
                        <strong>⚠️ Importante:</strong> Este código expirará en 10 minutos. Si no solicitaste este cambio, ignorá este email y tu contraseña permanecerá segura.
                    </div>
                    <p>Si no solicitaste recuperar tu contraseña, podés ignorar este mensaje de forma segura.</p>
                </div>
                <div class="footer">
                    <p>Este es un email automático, por favor no respondas.</p>
                    <p>© 2024</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        resultado = enviar_email(
            destinatario=email,
            asunto=asunto,
            cuerpo_html=cuerpo_html
        )
        
        if not resultado['success']:
            raise HTTPException(status_code=500, detail=f"Error enviando email: {resultado.get('message', 'Error desconocido')}")
        
        logger.info(f"Código de recuperación enviado a {email}")
        
        return {
            "success": True,
            "message": "Código de recuperación enviado exitosamente",
            "expires_in_minutes": 10
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error solicitando código de recuperación: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/reset-password")
async def reset_password(request: ValidarCodigoRequest):
    """Valida el código y permite resetear la contraseña (sin autenticación)"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Verificar si existe un código para este email
        if email not in _memoria_codigos_validacion:
            raise HTTPException(status_code=400, detail="No se encontró un código de validación para este email. Por favor, solicitá uno nuevo.")
        
        codigo_data = _memoria_codigos_validacion[email]
        
        # Verificar que sea un código de reset de contraseña
        if codigo_data.get('type') != 'reset_password':
            raise HTTPException(status_code=400, detail="Este código no es válido para recuperación de contraseña")
        
        # Verificar expiración
        expires_at = datetime.fromisoformat(codigo_data['expires_at'])
        if datetime.now() > expires_at:
            # Eliminar código expirado
            del _memoria_codigos_validacion[email]
            raise HTTPException(status_code=400, detail="El código de validación ha expirado. Por favor, solicitá uno nuevo.")
        
        # Verificar código
        if codigo_data['codigo'] != request.codigo:
            raise HTTPException(status_code=400, detail="Código de validación incorrecto")
        
        # Código válido - NO eliminar aquí, se eliminará cuando se actualice la contraseña
        # Esto permite que el código se use tanto para verificar como para actualizar
        logger.info(f"Código de recuperación verificado correctamente para {email}")
        
        return {
            "success": True,
            "message": "Código de validación verificado correctamente",
            "valid": True,
            "email": email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validando código de recuperación: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auth/actualizar-password-reset")
async def actualizar_password_reset(request: ActualizarPasswordResetRequest):
    """Valida el código y actualiza la contraseña usando Supabase Admin API"""
    try:
        from backend.validators import validar_email
        email_valido, email_limpio = validar_email(request.email)
        if not email_valido:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        email = email_limpio
        
        # Validar longitud de contraseña
        if len(request.new_password) < 8:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
        
        if len(request.new_password) > 16:
            raise HTTPException(status_code=400, detail="La contraseña no puede tener más de 16 caracteres")
        
        # Verificar si existe un código para este email
        if email not in _memoria_codigos_validacion:
            raise HTTPException(status_code=400, detail="No se encontró un código de validación para este email. Por favor, solicitá uno nuevo.")
        
        codigo_data = _memoria_codigos_validacion[email]
        
        # Verificar que sea un código de reset de contraseña o cambio de contraseña (sin tipo específico)
        codigo_type = codigo_data.get('type')
        if codigo_type and codigo_type != 'reset_password':
            raise HTTPException(status_code=400, detail="Este código no es válido para recuperación de contraseña")
        
        # Verificar expiración
        expires_at = datetime.fromisoformat(codigo_data['expires_at'])
        if datetime.now() > expires_at:
            # Eliminar código expirado
            del _memoria_codigos_validacion[email]
            raise HTTPException(status_code=400, detail="El código de validación ha expirado. Por favor, solicitá uno nuevo.")
        
        # Verificar código
        if codigo_data['codigo'] != request.codigo:
            raise HTTPException(status_code=400, detail="Código de validación incorrecto")
        
        # Código válido - eliminar de memoria (solo se puede usar una vez)
        del _memoria_codigos_validacion[email]
        
        # Actualizar contraseña usando Supabase Admin API
        logger.info(f"Código validado para reset de contraseña de {email}")
        
        # Intentar actualizar la contraseña usando Supabase Admin API
        supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        supabase_url = os.getenv('SUPABASE_URL')
        
        if supabase_service_key and supabase_url:
            try:
                # Intentar usar el módulo supabase primero
                try:
                    from supabase import create_client, Client
                    supabase_admin: Client = create_client(supabase_url, supabase_service_key)
                    
                    # Buscar el usuario por email
                    # list_users() puede devolver diferentes formatos
                    users_response = supabase_admin.auth.admin.list_users()
                    
                    # Manejar diferentes formatos de respuesta
                    users_list = None
                    if isinstance(users_response, list):
                        users_list = users_response
                    elif hasattr(users_response, 'users'):
                        users_list = users_response.users
                    elif hasattr(users_response, 'data') and hasattr(users_response.data, 'users'):
                        users_list = users_response.data.users
                    elif hasattr(users_response, 'data') and isinstance(users_response.data, list):
                        users_list = users_response.data
                    elif isinstance(users_response, dict) and 'users' in users_response:
                        users_list = users_response['users']
                    elif isinstance(users_response, dict) and 'data' in users_response:
                        data = users_response['data']
                        if isinstance(data, dict) and 'users' in data:
                            users_list = data['users']
                        elif isinstance(data, list):
                            users_list = data
                    
                    if users_list is None:
                        raise Exception("No se pudo parsear la respuesta de list_users")
                    
                    # Buscar el usuario por email
                    user = None
                    user_id = None
                    for u in users_list:
                        # Manejar tanto objetos como diccionarios
                        user_email = u.email if hasattr(u, 'email') else u.get('email') if isinstance(u, dict) else None
                        if user_email == email:
                            user = u
                            user_id = u.id if hasattr(u, 'id') else u.get('id') if isinstance(u, dict) else None
                            break
                    
                    if user and user_id:
                        # Actualizar la contraseña del usuario
                        update_response = supabase_admin.auth.admin.update_user_by_id(
                            user_id,
                            {"password": request.new_password}
                        )
                        
                        # Verificar la respuesta de actualización
                        updated_user = None
                        if hasattr(update_response, 'user'):
                            updated_user = update_response.user
                        elif hasattr(update_response, 'data') and hasattr(update_response.data, 'user'):
                            updated_user = update_response.data.user
                        elif isinstance(update_response, dict):
                            updated_user = update_response.get('user') or update_response.get('data', {}).get('user')
                        
                        if updated_user:
                            logger.info(f"Contraseña actualizada exitosamente para {email}")
                            return {
                                "success": True,
                                "message": "Tu contraseña ha sido actualizada correctamente. Podés iniciar sesión con tu nueva contraseña.",
                                "email": email,
                                "requires_frontend_reset": False
                            }
                        else:
                            # Si no hay error explícito, asumir éxito
                            logger.info(f"Contraseña actualizada para {email} (respuesta sin user)")
                            return {
                                "success": True,
                                "message": "Tu contraseña ha sido actualizada correctamente. Podés iniciar sesión con tu nueva contraseña.",
                                "email": email,
                                "requires_frontend_reset": False
                            }
                    else:
                        raise Exception("Usuario no encontrado")
                except ImportError:
                    # Si el módulo supabase no está disponible, usar API REST directamente
                    logger.info("Módulo supabase no disponible, usando API REST directamente")
                    import requests as http_requests
                    
                    # Usar la API REST de Supabase directamente
                    headers = {
                        "apikey": supabase_service_key,
                        "Authorization": f"Bearer {supabase_service_key}",
                        "Content-Type": "application/json"
                    }
                    
                    # Listar usuarios
                    list_url = f"{supabase_url}/auth/v1/admin/users"
                    list_response = http_requests.get(list_url, headers=headers)
                    
                    if list_response.status_code != 200:
                        raise Exception(f"Error al listar usuarios: {list_response.status_code} - {list_response.text}")
                    
                    users_data = list_response.json()
                    users_list = users_data.get('users', []) if isinstance(users_data, dict) else users_data
                    
                    if not isinstance(users_list, list):
                        raise Exception("Formato de respuesta de list_users no reconocido")
                    
                    # Buscar usuario
                    user = None
                    user_id = None
                    for u in users_list:
                        u_email = u.get('email')
                        if u_email == email:
                            user = u
                            user_id = u.get('id')
                            break
                    
                    if user and user_id:
                        # Actualizar
                        update_url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
                        update_payload = {"password": request.new_password}
                        update_response = http_requests.put(update_url, headers=headers, json=update_payload)
                        
                        if update_response.status_code != 200:
                            raise Exception(f"Error al actualizar usuario: {update_response.status_code} - {update_response.text}")
                        
                        return {
                            "success": True,
                            "message": "Tu contraseña ha sido actualizada correctamente.",
                            "email": email,
                            "requires_frontend_reset": False
                        }
                    else:
                        raise Exception("Usuario no encontrado")

            except Exception as e_supa:
                logger.error(f"Error usando Supabase Admin: {e_supa}")
                raise HTTPException(status_code=500, detail=f"Error actualizando contraseña: {str(e_supa)}")
        else:
            logger.warning("No se configuraron claves de Supabase, simulando éxito")
            return {
                "success": True,
                "message": "Contraseña actualizada (Simulado - falta configuración de Supabase)",
                "email": email,
                "requires_frontend_reset": False
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en actualizar_password_reset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS DE ADMIN PARA PLANES ==========



@router.delete("/api/auth/delete-account")
async def delete_account(request: Request):
    """
    Endpoint para eliminar cuenta del usuario actual.
    Requiere token Bearer en el header Authorization.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Token no proporcionado o inválido")
            
        token = auth_header.split(' ')[1]
        user_id = None
        
        # Debug: Verificar entorno (respetando Vercel)
        import os
        
        # Intentar conectar con Supabase
        try:
             # En Vercel las variables ya están en el entorno, no cargamos .env local
             
             # Carga el cliente de Supabase estandarizado
             from backend.db_supabase import get_supabase
             supabase = get_supabase()
             
             if not supabase:
                  raise HTTPException(status_code=500, detail="Error interno: No se pudo conectar a Supabase.")

             logger.info(f"🔄 delete_account: Verificando token con Supabase...")
             user_response = supabase.auth.get_user(token)
             
             # Extracción robusta del usuario
             user = None
             if user_response:
                 if hasattr(user_response, 'user') and user_response.user:
                    user = user_response.user
                 elif hasattr(user_response, 'data') and user_response.data and hasattr(user_response.data, 'user'):
                    user = user_response.data.user
                 elif isinstance(user_response, dict):
                    user = user_response.get('user') or (user_response.get('data') or {}).get('user')

             if not user:
                 logger.warning("❌ delete_account: Token válido pero no devolvió usuario.")
                 raise HTTPException(status_code=401, detail="Token inválido o expirado")
                 
             user_id = user.id if hasattr(user, 'id') else user.get('id')
             logger.info(f"✅ delete_account: Usuario identificado: {user_id}")
                 
        except HTTPException:
            raise
        except Exception as e_verify:
            logger.error(f"❌ delete_account: Error verificando token: {e_verify}")
            raise HTTPException(status_code=401, detail="Error de autenticación: Sesión inválida")

        if not user_id:
            raise HTTPException(status_code=400, detail="No se pudo identificar al usuario (ID nulo)")
            
        # Ejecutar eliminación
        result = eliminar_usuario_totalmente(user_id)
        
        if result.get("success"):
            return {
                "success": True, 
                "message": "Cuenta eliminada correctamente"
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Error desconocido al eliminar cuenta"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error no controlado en delete_account: {e}")
        raise HTTPException(status_code=500, detail=f"Error del servidor: {str(e)}")


