#!/usr/bin/env python3
"""
Script para re-validar todas las empresas en la base de datos
Actualiza los campos: email_valido, telefono_valido, validada
"""

import sqlite3
import sys
sys.path.append('backend')

from validators import validar_empresa

def revalidar_todas_las_empresas():
    """Re-valida y actualiza todas las empresas en la BD"""
    
    conn = sqlite3.connect('data/empresas_b2b.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Obtener todas las empresas
    cursor.execute('SELECT * FROM empresas')
    empresas = cursor.fetchall()
    
    print(f" RE-VALIDANDO {len(empresas)} EMPRESAS...\n")
    
    actualizadas = 0
    validas_antes = 0
    validas_despues = 0
    
    for row in empresas:
        empresa = dict(row)
        
        # Contar válidas antes
        if empresa['validada']:
            validas_antes += 1
        
        # Re-validar
        es_valida, empresa_validada, mensaje = validar_empresa(empresa)
        
        # Contar válidas después
        if empresa_validada['validada']:
            validas_despues += 1
        
        # Actualizar en BD si cambió
        if (empresa['email_valido'] != empresa_validada['email_valido'] or
            empresa['telefono_valido'] != empresa_validada['telefono_valido'] or
            empresa['validada'] != empresa_validada['validada']):
            
            cursor.execute('''
                UPDATE empresas 
                SET email_valido = ?,
                    telefono_valido = ?,
                    validada = ?
                WHERE id = ?
            ''', (
                empresa_validada['email_valido'],
                empresa_validada['telefono_valido'],
                empresa_validada['validada'],
                empresa['id']
            ))
            
            actualizadas += 1
            
            if empresa['validada'] != empresa_validada['validada']:
                estado_ant = " Válida" if empresa['validada'] else " Pendiente"
                estado_new = " Válida" if empresa_validada['validada'] else " Pendiente"
                print(f"   {empresa['nombre']}: {estado_ant} → {estado_new}")
    
    conn.commit()
    conn.close()
    
    print(f"\n{'='*70}")
    print(f" RE-VALIDACIÓN COMPLETADA")
    print(f"{'='*70}")
    print(f" Total empresas: {len(empresas)}")
    print(f" Actualizadas: {actualizadas}")
    print(f" Válidas antes: {validas_antes} ({round(validas_antes/len(empresas)*100, 1)}%)")
    print(f" Válidas ahora: {validas_despues} ({round(validas_despues/len(empresas)*100, 1)}%)")
    print(f" Mejora: +{validas_despues - validas_antes} empresas contactables")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    revalidar_todas_las_empresas()

