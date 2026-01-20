import logging
import traceback
import os
import sys
from dotenv import load_dotenv

# Cargar .env explícitamente primero
load_dotenv()

# Asegurar que el path incluya el directorio raíz
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Logging básico a consola (stdout) para que Vercel lo capture
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger("vercel_startup")

try:
    logger.info("Iniciando carga del backend...")
    # Importar el app
    from backend.main import app as fastapi_app
    app = fastapi_app
    logger.info("Backend cargado exitosamente")
except Exception as e:
    logger.error(f"FATAL: Error cargando backend: {e}")
    trace = traceback.format_exc()
    logger.error(trace)
    
    # Fallback app visible
    from fastapi import FastAPI, Response
    app = FastAPI()
    
    @app.get("/{path:path}")
    async def catch_all(path: str):
        return {
            "error": "Startup Failed",
            "message": str(e),
            "trace": trace.split('\n')
        }

# Exponer handler para Vercel
handler = app
