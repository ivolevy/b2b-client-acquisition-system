import httpx
import asyncio
from bs4 import BeautifulSoup
import re
import logging
from typing import Dict, List, Optional
from urllib.parse import urlparse, urljoin
import time
from urllib.robotparser import RobotFileParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache para robots.txt
_robots_cache = {}
_robots_cache_lock = asyncio.Lock()

async def check_robots_txt_async(url: str, client: httpx.AsyncClient) -> bool:
    """Verifica robots.txt de forma asincrónica con cache"""
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return False
        
        domain = parsed.netloc
        robots_url = f"{parsed.scheme}://{domain}/robots.txt"
        
        async with _robots_cache_lock:
            if domain in _robots_cache:
                return _robots_cache[domain].can_fetch("B2BDataCollectorBot/1.0", url)
        
        try:
            response = await client.get(robots_url, timeout=5.0)
            rp = RobotFileParser()
            if response.status_code == 200:
                rp.parse(response.text.splitlines())
            else:
                # Si no hay robots.txt, asumimos permitido
                rp.allow_all = True
        except Exception:
            # Error de red o timeout, asumimos permitido por simplicidad
            rp = RobotFileParser()
            rp.allow_all = True
            
        async with _robots_cache_lock:
            _robots_cache[domain] = rp
            
        return rp.can_fetch("B2BDataCollectorBot/1.0", url)
    except Exception as e:
        logger.warning(f"Error verificando robots.txt para {url}: {e}")
        return True

def check_robots_txt(url: str) -> bool:
    """Verifica robots.txt"""
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            logger.warning(f"URL sin netloc válido: {url}")
            return False
        
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        
        return rp.can_fetch("B2BDataCollectorBot/1.0", url)
    except Exception as e:
        logger.warning(f"Error verificando robots.txt para {url}: {e}, asumiendo permitido")
        # Por defecto permitir, pero loguear el error
        return True

def extraer_emails_b2b(soup: BeautifulSoup, text: str) -> List[str]:
    """Extrae emails corporativos priorizando contactos comerciales"""
    emails = []
    
    # Buscar en enlaces mailto
    for link in soup.find_all('a', href=re.compile(r'^mailto:')):
        email = link['href'].replace('mailto:', '').split('?')[0].strip()
        emails.append(email)
    
    # Buscar en texto con patrón mejorado
    patron_email = r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
    emails_texto = re.findall(patron_email, text)
    emails.extend(emails_texto)
    
    # Priorizar emails corporativos
    emails_validos = []
    for email in set(emails):
        email = email.lower().strip()
        
        # Filtrar emails no deseados
        if any(x in email for x in ['noreply', 'no-reply', 'example', 'test', 'spam']):
            continue
        
        # Priorizar emails de contacto, info, ventas, comercial
        prioridad = 0
        if any(x in email for x in ['contacto', 'contact', 'info', 'ventas', 'sales', 'comercial']):
            prioridad = 10
        elif any(x in email for x in ['admin', 'director', 'gerente']):
            prioridad = 5
        
        emails_validos.append((prioridad, email))
    
    # Ordenar por prioridad y retornar únicos
    emails_validos.sort(reverse=True)
    return [email for _, email in emails_validos[:3]]

def extraer_telefonos_b2b(soup: BeautifulSoup, text: str) -> List[str]:
    """Extrae teléfonos corporativos"""
    telefonos = []
    
    # Buscar en enlaces tel:
    for link in soup.find_all('a', href=re.compile(r'^tel:')):
        telefono = link['href'].replace('tel:', '').strip()
        telefonos.append(telefono)
    
    # Patrones de teléfono mejorados
    patrones = [
        r'\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
        r'\(\d{2,4}\)\s*\d{6,10}',
        r'\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}',
    ]
    
    for patron in patrones:
        encontrados = re.findall(patron, text)
        telefonos.extend(encontrados)
    
    # Filtrar y limpiar
    telefonos_validos = []
    for tel in set(telefonos):
        digitos = re.sub(r'\D', '', tel)
        if 7 <= len(digitos) <= 15:
            telefonos_validos.append(tel.strip())
    
    return telefonos_validos[:3]

