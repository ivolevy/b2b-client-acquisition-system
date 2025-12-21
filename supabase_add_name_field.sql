-- ============================================================================
-- Agregar campo NAME a la tabla users
-- ============================================================================
-- Ejecutar este script en SQL Editor de Supabase Dashboard
-- ============================================================================

-- Paso 1: Agregar columna name si no existe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS name VARCHAR(50) NOT NULL DEFAULT 'Usuario';

-- Paso 2: Actualizar usuarios existentes que no tengan nombre
UPDATE public.users 
SET name = split_part(email, '@', 1)
WHERE name IS NULL OR name = 'Usuario';

-- Paso 3: Actualizar función handle_new_user() para incluir name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone, plan)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 4: Verificar que se agregó correctamente
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name = 'name';

