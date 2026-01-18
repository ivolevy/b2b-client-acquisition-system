-- Ejecutar este script en el SQL Editor de Supabase
-- Esto creará el indice que falta para que el historial cargue rápido

CREATE INDEX IF NOT EXISTS idx_search_history_user_created 
ON public.search_history(user_id, created_at DESC);

-- Verificar que se creó
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'search_history';
