# Guía Paso a Paso: Recrear Base de Datos en Supabase

Esta guía te ayudará a recrear exactamente la misma estructura de base de datos en un nuevo proyecto de Supabase.

---

## 📁 Archivos Necesarios

En tu proyecto encontrarás estos archivos que necesitarás:

- **`supabase_setup_completo.sql`** ⭐ - Script SQL completo con verificaciones (RECOMENDADO)
- **`supabase_schema.sql`** - Script SQL original (alternativa)
- **`supabase_verificacion.sql`** - Script para verificar que todo se configuró correctamente
- **`GUIA_RECREAR_BASE_DATOS_SUPABASE.md`** - Esta guía completa

---

## ⚡ Inicio Rápido

Si ya tienes experiencia con Supabase, aquí está el resumen:

1. Crear proyecto en Supabase Dashboard
2. Ejecutar `supabase_setup_completo.sql` en SQL Editor
3. Obtener credenciales en Settings → API
4. Crear `frontend/.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
5. Reiniciar servidor de desarrollo
6. Verificar con `supabase_verificacion.sql`

Si necesitas más detalles, continúa leyendo la guía completa.

---

## 📋 Prerrequisitos

- Cuenta en Supabase (gratuita): [https://supabase.com](https://supabase.com)
- Acceso al Dashboard de Supabase

---

## 🚀 Paso 1: Crear Nuevo Proyecto en Supabase

1. **Accede a Supabase Dashboard**
   - Ve a [https://app.supabase.com](https://app.supabase.com)
   - Inicia sesión con tu cuenta

2. **Crear Nuevo Proyecto**
   - Haz clic en **"New Project"** o **"New Organization"** si es tu primer proyecto
   - Completa el formulario:
     - **Name**: Nombre de tu proyecto (ej: `b2b-client-acquisition`)
     - **Database Password**: Guarda esta contraseña en un lugar seguro (la necesitarás)
     - **Region**: Selecciona la región más cercana a tus usuarios
     - **Pricing Plan**: Selecciona **Free** (suficiente para desarrollo)

3. **Esperar a que se cree el proyecto**
   - Esto puede tomar 1-2 minutos
   - Verás un mensaje de "Setting up your project..."

---

## 🗄️ Paso 2: Ejecutar el Esquema SQL

Una vez que tu proyecto esté listo:

1. **Abrir SQL Editor**
   - En el menú lateral izquierdo, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://app.supabase.com/project/[TU_PROJECT_ID]/sql`

2. **Crear Nueva Query**
   - Haz clic en **"New query"** o el botón **"+"**

3. **Copiar y Pegar el Esquema Completo**
   
   **Opción A: Usar el script completo (RECOMENDADO)**
   - Abre el archivo `supabase_setup_completo.sql` en tu proyecto
   - Copia TODO el contenido y pégalo en el editor SQL
   - Este script incluye verificaciones automáticas al final
   
   **Opción B: Usar el script original**
   - Abre el archivo `supabase_schema.sql` en tu proyecto
   - Copia TODO el contenido y pégalo en el editor SQL

   **⚠️ IMPORTANTE**: Asegúrate de copiar TODO el contenido, incluyendo:
   - Creación de tablas
   - Políticas RLS
   - Índices
   - Datos iniciales de `plan_features`
   - Función y trigger `handle_new_user()`

4. **Ejecutar el Script**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (Windows/Linux) o `Cmd+Enter` (Mac)
   - Deberías ver un mensaje de éxito: "Success. No rows returned"

5. **Verificar que las Tablas se Crearon**
   - Si usaste `supabase_setup_completo.sql`, verás mensajes de verificación al final
   - También puedes verificar manualmente:
     - Ve a **"Table Editor"** en el menú lateral
     - Deberías ver estas 4 tablas:
       - ✅ `users`
       - ✅ `search_history`
       - ✅ `saved_companies`
       - ✅ `plan_features`
   
   **Verificación adicional (opcional)**:
   - Ejecuta el script `supabase_verificacion.sql` para un reporte detallado
   - Este script te mostrará el estado de todas las tablas, políticas, funciones y triggers

---

## 🔐 Paso 3: Verificar Políticas de Seguridad (RLS)

1. **Verificar RLS Habilitado**
   - Ve a **"Table Editor"**
   - Selecciona cada tabla (`users`, `search_history`, `saved_companies`, `plan_features`)
   - En la pestaña **"Policies"**, verifica que hay políticas creadas

2. **Verificar Políticas de `users`**
   - Deberías ver 4 políticas:
     - ✅ "Users can view own profile" (SELECT)
     - ✅ "Users can update own profile" (UPDATE)
     - ✅ "Users can insert own profile" (INSERT)
     - ✅ "Users can delete own profile" (DELETE)

