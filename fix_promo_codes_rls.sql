-- Fix RLS policies for promo_codes to allow INSERT
-- The policy needs WITH CHECK clause for INSERT operations

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;

-- Recreate policy with WITH CHECK for INSERT
CREATE POLICY "Admins can manage promo codes" 
  ON public.promo_codes 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

