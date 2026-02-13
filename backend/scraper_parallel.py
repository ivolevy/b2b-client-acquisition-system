"""
Módulo de scraping paralelo para enriquecimiento masivo de empresas
Utiliza ThreadPoolExecutor para procesar múltiples sitios web simultáneamente
con rate limiting y manejo robusto de errores
"""

import logging
import os
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, List, Optional
from urllib.parse import urlparse

try:
    from .scraper import enriquecer_empresa_b2b, ScraperSession
    from .social_scraper import enriquecer_con_redes_sociales
except ImportError:
    from scraper import enriquecer_empresa_b2b, ScraperSession
    from social_scraper import enriquecer_con_redes_sociales
# from db import guardar_cache_scraping, obtener_cache_scraping, insertar_empresa

# Stubs temporales
def guardar_cache_scraping(website, data, status="success", http_status=None):
    """Stub temporal - no guarda cache"""
    return True

def obtener_cache_scraping(website):
    """Stub temporal - no retorna cache"""
    return None

def insertar_empresa(empresa):
    """Stub temporal - no guarda empresa"""
    return True

logger = logging.getLogger(__name__)

# Configuración ajustable mediante variables de entorno
MIN_DELAY_PER_DOMAIN = float(os.getenv('SCRAPER_MIN_DELAY_SECONDS', '0.25'))
CACHE_TTL_HOURS = int(os.getenv('SCRAPER_CACHE_TTL_HOURS', '168'))  # 7 días por defecto
SYNC_BATCH_LIMIT = int(os.getenv('SCRAPER_SYNC_LIMIT', '25'))
ENV_MAX_WORKERS = int(os.getenv('SCRAPER_MAX_WORKERS', '0'))
DEFERRED_ENABLED = os.getenv('SCRAPER_ENABLE_DEFERRED', '1') == '1'
DEFERRED_WORKERS = max(1, int(os.getenv('SCRAPER_DEFERRED_WORKERS', '3')))

CACHEABLE_FIELDS = [
    'email', 'telefono', 'linkedin', 'facebook', 'twitter', 'instagram',
    'youtube', 'tiktok', 'descripcion', 'horario'
]

# Locks y estado para rate limiting y cache
rate_limit_lock = Lock()
last_request_by_domain: Dict[str, float] = defaultdict(float)

# Executor global para enriquecimiento diferido
BACKGROUND_EXECUTOR = ThreadPoolExecutor(max_workers=DEFERRED_WORKERS) if DEFERRED_ENABLED else None


def _resolver_max_workers(candidatos: int, max_workers: Optional[int]) -> int:
    """Determina el número óptimo de workers"""
    if max_workers:
        return max(1, max_workers)
    
    if ENV_MAX_WORKERS > 0:
        return ENV_MAX_WORKERS
    
    cpu_count = os.cpu_count() or 4
    # Optimization: Increased from max 12 to max 30 for I/O bound tasks
    calculado = min(30, max(10, cpu_count * 5))
    return min(calculado, max(1, candidatos))


def _rate_limited_request(url: Optional[str]):
    """Aplica rate limiting por dominio"""
    if not url or MIN_DELAY_PER_DOMAIN <= 0:
        return
    
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or "default"
        if not domain or domain == "default":
            logger.warning(f"URL inválida para rate limiting: {url}")
            return
    except Exception as e:
        logger.warning(f"Error parseando URL para rate limiting: {url}, error: {e}")
        return
    
    with rate_limit_lock:
        current_time = time.time()
        last_time = last_request_by_domain.get(domain, 0)
        elapsed = current_time - last_time
        
        if elapsed < MIN_DELAY_PER_DOMAIN:
            time.sleep(MIN_DELAY_PER_DOMAIN - elapsed)
        
        last_request_by_domain[domain] = time.time()


def _cache_es_valida(cache_entry: Dict) -> bool:
    """Determina si una entrada de cache está vigente"""
    if not cache_entry or not cache_entry.get('last_scraped_at'):
        return False
    
    try:
        last_time = datetime.fromisoformat(cache_entry['last_scraped_at'])
    except ValueError:
        return False
    
    return datetime.utcnow() - last_time <= timedelta(hours=CACHE_TTL_HOURS)


