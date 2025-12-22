-- ============================================================================
-- CREAR USUARIO ADMIN COMPLETO
-- ============================================================================
-- Este script busca el usuario en auth.users y lo crea/actualiza en public.users
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================================

-- PASO 1: Verificar si el usuario existe en auth.users
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users 
WHERE email = 'admin@dotasolutions.com';

-- PASO 2: Crear o actualizar el usuario en public.users
-- Esto inserta el usuario si no existe, o lo actualiza si ya existe

INSERT INTO public.users (id, email, name, phone, plan, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'phone', '') as phone,
  'pro' as plan,
  'admin' as role,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.email = 'admin@dotasolutions.com'
ON CONFLICT (id) 
DO UPDATE SET
  role = 'admin',
  plan = COALESCE(public.users.plan, 'pro'),
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.users.name),
  phone = COALESCE(EXCLUDED.phone, public.users.phone),
  updated_at = NOW();

-- PASO 3: Verificar que se creó/actualizó correctamente
SELECT id, email, name, role, plan, created_at
FROM public.users 
WHERE email = 'admin@dotasolutions.com';

-- ============================================================================
-- ALTERNATIVA: Ver todos los usuarios en auth.users que NO están en public.users
-- ============================================================================

-- SELECT 
--   au.id,
--   au.email,
--   au.created_at as auth_created_at,
--   pu.id as public_user_id
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE pu.id IS NULL
-- ORDER BY au.created_at DESC;

-- ============================================================================
-- ALTERNATIVA: Crear todos los usuarios faltantes automáticamente
-- ============================================================================

-- INSERT INTO public.users (id, email, name, phone, plan, role, created_at, updated_at)
-- SELECT 
--   au.id,
--   au.email,
--   COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
--   COALESCE(au.raw_user_meta_data->>'phone', '') as phone,
--   CASE 
--     WHEN au.email LIKE '%admin%' THEN 'pro'
--     ELSE 'free'
--   END as plan,
--   CASE 
--     WHEN au.email LIKE '%admin%' THEN 'admin'
--     ELSE 'user'
--   END as role,
--   au.created_at,
--   NOW() as updated_at
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE pu.id IS NULL
-- ON CONFLICT (id) DO NOTHING;
