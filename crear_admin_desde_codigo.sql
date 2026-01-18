-- ============================================================================
-- CREAR USUARIO ADMIN: admin@admin.com / admin
-- ============================================================================
-- IMPORTANTE: Para crear usuarios en auth.users necesitas hacerlo desde:
-- 1. Supabase Dashboard > Authentication > Users > Add User
-- 2. O usar la API de administración con service_role key
-- 
-- Este script asume que YA creaste el usuario en auth.users manualmente
-- y solo lo convierte en admin en public.users
-- ============================================================================

-- PASO 1: Crear el usuario en auth.users desde Supabase Dashboard primero
-- Ve a: Authentication > Users > Add User
-- Email: admin@admin.com
-- Password: admin
-- Auto Confirm User: ✅ (marcar esta opción)

-- PASO 2: Una vez creado en auth.users, ejecuta esto para crear/actualizar en public.users:
INSERT INTO public.users (id, email, name, phone, plan, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'Administrador' as name,
  '' as phone,
  'pro' as plan,
  'admin' as role,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.email = 'admin@admin.com'
ON CONFLICT (id) 
DO UPDATE SET
  role = 'admin',
  plan = 'pro',
  email = 'admin@admin.com',
  name = 'Administrador',
  updated_at = NOW();

-- PASO 3: Verificar
SELECT id, email, name, role, plan FROM public.users WHERE email = 'admin@admin.com';