async def buscar_en_pagina_contacto_async(base_url: str, soup: BeautifulSoup, client: httpx.AsyncClient) -> Dict:
    """Busca página de contacto y extrae información (Async)"""
    contacto_urls = []
    
    # Buscar enlaces a páginas de contacto
    for link in soup.find_all('a', href=True):
        href = link['href'].lower()
        texto = link.get_text().lower()
        
        if any(palabra in href or palabra in texto for palabra in 
               ['contact', 'contacto', 'about', 'nosotros', 'quienes-somos']):
            url_completa = urljoin(base_url, link['href'])
            contacto_urls.append(url_completa)
    
    # Visitar primera página de contacto encontrada
    if contacto_urls:
        try:
            # Usar un pequeño delay si es necesario, pero httpx maneja concurrencia mejor
            response = await client.get(
                contacto_urls[0], 
                timeout=10,
                follow_redirects=True
            )
            
            if response.status_code == 200:
                soup_contacto = BeautifulSoup(response.content, 'html.parser')
                text_contacto = soup_contacto.get_text()
                
                return {
                    'emails': extraer_emails_b2b(soup_contacto, text_contacto),
                    'telefonos': extraer_telefonos_b2b(soup_contacto, text_contacto)
                }
        except Exception:
            pass
    
    return {'emails': [], 'telefonos': []}

async def scrapear_empresa_b2b_async(url: str, client: Optional[httpx.AsyncClient] = None) -> Dict:
    """
    Scrapea sitio web empresarial para extraer datos de contacto B2B (Async)
    """
    resultado = {
        'emails': [], 'telefonos': [], 'linkedin': '', 'facebook': '',
        'twitter': '', 'instagram': '', 'exito': False
    }
    
    if not url: return resultado
    if not url.startswith('http'): url = 'https://' + url
    
    # Si no nos pasan un cliente, creamos uno (aunque lo ideal es reusarlo)
    manage_client = client is None
    if manage_client:
        client = httpx.AsyncClient(timeout=10, follow_redirects=True, headers={'User-Agent': 'Mozilla/5.0 (compatible; B2BDataCollectorBot/1.0)'})

    try:
        # Verificar robots.txt
        if not await check_robots_txt_async(url, client):
            return resultado
        
        response = await client.get(url)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text()
            
            resultado['emails'] = extraer_emails_b2b(soup, text)
            resultado['telefonos'] = extraer_telefonos_b2b(soup, text)
            
            if len(resultado['emails']) == 0 or len(resultado['telefonos']) == 0:
                datos_contacto = await buscar_en_pagina_contacto_async(url, soup, client)
                resultado['emails'].extend(datos_contacto['emails'])
                resultado['telefonos'].extend(datos_contacto['telefonos'])
            
            # Extraer redes sociales
            for link in soup.find_all('a', href=True):
                href = link['href']
                if 'linkedin.com' in href: resultado['linkedin'] = href
                elif 'facebook.com' in href: resultado['facebook'] = href
                elif 'twitter.com' in href or 'x.com' in href: resultado['twitter'] = href
                elif 'instagram.com' in href: resultado['instagram'] = href
            
            resultado['emails'] = list(set(resultado['emails']))[:3]
            resultado['telefonos'] = list(set(resultado['telefonos']))[:3]
            resultado['exito'] = True
            
    except Exception as e:
        logger.debug(f"Error scraping {url}: {e}")
    finally:
        if manage_client:
            await client.aclose()
    
    return resultado

async def enriquecer_empresa_b2b_async(empresa: Dict, client: Optional[httpx.AsyncClient] = None) -> Dict:
    """Enriquece datos de empresa con web scraping async"""
    if not empresa or not isinstance(empresa, dict): return {}
    
    website = empresa.get('website')
    if not website or not isinstance(website, str) or not website.strip():
        return empresa
    
    if empresa.get('email') and empresa.get('telefono'):
        return empresa
    
    datos_scraped = await scrapear_empresa_b2b_async(website, client)
    
    if not empresa.get('email') and datos_scraped['emails']:
        empresa['email'] = datos_scraped['emails'][0]
    
    if not empresa.get('telefono') and datos_scraped['telefonos']:
        empresa['telefono'] = datos_scraped['telefonos'][0]
    
    # Redes sociales
    for field in ['linkedin', 'facebook', 'twitter']:
        if not empresa.get(field) and datos_scraped.get(field):
            empresa[field] = datos_scraped[field]
            
    return empresa

