-- =====================================================
-- B2B CLIENT ACQUISITION SYSTEM - SQLite Database
-- Script SQL para recrear la base de datos SQLite
-- Ejecutar con: sqlite3 empresas_b2b.db < create_sqlite_database.sql
-- =====================================================

-- =====================================================
-- TABLA: empresas
-- =====================================================
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
);

-- =====================================================
-- TABLA: email_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    es_default INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: email_history
-- =====================================================
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
);

-- =====================================================
-- TABLA: scraping_cache
-- =====================================================
CREATE TABLE IF NOT EXISTS scraping_cache (
    website TEXT PRIMARY KEY,
    data_json TEXT,
    status TEXT,
    http_status INTEGER,
    last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índices para empresas
CREATE INDEX IF NOT EXISTS idx_rubro ON empresas(rubro_key);
CREATE INDEX IF NOT EXISTS idx_ciudad ON empresas(ciudad);
CREATE INDEX IF NOT EXISTS idx_email ON empresas(email);

-- Índices para email_history
CREATE INDEX IF NOT EXISTS idx_email_history_empresa ON email_history(empresa_id);
CREATE INDEX IF NOT EXISTS idx_email_history_template ON email_history(template_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent ON email_history(sent_at);

-- Índice para scraping_cache
CREATE INDEX IF NOT EXISTS idx_scraping_cache_last ON scraping_cache(last_scraped_at);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Template de email por defecto
INSERT OR IGNORE INTO email_templates (nombre, subject, body_html, body_text, es_default) VALUES (
    'Presentación Dota Solutions',
    'Hola equipo de {nombre_empresa} - Oportunidad de colaboración',
    '<html>
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
</html>',
    'Hola equipo de {nombre_empresa}, ¿cómo están?

Mi nombre es Ivan Levy, CTO de Dota Solutions, somos una agencia que desarrolla soluciones de software a medida.

Estuvimos analizando {rubro} y realmente nos pareció muy innovador — creemos que están ofreciendo una propuesta con gran potencial en el sector.

Queremos ofrecerles nuestros servicios, nos dedicamos a resolver soluciones digitales, sean sitios webs, sistemas de gestión, análisis de datos, automatizaciones y demás.

Nos encantaría coordinar una breve charla para mostrarles el enfoque y ver cómo podríamos trabajar codo a codo en este proyecto.

Un saludo,
Ivan Levy
CTO – Dota Solutions

LinkedIn: https://www.linkedin.com/in/ivan-levy/
Sitio web: https://www.dotasolutions.agency/',
    1
);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

