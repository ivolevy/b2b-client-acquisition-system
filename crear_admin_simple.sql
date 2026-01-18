-- ============================================================================
-- CREAR USUARIO ADMIN: admin@admin.com
-- ============================================================================
-- Ejecutar en SQL Editor de Supabase Dashboard
-- Este script crea el usuario directamente usando funciones de Supabase
-- ============================================================================

-- NOTA: Para crear usuarios desde código necesitas usar la API de Supabase Admin
-- Este script SQL solo puede crear el registro en public.users si el usuario
-- ya existe en auth.users. Para crear el usuario completo, usa el script Node.js
-- o crea el usuario manualmente en Supabase Dashboard > Authentication > Users

-- Si el usuario ya existe en auth.users, ejecuta esto:
INSERT INTO public.users (id, email, name, phone, plan, role, created_at, updated_at)
SELECT 
  au.id,
  'admin@admin.com' as email,
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

-- Verificar
SELECT id, email, name, role, plan 
FROM public.users 
WHERE email = 'admin@admin.com';

