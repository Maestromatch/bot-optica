// =============================================================
// AUKÉN — Worker de procesamiento de cola
// =============================================================
// Este endpoint procesa los mensajes pendientes de la cola.
// Se invoca de dos formas:
//   1. Fire-and-forget desde /api/webhook (procesamiento near-realtime)
//   2. Cron job cada minuto (safety net para mensajes huérfanos)
//
// Garantías:
// - Mensajes del mismo paciente se procesan SECUENCIALMENTE (no se
//   mezclan respuestas mid-conversation).
// - Mensajes de pacientes DIFERENTES se procesan en PARALELO.
// - Si falla, reintenta hasta 3 veces antes de marcar como 'failed'.
// =============================================================

import { getSupabaseAdmin } from "../src/lib/supabase-admin.js";
import { callClaude, MODELS, logApiCall } from "../src/lib/anthropic.js";
import { buildSystemPrompt, parseSpecialTags, getEstadoReceta } from "../src/lib/prompts.js";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const META_API_VERSION = "v21.0";

// Cuántos pacientes procesar en paralelo. Conservador para no
// saturar Claude API en una sola invocación. Vercel permite
// múltiples invocaciones concurrentes así que esto se compensa.
const MAX_PARALLEL = 5;

export default async function handler(req, res) {
  // ───────── Auth: solo aceptamos invocaciones legítimas ─────────
  const secret = req.headers["x-worker-secret"];
  const cronAuth = req.headers["authorization"];
  const expectedSecret = process.env.WORKER_SECRET || "auken-worker-2026";
  const expectedCron = `Bearer ${process.env.CRON_SECRET || "auken-cron-2026"}`;

  if (secret !== expectedSecret && cronAuth !== expectedCron) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabaseAdmin();
  const trigger = req.body?.trigger || (req.method === "GET" ? "cron" : "manual");
  const specificPhones = req.body?.phones;

  // ───────── 1. Sacar mensajes pendientes de la cola ─────────
  let pending;
  try {
    if (specificPhones && specificPhones.length > 0) {
      // Modo webhook: procesar solo los teléfonos que recién entraron
      const results = await Promise.all(
        specificPhones.map(phone =>
          supabase.rpc("pull_pending_messages", { p_phone: phone, p_limit: 5 })
        )
      );
      pending = results.flatMap(r => r.data || []);
    } else {
      // Modo cron: barrer toda la cola
      const { data } = await supabase.rpc("pull_pending_global", { p_limit: 30 });
      pending = data || [];
    }
  } catch (err) {
    console.error("[worker] Error sacando de la cola:", err.message);
    return res.status(500).json({ error: err.message });
  }

  if (pending.length === 0) {
    return res.status(200).json({ trigger, processed: 0, message: "cola vacía" });
  }

  // ───────── 2. Agrupar por teléfono (orden importa por paciente) ─────────
  const byPhone = {};
  for (const msg of pending) {
    if (!byPhone[msg.phone]) byPhone[msg.phone] = [];
    byPhone[msg.phone].push(msg);
  }

  // ───────── 3. Procesar grupos de pacientes en paralelo ─────────
  const phones = Object.keys(byPhone);
  const results = [];

  // Trocear en lotes para no abrir 100 promesas si entró una avalancha
  for (let i = 0; i < phones.length; i += MAX_PARALLEL) {
    const batch = phones.slice(i, i + MAX_PARALLEL);
    const batchResults = await Promise.allSettled(
      batch.map(phone => processPhoneQueue(supabase, phone, byPhone[phone]))
    );
    results.push(...batchResults);
  }

  const successful = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return res.status(200).json({
    trigger,
    phones_processed: phones.length,
    messages_total: pending.length,
    successful,
    failed,
  });
}

