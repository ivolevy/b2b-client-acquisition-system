-- ============================================================================
-- CREAR O CONVERTIR USUARIO EN ADMIN
-- ============================================================================
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================================

-- Convertir usuario existente en admin (por email)
-- Reemplaza 'admin@dotasolutions.com' con el email que quieres convertir

UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@dotasolutions.com';

-- Verificar que se actualizó correctamente
SELECT id, email, name, role, plan 
FROM public.users 
WHERE email = 'admin@dotasolutions.com';

-- ============================================================================
-- ALTERNATIVA: Ver todos los usuarios y convertir el que necesites
-- ============================================================================

-- Ver todos los usuarios:
-- SELECT id, email, name, role, plan FROM public.users ORDER BY created_at DESC;

-- Convertir por UUID (si conoces el ID):
-- UPDATE public.users SET role = 'admin' WHERE id = 'TU-UUID-AQUI';

-- Convertir múltiples usuarios:
-- UPDATE public.users SET role = 'admin' WHERE email IN ('admin@dotasolutions.com', 'otro@email.com');
