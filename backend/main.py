"""
API FastAPI para sistema B2B de captación de clientes por rubro
Enfocado en empresas, no en propiedades por zona
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging
import os
from datetime import datetime

from overpass_client import (
    buscar_empresas_por_rubro, 
    listar_rubros_disponibles,
    buscar_empresas_multiples_rubros,
    query_by_bbox
)
from scraper import enriquecer_empresa_b2b
from social_scraper import enriquecer_con_redes_sociales
from scraper_parallel import enriquecer_empresas_paralelo
from validators import validar_empresa
from db import (
    init_db_b2b, 
    insertar_empresa, 
    obtener_todas_empresas,
    buscar_empresas,
    obtener_estadisticas,
    exportar_a_csv,
    exportar_a_json,
    calcular_distancia_km,
    limpiar_base_datos,
    obtener_templates,
    obtener_template,
    crear_template,
    actualizar_template,
    eliminar_template,
    guardar_email_history,
    obtener_email_history
)
from email_service import enviar_email_empresa, enviar_emails_masivo

# Configurar logging
# En Vercel, solo usar StreamHandler (stdout/stderr). En local, usar archivo también
if os.environ.get('VERCEL'):
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )
else:
    log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(os.path.join(log_dir, f'b2b_{datetime.now().strftime("%Y%m%d")}.log')),
            logging.StreamHandler()
        ]
    )

logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="B2B Client Acquisition API", 
    version="2.0.0",
    description="Sistema de captación de clientes B2B por rubro empresarial"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos
class BusquedaRubroRequest(BaseModel):
    rubro: str
    bbox: Optional[str] = None  # "south,west,north,east"
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    scrapear_websites: bool = True
    solo_validadas: bool = False  # Solo empresas con email o teléfono válido
    # Información de ubicación de búsqueda
    busqueda_ubicacion_nombre: Optional[str] = None
    busqueda_centro_lat: Optional[float] = None
    busqueda_centro_lng: Optional[float] = None
    busqueda_radio_km: Optional[float] = None

class BusquedaMultipleRequest(BaseModel):
    rubros: List[str]
    pais: Optional[str] = None
    ciudad: Optional[str] = None

class FiltroRequest(BaseModel):
    rubro: Optional[str] = None
    ciudad: Optional[str] = None
    solo_validas: bool = True
    con_email: bool = False
    con_telefono: bool = False

class ExportRequest(BaseModel):
    rubro: Optional[str] = None
    formato: str = "csv"  # csv o json
    solo_validas: bool = True

class ActualizarEstadoRequest(BaseModel):
    id: int
    estado: str
    notas: Optional[str] = None

class ActualizarNotasRequest(BaseModel):
    id: int
    notas: str

class TemplateRequest(BaseModel):
    nombre: str
    subject: str
    body_html: str
    body_text: Optional[str] = None

class TemplateUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None

class EnviarEmailRequest(BaseModel):
    empresa_id: int
    template_id: int
    asunto_personalizado: Optional[str] = None

class EnviarEmailMasivoRequest(BaseModel):
    empresa_ids: List[int]
    template_id: int
    asunto_personalizado: Optional[str] = None
    delay_segundos: float = 1.0

# Inicializar BD
@app.on_event("startup")
async def startup():
    logger.info(" Iniciando API B2B...")
    init_db_b2b()
    logger.info(" Sistema B2B listo")

@app.get("/")
async def root():
    """Información de la API"""
    return {
        "nombre": "B2B Client Acquisition API",
        "version": "2.0.0",
        "descripcion": "Sistema de captación de clientes por rubro empresarial",
        "enfoque": "Búsqueda B2B de empresas con datos de contacto validados",
        "endpoints": {
            "/rubros": "GET - Lista de rubros disponibles",
            "/buscar": "POST - Buscar empresas por rubro",
            "/empresas": "GET - Listar todas las empresas",
            "/filtrar": "POST - Filtrar empresas",
            "/estadisticas": "GET - Estadísticas del sistema",
            "/exportar": "POST - Exportar a CSV/JSON"
        }
    }

@app.get("/rubros")
async def obtener_rubros():
    """Lista todos los rubros disponibles para búsqueda"""
    try:
        rubros = listar_rubros_disponibles()
        
        return {
            "success": True,
            "total": len(rubros),
            "rubros": rubros,
            "ejemplo_uso": {
                "rubro": "desarrolladoras_inmobiliarias",
                "pais": "España",
                "ciudad": "Madrid"
            }
        }
    except Exception as e:
        logger.error(f"Error obteniendo rubros: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/buscar")
async def buscar_por_rubro(request: BusquedaRubroRequest):
    """
    Busca empresas de un rubro específico con validación de contactos
    Puede buscar por bbox (bounding box) o por ciudad/país
    """
    try:
        # Verificar que el parámetro se recibe correctamente
        solo_validadas = getattr(request, 'solo_validadas', False)
        logger.info(f" Búsqueda B2B - Rubro: {request.rubro}, Solo válidas: {solo_validadas} (tipo: {type(solo_validadas)})")
        
        # Buscar en OpenStreetMap
        if request.bbox:
            # Búsqueda por bounding box (ubicación en mapa)
            logger.info(f" Búsqueda por bbox: {request.bbox}")
            empresas = query_by_bbox(
                bbox=request.bbox,
                rubro=request.rubro
            )
        else:
            # Búsqueda por ciudad/país (método antiguo)
            empresas = buscar_empresas_por_rubro(
                rubro=request.rubro,
                pais=request.pais,
                ciudad=request.ciudad
            )
        
        if not empresas:
            return {
                "success": True,
                "count": 0,
                "message": "No se encontraron empresas para este rubro",
                "data": []
            }
        
        logger.info(f" Encontradas {len(empresas)} empresas en OSM")
        
        # Enriquecer con scraping paralelo si está habilitado
        if request.scrapear_websites:
            logger.info(" Iniciando enriquecimiento paralelo de empresas...")
            empresas = enriquecer_empresas_paralelo(
                empresas=empresas,
                timeout_por_empresa=20
            )
        
        # Agregar información de búsqueda y calcular distancias
        if request.busqueda_centro_lat and request.busqueda_centro_lng:
            logger.info(f" Calculando distancias desde ubicación: {request.busqueda_ubicacion_nombre or 'Sin nombre'}")
            for empresa in empresas:
                # Agregar información de búsqueda
                empresa['busqueda_ubicacion_nombre'] = request.busqueda_ubicacion_nombre
                empresa['busqueda_centro_lat'] = request.busqueda_centro_lat
                empresa['busqueda_centro_lng'] = request.busqueda_centro_lng
                empresa['busqueda_radio_km'] = request.busqueda_radio_km
                
                # Calcular distancia si la empresa tiene coordenadas
                if empresa.get('latitud') and empresa.get('longitud'):
                    distancia = calcular_distancia_km(
                        request.busqueda_centro_lat,
                        request.busqueda_centro_lng,
                        empresa.get('latitud'),
                        empresa.get('longitud')
                    )
                    empresa['distancia_km'] = distancia
                else:
                    empresa['distancia_km'] = None
        
        # Validar empresas
        from validators import validar_email, validar_telefono, validar_website
        
        empresas_validadas = []
        empresas_rechazadas = []
        empresas_sin_contacto = []
        
        for empresa in empresas:
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
            
            # Log detallado para debugging
            logger.debug(f" Empresa: {nombre}, Email válido: {email_valido}, Teléfono válido: {tel_valido}, Tiene contacto: {tiene_contacto_valido}, Solo válidas: {request.solo_validadas}")
            
            if tiene_contacto_valido:
                # Empresa con contacto válido - siempre se guarda
                empresa_validada['validada'] = True
                empresas_validadas.append(empresa_validada)
                insertar_empresa(empresa_validada)
                mensaje = "Email y teléfono válidos" if (email_valido and tel_valido) else ("Email válido" if email_valido else "Teléfono válido")
                logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - {mensaje}")
            elif not solo_validadas:
                # Empresa sin contacto válido pero con nombre válido - solo se guarda si no se requiere solo válidas
                empresa_validada['validada'] = False
                empresas_sin_contacto.append(empresa_validada)
                insertar_empresa(empresa_validada)
                logger.info(f" {empresa.get('nombre', 'Sin nombre')}: Guardada - Sin contacto válido (solo_validadas=False)")
            else:
                # Empresa sin contacto válido y se requiere solo válidas - NO se guarda
                empresas_rechazadas.append(empresa)
                logger.warning(f" {empresa.get('nombre', 'Sin nombre')}: RECHAZADA - Sin contacto válido (email_valido={email_valido}, tel_valido={tel_valido}, solo_validadas={solo_validadas})")
        
        # Calcular empresas válidas (con email válido O teléfono válido)
        validas = len(empresas_validadas)
        total_guardadas = len(empresas_validadas) + len(empresas_sin_contacto)
        
        # Si solo_validadas es True, solo devolver empresas con contacto válido
        empresas_a_devolver = empresas_validadas if solo_validadas else (empresas_validadas + empresas_sin_contacto)
        
        # Estadísticas simples
        stats = {
            'total': len(empresas),
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
    Total empresas encontradas: {stats['total']}
    Empresas con contacto válido: {stats['validas']}
    Empresas sin contacto válido: {stats['sin_contacto']}
    Empresas rechazadas: {stats['rechazadas']}
    Total guardadas: {stats['guardadas']}
    Con email: {stats['con_email']}
    Con teléfono: {stats['con_telefono']}
    Con website: {stats['con_website']}
    Solo válidas: {solo_validadas}
    """)
        
        logger.info(f" Proceso completado: {total_guardadas} empresas guardadas de {len(empresas)} encontradas ({validas} con contacto válido)")
        
        return {
            "success": True,
            "total_encontradas": len(empresas),
            "guardadas": total_guardadas,
            "validas": validas,
            "rechazadas": len(empresas_rechazadas),
            "estadisticas": stats,
            "data": empresas_a_devolver
        }
        
    except Exception as e:
        logger.error(f" Error en búsqueda: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/buscar-multiple")
