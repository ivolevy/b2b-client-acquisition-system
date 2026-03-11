import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
SEARCH_PROGRESS = {}

def update_search_progress(task_id, current, total, phase="scraping"):
    """
    Actualiza el progreso de una búsqueda en la base de datos Supabase
    """
    if not task_id:
        return
        
    if phase == "searching":
        percent = int((current / (total or 1)) * 15)
        msg = "Buscando prospectos en el área..."
    elif phase == "scraping":
        percent = 15 + int((current / (total or 1)) * 70)
        msg = f"Rastreando sitios web ({current}/{total})..."
    else: # finalizing
        percent = 85 + int((current / (total or 1)) * 15)
        msg = f"Finalizando y validando ({current}/{total})..."
    
    # Asegurar que no pasamos de 100 ni bajamos de 0
    percent = max(0, min(100, percent))
    
    # Actualizar en memoria local para compatibilidad
    global SEARCH_PROGRESS
    SEARCH_PROGRESS[task_id] = {
        "progress": percent,
        "message": msg,
        "percent": percent # Para compatibilidad con frontend que a veces usa percent
    }
    
    try:
        from backend.db_supabase import get_supabase_admin
        admin_client = get_supabase_admin()
        if admin_client:
            admin_client.table('search_tasks').update({
                'progress': percent,
                'message': msg,
                'updated_at': 'now()'
            }).eq('id', task_id).execute()
    except Exception as e:
        logger.error(f"Error actualizando progreso en Supabase para tarea {task_id}: {e}")

try:
    from backend.api.schemas import (
        BusquedaRubroRequest, BusquedaMultipleRequest, FiltroRequest,
        ExportRequest, ActualizarEstadoRequest, ActualizarNotasRequest
    )
except ImportError:
    try:
        from api.schemas import (
            BusquedaRubroRequest, BusquedaMultipleRequest, FiltroRequest,
            ExportRequest, ActualizarEstadoRequest, ActualizarNotasRequest
        )
    except ImportError:
        logger.error("No se pudieron cargar Schemas")

try:
    from backend.api.dependencies import get_current_admin
except ImportError:
    try:
        from api.dependencies import get_current_admin
    except ImportError:
        logger.error("No se pudo cargar get_current_admin")

try:
    from backend.db_supabase import (
        check_reset_monthly_credits, deduct_credits,
        insertar_empresa, 
        obtener_todas_empresas, buscar_empresas_multiples_rubros, buscar_empresas,
        obtener_estadisticas, limpiar_base_datos, get_supabase_admin,
        exportar_a_pdf
    )
except ImportError:
    try:
        from db_supabase import (
            check_reset_monthly_credits, deduct_credits,
            insertar_empresa, 
            obtener_todas_empresas, buscar_empresas_multiples_rubros, buscar_empresas,
            obtener_estadisticas, limpiar_base_datos, get_supabase_admin,
            exportar_a_pdf
        )
    except ImportError:
        logger.error("No se pudieron cargar funciones de db_supabase")


try:
    from backend.rubros_config import listar_rubros_disponibles, RUBROS_DISPONIBLES
except ImportError:
    try:
        from rubros_config import listar_rubros_disponibles, RUBROS_DISPONIBLES
    except ImportError:
        logger.error("No se pudo cargar rubros_config. Usando fallback vacío.")
        RUBROS_DISPONIBLES = {}
        def listar_rubros_disponibles(): return {}

try:
    from backend.google_places import google_client
except ImportError:
    try:
        from google_places import google_client
    except ImportError:
        logger.error("No se pudo cargar google_client")

try:
    from backend.lead_enricher import enriquecer_empresas_paralelo, ScraperSession
except ImportError:
    try:
        from lead_enricher import enriquecer_empresas_paralelo, ScraperSession
    except ImportError:
        logger.error("No se pudo cargar lead_enricher")

try:
    from backend.geocoding import calcular_distancia_km
except ImportError:
    try:
        from geocoding import calcular_distancia_km
    except ImportError:
        def calcular_distancia_km(*args): return None

try:
    from backend.ai_service import apply_smart_filter
except ImportError:
    try:
        from ai_service import apply_smart_filter
    except ImportError:
        logger.error("No se pudo cargar ai_service")

try:
    from backend.export_utils import exportar_a_csv, exportar_a_json
except ImportError:
    try:
        from export_utils import exportar_a_csv, exportar_a_json
    except ImportError:
        logger.error("No se pudo cargar export_utils")

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Leads"])

# --- Variables de estado locales para leads ---
_memoria_empresas = []
_empresa_counter = 0


@router.get("/api/buscar/progreso/{task_id}")
async def obtener_progreso_busqueda(task_id: str):
    """
    Obtiene el progreso actual de una búsqueda específica
    """
    global SEARCH_PROGRESS
    
    if not task_id:
        return {"progress": 0, "message": "ID de tarea inválido"}
        
    progreso = SEARCH_PROGRESS.get(task_id)
    
    if not progreso:
        # Si no existe, puede ser que ya terminó o nunca empezó
        # Asumimos 0 si es muy reciente, o verificamos si hay resultados
        return {"progress": 0, "message": "Iniciando..."}
        
    return progreso

