-- ==============================================================================
-- 01_enable_rls.sql
-- MIGRACIÓN DE SEGURIDAD B2B
-- 
-- IMPORTANTE: Ejecuta este script íntegramente en el "SQL Editor" de tu panel 
-- de Supabase para activar Row Level Security (RLS) en todas las tablas sensibles.
-- Esto protege a los usuarios de acceder a datos ajenos de forma directa.
-- ==============================================================================

-- 1. TABLA: empresas (Leads)
-- Las empresas son una base de datos global. Todos pueden leer, pero la inserción 
-- y actualización suele venir del backend (con token de usuario o admin).
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver empresas" ON public.empresas;
CREATE POLICY "Todos los usuarios autenticados pueden ver empresas" 
ON public.empresas FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar empresas" ON public.empresas;
CREATE POLICY "Usuarios autenticados pueden insertar empresas" 
ON public.empresas FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar empresas" ON public.empresas;
CREATE POLICY "Usuarios autenticados pueden actualizar empresas" 
ON public.empresas FOR UPDATE 
TO authenticated 
USING (true);


-- 2. TABLA: email_templates (Plantillas de correo)
-- Cada usuario solo puede ver y editar sus propias plantillas.
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own templates" ON public.email_templates;
CREATE POLICY "Users can view own templates" 
ON public.email_templates FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR es_default = true);

DROP POLICY IF EXISTS "Users can insert own templates" ON public.email_templates;
CREATE POLICY "Users can insert own templates" 
ON public.email_templates FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own templates" ON public.email_templates;
CREATE POLICY "Users can update own templates" 
ON public.email_templates FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own templates" ON public.email_templates;
CREATE POLICY "Users can delete own templates" 
ON public.email_templates FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());


-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================
