-- ============================================================================
-- CREAR ADMINISTRADORES FREE Y PRO - Script Rápido
-- ============================================================================
-- Ejecuta este script DESPUÉS de crear los usuarios en Authentication → Users
-- ============================================================================

-- Paso 1: Agregar columna role si no existe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Paso 2: Actualizar Admin Free (reemplaza el email si es diferente)
UPDATE public.users 
SET 
  role = 'admin',
  plan = 'free',
  phone = COALESCE(phone, '+54 11 0000-0000')
WHERE email = 'admin-free@dotasolutions.com';

-- Paso 3: Actualizar Admin Pro (reemplaza el email si es diferente)
UPDATE public.users 
SET 
  role = 'admin',
  plan = 'pro',
  phone = COALESCE(phone, '+54 11 0000-0001')
WHERE email = 'admin-pro@dotasolutions.com';

-- Paso 4: Verificar que se crearon correctamente
SELECT 
  email,
  phone,
  plan,
  role,
  created_at
FROM public.users 
WHERE role = 'admin'
ORDER BY plan, email;

-- ============================================================================
-- Si los usuarios no existen aún, créalos primero:
-- ============================================================================
-- 1. Ve a Authentication → Users → Add user
-- 2. Crea usuario: admin-free@dotasolutions.com / AdminFree2024!
-- 3. Crea usuario: admin-pro@dotasolutions.com / AdminPro2024!
-- 4. Luego ejecuta este script

