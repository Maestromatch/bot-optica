-- =============================================================
-- FUNCIÓN: get_queue_stats (Radar de Tráfico en Vivo)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_queue_stats()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pending', (SELECT count(*) FROM message_queue WHERE status = 'pending' AND attempts < 3),
    'processing', (SELECT count(*) FROM message_queue WHERE status = 'processing'),
    'done', (SELECT count(*) FROM message_queue WHERE status = 'done' AND processed_at > now() - interval '1 hour')
  ) INTO result;
  RETURN result;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.get_queue_stats() TO anon, authenticated, service_role;
