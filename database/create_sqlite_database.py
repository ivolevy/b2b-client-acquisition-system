#!/usr/bin/env python3
"""
Script para recrear la base de datos SQLite completa
B2B Client Acquisition System

Uso:
    python create_sqlite_database.py

O especificando la ruta de la base de datos:
    python create_sqlite_database.py --db-path /ruta/a/empresas_b2b.db
"""

import sqlite3
import os
import sys
import argparse
from pathlib import Path

# Template de email por defecto
DEFAULT_TEMPLATE = {
    'nombre': 'Presentación Dota Solutions',
    'subject': 'Hola equipo de {nombre_empresa} - Oportunidad de colaboración',
    'body_html': '''<html>
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
    'body_text': '''Hola equipo de {nombre_empresa}, ¿cómo están?

Mi nombre es Ivan Levy, CTO de Dota Solutions, somos una agencia que desarrolla soluciones de software a medida.

Estuvimos analizando {rubro} y realmente nos pareció muy innovador — creemos que están ofreciendo una propuesta con gran potencial en el sector.

Queremos ofrecerles nuestros servicios, nos dedicamos a resolver soluciones digitales, sean sitios webs, sistemas de gestión, análisis de datos, automatizaciones y demás.

Nos encantaría coordinar una breve charla para mostrarles el enfoque y ver cómo podríamos trabajar codo a codo en este proyecto.

Un saludo,
Ivan Levy
CTO – Dota Solutions

LinkedIn: https://www.linkedin.com/in/ivan-levy/
Sitio web: https://www.dotasolutions.agency/'''
}

def create_database(db_path: str, force: bool = False):
    """
    Crea la base de datos SQLite completa con todas las tablas, índices y datos iniciales.
    
    Args:
        db_path: Ruta donde crear la base de datos
        force: Si True, elimina la base de datos existente antes de crear una nueva
    """
    # Crear directorio si no existe
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    
    # Eliminar base de datos existente si force=True
    if force and os.path.exists(db_path):
        print(f"⚠️  Eliminando base de datos existente: {db_path}")
        os.remove(db_path)
    
    if os.path.exists(db_path) and not force:
        response = input(f"⚠️  La base de datos {db_path} ya existe. ¿Deseas eliminarla y crear una nueva? (s/N): ")
        if response.lower() == 's':
            os.remove(db_path)
        else:
            print("❌ Operación cancelada.")
            return False
    
    print(f"📦 Creando base de datos: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # =====================================================
        # TABLA: empresas
        # =====================================================
        print("📋 Creando tabla: empresas")
        cursor.execute('''
            CREATE TABLE empresas (
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
                google_id TEXT,
                
                -- Control
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(google_id)
            )
        ''')
        
        # =====================================================
        # TABLA: email_templates
        # =====================================================
        print("📋 Creando tabla: email_templates")
        cursor.execute('''
            CREATE TABLE email_templates (
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
        
        # =====================================================
        # TABLA: email_history
        # =====================================================
        print("📋 Creando tabla: email_history")
        cursor.execute('''
            CREATE TABLE email_history (
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
        
        # =====================================================
        # TABLA: scraping_cache
        # =====================================================
        print("📋 Creando tabla: scraping_cache")
        cursor.execute('''
            CREATE TABLE scraping_cache (
                website TEXT PRIMARY KEY,
                data_json TEXT,
                status TEXT,
                http_status INTEGER,
                last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # =====================================================
        # CREAR ÍNDICES
        # =====================================================
        print("🔍 Creando índices...")
        
        # Índices para empresas
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_rubro ON empresas(rubro_key)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ciudad ON empresas(ciudad)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email ON empresas(email)')
        
        # Índices para email_history
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email_history_empresa ON email_history(empresa_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email_history_template ON email_history(template_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_email_history_sent ON email_history(sent_at)')
        
        # Índice para scraping_cache
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_scraping_cache_last ON scraping_cache(last_scraped_at)')
        
        # =====================================================
        # INSERTAR DATOS INICIALES
        # =====================================================
        print("📝 Insertando datos iniciales...")
        
        # Insertar template por defecto
        cursor.execute('''
            INSERT INTO email_templates (nombre, subject, body_html, body_text, es_default)
            VALUES (?, ?, ?, ?, 1)
        ''', (
            DEFAULT_TEMPLATE['nombre'],
            DEFAULT_TEMPLATE['subject'],
            DEFAULT_TEMPLATE['body_html'],
            DEFAULT_TEMPLATE['body_text']
        ))
        
        # =====================================================
        # COMMIT Y CIERRE
        # =====================================================
        conn.commit()
        conn.close()
        
        print("✅ Base de datos creada exitosamente!")
        print(f"📁 Ubicación: {os.path.abspath(db_path)}")
        
        # Verificar tablas creadas
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        print(f"\n📊 Tablas creadas ({len(tables)}):")
        for table in tables:
            print(f"   - {table[0]}")
        
        # Verificar template por defecto
        cursor.execute("SELECT COUNT(*) FROM email_templates")
        template_count = cursor.fetchone()[0]
        print(f"\n📧 Templates de email: {template_count}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creando base de datos: {e}")
        if os.path.exists(db_path):
            os.remove(db_path)
        return False

def main():
    parser = argparse.ArgumentParser(
        description='Crea la base de datos SQLite completa para el sistema B2B'
    )
    parser.add_argument(
        '--db-path',
        type=str,
        default=os.path.join(os.path.dirname(__file__), '..', 'data', 'empresas_b2b.db'),
        help='Ruta donde crear la base de datos (default: ../data/empresas_b2b.db)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Elimina la base de datos existente sin preguntar'
    )
    
    args = parser.parse_args()
    
    # Convertir a ruta absoluta
    db_path = os.path.abspath(args.db_path)
    
    success = create_database(db_path, force=args.force)
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()

