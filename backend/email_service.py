"""
Servicio de envío de emails para contacto B2B
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

# Cargar variables de entorno desde .env (busca en el directorio del backend)
env_path = os.path.join(os.path.dirname(__file__), '.env')
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
    resultado = template
    
    # Reemplazar variables
    resultado = resultado.replace('{nombre_empresa}', variables.get('nombre_empresa', ''))
    resultado = resultado.replace('{rubro}', variables.get('rubro', ''))
    resultado = resultado.replace('{ciudad}', variables.get('ciudad', ''))
    resultado = resultado.replace('{direccion}', variables.get('direccion', ''))
    resultado = resultado.replace('{website}', variables.get('website', ''))
    resultado = resultado.replace('{fecha}', datetime.now().strftime('%d/%m/%Y'))
    
    return resultado

def enviar_email(
    destinatario: str,
    asunto: str,
    cuerpo_html: str,
    cuerpo_texto: Optional[str] = None
) -> Dict:
    """
    Envía un email individual
    
    Returns:
        Dict con success, message, error
    """
    if not SMTP_PASSWORD or SMTP_PASSWORD.strip() == '':
        env_file_path = os.path.join(os.path.dirname(__file__), '.env')
        return {
            'success': False,
            'message': f'SMTP no configurado. Por favor, agrega SMTP_PASSWORD en el archivo .env del backend.\n\nUbicación del archivo: {env_file_path}\n\nEjemplo de contenido:\nSMTP_PASSWORD=tu_app_password_de_gmail',
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
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f" Email enviado a {destinatario}")
        return {
            'success': True,
            'message': f'Email enviado exitosamente a {destinatario}',
            'error': None
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
    asunto_personalizado: Optional[str] = None
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
        'nombre_empresa': empresa.get('nombre', ''),
        'rubro': empresa.get('rubro', ''),
        'ciudad': empresa.get('ciudad', ''),
        'direccion': empresa.get('direccion', ''),
        'website': empresa.get('website', '')
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
        cuerpo_texto=cuerpo_texto
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
    delay_segundos: float = 1.0
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
        
        resultado = enviar_email_empresa(empresa, template, asunto_personalizado)
        
        if resultado['success']:
            resultados['exitosos'] += 1
        else:
            resultados['fallidos'] += 1
        
        resultados['detalles'].append(resultado)
        
        # Delay entre envíos
        if delay_segundos > 0:
            time.sleep(delay_segundos)
    
    logger.info(f" Envío masivo completado: {resultados['exitosos']}/{resultados['total']} exitosos")
    return resultados

