"""
Web Scraper enfocado en extracción B2B de datos de contacto empresarial
Mejorado para encontrar emails y teléfonos corporativos
"""

import requests
from bs4 import BeautifulSoup
import re
import logging
from typing import Dict, List
from urllib.parse import urlparse, urljoin
import time
from urllib.robotparser import RobotFileParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

def buscar_en_pagina_contacto(base_url: str, soup: BeautifulSoup) -> Dict:
    """Busca página de contacto y extrae información"""
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
            time.sleep(1)
            response = requests.get(
                contacto_urls[0], 
                timeout=15,  # Aumentado de 10 a 15 para consistencia
                headers={'User-Agent': 'B2BDataCollectorBot/1.0'},
                allow_redirects=True
            )
            
            if response.status_code == 200:
                soup_contacto = BeautifulSoup(response.content, 'html.parser')
                text_contacto = soup_contacto.get_text()
                
                return {
                    'emails': extraer_emails_b2b(soup_contacto, text_contacto),
                    'telefonos': extraer_telefonos_b2b(soup_contacto, text_contacto)
                }
        except:
            pass
    
    return {'emails': [], 'telefonos': []}

def scrapear_empresa_b2b(url: str) -> Dict:
    """
    Scrapea sitio web empresarial para extraer datos de contacto B2B
    
    Returns:
        Dict con emails, telefonos, redes sociales
    """
    resultado = {
        'emails': [],
        'telefonos': [],
        'linkedin': '',
        'facebook': '',
        'twitter': '',
        'instagram': '',
        'exito': False
    }
    
    if not url:
        return resultado
    
    # Normalizar URL
    if not url.startswith('http'):
        url = 'https://' + url
    
    try:
        # Verificar robots.txt
        if not check_robots_txt(url):
            logger.warning(f"Bloqueado por robots.txt: {url}")
            return resultado
        
        # Delay respetuoso
        time.sleep(1.5)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; B2BDataCollectorBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        logger.info(f"Scrapeando empresa: {url}")
        
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text()
            
            # Extraer de página principal
            resultado['emails'] = extraer_emails_b2b(soup, text)
            resultado['telefonos'] = extraer_telefonos_b2b(soup, text)
            
            # Si no encontró suficiente info, buscar en página de contacto
            if len(resultado['emails']) == 0 or len(resultado['telefonos']) == 0:
                datos_contacto = buscar_en_pagina_contacto(url, soup)
                resultado['emails'].extend(datos_contacto['emails'])
                resultado['telefonos'].extend(datos_contacto['telefonos'])
            
            # Extraer redes sociales
            for link in soup.find_all('a', href=True):
                href = link['href']
                if 'linkedin.com' in href:
                    resultado['linkedin'] = href
                elif 'facebook.com' in href:
                    resultado['facebook'] = href
                elif 'twitter.com' in href or 'x.com' in href:
                    resultado['twitter'] = href
                elif 'instagram.com' in href:
                    resultado['instagram'] = href
            
            # Eliminar duplicados
            resultado['emails'] = list(set(resultado['emails']))[:3]
            resultado['telefonos'] = list(set(resultado['telefonos']))[:3]
            
            resultado['exito'] = True
            
            logger.info(f" Scraped: {len(resultado['emails'])} emails, {len(resultado['telefonos'])} teléfonos")
        else:
            logger.warning(f"HTTP {response.status_code}: {url}")
            
    except requests.exceptions.Timeout:
        logger.warning(f"Timeout: {url}")
    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
    
    return resultado

def enriquecer_empresa_b2b(empresa: Dict) -> Dict:
    """
    Enriquece datos de empresa con web scraping si tiene sitio web
    """
    if not empresa or not isinstance(empresa, dict):
        logger.error("Empresa inválida en enriquecer_empresa_b2b")
        return empresa or {}
    
    website = empresa.get('website')
    if not website or not isinstance(website, str) or not website.strip():
        return empresa
    
    # Validar que website sea una URL válida básica
    try:
        parsed = urlparse(website if website.startswith('http') else f'https://{website}')
        if not parsed.netloc:
            logger.warning(f"Website inválido: {website}")
            return empresa
    except Exception as e:
        logger.warning(f"Error validando website {website}: {e}")
        return empresa
    
    # Si ya tiene email y teléfono, podemos saltarlo para ser más rápidos
    if empresa.get('email') and empresa.get('telefono'):
        logger.info(f" {empresa.get('nombre')} ya tiene contacto completo")
        return empresa
    
    # Scrapear sitio web
    datos_scraped = scrapear_empresa_b2b(website)
    
    # Actualizar solo si están vacíos
    if not empresa.get('email') and datos_scraped['emails']:
        empresa['email'] = datos_scraped['emails'][0]
    
    if not empresa.get('telefono') and datos_scraped['telefonos']:
        empresa['telefono'] = datos_scraped['telefonos'][0]
    
    # Agregar redes sociales
    empresa['linkedin'] = datos_scraped.get('linkedin', '')
    empresa['facebook'] = datos_scraped.get('facebook', '')
    empresa['twitter'] = datos_scraped.get('twitter', '')
    
    return empresa

