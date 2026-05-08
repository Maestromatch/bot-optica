# Aukén — Fase 1: Despliegue

Esta carpeta contiene todos los archivos nuevos o modificados para resolver el problema de concurrencia que tu primo describe con Vamble, migrar de Groq a Claude, y persistir las conversaciones.

## Qué cambia respecto a tu código actual

| Archivo                          | Estado     | Acción                                                  |
| -------------------------------- | ---------- | ------------------------------------------------------- |
| `api/webhook.js`                 | Reemplaza  | Ahora solo encola y responde 200 a Meta inmediatamente  |
| `api/process-queue.js`           | Nuevo      | Worker que procesa la cola con concurrencia controlada  |
| `api/chat.js`                    | Reemplaza  | Migrado de Groq a Claude API directo                    |
| `api/vision.js`                  | Sin cambio | Sigue usando Groq Vision para OCR de recetas            |
| `src/lib/anthropic.js`           | Nuevo      | Cliente centralizado de Claude con retries y costos     |
| `src/lib/supabase-admin.js`      | Nuevo      | Cliente Supabase con service role para backend          |
| `src/lib/prompts.js`             | Nuevo      | System prompts centralizados (una fuente de verdad)     |
| `src/lib/useConversation.js`     | Nuevo      | Hook React para historial persistido                    |
| `src/components/QueueMonitor.jsx`| Nuevo      | Panel de monitoreo en tiempo real                       |
| `migrations/001_phase1.sql`      | Nuevo      | Tablas: message_queue, conversaciones, api_logs         |
| `vercel.json`                    | Reemplaza  | Agrega cron job y maxDuration por endpoint              |
| `.env.example`                   | Reemplaza  | Variables nuevas: SUPABASE_SERVICE_ROLE_KEY, secrets    |

## Pasos de despliegue

### 1. Migración de base de datos (5 min)

Abre el SQL Editor de Supabase y ejecuta `migrations/001_phase1.sql` completo. Verifica que se crearon las tablas:

```sql
select count(*) from public.message_queue;
select count(*) from public.conversaciones;
select count(*) from public.api_logs;
select * from public.cola_dashboard;
```

Si la tabla `pacientes` no existe todavía, créala primero antes de correr esta migración. La migración usa `if not exists` y `add column if not exists` así que es segura de ejecutar varias veces.

### 2. Variables de entorno (5 min)

En Vercel, ve a Project Settings → Environment Variables y agrega las nuevas:

- `ANTHROPIC_API_KEY` — sin el prefijo `VITE_`, esta es para el backend
- `SUPABASE_SERVICE_ROLE_KEY` — la encuentras en Supabase Settings → API → service_role secret
- `WORKER_SECRET` — genera uno con `openssl rand -hex 32`
- `CRON_SECRET` — otro distinto, mismo método
- `ESCALATION_PHONE` — el número del dueño de la óptica

Las que ya tenías (`VITE_SUPABASE_URL`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `GROQ_API_KEY`) siguen siendo necesarias.

### 3. Reemplazar archivos en el repo (10 min)

Copia los archivos de esta carpeta a tu repo respetando rutas. Luego:

```bash
npm install   # por si acaso
git add .
git commit -m "feat: fase 1 - cola, claude, conversaciones persistidas"
git push
```

Vercel detectará el push y desplegará automáticamente.

### 4. Plan de Vercel (importante)

El cron `* * * * *` (cada minuto) requiere **Vercel Pro** ($20 USD/mes). En Hobby el cron máximo es 1 vez por día, lo cual no sirve.

