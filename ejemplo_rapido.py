#!/usr/bin/env python3
"""
EJEMPLO RÁPIDO - Sistema B2B de Captación de Clientes

Ejecuta este script para ver el sistema en acción
Uso: python3 ejemplo_rapido.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from b2b_client import buscar_empresas_por_rubro, listar_rubros_disponibles
from validators import filtrar_empresas_validas
from db_b2b import init_db_b2b, insertar_empresa, exportar_a_csv, exportar_a_json

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║     EJEMPLO RÁPIDO - SISTEMA B2B CAPTACIÓN DE CLIENTES       ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    # 1. Ver rubros disponibles
    print("\n📋 PASO 1: Rubros Disponibles")
    print("=" * 70)
    rubros = listar_rubros_disponibles()
    for key, nombre in list(rubros.items())[:5]:
        print(f"   • {nombre}")
    print(f"   ... y {len(rubros)-5} más")
    
    # 2. Configuración de búsqueda
    RUBRO = "desarrolladoras_inmobiliarias"  # Cambiar según necesites
    CIUDAD = "Madrid"  # Cambiar según necesites
    
    print(f"\n🔍 PASO 2: Búsqueda de Empresas")
    print("=" * 70)
    print(f"   Rubro: {rubros.get(RUBRO, RUBRO)}")
    print(f"   Ciudad: {CIUDAD}")
    print("\n   Buscando en OpenStreetMap...")
    
    # 3. Buscar empresas
    empresas = buscar_empresas_por_rubro(RUBRO, ciudad=CIUDAD)
    
    if not empresas:
        print("\n   ❌ No se encontraron empresas")
        print("\n   💡 Prueba con otra ciudad: Barcelona, Valencia, Sevilla...")
        return
    
    print(f"   ✓ Encontradas: {len(empresas)} empresas")
    
    # 4. Validar datos de contacto
    print(f"\n✅ PASO 3: Validación de Datos de Contacto")
    print("=" * 70)
    print("   Filtrando solo empresas con email O teléfono válido...")
    
    empresas_validas, stats = filtrar_empresas_validas(empresas)
    
    print(f"""
   📊 RESULTADOS DE VALIDACIÓN:
      • Total encontradas:  {stats['total']}
      • Válidas:            {stats['validas']} ({stats['tasa_exito']}%)
      • Con email válido:   {stats['con_email']}
      • Con teléfono válido: {stats['con_telefono']}
      • Con website:        {stats['con_website']}
    """)
    
    # 5. Guardar en base de datos
    print(f"\n💾 PASO 4: Guardando en Base de Datos")
    print("=" * 70)
    
    init_db_b2b()
    
    for empresa in empresas_validas:
        insertar_empresa(empresa)
    
    print(f"   ✓ {len(empresas_validas)} empresas guardadas en SQLite")
    
    # 6. Mostrar ejemplos
    print(f"\n📋 PASO 5: Ejemplos de Empresas Válidas")
    print("=" * 70)
    
    for i, empresa in enumerate(empresas_validas[:3], 1):
        print(f"\n   [{i}] 🏢 {empresa['nombre']}")
        print(f"       Rubro: {empresa['rubro']}")
        
        if empresa.get('email'):
            print(f"       📧 {empresa['email']}")
        
        if empresa.get('telefono'):
            print(f"       📞 {empresa['telefono']}")
        
        if empresa.get('website'):
            print(f"       🌐 {empresa['website']}")
        
        if empresa.get('ciudad'):
            print(f"       📍 {empresa['ciudad']}, {empresa.get('pais', '')}")
    
    if len(empresas_validas) > 3:
        print(f"\n   ... y {len(empresas_validas) - 3} empresas más")
    
    # 7. Exportar
    print(f"\n📥 PASO 6: Exportando Resultados")
    print("=" * 70)
    
    # Exportar a CSV
    archivo_csv = exportar_a_csv(rubro=RUBRO, solo_validas=True)
    if archivo_csv:
        print(f"   ✓ CSV:  {archivo_csv}")
    
    # Exportar a JSON
    archivo_json = exportar_a_json(rubro=RUBRO, solo_validas=True)
    if archivo_json:
        print(f"   ✓ JSON: {archivo_json}")
    
    # 8. Resumen final
    print(f"\n╔══════════════════════════════════════════════════════════════╗")
    print(f"║                     ✅ PROCESO COMPLETADO                     ║")
    print(f"╚══════════════════════════════════════════════════════════════╝")
    
    print(f"""
📊 RESUMEN:
   • Empresas encontradas:  {len(empresas)}
   • Empresas válidas:      {len(empresas_validas)}
   • Guardadas en BD:       {len(empresas_validas)}
   • Archivos generados:    CSV + JSON

🎯 PRÓXIMOS PASOS:
   1. Revisa los archivos CSV/JSON en la carpeta data/
   2. Explora otros rubros: {', '.join(list(rubros.keys())[:3])}...
   3. Usa el script interactivo: python3 buscar_clientes_b2b.py
   4. Inicia la API REST: cd backend && python main_b2b.py

💡 TIPS:
   • Cambia RUBRO y CIUDAD en este script según necesites
   • Agrega scraping para más datos: enriquecer_empresa_b2b()
   • Filtra por múltiples criterios con buscar_empresas()

📚 Documentación completa en README_B2B.md
    """)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Proceso interrumpido")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

