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
    from .scraper import enriquecer_empresa_b2b
    from .social_scraper import enriquecer_con_redes_sociales
except ImportError:
    from scraper import enriquecer_empresa_b2b
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


def _enriquecer_empresa_individual(
    empresa: Dict,
    usar_cache: bool = True,
    guardar_en_cache: bool = True,
    guardar_en_db: bool = False
) -> Dict:
    """
    Enriquece una empresa individual con scraping de sitio web y redes sociales
    
    Args:
        empresa: Dict con datos de la empresa
        
    Returns:
        Dict con empresa enriquecida
    """
    nombre_empresa = empresa.get('nombre', 'Sin nombre')
    
    try:
        website = empresa.get('website')
        
        # Si ya tiene contacto completo, opcionalmente solo actualizar cache/db
        if empresa.get('email') and empresa.get('telefono'):
            if guardar_en_db:
                insertar_empresa(empresa)
            return empresa
        
        empresa_enriquecida = empresa.copy()
        
        # Intentar reutilizar cache reciente
        if usar_cache and website:
            cache_entry = obtener_cache_scraping(website)
            if cache_entry and _cache_es_valida(cache_entry):
                empresa_enriquecida = _aplicar_cache_a_empresa(empresa_enriquecida, cache_entry)
                if empresa_enriquecida.get('email') and empresa_enriquecida.get('telefono'):
                    logger.debug(f" {nombre_empresa}: datos recuperados desde cache")
                    if guardar_en_db:
                        insertar_empresa(empresa_enriquecida)
                    return empresa_enriquecida
        
        if not website:
            return empresa_enriquecida
        
        logger.info(f" Enriqueciendo: {nombre_empresa}")
        
        # Rate limit por dominio antes de golpear el sitio
        _rate_limited_request(website)
        
        inicio = time.time()
        try:
            empresa_enriquecida = enriquecer_empresa_b2b(empresa_enriquecida)
        except Exception as e:
            logger.warning(f" Error en scraping principal para {nombre_empresa}: {e}")
        
        duracion = time.time() - inicio
        if duracion > 15:
            logger.debug(f" {nombre_empresa}: scraping tomó {duracion:.1f}s")
        
        # Redes sociales (no crítico)
        sitio_web = empresa_enriquecida.get('website') or empresa_enriquecida.get('sitio_web')
        if sitio_web:
            try:
                _rate_limited_request(sitio_web)
                redes = enriquecer_con_redes_sociales(sitio_web, timeout=10)
                if redes:
                    empresa_enriquecida.update(redes)
            except Exception as e:
                logger.warning(f" Error extrayendo redes sociales para {nombre_empresa}: {e}")
        
        if guardar_en_cache:
            _guardar_cache_para_empresa(empresa_enriquecida)
        
        if guardar_en_db:
            insertar_empresa(empresa_enriquecida)
        
        return empresa_enriquecida
    
    except Exception as e:
        logger.error(f" Error crítico enriqueciendo empresa {nombre_empresa}: {e}")
        return empresa


def enriquecer_empresas_paralelo(
    empresas: List[Dict],
    max_workers: Optional[int] = None,
    timeout_por_empresa: int = 20
) -> List[Dict]:
    """
    Enriquece múltiples empresas con paralelismo optimizado y enriquecimiento diferido.
    """
    # Validar entrada
    if not empresas:
        return []
    
    if not isinstance(empresas, list):
        logger.error(f"empresas debe ser una lista, recibido: {type(empresas)}")
        return []
    
    pendientes = [
        (idx, empresa)
        for idx, empresa in enumerate(empresas)
        if empresa.get('website') and (not empresa.get('email') or not empresa.get('telefono'))
    ]
    
    if not pendientes:
        logger.info(" No hay empresas que necesiten scraping")
        return empresas
    
    logger.debug(f" Timeout objetivo por empresa: {timeout_por_empresa}s")
    max_workers = _resolver_max_workers(len(pendientes), max_workers)
    sincronas_limit = SYNC_BATCH_LIMIT if SYNC_BATCH_LIMIT > 0 else len(pendientes)
    sincronas = pendientes[:sincronas_limit]
    diferidas = pendientes[sincronas_limit:]
    
    if diferidas:
        logger.info(f" {len(diferidas)} empresas se encolarán para enriquecimiento diferido")
        _programar_enriquecimiento_diferido([empresa for _, empresa in diferidas])
    
    if not sincronas:
        return empresas
    
    empresas_enriquecidas = list(empresas)
    start_time = time.time()
    errores = 0
    
    logger.info(
        f" Enriqueciendo {len(sincronas)} empresas en paralelo inmediato (max {max_workers} workers)"
    )
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_idx = {
            executor.submit(_enriquecer_empresa_individual, empresa): idx
            for idx, empresa in sincronas
        }
        
        completadas = 0
        for future in as_completed(future_to_idx):
            idx_original = future_to_idx[future]
            completadas += 1
            
            try:
                empresa_enriquecida = future.result()
                if empresa_enriquecida:
                    empresas_enriquecidas[idx_original] = empresa_enriquecida
            except Exception as e:
                nombre_empresa = empresas[idx_original].get('nombre', 'Sin nombre')
                logger.error(f" Error procesando {nombre_empresa}: {e}")
                errores += 1
            
            if completadas % 10 == 0 or completadas == 1:
                porcentaje = (completadas / len(sincronas)) * 100
                logger.info(f" Progreso: {completadas}/{len(sincronas)} ({porcentaje:.1f}%) empresas sincronas")
    
    elapsed_time = time.time() - start_time
    exitosas = len(sincronas) - errores
    
    logger.info(
        f" Scraping sincrono completado: {len(sincronas)} empresas en {elapsed_time:.2f}s "
        f"({len(sincronas)/elapsed_time:.2f} empresas/seg)"
    )
    if errores > 0:
        logger.warning(f" {errores} empresas tuvieron errores durante el scraping inmediato")
    if diferidas:
        logger.info(" Enriquecimiento diferido ejecutándose en background")
    
    return empresas_enriquecidas

