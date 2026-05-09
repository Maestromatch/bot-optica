-- =============================================================
-- SQL 000: CIMIENTOS DE AUKÉN (EJECUTAR PRIMERO)
-- =============================================================

-- 1. Tabla Maestra de Ópticas
CREATE TABLE IF NOT EXISTS public.opticas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    slogan TEXT,
    configuracion JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Asegurar Datos Iniciales (Glow Vision)
INSERT INTO public.opticas (nombre, slug, slogan, configuracion)
VALUES ('Glow Vision', 'glowvision', 'Gestión de Alto Rendimiento', '{"owner_name": "Ismael"}')
ON CONFLICT (slug) DO NOTHING;

-- 3. Re-ejecutar el Maestro de Armonía (ahora que opticas existe)
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    optica_id UUID REFERENCES public.opticas(id),
    paciente_id UUID REFERENCES public.pacientes(id),
    monto DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mensajes_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID REFERENCES public.pacientes(id),
    remitente TEXT NOT NULL,
    contenido TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