// =============================================================
// processPhoneQueue
// Procesa los mensajes de UN paciente en orden cronológico.
// Si hay 3 mensajes del mismo paciente, los junta en uno solo
// (típico patrón humano: escribir 3 frases seguidas).
// =============================================================
async function processPhoneQueue(supabase, phone, messages) {
  // Ordenar cronológicamente
  messages.sort((a, b) => new Date(a.received_at) - new Date(b.received_at));

  // Concatenar mensajes consecutivos del mismo paciente
  const consolidatedText = messages
    .map(m => m.message_text)
    .filter(Boolean)
    .join("\n");

  if (!consolidatedText.trim()) {
    await markAsDone(supabase, messages);
    return;
  }

  try {
    // ───────── Buscar paciente en BD ─────────
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("*")
      .eq("telefono", phone)
      .maybeSingle();

    let pacienteEnriched = paciente;
    if (paciente) {
      pacienteEnriched = {
        ...paciente,
        estado_receta: getEstadoReceta(paciente.fecha_ultima_visita),
      };
    }

    // ───────── Cargar conversación activa ─────────
    const { data: convs } = await supabase
      .from("conversaciones")
      .select("*")
      .eq("phone", phone)
      .eq("canal", "whatsapp")
      .eq("status", "active")
      .gte("last_message_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("last_message_at", { ascending: false })
      .limit(1);

    const conv = convs?.[0];

    // Construir historial para Claude (últimos 20 mensajes para no inflar tokens)
    const history = (conv?.messages || []).slice(-20).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // ───────── Llamar a Claude ─────────
    const systemPrompt = buildSystemPrompt(pacienteEnriched, "whatsapp", conv?.summary);

    const claude = await callClaude({
      system: systemPrompt,
      messages: [...history, { role: "user", content: consolidatedText }],
      model: MODELS.CHAT,
      maxTokens: 600,
      temperature: 0.7,
    });

    // Procesar tags secretos ([REGISTER], [ESCALAR], etc.)
    const { cleanText, actions } = parseSpecialTags(claude.text);

    // ───────── Guardar mensaje del usuario en conversación ─────────
    await supabase.rpc("append_message_to_conversation", {
      p_phone: phone,
      p_canal: "whatsapp",
      p_role: "user",
      p_content: consolidatedText,
      p_meta: {
        message_ids: messages.map(m => m.meta_message_id),
        consolidated_count: messages.length,
      },
    });

    // ───────── Guardar respuesta del bot en conversación ─────────
    const { data: convId } = await supabase.rpc("append_message_to_conversation", {
      p_phone: phone,
      p_canal: "whatsapp",
      p_role: "assistant",
      p_content: cleanText,
      p_meta: { actions, model: MODELS.CHAT },
    });

    // Log de costos
    logApiCall(supabase, {
      opticaId: paciente?.optica_id,
      conversacionId: convId,
      model: MODELS.CHAT,
      usage: claude.usage,
      costUsd: claude.costUsd,
      latencyMs: claude.latencyMs,
    });

    // ───────── Ejecutar acciones especiales ─────────
    for (const action of actions) {
      await executeAction(supabase, action, phone, paciente);
    }

    // ───────── Enviar respuesta por WhatsApp ─────────
    if (cleanText && WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
      await sendWhatsAppMessage(phone, cleanText);
    }

    // ───────── Marcar mensajes como procesados ─────────
    await markAsDone(supabase, messages);

  } catch (err) {
    console.error(`[worker] Error procesando ${phone}:`, err.message);
    await markAsFailed(supabase, messages, err.message);
    throw err;
  }
}

// =============================================================
// executeAction — procesa tags como [REGISTER] o [ESCALAR]
// =============================================================
async function executeAction(supabase, action, phone, paciente) {
  if (action.type === "register" && !paciente) {
    // Crear nuevo paciente con datos capturados por Claude
    await supabase.from("pacientes").insert({
      nombre: action.nombre,
      rut: action.rut,
      telefono: phone,
      notas_clinicas: `Captado por Aukén WhatsApp. Comuna: ${action.comuna}`,
      fecha_ultima_visita: new Date().toISOString().split("T")[0],
      tags: ["lead-whatsapp", "operativo"],
    });
  }

  if (action.type === "escalate") {
    // Marcar conversación como escalada
    await supabase
      .from("conversaciones")
      .update({
        status: "escalated",
        escalated_to: process.env.ESCALATION_PHONE || "+56954932802",
      })
      .eq("phone", phone)
      .eq("status", "active");

    // Notificar al humano (el dueño de la óptica)
    const escalationPhone = process.env.ESCALATION_PHONE;
    if (escalationPhone && WHATSAPP_TOKEN) {
      await sendWhatsAppMessage(
        escalationPhone.replace(/\D/g, ""),
        `🚨 Aukén derivó una consulta al humano. Paciente: ${paciente?.nombre || phone}. Revisa el dashboard.`
      ).catch(() => {});
    }
  }

  if (action.type === "book" && paciente) {
    await supabase.from("citas").insert({
      paciente_id: paciente.id,
      servicio: action.servicio,
      fecha: action.fecha,
      hora: action.hora,
      origen: "whatsapp-bot",
      estado: "pendiente_confirmacion",
    }).then(({ error }) => {
      if (error) console.warn("[worker] No se creó la cita:", error.message);
    });
  }
}

// =============================================================
// sendWhatsAppMessage — envía mensaje vía Meta Cloud API
// =============================================================
async function sendWhatsAppMessage(toPhone, text) {
  const cleanPhone = String(toPhone).replace(/\D/g, "");

  const response = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: text },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Meta API: ${data?.error?.message || "send failed"}`);
  }
  return data;
}

// =============================================================
// markAsDone / markAsFailed — actualizan estado en la cola
// =============================================================
async function markAsDone(supabase, messages) {
  const ids = messages.map(m => m.id);
  await supabase
    .from("message_queue")
    .update({ status: "done", processed_at: new Date().toISOString() })
    .in("id", ids);
}

async function markAsFailed(supabase, messages, errorMessage) {
  const ids = messages.map(m => m.id);
  // Si excedió intentos, marcar 'failed'. Si no, dejar 'pending' para retry.
  for (const msg of messages) {
    const newStatus = msg.attempts >= 3 ? "failed" : "pending";
    await supabase
      .from("message_queue")
      .update({
        status: newStatus,
        error_message: errorMessage.slice(0, 500),
      })
      .eq("id", msg.id);
  }
}
