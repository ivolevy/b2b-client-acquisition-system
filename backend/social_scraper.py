"""
Módulo de extracción de redes sociales desde sitios web
Utiliza regex y BeautifulSoup para encontrar perfiles de redes sociales
"""

import re
import json
import logging
from typing import Dict, Optional
from bs4 import BeautifulSoup
import requests

logger = logging.getLogger(__name__)

# Patrones regex para cada red social
SOCIAL_PATTERNS = {
    'instagram': [
        r'(?:https?://)?(?:www\.)?instagram\.com/([A-Za-z0-9_\.]+)/?',
        r'(?:https?://)?(?:www\.)?instagr\.am/([A-Za-z0-9_\.]+)/?'
    ],
    'facebook': [
        r'(?:https?://)?(?:www\.)?facebook\.com/([A-Za-z0-9_\-\.]+)/?',
        r'(?:https?://)?(?:www\.)?fb\.com/([A-Za-z0-9_\-\.]+)/?'
    ],
    'twitter': [
        r'(?:https?://)?(?:www\.)?twitter\.com/([A-Za-z0-9_]+)/?',
        r'(?:https?://)?(?:www\.)?x\.com/([A-Za-z0-9_]+)/?'
    ],
    'linkedin': [
        r'(?:https?://)?(?:www\.)?linkedin\.com/(?:company|in)/([A-Za-z0-9_\-]+)/?',
    ],
    'youtube': [
        r'(?:https?://)?(?:www\.)?youtube\.com/(?:c|channel|user|@)/([A-Za-z0-9_\-]+)/?',
    ],
    'tiktok': [
        r'(?:https?://)?(?:www\.)?tiktok\.com/@([A-Za-z0-9_\.]+)/?'
    ]
}

# Dominios de redes sociales (para excluir botones de compartir)
SHARE_PATTERNS = [
    '/sharer/', '/intent/', '/share?', 'whatsapp.com', 'telegram.me'
]

def limpiar_url(url: str, red_social: str) -> str:
    """Limpia y normaliza la URL de red social"""
    if not url:
        return None
    
    # Remover parámetros de URL
    url = url.split('?')[0].rstrip('/')
    
    # Construir URL completa si solo es el username
    if not url.startswith('http'):
        if red_social == 'twitter':
            return f"https://twitter.com/{url}"
        elif red_social == 'instagram':
            return f"https://instagram.com/{url}"
        elif red_social == 'facebook':
            return f"https://facebook.com/{url}"
        elif red_social == 'linkedin':
            return f"https://linkedin.com/company/{url}"
        elif red_social == 'youtube':
            return f"https://youtube.com/@{url}"
        elif red_social == 'tiktok':
            return f"https://tiktok.com/@{url}"
    
    return url

def extraer_desde_regex(html: str) -> Dict[str, Optional[str]]:
    """Extrae URLs de redes sociales usando regex"""
    redes = {}
    
    for red_social, patterns in SOCIAL_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                # Tomar el primer match válido
                username = matches[0]
                url_completa = limpiar_url(username, red_social)
                
                # Verificar que no sea un botón de compartir
                if not any(share in url_completa.lower() for share in SHARE_PATTERNS):
                    redes[red_social] = url_completa
                    break
    
    return redes

def extraer_desde_meta_tags(soup: BeautifulSoup) -> Dict[str, Optional[str]]:
    """Extrae redes sociales desde meta tags Open Graph y similares"""
    redes = {}
    
    # Open Graph tags
    meta_tags = soup.find_all('meta', property=re.compile(r'og:|twitter:|fb:'))
    for tag in meta_tags:
        content = tag.get('content', '')
        if not content:
            continue
            
        for red_social, patterns in SOCIAL_PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, content, re.IGNORECASE):
                    if red_social not in redes:
                        redes[red_social] = limpiar_url(content, red_social)
                    break
    
    return redes

