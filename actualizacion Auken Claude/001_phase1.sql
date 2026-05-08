-- =============================================================
-- AUKÉN — FASE 1: QUEUE + CONVERSACIONES + STORAGE
-- Ejecutar en el SQL Editor de Supabase (en orden)
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABLA: message_queue
-- Cola de mensajes entrantes desde WhatsApp.
-- El webhook solo INSERTA aquí y responde 200 a Meta.
-- Un worker procesa los mensajes en orden por paciente.
-- -------------------------------------------------------------
create table if not exists public.message_queue (
  id              bigserial primary key,
  -- Identificación del mensaje
  phone           text not null,
  message_text    text,
  message_type    text not null default 'text',  -- text | image | audio
  media_id        text,                          -- id de Meta para imágenes/audio
  -- Estado del procesamiento
  status          text not null default 'pending', -- pending | processing | done | failed
  attempts        smallint not null default 0,
  error_message   text,
  -- Trazabilidad
  optica_id       bigint,
  meta_message_id text unique,                   -- previene duplicados de Meta
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  -- Para debugging
  raw_payload     jsonb
);

create index if not exists idx_queue_status_phone
  on public.message_queue (status, phone, received_at)
  where status in ('pending', 'processing');

create index if not exists idx_queue_received
  on public.message_queue (received_at desc);

comment on table public.message_queue is
  'Cola de mensajes WhatsApp entrantes. El webhook inserta, el worker procesa.';


