-- ============================================================================
-- AGREGAR ADMINS AUTOMÁTICAMENTE - Copia y pega todo esto
-- ============================================================================

-- Agregar columnas si no existen
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Insertar Admin Free (busca automáticamente por email)
INSERT INTO public.users (id, email, name, phone, plan, role, searches_today, searches_reset_at)
SELECT id, email, 'Admin Free', '+54 11 0000-0000', 'free', 'admin', 0, CURRENT_DATE
FROM auth.users WHERE email = 'admin-free@dotasolutions.com'
ON CONFLICT (id) DO UPDATE SET plan = 'free', role = 'admin', name = COALESCE(EXCLUDED.name, users.name);

-- Insertar Admin Pro (busca automáticamente por email)
INSERT INTO public.users (id, email, name, phone, plan, role, searches_today, searches_reset_at)
SELECT id, email, 'Admin Pro', '+54 11 0000-0001', 'pro', 'admin', 0, CURRENT_DATE
FROM auth.users WHERE email = 'admin-pro@dotasolutions.com'
ON CONFLICT (id) DO UPDATE SET plan = 'pro', role = 'admin', name = COALESCE(EXCLUDED.name, users.name);

-- Ver resultado
SELECT email, name, plan, role FROM public.users WHERE role = 'admin';

