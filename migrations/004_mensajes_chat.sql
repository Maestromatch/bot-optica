-- =============================================================
-- MIGRACIÓN: HISTORIAL DE MENSAJES (MEMORIA DEL MONITOR)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.mensajes_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID REFERENCES public.pacientes(id),
    remitente TEXT NOT NULL, -- 'bot', 'cliente', 'admin'
    contenido TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON public.mensajes_chat FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.mensajes_chat FOR INSERT WITH CHECK (true);
