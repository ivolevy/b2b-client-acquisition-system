"""
Vercel serverless function wrapper for FastAPI
Para proyecto backend separado en Vercel
"""
import os
import sys

os.environ['VERCEL'] = '1'

# Si el backend es un proyecto separado, la raíz es backend/
# Entonces api/index.py está en backend/api/index.py
# Y main.py está en backend/main.py
# Necesitamos agregar el directorio padre (backend/) al path
current_dir = os.path.dirname(os.path.abspath(__file__))  # backend/api/
backend_root = os.path.dirname(current_dir)  # backend/
sys.path.insert(0, backend_root)

# Importar desde la raíz del backend
from main import app
from mangum import Mangum

# Crear handler
handler = Mangum(app, lifespan="off")
