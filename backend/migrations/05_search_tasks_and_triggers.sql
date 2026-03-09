-- Migración 05: Tareas de Búsqueda y Triggers Básicos
-- 1. Tabla para reemplazar el estado en memoria de Python (Resolviendo problema en Vercel)
CREATE TABLE IF NOT EXISTS public.search_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, error
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.search_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can insert their own tasks" ON public.search_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tasks" ON public.search_tasks
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can update their own tasks" ON public.search_tasks
    FOR UPDATE USING (auth.uid() = user_id);

-- 2. Función y Trigger para mantener sincronizados auth.users y public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nombre, created_at, role, credits, credits_reset_date)
  VALUES (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'nombre', -- Intenta extraer de los metadatos si existe
      NOW(), 
      'user', 
      1000, -- Créditos default (debe coincidir con la lógica)
      NOW() + INTERVAL '1 month'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger real (si existe la aseguramos)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Actualizar otras Foreign Keys críticas para usar ON DELETE CASCADE si no lo tienen
-- (Esto puede ser destructivo y complicado de correr condicionalmente en una base viva sin downtime,
-- nos aseguraremos de que las tablas importantes lo tengan, o usaremos scripts SQL manuales si el cliente lo requiere).
-- Por simplicidad en esta migración, aplicaremos CASCADE a email_templates si existe el FK.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='email_templates_user_id_fkey') THEN
        ALTER TABLE public.email_templates DROP CONSTRAINT email_templates_user_id_fkey;
        ALTER TABLE public.email_templates
        ADD CONSTRAINT email_templates_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='automation_rules_user_id_fkey') THEN
        ALTER TABLE public.automation_rules DROP CONSTRAINT automation_rules_user_id_fkey;
        ALTER TABLE public.automation_rules
        ADD CONSTRAINT automation_rules_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;
