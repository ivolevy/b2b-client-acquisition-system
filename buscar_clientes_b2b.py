#!/usr/bin/env python3
"""
Script de ejecución simple para búsqueda B2B de clientes por rubro
Uso: python buscar_clientes_b2b.py
"""

import sys
import os

# Agregar backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from b2b_client import buscar_empresas_por_rubro, listar_rubros_disponibles
from scraper_b2b import enriquecer_empresa_b2b
from validators import filtrar_empresas_validas
from db_b2b import init_db_b2b, insertar_empresa, exportar_a_csv, exportar_a_json
import json

def mostrar_menu():
    """Muestra menú interactivo"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║        SISTEMA B2B DE CAPTACIÓN DE CLIENTES POR RUBRO        ║
╚══════════════════════════════════════════════════════════════╝

Selecciona una opción:

1. Ver rubros disponibles
2. Buscar empresas por rubro
3. Buscar con scraping de sitios web
4. Exportar resultados a CSV
5. Exportar resultados a JSON
6. Salir
    """)

def ver_rubros():
    """Muestra rubros disponibles"""
    rubros = listar_rubros_disponibles()
    
    print("\n📋 RUBROS DISPONIBLES:")
    print("=" * 60)
    for key, nombre in rubros.items():
        print(f"  • {key:30} → {nombre}")
    print("=" * 60)

def buscar_empresas():
    """Búsqueda interactiva de empresas"""
    print("\n🔍 BÚSQUEDA DE EMPRESAS")
    print("=" * 60)
    
    # Seleccionar rubro
    print("\nRubros disponibles:")
    rubros = listar_rubros_disponibles()
    for i, (key, nombre) in enumerate(rubros.items(), 1):
        print(f"  {i}. {nombre} ({key})")
    
    try:
        opcion = int(input("\nSelecciona número de rubro: "))
        rubro_key = list(rubros.keys())[opcion - 1]
    except:
        print("❌ Opción inválida")
        return
    
    # Ciudad (opcional)
    ciudad = input("Ciudad (Enter para omitir): ").strip() or None
    pais = input("País (Enter para omitir): ").strip() or None
    
    print(f"\n🚀 Buscando empresas...")
    print(f"   Rubro: {rubros[rubro_key]}")
    if ciudad:
        print(f"   Ciudad: {ciudad}")
    if pais:
        print(f"   País: {pais}")
    
    # Buscar
    empresas = buscar_empresas_por_rubro(rubro_key, pais, ciudad)
    
    if not empresas:
        print("\n❌ No se encontraron empresas")
        return
    
    print(f"\n✓ Encontradas {len(empresas)} empresas en OpenStreetMap")
    
    # Validar
    print("\n🔍 Validando datos de contacto...")
    empresas_validas, stats = filtrar_empresas_validas(empresas)
    
    print(f"""
📊 RESULTADOS DE VALIDACIÓN:
   Total encontradas: {stats['total']}
   Válidas: {stats['validas']} ({stats['tasa_exito']}%)
   Con email: {stats['con_email']}
   Con teléfono: {stats['con_telefono']}
   Con website: {stats['con_website']}
    """)
    
    # Guardar en BD
    init_db_b2b()
    for empresa in empresas_validas:
        insertar_empresa(empresa)
    
    print(f"✅ {len(empresas_validas)} empresas guardadas en base de datos")
    
    # Mostrar algunas
    print("\n📋 PRIMERAS 5 EMPRESAS VÁLIDAS:")
    print("=" * 60)
    for empresa in empresas_validas[:5]:
        print(f"\n🏢 {empresa['nombre']}")
        print(f"   Rubro: {empresa['rubro']}")
        if empresa.get('email'):
            print(f"   📧 Email: {empresa['email']}")
        if empresa.get('telefono'):
            print(f"   📞 Teléfono: {empresa['telefono']}")
        if empresa.get('website'):
            print(f"   🌐 Web: {empresa['website']}")
        if empresa.get('ciudad'):
            print(f"   📍 {empresa['ciudad']}, {empresa.get('pais', '')}")

