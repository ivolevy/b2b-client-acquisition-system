-- ============================================================================
-- MIGRACIÓN: Cambiar campo "name" por "phone" en tabla users
-- ============================================================================
-- Ejecutar este script en SQL Editor de Supabase Dashboard
-- ============================================================================

-- Paso 1: Agregar columna phone (si no existe)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Paso 2: Actualizar función handle_new_user() para usar phone en lugar de name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, plan)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 3: (OPCIONAL) Si quieres eliminar la columna name después de migrar datos
-- Primero migra los datos existentes si los hay:
-- UPDATE public.users SET phone = name WHERE phone IS NULL OR phone = '';

-- Paso 4: (OPCIONAL) Eliminar columna name después de verificar que todo funciona
-- ALTER TABLE public.users DROP COLUMN IF EXISTS name;

-- ============================================================================
-- NOTA: Si tienes datos existentes en la columna "name" que quieres preservar,
-- ejecuta primero el UPDATE del Paso 3 antes de eliminar la columna.
-- ============================================================================

