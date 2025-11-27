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
import math

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# En Vercel, usar /tmp que es escribible. En local, usar data/
if os.environ.get('VERCEL'):
    DATABASE_PATH = os.environ.get('DATABASE_PATH', '/tmp/empresas_b2b.db')
else:
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
                telefono TEXT,
                website TEXT,
                
                -- Ubicación
                direccion TEXT,
                ciudad TEXT,
                pais TEXT,
                codigo_postal TEXT,
                latitud REAL,
                longitud REAL,
                
                -- Información de búsqueda
                busqueda_ubicacion_nombre TEXT,
                busqueda_centro_lat REAL,
                busqueda_centro_lng REAL,
                busqueda_radio_km REAL,
                distancia_km REAL,
                
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
                
                -- Control
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(osm_id, osm_type)
            )
        ''')
        
        # Tabla de templates de email
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                subject TEXT NOT NULL,
                body_html TEXT NOT NULL,
                body_text TEXT,
                es_default INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de historial de emails enviados
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empresa_id INTEGER,
                empresa_nombre TEXT,
                empresa_email TEXT,
                template_id INTEGER,
                template_nombre TEXT,
                subject TEXT,
                status TEXT,
                error_message TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (empresa_id) REFERENCES empresas(id),
                FOREIGN KEY (template_id) REFERENCES email_templates(id)
            )
        ''')
        
        # Cache de scraping para evitar requests repetidos
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scraping_cache (
                website TEXT PRIMARY KEY,
                data_json TEXT,
                status TEXT,
                http_status INTEGER,
                last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_scraping_cache_last ON scraping_cache(last_scraped_at)')
        
        # Migración: agregar campos de búsqueda si no existen (para bases de datos existentes)
        try:
            cursor.execute('SELECT busqueda_ubicacion_nombre FROM empresas LIMIT 1')
        except sqlite3.OperationalError:
            # Los campos no existen, agregarlos
            logger.info(" Migrando base de datos: agregando campos de búsqueda...")
            cursor.execute('ALTER TABLE empresas ADD COLUMN busqueda_ubicacion_nombre TEXT')
            cursor.execute('ALTER TABLE empresas ADD COLUMN busqueda_centro_lat REAL')
            cursor.execute('ALTER TABLE empresas ADD COLUMN busqueda_centro_lng REAL')
            cursor.execute('ALTER TABLE empresas ADD COLUMN busqueda_radio_km REAL')
            cursor.execute('ALTER TABLE empresas ADD COLUMN distancia_km REAL')
            logger.info(" Migración completada: campos de búsqueda agregados")
        
        # Índices para búsquedas rápidas
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rubro ON empresas(rubro_key)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ciudad ON empresas(ciudad)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email ON empresas(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email_history_empresa ON email_history(empresa_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email_history_template ON email_history(template_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email_history_sent ON email_history(sent_at)')
        
        # Crear templates por defecto si no existen
        cursor.execute('SELECT COUNT(*) FROM email_templates')
        if cursor.fetchone()[0] == 0:
            templates_default = [
                (
                    'Presentación Dota Solutions',
                    'Hola equipo de {nombre_empresa} - Oportunidad de colaboración',
                    '''<html>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ffffff; border-radius: 8px; padding: 30px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola equipo de <strong>{nombre_empresa}</strong>, ¿cómo están?</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Mi nombre es <strong>Ivan Levy</strong>, CTO de <strong>Dota Solutions</strong>, somos una agencia que desarrolla soluciones de software a medida.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Estuvimos analizando <strong>{rubro}</strong> y realmente nos pareció muy innovador — creemos que están ofreciendo una propuesta con gran potencial en el sector.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Queremos ofrecerles nuestros servicios, nos dedicamos a resolver soluciones digitales, sean sitios webs, sistemas de gestión, análisis de datos, automatizaciones y demás.</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Nos encantaría coordinar una breve charla para mostrarles el enfoque y ver cómo podríamos trabajar codo a codo en este proyecto.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 5px;">Un saludo,</p>
            <p style="font-size: 16px; margin-bottom: 5px;"><strong>Ivan Levy</strong></p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">CTO – Dota Solutions</p>
            <p style="font-size: 14px; margin-bottom: 5px;">
                <a href="https://www.linkedin.com/in/ivan-levy/" style="color: #2563eb; text-decoration: none;">LinkedIn: https://www.linkedin.com/in/ivan-levy/</a>
            </p>
            <p style="font-size: 14px; margin-bottom: 0;">
                <a href="https://www.dotasolutions.agency/" style="color: #2563eb; text-decoration: none;">Sitio web: https://www.dotasolutions.agency/</a>
            </p>
        </div>
    </div>
</body>
</html>''',
                    '''Hola equipo de {nombre_empresa}, ¿cómo están?

Mi nombre es Ivan Levy, CTO de Dota Solutions, somos una agencia que desarrolla soluciones de software a medida.

Estuvimos analizando {rubro} y realmente nos pareció muy innovador — creemos que están ofreciendo una propuesta con gran potencial en el sector.

Queremos ofrecerles nuestros servicios, nos dedicamos a resolver soluciones digitales, sean sitios webs, sistemas de gestión, análisis de datos, automatizaciones y demás.

Nos encantaría coordinar una breve charla para mostrarles el enfoque y ver cómo podríamos trabajar codo a codo en este proyecto.

Un saludo,
Ivan Levy
CTO – Dota Solutions

LinkedIn: https://www.linkedin.com/in/ivan-levy/
Sitio web: https://www.dotasolutions.agency/'''
                )
            ]
            for nombre, subject, body_html, body_text in templates_default:
                cursor.execute('''
                    INSERT INTO email_templates (nombre, subject, body_html, body_text, es_default)
                    VALUES (?, ?, ?, ?, 1)
                ''', (nombre, subject, body_html, body_text))
        
        conn.commit()
        conn.close()
        
        logger.info(f" Base de datos B2B inicializada: {DATABASE_PATH}")
        return True
        
    except Exception as e:
        logger.error(f"Error inicializando BD: {e}")
        return False

def calcular_distancia_km(lat1: float, lon1: float, lat2: float, lon2: float) -> Optional[float]:
    """
    Calcula la distancia en kilómetros entre dos puntos geográficos usando la fórmula de Haversine
    
    Args:
        lat1, lon1: Coordenadas del primer punto (centro de búsqueda)
        lat2, lon2: Coordenadas del segundo punto (empresa)
    
    Returns:
        Distancia en kilómetros, o None si alguna coordenada es inválida
    """
    if not all(isinstance(coord, (int, float)) and not math.isnan(coord) 
               for coord in [lat1, lon1, lat2, lon2]):
        return None
    
    # Radio de la Tierra en kilómetros
    R = 6371.0
    
    # Convertir grados a radianes
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Diferencia de latitud y longitud
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Fórmula de Haversine
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distancia = R * c
    return round(distancia, 2)  # Redondear a 2 decimales

def insertar_empresa(empresa: Dict) -> bool:
    """Inserta empresa en base de datos"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO empresas 
            (nombre, rubro, rubro_key, email, telefono, website, direccion, ciudad, pais, 
             codigo_postal, latitud, longitud, linkedin, facebook, twitter, instagram, 
             youtube, tiktok, descripcion, horario, osm_id, osm_type, 
             busqueda_ubicacion_nombre, busqueda_centro_lat, busqueda_centro_lng, 
             busqueda_radio_km, distancia_km, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            empresa.get('nombre'),
            empresa.get('rubro'),
            empresa.get('rubro_key'),
            empresa.get('email', ''),
            empresa.get('telefono', ''),
            empresa.get('website', ''),
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
            empresa.get('busqueda_ubicacion_nombre'),
            empresa.get('busqueda_centro_lat'),
            empresa.get('busqueda_centro_lng'),
            empresa.get('busqueda_radio_km'),
            empresa.get('distancia_km'),
            datetime.now()
        ))
        
        conn.commit()
        conn.close()
        
        logger.debug(f" Empresa guardada: {empresa.get('nombre')}")
        return True
        
    except Exception as e:
        logger.error(f"Error insertando empresa: {e}")
        return False


def guardar_cache_scraping(
    website: Optional[str],
    data: Dict,
    status: str = "success",
    http_status: Optional[int] = None
) -> bool:
    """Guarda/actualiza cache de scraping por website"""
    if not website:
        return False
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO scraping_cache (website, data_json, status, http_status, last_scraped_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(website) DO UPDATE SET
                data_json=excluded.data_json,
                status=excluded.status,
                http_status=excluded.http_status,
                last_scraped_at=CURRENT_TIMESTAMP
        ''', (
            website.strip(),
            json.dumps(data or {}, ensure_ascii=False),
            status,
            http_status
        ))
        
        conn.commit()
        conn.close()
        return True
    
    except Exception as e:
        logger.error(f"Error guardando cache de scraping ({website}): {e}")
        return False


def obtener_cache_scraping(website: Optional[str]) -> Optional[Dict]:
    """Obtiene cache de scraping para un website si existe"""
    if not website:
        return None
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM scraping_cache WHERE website = ?', (website.strip(),))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        data_json = row['data_json'] or '{}'
        try:
            cached_data = json.loads(data_json)
        except json.JSONDecodeError:
            cached_data = {}
        
        return {
            'website': row['website'],
            'status': row['status'],
            'http_status': row['http_status'],
            'last_scraped_at': row['last_scraped_at'],
            'data': cached_data
        }
    
    except Exception as e:
        logger.error(f"Error obteniendo cache de scraping ({website}): {e}")
        return None

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
        
        logger.info(f" Recuperadas {len(empresas)} empresas")
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
        
        logger.info(f" Búsqueda: {len(empresas)} resultados")
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
        
        # Con contacto
        cursor.execute('SELECT COUNT(*) FROM empresas WHERE email != ""')
        con_email = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM empresas WHERE telefono != ""')
        con_telefono = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM empresas WHERE website != ""')
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
            'con_email': con_email,
            'con_telefono': con_telefono,
            'con_website': con_website,
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
                'direccion', 'ciudad', 'pais', 'codigo_postal',
                'sitio_web', 'linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok',
                'validada', 'descripcion', 
                'latitud', 'longitud',
                'busqueda_ubicacion_nombre', 'busqueda_centro_lat', 'busqueda_centro_lng', 
                'busqueda_radio_km', 'distancia_km',
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
                'codigo_postal': 'Código Postal',
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
                'busqueda_ubicacion_nombre': 'Ubicación de Búsqueda',
                'busqueda_centro_lat': 'Centro Búsqueda (Lat)',
                'busqueda_centro_lng': 'Centro Búsqueda (Lng)',
                'busqueda_radio_km': 'Radio Búsqueda (km)',
                'distancia_km': 'Distancia (km)',
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
        
        logger.info(f" CSV exportado: {output_path} ({len(empresas)} registros)")
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
        
        logger.info(f" JSON exportado: {output_path} ({len(empresas)} registros)")
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
        
        logger.info(f" Base de datos limpiada: {deleted_count} empresas eliminadas")
        return True
        
    except Exception as e:
        logger.error(f"Error limpiando base de datos: {e}")
        return False

# ========== FUNCIONES PARA EMAIL TEMPLATES ==========

def obtener_templates() -> List[Dict]:
    """Obtiene todos los templates de email"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM email_templates ORDER BY nombre')
        rows = cursor.fetchall()
        
        templates = [dict(row) for row in rows]
        conn.close()
        
        return templates
        
    except Exception as e:
        logger.error(f"Error obteniendo templates: {e}")
        return []

def obtener_template(template_id: int) -> Optional[Dict]:
    """Obtiene un template por ID"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM email_templates WHERE id = ?', (template_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        return dict(row) if row else None
        
    except Exception as e:
        logger.error(f"Error obteniendo template: {e}")
        return None

def crear_template(nombre: str, subject: str, body_html: str, body_text: Optional[str] = None) -> Optional[int]:
    """Crea un nuevo template"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO email_templates (nombre, subject, body_html, body_text, updated_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (nombre, subject, body_html, body_text, datetime.now()))
        
        template_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f" Template creado: {nombre} (ID: {template_id})")
        return template_id
        
    except sqlite3.IntegrityError:
        logger.error(f"Template '{nombre}' ya existe")
        return None
    except Exception as e:
        logger.error(f"Error creando template: {e}")
        return None

def actualizar_template(template_id: int, nombre: Optional[str] = None, subject: Optional[str] = None, 
                       body_html: Optional[str] = None, body_text: Optional[str] = None) -> bool:
    """Actualiza un template"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if nombre:
            updates.append('nombre = ?')
            params.append(nombre)
        if subject:
            updates.append('subject = ?')
            params.append(subject)
        if body_html:
            updates.append('body_html = ?')
            params.append(body_html)
        if body_text is not None:
            updates.append('body_text = ?')
            params.append(body_text)
        
        if not updates:
            conn.close()
            return False
        
        updates.append('updated_at = ?')
        params.append(datetime.now())
        params.append(template_id)
        
        query = f'UPDATE email_templates SET {", ".join(updates)} WHERE id = ?'
        cursor.execute(query, params)
        
        conn.commit()
        conn.close()
        
        logger.info(f" Template actualizado: ID {template_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error actualizando template: {e}")
        return False

def eliminar_template(template_id: int) -> bool:
    """Elimina un template"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM email_templates WHERE id = ?', (template_id,))
        deleted = cursor.rowcount > 0
        
        conn.commit()
        conn.close()
        
        if deleted:
            logger.info(f" Template eliminado: ID {template_id}")
        return deleted
        
    except Exception as e:
        logger.error(f"Error eliminando template: {e}")
        return False

# ========== FUNCIONES PARA EMAIL HISTORY ==========

def guardar_email_history(empresa_id: int, empresa_nombre: str, empresa_email: str,
                         template_id: int, template_nombre: str, subject: str,
                         status: str, error_message: Optional[str] = None) -> bool:
    """Guarda un registro en el historial de emails"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO email_history 
            (empresa_id, empresa_nombre, empresa_email, template_id, template_nombre, 
             subject, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (empresa_id, empresa_nombre, empresa_email, template_id, template_nombre,
              subject, status, error_message))
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Error guardando historial: {e}")
        return False

def obtener_email_history(empresa_id: Optional[int] = None, template_id: Optional[int] = None,
                         limit: int = 100) -> List[Dict]:
    """Obtiene el historial de emails enviados"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = 'SELECT * FROM email_history WHERE 1=1'
        params = []
        
        if empresa_id:
            query += ' AND empresa_id = ?'
            params.append(empresa_id)
        
        if template_id:
            query += ' AND template_id = ?'
            params.append(template_id)
        
        query += ' ORDER BY sent_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        history = [dict(row) for row in rows]
        conn.close()
        
        return history
        
    except Exception as e:
        logger.error(f"Error obteniendo historial: {e}")
        return []

