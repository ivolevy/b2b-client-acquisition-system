@echo off
echo 🚀 Iniciando Real Estate Data Collector - Frontend
echo =================================================

cd frontend

REM Verificar si node_modules existe
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
)

REM Iniciar servidor de desarrollo
echo ✅ Iniciando servidor Vite en http://localhost:5173
echo.
npm run dev

pause

