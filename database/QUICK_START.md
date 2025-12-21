# 🚀 Guía Rápida - Recrear Bases de Datos

Esta guía te ayudará a recrear las bases de datos del sistema B2B desde cero.

## ⚡ Inicio Rápido

### Opción 1: Script Automático (Recomendado)

**Linux/Mac:**
```bash
cd database
./init_all_databases.sh
```

**Windows:**
```cmd
cd database
init_all_databases.bat
```

### Opción 2: Manual

#### 1. SQLite (Base de datos local)

```bash
# Opción A: Script Python (recomendado)
python database/create_sqlite_database.py

# Opción B: Script SQL
sqlite3 data/empresas_b2b.db < database/create_sqlite_database.sql
```

#### 2. Supabase (Base de datos principal)

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Abre `database/create_supabase_database.sql`
5. Copia y pega todo el contenido
6. Haz clic en **Run** (o `Ctrl+Enter` / `Cmd+Enter`)

---

## ✅ Verificación

### SQLite

```bash
# Ver tablas creadas
sqlite3 data/empresas_b2b.db ".tables"

# Verificar template por defecto
sqlite3 data/empresas_b2b.db "SELECT nombre FROM email_templates;"
```

### Supabase

En el SQL Editor de Supabase:

```sql
-- Ver todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar características de planes
SELECT * FROM public.plan_features;
```

---

## 📋 Checklist

- [ ] Base de datos SQLite creada
- [ ] Tablas SQLite verificadas (4 tablas)
- [ ] Template por defecto insertado en SQLite
- [ ] Script Supabase ejecutado en SQL Editor
- [ ] Tablas Supabase verificadas (4 tablas)
- [ ] Políticas RLS verificadas en Supabase
- [ ] Características de planes insertadas en Supabase
- [ ] Trigger de usuarios creado en Supabase

---

## 🆘 Problemas Comunes

### "database is locked" (SQLite)
- Cierra todas las conexiones a la base de datos
- Reinicia tu aplicación

### "relation already exists" (Supabase)
- El script usa `IF NOT EXISTS`, así que no debería ocurrir
- Si quieres recrear, descomenta las líneas DROP al inicio del script

### "permission denied"
- Verifica permisos de escritura en el directorio `data/`
- En Linux/Mac: `chmod 755 data/`

---

## 📚 Más Información

- Ver `README.md` para documentación completa
- Ver `ESQUEMA_BASE_DATOS.md` en la raíz del proyecto para detalles del esquema