def buscar_con_scraping():
    """Búsqueda con web scraping"""
    print("\n🔍 BÚSQUEDA CON WEB SCRAPING")
    print("=" * 60)
    print("⚠️  Esto puede tomar varios minutos...")
    
    # Seleccionar rubro
    rubros = listar_rubros_disponibles()
    for i, (key, nombre) in enumerate(rubros.items(), 1):
        print(f"  {i}. {nombre}")
    
    try:
        opcion = int(input("\nSelecciona número de rubro: "))
        rubro_key = list(rubros.keys())[opcion - 1]
    except:
        print("❌ Opción inválida")
        return
    
    ciudad = input("Ciudad (Enter para omitir): ").strip() or None
    pais = input("País (Enter para omitir): ").strip() or None
    
    print(f"\n🚀 Buscando y scrapeando...")
    
    # Buscar
    empresas = buscar_empresas_por_rubro(rubro_key, pais, ciudad)
    
    if not empresas:
        print("\n❌ No se encontraron empresas")
        return
    
    print(f"✓ Encontradas {len(empresas)} empresas")
    
    # Enriquecer con scraping
    print("\n🔄 Scrapeando sitios web...")
    empresas_enriquecidas = []
    for i, empresa in enumerate(empresas, 1):
        if empresa.get('website'):
            print(f"  [{i}/{len(empresas)}] {empresa['nombre']}")
            empresa = enriquecer_empresa_b2b(empresa)
        empresas_enriquecidas.append(empresa)
    
    # Validar
    empresas_validas, stats = filtrar_empresas_validas(empresas_enriquecidas)
    
    print(f"""
📊 RESULTADOS:
   Total: {stats['total']}
   Válidas: {stats['validas']} ({stats['tasa_exito']}%)
   Con email: {stats['con_email']}
   Con teléfono: {stats['con_telefono']}
    """)
    
    # Guardar
    init_db_b2b()
    for empresa in empresas_validas:
        insertar_empresa(empresa)
    
    print(f"✅ {len(empresas_validas)} empresas guardadas")

def exportar_csv():
    """Exporta a CSV"""
    print("\n📥 EXPORTAR A CSV")
    print("=" * 60)
    
    rubro = input("Rubro (Enter para todas): ").strip() or None
    solo_validas = input("¿Solo válidas? (S/n): ").strip().lower() != 'n'
    
    archivo = exportar_a_csv(rubro, solo_validas)
    
    if archivo:
        print(f"\n✅ Exportado exitosamente:")
        print(f"   📄 {archivo}")
    else:
        print("\n❌ No hay datos para exportar")

def exportar_json_menu():
    """Exporta a JSON"""
    print("\n📥 EXPORTAR A JSON")
    print("=" * 60)
    
    rubro = input("Rubro (Enter para todas): ").strip() or None
    solo_validas = input("¿Solo válidas? (S/n): ").strip().lower() != 'n'
    
    archivo = exportar_a_json(rubro, solo_validas)
    
    if archivo:
        print(f"\n✅ Exportado exitosamente:")
        print(f"   📄 {archivo}")
    else:
        print("\n❌ No hay datos para exportar")

def main():
    """Función principal"""
    init_db_b2b()
    
    while True:
        mostrar_menu()
        
        opcion = input("Opción: ").strip()
        
        if opcion == '1':
            ver_rubros()
        elif opcion == '2':
            buscar_empresas()
        elif opcion == '3':
            buscar_con_scraping()
        elif opcion == '4':
            exportar_csv()
        elif opcion == '5':
            exportar_json_menu()
        elif opcion == '6':
            print("\n👋 ¡Hasta luego!")
            break
        else:
            print("\n❌ Opción inválida")
        
        input("\nPresiona Enter para continuar...")

if __name__ == "__main__":
    main()

