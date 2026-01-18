import sys
import os
import traceback
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simulation")

# Simular entorno Vercel
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.append(os.path.dirname(__file__))

print("--- INICIANDO SIMULACION DE ARRANQUE VERCEL ---")

try:
    print("1. Intentando importar backend.main...")
    from backend.main import app
    print("✅ backend.main importado ÉXITOSAMENTE")
    
    # Verificar que NO existan rutas de outlook
    outlook_routes = [r for r in app.routes if "outlook" in getattr(r, "path", "")]
    if outlook_routes:
        print(f"❌ ADVERTENCIA: Se encontraron {len(outlook_routes)} rutas de Outlook remnant!")
        for r in outlook_routes:
            print(f"   - {r.path}")
    else:
        print("✅ Rutas de Outlook eliminadas correctamente")

    # Verificar rutas criticas
    found_stats = False
    found_rubros = False
    
    for route in app.routes:
        if getattr(route, "path", "") == "/estadisticas":
            found_stats = True
        if "rubros" in getattr(route, "path", ""):
            found_rubros = True
            
    if found_stats:
        print("✅ Ruta /estadisticas encontrada")
    else:
        print("❌ Ruta /estadisticas NO encontrada")
        
    if found_rubros:
        print("✅ Rutas de rubros encontradas")
    else:
        print("❌ Rutas de rubros NO encontradas")
        
except Exception as e:
    print("\n❌ CRASH DETECTADO:")
    traceback.print_exc()
    sys.exit(1)
    
print("--- SIMULACION COMPLETADA ---")
