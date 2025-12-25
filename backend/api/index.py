"""
Vercel serverless entrypoint for the FastAPI application.
"""

import logging

try:
    from ..main import app as fastapi_app
except ImportError as exc:
    logging.error("No se pudo importar la app de FastAPI: %s", exc)
    raise

# Vercel busca automáticamente una variable llamada `app`.
app = fastapi_app
# Alias explícito por compatibilidad con algunos runtimes.
handler = fastapi_app














