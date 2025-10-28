#!/bin/bash

echo " Iniciando Real Estate Data Collector - Frontend"
echo "================================================="

cd frontend

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo " Instalando dependencias..."
    npm install
fi

# Iniciar servidor de desarrollo
echo " Iniciando servidor Vite en http://localhost:5173"
echo ""
npm run dev

