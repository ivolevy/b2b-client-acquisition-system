-- Migration: Schema Sync & Missing Functions (Fixed)
-- Date: 2026-02-24

-- 1. match_documents
DROP FUNCTION IF EXISTS public.match_documents(vector, float, int);
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 2. get_admin_metrics
DROP FUNCTION IF EXISTS public.get_admin_metrics();
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_users int;
  v_active_subscriptions int;
  v_total_revenue numeric;
BEGIN
  SELECT count(*) INTO v_total_users FROM public.users;
  SELECT count(*) INTO v_active_subscriptions FROM public.users WHERE subscription_status = 'active';
  SELECT COALESCE(sum(amount), 0) INTO v_total_revenue FROM public.payments WHERE status = 'approved';

  RETURN json_build_object(
    'total_users', v_total_users,
    'active_subscriptions', v_active_subscriptions,
    'total_revenue', v_total_revenue
  );
END;
$$;
