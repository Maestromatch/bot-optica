-- =============================================================
-- SQL MAESTRO DE ARMONÍA v7.0
-- Ejecuta esto para asegurar que TODO esté conectado
-- =============================================================

-- 1. Tabla de Ventas (El Corazón del Dashboard)
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    optica_id UUID REFERENCES public.opticas(id),
    paciente_id UUID REFERENCES public.pacientes(id),
    monto DECIMAL(12,2) NOT NULL,
    metodo_pago TEXT, -- 'efectivo', 'tarjeta', 'transferencia'
    categoria TEXT, -- 'lentes', 'contacto', 'accesorios'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Asegurar columnas en Pacientes para el CRM
ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS ultima_interaccion_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'vigente',
ADD COLUMN IF NOT EXISTS od_esfera TEXT,
ADD COLUMN IF NOT EXISTS oi_esfera TEXT;

-- 3. Tabla de Mensajes (La Memoria del Monitor)
CREATE TABLE IF NOT EXISTS public.mensajes_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID REFERENCES public.pacientes(id),
    remitente TEXT NOT NULL, -- 'bot', 'cliente', 'admin'
    contenido TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar RLS para que el Monitor vea los datos
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select vnt" ON public.ventas FOR SELECT USING (true);
CREATE POLICY "Allow public insert vnt" ON public.ventas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select msg" ON public.mensajes_chat FOR SELECT USING (true);
CREATE POLICY "Allow public insert msg" ON public.mensajes_chat FOR INSERT WITH CHECK (true);

-- 5. Función de Radar Actualizada
CREATE OR REPLACE FUNCTION public.get_queue_stats()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pending', (SELECT count(*) FROM message_queue WHERE status = 'pending'),
    'processing', (SELECT count(*) FROM message_queue WHERE status = 'processing'),
    'done', (SELECT count(*) FROM message_queue WHERE status = 'done' AND processed_at > now() - interval '1 hour')
  ) INTO result;
  RETURN result;
END;
$$;
