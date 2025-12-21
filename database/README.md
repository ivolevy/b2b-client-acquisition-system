# Scripts de Base de Datos - B2B Client Acquisition System

Este directorio contiene los scripts necesarios para recrear completamente las bases de datos del sistema.

## 📋 Estructura

```
database/
├── README.md                          # Este archivo
├── create_supabase_database.sql       # Script SQL para Supabase (PostgreSQL)
├── create_sqlite_database.sql         # Script SQL para SQLite
└── create_sqlite_database.py          # Script Python para SQLite (recomendado)
```

## 🗄️ Bases de Datos

El sistema utiliza **dos bases de datos**:

1. **Supabase (PostgreSQL)** - Base de datos principal para usuarios y autenticación
2. **SQLite** - Base de datos local para empresas y templates de email

---

## 🚀 Uso

### Supabase (PostgreSQL)

#### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor**
3. Abre el archivo `create_supabase_database.sql`
4. Copia y pega todo el contenido en el editor SQL
5. Haz clic en **Run** o presiona `Ctrl+Enter` (Windows/Linux) o `Cmd+Enter` (Mac)

#### Opción 2: Desde línea de comandos

```bash
# Conectarte a Supabase usando psql
psql -h <tu-host> -U postgres -d postgres -f create_supabase_database.sql
```

**⚠️ IMPORTANTE**: 
- El script incluye código comentado para eliminar tablas existentes
- Descomenta esas líneas SOLO si quieres eliminar todos los datos existentes
- Por defecto, el script usa `CREATE TABLE IF NOT EXISTS` para evitar errores

---

### SQLite

#### Opción 1: Script Python (Recomendado)

El script Python es más fácil de usar y proporciona mejor feedback:

```bash
# Crear base de datos en la ubicación por defecto (data/empresas_b2b.db)
python database/create_sqlite_database.py

# Especificar una ruta personalizada
python database/create_sqlite_database.py --db-path /ruta/personalizada/empresas_b2b.db

# Forzar recreación (elimina base de datos existente sin preguntar)
python database/create_sqlite_database.py --force
```

#### Opción 2: Script SQL

```bash
# Crear base de datos desde SQL
sqlite3 data/empresas_b2b.db < database/create_sqlite_database.sql

# O desde el directorio database
cd database
sqlite3 ../data/empresas_b2b.db < create_sqlite_database.sql
```

#### Opción 3: Desde Python interactivo

```python
from database.create_sqlite_database import create_database

# Crear base de datos
create_database('data/empresas_b2b.db', force=False)
```

---

## 📊 Verificación

### Supabase

Después de ejecutar el script, verifica en el SQL Editor:

```sql
-- Ver todas las tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar características de planes
SELECT * FROM public.plan_features ORDER BY plan, feature_key;

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### SQLite

```bash
# Ver estructura de la base de datos
sqlite3 data/empresas_b2b.db ".schema"

# Ver todas las tablas
sqlite3 data/empresas_b2b.db ".tables"

# Verificar template por defecto
sqlite3 data/empresas_b2b.db "SELECT nombre, subject FROM email_templates;"
```

---

## 🔄 Recrear desde Cero

Si necesitas eliminar todo y empezar de nuevo:

### Supabase

1. Descomenta las líneas DROP en `create_supabase_database.sql`:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.saved_companies CASCADE;
DROP TABLE IF EXISTS public.search_history CASCADE;
DROP TABLE IF EXISTS public.plan_features CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
```

2. Ejecuta el script completo

### SQLite

```bash
# Eliminar y recrear
rm data/empresas_b2b.db
python database/create_sqlite_database.py
```

---

## 📝 Tablas Creadas

### Supabase (PostgreSQL)

- ✅ `public.users` - Perfiles de usuarios
- ✅ `public.search_history` - Historial de búsquedas (PRO)
- ✅ `public.saved_companies` - Empresas guardadas (PRO)
- ✅ `public.plan_features` - Características de planes

### SQLite

- ✅ `empresas` - Empresas encontradas
- ✅ `email_templates` - Plantillas de email
- ✅ `email_history` - Historial de emails enviados
- ✅ `scraping_cache` - Cache de scraping

---

## 🔐 Seguridad

### Supabase

- ✅ Row Level Security (RLS) habilitado en todas las tablas
- ✅ Políticas configuradas para acceso por usuario
- ✅ Trigger automático para crear perfiles de usuario

### SQLite

- ✅ Foreign keys habilitadas
- ✅ Constraints y unique keys configurados
- ✅ Índices para optimización de consultas

---

## 🐛 Troubleshooting

### Error: "relation already exists" (Supabase)

- El script usa `CREATE TABLE IF NOT EXISTS`, así que esto no debería ocurrir
- Si quieres recrear, descomenta las líneas DROP al inicio del script

### Error: "database is locked" (SQLite)

- Cierra cualquier conexión activa a la base de datos
- Asegúrate de que ningún proceso esté usando el archivo `.db`

### Error: "permission denied" (SQLite)

- Verifica permisos de escritura en el directorio destino
- En Linux/Mac, puedes necesitar `chmod +w` en el directorio

### Políticas RLS no funcionan (Supabase)

- Verifica que RLS esté habilitado: `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`
- Verifica que las políticas estén creadas correctamente
- Asegúrate de estar autenticado como usuario para probar las políticas

---

## 📚 Documentación Adicional

Para más detalles sobre el esquema completo, consulta:
- `ESQUEMA_BASE_DATOS.md` en la raíz del proyecto

---

## ✅ Checklist de Instalación

- [ ] Ejecutar script de Supabase en SQL Editor
- [ ] Verificar tablas creadas en Supabase
- [ ] Verificar políticas RLS en Supabase
- [ ] Ejecutar script de SQLite (Python o SQL)
- [ ] Verificar tablas creadas en SQLite
- [ ] Verificar template por defecto en SQLite
- [ ] Probar conexión desde la aplicación

---

*Última actualización: Diciembre 2024*