-- -------------------------------------------------------------
-- 2. TABLA: conversaciones
-- Historial completo por paciente y canal. Sobrevive a recargas.
-- Una fila = una conversación activa. Los mensajes son JSONB array.
-- -------------------------------------------------------------
create table if not exists public.conversaciones (
  id              bigserial primary key,
  paciente_id     bigint references public.pacientes(id) on delete cascade,
  phone           text not null,                 -- backup si no hay paciente_id aún
  canal           text not null default 'whatsapp', -- whatsapp | web | instagram
  optica_id       bigint,
  -- Mensajes en orden cronológico
  -- Cada mensaje: { role: 'user'|'assistant', content: '...', ts: '...', meta: {...} }
  messages        jsonb not null default '[]'::jsonb,
  -- Resumen para no recargar todo el historial cada vez
  summary         text,
  message_count   integer not null default 0,
  -- Estado
  status          text not null default 'active', -- active | escalated | closed | timeout
  escalated_to    text,                           -- número de teléfono del humano si fue escalada
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_conv_phone_canal_status
  on public.conversaciones (phone, canal, status);

create index if not exists idx_conv_paciente
  on public.conversaciones (paciente_id) where paciente_id is not null;

create index if not exists idx_conv_last_message
  on public.conversaciones (last_message_at desc);

comment on table public.conversaciones is
  'Historial de conversaciones. Una fila por conversación activa, mensajes en JSONB.';


-- -------------------------------------------------------------
-- 3. TABLA: api_logs
-- Registra cada llamada a Claude API para tracking de costos
-- y debugging. Crítico para facturar correctamente a cada óptica.
-- -------------------------------------------------------------
create table if not exists public.api_logs (
  id              bigserial primary key,
  optica_id       bigint,
  conversacion_id bigint references public.conversaciones(id) on delete set null,
  provider        text not null default 'anthropic',  -- anthropic | groq | openai
  model           text not null,
  input_tokens    integer,
  output_tokens   integer,
  cost_usd        numeric(10, 6),
  latency_ms      integer,
  success         boolean not null default true,
  error_message   text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_logs_optica_date
  on public.api_logs (optica_id, created_at desc);

comment on table public.api_logs is
  'Tracking de uso de APIs externas. Para costos, debugging y facturación.';


-- -------------------------------------------------------------
-- 4. EXTENSIÓN tabla pacientes
-- Solo agrega columnas que faltan, sin romper lo existente.
-- -------------------------------------------------------------
alter table public.pacientes
  add column if not exists receta_img_path text,    -- path en Supabase Storage (reemplaza base64)
  add column if not exists optica_id bigint,        -- preparación para multi-tenant (Fase 3)
  add column if not exists conversacion_activa_id bigint,
  add column if not exists ultima_interaccion_at timestamptz,
  add column if not exists tags text[] default '{}',
  add column if not exists motivo_no_compra text,   -- preparación para Fase 2
  add column if not exists lead_score smallint default 50; -- 0-100, calculado por Claude

create index if not exists idx_pacientes_telefono
  on public.pacientes (telefono);

create index if not exists idx_pacientes_optica
  on public.pacientes (optica_id) where optica_id is not null;


-- -------------------------------------------------------------
-- 5. STORAGE BUCKET: recetas
-- Aquí van las imágenes de recetas en lugar de base64 en la fila.
-- Política: solo lectura/escritura desde el backend (service role).
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recetas',
  'recetas',
  false,
  5242880,  -- 5MB max por imagen
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Política: lectura pública si tienes la URL firmada (signed URL)
-- La escritura solo desde el backend con service_role key
create policy "Recetas readable with signed URL"
  on storage.objects for select
  using (bucket_id = 'recetas');


-- -------------------------------------------------------------
-- 6. FUNCIÓN: pull_pending_messages
-- Toma N mensajes pendientes de un teléfono específico,
-- los marca como 'processing', y los devuelve.
-- Usa SKIP LOCKED para evitar que dos workers tomen lo mismo.
-- -------------------------------------------------------------
create or replace function public.pull_pending_messages(
  p_phone text,
  p_limit integer default 5
)
returns setof public.message_queue
language plpgsql
as $$
begin
  return query
  update public.message_queue mq
  set status = 'processing',
      attempts = attempts + 1
  where mq.id in (
    select id from public.message_queue
    where status = 'pending'
      and phone = p_phone
      and attempts < 3
    order by received_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;

-- Versión global: toma N mensajes de cualquier teléfono pendiente
create or replace function public.pull_pending_global(
  p_limit integer default 20
)
returns setof public.message_queue
language plpgsql
as $$
begin
  return query
  update public.message_queue mq
  set status = 'processing',
      attempts = attempts + 1
  where mq.id in (
    select id from public.message_queue
    where status = 'pending'
      and attempts < 3
    order by received_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;


-- -------------------------------------------------------------
-- 7. FUNCIÓN: append_message_to_conversation
-- Agrega un mensaje al historial de una conversación de forma atómica.
-- Crea la conversación si no existe.
-- -------------------------------------------------------------
create or replace function public.append_message_to_conversation(
  p_phone text,
  p_canal text,
  p_role text,
  p_content text,
  p_meta jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
as $$
declare
  v_conversacion_id bigint;
  v_paciente_id bigint;
  v_new_message jsonb;
begin
  -- Buscar paciente por teléfono
  select id into v_paciente_id
  from public.pacientes
  where telefono = p_phone
  limit 1;

  -- Buscar conversación activa o crearla
  select id into v_conversacion_id
  from public.conversaciones
  where phone = p_phone
    and canal = p_canal
    and status = 'active'
    and last_message_at > now() - interval '24 hours'
  order by last_message_at desc
  limit 1;

  if v_conversacion_id is null then
    insert into public.conversaciones (phone, canal, paciente_id, messages, message_count)
    values (p_phone, p_canal, v_paciente_id, '[]'::jsonb, 0)
    returning id into v_conversacion_id;
  end if;

  -- Construir el mensaje nuevo
  v_new_message := jsonb_build_object(
    'role', p_role,
    'content', p_content,
    'ts', to_char(now() at time zone 'America/Santiago', 'HH24:MI'),
    'created_at', now(),
    'meta', p_meta
  );

  -- Actualizar la conversación
  update public.conversaciones
  set messages = messages || v_new_message,
      message_count = message_count + 1,
      last_message_at = now(),
      updated_at = now(),
      paciente_id = coalesce(paciente_id, v_paciente_id)
  where id = v_conversacion_id;

  -- Actualizar última interacción del paciente si aplica
  if v_paciente_id is not null then
    update public.pacientes
    set ultima_interaccion_at = now(),
        conversacion_activa_id = v_conversacion_id
    where id = v_paciente_id;
  end if;

  return v_conversacion_id;
end;
$$;


-- -------------------------------------------------------------
-- 8. VISTA: cola_dashboard
-- Para monitoreo en tiempo real desde el panel admin
-- -------------------------------------------------------------
create or replace view public.cola_dashboard as
select
  status,
  count(*) as total,
  count(*) filter (where received_at > now() - interval '1 hour') as ultima_hora,
  count(*) filter (where received_at > now() - interval '24 hours') as ultimas_24h,
  max(received_at) as mas_reciente,
  min(received_at) filter (where status = 'pending') as pendiente_mas_antiguo
from public.message_queue
group by status;

comment on view public.cola_dashboard is
  'Resumen de estado de la cola para monitoreo en el panel admin.';


-- -------------------------------------------------------------
-- 9. CLEANUP: archivar mensajes antiguos
-- Función para correr 1 vez por semana via cron y mantener
-- la tabla message_queue limpia.
-- -------------------------------------------------------------
create or replace function public.archive_old_queue_messages()
returns integer
language plpgsql
as $$
declare
  v_deleted integer;
begin
  delete from public.message_queue
  where status in ('done', 'failed')
    and processed_at < now() - interval '30 days';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;


-- =============================================================
-- FIN DE LA MIGRACIÓN — FASE 1
-- =============================================================
-- Para verificar que todo se creó correctamente, ejecuta:
--   select * from public.cola_dashboard;
--   select count(*) from public.conversaciones;
--   select count(*) from public.message_queue;
-- =============================================================
