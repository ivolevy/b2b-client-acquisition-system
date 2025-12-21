# 🚀 Guía Paso a Paso: Recrear Base de Datos en Supabase

Esta guía te ayudará a recrear exactamente la misma estructura de base de datos en Supabase para conectar con tu sistema B2B.

---

## 📋 Prerrequisitos

1. ✅ Tener una cuenta en Supabase ([https://supabase.com](https://supabase.com))
2. ✅ Haber creado un proyecto en Supabase
3. ✅ Tener acceso al SQL Editor de Supabase

---

## 🎯 Paso 1: Acceder al SQL Editor de Supabase

1. Ve a tu proyecto en Supabase Dashboard: [https://app.supabase.com](https://app.supabase.com)
2. En el menú lateral izquierdo, haz clic en **SQL Editor**
3. Haz clic en **New Query** para crear una nueva consulta

---

## 🎯 Paso 2: Ejecutar el Script SQL Completo

1. Abre el archivo `supabase_setup_completo.sql` que creamos para ti
2. **Copia TODO el contenido** del archivo
3. **Pega el contenido** en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)

> ⚠️ **IMPORTANTE**: El script está diseñado para ser seguro y no eliminar datos existentes. Usa `CREATE TABLE IF NOT EXISTS` y `ON CONFLICT DO NOTHING`.

---

## 🎯 Paso 3: Verificar que Todo se Creó Correctamente

Después de ejecutar el script, ejecuta estas consultas de verificación:

### Verificar Tablas Creadas

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'search_history', 'saved_companies', 'plan_features')
ORDER BY table_name;
```

**Resultado esperado**: Debes ver las 4 tablas listadas.

### Verificar Políticas RLS

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Resultado esperado**: Debes ver múltiples políticas para cada tabla.

### Verificar Datos de Plan Features

```sql
SELECT plan, feature_key, feature_value 
FROM public.plan_features 
ORDER BY plan, feature_key;
```

**Resultado esperado**: Debes ver 14 registros (7 para 'free' y 7 para 'pro').

### Verificar Trigger

```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' OR event_object_schema = 'auth';
```

**Resultado esperado**: Debes ver el trigger `on_auth_user_created` en la tabla `auth.users`.

---

## 🎯 Paso 4: Configurar Variables de Entorno

Una vez que la base de datos esté creada, necesitas configurar las variables de entorno en tu aplicación:

### En el Frontend (`.env.local` o `.env`)

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### En el Backend (si es necesario)

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

### Dónde Encontrar las Credenciales

1. Ve a **Settings** → **API** en tu proyecto de Supabase
2. Encontrarás:
   - **Project URL**: Es tu `VITE_SUPABASE_URL`
   - **anon public key**: Es tu `VITE_SUPABASE_ANON_KEY`
   - **service_role key**: Es tu `SUPABASE_SERVICE_ROLE_KEY` (solo para backend, nunca exponer en frontend)

---

## 🎯 Paso 5: Probar la Conexión

### Crear un Usuario de Prueba

1. Ve a **Authentication** → **Users** en Supabase Dashboard
2. Haz clic en **Add User** → **Create New User**
3. Ingresa un email y contraseña de prueba
4. **Verifica** que se creó automáticamente un registro en la tabla `public.users`

### Verificar el Trigger Funciona

Ejecuta esta consulta para verificar que el usuario se creó correctamente:

```sql
SELECT u.id, u.email, u.name, u.plan, u.created_at
FROM public.users u
ORDER BY u.created_at DESC
LIMIT 5;
```

Deberías ver el usuario que acabas de crear.

---

## 🎯 Paso 6: Configurar Email de Confirmación (Opcional pero Recomendado)

Si quieres que los usuarios reciban emails de confirmación al registrarse:

1. Ve a **Settings** → **Auth** → **Email Templates**
2. Verifica que el template de "Confirm signup" esté habilitado
3. (Opcional) Configura SMTP personalizado en **Settings** → **Auth** → **SMTP Settings**

> 📖 Ver el archivo `CONFIGURAR_EMAIL_SUPABASE.md` para más detalles.

---

## 🎯 Paso 7: Configurar URLs de Redirección

Para que la autenticación funcione correctamente:

1. Ve a **Settings** → **Auth** → **URL Configuration**
2. Agrega tus URLs en **Redirect URLs**:
   - Para desarrollo: `http://localhost:5173`
   - Para producción: `https://tu-dominio.com`
   - También agrega: `http://localhost:5173/**` (con wildcard)

---

## ✅ Checklist Final

Antes de considerar que todo está listo, verifica:

- [ ] ✅ Las 4 tablas están creadas (`users`, `search_history`, `saved_companies`, `plan_features`)
- [ ] ✅ Las políticas RLS están activas en todas las tablas
- [ ] ✅ Los datos de `plan_features` están insertados (14 registros)
- [ ] ✅ El trigger `on_auth_user_created` está funcionando
- [ ] ✅ Las variables de entorno están configuradas en el frontend
- [ ] ✅ Las URLs de redirección están configuradas
- [ ] ✅ Puedes crear un usuario de prueba y se crea automáticamente en `public.users`

---

## 🔧 Solución de Problemas

### Error: "relation already exists"

Si alguna tabla ya existe, el script usa `CREATE TABLE IF NOT EXISTS`, así que debería funcionar. Si persiste el error, puedes eliminar las tablas manualmente:

```sql
-- ⚠️ CUIDADO: Esto eliminará todos los datos
DROP TABLE IF EXISTS public.saved_companies CASCADE;
DROP TABLE IF EXISTS public.search_history CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.plan_features CASCADE;
```

Luego ejecuta el script completo nuevamente.

### Error: "permission denied"

Asegúrate de estar ejecutando el script como administrador del proyecto. Si usas el SQL Editor de Supabase Dashboard, deberías tener permisos completos.

### El trigger no funciona

Verifica que el trigger esté creado:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Si no existe, ejecuta solo la parte del trigger del script:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
```

### No se crean usuarios automáticamente

1. Verifica que el trigger esté activo (ver paso anterior)
2. Verifica que la función tenga `SECURITY DEFINER`
3. Revisa los logs en **Logs** → **Postgres Logs** en Supabase Dashboard

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/tables)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu base de datos estará lista para conectarse con tu sistema B2B. 

**Próximos pasos**:
1. Actualiza las variables de entorno en tu aplicación
2. Reinicia tu servidor de desarrollo
3. Prueba crear un usuario desde tu aplicación
4. Verifica que todo funcione correctamente

---

*Si tienes algún problema, revisa la sección de Solución de Problemas o consulta los logs de Supabase.*

