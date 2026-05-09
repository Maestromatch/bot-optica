-- =============================================================
-- MIGRACIÓN: CREACIÓN DE TABLA SAAS_CLIENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.saas_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    optica_name TEXT NOT NULL,
    owner_name TEXT,
    city TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    plan_type TEXT DEFAULT 'Mensual',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS (Seguridad)
ALTER TABLE public.saas_clients ENABLE ROW LEVEL SECURITY;

-- Política para que el Admin (service role) pueda hacer todo
CREATE POLICY "Admin full access" ON public.saas_clients
    FOR ALL USING (true) WITH CHECK (true);
