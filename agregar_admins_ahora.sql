-- ============================================================================
-- AGREGAR ADMINISTRADORES A TABLA USERS - Script Directo
-- ============================================================================
-- Ejecuta este script completo en SQL Editor de Supabase
-- ============================================================================

-- Paso 1: Verificar que los usuarios existen en auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email IN ('admin-free@dotasolutions.com', 'admin-pro@dotasolutions.com');

-- Paso 2: Agregar columna name si no existe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS name VARCHAR(50);

-- Paso 3: Agregar columna role si no existe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Paso 4: Insertar/Actualizar Admin Free
INSERT INTO public.users (id, email, name, phone, plan, role, searches_today, searches_reset_at)
SELECT 
  au.id,
  au.email,
  'Administrador Free',
  '+54 11 0000-0000',
  'free',
  'admin',
  0,
  CURRENT_DATE
FROM auth.users au
WHERE au.email = 'admin-free@dotasolutions.com'
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(EXCLUDED.name, users.name),
  phone = COALESCE(EXCLUDED.phone, users.phone),
  plan = 'free',
  role = 'admin',
  updated_at = NOW();

-- Paso 5: Insertar/Actualizar Admin Pro
INSERT INTO public.users (id, email, name, phone, plan, role, searches_today, searches_reset_at)
SELECT 
  au.id,
  au.email,
  'Administrador Pro',
  '+54 11 0000-0001',
  'pro',
  'admin',
  0,
  CURRENT_DATE
FROM auth.users au
WHERE au.email = 'admin-pro@dotasolutions.com'
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(EXCLUDED.name, users.name),
  phone = COALESCE(EXCLUDED.phone, users.phone),
  plan = 'pro',
  role = 'admin',
  updated_at = NOW();

-- Paso 6: Verificar resultado
SELECT 
  u.id,
  u.email,
  u.name,
  u.phone,
  u.plan,
  u.role,
  u.created_at
FROM public.users u
WHERE u.role = 'admin'
ORDER BY u.plan, u.email;

-- ============================================================================
-- Si el Paso 1 no muestra usuarios, créalos primero:
-- ============================================================================
-- 1. Ve a Authentication → Users → Add user → Create new user
-- 2. Email: admin-free@dotasolutions.com
--    Password: AdminFree2024!
--    Auto Confirm User: ✅
-- 3. Repite para admin-pro@dotasolutions.com / AdminPro2024!
-- 4. Luego ejecuta este script completo

