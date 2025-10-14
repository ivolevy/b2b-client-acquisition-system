@echo off
echo 🚀 Iniciando Real Estate Data Collector - Backend
echo ================================================

cd backend

REM Verificar si existe venv
if not exist "venv" (
    echo 📦 Creando entorno virtual...
    python -m venv venv
)

REM Activar entorno virtual
echo 🔧 Activando entorno virtual...
call venv\Scripts\activate.bat

REM Instalar dependencias
echo 📥 Instalando dependencias...
pip install -q -r requirements.txt

REM Iniciar servidor
echo ✅ Iniciando servidor FastAPI en http://localhost:8000
echo.
python main.py

pause

