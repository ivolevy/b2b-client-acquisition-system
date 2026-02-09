"""
Emails B2B
Soporta templates personalizables y envío individual/masivo
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any
import os
from datetime import datetime
from dotenv import load_dotenv
import socket
import re

try:
    from .db_supabase import get_user_oauth_token, save_user_oauth_token, obtener_perfil_usuario
    from .auth_google import send_gmail_api
    from .auth_outlook import send_outlook_email
except ImportError:
    from backend.db_supabase import get_user_oauth_token, save_user_oauth_token, obtener_perfil_usuario
    from backend.auth_google import send_gmail_api
    from backend.auth_outlook import send_outlook_email

# Cargar variables de entorno desde .env.local o .env (busca en el directorio del backend)
env_local_path = os.path.join(os.path.dirname(__file__), '.env.local')
env_path = os.path.join(os.path.dirname(__file__), '.env')
# Prioriza .env.local si existe
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
else:
    load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración SMTP desde variables de entorno (Gmail por defecto)
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', 'solutionsdota@gmail.com')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')  # Debe configurarse en .env o usar App Password
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', 'solutionsdota@gmail.com')
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Ivan Levy')
SMTP_TIMEOUT = int(os.getenv('SMTP_TIMEOUT_SECONDS', '20'))
PLACEHOLDER_PATTERN = re.compile(r'\{([a-zA-Z0-9_]+)\}')

def renderizar_template(template: str, variables: Dict) -> str:
    """
    Renderiza un template reemplazando variables
    
    Variables disponibles:
    - {nombre_empresa}: Nombre de la empresa
    - {rubro}: Rubro de la empresa
    - {ciudad}: Ciudad de la empresa
    - {direccion}: Dirección de la empresa
    - {website}: Sitio web de la empresa
    - {fecha}: Fecha actual
    """
    import html
    texto = template or ''
    if not isinstance(texto, str):
        texto = str(texto)
    
    # Escapar variables para prevenir inyección HTML (excepto en body_html que ya es HTML)
    # Nota: body_html debe ser HTML válido, así que no escapamos ahí
    # Pero subject y body_text sí deben escaparse
    variables = {}
    for k, v in (variables or {}).items():
        if v is None:
            variables[k] = ''
        else:
            # Escapar HTML en variables para prevenir XSS
            # Solo escapar si no es body_html (que ya contiene HTML)
            variables[k] = html.escape(str(v))
    
    variables.setdefault('fecha', datetime.now().strftime('%d/%m/%Y'))

    def _reemplazar(match: re.Match) -> str:
        key = match.group(1)
        return variables.get(key, '')

    return PLACEHOLDER_PATTERN.sub(_reemplazar, texto)

def enviar_email(
    destinatario: str,
    asunto: str,
    cuerpo_html: str,
    cuerpo_texto: Optional[str] = None,
    user_id: Optional[str] = None,
    provider: Optional[str] = None,
    attachments: Optional[List[Any]] = None
) -> Dict:
    """
    Envía un email individual. Prioriza Gmail API si el usuario está conectado.
    
    Returns:
        Dict con success, message, error
    """
    # Validar formato de email
    from backend.validators import validar_email
    email_valido, email_limpio = validar_email(destinatario)
    if not email_valido:
        return {
            'success': False,
            'message': f'Email inválido: {destinatario}',
            'error': 'INVALID_EMAIL'
        }
    destinatario = email_limpio

    # 1. Intentar enviar vía Gmail API si tenemos user_id (y provider es None o 'google')
    if user_id and (provider is None or provider == 'google'):
        try:
            token_data = get_user_oauth_token(user_id)
            if token_data:
                logger.info(f" Intentando enviar vía Gmail API para usuario {user_id}")
                success_gmail, new_creds = send_gmail_api(
                    token_data=token_data,
                    to=destinatario,
                    subject=asunto,
                    body_html=cuerpo_html,
                    attachments=attachments
                )
                
                # Si se refrescó el token, guardarlo
                if new_creds:
                    logger.info(f" Actualizando token refrescado para usuario {user_id}")
                    save_user_oauth_token(user_id, {
                        'access_token': new_creds.token,
                        'refresh_token': new_creds.refresh_token,
                        'expiry': new_creds.expiry.isoformat() if new_creds.expiry else None,
                        'scope': new_creds.scopes,
                        'account_email': token_data.get('account_email')
                    })

                if success_gmail:
                    return {
                        'success': True,
                        'message': f'Email enviado vía Gmail API a {destinatario}',
                        'error': None,
                        'via': 'gmail_api'
                    }
        except Exception as e:
            logger.error(f"Error enviando vía Gmail API para {destinatario}: {e}")
            # No retornamos error fatal para permitir fallback a SMTP o siguiente provider si hubiera
            # Pero en este caso, si falla Gmail configurado, probablemente sea un error real.
            # Aun así, dejamos que falle y continúe el flujo (posible fallback SMTP)




    # 1.5. Intentar enviar vía Outlook API (si no se usó Gmail y provider es None o 'outlook')
    if user_id and (provider is None or provider == 'outlook'):
        try:
            token_data_outlook = get_user_oauth_token(user_id, 'outlook')
            if token_data_outlook:
                logger.info(f" Intentando enviar vía Outlook API para usuario {user_id}")
                
                # Obtener access token
                access_token = token_data_outlook.get('access_token')
                
                # send_outlook_email retorna un dict con "success"
                result_outlook = send_outlook_email(
                    access_token=access_token,
                    to_email=destinatario,
                    subject=asunto,
                    body_html=cuerpo_html,
                    attachments=attachments
                )
                
                if result_outlook.get("success"):
                    return {
                        'success': True,
                        'message': f'Email enviado vía Outlook API a {destinatario}',
                        'error': None,
                        'via': 'outlook_api'
                    }
                else:
                    logger.warning(f" Falló envío vía Outlook API: {result_outlook.get('error')}")
        except Exception as e:
            logger.error(f"Error inesperado en envío Outlook: {e}")
            # Continuar al fallback SMTP

    # 2. Fallback a SMTP Global
    if not SMTP_PASSWORD or SMTP_PASSWORD.strip() == '':
        env_file_path = os.path.join(os.path.dirname(__file__), '.env.local')
        return {
            'success': False,
            'message': f'SMTP no configurado. Por favor, agrega SMTP_PASSWORD en el archivo .env.local del backend.\n\nUbicación del archivo: {env_file_path}\n\nEjemplo de contenido:\nSMTP_PASSWORD=tu_app_password_de_gmail',
            'error': 'SMTP_NOT_CONFIGURED'
        }
    
    try:
        # Crear mensaje
        msg = MIMEMultipart('alternative')
        msg['Subject'] = asunto
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg['To'] = destinatario
        
        # Agregar cuerpo texto plano
        if cuerpo_texto:
            part1 = MIMEText(cuerpo_texto, 'plain', 'utf-8')
            msg.attach(part1)
        
        # Agregar cuerpo HTML
        part2 = MIMEText(cuerpo_html, 'html', 'utf-8')
        msg.attach(part2)
        
        # Enviar
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f" Email enviado a {destinatario}")
        return {
            'success': True,
            'message': f'Email enviado exitosamente a {destinatario}',
            'error': None
        }
        
    except socket.timeout:
        error_msg = f'Conexión SMTP excedió el tiempo límite ({SMTP_TIMEOUT}s).'
        logger.error(error_msg)
        return {
            'success': False,
            'message': error_msg,
            'error': 'SMTP_TIMEOUT'
        }
    except smtplib.SMTPAuthenticationError:
        error_msg = 'Error de autenticación SMTP. Verifica usuario y contraseña.'
        logger.error(error_msg)
        return {
            'success': False,
            'message': error_msg,
            'error': 'SMTP_AUTH_ERROR'
        }
    except smtplib.SMTPException as e:
        error_msg = f'Error SMTP: {str(e)}'
        logger.error(error_msg)
        return {
            'success': False,
            'message': error_msg,
            'error': 'SMTP_ERROR'
        }
    except Exception as e:
        error_msg = f'Error enviando email: {str(e)}'
        logger.error(error_msg)
        return {
            'success': False,
            'message': error_msg,
            'error': 'UNKNOWN_ERROR'
        }

def wrap_premium_template(content: str, sender_name: str, sender_email: str) -> str:
    """Envuelve el contenido en un diseño natural y minimalista (estilo carta profesional)"""
    formatted_content = content.replace('\n', '<br/>')
    
    return f"""
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto;">
        
        <div style="padding: 20px 0;">
          <div style="font-size: 16px; color: #333333;">
            {formatted_content}
          </div>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eaeaea;">
            <p style="margin: 0; font-weight: 600; color: #111111; font-size: 15px;">{sender_name}</p>
            <p style="margin: 2px 0 0 0; color: #666666; font-size: 14px;">{sender_email}</p>
          </div>
        </div>

        <div style="padding-top: 20px; text-align: left;">
          <p style="margin: 0; color: #999999; font-size: 11px;">Enviado por solicitud del remitente</p>
        </div>
      </div>
    """

def enviar_email_empresa(
    empresa: Dict,
    template: Dict,
    asunto_personalizado: Optional[str] = None,
    user_id: Optional[str] = None,
    provider: Optional[str] = None,
    attachments: Optional[List[Any]] = None
) -> Dict:
    """
    Envía email a una empresa usando un template
    
    Args:
        empresa: Dict con datos de la empresa
        template: Dict con template (subject, body_html, body_text)
        asunto_personalizado: Asunto opcional que sobrescribe el del template
    """
    if not empresa.get('email'):
        return {
            'success': False,
            'message': f'La empresa {empresa.get("nombre")} no tiene email',
            'error': 'NO_EMAIL'
        }
    
    # Obtener datos del usuario para personalización
    sender_name = 'Representante'
    sender_email = ''
    if user_id:
        try:
            profile = obtener_perfil_usuario(user_id)
            if profile:
                sender_name = profile.get('name', 'Representante')
                sender_email = profile.get('email', '')
        except Exception as e:
            logger.error(f"Error obteniendo perfil para email: {e}")
    
    # Preparar variables para el template
    variables = {
        'nombre_empresa': empresa.get('nombre'),
        'rubro': empresa.get('rubro'),
        'ciudad': empresa.get('ciudad'),
        'direccion': empresa.get('direccion'),
        'website': empresa.get('website'),
        'telefono': empresa.get('telefono'),
        'email_empresa': empresa.get('email'),
        'pais': empresa.get('pais'),
        'distancia_km': empresa.get('distancia_km'),
        'busqueda_ubicacion_nombre': empresa.get('busqueda_ubicacion_nombre'),
        'descripcion': empresa.get('descripcion')
    }
    
    # Renderizar template
    # IMPORTANTE: Como los templates ahora se guardan como texto plano en body_html,
    # debemos usar renderizar_template sobre body_text (o body_html como fallback)
    # y luego aplicar el wrapper premium.
    
    raw_content = template.get('body_text') or template.get('body_html', '')
    # Quitar tags HTML si existen (legacy support)
    raw_content = re.sub(r'<[^>]*>', '', raw_content)
    
    rendered_content = renderizar_template(raw_content, variables)
    
    # Aplicar Premium Wrapper
    cuerpo_html = wrap_premium_template(rendered_content, sender_name, sender_email)
    
    # Asunto
    asunto = asunto_personalizado or renderizar_template(template.get('subject', ''), variables)
    
    # Cuerpo texto (versión simple)
    cuerpo_texto = rendered_content
    
    # Enviar
    resultado = enviar_email(
        destinatario=empresa['email'],
        asunto=asunto,
        cuerpo_html=cuerpo_html,
        cuerpo_texto=cuerpo_texto,
        user_id=user_id,
        provider=provider,
        attachments=attachments
    )
    
    # Agregar info de la empresa al resultado
    resultado['empresa_id'] = empresa.get('id')
    resultado['empresa_nombre'] = empresa.get('nombre')
    resultado['empresa_email'] = empresa.get('email')
    
    return resultado

def enviar_emails_masivo(
    empresas: List[Dict],
    template: Dict,
    asunto_personalizado: Optional[str] = None,
    delay_segundos: float = 3.0,
    user_id: Optional[str] = None,
    provider: Optional[str] = None,
    attachments: Optional[List[Any]] = None
) -> Dict:
    """
    Envía emails a múltiples empresas
    
    Args:
        empresas: Lista de dicts con datos de empresas
        template: Dict con template
        asunto_personalizado: Asunto opcional
        delay_segundos: Delay entre envíos para evitar rate limiting
    
    Returns:
        Dict con resultados: total, exitosos, fallidos, detalles
    """
    import time
    
    # Validar entrada
    if not isinstance(empresas, list):
        return {
            'total': 0,
            'exitosos': 0,
            'fallidos': 0,
            'sin_email': 0,
            'detalles': [],
            'error': 'EMPRESAS_INVALIDAS'
        }
    
    # Límite máximo de emails para prevenir rate limiting
    MAX_EMAILS_MASIVOS = 100
    if len(empresas) > MAX_EMAILS_MASIVOS:
        logger.warning(f"Limitando envío masivo a {MAX_EMAILS_MASIVOS} de {len(empresas)} empresas")
        empresas = empresas[:MAX_EMAILS_MASIVOS]
    
    # Validar delay
    if delay_segundos < 1.0:
        logger.warning(f"Delay muy bajo ({delay_segundos}s), usando mínimo de 1.0s")
        delay_segundos = 1.0
    
    resultados = {
        'total': len(empresas),
        'exitosos': 0,
        'fallidos': 0,
        'sin_email': 0,
        'detalles': []
    }
    
    for empresa in empresas:
        if not empresa.get('email'):
            resultados['sin_email'] += 1
            resultados['detalles'].append({
                'empresa_id': empresa.get('id'),
                'empresa_nombre': empresa.get('nombre'),
                'success': False,
                'message': 'No tiene email',
                'error': 'NO_EMAIL'
            })
            continue
        
        try:
            resultado = enviar_email_empresa(empresa, template, asunto_personalizado, user_id=user_id, provider=provider, attachments=attachments)
            
            if resultado['success']:
                resultados['exitosos'] += 1
            else:
                resultados['fallidos'] += 1
            
            resultados['detalles'].append(resultado)
        except Exception as e:
            logger.error(f"Error crítico enviando a empresa {empresa.get('id')}: {e}")
            resultados['fallidos'] += 1
            resultados['detalles'].append({
                'empresa_id': empresa.get('id'),
                'empresa_nombre': empresa.get('nombre'),
                'success': False,
                'message': f'Error interno: {str(e)}',
                'error': 'CRITICAL_ERROR'
            })
        
        # Delay entre envíos (siempre aplicar delay mínimo de 1 segundo)
        if delay_segundos > 0:
            time.sleep(max(1.0, delay_segundos))
    
    logger.info(f" Envío masivo completado: {resultados['exitosos']}/{resultados['total']} exitosos")
    return resultados
