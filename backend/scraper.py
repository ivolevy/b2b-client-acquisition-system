"""
Web Scraper enfocado en extracción B2B de datos de contacto empresarial
Mejorado para encontrar emails y teléfonos corporativos
"""

import requests
from bs4 import BeautifulSoup
import re
import logging
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse, urljoin
import time
from urllib.robotparser import RobotFileParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScraperSession:
    """Session handling with connection pooling and robots.txt caching"""
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; B2BDataCollectorBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        })
        self._robots_cache = {}

    def check_robots(self, url: str) -> bool:
        """Verifica robots.txt con cache por dominio"""
        try:
            parsed = urlparse(url)
            if not parsed.netloc: return False
            
            domain = parsed.netloc
            if domain in self._robots_cache:
                return self._robots_cache[domain].can_fetch("B2BDataCollectorBot/1.0", url)
            
            robots_url = f"{parsed.scheme}://{domain}/robots.txt"
            rp = RobotFileParser()
            rp.set_url(robots_url)
            try:
                # Usar la sesión para leer robots.txt también
                resp = self.session.get(robots_url, timeout=5)
                if resp.status_code == 200:
                    rp.parse(resp.text.splitlines())
                else:
                    return True # Permitir si no hay robots.txt
            except:
                return True
                
            self._robots_cache[domain] = rp
            return rp.can_fetch("B2BDataCollectorBot/1.0", url)
        except Exception as e:
            logger.warning(f"Error robots.txt para {url}: {e}")
            return True

    def get_soup(self, url: str, timeout: int = 10) -> Optional[BeautifulSoup]:
        """Obtiene BeautifulSoup de una URL usando el pool de la sesión"""
        try:
            response = self.session.get(url, timeout=timeout, allow_redirects=True)
            if response.status_code == 200:
                return BeautifulSoup(response.content, 'html.parser')
            return None
        except Exception as e:
            logger.debug(f"Error obteniendo {url}: {e}")
            return None

def check_robots_txt(url: str) -> bool:
    """Legacy wrapper - recomienda usar ScraperSession"""
    return ScraperSession().check_robots(url)

def extraer_emails_b2b(soup: BeautifulSoup, text: str) -> List[str]:
    """Extrae emails corporativos priorizando contactos comerciales"""
    emails = []
    
    # Buscar en enlaces mailto
    for link in soup.find_all('a', href=re.compile(r'^mailto:')):
        email = link['href'].replace('mailto:', '').split('?')[0].strip()
        emails.append(email)
    
    # Buscar en texto con patrón mejorado (soporta formatos comunes de ofuscación simple)
    patrones_email = [
        r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b',
        r'\b[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}\b', # [at] format
    ]
    
    for patron in patrones_email:
        found = re.findall(patron, text)
        for e in found:
            emails.append(e.replace(' [at] ', '@').replace(' ', '').lower())
    
    # Priorizar emails corporativos
    emails_validos = []
    for email in set(emails):
        email = email.lower().strip()
        if any(x in email for x in ['noreply', 'no-reply', 'example', 'test', 'spam', 'domain.com']):
            continue
        
        prioridad = 0
        if any(x in email for x in ['contacto', 'contact', 'info', 'ventas', 'sales', 'comercial', 'hola', 'hello']):
            prioridad = 10
        elif any(x in email for x in ['admin', 'director', 'gerente', 'ceo', 'presupuestos', 'cotizacion']):
            prioridad = 5
        
        emails_validos.append((prioridad, email))
    
    emails_validos.sort(key=lambda x: x[0], reverse=True)
    return [email for _, email in emails_validos[:5]]

def extraer_telefonos_b2b(soup: BeautifulSoup, text: str) -> List[str]:
    """Extrae teléfonos corporativos incluyendo WhatsApp"""
    telefonos = []
    
    # 1. Enlaces tel:
    for link in soup.find_all('a', href=re.compile(r'^tel:')):
        telefono = link['href'].replace('tel:', '').strip()
        telefonos.append(telefono)
    
    # 2. Enlaces de WhatsApp (wa.me, api.whatsapp.com)
    for link in soup.find_all('a', href=re.compile(r'wa\.me|whatsapp\.com/send')):
        href = link['href']
        # Extraer número del href
        match = re.search(r'phone=(\d+)', href) or re.search(r'wa\.me/(\d+)', href)
        if match:
            telefonos.append(match.group(1))

    # 3. Patrones de texto (Argentina y formatos globales)
    patrones = [
        r'\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}', # General
        r'\d{2,4}\s*\d{4}[-.\s]?\d{4}', # Argentina Fijos
        r'11\s*\d{4}[-.\s]?\d{4}', # Buenos Aires Celulares
        r'0?8\d{2}[-.\s]?\d{3}[-.\s]?\d{4}', # 0800 / 0810
    ]
    
    for patron in patrones:
        found = re.findall(patron, text)
        for f in found:
            # Limpiar para validar largo
            digitos = re.sub(r'\D', '', f)
            if 7 <= len(digitos) <= 15:
                telefonos.append(f.strip())
    
    # Deduplicar y limpiar
    telefonos_limpios = []
    vistos = set()
    for tel in telefonos:
        digitos = re.sub(r'\D', '', tel)
        if digitos and digitos not in vistos:
            telefonos_limpios.append(tel.strip())
            vistos.add(digitos)
            
    return telefonos_limpios[:5]

