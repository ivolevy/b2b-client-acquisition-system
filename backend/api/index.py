"""
Vercel serverless function wrapper for FastAPI
Usa Mangum para convertir ASGI a formato compatible con AWS Lambda/Vercel
"""
import os
import sys

# Marcar que estamos en Vercel ANTES de cualquier importación
os.environ['VERCEL'] = '1'

# Agregar el directorio backend al path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# SQLite deshabilitado - Preparado para Supabase
# No configuramos DATABASE_PATH ya que no usamos SQLite

# Importar la app de FastAPI
from main import app

# Usar Mangum para convertir la app ASGI a formato Lambda/Vercel
from mangum import Mangum

# Crear el handler usando Mangum
# lifespan="off" porque Vercel maneja el ciclo de vida
handler = Mangum(app, lifespan="off")
