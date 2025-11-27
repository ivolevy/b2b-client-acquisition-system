"""
Vercel serverless function wrapper for FastAPI
Usa Mangum para convertir la app ASGI a formato compatible con Vercel
"""
import os
import sys

# Marcar que estamos en Vercel ANTES de cualquier importación
os.environ['VERCEL'] = '1'

# Agregar el directorio backend al path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Cambiar al directorio backend para imports relativos
os.chdir(backend_dir)

# Configurar path de base de datos para Vercel (usar /tmp que es escribible)
if not os.environ.get('DATABASE_PATH'):
    os.environ['DATABASE_PATH'] = '/tmp/empresas_b2b.db'

# Asegurar que /tmp existe
try:
    os.makedirs('/tmp', exist_ok=True)
except:
    pass  # /tmp siempre existe en Linux

# Importar la app de FastAPI
try:
    from main import app
except ImportError as e:
    # Si falla, intentar importar desde el path actual
    import importlib.util
    spec = importlib.util.spec_from_file_location("main", os.path.join(backend_dir, "main.py"))
    main_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(main_module)
    app = main_module.app

# Usar Mangum para convertir la app ASGI a formato compatible con Vercel
from mangum import Mangum

# Crear el handler usando Mangum
handler = Mangum(app, lifespan="off")
