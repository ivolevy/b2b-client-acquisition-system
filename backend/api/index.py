"""
Vercel serverless function wrapper for FastAPI
"""
import os
import sys

# Marcar que estamos en Vercel
os.environ['VERCEL'] = '1'

# Agregar el directorio backend al path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Configurar path de base de datos para Vercel (usar /tmp que es escribible)
if not os.environ.get('DATABASE_PATH'):
    os.environ['DATABASE_PATH'] = '/tmp/empresas_b2b.db'

# Asegurar que /tmp existe
os.makedirs('/tmp', exist_ok=True)

from main import app

# Vercel necesita el handler como variable
handler = app