Tres opciones:
- **Recomendada:** Subir a Vercel Pro. Vale la pena por el costo de soporte y la cantidad de tráfico esperado.
- Usar **Supabase Edge Functions** con su propio cron (gratis hasta 500K invocaciones/mes). Te dejo la versión migrada en una próxima fase si lo prefieres.
- Usar un servicio externo gratuito como [cron-job.org](https://cron-job.org) que pegue cada minuto a `https://tu-dominio.vercel.app/api/process-queue` con header `Authorization: Bearer ${CRON_SECRET}`.

Independiente del cron, el sistema ya funciona en near-realtime porque el webhook dispara al worker directamente. El cron es solo el safety net por si hay mensajes huérfanos.

### 5. Verificación post-deploy

Envía un mensaje de prueba al WhatsApp de la óptica desde otro número y verifica:

```sql
-- ¿Se encoló?
select id, phone, message_text, status, received_at, processed_at
from public.message_queue
order by received_at desc limit 5;

-- ¿Se procesó? Debería estar 'done' en menos de 5 segundos
-- ¿Se guardó la conversación?
select id, phone, message_count, status, last_message_at
from public.conversaciones
order by last_message_at desc limit 5;

-- ¿Se logueó el costo?
select model, input_tokens, output_tokens, cost_usd, latency_ms, created_at
from public.api_logs
order by created_at desc limit 5;
```

### 6. Integrar QueueMonitor en el dashboard

En `AukenOpticaDashboard.jsx` o `AukenAdmin.jsx`, importa y renderiza:

```jsx
import QueueMonitor from "../components/QueueMonitor";

// Dentro del JSX, en algún tab o sección:
<QueueMonitor />
```

Esto le da a Saúl visibilidad de que el sistema está sano en cualquier momento.

### 7. Integrar useConversation en el chat existente

El componente `Chat` dentro de `AukenOptica.jsx` puede ahora cargar el historial persistido. Mínimo cambio:

```jsx
import { useConversation } from "../lib/useConversation";

// Dentro del componente Chat, reemplaza el useState inicial de messages:
const { messages: historicMessages, conversacionId } = useConversation({
  pacienteId: activePatient?.id,
  phone: activePatient?.telefono,
  canal: "whatsapp",
});

// Y al inicializar, usa los mensajes históricos si existen
useEffect(() => {
  if (historicMessages.length > 0) {
    setMessages(historicMessages);
  } else {
    setMessages([mkMsg("assistant", WELCOME)]);
  }
}, [activePatient?.id, historicMessages]);
```

Esto hace que el operador del dashboard vea **la misma conversación** que está pasando en WhatsApp en tiempo real, gracias a la suscripción Realtime.

## Cómo probar la solución al problema de Vamble

El test que demuestra que el problema está resuelto:

```bash
# Simulación de avalancha: 50 mensajes simultáneos a la cola
for i in {1..50}; do
  curl -X POST https://tu-dominio.vercel.app/api/webhook \
    -H "Content-Type: application/json" \
    -d "{
      \"object\":\"whatsapp_business_account\",
      \"entry\":[{\"changes\":[{\"value\":{\"messages\":[{
        \"from\":\"+5691234${i}\",
        \"id\":\"test-msg-$i-$(date +%s)\",
        \"type\":\"text\",
        \"text\":{\"body\":\"Hola, quiero información\"}
      }]}}]}]
    }" &
done
wait
```

Después de 30 segundos, verifica en Supabase:

```sql
select status, count(*) from public.message_queue
where received_at > now() - interval '5 minutes'
group by status;
```

Resultado esperado: `done = 50, pending = 0, failed = 0`. Con Vamble (procesamiento síncrono) verías muchos timeouts y fallos.

## Costos estimados (referencia para tarifar)

Con Claude Sonnet 4.6:
- ~1.500 tokens input + 200 tokens output por mensaje promedio
- Costo: ~$0.0075 USD por interacción
- 1000 interacciones/mes = ~$7.5 USD ≈ $7.000 CLP

Mantén el plan mensual en $89.990 CLP. El margen es saludable incluso para clientes con alto tráfico.

## Lo que queda fuera de Fase 1 (intencionalmente)

- Procesamiento de imágenes en WhatsApp (ya está la infraestructura, solo falta orquestar OCR + ficha)
- Notas de voz transcritas (Whisper)
- Tool use de Claude para reservas reales en Google Calendar
- Resumen automático de conversaciones largas
- Anti-spam por número

Todo eso son evoluciones que recomiendo abajo.

## Recomendaciones que aparecieron mientras construía Fase 1

Mientras revisaba todo tu código y armaba la solución, identifiqué cinco mejoras que vale la pena considerar para sumar al roadmap.

### Recomendación 1: Verificación de firma de Meta

Tu webhook actualmente acepta cualquier POST. Meta firma sus payloads con un HMAC SHA-256. Sin verificarlo, alguien que descubra la URL puede enviar mensajes falsos a tu sistema. Es 20 líneas de código y tapa un agujero serio. Lo agregaría en la Fase 1.5 antes de salir a más clientes.

### Recomendación 2: Tool use para agendar de verdad

Hoy el bot dice "te agendo el viernes 10:30" pero no agenda nada — solo guarda en la tabla `citas` con estado `pendiente_confirmacion`. Si conectamos Claude con tool use a Google Calendar, el bot crea el evento real, le manda invitación al paciente y le bloquea el horario al optometrista. Esto es lo que diferencia a Aukén de cualquier bot genérico. Lo veo como prioridad alta para Fase 2.

### Recomendación 3: Lead scoring automático con Haiku

Ya tienes el campo `lead_score` en la tabla pacientes. Después de cada conversación, mandarle el historial a Claude Haiku (10x más barato que Sonnet) y que devuelva un score 0-100 de probabilidad de compra. Eso te permite priorizar leads en el dashboard: "los 5 más calientes esta semana". Es un upsell natural para el plan Pro.

### Recomendación 4: Resumen progresivo de conversaciones

Cuando una conversación pasa los 50 mensajes, los tokens se inflan y el costo por respuesta sube. Solución: cuando una conversación tiene más de 30 mensajes, comprimimos los primeros 20 en un `summary` (ya tienes la columna en la tabla) y solo pasamos el summary + los últimos 10 mensajes al prompt. Mantiene el costo bajo control sin perder contexto.

### Recomendación 5: Modo "supervisor humano"

En el dashboard, cuando un operador humano está mirando una conversación activa, debería poder marcarla como "tomar control" y escribir él directamente. Mientras esté en modo manual, el bot pausa. Cuando el humano cierra el modo, el bot retoma con el contexto actualizado. Esto es lo que distingue una herramienta enterprise de un juguete y le da al primo la confianza de que nunca pierde el control.

### Bonus: Métrica de "tiempo a primera respuesta"

Agrega una columna `first_response_at` en `conversaciones` y mide cuánto tarda la primera respuesta del bot. Si Aukén promedia 8 segundos vs los 4 horas de la competencia humana, eso es la métrica de marketing más vendedora que puedes poner en la landing.

## Riesgo conocido a vigilar

El único riesgo real que dejamos en Fase 1 es la **dependencia de Anthropic**. Si Claude tiene un outage, el bot cae. Para mitigar:
- El retry exponencial ya está en `anthropic.js`
- En Fase 2 deberías agregar un fallback a Groq si Claude falla 3 veces seguidas
- La cola es persistente, así que mensajes nunca se pierden — solo se atrasan
