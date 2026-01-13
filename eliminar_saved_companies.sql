-- ============================================================================
-- SCRIPT PARA ELIMINAR LA TABLA SAVED_COMPANIES
-- ============================================================================
-- ADVERTENCIA: Esto borrará permanentemente todos los datos de empresas guardadas.
-- Ejecutar en el SQL Editor de Supabase.

DROP TABLE IF EXISTS public.saved_companies CASCADE;

-- También es recomendable borrar las políticas asociadas si quedaron huerfanas (el CASCADE suele encargarse, pero por si acaso)
-- DROP POLICY IF EXISTS "Users can view own saved companies" ON public.saved_companies;
-- ...etc

-- Si quieres limpiar el código también, avísame.