3. **Verificar Políticas de `search_history`**
   - Deberías ver 3 políticas:
     - ✅ "Users can view own search history" (SELECT)
     - ✅ "Users can insert own search history" (INSERT)
     - ✅ "Users can delete own search history" (DELETE)

4. **Verificar Políticas de `saved_companies`**
   - Deberías ver 4 políticas:
     - ✅ "Users can view own saved companies" (SELECT)
     - ✅ "Users can insert own saved companies" (INSERT)
     - ✅ "Users can update own saved companies" (UPDATE)
     - ✅ "Users can delete own saved companies" (DELETE)

5. **Verificar Políticas de `plan_features`**
   - Deberías ver 1 política:
     - ✅ "Anyone can view plan features" (SELECT)

---

## 🔧 Paso 4: Configurar Función Edge (Opcional pero Recomendado)

La función edge `delete-user` permite eliminar usuarios completamente. Es opcional pero recomendada.

### Opción A: Usando Supabase CLI (Recomendado)

1. **Instalar Supabase CLI** (si no lo tienes)
   ```bash
   npm install -g supabase
   ```

2. **Iniciar sesión en Supabase CLI**
   ```bash
   supabase login
   ```

3. **Vincular tu proyecto**
   ```bash
   cd /Users/ivanlevy/Desktop/b2b-client-acquisition-system
   supabase link --project-ref [TU_PROJECT_REF]
   ```
   - El `project-ref` lo encuentras en: **Settings** → **API** → **Project URL** (es la parte después de `https://` y antes de `.supabase.co`)

4. **Desplegar la función**
   ```bash
   supabase functions deploy delete-user
   ```

### Opción B: Usando Dashboard (Manual)

1. **Crear Función Edge**
   - Ve a **"Edge Functions"** en el menú lateral
   - Haz clic en **"Create a new function"**
   - Nombre: `delete-user`

2. **Copiar el Código**
   - Abre el archivo `supabase/functions/delete-user/index.ts`
   - Copia TODO el contenido

3. **Pegar y Desplegar**
   - Pega el código en el editor
   - Haz clic en **"Deploy"**

4. **Configurar Variables de Entorno**
   - En la configuración de la función, agrega estas variables (se configuran automáticamente):
     - `SUPABASE_URL`: Se configura automáticamente
     - `SUPABASE_SERVICE_ROLE_KEY`: Se configura automáticamente

---

## 🔑 Paso 5: Obtener Credenciales de Supabase

Necesitas estas credenciales para conectar tu aplicación:

1. **Ir a Settings → API**
   - En el menú lateral, ve a **"Settings"** (icono de engranaje)
   - Haz clic en **"API"**

2. **Copiar las Credenciales**
   - **Project URL**: `https://[TU_PROJECT_REF].supabase.co`
     - Ejemplo: `https://abcdefghijklmnop.supabase.co`
   - **anon/public key**: Clave pública (segura para usar en frontend)
     - Empieza con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Guardar las Credenciales**
   - ⚠️ **NO compartas estas credenciales públicamente**
   - Guárdalas en un lugar seguro

---

## 📝 Paso 6: Configurar Variables de Entorno en el Proyecto

Ahora necesitas configurar las variables de entorno en tu aplicación:

### Para el Frontend

1. **Crear archivo `.env.local` en la carpeta `frontend/`**
   ```bash
   cd frontend
   touch .env.local
   ```

2. **Agregar las variables**
   Abre `frontend/.env.local` y agrega:
   ```env
   VITE_SUPABASE_URL=https://[TU_PROJECT_REF].supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
   ```

   **Ejemplo**:
   ```env
   VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.abcdefghijklmnopqrstuvwxyz1234567890
   ```
   
   **💡 Tip**: Puedes usar un editor de texto o ejecutar:
   ```bash
   cat > frontend/.env.local << 'EOF'
   VITE_SUPABASE_URL=https://[TU_PROJECT_REF].supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
   EOF
   ```
   (Reemplaza los valores entre corchetes con tus credenciales reales)

3. **Reiniciar el servidor de desarrollo**
   - Si tienes el servidor corriendo, deténlo (`Ctrl+C`)
   - Vuelve a iniciarlo:
     ```bash
     npm run dev
     ```

### Para el Backend (si es necesario)

Si tu backend también necesita conectarse a Supabase:

1. **Crear archivo `.env` en la carpeta `backend/`**
   ```bash
   cd backend
   touch .env
   ```

2. **Agregar las variables**
   ```env
   SUPABASE_URL=https://[TU_PROJECT_REF].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```
   - ⚠️ **IMPORTANTE**: El `service_role_key` es SENSIBLE, solo úsalo en el backend, NUNCA en el frontend
   - Lo encuentras en: **Settings** → **API** → **service_role key** (oculto por defecto, haz clic en "Reveal")

---

