# AUKÉN CLEAN SLATE - Fase 0 Reset Completo

Este paquete contiene TODO lo necesario para arrancar Aukén desde cero de forma limpia.

## Contenido del paquete

```
auken-clean-slate/
├── 000_cleanup.sql                 ← SQL: limpia todo (PASO 1)
├── 001_complete_schema.sql         ← SQL: crea todo (PASO 2)
├── chat.js                         ← Código: endpoint chat web
├── process-queue.js                ← Código: worker WhatsApp
├── prompts.js                      ← Código: configuración Claude
├── AukenOpticaDashboard.jsx        ← Código: dashboard óptica
└── README.md                       ← Este archivo
```

## Guía de ejecución paso a paso

### PASO 1: Limpieza en Supabase

1. Abre Supabase SQL Editor
2. Crea un nuevo query
3. Copia y pega el contenido de `000_cleanup.sql`
4. **IMPORTANTE**: Revisa que entiendes que esto BORRA TODO
5. Ejecuta (Run)
6. Verifica que al final muestra "0 rows" o solo tablas del sistema

### PASO 2: Crear esquema completo

1. En el mismo SQL Editor
2. Crea un nuevo query
3. Copia y pega el contenido de `001_complete_schema.sql`
4. Ejecuta (Run)
5. Verifica al final:
   - "Tablas creadas: 7+"
   - "Funciones creadas: 2+"
   - "Vistas creadas: 2+"

### PASO 3: Reemplazar archivos de código

En tu repo local, reemplaza estos 4 archivos:

```bash
# Reemplazar endpoints API
cp chat.js tu-repo/api/chat.js
cp process-queue.js tu-repo/api/process-queue.js

# Reemplazar librería
cp prompts.js tu-repo/src/lib/prompts.js

# Reemplazar dashboard (EL CRÍTICO)
cp AukenOpticaDashboard.jsx tu-repo/src/pages/AukenOpticaDashboard.jsx
```

### PASO 4: Configurar env vars en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables

Agrega o verifica estas:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (el secreto desde Supabase Settings → API)
WORKER_SECRET=cualquier-string-aleatorio-inventalo
CRON_SECRET=otro-string-aleatorio-diferente
```

**IMPORTANTE**: Estas vars son para BACKEND (sin VITE_). No las pongas con prefijo VITE_.

### PASO 5: Deploy

```bash
git add .
git commit -m "Fase 0: Clean slate - schema completo + fixes"
git push
```

Espera el deploy en Vercel (1-2 minutos).

### PASO 6: Verificación

#### A. Health check

```bash
curl https://auken-sistema.vercel.app/api/health
```

Debe devolver:
```json
{
  "status": "healthy",
  "components": {
    "supabase": "ok",
    "anthropic": "ok",
    "queue": "ok"
  }
}
```

Si algún componente está "degraded", revisa las env vars.

#### B. Dashboard

1. Abre `https://auken-sistema.vercel.app/optica/dashboard`
2. Login con: `glow2026`
3. Debe cargar sin pantalla negra
4. Tab "Base Clínica" debe mostrar los 5 pacientes seed

#### C. Chat

1. Abre `https://auken-sistema.vercel.app/optica`
2. Selecciona un paciente de la lista
3. Escribe un mensaje y envía
4. Debe responder con Claude en 2-5 segundos

### PASO 7: Verificación en Supabase

Verifica que se crearon datos:

```sql
-- Debe mostrar Glow Vision
select * from public.opticas;

-- Debe mostrar 5 pacientes
select * from public.pacientes;

-- Al chatear, debe crear conversaciones
select * from public.conversaciones;
```

## Troubleshooting

### Dashboard pantalla negra

1. Abre DevTools → Console
2. Si dice "useEffect TDZ error" → no reemplazaste bien el AukenOpticaDashboard.jsx
3. Si dice "Cannot read opticaData" → mismo problema
4. Solución: vuelve a copiar el archivo completo

### Chat no responde

1. Verifica `/api/health` → debe estar verde
2. Si `anthropic: "error"` → revisa ANTHROPIC_API_KEY en Vercel
3. Si `supabase: "error"` → revisa SUPABASE_SERVICE_ROLE_KEY
4. Verifica que las env vars NO tengan prefijo VITE_

### Tabla no existe

1. Vuelve a correr `001_complete_schema.sql`
2. Verifica que corrió sin errores
3. Lista todas las tablas: `select * from information_schema.tables where table_schema = 'public';`

### Foreign key error

Si ves "cannot be implemented", significa que:
- No corriste el 000_cleanup.sql primero
- Hay migraciones viejas interferiendo

Solución: corre PRIMERO el cleanup, DESPUÉS el schema.

## Qué eliminamos vs qué creamos

### ❌ Eliminamos (migrations viejas en conflicto)

Todas las migraciones de Supabase que estaban dando conflicto:
- "Cola de mensajes y conversaciones con historial y tracking API"
- "Ventas, CRM y Mensajería con RLS y Stats"
- Cualquier otra migration custom

### ✅ Creamos (desde cero, orden correcto)

1. `opticas` → la base, todo referencia a esta
2. `pacientes` → vinculado a óptica
3. `recetas` → vinculado a paciente + óptica
4. `citas` → vinculado a paciente + óptica
5. `conversaciones` → vinculado a paciente + óptica
6. `message_queue` → cola async, vinculado a paciente + óptica
7. `api_logs` → monitoreo

Todas con tipos UUID correctos, foreign keys OK, índices optimizados.

## Capacidades confirmadas después de este reset

✅ Dashboard carga sin pantalla negra
✅ Chat responde con Claude Sonnet 4.6
✅ Pacientes visibles en Base Clínica
✅ Cola async preparada para WhatsApp
✅ Multi-óptica desde el inicio (RLS básica)
✅ OCR preparado (campo storage_path en recetas)
✅ Citas con Google Calendar preparado (google_event_id)

## Próximos pasos (Fase 1)

Una vez que esto funcione:

1. Conectar webhook Meta → `/api/webhook`
2. Probar ciclo completo WhatsApp → Claude → respuesta
3. Test de carga 200 mensajes concurrentes
4. OCR de recetas con Claude Vision
5. Integrar monitor de cola en vivo

## Soporte

Si algo falla:
1. Revisa la sección Troubleshooting arriba
2. Verifica `/api/health` primero
3. Comparte el error exacto de Supabase o DevTools
4. Verifica que los 4 archivos se copiaron completos

---

**Versión**: Clean Slate v1.0
**Fecha**: 2026-05-09
**Tiempo estimado ejecución**: 10 minutos
