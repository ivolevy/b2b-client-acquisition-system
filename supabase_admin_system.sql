-- ============================================================================
-- B2B CLIENT ACQUISITION SYSTEM - Sistema de Admin y Suscripciones
-- ============================================================================
-- Este script agrega las tablas necesarias para:
-- 1. Sistema de suscripciones
-- 2. Códigos promocionales
-- 3. Funciones de verificación automática
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TABLA SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan VARCHAR(20) DEFAULT 'pro' CHECK (plan IN ('free', 'pro')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_method VARCHAR(50) DEFAULT 'token' CHECK (payment_method IN ('token', 'manual', 'stripe', 'mercadopago')),
  payment_reference VARCHAR(255), -- token usado, payment_id, admin note, etc
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON public.subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- Habilitar Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

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

CREATE POLICY "Admins can manage subscriptions" 
  ON public.subscriptions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PASO 2: CREAR TABLA PROMO_CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  plan VARCHAR(20) DEFAULT 'pro' CHECK (plan IN ('free', 'pro')),
  duration_days INT NOT NULL DEFAULT 30,
  max_uses INT, -- NULL = ilimitado
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(is_active);

-- Habilitar Row Level Security
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para promo_codes (solo admins pueden gestionar)
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;

CREATE POLICY "Anyone can view active promo codes" 
  ON public.promo_codes 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage promo codes" 
  ON public.promo_codes 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PASO 3: CREAR TABLA PROMO_CODE_USES (tracking de uso)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_code ON public.promo_code_uses(code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON public.promo_code_uses(user_id);

-- Habilitar Row Level Security
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view own promo code uses" ON public.promo_code_uses;
DROP POLICY IF EXISTS "Admins can view all promo code uses" ON public.promo_code_uses;

CREATE POLICY "Users can view own promo code uses" 
  ON public.promo_code_uses 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all promo code uses" 
  ON public.promo_code_uses 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- PASO 4: CREAR FUNCIÓN PARA VERIFICAR Y EXPIRAR SUSCRIPCIONES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_expire_subscriptions()
RETURNS TABLE (
  expired_count INTEGER,
  updated_users INTEGER
) AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_updated_users INTEGER := 0;
BEGIN
  -- Marcar suscripciones expiradas
  UPDATE public.subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Degradar usuarios con suscripciones expiradas a free
  UPDATE public.users
  SET plan = 'free',
      plan_expires_at = NULL,
      updated_at = NOW()
  WHERE plan = 'pro'
    AND id IN (
      SELECT DISTINCT user_id 
      FROM public.subscriptions 
      WHERE status = 'expired' 
        AND expires_at < NOW()
    );
  
  GET DIAGNOSTICS v_updated_users = ROW_COUNT;
  
  RETURN QUERY SELECT v_expired_count, v_updated_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 5: CREAR FUNCIÓN PARA ACTIVAR SUSCRIPCIÓN CON CÓDIGO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.activate_subscription_with_code(
  p_user_id UUID,
  p_code VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
  v_promo_code RECORD;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_subscription_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar código promocional
  SELECT * INTO v_promo_code
  FROM public.promo_codes
  WHERE code = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses);
  
  -- Verificar si el código existe y es válido
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código promocional inválido o expirado'
    );
  END IF;
  
  -- Calcular fecha de expiración
  v_expires_at := NOW() + (v_promo_code.duration_days || ' days')::INTERVAL;
  
  -- Crear suscripción
  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    payment_method,
    payment_reference,
    starts_at,
    expires_at
  ) VALUES (
    p_user_id,
    v_promo_code.plan,
    'active',
    'token',
    p_code,
    NOW(),
    v_expires_at
  )
  RETURNING id INTO v_subscription_id;
  
  -- Actualizar usuario
  UPDATE public.users
  SET plan = v_promo_code.plan,
      plan_expires_at = v_expires_at,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Incrementar contador de usos
  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = v_promo_code.id;
  
  -- Registrar uso
  INSERT INTO public.promo_code_uses (code_id, user_id)
  VALUES (v_promo_code.id, p_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'expires_at', v_expires_at,
    'plan', v_promo_code.plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 6: CREAR FUNCIÓN PARA OBTENER MÉTRICAS DEL ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS JSONB AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.users),
    'free_users', (SELECT COUNT(*) FROM public.users WHERE plan = 'free'),
    'pro_users', (SELECT COUNT(*) FROM public.users WHERE plan = 'pro'),
    'active_subscriptions', (
      SELECT COUNT(*) FROM public.subscriptions 
      WHERE status = 'active' AND expires_at > NOW()
    ),
    'expiring_soon', (
      SELECT COUNT(*) FROM public.subscriptions 
      WHERE status = 'active' 
        AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    ),
    'new_users_last_30_days', (
      SELECT COUNT(*) FROM public.users 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'new_users_last_7_days', (
      SELECT COUNT(*) FROM public.users 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'total_searches', (
      SELECT COUNT(*) FROM public.search_history
    ),
    'searches_last_30_days', (
      SELECT COUNT(*) FROM public.search_history 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'total_saved_companies', (
      SELECT COUNT(*) FROM public.saved_companies
    ),
    'active_promo_codes', (
      SELECT COUNT(*) FROM public.promo_codes 
      WHERE is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
    ),
    'total_promo_code_uses', (
      SELECT COUNT(*) FROM public.promo_code_uses
    )
  ) INTO v_metrics;
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 7: CREAR FUNCIÓN PARA OBTENER GRÁFICOS DE USUARIOS POR MES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_users_by_month(months_back INTEGER DEFAULT 12)
RETURNS TABLE (
  month DATE,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', created_at)::DATE AS month,
    COUNT(*)::BIGINT AS count
  FROM public.users
  WHERE created_at >= NOW() - (months_back || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 8: CREAR FUNCIÓN PARA OBTENER GRÁFICOS DE ACTIVIDAD DE BÚSQUEDAS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_searches_by_day(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  day DATE,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', created_at)::DATE AS day,
    COUNT(*)::BIGINT AS count
  FROM public.search_history
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  subscriptions_count INTEGER;
  promo_codes_count INTEGER;
  promo_code_uses_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO subscriptions_count FROM public.subscriptions;
  SELECT COUNT(*) INTO promo_codes_count FROM public.promo_codes;
  SELECT COUNT(*) INTO promo_code_uses_count FROM public.promo_code_uses;
  
  RAISE NOTICE '✅ Sistema de Admin y Suscripciones creado exitosamente!';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '   - Suscripciones: %', subscriptions_count;
  RAISE NOTICE '   - Códigos promocionales: %', promo_codes_count;
  RAISE NOTICE '   - Usos de códigos: %', promo_code_uses_count;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

