-- DESHABILITAR RLS COMPLETAMENTE EN promo_codes
-- Esto permite que cualquier usuario autenticado pueda hacer cualquier operación

-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can view all promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can insert promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can update promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can delete promo codes" ON public.promo_codes;

-- DESHABILITAR Row Level Security completamente
ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;

