import sys
import os
import traceback
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.abspath('.'))

print("Iniciando prueba de carga de backend...")
try:
    from backend.main import app
    print("✅ Backend cargado exitosamente")
except Exception as e:
    print(f"❌ Error cargando backend: {e}")
    traceback.print_exc()