@router.get("/api/rubros")
def obtener_rubros():
    """Lista todos los rubros disponibles para búsqueda"""
    rubros = listar_rubros_disponibles()
    
    if not rubros:
        rubros = {}
    
    return {
        "success": True,
        "total": len(rubros),
        "rubros": rubros,
        "ejemplo_uso": {
            "rubro": "construccion_arquitectura",
            "pais": "España",
            "ciudad": "Madrid"
        }
    }

@router.post("/api/buscar-stream")
async def buscar_por_rubro_stream(request: BusquedaRubroRequest):
    """
    Versión Streaming de búsqueda: envía prospectos en tiempo real
    usando Server-Sent Events (SSE).
    """
    logger.info(f"Iniciando búsqueda STREAM de rubro: {request.rubro}")
    
    task_id = request.task_id
    from backend.db_supabase import get_supabase_admin
    admin = get_supabase_admin()
    
    if task_id and admin:
        try:
            admin.table('search_tasks').insert({
                'id': task_id,
                'user_id': request.user_id,
                'status': 'processing',
                'progress': 0,
                'message': "Iniciando búsqueda stream..."
            }).execute()
        except Exception as e:
            logger.error(f"Error creando task_id {task_id}: {e}")

    try:
        from backend.validators import validar_empresa
    except ImportError:
        def validar_empresa(e): return True
        
    # 1. Validación de Créditos
    user_id = request.user_id
    if user_id and user_id != 'anonymous':
        check_reset_monthly_credits(user_id)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(status_code=402, detail=f"Créditos insuficientes. Balance: {deduction.get('current', 0)}")
            else:
                logger.error(f"Error sistémico en deducción de créditos: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Error en el sistema de créditos: {error_msg}")

    async def event_generator():
        seen_ids = set()
        all_candidates = []
        MAX_LEADS = 60
        
        # Centro de búsqueda para cálculo manual de distancia si falla el mapeo
        c_lat, c_lng = request.busqueda_centro_lat, request.busqueda_centro_lng
        
        rubro_obj = RUBROS_DISPONIBLES.get(request.rubro.lower())
        keywords = rubro_obj["keywords"] if rubro_obj and isinstance(rubro_obj, dict) else [request.rubro]
        
        if c_lat and c_lng:
            # Si tenemos coordenadas, no ensuciar la query con texto geográfico
            search_queries = [kw for kw in keywords]
        else:
            search_queries = [f"{kw} en {request.busqueda_ubicacion_nombre}" for kw in keywords]
        
        emitted_count = 0
        logger.info(f"Iniciando búsqueda stream optimizada para: {request.rubro} | Límite: {MAX_LEADS}")

        # Parsear bbox si viene como string
        google_bbox = None
        if request.bbox and isinstance(request.bbox, str):
            try:
                partes = request.bbox.split(',')
                if len(partes) == 4:
                    google_bbox = {
                        "south": float(partes[0]),
                        "west": float(partes[1]),
                        "north": float(partes[2]),
                        "east": float(partes[3])
                    }
            except Exception as e:
                logger.error(f"Error parseando bbox en stream: {e}")

        # Asegurar radio válido
        radius_m = (request.busqueda_radio_km * 1000) if request.busqueda_radio_km else None

        yield f"data: {json.dumps({'type': 'status', 'message': f'Buscando los {MAX_LEADS} mejores prospectos...'})}\n\n"

        # OPTIMIZACIÓN DE COSTO: 
        # No disparamos todas las keywords en paralelo con búsqueda recursiva,
        # esto causaba una explosión de llamadas (1 rubro -> 10 keywords -> 850+ calls).
        # Usamos solo la descripción principal y quizás 1-2 keywords clave.
        main_query = search_queries[0]
        extra_queries = search_queries[1:3] if len(search_queries) > 1 else []
        
        queries_to_run = [main_query] + extra_queries
        
        tasks = []
        for query in queries_to_run:
            tasks.append(google_client.search_all_places(
                query=query,
                rubro_nombre=request.rubro,
                rubro_key=request.rubro.lower(),
                lat=c_lat,
                lng=c_lng,
                radius=radius_m,
                bbox=google_bbox,
                max_total_results=40 # Aumentamos un poco por query ya que corremos menos queries
            ))
        
        try:
            results_lists = await asyncio.gather(*tasks)
            for r_list in results_lists:
                for r in r_list:
                    if r['google_id'] not in seen_ids:
                        # Asegurar distancia
                        dist = r.get('distancia_km')
                        if dist is None:
                            dist = google_client.calcular_distancia(c_lat, c_lng, r.get('latitud'), r.get('longitud'))
                            r['distancia_km'] = dist
                        
                        # FILTRO ESTRICTO DE RADIO
                        # Si el usuario especificó un radio, no queremos leads que lo superen (con un margen del 5% por precisión)
                        if request.busqueda_radio_km and dist:
                            if dist > (request.busqueda_radio_km * 1.05):
                                continue
                        
                        seen_ids.add(r['google_id'])
                        all_candidates.append(r)
            
            # --- PRIORIZACIÓN Y FILTRADO DE LEADS ---
            def lead_score(lead):
                score = 0
                if lead.get('email'): score += 500  # Prioridad máxima para emails
                if lead.get('telefono'): score += 50
                if lead.get('website'): score += 20
                if lead.get('rating'): score += (lead.get('rating') * 2)
                # Penalizar un poco los que solo tienen redes pero no email
                if not lead.get('email') and (lead.get('instagram') or lead.get('facebook')):
                    score += 5
                return score

            # Filtro específico para "colegios" para evitar escuelas de fútbol/manejo/idiomas
            if request.rubro.lower() == "colegios":
                logger.info("Aplicando filtro de exclusión educativo...")
                unwanted_terms = ["futbol", "soccer", "tenis", "natacion", "deportes", "manejo", "conducir", "danza", "baile", "musica", "deportiva"]
                all_candidates = [
                    l for l in all_candidates 
                    if not any(term in l.get('nombre', '').lower() for term in unwanted_terms)
                ]

            # Ordenar por score para priorizar emails
            all_candidates.sort(key=lead_score, reverse=True)

            # --- ENRIQUECIMIENTO DE LEADS ---
            if all_candidates:
                # Limitamos a los mejores candidatos para no tardar demasiado
                leads_to_process = all_candidates[:MAX_LEADS]
                enriched_count = 0
                batch_size = 10
                
                yield f"data: {json.dumps({'type': 'status', 'message': f'Encontrados {len(all_candidates)} prospectos. Buscando datos de contacto...'})}\n\n"
                
                # Crear sesión persistente para todo el proceso
                session = ScraperSession()
                
                # Procesar en batches para fluidez en el stream
                accumulated_enriched = []
                
                for i in range(0, len(leads_to_process), batch_size):
                    batch = leads_to_process[i:i+batch_size]
                    
                    try:
                        # Enriquecer batch en paralelo
                        enriched_batch = await asyncio.to_thread(
                            enriquecer_empresas_paralelo,
                            empresas=batch,
                            session=session
                        )
                        
                        if isinstance(enriched_batch, list):
                            # Si hay Smart Filter, lo aplicamos INMEDIATAMENTE al batch para no hacer esperar al usuario
                            if request.smart_filter_text:
                                yield f"data: {json.dumps({'type': 'status', 'message': f'Analizando calidad con IA ({enriched_count + len(enriched_batch)}/{len(leads_to_process)})...'})}\n\n"
                                
                                # Aplicar filtro AI al batch actual
                                filtered_batch_leads = await apply_smart_filter(enriched_batch, request.smart_filter_text)
                                
                                for r in filtered_batch_leads:
                                    yield f"data: {json.dumps({'type': 'lead', 'data': r})}\n\n"
                                    emitted_count += 1
                                    enriched_count += 1
                                    await asyncio.sleep(0.02)
                                    
                            else:
                                # Comportamiento standard: emitir inmediatamente
                                for r in enriched_batch:
                                    yield f"data: {json.dumps({'type': 'lead', 'data': r})}\n\n"
                                    emitted_count += 1
                                    enriched_count += 1
                                    
                                    # Trigger: Lead Extracted
                                    try:
                                        from backend.trigger_service import process_triggers_async
                                        process_triggers_async(request.user_id, "lead_extracted", lead_data=r)
                                    except:
                                        pass
                                        
                                    await asyncio.sleep(0.02) 
                                
                    except Exception as e:
                        logger.error(f"Error en enriquecimiento batch: {e}")
                        # Si falla, emitimos originales
                        # Fallback seguro para ambos casos
                        for r in batch:
                            yield f"data: {json.dumps({'type': 'lead', 'data': r})}\n\n"
                            emitted_count += 1
                            enriched_count += 1

                # (Bloque acumulado eliminado - ya se procesó en tiempo real)
                # Finalización normal
                logger.info(f"Búsqueda finalizada. Enriquecidos: {enriched_count}/{len(leads_to_process)}")
                yield f"data: {json.dumps({'type': 'status', 'message': f'Búsqueda finalizada. {emitted_count} prospectos procesados con éxito.'})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'status', 'message': 'No se encontraron resultados para los criterios seleccionados.'})}\n\n"

        except Exception as e:
            logger.error(f"Error en event_generator: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/api/buscar")
