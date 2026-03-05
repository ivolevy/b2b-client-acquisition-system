
import asyncio
import os
import sys

# Añadir el directorio raíz al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.google_places_client import GooglePlacesClient

async def test_cost_optimization():
    print("--- Test de Optimización de Costos y Presupuesto ---")
    
    client = GooglePlacesClient()
    
    # Prueba 1: Verificar que use_advanced=False genera una máscara de campos básica
    print("\n1. Verificando máscaras de campo...")
    print(f"Campos Basic: {len(client.FIELD_MASK_BASIC)}")
    print(f"Campos Advanced: {len(client.FIELD_MASK_ADVANCED)}")
    
    # Prueba 2: Simular búsqueda con SKU Básico
    print("\n2. Simulando búsqueda con SKU Básico ($17/1k)...")
    res_basic = await client.search_places(query="Restaurantes", max_results=1, use_advanced=False)
    if "error" in res_basic:
        print(f"Error esperado o real: {res_basic['error']}")
    else:
        print(f"Éxito: {len(res_basic.get('places', []))} resultados.")
        # Verificar que NO trae teléfono si es basic
        place = res_basic.get('places', [{}])[0]
        if 'nationalPhoneNumber' not in place:
            print("Confirmado: No se descargaron campos Advanced (Ahorro de costos OK)")

    # Prueba 3: Simular agotamiento de presupuesto
    print("\n3. Simulando presupuesto agotado...")
    original_limit = client.BUDGET_LIMIT_USD
    client.BUDGET_LIMIT_USD = 0 # Forzar bloqueo
    
    res_blocked = await client.search_places(query="Test Presupuesto", use_advanced=False)
    if res_blocked.get("error") == "PRESUPUESTO_AGOTADO":
        print("✅ EL BLOQUEO DE SEGURIDAD FUNCIONA: El sistema se detuvo antes de llamar a Google.")
    else:
        print("❌ FALLA: El bloqueo de seguridad no funcionó.")

    client.BUDGET_LIMIT_USD = original_limit
    print("\n--- Test Finalizado ---")

if __name__ == "__main__":
    asyncio.run(test_cost_optimization())
