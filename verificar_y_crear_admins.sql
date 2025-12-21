-- ============================================================================
-- VERIFICAR Y CREAR ADMINS - Script Completo
-- ============================================================================

-- Paso 1: Ver TODOS los usuarios en auth.users para ver qué emails tienes
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Paso 2: Ver qué usuarios hay en public.users
SELECT id, email, name, plan, role 
FROM public.users 
ORDER BY created_at DESC;

-- Paso 3: Agregar columnas si no existen
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Paso 4: Insertar TODOS los usuarios de auth.users que tengan "admin" en el email
INSERT INTO public.users (id, email, name, phone, plan, role, searches_today, searches_reset_at)
SELECT 
  id,
  email,
  CASE 
    WHEN email LIKE '%free%' THEN 'Admin Free'
    WHEN email LIKE '%pro%' THEN 'Admin Pro'
    ELSE 'Administrador'
  END,
  '+54 11 0000-0000',
  CASE 
    WHEN email LIKE '%free%' THEN 'free'
    WHEN email LIKE '%pro%' THEN 'pro'
    ELSE 'free'
  END,
  'admin',
  0,
  CURRENT_DATE
FROM auth.users
WHERE email LIKE '%admin%'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  plan = EXCLUDED.plan,
  role = 'admin',
  phone = COALESCE(EXCLUDED.phone, users.phone);

-- Paso 5: Si tienes el usuario ivo.levy03@gmail.com, también puedes hacerlo admin
-- Descomenta las siguientes líneas si quieres:
/*
UPDATE public.users 
SET role = 'admin', plan = 'pro'
WHERE email = 'ivo.levy03@gmail.com';
*/

-- Paso 6: Ver resultado final
SELECT email, name, plan, role, created_at 
FROM public.users 
WHERE role = 'admin'
ORDER BY plan, email;

