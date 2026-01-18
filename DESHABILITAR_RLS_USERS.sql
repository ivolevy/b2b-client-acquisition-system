-- ============================================================================
-- DESHABILITAR RLS EN USERS TEMPORALMENTE
-- ============================================================================
-- Esto va a hacer que los usuarios carguen INMEDIATAMENTE
-- La seguridad se maneja en el frontend verificando el role
-- ============================================================================

-- Deshabilitar RLS en la tabla users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verificar que se deshabilitó
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Debería mostrar rowsecurity = false