async def buscar_por_rubro(request: BusquedaRubroRequest):
    """
    Busca empresas de un rubro específico con validación de contactos
    Puede buscar por bbox (bounding box) o por ciudad/país
    """
    # Lógica de Créditos
    user_id = request.user_id
    if user_id and user_id != 'anonymous':
        # 1. Verificar reset mensual
        check_reset_monthly_credits(user_id)
        
        # 2. Deducir créditos (100 por búsqueda)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(
                    status_code=402, 
                    detail=f"Créditos insuficientes. Necesitás 100 créditos para buscar. Balance actual: {deduction.get('current', 0)}"
                )
            else:
                logger.error(f"Error crítico deduciendo créditos para {user_id}: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Error al procesar créditos: {error_msg}")
            
    try:
        # Verificar que el parámetro se recibe correctamente
        solo_validadas = getattr(request, 'solo_validadas', False)
        limpiar_anterior = getattr(request, 'limpiar_anterior', True)
        
        # Si es nueva búsqueda, limpiar resultados anteriores
        if limpiar_anterior:
            global _memoria_empresas, _empresa_counter
            count_anterior = len(_memoria_empresas)
            _memoria_empresas = []
            _empresa_counter = 0
            if count_anterior > 0:
                logger.info(f" Nueva búsqueda: limpiando {count_anterior} empresas anteriores")
        else:
            logger.info(f" Agregando a resultados existentes ({len(_memoria_empresas)} empresas)")
        
        # Inicializar progreso si hay task_id
        if request.task_id:
            from backend.db_supabase import get_supabase_admin
            admin = get_supabase_admin()
            if admin:
                try:
                    admin.table('search_tasks').upsert({
                        'id': request.task_id,
                        'user_id': request.user_id,
                        'status': 'processing',
                        'progress': 5,
                        'message': "Buscando prospectos..."
                    }).execute()
                except Exception as e:
                    logger.error(f"Error creando task_id {request.task_id}: {e}")
        
        # Validar bbox
        bbox_valido = False
        if request.bbox:
            partes = request.bbox.split(',')
            bbox_valido = len(partes) == 4
            
        # --- LÓGICA EXCLUSIVA GOOGLE PLACES ---
        empresas = []
        source_used = "google"
        search_method = "bbox" if request.bbox and bbox_valido else "city"

        try:
            logger.info(f" Iniciando búsqueda con Google Places API (New)...")
            
            # Mapear bbox si existe
            google_bbox = None
            if request.bbox and bbox_valido:
                partes = request.bbox.split(',')
                google_bbox = {
                    "south": float(partes[0]),
                    "west": float(partes[1]),
                    "north": float(partes[2]),
                    "east": float(partes[3])
                }

            # Ejecutar búsqueda en Google (Pasada exhaustiva paralela para 100% cobertura)
            rubro_info = RUBROS_DISPONIBLES.get(request.rubro, {"nombre": request.rubro, "keywords": []})
            
            # Construir set de búsquedas
            if request.busqueda_centro_lat and request.busqueda_centro_lng:
                search_queries = [rubro_info['nombre']]
                if rubro_info.get('keywords'):
                    search_queries.extend(rubro_info['keywords'])
            else:
                search_queries = [f"{rubro_info['nombre']} en {request.busqueda_ubicacion_nombre or request.ciudad or 'su ubicación'}"]
                if rubro_info.get('keywords'):
                    search_queries.extend([f"{kw} en {request.busqueda_ubicacion_nombre or request.ciudad or 'su ubicación'}" for kw in rubro_info['keywords']])
            
            # Eliminar duplicados en las queries por si acaso
            search_queries = list(dict.fromkeys(search_queries))
            
            # Ejecutar búsquedas en paralelo para máxima potencia de descubrimiento
            tasks = []
            for q in search_queries:
                tasks.append(google_client.search_all_places(
                    query=q,
                    rubro_nombre=rubro_info['nombre'],
                    rubro_key=request.rubro,
                    bbox=google_bbox,
                    lat=request.busqueda_centro_lat,
                    lng=request.busqueda_centro_lng,
                    radius=(request.busqueda_radio_km * 1000) if request.busqueda_radio_km else None
                ))
            
            # Reunir todos los resultados de las diferentes queries exhaustivamente
            results_lists = await asyncio.gather(*tasks)
            google_results = []
            seen_ids = set()
            
            for r_list in results_lists:
                if r_list and isinstance(r_list, list):
                    for r in r_list:
                        if isinstance(r, dict) and 'google_id' in r:
                            gid = r['google_id']
                            if gid not in seen_ids:
                                google_results.append(r)
                                seen_ids.add(gid)
            
            logger.info(f"Búsqueda EXHAUSTIVA completada. Total leads únicos encontrados: {len(google_results)}")

            if google_results:
                # Filtrar posibles errores de presupuesto si vienen en la lista
                empresas = [r for r in google_results if isinstance(r, dict) and 'error' not in r]
                logger.info(f" EXITOSA: {len(empresas)} empresas obtenidas de Google Places")
            else:
                logger.warning(" No se obtuvieron resultados de Google Places.")

        except Exception as e:
            logger.error(f" Error en Google Places: {e}")
            empresas = []

        # --- FIN DE LÓGICA GOOGLE ---

        # Asegurar que empresas es una lista
        if not isinstance(empresas, list):
            empresas = []
        
        # --- FIN DE LÓGICA HÍBRIDA ---

        if not empresas:
            return {
                "success": True,
                "count": 0,
                "message": "No se encontraron empresas para este rubro",
                "data": []
            }
        
        # Actualizar progreso: Encontradas
        if request.task_id:
            update_search_progress(request.task_id, 1, 1, phase="searching")
            SEARCH_PROGRESS[request.task_id]["message"] = f"Encontradas {len(empresas)} empresas. Iniciando enriquecimiento..."

        logger.info(f" Encontradas {len(empresas)} empresas en Google Places")
        
        # Guardar el número total encontrado ANTES de cualquier filtro
        total_encontradas_original = len(empresas)
        
        # Enriquecer con scraping paralelo si está habilitado
        if request.scrapear_websites:
            logger.info(" Iniciando enriquecimiento paralelo de empresas...")
            try:
                # Ejecutar scraping en un thread separado para no bloquear el event loop
                empresas_enriquecidas = await asyncio.to_thread(
                    enriquecer_empresas_paralelo,
                    empresas=empresas,
                    timeout_por_empresa=20,
                    progress_callback=lambda current, total: update_search_progress(request.task_id, current, total, phase="scraping")
                )
                
                # Validar que retornó una lista válida
                if isinstance(empresas_enriquecidas, list):
                    empresas = empresas_enriquecidas
                else:
                    logger.warning("enriquecer_empresas_paralelo no retornó una lista válida, usando empresas originales")
            except Exception as e:
                logger.error(f"Error en enriquecimiento paralelo: {e}, usando empresas originales")
                # Continuar con empresas sin enriquecer
        
        # Agregar información de búsqueda
        # Validar y limitar radio (Máximo 3km según solicitud del usuario)
        radio_solicitado = request.busqueda_radio_km or 1.0
        radius = min(float(radio_solicitado), 5.0)
        
        logger.info(f"Iniciando búsqueda: {request.rubro} en {request.busqueda_ubicacion_nombre or request.ciudad} (Radio: {radius}km, Bbox: {bool(request.bbox)})")

        if request.busqueda_centro_lat and request.busqueda_centro_lng:
            logger.info(f" Calculando distancias desde ubicación: {request.busqueda_ubicacion_nombre or 'Sin nombre'}")
            # El radio ya viene en kilómetros desde el frontend, ahora limitado por 'radius'
            radio_km = radius
            
            empresas_con_distancia = []
            for empresa in empresas:
                # Agregar información de búsqueda
                empresa['busqueda_ubicacion_nombre'] = request.busqueda_ubicacion_nombre
                empresa['busqueda_centro_lat'] = request.busqueda_centro_lat
                empresa['busqueda_centro_lng'] = request.busqueda_centro_lng
                empresa['busqueda_radio_km'] = request.busqueda_radio_km
                
                # Calcular distancia si la empresa tiene coordenadas válidas
                lat_empresa = empresa.get('latitud')
                lng_empresa = empresa.get('longitud')
                
                if (lat_empresa is not None and lng_empresa is not None and
                    isinstance(lat_empresa, (int, float)) and isinstance(lng_empresa, (int, float)) and
                    -90 <= lat_empresa <= 90 and -180 <= lng_empresa <= 180):
                    distancia = calcular_distancia_km(
                        request.busqueda_centro_lat,
                        request.busqueda_centro_lng,
                        lat_empresa,
                        lng_empresa
                    )
                    # Validar que la distancia sea válida
                    if distancia is not None and isinstance(distancia, (int, float)) and distancia >= 0:
                        empresa['distancia_km'] = distancia
                        
                        # Filtrar por radio: solo incluir empresas dentro del radio (con margen del 5%)
                        if radio_km is not None and isinstance(radio_km, (int, float)) and radio_km > 0:
                            if distancia > (radio_km * 1.05):
                                logger.debug(f" Empresa {empresa.get('nombre', 'Sin nombre')} fuera del radio: {distancia:.2f}km > {radio_km:.2f}km")
                                continue  # Saltar esta empresa, está fuera del radio
                    else:
                        empresa['distancia_km'] = None
                        logger.debug(f" Distancia inválida calculada para {empresa.get('nombre', 'Sin nombre')}")
                else:
                    empresa['distancia_km'] = None
                    # Si no tiene coordenadas y hay un radio definido, excluir la empresa
                    if radio_km is not None and isinstance(radio_km, (int, float)) and radio_km > 0:
                        logger.debug(f" Empresa {empresa.get('nombre', 'Sin nombre')} sin coordenadas válidas, excluida del radio")
                        continue
                
                empresas_con_distancia.append(empresa)
            
            empresas = empresas_con_distancia
            logger.info(f" Después del filtro por radio: {len(empresas)} empresas dentro del radio de {radio_km:.2f}km")
        
        # Validar empresas
        from backend.validators import validar_email, validar_telefono, validar_website
        
        empresas_validadas = []
        empresas_rechazadas = []
        empresas_sin_contacto = []
        
        for i, empresa in enumerate(empresas):
            # Actualizar progreso en CADA empresa para máxima fluidez, especialmente en lotes pequeños
            if request.task_id:
                update_search_progress(request.task_id, i + 1, len(empresas), phase="finalizing")

            # Validar nombre primero
            nombre = empresa.get('nombre', '').strip() if empresa.get('nombre') else ''
            if not nombre or nombre == '' or nombre == 'Sin nombre' or len(nombre) < 2:
                empresas_rechazadas.append(empresa)
                logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: Rechazada - Sin nombre válido")
                continue
            
            # Preparar empresa validada
            empresa_validada = empresa.copy()
            empresa_validada['nombre'] = nombre
            
            # Validar email
            email_valido, email_limpio = validar_email(empresa.get('email', ''))
            if email_valido:
                empresa_validada['email'] = email_limpio
                empresa_validada['email_valido'] = True
            else:
                empresa_validada['email'] = ''
                empresa_validada['email_valido'] = False
            
            # Validar teléfono
            tel_valido, tel_limpio = validar_telefono(empresa.get('telefono', ''))
            if tel_valido:
                empresa_validada['telefono'] = tel_limpio
                empresa_validada['telefono_valido'] = True
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
            
            # Verificar si tiene contacto válido (email O teléfono)
            tiene_contacto_valido = email_valido or tel_valido
            
            # Asegurar campos requeridos para DB
            empresa_validada['rubro'] = request.rubro
            # Generar rubro_key simple si no existe
            if not empresa_validada.get('rubro_key'):
                empresa_validada['rubro_key'] = request.rubro.lower().replace(' ', '_')
                
            # Log detallado para debugging
            logger.debug(f" Empresa: {nombre}, Email válido: {email_valido}, Teléfono válido: {tel_valido}, Tiene contacto: {tiene_contacto_valido}, Solo válidas: {request.solo_validadas}")
            
            try:
                # Agregar ID temporal si no tiene
                if 'id' not in empresa_validada:
                    _empresa_counter += 1
                    empresa_validada['id'] = _empresa_counter

                if tiene_contacto_valido:
                    # Empresa con contacto válido - siempre se guarda
                    empresa_validada['validada'] = True
                    empresa_validada['user_id'] = request.user_id # Para el trigger de lead_saved
                    empresas_validadas.append(empresa_validada)
                    _memoria_empresas.append(empresa_validada)
                    
                    try:
                        if insertar_empresa(empresa_validada):
                            mensaje = "Email y teléfono válidos" if (email_valido and tel_valido) else ("Email válido" if email_valido else "Teléfono válido")
                            logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - {mensaje}")
                        else:
                             logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: Falló inserción en DB (insertar_empresa retornó False)")
                    except Exception as e_db:
                         logger.error(f" {empresa.get('nombre', 'Sin nombre')}: Error crítico en insertar_empresa: {e_db}")

                elif not solo_validadas:
                    # Empresa sin contacto válido pero con nombre válido - solo se guarda si no se requiere solo válidas
                    empresa_validada['validada'] = False
                    empresas_sin_contacto.append(empresa_validada)
                    _memoria_empresas.append(empresa_validada)
                    
                    try:
                        if insertar_empresa(empresa_validada):
                            logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - Sin contacto válido (solo_validadas=False)")
                        else:
                             pass 
                    except Exception as e_db:
                        logger.error(f"Error inesperado al insertar empresa sin contacto válido: {e_db}", exc_info=True)
                else:
                    # Empresa sin contacto válido y se requiere solo válidas - NO se guarda
                    empresas_rechazadas.append(empresa)
                    logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: RECHAZADA - Sin contacto válido (email_valido={email_valido}, tel_valido={tel_valido}, solo_validadas={solo_validadas})")
            except Exception as e_insert:
                logger.error(f" Error procesando empresa {nombre}: {e_insert}")
                # No detener el proceso

        
        # Calcular empresas válidas (con email válido O teléfono válido)
        validas = len(empresas_validadas)
        total_guardadas = len(empresas_validadas) + len(empresas_sin_contacto)
        
        # Si solo_validadas es True, solo devolver empresas con contacto válido
        empresas_a_devolver = empresas_validadas if solo_validadas else (empresas_validadas + empresas_sin_contacto)
        
        # Estadísticas simples
        stats = {
            'total': total_encontradas_original,  # Total original antes de filtros
            'validas': validas,
            'sin_contacto': len(empresas_sin_contacto),
            'rechazadas': len(empresas_rechazadas),
            'guardadas': total_guardadas,
            'con_email': sum(1 for e in empresas_validadas if e.get('email_valido')),
            'con_telefono': sum(1 for e in empresas_validadas if e.get('telefono_valido')),
            'con_website': sum(1 for e in empresas_validadas if e.get('website_valido'))
        }
        
        logger.info(f"""
    === PROCESO COMPLETADO ===
    Total empresas encontradas en OSM: {total_encontradas_original}
    Empresas después de filtro por radio: {len(empresas)}
    Empresas con contacto válido: {stats['validas']}
    Empresas sin contacto válido: {stats['sin_contacto']}
    Empresas rechazadas: {stats['rechazadas']}
    Total guardadas: {stats['guardadas']}
    Con email: {stats['con_email']}
    Con teléfono: {stats['con_telefono']}
    Con website: {stats['con_website']}
    Solo válidas: {solo_validadas}
    """)
        
        logger.info(f" Proceso completado: {total_guardadas} empresas guardadas de {total_encontradas_original} encontradas ({validas} con contacto válido)")
        
        # Marcar como completado pero NO borrar inmediatamente para que el frontend pueda leer el 100%
        if request.task_id:
            try:
                from backend.db_supabase import get_supabase_admin
                admin = get_supabase_admin()
                if admin:
                    admin.table('search_tasks').update({
                        'status': 'completed',
                        'progress': 100,
                        'message': "¡Búsqueda completada!",
                        'result_data': {
                            "success": True,
                            "total_encontradas": total_encontradas_original,
                            "guardadas": total_guardadas,
                            "validas": validas,
                            "rechazadas": len(empresas_rechazadas),
                            "estadisticas": stats,
                            "data": empresas_a_devolver
                        },
                        'updated_at': 'now()'
                    }).eq('id', request.task_id).execute()
            except Exception as e:
                logger.error(f"Error finalizando tarea {request.task_id}: {e}")

        return {
            "success": True,
            "total_encontradas": total_encontradas_original,
            "guardadas": total_guardadas,
            "validas": validas,
            "rechazadas": len(empresas_rechazadas),
            "estadisticas": stats,
            "data": empresas_a_devolver
        }
        
    except Exception as e:
        logger.error(f" Error en búsqueda: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/buscar-multiple")
