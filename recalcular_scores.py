#!/usr/bin/env python3
"""
Script para recalcular los lead_score de todas las empresas en la base de datos.
"""

import sqlite3
import logging
import os
import sys

# Agregar el directorio backend al path para poder importar lead_utils
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from lead_utils import calcular_lead_score

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'empresas_b2b.db')

def dict_from_row(cursor, row):
    """Convierte una fila de SQL en un diccionario"""
    return dict(zip([col[0] for col in cursor.description], row))

def recalcular_todos_los_scores():
    """Recalcula el lead_score de todas las empresas en la BD"""
    logger.info(" Iniciando recálculo de Lead Scores...")
    logger.info(f" Base de datos: {DATABASE_PATH}\n")
    
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Obtener todas las empresas
    cursor.execute('SELECT * FROM empresas')
    rows = cursor.fetchall()
    empresas = [dict_from_row(cursor, row) for row in rows]
    
    total_empresas = len(empresas)
    actualizadas = 0
    sin_cambios = 0
    
    logger.info(f" Total de empresas: {total_empresas}\n")
    logger.info("=" * 70)
    
    for empresa in empresas:
        # Calcular nuevo score
        nuevo_score = calcular_lead_score(empresa)
        score_anterior = empresa.get('lead_score', 0)
        
        # Solo actualizar si hay cambio
        if nuevo_score != score_anterior:
            cursor.execute('''
                UPDATE empresas 
                SET lead_score = ?
                WHERE id = ?
            ''', (nuevo_score, empresa['id']))
            
            actualizadas += 1
            
            # Mostrar cambios significativos
            if nuevo_score > 0:
                clasificacion = (
                    'HOT ' if nuevo_score >= 80 else
                    'WARM ⭐' if nuevo_score >= 60 else
                    'COLD ' if nuevo_score >= 30 else
                    'LOW '
                )
                logger.info(f" {empresa['nombre'][:40]:40} | {score_anterior:2} → {nuevo_score:2} | {clasificacion}")
        else:
            sin_cambios += 1
    
    conn.commit()
    conn.close()
    
    logger.info("=" * 70)
    logger.info(f"\n Recálculo completado!")
    logger.info(f"    Actualizadas: {actualizadas}")
    logger.info(f"   ⏭  Sin cambios: {sin_cambios}")
    logger.info(f"    Total: {total_empresas}")
    
    # Mostrar distribución
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM empresas WHERE lead_score >= 80')
    hot = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM empresas WHERE lead_score >= 60 AND lead_score < 80')
    warm = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM empresas WHERE lead_score >= 30 AND lead_score < 60')
    cold = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM empresas WHERE lead_score < 30')
    low = cursor.fetchone()[0]
    
    conn.close()
    
    logger.info(f"\n Distribución de Scores:")
    logger.info(f"    HOT (80-100):  {hot:3} empresas")
    logger.info(f"   ⭐ WARM (60-79):  {warm:3} empresas")
    logger.info(f"     COLD (30-59):  {cold:3} empresas")
    logger.info(f"    LOW (0-29):    {low:3} empresas")
    
    logger.info(f"\n Próximo paso: Recargar el frontend para ver los cambios (F5 o ⌘+R)")

if __name__ == "__main__":
    recalcular_todos_los_scores()