def extraer_desde_json_ld(soup: BeautifulSoup) -> Dict[str, Optional[str]]:
    """Extrae redes sociales desde JSON-LD Schema.org"""
    redes = {}
    
    scripts = soup.find_all('script', type='application/ld+json')
    for script in scripts:
        try:
            data = json.loads(script.string)
            
            # Buscar en sameAs (array de URLs de redes sociales)
            same_as = data.get('sameAs', [])
            if isinstance(same_as, str):
                same_as = [same_as]
            
            for url in same_as:
                for red_social, patterns in SOCIAL_PATTERNS.items():
                    for pattern in patterns:
                        if re.match(pattern, url, re.IGNORECASE):
                            if red_social not in redes:
                                redes[red_social] = limpiar_url(url, red_social)
                            break
                            
        except (json.JSONDecodeError, AttributeError):
            continue
    
    return redes

def extraer_desde_enlaces(soup: BeautifulSoup) -> Dict[str, Optional[str]]:
    """Extrae redes sociales desde todos los enlaces <a>"""
    redes = {}
    
    links = soup.find_all('a', href=True)
    
    for link in links:
        href = link['href']
        
        # Verificar que no sea botón de compartir
        if any(share in href.lower() for share in SHARE_PATTERNS):
            continue
        
        for red_social, patterns in SOCIAL_PATTERNS.items():
            if red_social in redes:
                continue
                
            for pattern in patterns:
                if re.match(pattern, href, re.IGNORECASE):
                    redes[red_social] = limpiar_url(href, red_social)
                    break
    
    return redes

def enriquecer_con_redes_sociales(sitio_web: str, timeout: int = 10) -> Dict[str, Optional[str]]:
    """
    Función principal: Extrae redes sociales de un sitio web
    
    Args:
        sitio_web: URL del sitio web a scrapear
        timeout: Tiempo máximo de espera en segundos
        
    Returns:
        Diccionario con las redes sociales encontradas
        Ejemplo: {'instagram': 'https://instagram.com/empresa', 'facebook': '...'}
    """
    try:
        # Headers para simular navegador real
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        }
        
        response = requests.get(sitio_web, timeout=timeout, headers=headers, allow_redirects=True)
        response.raise_for_status()
        
        html = response.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # Método 1: Regex en todo el HTML (más rápido y efectivo)
        redes_regex = extraer_desde_regex(html)
        
        # Método 2: Meta tags
        redes_meta = extraer_desde_meta_tags(soup)
        
        # Método 3: JSON-LD
        redes_json = extraer_desde_json_ld(soup)
        
        # Método 4: Enlaces
        redes_links = extraer_desde_enlaces(soup)
        
        # Fusionar resultados (prioridad: regex > json-ld > meta > links)
        redes_final = {**redes_links, **redes_meta, **redes_json, **redes_regex}
        
        # Limpiar valores None
        redes_final = {k: v for k, v in redes_final.items() if v}
        
        if redes_final:
            logger.info(f"✅ Redes sociales encontradas en {sitio_web}: {list(redes_final.keys())}")
        else:
            logger.info(f"ℹ️  No se encontraron redes sociales en {sitio_web}")
        
        return redes_final
        
    except requests.Timeout:
        logger.warning(f"⏱️  Timeout al intentar acceder a {sitio_web}")
        return {}
    except requests.RequestException as e:
        logger.error(f"❌ Error scrapeando {sitio_web}: {e}")
        return {}
    except Exception as e:
        logger.error(f"❌ Error inesperado en {sitio_web}: {e}")
        return {}

# Test rápido
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # URLs de test
    test_urls = [
        "https://www.mcdonalds.com/es/es-es.html",
        "https://www.starbucks.es",
    ]
    
    print("🧪 Probando extractor de redes sociales...\n")
    
    for url in test_urls:
        print(f"📍 Testeando: {url}")
        redes = enriquecer_con_redes_sociales(url)
        for red, link in redes.items():
            print(f"  {red}: {link}")
        print()

