"""
Base de datos SQLite para sistema B2B de captación de clientes
Esquema optimizado para empresas y contactos corporativos
"""

import sqlite3
import logging
import json
from typing import List, Dict, Optional
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'empresas_b2b.db')

def init_db_b2b():
    """Inicializa base de datos para empresas B2B"""
    try:
        os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS empresas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                rubro TEXT NOT NULL,
                rubro_key TEXT,
                
                -- Datos de contacto
                email TEXT,
                email_valido BOOLEAN DEFAULT 0,
                telefono TEXT,
                telefono_valido BOOLEAN DEFAULT 0,
                website TEXT,
                website_valido BOOLEAN DEFAULT 0,
                
                -- Ubicación
                direccion TEXT,
                ciudad TEXT,
                pais TEXT,
                codigo_postal TEXT,
                latitud REAL,
                longitud REAL,
                
                -- Redes sociales
                linkedin TEXT,
                facebook TEXT,
                twitter TEXT,
                instagram TEXT,
                youtube TEXT,
                tiktok TEXT,
                
                -- Metadata
                descripcion TEXT,
                horario TEXT,
                osm_id TEXT,
                osm_type TEXT,
                validada BOOLEAN DEFAULT 0,
                scrapeada BOOLEAN DEFAULT 0,
                
                -- Control
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(osm_id, osm_type)
            )
        ''')
        
        # Índices para búsquedas rápidas
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rubro ON empresas(rubro_key)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ciudad ON empresas(ciudad)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_validada ON empresas(validada)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email ON empresas(email)')
        
        conn.commit()
        conn.close()
        
        logger.info(f"✓ Base de datos B2B inicializada: {DATABASE_PATH}")
        return True
        
    except Exception as e:
        logger.error(f"Error inicializando BD: {e}")
        return False

def insertar_empresa(empresa: Dict) -> bool:
    """Inserta empresa en base de datos"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO empresas 
            (nombre, rubro, rubro_key, email, email_valido, telefono, telefono_valido,
             website, website_valido, direccion, ciudad, pais, codigo_postal,
             latitud, longitud, linkedin, facebook, twitter, instagram, youtube, tiktok,
             descripcion, horario, osm_id, osm_type, validada, scrapeada, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            empresa.get('nombre'),
            empresa.get('rubro'),
            empresa.get('rubro_key'),
            empresa.get('email', ''),
            empresa.get('email_valido', False),
            empresa.get('telefono', ''),
            empresa.get('telefono_valido', False),
            empresa.get('website', ''),
            empresa.get('website_valido', False),
            empresa.get('direccion', ''),
            empresa.get('ciudad', ''),
            empresa.get('pais', ''),
            empresa.get('codigo_postal', ''),
            empresa.get('latitud'),
            empresa.get('longitud'),
            empresa.get('linkedin', ''),
            empresa.get('facebook', ''),
            empresa.get('twitter', ''),
            empresa.get('instagram', ''),
            empresa.get('youtube', ''),
            empresa.get('tiktok', ''),
            empresa.get('descripcion', ''),
            empresa.get('horario', ''),
            empresa.get('osm_id'),
            empresa.get('osm_type'),
            empresa.get('validada', False),
            empresa.get('scrapeada', False),
            datetime.now()
        ))
        
        conn.commit()
        conn.close()
        
        logger.debug(f"✓ Empresa guardada: {empresa.get('nombre')}")
        return True
        
    except Exception as e:
        logger.error(f"Error insertando empresa: {e}")
        return False

def obtener_todas_empresas() -> List[Dict]:
    """Obtiene todas las empresas"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM empresas ORDER BY created_at DESC')
        rows = cursor.fetchall()
        
        empresas = [dict(row) for row in rows]
        conn.close()
        
        logger.info(f"✓ Recuperadas {len(empresas)} empresas")
        return empresas
        
    except Exception as e:
        logger.error(f"Error obteniendo empresas: {e}")
        return []

def buscar_empresas(
    rubro: Optional[str] = None,
    ciudad: Optional[str] = None,
    solo_validas: bool = False,
    con_email: bool = False,
    con_telefono: bool = False
) -> List[Dict]:
    """Busca empresas con filtros"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = 'SELECT * FROM empresas WHERE 1=1'
        params = []
        
        if rubro:
            query += ' AND rubro_key = ?'
            params.append(rubro)
        
        if ciudad:
            query += ' AND ciudad LIKE ?'
            params.append(f'%{ciudad}%')
        
        if solo_validas:
            query += ' AND validada = 1'
        
        if con_email:
            query += ' AND email_valido = 1'
        
        if con_telefono:
            query += ' AND telefono_valido = 1'
        
        query += ' ORDER BY created_at DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        empresas = [dict(row) for row in rows]
        conn.close()
        
        logger.info(f"✓ Búsqueda: {len(empresas)} resultados")
        return empresas
        
    except Exception as e:
        logger.error(f"Error en búsqueda: {e}")
        return []

def obtener_estadisticas() -> Dict:
    """Obtiene estadísticas de empresas"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Total empresas
        cursor.execute('SELECT COUNT(*) FROM empresas')
        total = cursor.fetchone()[0]
        
        # Validadas
        cursor.execute('SELECT COUNT(*) FROM empresas WHERE validada = 1')
        validadas = cursor.fetchone()[0]
        
        # Con contacto
        cursor.execute('SELECT COUNT(*) FROM empresas WHERE email_valido = 1')
        con_email = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM empresas WHERE telefono_valido = 1')
        con_telefono = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM empresas WHERE website_valido = 1')
        con_website = cursor.fetchone()[0]
        
        # Por rubro
        cursor.execute('''
            SELECT rubro, COUNT(*) as count 
            FROM empresas 
            GROUP BY rubro 
            ORDER BY count DESC
        ''')
        por_rubro = dict(cursor.fetchall())
        
        # Por ciudad
        cursor.execute('''
            SELECT ciudad, COUNT(*) as count 
            FROM empresas 
            WHERE ciudad != ""
            GROUP BY ciudad 
            ORDER BY count DESC 
            LIMIT 10
        ''')
        por_ciudad = dict(cursor.fetchall())
        
        conn.close()
        
        return {
            'total': total,
            'validadas': validadas,
            'con_email': con_email,
            'con_telefono': con_telefono,
            'con_website': con_website,
            'tasa_validacion': round(validadas/total*100, 2) if total > 0 else 0,
            'por_rubro': por_rubro,
            'por_ciudad': por_ciudad
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        return {}

def exportar_a_csv(rubro: Optional[str] = None, solo_validas: bool = True) -> str:
    """Exporta empresas a CSV con codificación UTF-8 y BOM para Excel"""
    try:
        import csv
        
        empresas = buscar_empresas(rubro=rubro, solo_validas=solo_validas)
        
        if not empresas:
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"empresas_b2b_{rubro or 'todas'}_{timestamp}.csv"
        output_path = os.path.join(os.path.dirname(DATABASE_PATH), filename)
        
        # Escribir con BOM UTF-8 para compatibilidad con Excel
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            # Campos completos incluyendo validación
            campos = [
                'id', 'nombre', 'rubro', 
                'email', 'email_valido', 
                'telefono', 'telefono_valido',
                'direccion', 'ciudad', 'pais', 
                'sitio_web', 'linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok',
                'validada', 'descripcion', 
                'latitud', 'longitud',
                'created_at'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=campos, extrasaction='ignore')
            
            # Escribir headers personalizados más legibles
            custom_headers = {
                'id': 'ID',
                'nombre': 'Nombre',
                'rubro': 'Rubro',
                'email': 'Email',
                'email_valido': 'Email Válido',
                'telefono': 'Teléfono',
                'telefono_valido': 'Teléfono Válido',
                'direccion': 'Dirección',
                'ciudad': 'Ciudad',
                'pais': 'País',
                'sitio_web': 'Sitio Web',
                'linkedin': 'LinkedIn',
                'facebook': 'Facebook',
                'instagram': 'Instagram',
                'twitter': 'Twitter/X',
                'youtube': 'YouTube',
                'tiktok': 'TikTok',
                'validada': 'Estado',
                'descripcion': 'Descripción',
                'latitud': 'Latitud',
                'longitud': 'Longitud',
                'created_at': 'Fecha Creación'
            }
            
            csvfile.write(','.join([custom_headers.get(f, f) for f in campos]) + '\n')
            
            # Escribir datos con formato mejorado
            for empresa in empresas:
                # Convertir valores booleanos a texto legible
                empresa_formatted = empresa.copy()
                empresa_formatted['email_valido'] = 'Sí' if empresa.get('email_valido') else 'No'
                empresa_formatted['telefono_valido'] = 'Sí' if empresa.get('telefono_valido') else 'No'
                empresa_formatted['validada'] = 'Válida' if empresa.get('validada') else 'Pendiente'
                
                writer.writerow(empresa_formatted)
        
        logger.info(f"✓ CSV exportado: {output_path} ({len(empresas)} registros)")
        return output_path
        
    except Exception as e:
        logger.error(f"Error exportando CSV: {e}")
        return None

def exportar_a_json(rubro: Optional[str] = None, solo_validas: bool = True) -> str:
    """Exporta empresas a JSON con formato legible"""
    try:
        empresas = buscar_empresas(rubro=rubro, solo_validas=solo_validas)
        
        if not empresas:
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"empresas_b2b_{rubro or 'todas'}_{timestamp}.json"
        output_path = os.path.join(os.path.dirname(DATABASE_PATH), filename)
        
        # Convertir valores booleanos a texto legible para JSON también
        empresas_formatted = []
        for empresa in empresas:
            emp_copy = empresa.copy()
            emp_copy['email_valido_texto'] = 'Sí' if empresa.get('email_valido') else 'No'
            emp_copy['telefono_valido_texto'] = 'Sí' if empresa.get('telefono_valido') else 'No'
            emp_copy['estado'] = 'Válida' if empresa.get('validada') else 'Pendiente'
            empresas_formatted.append(emp_copy)
        
        with open(output_path, 'w', encoding='utf-8') as jsonfile:
            json.dump(empresas_formatted, jsonfile, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"✓ JSON exportado: {output_path} ({len(empresas)} registros)")
        return output_path
        
    except Exception as e:
        logger.error(f"Error exportando JSON: {e}")
        return None

def limpiar_base_datos() -> bool:
    """Elimina todas las empresas de la base de datos"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM empresas')
        deleted_count = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        logger.info(f"✓ Base de datos limpiada: {deleted_count} empresas eliminadas")
        return True
        
    except Exception as e:
        logger.error(f"Error limpiando base de datos: {e}")
        return False

