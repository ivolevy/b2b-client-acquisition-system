"""
Validadores para datos de contacto B2B
Asegura que emails y teléfonos sean válidos antes de guardar
"""

import re
import logging
from typing import Dict, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validar_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Valida formato de email
    
    Returns:
        (es_valido, email_limpio)
    """
    if not email or email == '':
        return False, None
    
    # Limpiar espacios
    email = email.strip().lower()
    
    # Patrón RFC 5322 simplificado
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    # Filtrar emails falsos comunes
    emails_invalidos = [
        'example.com', 'test.com', 'spam.com', 'fake.com',
        'noreply@', 'no-reply@', 'donotreply@',
        'ejemplo@', 'prueba@'
    ]
    
    if any(fake in email for fake in emails_invalidos):
        return False, None
    
    if re.match(patron, email):
        return True, email
    
    return False, None

def validar_telefono(telefono: str) -> Tuple[bool, Optional[str]]:
    """
    Valida y normaliza número de teléfono
    
    Returns:
        (es_valido, telefono_limpio)
    """
    if not telefono or telefono == '':
        return False, None
    
    # Limpiar y normalizar
    telefono = telefono.strip()
    
    # Extraer solo dígitos y símbolos permitidos
    telefono_limpio = re.sub(r'[^\d+() -]', '', telefono)
    
    # Contar dígitos
    digitos = re.sub(r'\D', '', telefono_limpio)
    
    # Validar que tenga entre 7 y 15 dígitos (estándar internacional)
    if len(digitos) < 7 or len(digitos) > 15:
        return False, None
    
    # Filtrar números falsos comunes
    numeros_invalidos = ['000000', '111111', '123456', '999999']
    if any(fake in digitos for fake in numeros_invalidos):
        return False, None
    
    return True, telefono_limpio

def validar_website(website: str) -> Tuple[bool, Optional[str]]:
    """
    Valida y normaliza URL de sitio web
    
    Returns:
        (es_valido, url_limpia)
    """
    if not website or website == '':
        return False, None
    
    website = website.strip().lower()
    
    # Agregar protocolo si no lo tiene
    if not website.startswith(('http://', 'https://')):
        website = 'https://' + website
    
    # Patrón básico de URL
    patron = r'^https?://[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*'
    
    if re.match(patron, website):
        return True, website
    
    return False, None

def validar_empresa(empresa: Dict) -> Tuple[bool, Dict, str]:
    """
    Valida datos completos de una empresa
    Requiere al menos email O teléfono válido
    
    Returns:
        (es_valida, empresa_validada, mensaje)
    """
    empresa_validada = empresa.copy()
    tiene_contacto = False
    mensaje = ""
    
    # Validar nombre (obligatorio)
    if not empresa.get('nombre') or empresa['nombre'] == 'Sin nombre':
        empresa_validada['validada'] = False
        return False, empresa_validada, "Empresa sin nombre válido"
    
    # Validar email
    email_valido, email_limpio = validar_email(empresa.get('email', ''))
    if email_valido:
        empresa_validada['email'] = email_limpio
        empresa_validada['email_valido'] = True
        tiene_contacto = True
    else:
        empresa_validada['email'] = ''
        empresa_validada['email_valido'] = False
    
    # Validar teléfono
    tel_valido, tel_limpio = validar_telefono(empresa.get('telefono', ''))
    if tel_valido:
        empresa_validada['telefono'] = tel_limpio
        empresa_validada['telefono_valido'] = True
        tiene_contacto = True
    else:
        empresa_validada['telefono'] = ''
        empresa_validada['telefono_valido'] = False
    
    # Validar website (opcional)
    web_valido, web_limpio = validar_website(empresa.get('website', ''))
    if web_valido:
        empresa_validada['website'] = web_limpio
        empresa_validada['website_valido'] = True
    else:
        empresa_validada['website'] = ''
        empresa_validada['website_valido'] = False
    
    # Verificar que tenga al menos un método de contacto válido
    if not tiene_contacto:
        empresa_validada['validada'] = False  # IMPORTANTE: Marcar como NO validada
        return False, empresa_validada, "Sin email ni teléfono válido"
    
    # Marcar como validada
    empresa_validada['validada'] = True
    
    if email_valido and tel_valido:
        mensaje = "✓ Email y teléfono válidos"
    elif email_valido:
        mensaje = "✓ Email válido"
    elif tel_valido:
        mensaje = "✓ Teléfono válido"
    
    return True, empresa_validada, mensaje

def filtrar_empresas_validas(empresas: list) -> Tuple[list, Dict]:
    """
    Filtra lista de empresas dejando solo las que tienen datos de contacto válidos
    
    Returns:
        (empresas_validas, estadisticas)
    """
    validas = []
    invalidas = []
    
    for empresa in empresas:
        es_valida, empresa_validada, mensaje = validar_empresa(empresa)
        
        if es_valida:
            validas.append(empresa_validada)
            logger.info(f"✓ {empresa['nombre']}: {mensaje}")
        else:
            invalidas.append(empresa)
            logger.warning(f"✗ {empresa.get('nombre', 'Sin nombre')}: {mensaje}")
    
    estadisticas = {
        'total': len(empresas),
        'validas': len(validas),
        'invalidas': len(invalidas),
        'tasa_exito': round(len(validas) / len(empresas) * 100, 2) if empresas else 0,
        'con_email': sum(1 for e in validas if e.get('email_valido')),
        'con_telefono': sum(1 for e in validas if e.get('telefono_valido')),
        'con_website': sum(1 for e in validas if e.get('website_valido'))
    }
    
    logger.info(f"""
    === VALIDACIÓN COMPLETADA ===
    Total empresas: {estadisticas['total']}
    Válidas: {estadisticas['validas']} ({estadisticas['tasa_exito']}%)
    Con email: {estadisticas['con_email']}
    Con teléfono: {estadisticas['con_telefono']}
    Con website: {estadisticas['con_website']}
    """)
    
    return validas, estadisticas

