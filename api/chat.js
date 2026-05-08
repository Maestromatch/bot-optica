// =============================================================
// AUKÉN — Chat endpoint (widget web y dashboard interno)
// =============================================================
// Usa Claude API directo (no Groq) y persiste cada conversación
// en Supabase para que sobreviva recargas y se pueda auditar.
// =============================================================

import { getSupabaseAdmin } from "../src/lib/supabase-admin.js";
import { callClaude, MODELS, logApiCall } from "../src/lib/anthropic.js";
import { buildSystemPrompt, parseSpecialTags, getEstadoReceta } from "../src/lib/prompts.js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      messages = [],
      system,
      pacienteId,
      pacienteRut,
      phone = "web-anonymous",
      sessionId,
      canal = "web",
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages requerido" });
    }

    const supabase = getSupabaseAdmin();

    // ───────── 1. Cargar paciente si tenemos identificador ─────────
    let paciente = null;
    if (pacienteId) {
      const { data } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", pacienteId)
        .maybeSingle();
      paciente = data;
    } else if (pacienteRut) {
      const { data } = await supabase
        .from("pacientes")
        .select("*")
        .eq("rut", pacienteRut)
        .maybeSingle();
      paciente = data;
    }

    if (paciente) {
      paciente.estado_receta = getEstadoReceta(paciente.fecha_ultima_visita);
    }

    // ───────── 2. Construir system prompt ─────────
    // Si el cliente envía un system custom, lo respetamos.
    // Si no, usamos el builder estándar.
    const systemPrompt = system || buildSystemPrompt(paciente, canal);

    // ───────── 3. Llamar a Claude ─────────
    const claude = await callClaude({
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      model: MODELS.CHAT,
      maxTokens: 800,
      temperature: 0.7,
    });

    const { cleanText, actions } = parseSpecialTags(claude.text);

    // ───────── 4. Persistir en conversaciones (best-effort) ─────────
    let conversacionId = null;
    try {
      // Solo el último mensaje del usuario (los anteriores ya están guardados)
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === "user") {
        await supabase.rpc("append_message_to_conversation", {
          p_phone: phone,
          p_canal: canal,
          p_role: "user",
          p_content: lastUserMsg.content,
          p_meta: { sessionId },
        });
      }

      const { data: cid } = await supabase.rpc("append_message_to_conversation", {
        p_phone: phone,
        p_canal: canal,
        p_role: "assistant",
        p_content: cleanText,
        p_meta: { sessionId, actions, model: MODELS.CHAT },
      });
      conversacionId = cid;
    } catch (err) {
      console.warn("[chat] No se pudo persistir conversación:", err.message);
      // No es bloqueante. Seguimos.
    }

    // ───────── 5. Ejecutar acciones especiales (REGISTER, ESCALAR) ─────────
    for (const action of actions) {
      await executeWebAction(supabase, action, phone, paciente).catch(err =>
        console.warn(`[chat] Acción ${action.type} falló:`, err.message)
      );
    }

    // ───────── 6. Log de costos (no bloquea respuesta) ─────────
    logApiCall(supabase, {
      opticaId: paciente?.optica_id,
      conversacionId,
      model: MODELS.CHAT,
      usage: claude.usage,
      costUsd: claude.costUsd,
      latencyMs: claude.latencyMs,
    });

    // ───────── 7. Responder en formato compatible ─────────
    return res.status(200).json({
      content: [{ type: "text", text: cleanText }],
      actions,
      usage: claude.usage,
      conversacionId,
    });

  } catch (err) {
    console.error("[chat] Error:", err.message, err.stack);
    return res.status(500).json({
      error: err.message || "Error interno del chat",
      content: [{
        type: "text",
        text: "Disculpa, tuve un problema técnico. Puedes llamarnos al +56 9 5493 2802."
      }],
    });
  }
}

async function executeWebAction(supabase, action, phone, paciente) {
  if (action.type === "register" && !paciente) {
    await supabase.from("pacientes").insert({
      nombre: action.nombre,
      rut: action.rut,
      telefono: phone !== "web-anonymous" ? phone : null,
      notas_clinicas: `Captado por chat web. Comuna: ${action.comuna}`,
      fecha_ultima_visita: new Date().toISOString().split("T")[0],
      tags: ["lead-web"],
    });
  }

  if (action.type === "escalate") {
    if (phone !== "web-anonymous") {
      await supabase
        .from("conversaciones")
        .update({ status: "escalated" })
        .eq("phone", phone)
        .eq("status", "active");
    }
  }
}
