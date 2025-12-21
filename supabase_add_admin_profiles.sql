-- ============================================================================
-- Agregar campo ROLE y crear perfiles de administrador (Free y Pro)
-- ============================================================================
-- Ejecutar este script en SQL Editor de Supabase Dashboard
-- ============================================================================

-- Paso 1: Agregar columna 'role' a la tabla users si no existe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Paso 2: Actualizar usuarios existentes para que tengan role 'user' por defecto
UPDATE public.users 
SET role = 'user' 
WHERE role IS NULL;

-- Paso 3: Crear usuarios administradores de ejemplo
-- NOTA: Estos usuarios deben crearse primero en Authentication → Users
-- Luego ejecutar estos INSERTs con los UUIDs correspondientes

-- IMPORTANTE: Primero crea los usuarios en Authentication → Users con estos emails:
-- 1. admin-free@dotasolutions.com (password: AdminFree2024!)
-- 2. admin-pro@dotasolutions.com (password: AdminPro2024!)

-- Después de crear los usuarios en Authentication, obtén sus UUIDs y ejecuta:

-- Ejemplo para Admin Free (reemplaza 'UUID_DEL_USUARIO_ADMIN_FREE' con el UUID real):
/*
INSERT INTO public.users (id, email, phone, plan, role, searches_today, searches_reset_at)
VALUES (
  'UUID_DEL_USUARIO_ADMIN_FREE',  -- Reemplazar con UUID real
  'admin-free@dotasolutions.com',
  '+54 11 0000-0000',
  'free',
  'admin',
  0,
  CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  plan = 'free',
  role = 'admin',
  phone = COALESCE(EXCLUDED.phone, users.phone);
*/

-- Ejemplo para Admin Pro (reemplaza 'UUID_DEL_USUARIO_ADMIN_PRO' con el UUID real):
/*
INSERT INTO public.users (id, email, phone, plan, role, searches_today, searches_reset_at)
VALUES (
  'UUID_DEL_USUARIO_ADMIN_PRO',  -- Reemplazar con UUID real
  'admin-pro@dotasolutions.com',
  '+54 11 0000-0001',
  'pro',
  'admin',
  0,
  CURRENT_DATE
)
ON CONFLICT (id) DO UPDATE SET
  plan = 'pro',
  role = 'admin',
  phone = COALESCE(EXCLUDED.phone, users.phone);
*/

-- ============================================================================
-- ALTERNATIVA: Función para crear admin automáticamente después de crear usuario
-- ============================================================================

-- Función que verifica si el email es de admin y asigna el role automáticamente
CREATE OR REPLACE FUNCTION public.set_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el email contiene 'admin-free' o 'admin-pro', asignar role admin
  IF NEW.email LIKE '%admin-free%' OR NEW.email LIKE '%admin-pro%' THEN
    NEW.role := 'admin';
  ELSE
    NEW.role := COALESCE(NEW.role, 'user');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar role automáticamente
DROP TRIGGER IF EXISTS set_role_on_insert ON public.users;
CREATE TRIGGER set_role_on_insert
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_admin_role();

-- ============================================================================
-- Script para crear usuarios admin directamente (requiere permisos de admin)
-- ============================================================================

-- NOTA: Para crear usuarios directamente, necesitas usar la función de Supabase
-- o crear los usuarios desde Authentication → Users primero

-- Función helper para crear usuario admin completo
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email VARCHAR(255),
  p_phone VARCHAR(20),
  p_plan VARCHAR(20)
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Crear usuario en auth.users (requiere permisos especiales)
  -- Esto normalmente se hace desde el dashboard o usando la API de Supabase
  
  -- Por ahora, solo retornamos un mensaje
  RAISE NOTICE 'Para crear usuarios admin, primero créalos en Authentication → Users, luego actualiza su role aquí';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Consultas útiles para verificar usuarios admin
-- ============================================================================

-- Ver todos los usuarios admin
-- SELECT id, email, phone, plan, role, created_at FROM public.users WHERE role = 'admin';

-- Ver usuarios admin por plan
-- SELECT id, email, phone, plan, role FROM public.users WHERE role = 'admin' AND plan = 'free';
-- SELECT id, email, phone, plan, role FROM public.users WHERE role = 'admin' AND plan = 'pro';

-- ============================================================================
-- INSTRUCCIONES PASO A PASO
-- ============================================================================

/*
1. Ejecuta este script completo en SQL Editor de Supabase

2. Ve a Authentication → Users → Add user → Create new user
   - Email: admin-free@dotasolutions.com
   - Password: AdminFree2024!
   - Auto Confirm User: ✅ (marcado)
   - Crea el usuario

3. Copia el UUID del usuario creado

4. Ejecuta este SQL (reemplaza UUID_DEL_USUARIO_ADMIN_FREE con el UUID real):
   UPDATE public.users 
   SET role = 'admin', plan = 'free', phone = '+54 11 0000-0000'
   WHERE email = 'admin-free@dotasolutions.com';

5. Repite los pasos 2-4 para admin-pro@dotasolutions.com con plan 'pro'

6. Verifica que se crearon correctamente:
   SELECT email, phone, plan, role FROM public.users WHERE role = 'admin';
*/

