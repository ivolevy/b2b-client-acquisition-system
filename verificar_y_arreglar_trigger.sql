-- ============================================================================
-- VERIFICAR Y ARREGLAR TRIGGER DE CREACIÓN DE USUARIOS
-- ============================================================================
-- Este script verifica y arregla el trigger que crea usuarios automáticamente
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================================

-- PASO 1: Verificar si el trigger existe
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- PASO 2: Verificar si la función existe
SELECT 
  routine_name, 
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- PASO 3: Eliminar trigger y función si existen (para recrearlos)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- PASO 4: Recrear la función correctamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role VARCHAR(20) := 'user';
BEGIN
  -- Si el email contiene 'admin', asignar role admin automáticamente
  IF NEW.email LIKE '%admin%' THEN
    v_role := 'admin';
  END IF;
  
  -- Insertar en public.users
  INSERT INTO public.users (id, email, name, phone, plan, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'free',
    v_role
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar errores si ya existe
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no fallar el registro
    RAISE WARNING 'Error creando usuario en public.users: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 5: Recrear el trigger
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- PASO 6: Verificar que se creó correctamente
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- PASO 7: Crear usuarios faltantes que ya existen en auth.users pero no en public.users
INSERT INTO public.users (id, email, name, phone, plan, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'phone', '') as phone,
  CASE 
    WHEN au.email LIKE '%admin%' THEN 'pro'
    ELSE 'free'
  END as plan,
  CASE 
    WHEN au.email LIKE '%admin%' THEN 'admin'
    ELSE 'user'
  END as role,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- PASO 8: Verificar usuarios creados
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as usuarios_faltantes
FROM auth.users;

