-- =============================================================
-- AUKÉN — Migración 002: tablas faltantes y configuración editable
-- Ejecutar DESPUÉS de 001_phase1.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABLA: opticas
-- Configuración editable de cada óptica. Hoy hay una (Glow Vision),
-- mañana hay diez. Esta tabla las gestiona todas.
-- -------------------------------------------------------------
create table if not exists public.opticas (
  id              bigserial primary key,
  -- Identidad
  slug            text unique not null,        -- 'glowvision', 'optica-lux', etc.
  nombre          text not null,
  slogan          text,
  logo_url        text,
  -- Contacto
  direccion       text,
  ciudad          text,
  telefono        text,
  email           text,
  whatsapp        text,
  -- Operación
  horario         text,                         -- "Lunes a Viernes 11:30 a 18:30"
  numero_escalada text,                         -- WhatsApp del dueño
  -- IA Configuración
  bot_nombre      text default 'Aukén',
  bot_personalidad text,
  promocion_estrella text,
  servicios       jsonb default '[]'::jsonb,    -- [{nombre, precio}]
  escalar_si      jsonb default '[]'::jsonb,    -- ["dolor severo", "trauma ocular"]
  -- Branding
  color_primario  text default '#FB923C',
  color_secundario text default '#7DD3FC',
  -- Estado
  plan            text default 'mensual',       -- mensual | anual | multi
  estado          text default 'activo',        -- activo | suspendido | trial
  trial_termina   date,
  -- Metadata
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_opticas_slug on public.opticas(slug);

-- Trigger para actualizar updated_at automáticamente
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_opticas_updated_at on public.opticas;
create trigger trg_opticas_updated_at
  before update on public.opticas
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------
-- 2. SEED: Glow Vision como primera óptica
-- -------------------------------------------------------------
insert into public.opticas (
  slug, nombre, slogan, direccion, ciudad, telefono, whatsapp,
  horario, numero_escalada,
  promocion_estrella,
  servicios,
  escalar_si,
  plan, estado
) values (
  'glowvision',
  'Óptica Glow Vision',
  'calidad que inspira',
  'Caupolicán #763',
  'Punitaqui',
  '+56 9 5493 2802',
  '+56954932802',
  'Lunes a Viernes 11:30 a 18:30',
  '+56954932802',
  'Examen visual GRATIS al comprar tus lentes',
  '[
    {"nombre": "Examen visual computarizado", "precio": "GRATIS al comprar lentes"},
    {"nombre": "Lentes monofocales", "precio": "desde $45.000"},
    {"nombre": "Lentes multifocales progresivos", "precio": "desde $180.000"},
    {"nombre": "Lentes de contacto blandos", "precio": "desde $25.000 el par"}
  ]'::jsonb,
  '["ojo rojo doloroso", "pérdida súbita de visión", "trauma ocular", "destellos nuevos", "reclamo formal"]'::jsonb,
  'mensual',
  'activo'
)
on conflict (slug) do nothing;


