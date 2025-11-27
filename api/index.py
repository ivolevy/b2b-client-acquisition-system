"""
Vercel entrypoint when the project root is the repository root.
Delegates to backend/main.py.
"""

import logging

try:
    from backend.main import app as fastapi_app
except ImportError as exc:
    logging.error("No se pudo importar FastAPI desde backend.main: %s", exc)
    raise

app = fastapi_app
handler = fastapi_app



