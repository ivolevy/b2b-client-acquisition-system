import logging
import traceback
import os
import sys

# Asegurar que el path incluya el directorio raíz
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("gunicorn.error")

try:
    from backend.main import app as fastapi_app
    app = fastapi_app
    logger.info("Backend cargado exitosamente")
except Exception as e:
    logger.error(f"FATAL: Error cargando backend: {e}")
    trace = traceback.format_exc()
    
    # Fallback app para retornar el error en vez de 500 generico
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI()
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def catch_all(request: Request, path_name: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend Startup Failed",
                "detail": str(e),
                "traceback": trace.split('\n')
            }
        )
    
    # Exponer app
    app = app

# Exponer handler para Vercel (Debe estar en el scope global)
handler = app
