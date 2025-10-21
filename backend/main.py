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
from db import (
    init_db_b2b, 
    insertar_empresa, 
    obtener_todas_empresas,
    buscar_empresas,
    obtener_estadisticas,
    exportar_a_csv,
    exportar_a_json,
    limpiar_base_datos
)

# Configurar logging
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

# Inicializar BD
@app.on_event("startup")
async def startup():
    logger.info("🚀 Iniciando API B2B...")
    init_db_b2b()
    logger.info("✓ Sistema B2B listo")

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
        logger.info(f"🔍 Búsqueda B2B - Rubro: {request.rubro}")
        
        # Buscar en OpenStreetMap
        if request.bbox:
            # Búsqueda por bounding box (ubicación en mapa)
            logger.info(f"📍 Búsqueda por bbox: {request.bbox}")
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
        
        logger.info(f"📊 Encontradas {len(empresas)} empresas en OSM")
        
        # Enriquecer con scraping si está habilitado
        if request.scrapear_websites:
            empresas_enriquecidas = []
            for empresa in empresas:
                if empresa.get('website'):
                    logger.info(f"🔄 Enriqueciendo: {empresa.get('nombre')}")
                    # Enriquecer con datos de scraping
                    empresa = enriquecer_empresa_b2b(empresa)
                    
                    # Extraer redes sociales
                    sitio_web = empresa.get('website') or empresa.get('sitio_web')
                    if sitio_web:
                        redes = enriquecer_con_redes_sociales(sitio_web)
                        empresa.update(redes)  # Agregar instagram, facebook, twitter, etc.
                        
                empresas_enriquecidas.append(empresa)
            empresas = empresas_enriquecidas
        
        # Guardar todas las empresas encontradas
        for empresa in empresas:
            insertar_empresa(empresa)
            logger.info(f"✓ {empresa.get('nombre', 'Sin nombre')}: Guardada")
        
        # Estadísticas simples
        stats = {
            'total': len(empresas),
            'con_email': sum(1 for e in empresas if e.get('email')),
            'con_telefono': sum(1 for e in empresas if e.get('telefono')),
            'con_website': sum(1 for e in empresas if e.get('website'))
        }
        
        logger.info(f"""
    === PROCESO COMPLETADO ===
    Total empresas: {stats['total']}
    Con email: {stats['con_email']}
    Con teléfono: {stats['con_telefono']}
    Con website: {stats['con_website']}
    """)
        
        logger.info(f"✅ Proceso completado: {len(empresas)} empresas guardadas")
        
        return {
            "success": True,
            "total_encontradas": len(empresas),
            "guardadas": len(empresas),
            "estadisticas": stats,
            "data": empresas
        }
        
    except Exception as e:
        logger.error(f"❌ Error en búsqueda: {e}")
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
        
        logger.info(f"✅ Estado actualizado - ID: {request.id} → {request.estado}")
        
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
        
        logger.info(f"✅ Notas actualizadas - ID: {request.id}")
        
        return {
            "success": True,
            "message": "Notas actualizadas correctamente",
            "id": request.id
        }
        
    except Exception as e:
        logger.error(f"Error actualizando notas: {e}")
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

