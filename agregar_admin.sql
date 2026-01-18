-- ============================================================================
-- AGREGAR USUARIO ADMIN
-- ============================================================================
-- Ejecutar en SQL Editor de Supabase Dashboard
-- Cambia 'admin@dotasolutions.com' por el email que quieres convertir en admin
-- ============================================================================

-- Crear o actualizar usuario en public.users con role admin
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

-- Verificar que se creó/actualizó correctamente
SELECT id, email, name, role, plan, created_at
FROM public.users 
WHERE email = 'admin@dotasolutions.com';