async def buscar_multiples_rubros(request: BusquedaMultipleRequest):
    """Busca empresas de múltiples rubros simultáneamente"""
    # Lógica de Créditos
    user_id = request.user_id
    if user_id and user_id != 'anonymous':
        # 1. Verificar reset mensual
        check_reset_monthly_credits(user_id)
        
        # 2. Deducir créditos (100 por búsqueda multiple también)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(
                    status_code=402, 
                    detail=f"Créditos insuficientes. Necesitás 100 créditos para buscar. Balance actual: {deduction.get('current', 0)}"
                )
            else:
                raise HTTPException(status_code=500, detail=f"Error de base de datos en créditos: {error_msg}")
            
    try:
        resultados = buscar_empresas_multiples_rubros(
            rubros=request.rubros,
            pais=request.pais,
            ciudad=request.ciudad
        )
        
        total = sum(len(empresas) for empresas in resultados.values())
        
        return {
            "success": True,
            "rubros_buscados": len(request.rubros),
            "total_empresas": total,
            "resultados_por_rubro": {
                rubro: len(empresas) 
                for rubro, empresas in resultados.items()
            },
            "data": resultados
        }
        
    except Exception as e:
        logger.error(f"Error en búsqueda múltiple: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/empresas")
async def listar_empresas():
    """Lista todas las empresas almacenadas en memoria (resultado de última búsqueda)"""
    try:
        global _memoria_empresas
        # Si la memoria está vacía, intentar cargar de DB como fallback
        if not _memoria_empresas:
             db_empresas = obtener_todas_empresas()
             if db_empresas:
                 _memoria_empresas = db_empresas
        
        return {
            "success": True,
            "total": len(_memoria_empresas),
            "data": _memoria_empresas
        }
        
    except Exception as e:
        logger.error(f"Error listando empresas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/filtrar")