-- -------------------------------------------------------------
-- 3. TABLA: citas
-- Agendamientos generados por el bot, dashboard o llamadas Vapi
-- -------------------------------------------------------------
create table if not exists public.citas (
  id              bigserial primary key,
  optica_id       bigint references public.opticas(id) on delete cascade,
  paciente_id     bigint references public.pacientes(id) on delete set null,
  -- Datos de la cita
  nombre          text,                         -- backup si no hay paciente_id
  rut             text,
  telefono        text,
  servicio        text,
  fecha           date,
  hora            time,
  fecha_hora      timestamptz,                  -- redundante pero útil para queries
  duracion_min    smallint default 30,
  -- Origen y estado
  origen          text default 'manual',        -- manual | whatsapp-bot | web-bot | vapi-voz
  canal           text,                         -- whatsapp | web | telefono | presencial
  estado          text default 'pendiente_confirmacion',
                  -- pendiente_confirmacion | confirmada | completada | cancelada | no_show
  -- Google Calendar sync
  google_event_id text,
  google_calendar_id text,
  -- Notas
  objetivo        text,
  notas           text,
  -- Metadata
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_citas_paciente on public.citas(paciente_id);
create index if not exists idx_citas_optica_fecha on public.citas(optica_id, fecha);
create index if not exists idx_citas_estado on public.citas(estado);

drop trigger if exists trg_citas_updated_at on public.citas;
create trigger trg_citas_updated_at
  before update on public.citas
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------
-- 4. ENLAZAR pacientes existentes a Glow Vision
-- Solo los que no tengan optica_id todavía
-- -------------------------------------------------------------
update public.pacientes
set optica_id = (select id from public.opticas where slug = 'glowvision' limit 1)
where optica_id is null;


-- -------------------------------------------------------------
-- 5. RLS BÁSICA (kill-switch de seguridad)
-- Activa Row Level Security pero con políticas permisivas
-- mientras desarrollamos. En Fase 3 se ajusta por usuario.
-- -------------------------------------------------------------
alter table public.opticas enable row level security;
alter table public.citas enable row level security;

-- Política temporal: todos los usuarios autenticados pueden leer/escribir
-- Esto bloquea acceso público pero deja pasar al frontend con sesión.
drop policy if exists "auth_full_access_opticas" on public.opticas;
create policy "auth_full_access_opticas" on public.opticas
  for all using (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "auth_full_access_citas" on public.citas;
create policy "auth_full_access_citas" on public.citas
  for all using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- Para pacientes y conversaciones, lo mismo (cubre el riesgo que detectamos)
alter table public.pacientes enable row level security;
alter table public.conversaciones enable row level security;

drop policy if exists "auth_full_access_pacientes" on public.pacientes;
create policy "auth_full_access_pacientes" on public.pacientes
  for all using (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "auth_full_access_conversaciones" on public.conversaciones;
create policy "auth_full_access_conversaciones" on public.conversaciones
  for all using (auth.role() = 'authenticated' or auth.role() = 'service_role');


-- -------------------------------------------------------------
-- 6. FUNCIÓN: get_optica_config
-- Retorna la config completa de una óptica por slug
-- -------------------------------------------------------------
create or replace function public.get_optica_config(p_slug text)
returns jsonb
language plpgsql
as $$
declare
  v_config jsonb;
begin
  select to_jsonb(o.*) into v_config
  from public.opticas o
  where o.slug = p_slug
  limit 1;
  return v_config;
end;
$$;


-- -------------------------------------------------------------
-- 7. VISTA: estadisticas_optica
-- KPIs agregados que el dashboard puede leer en una query
-- -------------------------------------------------------------
create or replace view public.estadisticas_optica as
select
  o.id as optica_id,
  o.slug,
  o.nombre,
  -- Pacientes
  (select count(*) from public.pacientes p where p.optica_id = o.id) as total_pacientes,
  (select count(*) from public.pacientes p
   where p.optica_id = o.id
     and p.fecha_ultima_visita > now() - interval '11 months') as recetas_vigentes,
  (select count(*) from public.pacientes p
   where p.optica_id = o.id
     and p.fecha_ultima_visita between (now() - interval '12 months') and (now() - interval '11 months')) as recetas_proximas,
  (select count(*) from public.pacientes p
   where p.optica_id = o.id
     and p.fecha_ultima_visita < now() - interval '12 months') as recetas_vencidas,
  -- Conversaciones
  (select count(*) from public.conversaciones c
   where c.optica_id = o.id and c.last_message_at > now() - interval '24 hours') as conversaciones_24h,
  -- Citas
  (select count(*) from public.citas ci
   where ci.optica_id = o.id and ci.fecha >= current_date) as citas_proximas,
  -- Ventas (si el paciente tiene monto_venta y estado_compra='Compró')
  (select coalesce(sum(p.monto_venta::numeric), 0) from public.pacientes p
   where p.optica_id = o.id
     and p.estado_compra = 'Compró'
     and p.fecha_ultima_visita = current_date) as ventas_hoy_clp,
  (select coalesce(sum(p.monto_venta::numeric), 0) from public.pacientes p
   where p.optica_id = o.id
     and p.estado_compra = 'Compró') as ventas_total_clp
from public.opticas o;


-- =============================================================
-- FIN MIGRACIÓN 002
-- =============================================================
-- Verificación:
--   select * from public.opticas;
--   select * from public.estadisticas_optica;
-- =============================================================
