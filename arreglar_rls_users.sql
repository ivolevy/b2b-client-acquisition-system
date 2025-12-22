-- ============================================================================
-- ARREGLAR POLÍTICAS RLS PARA TABLA USERS
-- ============================================================================
-- Los admins no pueden ver los usuarios por las políticas RLS
-- Este script arregla las políticas para permitir que los admins vean todos
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- POLÍTICA 1: Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- POLÍTICA 2: Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- POLÍTICA 3: Admins pueden ver TODOS los usuarios
CREATE POLICY "Admins can view all users" 
  ON public.users 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- POLÍTICA 4: Admins pueden hacer TODO (INSERT, UPDATE, DELETE) en cualquier usuario
CREATE POLICY "Admins can manage all users" 
  ON public.users 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Verificar que RLS está habilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

