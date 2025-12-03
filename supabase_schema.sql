-- B2B CLIENT ACQUISITION SYSTEM - Supabase Schema
-- Ejecutar en SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  searches_today INT DEFAULT 0,
  searches_reset_at DATE DEFAULT CURRENT_DATE
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

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

CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id, created_at DESC);
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own search history" ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search history" ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own search history" ON public.search_history FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.saved_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  empresa_data JSONB NOT NULL,
  notas TEXT,
  estado VARCHAR(50) DEFAULT 'por_contactar',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_companies_user ON public.saved_companies(user_id);
ALTER TABLE public.saved_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saved companies" ON public.saved_companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved companies" ON public.saved_companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved companies" ON public.saved_companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved companies" ON public.saved_companies FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan VARCHAR(20) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  feature_value VARCHAR(255) NOT NULL,
  UNIQUE(plan, feature_key)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plan features" ON public.plan_features FOR SELECT USING (true);

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
