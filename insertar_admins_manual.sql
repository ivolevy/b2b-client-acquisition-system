-- ============================================================================
-- INSERTAR ADMINISTRADORES EN TABLA USERS
-- ============================================================================
-- Este script inserta los usuarios admin en public.users
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================================

-- Paso 1: Verificar usuarios admin en auth.users
-- Ejecuta esto primero para obtener los UUIDs:
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email IN ('admin-free@dotasolutions.com', 'admin-pro@dotasolutions.com')
ORDER BY email;

-- Paso 2: Reemplaza 'UUID_ADMIN_FREE' y 'UUID_ADMIN_PRO' con los UUIDs reales
-- que obtuviste del Paso 1, luego ejecuta:

-- Insertar Admin Free
INSERT INTO public.users (id, email, name, phone, plan, role, searches_today, searches_reset_at)
SELECT 
  id,
  email,
  'Administrador Free',
  '+54 11 0000-0000',
  'free',
  'admin',
  0,
  CURRENT_DATE
FROM auth.users
WHERE email = 'admin-free@dotasolutions.com'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = COALESCE(EXCLUDED.phone, users.phone),
  plan = 'free',
  role = 'admin';

-- Insertar Admin Pro
INSERT INTO public.users (id, email, name, phone, plan, role, searches_today, searches_reset_at)
SELECT 
  id,
  email,
  'Administrador Pro',
  '+54 11 0000-0001',
  'pro',
  'admin',
  0,
  CURRENT_DATE
FROM auth.users
WHERE email = 'admin-pro@dotasolutions.com'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = COALESCE(EXCLUDED.phone, users.phone),
  plan = 'pro',
  role = 'admin';

-- Paso 3: Verificar que se insertaron correctamente
SELECT 
  id,
  email,
  name,
  phone,
  plan,
  role,
  created_at
FROM public.users
WHERE role = 'admin'
ORDER BY plan, email;

-- ============================================================================
-- ALTERNATIVA: Si los usuarios NO existen en auth.users aún
-- ============================================================================

-- Primero créalos en Authentication → Users → Add user
-- Luego ejecuta el script de arriba

-- ============================================================================
-- Si quieres crear usuarios admin con emails diferentes, cambia los emails
-- en las consultas SELECT WHERE email = '...'
-- ============================================================================

