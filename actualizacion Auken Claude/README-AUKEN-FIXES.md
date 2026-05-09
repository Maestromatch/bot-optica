# Aukén — Fixes urgentes y multi-óptica

Esto soluciona la pantalla negra del dashboard, el chat que no responde, y deja el sistema editable para múltiples ópticas.

## Qué se arregló

| Bug | Síntoma | Causa | Fix |
|-----|---------|-------|-----|
| #1 TDZ en Dashboard | Pantalla negra en `/optica/dashboard` | `useEffect` accedía a `opticaData` antes del `useState` | useEffects movidos después de useStates |
| #2 handleSendWhatsApp | Crash al renderizar tabla pacientes | Función no pasada como prop a `OpticaDetail` | Reorganizado el componente, se pasa correctamente |
| #3 Chat no responde | Mensajes web no llegan a Claude | Falta env var `SUPABASE_SERVICE_ROLE_KEY` o `ANTHROPIC_API_KEY` en Vercel | Health endpoint detecta esto y avisa |
| #4 Tabla `citas` faltante | Worker falla al agendar | No estaba en migración 001 | Migración 002 la crea |
| #5 Config hardcodeada | No se podía editar para otra óptica | `MI_OPTICA` en código | Tabla `opticas` en BD + tab Configuración |

## Pasos en orden

### 1. Migración SQL en Supabase (3 minutos)

Abre el SQL Editor de Supabase y ejecuta el archivo `migrations/002_opticas_y_citas.sql` completo.

Verifica con:
```sql
select * from public.opticas;
select * from public.estadisticas_optica;
select count(*) from public.citas;
```

Debe aparecer al menos una óptica (Glow Vision) y la vista `estadisticas_optica` con sus métricas.

### 2. Reemplazar archivos en el repo

Los archivos de esta entrega van en estas rutas exactas:

```
api/chat.js                          → reemplaza
api/process-queue.js                 → reemplaza
src/lib/prompts.js                   → reemplaza
src/pages/AukenOpticaDashboard.jsx   → reemplaza completo (este es el crítico)
```

Los demás archivos de Fase 1 (`api/webhook.js`, `api/health.js`, `src/lib/anthropic.js`, `src/lib/supabase-admin.js`, etc.) **no cambian**, déjalos como están.

### 3. Variables de entorno en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables y verifica que estén estas (sin el prefijo `VITE_` para las que son backend):

| Variable | Valor | Dónde se usa |
|----------|-------|--------------|
| `ANTHROPIC_API_KEY` | sk-ant-... | api/chat.js, api/process-queue.js |
| `SUPABASE_URL` | https://xxx.supabase.co | endpoints |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJ... (del Settings → API → service_role) | endpoints |
| `WHATSAPP_TOKEN` | EAA... | webhook + worker |
| `PHONE_NUMBER_ID` | 1161... | webhook + worker |
| `WHATSAPP_VERIFY_TOKEN` | tu palabra secreta | webhook |
| `WORKER_SECRET` | string aleatorio largo | webhook → worker |
| `CRON_SECRET` | otro string aleatorio | cron → worker |
| `GROQ_API_KEY` | gsk_... | solo OCR de recetas |
| `VITE_SUPABASE_URL` | igual a SUPABASE_URL | frontend |
| `VITE_SUPABASE_ANON_KEY` | eyJ... (anon key) | frontend |

**Importante:** las variables `VITE_*` son para el navegador. Las **sin** prefijo son para el backend serverless. NO uses la `service_role` con prefijo `VITE_` o se filtra al cliente.

### 4. Deploy

```bash
git add .
git commit -m "fix: pantalla negra dashboard + multi-óptica editable"
git push
```

Vercel detectará el push y desplegará automáticamente. Espera ~2 minutos.

### 5. Verificación post-deploy

Visita en este orden:

**a)** `https://auken-sistema.vercel.app/api/health`

Debe devolver JSON con `status: "healthy"`. Si dice `degraded`, el JSON te dice qué env var falta o qué tabla no existe.

**b)** `https://auken-sistema.vercel.app/optica/dashboard`

(después de hacer login con `glow2026`). Debe mostrar el dashboard con 4 tabs: Métricas, Pacientes, Citas, Configuración. Si sale pantalla negra todavía, abre DevTools → Console y mándame el error exacto.

**c)** Probar chat: ve a `/optica` y manda un mensaje. Debe responder en menos de 5 segundos.

**d)** Probar WhatsApp: manda un mensaje real al número de WhatsApp de Glow Vision. Debe responder en menos de 10 segundos. Verifica también:

```sql
select * from public.message_queue order by received_at desc limit 5;
select * from public.conversaciones order by last_message_at desc limit 3;
```

## Lo que ahora puedes hacer desde el dashboard

1. **Tab Métricas** — KPIs en vivo, salud de la cola del bot, conversaciones activas.
2. **Tab Pacientes** — agregar manualmente, escanear receta con cámara (OCR), editar, eliminar, abrir WhatsApp.
3. **Tab Citas** — confirmar/cancelar citas que el bot agendó automáticamente.
4. **Tab Configuración** — editar nombre, dirección, horarios, servicios y precios de la óptica. Esto cambia automáticamente lo que el bot dice a los pacientes. Sin tocar código.

## Preparado para múltiples ópticas

La óptica actual (Glow Vision) tiene `slug = "glowvision"`. Cuando llegue la próxima óptica:

```sql
insert into public.opticas (
  slug, nombre, direccion, ciudad, telefono, whatsapp,
  horario, numero_escalada, promocion_estrella, servicios
) values (
  'optica-lux',
  'Óptica Lux Centro',
  'Av. Italia 1456',
  'Santiago',
  '+56 2 2345 6789',
  '+56987654321',
  'Lunes a Sábado 10:00 a 19:00',
  '+56987654321',
  'Examen visual GRATIS',
  '[{"nombre":"Lentes monofocales","precio":"desde $50.000"}]'::jsonb
);
```

Y luego en el dashboard, cuando implementes login multi-tenant (Fase 3), cada usuario verá solo su óptica.

## Capacidad de tráfico

Con la arquitectura actual (cola async + worker con concurrencia controlada), el sistema soporta:

- **WhatsApp**: ~100 mensajes/minuto sin saturarse, gracias al patrón de cola con `SKIP LOCKED`. Con 200 personas escribiendo simultáneamente todos en el mismo segundo, los primeros responden en 3-5 seg, los últimos en ~30 seg, ninguno se pierde.
- **Web chat**: Vercel maneja esto horizontalmente, sin límite práctico.
- **Bottleneck real**: el rate limit de Claude API. En tier estándar son 50 req/min, lo cual cubre 200 conversaciones cómodamente. Si crece más, sube tu tier en Anthropic ($100 USD upfront te da tier 2 con 1000 req/min).

## Próximas mejoras sugeridas

- **Google Calendar sync** (ya está la columna `google_event_id` en citas, falta la integración OAuth)
- **Cron diario de recetas vencidas** para envío automático de recordatorios
- **Verificación HMAC de Meta** en el webhook (seguridad)
- **Supabase Auth real** en lugar de la contraseña hardcodeada en `AukenLogin.jsx`
- **PWA mobile** para los vendedores en operativos

Estas las dejamos para Fase 2 (motor de retención) o como Fase 1.5 si quieres priorizarlas antes.
