"""
Emails B2B
Soporta templates personalizables y envío individual/masivo
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional
import os
from datetime import datetime
from dotenv import load_dotenv
import socket
import re

try:
    from .db_supabase import get_user_oauth_token, save_user_oauth_token
    from .auth_google import send_gmail_api
except ImportError:
    from db_supabase import get_user_oauth_token, save_user_oauth_token
    from auth_google import send_gmail_api

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
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Ivan Levy - Dota Solutions')
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
    user_id: Optional[str] = None
) -> Dict:
    """
    Envía un email individual. Prioriza Gmail API si el usuario está conectado.
    
    Returns:
        Dict con success, message, error
    """
    # Validar formato de email
    from validators import validar_email
    email_valido, email_limpio = validar_email(destinatario)
    if not email_valido:
        return {
            'success': False,
            'message': f'Email inválido: {destinatario}',
            'error': 'INVALID_EMAIL'
        }
    destinatario = email_limpio

    # 1. Intentar enviar vía Gmail API si tenemos user_id
    if user_id:
        token_data = get_user_oauth_token(user_id)
        if token_data:
            logger.info(f" Intentando enviar vía Gmail API para usuario {user_id}")
            success_gmail, new_creds = send_gmail_api(
                token_data=token_data,
                to=destinatario,
                subject=asunto,
                body_html=cuerpo_html
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
            else:
                logger.warning(f" Falló envío vía Gmail API, reintentando con SMTP global...")

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

def enviar_email_empresa(
    empresa: Dict,
    template: Dict,
    asunto_personalizado: Optional[str] = None,
    user_id: Optional[str] = None
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
    asunto = asunto_personalizado or renderizar_template(template.get('subject', ''), variables)
    cuerpo_html = renderizar_template(template.get('body_html', ''), variables)
    cuerpo_texto = renderizar_template(template.get('body_text', ''), variables) if template.get('body_text') else None
    
    # Enviar
    resultado = enviar_email(
        destinatario=empresa['email'],
        asunto=asunto,
        cuerpo_html=cuerpo_html,
        cuerpo_texto=cuerpo_texto,
        user_id=user_id
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
    user_id: Optional[str] = None
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
        
        resultado = enviar_email_empresa(empresa, template, asunto_personalizado, user_id=user_id)
        
        if resultado['success']:
            resultados['exitosos'] += 1
        else:
            resultados['fallidos'] += 1
        
        resultados['detalles'].append(resultado)
        
        # Delay entre envíos (siempre aplicar delay mínimo de 1 segundo)
        if delay_segundos > 0:
            time.sleep(max(1.0, delay_segundos))
    
    logger.info(f" Envío masivo completado: {resultados['exitosos']}/{resultados['total']} exitosos")
    return resultados
