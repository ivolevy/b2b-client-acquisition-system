@echo off
REM Script para inicializar ambas bases de datos
REM B2B Client Acquisition System

echo 🚀 Inicializando bases de datos del sistema B2B...
echo.

REM Obtener directorio del script
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%\..

REM =====================================================
REM SQLite Database
REM =====================================================
echo 📦 Creando base de datos SQLite...
set SQLITE_DB=%PROJECT_DIR%\data\empresas_b2b.db

if exist "%SQLITE_DB%" (
    set /p DELETE_DB="⚠️  La base de datos SQLite ya existe. ¿Eliminarla y crear una nueva? (s/N): "
    if /i "%DELETE_DB%"=="s" (
        del "%SQLITE_DB%"
        echo 🗑️  Base de datos eliminada
    ) else (
        echo ⏭️  Saltando creación de SQLite
        goto :skip_sqlite
    )
)

python "%SCRIPT_DIR%create_sqlite_database.py" --db-path "%SQLITE_DB%"
if %ERRORLEVEL% EQU 0 (
    echo ✅ Base de datos SQLite creada exitosamente
) else (
    echo ❌ Error creando base de datos SQLite
    exit /b 1
)

:skip_sqlite
echo.
echo ✅ Inicialización completada!
echo.
echo 📋 Próximos pasos:
echo    1. Ejecuta el script de Supabase en el SQL Editor de Supabase Dashboard
echo    2. Archivo: database\create_supabase_database.sql
echo    3. Verifica las tablas creadas
echo.
echo 📁 Ubicación SQLite: %SQLITE_DB%

pause