def buscar_en_paginas_adicionales(base_url: str, soup: BeautifulSoup, session: Optional[ScraperSession] = None) -> Dict:
    """Busca páginas de contacto, nosotros y sucursales"""
    if not session: session = ScraperSession()
    urls_a_escanear = []
    
    keywords_contacto = [
        'contact', 'contacto', 'about', 'nosotros', 'donde', 'sucursal', 
        'ubicacion', 'quienes', 'empresa', 'info', 'escribinos', 'ayuda'
    ]
    
    for link in soup.find_all('a', href=True):
        href = link['href'].lower()
        texto = link.get_text().lower()
        
        if any(k in href or k in texto for k in keywords_contacto):
            full_url = urljoin(base_url, link['href'])
            # Evitar repetir la base_url y filtrar dominios externos
            if full_url != base_url and urlparse(full_url).netloc == urlparse(base_url).netloc:
                urls_a_escanear.append(full_url)
    
    # Tomar las 3 más prometedoras para no sobrecargar
    urls_a_escanear = list(dict.fromkeys(urls_a_escanear))[:3]
    
    emails_totales = []
    telefonos_totales = []
    
    for url in urls_a_escanear:
        logger.info(f"  Escanenando sub-página: {url}")
        soup_sub = session.get_soup(url, timeout=10)
        if soup_sub:
            text_sub = soup_sub.get_text()
            emails_totales.extend(extraer_emails_b2b(soup_sub, text_sub))
            telefonos_totales.extend(extraer_telefonos_b2b(soup_sub, text_sub))
            
    return {
        'emails': list(set(emails_totales)),
        'telefonos': list(set(telefonos_totales))
    }

def scrapear_empresa_b2b(url: str, session: Optional[ScraperSession] = None) -> Dict:
    """Scrapea sitio web empresarial persistente o efímero"""
    if not session: session = ScraperSession()
    resultado = {
        'emails': [], 'telefonos': [], 'linkedin': '', 'facebook': '',
        'twitter': '', 'instagram': '', 'exito': False
    }
    
    if not url: return resultado
    if not url.startswith('http'): url = 'https://' + url
    
    try:
        if not session.check_robots(url):
            logger.warning(f"Bloqueado por robots: {url}")
            return resultado
        
        logger.info(f"Scrapeando: {url}")
        soup = session.get_soup(url)
        
        if soup:
            text = soup.get_text()
            resultado['emails'] = extraer_emails_b2b(soup, text)
            resultado['telefonos'] = extraer_telefonos_b2b(soup, text)
            
            if not resultado['emails'] or not resultado['telefonos']:
                datos_contacto = buscar_en_paginas_adicionales(url, soup, session)
                resultado['emails'] = list(set(resultado['emails'] + datos_contacto['emails']))
                resultado['telefonos'] = list(set(resultado['telefonos'] + datos_contacto['telefonos']))
            
            for link in soup.find_all('a', href=True):
                href = link['href']
                if 'linkedin.com' in href: resultado['linkedin'] = href
                elif 'facebook.com' in href: resultado['facebook'] = href
                elif 'twitter.com' in href or 'x.com' in href: resultado['twitter'] = href
                elif 'instagram.com' in href: resultado['instagram'] = href
            
            resultado['emails'] = resultado['emails'][:3]
            resultado['telefonos'] = resultado['telefonos'][:3]
            resultado['exito'] = True
    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
    
    return resultado

def enriquecer_empresa_b2b(empresa: Dict, session: Optional[ScraperSession] = None) -> Dict:
    """Enriquece datos con web scraping"""
    website = empresa.get('website')
    if not website or (empresa.get('email') and empresa.get('telefono')):
        return empresa
    
    datos_scraped = scrapear_empresa_b2b(website, session)
    if not empresa.get('email') and datos_scraped['emails']:
        empresa['email'] = datos_scraped['emails'][0]
    if not empresa.get('telefono') and datos_scraped['telefonos']:
        empresa['telefono'] = datos_scraped['telefonos'][0]
    
    empresa.update({
        'linkedin': datos_scraped.get('linkedin', ''),
        'facebook': datos_scraped.get('facebook', ''),
        'twitter': datos_scraped.get('twitter', '')
    })
    return empresa