## ✅ Paso 7: Verificar la Conexión

### Verificar desde el Frontend

1. **Iniciar la aplicación**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Abrir la aplicación en el navegador**
   - Generalmente: `http://localhost:5173`

3. **Intentar registrarse**
   - Ve a la página de registro
   - Crea un nuevo usuario
   - Verifica que:
     - ✅ El usuario se crea correctamente
     - ✅ Puedes iniciar sesión
     - ✅ No hay errores en la consola del navegador

4. **Verificar en Supabase Dashboard**
   - Ve a **"Authentication"** → **"Users"**
   - Deberías ver el usuario que acabas de crear
   - Ve a **"Table Editor"** → **"users"**
   - Deberías ver el perfil del usuario creado automáticamente

### Verificar desde SQL Editor

**Opción A: Script de verificación completo (RECOMENDADO)**
- Abre el archivo `supabase_verificacion.sql` en tu proyecto
- Copia TODO el contenido y pégalo en el SQL Editor de Supabase
- Ejecuta el script
- Revisa los resultados: todos los ✅ indican configuración correcta

**Opción B: Consultas manuales**

Ejecuta estas queries en el SQL Editor de Supabase para verificar:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar datos iniciales de plan_features
SELECT * FROM public.plan_features ORDER BY plan, feature_key;

-- Verificar función handle_new_user
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

---

## 🧪 Paso 8: Probar Funcionalidades Clave

### 1. Registro de Usuario
- ✅ Crear un nuevo usuario
- ✅ Verificar que se crea en `auth.users`
- ✅ Verificar que se crea automáticamente en `public.users` (gracias al trigger)

### 2. Inicio de Sesión
- ✅ Iniciar sesión con el usuario creado
- ✅ Verificar que `last_login_at` se actualiza

### 3. Guardar Búsqueda (solo usuarios PRO)
- ✅ Realizar una búsqueda
- ✅ Verificar que se guarda en `search_history` (si el usuario es PRO)

### 4. Guardar Empresa (solo usuarios PRO)
- ✅ Guardar una empresa
- ✅ Verificar que se guarda en `saved_companies`

### 5. Consultar Características del Plan
- ✅ Verificar que se pueden consultar las características en `plan_features`

---

## 🐛 Solución de Problemas Comunes

### Error: "relation does not exist"
- **Causa**: Las tablas no se crearon correctamente
- **Solución**: Ejecuta nuevamente el script SQL completo

### Error: "permission denied for table"
- **Causa**: Las políticas RLS no están configuradas correctamente
- **Solución**: Verifica que todas las políticas estén creadas (Paso 3)

### Error: "new row violates row-level security policy"
- **Causa**: El usuario no tiene permisos para insertar
- **Solución**: Verifica que el usuario esté autenticado y que las políticas INSERT estén correctas

### Error: "function handle_new_user() does not exist"
- **Causa**: La función no se creó correctamente
- **Solución**: Ejecuta nuevamente la parte del script que crea la función y el trigger

### Error: Variables de entorno no se cargan
- **Causa**: El archivo `.env.local` no está en la ubicación correcta o el servidor no se reinició
- **Solución**: 
  - Verifica que el archivo esté en `frontend/.env.local`
  - Reinicia el servidor de desarrollo
  - Verifica que las variables empiecen con `VITE_`

### Error: "Invalid API key"
- **Causa**: La clave API es incorrecta o está mal copiada
- **Solución**: 
  - Verifica que copiaste la clave completa (son muy largas)
  - Verifica que no hay espacios al inicio o final
  - Verifica que estás usando la `anon key` en el frontend, no la `service_role key`

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Guía de Edge Functions](https://supabase.com/docs/guides/functions)
- [Guía de Autenticación](https://supabase.com/docs/guides/auth)

---

## ✅ Checklist Final

Antes de considerar que todo está configurado:

- [ ] Proyecto creado en Supabase
- [ ] Esquema SQL ejecutado correctamente
- [ ] 4 tablas creadas: `users`, `search_history`, `saved_companies`, `plan_features`
- [ ] Políticas RLS configuradas en todas las tablas
- [ ] Función `handle_new_user()` creada y trigger configurado
- [ ] Datos iniciales de `plan_features` insertados
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Servidor de desarrollo reiniciado
- [ ] Usuario de prueba creado exitosamente
- [ ] Inicio de sesión funciona correctamente
- [ ] Función edge `delete-user` desplegada (opcional)

---

## 🎉 ¡Listo!

Si completaste todos los pasos, tu base de datos está recreada y lista para usar. Tu aplicación debería conectarse correctamente al nuevo proyecto de Supabase.

**¿Necesitas ayuda?** Revisa la sección de "Solución de Problemas Comunes" o consulta la documentación de Supabase.

---

*Última actualización: Diciembre 2024*

