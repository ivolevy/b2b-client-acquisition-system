-- ============================================================================
-- FIX: Corregir políticas RLS para subscriptions
-- ============================================================================
-- Este script corrige las políticas RLS para permitir que los admins
-- puedan insertar y actualizar suscripciones correctamente
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

-- Política para que los usuarios vean sus propias suscripciones
CREATE POLICY "Users can view own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para que los admins vean todas las suscripciones
CREATE POLICY "Admins can view all subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Política para que los admins puedan INSERTAR suscripciones
CREATE POLICY "Admins can insert subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Política para que los admins puedan ACTUALIZAR suscripciones
CREATE POLICY "Admins can update subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
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

-- Política para que los admins puedan ELIMINAR suscripciones
CREATE POLICY "Admins can delete subscriptions" 
  ON public.subscriptions 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

