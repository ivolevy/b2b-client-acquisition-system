-- ============================================================================
-- ARREGLAR POLÍTICAS RLS PARA TABLA USERS
-- ============================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================================================

-- PASO 1: Deshabilitar RLS temporalmente para limpiar
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admins_select_all" ON public.users;
DROP POLICY IF EXISTS "admins_insert" ON public.users;
DROP POLICY IF EXISTS "admins_update_all" ON public.users;
DROP POLICY IF EXISTS "admins_delete" ON public.users;

-- PASO 3: Eliminar función is_admin si existe
DROP FUNCTION IF EXISTS public.is_admin();

-- PASO 4: Volver a habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear políticas SIMPLES y FUNCIONALES

-- Política 1: Usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política 2: Usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política 3: Admins pueden hacer SELECT de todos los usuarios
-- Usa una subquery en lugar de EXISTS para evitar problemas de recursión
CREATE POLICY "admins_select_all"
ON public.users
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- Política 4: Admins pueden hacer INSERT
CREATE POLICY "admins_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- Política 5: Admins pueden hacer UPDATE de todos
CREATE POLICY "admins_update_all"
ON public.users
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- Política 6: Admins pueden hacer DELETE
CREATE POLICY "admins_delete"
ON public.users
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- VERIFICACIÓN
SELECT 
  'Políticas creadas:' as mensaje,
  COUNT(*) as total
FROM pg_policies 
WHERE tablename = 'users';

SELECT 
  policyname,
  cmd as operacion
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
