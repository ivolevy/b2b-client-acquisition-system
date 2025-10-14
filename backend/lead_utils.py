"""
Utilidades para gestión de leads:
- Scoring automático
- Detección de duplicados
- Gestión de estados Kanban
"""

import logging
from typing import Dict, Optional, List, Tuple

logger = logging.getLogger(__name__)

def calcular_lead_score(empresa: Dict) -> int:
    """
    Calcula el score de un lead basado en la completitud de sus datos
    
    Score máximo: 100 puntos
    - Email válido: 30 puntos
    - Teléfono válido: 30 puntos
    - Website válido: 20 puntos
    - Instagram: 5 puntos
    - Facebook: 5 puntos
    - LinkedIn: 5 puntos
    - Twitter: 3 puntos
    - YouTube: 2 puntos
    
    Returns:
        Score entre 0 y 100
    """
    score = 0
    
    # Datos de contacto principales
    if empresa.get('email_valido'):
        score += 30
    
    if empresa.get('telefono_valido'):
        score += 30
    
    if empresa.get('website_valido') or empresa.get('website') or empresa.get('sitio_web'):
        score += 20
    
    # Redes sociales (presencia digital)
    if empresa.get('instagram'):
        score += 5
    
    if empresa.get('facebook'):
        score += 5
    
    if empresa.get('linkedin'):
        score += 5
    
    if empresa.get('twitter'):
        score += 3
    
    if empresa.get('youtube'):
        score += 2
    
    return min(score, 100)  # Máximo 100

def clasificar_por_score(score: int) -> str:
    """
    Clasifica un lead según su score
    
    Returns:
        'caliente' (80-100), 'tibio' (50-79), 'frio' (0-49)
    """
    if score >= 80:
        return 'caliente'
    elif score >= 50:
        return 'tibio'
    else:
        return 'frio'

def detectar_duplicado(empresa_nueva: Dict, empresas_existentes: List[Dict]) -> Tuple[bool, Optional[Dict]]:
    """
    Detecta si una empresa ya existe en la lista
    
    Criterios de duplicado:
    - Mismo nombre (case insensitive) + misma ciudad
    - Mismo email
    - Mismo teléfono
    - Mismo sitio web
    
    Args:
        empresa_nueva: Empresa a verificar
        empresas_existentes: Lista de empresas en la BD
        
    Returns:
        Tuple (es_duplicado: bool, empresa_duplicada: Dict o None)
    """
    nombre_nuevo = (empresa_nueva.get('nombre') or '').strip().lower()
    ciudad_nueva = (empresa_nueva.get('ciudad') or '').strip().lower()
    email_nuevo = (empresa_nueva.get('email') or '').strip().lower()
    telefono_nuevo = (empresa_nueva.get('telefono') or '').strip()
    website_nuevo = (empresa_nueva.get('website') or empresa_nueva.get('sitio_web') or '').strip().lower()
    
    for empresa_existente in empresas_existentes:
        nombre_existente = (empresa_existente.get('nombre') or '').strip().lower()
        ciudad_existente = (empresa_existente.get('ciudad') or '').strip().lower()
        email_existente = (empresa_existente.get('email') or '').strip().lower()
        telefono_existente = (empresa_existente.get('telefono') or '').strip()
        website_existente = (empresa_existente.get('website') or empresa_existente.get('sitio_web') or '').strip().lower()
        
        # Criterio 1: Mismo nombre + misma ciudad
        if nombre_nuevo and ciudad_nueva:
            if nombre_nuevo == nombre_existente and ciudad_nueva == ciudad_existente:
                logger.warning(f"🔄 Duplicado detectado: {nombre_nuevo} en {ciudad_nueva}")
                return (True, empresa_existente)
        
        # Criterio 2: Mismo email (si no está vacío)
        if email_nuevo and email_existente:
            if email_nuevo == email_existente:
                logger.warning(f"🔄 Duplicado detectado por email: {email_nuevo}")
                return (True, empresa_existente)
        
        # Criterio 3: Mismo teléfono (si no está vacío)
        if telefono_nuevo and telefono_existente:
            # Limpiar espacios y caracteres especiales
            tel_nuevo_limpio = ''.join(filter(str.isdigit, telefono_nuevo))
            tel_existente_limpio = ''.join(filter(str.isdigit, telefono_existente))
            
            if tel_nuevo_limpio and tel_existente_limpio:
                if tel_nuevo_limpio == tel_existente_limpio:
                    logger.warning(f"🔄 Duplicado detectado por teléfono: {telefono_nuevo}")
                    return (True, empresa_existente)
        
        # Criterio 4: Mismo website
        if website_nuevo and website_existente:
            if website_nuevo == website_existente:
                logger.warning(f"🔄 Duplicado detectado por website: {website_nuevo}")
                return (True, empresa_existente)
    
    return (False, None)

