#!/usr/bin/env python3
"""
Script de migración de base de datos
Agrega columnas para:
- Redes sociales (Instagram, Facebook, Twitter, LinkedIn, YouTube, TikTok)
- Sistema Kanban (estado, notas, fecha_ultimo_contacto)
- Scoring de leads (lead_score)
"""

import sqlite3
import os
from datetime import datetime

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'empresas_b2b.db')

def migrate_database():
    """Ejecuta todas las migraciones necesarias"""
    
    print(" Iniciando migración de base de datos...")
    print(f" Base de datos: {DATABASE_PATH}")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Lista de columnas a agregar
    migrations = [
        # Redes sociales
        ("instagram", "TEXT", "Instagram URL"),
        ("facebook", "TEXT", "Facebook URL"),
        ("twitter", "TEXT", "Twitter/X URL"),
        ("linkedin", "TEXT", "LinkedIn URL"),
        ("youtube", "TEXT", "YouTube URL"),
        ("tiktok", "TEXT", "TikTok URL"),
        
        # Sistema Kanban
        ("estado", "TEXT DEFAULT 'por_contactar'", "Estado del lead"),
        ("notas", "TEXT", "Notas sobre la empresa"),
        ("fecha_ultimo_contacto", "TIMESTAMP", "Última fecha de contacto"),
        
        # Scoring
        ("lead_score", "INTEGER DEFAULT 0", "Puntuación del lead (0-100)"),
    ]
    
    # Obtener columnas existentes
    cursor.execute("PRAGMA table_info(empresas)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    # Agregar columnas que no existen
    added_count = 0
    for column_name, column_type, description in migrations:
        if column_name not in existing_columns:
            try:
                sql = f"ALTER TABLE empresas ADD COLUMN {column_name} {column_type}"
                cursor.execute(sql)
                print(f"   Agregada columna: {column_name} ({description})")
                added_count += 1
            except sqlite3.Error as e:
                print(f"   Error agregando {column_name}: {e}")
        else:
            print(f"  ⏭  Columna ya existe: {column_name}")
    
    conn.commit()
    conn.close()
    
    print(f"\n Migración completada!")
    print(f"    {added_count} columnas nuevas agregadas")
    print(f"    Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n Próximo paso: Reiniciar el backend para aplicar cambios")

if __name__ == "__main__":
    migrate_database()

