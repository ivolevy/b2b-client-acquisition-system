#!/bin/bash
# Script para inicializar ambas bases de datos
# B2B Client Acquisition System

set -e  # Salir si hay algún error

echo "🚀 Inicializando bases de datos del sistema B2B..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Obtener directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# =====================================================
# SQLite Database
# =====================================================
echo -e "${YELLOW}📦 Creando base de datos SQLite...${NC}"
SQLITE_DB="$PROJECT_DIR/data/empresas_b2b.db"

if [ -f "$SQLITE_DB" ]; then
    read -p "⚠️  La base de datos SQLite ya existe. ¿Eliminarla y crear una nueva? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        rm "$SQLITE_DB"
        echo "🗑️  Base de datos eliminada"
    else
        echo "⏭️  Saltando creación de SQLite"
    fi
fi

if [ ! -f "$SQLITE_DB" ]; then
    python3 "$SCRIPT_DIR/create_sqlite_database.py" --db-path "$SQLITE_DB"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Base de datos SQLite creada exitosamente${NC}"
    else
        echo -e "${RED}❌ Error creando base de datos SQLite${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ Inicialización completada!${NC}"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Ejecuta el script de Supabase en el SQL Editor de Supabase Dashboard"
echo "   2. Archivo: database/create_supabase_database.sql"
echo "   3. Verifica las tablas creadas"
echo ""
echo "📁 Ubicación SQLite: $SQLITE_DB"

