-- ============================================================================
-- B2B CLIENT ACQUISITION SYSTEM - Script Completo de Setup para Supabase
-- ============================================================================
-- Este script crea todas las tablas, políticas RLS, triggers y datos iniciales
-- Ejecutar en SQL Editor de Supabase Dashboard
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TABLA USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  searches_today INT DEFAULT 0,
  searches_reset_at DATE DEFAULT CURRENT_DATE
);

-- Habilitar Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay (para evitar duplicados)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

-- Crear políticas RLS
CREATE POLICY "Users can view own profile" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" 
  ON public.users 
  FOR DELETE 
  USING (auth.uid() = id);

-- ============================================================================
-- PASO 2: CREAR TABLA SEARCH_HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rubro VARCHAR(255) NOT NULL,
  ubicacion_nombre VARCHAR(500),
  centro_lat DECIMAL(10, 8),
  centro_lng DECIMAL(11, 8),
  radio_km DECIMAL(10, 2),
  bbox VARCHAR(255),
  empresas_encontradas INT DEFAULT 0,
  empresas_validas INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_search_history_user 
  ON public.search_history(user_id, created_at DESC);

-- Habilitar Row Level Security
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can insert own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;

-- Crear políticas RLS
CREATE POLICY "Users can view own search history" 
  ON public.search_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" 
  ON public.search_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history" 
  ON public.search_history 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- PASO 3: CREAR TABLA SAVED_COMPANIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  empresa_data JSONB NOT NULL,
  notas TEXT,
  estado VARCHAR(50) DEFAULT 'por_contactar',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_saved_companies_user 
  ON public.saved_companies(user_id);

-- Habilitar Row Level Security
ALTER TABLE public.saved_companies ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own saved companies" ON public.saved_companies;
DROP POLICY IF EXISTS "Users can insert own saved companies" ON public.saved_companies;
DROP POLICY IF EXISTS "Users can update own saved companies" ON public.saved_companies;
DROP POLICY IF EXISTS "Users can delete own saved companies" ON public.saved_companies;

-- Crear políticas RLS
CREATE POLICY "Users can view own saved companies" 
  ON public.saved_companies 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved companies" 
  ON public.saved_companies 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved companies" 
  ON public.saved_companies 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved companies" 
  ON public.saved_companies 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- PASO 4: CREAR TABLA PLAN_FEATURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan VARCHAR(20) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  feature_value VARCHAR(255) NOT NULL,
  UNIQUE(plan, feature_key)
);

-- Habilitar Row Level Security
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Eliminar política existente
DROP POLICY IF EXISTS "Anyone can view plan features" ON public.plan_features;

-- Crear política RLS (cualquiera puede leer)
CREATE POLICY "Anyone can view plan features" 
  ON public.plan_features 
  FOR SELECT 
  USING (true);

-- Insertar datos de características de planes
-- Usar ON CONFLICT para evitar duplicados si se ejecuta múltiples veces
INSERT INTO public.plan_features (plan, feature_key, feature_value) VALUES
  ('free', 'max_searches_per_day', '5'),
  ('free', 'max_results_per_search', '50'),
  ('free', 'save_search_history', 'false'),
  ('free', 'save_companies', 'false'),
  ('free', 'export_csv', 'true'),
  ('free', 'emails_per_day', '10'),
  ('free', 'pro_background', 'false'),
  ('pro', 'max_searches_per_day', 'unlimited'),
  ('pro', 'max_results_per_search', 'unlimited'),
  ('pro', 'save_search_history', 'true'),
  ('pro', 'save_companies', 'true'),
  ('pro', 'export_csv', 'true'),
  ('pro', 'emails_per_day', 'unlimited'),
  ('pro', 'pro_background', 'true')
ON CONFLICT (plan, feature_key) DO NOTHING;

-- ============================================================================
-- PASO 5: CREAR FUNCIÓN Y TRIGGER PARA CREAR USUARIOS AUTOMÁTICAMENTE
-- ============================================================================

-- Crear o reemplazar la función que crea el perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role VARCHAR(20) := 'user';
BEGIN
  -- Si el email contiene 'admin', asignar role admin automáticamente
  IF NEW.email LIKE '%admin%' THEN
    v_role := 'admin';
  END IF;
  
  INSERT INTO public.users (id, email, name, phone, plan, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'free',
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger que se ejecuta después de insertar un usuario en auth.users
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PASO 6: CREAR FUNCIÓN PARA INCREMENTAR CONTADOR DE BÚSQUEDAS (OPCIONAL)
-- ============================================================================

-- Esta función es útil para incrementar el contador de búsquedas del día
CREATE OR REPLACE FUNCTION public.increment_searches(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET searches_today = searches_today + 1,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Mostrar resumen de lo creado
DO $$
DECLARE
  users_count INTEGER;
  search_history_count INTEGER;
  saved_companies_count INTEGER;
  plan_features_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM public.users;
  SELECT COUNT(*) INTO search_history_count FROM public.search_history;
  SELECT COUNT(*) INTO saved_companies_count FROM public.saved_companies;
  SELECT COUNT(*) INTO plan_features_count FROM public.plan_features;
  
  RAISE NOTICE '✅ Setup completado exitosamente!';
  RAISE NOTICE '📊 Resumen:';
  RAISE NOTICE '   - Usuarios: %', users_count;
  RAISE NOTICE '   - Historial de búsquedas: %', search_history_count;
  RAISE NOTICE '   - Empresas guardadas: %', saved_companies_count;
  RAISE NOTICE '   - Características de planes: %', plan_features_count;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Si ves este mensaje, el script se ejecutó completamente.
-- Verifica los resultados ejecutando las consultas de verificación en la guía.
-- ============================================================================