async def buscar_multiples_rubros(request: BusquedaMultipleRequest):
    """Busca empresas de múltiples rubros simultáneamente"""
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

@app.get("/empresas")
async def listar_empresas():
    """Lista todas las empresas almacenadas"""
    try:
        empresas = obtener_todas_empresas()
        
        return {
            "success": True,
            "total": len(empresas),
            "data": empresas
        }
        
    except Exception as e:
        logger.error(f"Error listando empresas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/filtrar")
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

@app.get("/estadisticas")
async def estadisticas():
    """Obtiene estadísticas del sistema"""
    try:
        stats = obtener_estadisticas()
        
        return {
            "success": True,
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/exportar")
async def exportar(request: ExportRequest):
    """Exporta empresas a CSV o JSON"""
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
        else:
            raise HTTPException(status_code=400, detail="Formato debe ser 'csv' o 'json'")
        
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

@app.delete("/clear")
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

@app.put("/empresa/estado")
async def actualizar_estado(request: ActualizarEstadoRequest):
    """Actualiza el estado Kanban de una empresa"""
    try:
        from lead_utils import validar_estado
        import sqlite3
        from datetime import datetime
        
        if not validar_estado(request.estado):
            raise HTTPException(
                status_code=400, 
                detail=f"Estado inválido. Estados válidos: por_contactar, contactada, interesada, no_interesa, convertida"
            )
        
        # Actualizar en BD
        conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), '..', 'data', 'empresas_b2b.db'))
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE empresas 
            SET estado = ?, 
                notas = COALESCE(?, notas),
                fecha_ultimo_contacto = ?,
                updated_at = ?
            WHERE id = ?
        ''', (request.estado, request.notas, datetime.now(), datetime.now(), request.id))
        
        conn.commit()
        conn.close()
        
        logger.info(f" Estado actualizado - ID: {request.id} → {request.estado}")
        
        return {
            "success": True,
            "message": f"Estado actualizado a '{request.estado}'",
            "id": request.id,
            "estado": request.estado
        }
        
    except Exception as e:
        logger.error(f"Error actualizando estado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/empresa/notas")
async def actualizar_notas(request: ActualizarNotasRequest):
    """Actualiza las notas de una empresa"""
    try:
        import sqlite3
        from datetime import datetime
        
        # Actualizar en BD
        conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), '..', 'data', 'empresas_b2b.db'))
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE empresas 
            SET notas = ?,
                updated_at = ?
            WHERE id = ?
        ''', (request.notas, datetime.now(), request.id))
        
        conn.commit()
        conn.close()
        
        logger.info(f" Notas actualizadas - ID: {request.id}")
        
        return {
            "success": True,
            "message": "Notas actualizadas correctamente",
            "id": request.id
        }
        
    except Exception as e:
        logger.error(f"Error actualizando notas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS DE EMAIL TEMPLATES ==========

@app.get("/templates")
async def listar_templates():
    """Lista todos los templates de email"""
    try:
        templates = obtener_templates()
        return {
            "success": True,
            "total": len(templates),
            "data": templates
        }
    except Exception as e:
        logger.error(f"Error listando templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates/{template_id}")
async def obtener_template_endpoint(template_id: int):
    """Obtiene un template por ID"""
    try:
        template = obtener_template(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        return {
            "success": True,
            "data": template
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/templates")
async def crear_template_endpoint(request: TemplateRequest):
    """Crea un nuevo template"""
    try:
        template_id = crear_template(
            nombre=request.nombre,
            subject=request.subject,
            body_html=request.body_html,
            body_text=request.body_text
        )
        if not template_id:
            raise HTTPException(status_code=400, detail="Error creando template. Verifica que el nombre no exista.")
        return {
            "success": True,
            "message": "Template creado exitosamente",
            "template_id": template_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/templates/{template_id}")
async def actualizar_template_endpoint(template_id: int, request: TemplateUpdateRequest):
    """Actualiza un template"""
    try:
        success = actualizar_template(
            template_id=template_id,
            nombre=request.nombre,
            subject=request.subject,
            body_html=request.body_html,
            body_text=request.body_text
        )
        if not success:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        return {
            "success": True,
            "message": "Template actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/templates/{template_id}")
async def eliminar_template_endpoint(template_id: int):
    """Elimina un template"""
    try:
        success = eliminar_template(template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        return {
            "success": True,
            "message": "Template eliminado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS DE ENVÍO DE EMAILS ==========

@app.post("/email/enviar")
async def enviar_email_individual(request: EnviarEmailRequest):
    """Envía un email individual a una empresa"""
    try:
        import sqlite3
        
        # Obtener empresa
        conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), '..', 'data', 'empresas_b2b.db'))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM empresas WHERE id = ?', (request.empresa_id,))
        empresa_row = cursor.fetchone()
        conn.close()
        
        if not empresa_row:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
        empresa = dict(empresa_row)
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        # Enviar email
        resultado = enviar_email_empresa(
            empresa=empresa,
            template=template,
            asunto_personalizado=request.asunto_personalizado
        )
        
        # Guardar en historial
        guardar_email_history(
            empresa_id=empresa['id'],
            empresa_nombre=empresa.get('nombre', ''),
            empresa_email=empresa.get('email', ''),
            template_id=template['id'],
            template_nombre=template.get('nombre', ''),
            subject=resultado.get('message', ''),
            status='success' if resultado['success'] else 'error',
            error_message=resultado.get('error')
        )
        
        if not resultado['success']:
            raise HTTPException(status_code=400, detail=resultado['message'])
        
        return {
            "success": True,
            "message": resultado['message'],
            "data": resultado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/email/enviar-masivo")
async def enviar_email_masivo_endpoint(request: EnviarEmailMasivoRequest):
    """Envía emails a múltiples empresas"""
    try:
        import sqlite3
        
        # Obtener empresas
        conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), '..', 'data', 'empresas_b2b.db'))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        placeholders = ','.join(['?'] * len(request.empresa_ids))
        cursor.execute(f'SELECT * FROM empresas WHERE id IN ({placeholders})', request.empresa_ids)
        empresas_rows = cursor.fetchall()
        conn.close()
        
        empresas = [dict(row) for row in empresas_rows]
        
        if len(empresas) != len(request.empresa_ids):
            raise HTTPException(status_code=404, detail="Algunas empresas no fueron encontradas")
        
        # Obtener template
        template = obtener_template(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        
        # Enviar emails
        resultados = enviar_emails_masivo(
            empresas=empresas,
            template=template,
            asunto_personalizado=request.asunto_personalizado,
            delay_segundos=request.delay_segundos
        )
        
        # Guardar en historial
        for detalle in resultados['detalles']:
            if 'empresa_id' in detalle:
                guardar_email_history(
                    empresa_id=detalle['empresa_id'],
                    empresa_nombre=detalle.get('empresa_nombre', ''),
                    empresa_email=detalle.get('empresa_email', ''),
                    template_id=template['id'],
                    template_nombre=template.get('nombre', ''),
                    subject=template.get('subject', ''),
                    status='success' if detalle.get('success') else 'error',
                    error_message=detalle.get('error')
                )
        
        return {
            "success": True,
            "message": f"Proceso completado: {resultados['exitosos']} exitosos, {resultados['fallidos']} fallidos",
            "data": resultados
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando emails masivos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email/historial")
async def obtener_historial_email(empresa_id: Optional[int] = None, template_id: Optional[int] = None, limit: int = 100):
    """Obtiene el historial de emails enviados"""
    try:
        historial = obtener_email_history(
            empresa_id=empresa_id,
            template_id=template_id,
            limit=limit
        )
        return {
            "success": True,
            "total": len(historial),
            "data": historial
        }
    except Exception as e:
        logger.error(f"Error obteniendo historial: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("""
    ╔══════════════════════════════════════════════════╗
    ║   B2B CLIENT ACQUISITION API - INICIANDO...      ║
    ║                                                  ║
    ║   Sistema de captación de clientes por rubro    ║
    ║   Enfoque: Empresas B2B con datos validados     ║
    ╚══════════════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

