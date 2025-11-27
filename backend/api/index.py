"""
Vercel serverless function wrapper for FastAPI
"""
import os
import sys

os.environ['VERCEL'] = '1'

# Agregar el directorio raíz del backend al path
current_dir = os.path.dirname(os.path.abspath(__file__))  # api/
backend_root = os.path.dirname(current_dir)  # raíz del backend
sys.path.insert(0, backend_root)

# Importar la app de FastAPI
from main import app

# Usar Mangum para convertir ASGI a formato Lambda/Vercel
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    # Si Mangum no está disponible, exportar la app directamente
    # (aunque esto probablemente no funcionará en Vercel)
    handler = app