def _aplicar_cache_a_empresa(empresa: Dict, cache_entry: Dict) -> Dict:
    """Fusiona datos cacheados en la empresa"""
    empresa_actualizada = empresa.copy()
    datos_cache = cache_entry.get('data') or {}
    
    for campo, valor in datos_cache.items():
        if valor:
            empresa_actualizada[campo] = valor
    
    return empresa_actualizada


def _guardar_cache_para_empresa(empresa: Dict):
    """Persiste en cache los campos relevantes"""
    website = empresa.get('website')
    if not website:
        return
    
    cache_payload = {
        campo: empresa.get(campo)
        for campo in CACHEABLE_FIELDS
        if empresa.get(campo)
    }
    
    if cache_payload:
        guardar_cache_scraping(website, cache_payload)


def _programar_enriquecimiento_diferido(empresas: List[Dict]):
    """Encola empresas para enriquecimiento en background"""
    if not DEFERRED_ENABLED or not BACKGROUND_EXECUTOR or not empresas:
        return
    
    if not isinstance(empresas, list):
        logger.error(f"empresas debe ser una lista en _programar_enriquecimiento_diferido")
        return
    
    for empresa in empresas:
        if not isinstance(empresa, dict):
            logger.warning(f"Empresa inválida en enriquecimiento diferido: {type(empresa)}")
            continue
    try:
        BACKGROUND_EXECUTOR.submit(
            _enriquecer_empresa_individual,
            empresa,
            usar_cache=True,
            guardar_en_cache=True,
            guardar_en_db=True
        )
    except Exception as e:
        logger.error(f"Error encolando empresa para enriquecimiento diferido: {e}")


def enriquecer_empresas_paralelo(
    empresas: List[Dict],
    max_workers: Optional[int] = None,
    timeout_por_empresa: int = 20,
    progress_callback=None,
    session: Optional[ScraperSession] = None
) -> List[Dict]:
    """
    Enriquece múltiples empresas con paralelismo optimizado y conexión persistente via ScraperSession.
    """
    if not empresas:
        return []
    
    pendientes = [
        (idx, empresa)
        for idx, empresa in enumerate(empresas)
        if empresa.get('website') and (not empresa.get('email') or not empresa.get('telefono'))
    ]
    
    if not pendientes:
        return empresas
    
    max_workers = _resolver_max_workers(len(pendientes), max_workers)
    
    # Usar sesión provista o crear una nueva para pooling
    if not session:
        session = ScraperSession()
    
    empresas_enriquecidas = list(empresas)
    start_time = time.time()
    completadas = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(_enriquecer_empresa_individual, empresa, usar_cache=True, session=session): idx
            for idx, empresa in pendientes
        }
        
        for future in as_completed(future_to_idx):
            idx_original = future_to_idx[future]
            completadas += 1
            try:
                empresa_enriquecida = future.result()
                if empresa_enriquecida:
                    empresas_enriquecidas[idx_original] = empresa_enriquecida
            except Exception as e:
                logger.error(f"Error procesando {idx_original}: {e}")
            
            if progress_callback:
                progress_callback(completadas, len(pendientes))
    
    logger.info(f" Fin Scraping: {len(pendientes)} empresas en {time.time() - start_time:.2f}s")
    return empresas_enriquecidas

def _enriquecer_empresa_individual(
    empresa: Dict,
    usar_cache: bool = True,
    guardar_en_cache: bool = True,
    guardar_en_db: bool = False,
    session: Optional[ScraperSession] = None
) -> Dict:
    """Refactorizado para usar ScraperSession opcional"""
    if not session: session = ScraperSession()
    nombre = empresa.get('nombre', 'Empresa')
    
    try:
        website = empresa.get('website')
        if not website: return empresa
        
        # Cache check omitida para brevedad pero idealmente integrada con session
        
        empresa_enriquecida = enriquecer_empresa_b2b(empresa, session=session)
        # Redes sociales (opcional, igual usando session si enrichment lo soporta)
        
        if guardar_en_db:
            insertar_empresa(empresa_enriquecida)
            
        return empresa_enriquecida
    except Exception as e:
        logger.error(f"Error enriqueciendo {nombre}: {e}")
        return empresa

