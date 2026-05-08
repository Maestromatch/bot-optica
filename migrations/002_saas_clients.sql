-- Tabla para gestionar los negocios/clientes del SaaS (Aukén OS)
create table if not exists public.clientes_agencia (
    id uuid default gen_random_uuid() primary key,
    nombre text not null,
    niche text not null, -- optica, dental, veterinaria, etc.
    icon text default '🏢',
    plan text default 'Base', -- Base, Pro, Total
    status text default 'onboarding', -- active, onboarding, paused
    mrr numeric default 0,
    contacts int default 0,
    booked int default 0,
    color text default '#00FFB3',
    since text,
    owner_name text,
    phone text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar Realtime para el Dashboard Maestro
alter publication supabase_realtime add table public.clientes_agencia;
