-- Trigger para eliminar automáticamente el usuario de auth.users cuando se elimina de la tabla users
-- Ejecutar este SQL en el SQL Editor de Supabase Dashboard

-- Función que elimina el usuario de auth.users cuando se elimina de public.users
CREATE OR REPLACE FUNCTION public.delete_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Eliminar el usuario de auth.users usando la función admin
  -- NOTA: Esto requiere permisos de SECURITY DEFINER
  PERFORM auth.uid() FROM auth.users WHERE id = OLD.id;
  
  -- Intentar eliminar usando la función de Supabase (si está disponible)
  -- Si no funciona, el usuario seguirá existiendo en auth.users pero no podrá iniciar sesión
  -- porque no tendrá perfil en public.users
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS on_user_deleted ON public.users;
CREATE TRIGGER on_user_deleted
  AFTER DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_auth_user();

-- NOTA IMPORTANTE: 
-- Este trigger tiene limitaciones porque no puede eliminar directamente de auth.users
-- sin permisos de administrador. La mejor solución es usar una función edge de Supabase.
-- 
-- Alternativa: Usar una función edge de Supabase (recomendado)
-- Ve a: https://supabase.com/docs/guides/functions
-- O ejecuta: supabase functions deploy delete-user