async def filtrar(request: FiltroRequest):
    """Filtra empresas con criterios específicos"""
    try:
        empresas = buscar_empresas(
            rubro=request.rubro,
            ciudad=request.ciudad,
            solo_validas=request.solo_validas,
            con_email=request.con_email,
            con_telefono=request.con_telefono
        )
        
        return {
            "success": True,
            "filtros_aplicados": {
                "rubro": request.rubro,
                "ciudad": request.ciudad,
                "solo_validas": request.solo_validas,
                "con_email": request.con_email,
                "con_telefono": request.con_telefono
            },
            "total": len(empresas),
            "data": empresas
        }
        
    except Exception as e:
        logger.error(f"Error filtrando: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/api/estadisticas")
async def estadisticas():
    """Obtiene estadísticas del sistema"""
    try:
        stats = obtener_estadisticas()
        
        if not stats:
            logger.warning("obtener_estadisticas retornó un diccionario vacío")
            stats = {
                'total': 0,
                'con_email': 0,
                'con_telefono': 0,
                'con_website': 0,
                'por_rubro': {},
                'por_ciudad': {}
            }
        
        return {
            "success": True,
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@router.post("/api/exportar")
async def exportar(request: ExportRequest):
    """Exporta empresas a CSV, JSON o PDF"""
    from fastapi.responses import FileResponse
    # Lógica de Créditos
    # Por ahora cobramos 100 créditos por exportación (valor a ajustar según feedback)
    user_id = getattr(request, 'user_id', None)
    if user_id and user_id != 'anonymous':
        check_reset_monthly_credits(user_id)
        deduction = deduct_credits(user_id, 100)
        if not deduction.get("success"):
            error_msg = deduction.get("error", "Error desconocido")
            if "insuficientes" in error_msg.lower():
                raise HTTPException(
                    status_code=402, 
                    detail=f"Créditos insuficientes para exportar. Necesitás 100 créditos. Balance: {deduction.get('current', 0)}"
                )
            else:
                raise HTTPException(status_code=500, detail=f"Falla técnica al validar créditos: {error_msg}")

    try:
        if request.formato.lower() == "csv":
            archivo = exportar_a_csv(
                rubro=request.rubro,
                solo_validas=request.solo_validas
            )
        elif request.formato.lower() == "json":
            archivo = exportar_a_json(
                rubro=request.rubro,
                solo_validas=request.solo_validas
            )
        elif request.formato.lower() == "pdf":
            from backend.db_supabase import exportar_a_pdf
            archivo = exportar_a_pdf(
                rubro=request.rubro,
                solo_validas=request.solo_validas
            )
            if archivo and os.path.exists(archivo):
                return FileResponse(
                    path=archivo,
                    filename=os.path.basename(archivo),
                    media_type='application/pdf'
                )
        else:
            raise HTTPException(status_code=400, detail="Formato debe ser 'csv', 'json' o 'pdf'")
        
        if not archivo:
            raise HTTPException(status_code=404, detail="No hay datos para exportar")
        
        return {
            "success": True,
            "formato": request.formato,
            "archivo": archivo,
            "message": f"Datos exportados exitosamente a {request.formato.upper()}"
        }
        
    except Exception as e:
        logger.error(f"Error exportando: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/clear")
async def clear_database():
    """Elimina todas las empresas de la base de datos"""
    try:
        success = limpiar_base_datos()
        
        if success:
            return {
                "success": True,
                "message": "Base de datos limpiada correctamente"
            }
        else:
            raise HTTPException(status_code=500, detail="Error al limpiar la base de datos")
            
    except Exception as e:
        logger.error(f"Error limpiando base de datos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/empresa/estado")
async def actualizar_estado(request: ActualizarEstadoRequest):
    """Actualiza el estado Kanban de una empresa"""
    try:
        from lead_utils import validar_estado
        from datetime import datetime
        
        if not validar_estado(request.estado):
            raise HTTPException(
                status_code=400, 
                detail=f"Estado inválido. Estados válidos: por_contactar, contactada, interesada, no_interesa, convertida"
            )
        
        # Actualizar en memoria
        empresa_encontrada = False
        for i, e in enumerate(_memoria_empresas):
            if e.get('id') == request.id:
                _memoria_empresas[i]['estado'] = request.estado
                if request.notas:
                    _memoria_empresas[i]['notas'] = request.notas
                _memoria_empresas[i]['fecha_ultimo_contacto'] = datetime.now().isoformat()
                _memoria_empresas[i]['updated_at'] = datetime.now().isoformat()
                empresa_encontrada = True
                break
        
        if not empresa_encontrada:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        logger.info(f" Estado actualizado en memoria - ID: {request.id} → {request.estado}")
        
        return {
            "success": True,
            "message": f"Estado actualizado a '{request.estado}'",
            "id": request.id,
            "estado": request.estado
        }
        
    except Exception as e:
        logger.error(f"Error actualizando estado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/empresa/notas")
async def actualizar_notas(request: ActualizarNotasRequest):
    """Actualiza las notas de una empresa"""
    try:
        from datetime import datetime
        
        # Actualizar en memoria
        empresa_encontrada = False
        for i, e in enumerate(_memoria_empresas):
            if e.get('id') == request.id:
                _memoria_empresas[i]['notas'] = request.notas
                _memoria_empresas[i]['updated_at'] = datetime.now().isoformat()
                empresa_encontrada = True
                break
        
        if not empresa_encontrada:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        logger.info(f" Notas actualizadas en memoria - ID: {request.id}")
        
        return {
            "success": True,
            "message": "Notas actualizadas correctamente",
            "id": request.id
        }
        
    except Exception as e:
        logger.error(f"Error actualizando notas: {e}")
        raise HTTPException(status_code=500, detail=str(e))



