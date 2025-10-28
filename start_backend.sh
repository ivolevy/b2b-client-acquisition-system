#!/bin/bash

echo " Iniciando Real Estate Data Collector - Backend"
echo "================================================"

cd backend

# Verificar si existe venv
if [ ! -d "venv" ]; then
    echo " Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
echo " Activando entorno virtual..."
source venv/bin/activate

# Instalar dependencias
echo " Instalando dependencias..."
pip install -q -r requirements.txt

# Iniciar servidor
echo " Iniciando servidor FastAPI en http://localhost:8000"
echo ""
python main.py

