"""
Módulo de scraping paralelo para enriquecimiento masivo de empresas
Utiliza ThreadPoolExecutor para procesar múltiples sitios web simultáneamente
con rate limiting y manejo robusto de errores
"""

import logging
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from threading import Lock

from scraper import enriquecer_empresa_b2b
from social_scraper import enriquecer_con_redes_sociales

logger = logging.getLogger(__name__)

# Rate limiting: delay mínimo entre requests (segundos)
MIN_DELAY_BETWEEN_REQUESTS = 0.5

# Lock para sincronizar rate limiting
rate_limit_lock = Lock()
last_request_time = 0


def _rate_limited_request():
    """Aplica rate limiting entre requests"""
    global last_request_time
    
    with rate_limit_lock:
        current_time = time.time()
        time_since_last = current_time - last_request_time
        
        if time_since_last < MIN_DELAY_BETWEEN_REQUESTS:
            sleep_time = MIN_DELAY_BETWEEN_REQUESTS - time_since_last
            time.sleep(sleep_time)
        
        last_request_time = time.time()


def _enriquecer_empresa_individual(empresa: Dict) -> Dict:
    """
    Enriquece una empresa individual con scraping de sitio web y redes sociales
    
    Args:
        empresa: Dict con datos de la empresa
        
    Returns:
        Dict con empresa enriquecida
    """
    nombre_empresa = empresa.get('nombre', 'Sin nombre')
    
    try:
        # Si ya tiene email y teléfono, podemos saltarlo para ser más rápidos
        if empresa.get('email') and empresa.get('telefono'):
            logger.debug(f" {nombre_empresa} ya tiene contacto completo, saltando scraping")
            return empresa
        
        # Aplicar rate limiting para evitar bloqueos
        _rate_limited_request()
        
        # Scrapear sitio web para emails y teléfonos
        if empresa.get('website'):
            logger.info(f" Enriqueciendo: {nombre_empresa}")
            
            # Crear copia para no modificar el original en caso de error
            empresa_enriquecida = empresa.copy()
            
            try:
                # Enriquecer con datos de scraping (emails, teléfonos)
                empresa_enriquecida = enriquecer_empresa_b2b(empresa_enriquecida)
            except Exception as e:
                logger.warning(f" Error en scraping principal para {nombre_empresa}: {e}")
                # Continuar con la empresa original si falla el scraping principal
            
            # Extraer redes sociales (separado para que un error no afecte al otro)
            sitio_web = empresa_enriquecida.get('website') or empresa_enriquecida.get('sitio_web')
            if sitio_web:
                try:
                    redes = enriquecer_con_redes_sociales(sitio_web, timeout=10)
                    if redes:
                        empresa_enriquecida.update(redes)  # Agregar instagram, facebook, twitter, etc.
                except Exception as e:
                    logger.warning(f" Error extrayendo redes sociales para {nombre_empresa}: {e}")
                    # No es crítico, continuar sin redes sociales
            
            return empresa_enriquecida
        else:
            # Sin website, retornar sin modificar
            return empresa
        
    except Exception as e:
        logger.error(f" Error crítico enriqueciendo empresa {nombre_empresa}: {e}")
        # Retornar empresa original sin modificar en caso de error crítico
        return empresa


def enriquecer_empresas_paralelo(
    empresas: List[Dict],
    max_workers: int = 5,
    timeout_por_empresa: int = 30
) -> List[Dict]:
    """
    Enriquece múltiples empresas en paralelo usando ThreadPoolExecutor
    
    Args:
        empresas: Lista de dicts con datos de empresas
        max_workers: Número máximo de threads paralelos (default: 5)
        timeout_por_empresa: Timeout máximo por empresa en segundos (default: 30)
        
    Returns:
        Lista de empresas enriquecidas (mismo orden que la entrada)
    """
    if not empresas:
        return []
    
    # Filtrar empresas que necesitan scraping
    empresas_a_enriquecer = []
    empresas_indices = []
    
    for idx, empresa in enumerate(empresas):
        # Solo scrapear si tiene website y le faltan datos
        if empresa.get('website'):
            if not empresa.get('email') or not empresa.get('telefono'):
                empresas_a_enriquecer.append(empresa)
                empresas_indices.append(idx)
        else:
            # Sin website, no necesita scraping
            empresas_indices.append(None)
    
    if not empresas_a_enriquecer:
        logger.info(" No hay empresas que necesiten scraping")
        return empresas
    
    logger.info(f" Enriqueciendo {len(empresas_a_enriquecer)} empresas en paralelo (max {max_workers} workers)")
    
    # Crear copia de la lista original para mantener el orden
    empresas_enriquecidas = empresas.copy()
    
    # Procesar en paralelo
    resultados = {}
    start_time = time.time()
    errores = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Enviar todas las tareas
        future_to_empresa = {
            executor.submit(_enriquecer_empresa_individual, empresa): idx
            for idx, empresa in enumerate(empresas_a_enriquecer)
        }
        
        # Procesar resultados conforme se completan
        completadas = 0
        for future in as_completed(future_to_empresa):
            idx_original = future_to_empresa[future]
            completadas += 1
            
            try:
                empresa_enriquecida = future.result(timeout=timeout_por_empresa)
                resultados[idx_original] = empresa_enriquecida
                
                # Log de progreso cada 10 empresas o al inicio
                if completadas % 10 == 0 or completadas == 1:
                    porcentaje = (completadas / len(empresas_a_enriquecer)) * 100
                    logger.info(f" Progreso: {completadas}/{len(empresas_a_enriquecer)} empresas procesadas ({porcentaje:.1f}%)")
                    
            except TimeoutError:
                nombre_empresa = empresas_a_enriquecer[idx_original].get('nombre', 'Sin nombre')
                logger.warning(f" Timeout procesando {nombre_empresa} (>{timeout_por_empresa}s)")
                errores += 1
                # Mantener empresa original en caso de timeout
                resultados[idx_original] = empresas_a_enriquecer[idx_original]
            except Exception as e:
                nombre_empresa = empresas_a_enriquecer[idx_original].get('nombre', 'Sin nombre')
                logger.error(f" Error procesando {nombre_empresa}: {e}")
                errores += 1
                # Mantener empresa original en caso de error
                resultados[idx_original] = empresas_a_enriquecer[idx_original]
    
    # Actualizar empresas enriquecidas en el orden correcto
    for idx_original, empresa_enriquecida in resultados.items():
        idx_lista = empresas_indices[idx_original]
        if idx_lista is not None:
            empresas_enriquecidas[idx_lista] = empresa_enriquecida
    
    elapsed_time = time.time() - start_time
    exitosas = len(empresas_a_enriquecer) - errores
    
    logger.info(f" Scraping paralelo completado: {len(empresas_a_enriquecer)} empresas en {elapsed_time:.2f}s "
                f"({len(empresas_a_enriquecer)/elapsed_time:.2f} empresas/seg)")
    if errores > 0:
        logger.warning(f" {errores} empresas tuvieron errores durante el scraping")
    logger.info(f" {exitosas} empresas enriquecidas exitosamente")
    
    return empresas_enriquecidas