def fusionar_empresas(empresa_existente: Dict, empresa_nueva: Dict) -> Dict:
    """
    Fusiona dos empresas duplicadas, manteniendo los mejores datos
    
    Estrategia:
    - Si un campo está vacío en existente pero lleno en nueva, usar el nuevo
    - Si un campo está lleno en ambos, mantener el existente (datos más antiguos)
    - Actualizar score si la nueva tiene más información
    
    Returns:
        Empresa fusionada
    """
    fusionada = empresa_existente.copy()
    
    campos_a_fusionar = [
        'email', 'telefono', 'website', 'sitio_web', 'direccion',
        'instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok',
        'descripcion', 'horario'
    ]
    
    for campo in campos_a_fusionar:
        valor_existente = fusionada.get(campo)
        valor_nuevo = empresa_nueva.get(campo)
        
        # Si existente está vacío y nuevo tiene valor, actualizar
        if not valor_existente and valor_nuevo:
            fusionada[campo] = valor_nuevo
            logger.info(f"  ✏️  Actualizado campo '{campo}': {valor_nuevo}")
    
    # Recalcular score
    nuevo_score = calcular_lead_score(fusionada)
    fusionada['lead_score'] = nuevo_score
    
    logger.info(f"✅ Empresa fusionada. Nuevo score: {nuevo_score}")
    
    return fusionada

def obtener_estado_inicial() -> str:
    """Retorna el estado inicial de un lead en Kanban"""
    return 'por_contactar'

def validar_estado(estado: str) -> bool:
    """Valida que el estado sea uno de los permitidos"""
    estados_validos = ['por_contactar', 'contactada', 'interesada', 'no_interesa', 'convertida']
    return estado in estados_validos

def procesar_lead_nuevo(empresa: Dict, empresas_existentes: List[Dict] = None) -> Dict:
    """
    Procesa un lead nuevo:
    1. Calcula score
    2. Asigna estado inicial
    3. Detecta duplicados (si se pasan empresas existentes)
    
    Returns:
        Empresa procesada con score y estado
    """
    # Calcular score
    score = calcular_lead_score(empresa)
    empresa['lead_score'] = score
    
    # Asignar estado inicial si no tiene
    if not empresa.get('estado'):
        empresa['estado'] = obtener_estado_inicial()
    
    # Log del score
    clasificacion = clasificar_por_score(score)
    logger.info(f"📊 Lead '{empresa.get('nombre')}': Score {score}/100 ({clasificacion})")
    
    # Detectar duplicados si se pasan empresas existentes
    if empresas_existentes:
        es_duplicado, empresa_duplicada = detectar_duplicado(empresa, empresas_existentes)
        if es_duplicado:
            logger.warning(f"⚠️  Lead duplicado detectado: {empresa.get('nombre')}")
            empresa['_es_duplicado'] = True
            empresa['_duplicado_de_id'] = empresa_duplicada.get('id')
    
    return empresa

# Test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Empresa de prueba
    empresa_test = {
        'nombre': 'Tech Solutions SA',
        'email': 'info@techsolutions.com',
        'email_valido': True,
        'telefono': '+34 91 123 4567',
        'telefono_valido': True,
        'website': 'https://techsolutions.com',
        'website_valido': True,
        'instagram': 'https://instagram.com/techsolutions',
        'linkedin': 'https://linkedin.com/company/techsolutions',
        'ciudad': 'Madrid'
    }
    
    empresa_procesada = procesar_lead_nuevo(empresa_test)
    print(f"\n✅ Empresa procesada:")
    print(f"   Score: {empresa_procesada['lead_score']}/100")
    print(f"   Estado: {empresa_procesada['estado']}")
    print(f"   Clasificación: {clasificar_por_score(empresa_procesada['lead_score'])}")

