import { useState, useEffect, useRef, useCallback } from "react";

import { supabase } from "../lib/supabase";
import { useConversation } from "../lib/useConversation";

function dbToPatient(row) {
  if (!row.fecha_proximo_control) {
    return {
      id: row.id, rut: row.rut, name: row.nombre, age: row.edad, phone: row.telefono,
      lastVisit: row.fecha_ultima_visita || "Nunca", nextControl: "Pendiente",
      receta: {
        fecha: "—",
        od: { esf: row.od_esfera, cil: row.od_cilindro, eje: row.od_eje || "—", av: row.od_av },
        oi: { esf: row.oi_esfera, cil: row.oi_cilindro, eje: row.oi_eje || "—", av: row.oi_av },
        adicion: row.adicion, dp: row.dp, tipo: row.tipo_lente,
        notas: row.notas_clinicas, optometrista: row.optometrista,
      },
      historial: [], producto: row.producto_actual, estado: "nuevo", alertas: ["Sin receta registrada"],
    };
  }

  const hoy = new Date();
  const control = new Date(row.fecha_proximo_control);
  const dias = Math.round((control - hoy) / (1000 * 60 * 60 * 24));
  const estado = dias < 0 ? "vencida" : dias <= 30 ? "proxima" : "vigente";
  const alertas = [];
  if (estado === "vencida") alertas.push("Receta vencida");
  if (estado === "proxima") alertas.push("Control pronto");
  
  return {
    id: row.id, rut: row.rut, name: row.nombre, age: row.edad, phone: row.telefono,
    lastVisit: row.fecha_ultima_visita, nextControl: row.fecha_proximo_control,
    receta: {
      fecha: row.fecha_ultima_visita ? new Date(row.fecha_ultima_visita).toLocaleDateString("es-CL") : "—",
      od: { esf: row.od_esfera, cil: row.od_cilindro, eje: row.od_eje || "—", av: row.od_av },
      oi: { esf: row.oi_esfera, cil: row.oi_cilindro, eje: row.oi_eje || "—", av: row.oi_av },
      adicion: row.adicion, dp: row.dp, tipo: row.tipo_lente,
      notas: row.notas_clinicas, optometrista: row.optometrista,
    },
    historial: [], producto: row.producto_actual, estado, alertas,
  };
}

// ─────────────────────────────────────────────────────────────────
// PALETA Y CONSTANTES
// ─────────────────────────────────────────────────────────────────
const C = {
  bg:         "#07080C",
  bgDeep:     "#030406",
  surface:    "#0E111A",
  surfaceL:   "#151926",
  border:     "#1C2230",
  borderDark: "#38BDF820",
  ink:        "#F1F5F9",
  inkMid:     "#64748B",
  inkFaint:   "#334155",
  blue:       "#0EA5E9",
  blueLight:  "#38BDF8",
  blueGhost:  "#0EA5E910",
  teal:       "#14B8A6",
  tealLight:  "#14B8A615",
  amber:      "#F59E0B",
  amberLight: "#F59E0B15",
  red:        "#EF4444",
  redLight:   "#EF444415",
  green:      "#10B981",
  greenLight: "#10B98115",
  glass:      "rgba(14, 17, 26, 0.8)",
};

// ─────────────────────────────────────────────────────────────────
// DATOS REALES — se cargan desde Supabase en PanelFichas
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPT PARA CLAUDE
// ─────────────────────────────────────────────────────────────────
const buildSystemPrompt = (patient, opticaName = "Aukén") => {
  const p = patient;
  const hasPatient = !!p;
  const recetaVencida = p?.estado === "vencida";
  const proximoControl = p?.estado === "proxima";

  const fichaSection = hasPatient ? `
=== FICHA DEL PACIENTE IDENTIFICADO ===
Nombre: ${p.name} | RUT: ${p.rut} | Edad: ${p.age} años
Último control: ${p.lastVisit || "Sin registros previos"} | Próximo control: ${p.nextControl || "Pendiente agendar"}
Producto actual: ${p.producto || "No registrado"}
Estado receta: ${p.estado === "vencida" ? "VENCIDA" : p.estado === "proxima" ? "PRÓXIMA A VENCER" : p.estado === "vigente" ? "VIGENTE" : "SIN RECETA"}
Alertas: ${p.alertas.join(", ") || "Ninguna"}

${p.receta.od.esf || p.receta.od.cil ? `
RECETA ÓPTICA (${p.receta.fecha}):
- OD: esf ${p.receta.od.esf} | cil ${p.receta.od.cil} | eje ${p.receta.od.eje} | AV ${p.receta.od.av}
- OI: esf ${p.receta.oi.esf} | cil ${p.receta.oi.cil} | eje ${p.receta.oi.eje} | AV ${p.receta.oi.av}
${p.receta.adicion ? `- Adición: ${p.receta.adicion}` : ""}
- DP: ${p.receta.dp} | Tipo: ${p.receta.tipo}
- Notas: ${p.receta.notas}
` : "NO HAY RECETA REGISTRADA PARA ESTE PACIENTE."}
======================================
` : "";

  const alertSection = recetaVencida
    ? `INSTRUCCIÓN: Este paciente tiene la receta VENCIDA. Menciona amablemente que su receta del ${p?.receta.fecha} ha vencido y recomienda agendar un control.`
    : proximoControl
    ? `INSTRUCCIÓN: El control de este paciente se aproxima (${p?.nextControl}). Menciona que se acerca la fecha.`
    : !p?.receta.od.esf && hasPatient
    ? `INSTRUCCIÓN CRÍTICA: Este paciente NO TIENE RECETA registrada. Dile cortésmente: "Aún no tenemos una receta registrada a tu nombre en ${opticaName}, por lo que te recomendamos agendar un examen visual con nosotros para emitir tu primera ficha."`
    : "";

  return `Eres "Aukén", el asistente virtual de ${opticaName}.
  
Personalidad: Cálido, preciso y confiable. Hablas de forma persuasiva.

Servicios disponibles:
- Examen visual computarizado: GRATIS al comprar lentes
- Lentes monofocales desde: $45.000
- Lentes multifocales progresivos desde: $180.000

Horarios: Lunes a Viernes 11:30–18:30
Dirección: Gestión centralizada por Aukén.
WhatsApp: Contacto directo desde el monitor.

${fichaSection}
${alertSection}

Reglas:
1. Si el usuario se identifica por nombre o RUT y está en la ficha, úsala para personalizar.
2. Explica los valores de receta solo si te lo piden, sin jerga innecesaria.
3. Si alguien pregunta "¿cuándo fue mi última visita?" o "¿cuál es mi receta?", responde con los datos de la ficha.
4. Para agendamiento de operativos pide: nombre, rut y comuna.
5. Respuestas: máximo 3 oraciones. Siempre termina con una acción concreta.
6. Nunca inventes precios ni servicios que no estén listados.`;
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const mkMsg = (role, content, meta = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role, content, meta,
  ts: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
});

function findPatient(text, patientsList = []) {
  const normalized = text.toLowerCase().replace(/\s/g, "").replace(/[.\-]/g, "");
  return patientsList.find(p => {
    const rutClean = p.rut.replace(/[.\-]/g, "").toLowerCase();
    const nameLower = p.name.toLowerCase();
    return normalized.includes(rutClean) ||
      nameLower.split(" ").some(w => w.length > 3 && normalized.includes(w));
  }) || null;
}

function daysBetween(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────
function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      background: bg, color, border: `1px solid ${border || "transparent"}`,
      borderRadius: 20, padding: "3px 10px", fontSize: 11,
      fontFamily: "'Inter', sans-serif", fontWeight: 700,
      letterSpacing: "0.02em", textTransform: "uppercase"
    }}>{label}</span>
  );
}

function StatePill({ estado }) {
  const map = {
    vigente:  { label: "Vigente",      color: C.green,  bg: C.greenLight },
    proxima:  { label: "Control pronto", color: C.amber,  bg: C.amberLight },
    vencida:  { label: "Vencida",      color: C.red,    bg: C.redLight   },
    nuevo:    { label: "Sin Ficha",    color: C.blue,   bg: C.blueGhost  },
  };
  const s = map[estado] || map.nuevo;
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ fontSize: 14, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FICHA CARD — vista colapsable
// ─────────────────────────────────────────────────────────────────
function FichaCard({ patient }) {
  const p = patient;
  const isNew = p.estado === "nuevo";

  return (
    <div style={{
      background: C.surface, borderRadius: 24, padding: 20,
      border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
    }}>
      <div style={{ display: "flex", gap: 15, alignItems: "center", marginBottom: 15 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
          {p.name[0]}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{p.name}</div>
          <div style={{ fontSize: 12, color: C.inkMid }}>{p.rut} · {p.age} años</div>
        </div>
      </div>

      {!isNew ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: C.bgDeep, borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 10, color: C.inkMid, marginBottom: 4 }}>OD</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.receta.od.esf} | {p.receta.od.cil}</div>
          </div>
          <div style={{ background: C.bgDeep, borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 10, color: C.inkMid, marginBottom: 4 }}>OI</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.receta.oi.esf} | {p.receta.oi.cil}</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "10px 0", color: C.blue, fontSize: 13, fontWeight: 500 }}>
          ✨ Listo para su primera atención
        </div>
      )}
    </div>
  );
}

function ReminderCard({ patient }) {
  const p = patient;
  const isVencida = p.estado === "vencida";

  return (
    <div style={{
      background: isVencida ? C.redLight : C.blueGhost,
      borderRadius: 24, padding: 20, border: `1px solid ${isVencida ? C.red + "30" : C.blue + "30"}`
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: isVencida ? C.red : C.blue, marginBottom: 5 }}>
        {isVencida ? "Alerta de Salud Visual" : "Seguimiento Preventivo"}
      </div>
      <p style={{ fontSize: 14, color: C.inkMid, lineHeight: 1.5, margin: "0 0 15px 0" }}>
        {isVencida 
          ? `La receta de ${p.name.split(" ")[0]} expiró el ${p.nextControl}. Es crítico agendar un control.`
          : `Se aproxima el control de ${p.name.split(" ")[0]}. Mantén el contacto para asegurar su visita.`}
      </p>
      <button style={{ 
        width: "100%", padding: "12px", borderRadius: 16, border: "none", 
        background: isVencida ? C.red : C.blue, color: "#fff", 
        fontSize: 13, fontWeight: 700, cursor: "pointer" 
      }}>
        Agendar ahora
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MENSAJE BURBUJA
// ─────────────────────────────────────────────────────────────────
function Bubble({ msg, isLast }) {
  const isBot = msg.role === "assistant";
  const isCard = msg.role === "card";

  if (isCard) return (
    <div style={{ margin: "15px 0", animation: isLast ? "slideUp .3s ease" : "none" }}>
      {msg.meta?.type === "ficha" && <FichaCard patient={msg.meta.patient} />}
      {msg.meta?.type === "reminder" && <ReminderCard patient={msg.meta.patient} />}
    </div>
  );

  return (
    <div style={{
      display: "flex", gap: 10,
      justifyContent: isBot ? "flex-start" : "flex-end",
      alignItems: "flex-end",
      animation: isLast ? "slideUp .25s ease" : "none",
      margin: "4px 0"
    }}>
      {isBot && (
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          boxShadow: `0 4px 10px ${C.blue}30`
        }}>👁️</div>
      )}
      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 2, alignItems: isBot ? "flex-start" : "flex-end" }}>
        <div style={{
          padding: "12px 16px",
          borderRadius: isBot ? "4px 20px 20px 20px" : "20px 4px 20px 20px",
          background: isBot ? C.surface : C.blue,
          color: isBot ? C.ink : "#fff",
          fontSize: 14, lineHeight: 1.5,
          border: isBot ? `1px solid ${C.border}` : "none",
          fontFamily: "'Inter', sans-serif",
          boxShadow: isBot ? "0 2px 5px rgba(0,0,0,0.1)" : `0 4px 15px ${C.blue}40`,
          whiteSpace: "pre-wrap"
        }}>
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
          {msg.ts}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TYPING
// ─────────────────────────────────────────────────────────────────
function Typing() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👁️</div>
      <div style={{ padding: "10px 14px", background: C.surface, borderRadius: "3px 14px 14px 14px", border: `1px solid ${C.border}`, display: "flex", gap: 4, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.blue, opacity: 0.5, animation: "dot 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PANEL LATERAL — gestión de fichas (vista óptica/dueño)
// ─────────────────────────────────────────────────────────────────
function PanelFichas({ onSelectPatient, activePatient }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    supabase.from("pacientes").select("*").order("nombre")
      .then(({ data, error }) => {
        if (!error && data) setPatients(data.map(dbToPatient));
      });
  }, []);

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.rut.includes(search);
    const matchFilter = filter === "all" || p.estado === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bgDeep }}>
      <div style={{ padding: "24px 20px 16px" }}>
        <h3 style={{ fontSize: 12, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 15 }}>Pacientes</h3>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          style={{ 
            width: "100%", background: C.surface, border: `1px solid ${C.border}`, 
            borderRadius: 14, padding: "10px 16px", fontSize: 13, color: C.ink, 
            outline: "none", transition: "all 0.2s" 
          }} 
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 20px" }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => onSelectPatient(p)} style={{
            padding: "16px 20px", borderRadius: 20, marginBottom: 8, cursor: "pointer",
            background: activePatient?.id === p.id ? C.surfaceL : "transparent",
            border: `1px solid ${activePatient?.id === p.id ? C.blue + "30" : "transparent"}`,
            transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{p.name}</span>
              <div style={{ 
                width: 7, height: 7, borderRadius: "50%", 
                background: p.estado === "vencida" ? C.red : p.estado === "proxima" ? C.amber : C.blue,
                boxShadow: `0 0 10px ${p.estado === "vencida" ? C.red : p.estado === "proxima" ? C.amber : C.blue}80`
              }} />
            </div>
            <div style={{ fontSize: 11, color: C.inkMid }}>RUT: {p.rut}</div>
            {p.alertas.length > 0 && (
              <div style={{ 
                fontSize: 10, marginTop: 10, padding: "4px 8px", borderRadius: 8,
                background: p.estado === "vencida" ? C.redLight : C.amberLight,
                color: p.estado === "vencida" ? C.red : C.amber,
                fontWeight: 600, display: "inline-block"
              }}>
                {p.alertas[0]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHAT PRINCIPAL
// ─────────────────────────────────────────────────────────────────
function Chat({ activePatient, allPatients = [], opticaName = "Aukén" }) {
  const WELCOME = activePatient
    ? `¡Hola, ${activePatient.name.split(" ")[0]}! Bienvenido/a de vuelta a ${opticaName}. ${activePatient.estado === "vencida" ? "Vi que tu receta del " + activePatient.receta.fecha + " está vencida — te recomiendo agendar un control pronto. " : activePatient.estado === "proxima" ? "Tu próximo control se acerca (" + activePatient.nextControl + "). " : ""}¿En qué te puedo ayudar hoy?`
    : `¡Hola! Soy Aukén, el asistente de ${opticaName}. Puedo ayudarte con tu receta, agendar un control o responder tus dudas. Si eres paciente nuestro, dime tu nombre o RUT y accedo a tu ficha. ¿Cómo te llamo?`;

  const { messages: historicMessages, conversacionId } = useConversation({
    pacienteId: activePatient?.id,
    phone: activePatient?.telefono,
    canal: "whatsapp",
  });

  const [messages, setMessages] = useState([mkMsg("assistant", WELCOME)]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [detectedPatient, setDetectedPatient] = useState(activePatient || null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Sincronizar mensajes históricos y Realtime
  useEffect(() => {
    if (historicMessages && historicMessages.length > 0) {
      setMessages(historicMessages);
    } else {
      setMessages([mkMsg("assistant", WELCOME)]);
    }
  }, [activePatient?.id, historicMessages, WELCOME]);

  // Reset al cambiar paciente activo
  useEffect(() => {
    setDetectedPatient(activePatient);
    setInput("");
    setLoading(false);
  }, [activePatient?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const QUICK = activePatient
    ? ["📋 Ver mi receta", "📅 Agendar control", "💰 Precios lentes", "⏰ Horarios"]
    : ["📋 Buscar mi receta", "📅 Agendar hora", "💰 Ver precios", "❓ ¿Qué hacen?"];

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    const txt = text.trim();
    setInput("");
    setLoading(true);

    const userMsg = mkMsg("user", txt);
    setMessages(prev => [...prev, userMsg]);

    // Detectar paciente por RUT o nombre en el texto
    let patient = detectedPatient;
    if (!patient) {
      const found = findPatient(txt, allPatients);
      if (found) {
        patient = found;
        setDetectedPatient(found);
        // Inyectar ficha + reminder si aplica
        setTimeout(() => {
          setMessages(prev => [...prev, mkMsg("card", "", { type: "ficha", patient: found })]);
          if (found.estado !== "vigente") {
            setTimeout(() => {
              setMessages(prev => [...prev, mkMsg("card", "", { type: "reminder", patient: found })]);
            }, 400);
          }
        }, 300);
      }
    }

    // Detectar intención de ver receta
    const recetaTriggers = ["receta", "graduación", "graduacion", "valores", "mi receta", "ver ficha"];
    if (recetaTriggers.some(t => txt.toLowerCase().includes(t)) && patient && !detectedPatient) {
      // Ya se inyecta arriba
    }

    try {
      const history = [...messages, userMsg]
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1000,
          system: buildSystemPrompt(detectedPatient || activePatient || null, opticaName),
          messages: history,
        }),
      });
      const data = await response.json();

      if (data.error) {
        console.error("API error:", data.error);
        setMessages(prev => [...prev, mkMsg("assistant",
          "Disculpa, tuve un problema técnico. Llámanos al +56 9 8765 4321.")]);
      } else {
        const reply = data.content?.map(b => b.text || "").join("") ||
          "Disculpa, no pude procesar tu consulta. Llámanos al +56 9 8765 4321.";
        setMessages(prev => [...prev, mkMsg("assistant", reply)]);
      }
    } catch (err) {
      console.error("Chat fetch error:", err);
      setMessages(prev => [...prev, mkMsg("assistant",
        "Tuve un problema de conexión. Puedes llamarnos al +56 9 8765 4321 o venir a Av. Italia 1456.")]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading, detectedPatient]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      {/* Chat header */}
      <div style={{ background: C.blue, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          👁️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16 }}>
            Aukén — Monitor de Chat Live
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 4px #4ADE80" }} />
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace" }}>
              {detectedPatient ? `Paciente: ${detectedPatient.name}` : "En línea · responde al instante"}
            </span>
          </div>
        </div>
        {detectedPatient && (
          <StatePill estado={detectedPatient.estado} />
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10, background: C.bgDeep }}>
        {/* Separador fecha */}
        <Divider label={new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} />

        {messages.map((msg, i) => (
          <Bubble key={msg.id} msg={msg} isLast={i === messages.length - 1 && !loading} />
        ))}
        {loading && <Typing />}
      </div>

      {/* Quick replies */}
      {messages.length <= 2 && (
        <div style={{ padding: "8px 12px 0", background: C.bg, display: "flex", gap: 5, flexWrap: "wrap", borderTop: `1px solid ${C.border}` }}>
          {QUICK.map(r => (
            <button key={r} onClick={() => sendMessage(r)} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "5px 11px",
              color: C.inkMid, fontSize: 15, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              transition: "all .15s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = C.blue; e.target.style.color = C.blue; }}
              onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.inkMid; }}>
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 12px", background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder={detectedPatient ? `Tomar el control del chat y escribir a ${detectedPatient.name.split(" ")[0]}...` : "Escribe tu consulta..."}
          disabled={loading}
          style={{ flex: 1, background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 15, color: C.ink, outline: "none", fontFamily: "'Inter', sans-serif", opacity: loading ? 0.6 : 1 }}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
          style={{ background: input.trim() && !loading ? C.amber : C.bgDeep, color: input.trim() && !loading ? "#000" : C.inkFaint, border: "none", borderRadius: 8, padding: "0 16px", cursor: input.trim() && !loading ? "pointer" : "default", fontSize: 15, fontWeight: 700, transition: "all .2s", flexShrink: 0 }}>
          {loading ? "..." : "Interrumpir IA"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "5px", background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 9, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
          powered by <span style={{ color: C.inkMid }}>AUKÉN sistemas</span>
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROOT — layout split panel
// ─────────────────────────────────────────────────────────────────
export default function AukenOptica() {
  const [opticaData, setOpticaData] = useState(() => {
    const saved = localStorage.getItem("auken_config");
    return saved ? JSON.parse(saved) : { name: "Aukén", city: "Chile" };
  });
  const [activePatient, setActivePatient] = useState(null);
  const [view, setView] = useState("split"); // split | chat | fichas
  const [allPatients, setAllPatients] = useState([]);

  // Cargar pacientes de Supabase una vez al montar
  useEffect(() => {
    supabase.from("pacientes").select("*").order("nombre")
      .then(({ data, error }) => {
        if (!error && data) {
          // Filtrar usuarios que parecen de prueba para una vista limpia
          const testNames = ["ismael", "juanito", "irribarren", "loco dani", "test"];
          const cleanData = data.filter(p => 
            !testNames.some(t => p.nombre?.toLowerCase().includes(t))
          );
          setAllPatients(cleanData.map(dbToPatient));
        }
      });
  }, []);

  const alertCount = allPatients.filter(p => p.alertas.length > 0).length;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
      `}</style>

      {/* Header — Estilo Glass */}
      <header style={{ 
        height: 60, background: C.glass, backdropFilter: "blur(12px)", 
        borderBottom: `1px solid ${C.border}`, display: "flex", 
        alignItems: "center", justifyContent: "space-between", padding: "0 24px",
        position: "sticky", top: 0, zIndex: 100 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: C.blue, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${C.blue}40` }}>👁️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>{opticaData.name}</h1>
            <span style={{ fontSize: 10, color: C.amber, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Monitor IA Activo</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {["split", "chat", "fichas"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: view === v ? C.blue : C.surfaceL,
              color: view === v ? "#fff" : C.inkMid,
              fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}>{v.toUpperCase()}</button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar — Pacientes */}
        {(view === "split" || view === "fichas") && (
          <aside style={{ width: 320, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.bgDeep, flexShrink: 0 }}>
            <PanelFichas onSelectPatient={setActivePatient} activePatient={activePatient} />
          </aside>
        )}

        {/* Contenido Principal */}
        <section style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          {/* Chat */}
          {(view === "split" || view === "chat") && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: view === "split" ? `1px solid ${C.border}` : "none" }}>
              <Chat activePatient={activePatient} allPatients={allPatients} opticaName={opticaData.name} key={activePatient?.id || "no-patient"} />
            </div>
          )}

          {/* Ficha Detallada (Vista Lateral) */}
          {(view === "split" || view === "fichas") && activePatient && (
            <div style={{ width: 400, background: C.bgDeep, overflowY: "auto", padding: 24, animation: "slideUp 0.3s ease", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Ficha Técnica</h2>
                <Badge label={activePatient.estado} color={activePatient.estado === "vencida" ? C.red : C.blue} bg={activePatient.estado === "vencida" ? C.redLight : C.blueGhost} />
              </div>
              
              <div style={{ background: C.surface, borderRadius: 24, padding: 24, marginBottom: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 15 }}>Última Receta</div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 20 }}>
                  <div style={{ background: C.bgDeep, borderRadius: 16, padding: 15 }}>
                    <div style={{ fontSize: 10, color: C.inkMid, marginBottom: 5 }}>Ojo Derecho</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{activePatient.receta.od.esf} | {activePatient.receta.od.cil}</div>
                    <div style={{ fontSize: 11, color: C.inkMid, marginTop: 4 }}>Eje: {activePatient.receta.od.eje}</div>
                  </div>
                  <div style={{ background: C.bgDeep, borderRadius: 16, padding: 15 }}>
                    <div style={{ fontSize: 10, color: C.inkMid, marginBottom: 5 }}>Ojo Izquierdo</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{activePatient.receta.oi.esf} | {activePatient.receta.oi.cil}</div>
                    <div style={{ fontSize: 11, color: C.inkMid, marginTop: 4 }}>Eje: {activePatient.receta.oi.eje}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.inkMid }}>Tipo:</span>
                    <span style={{ fontWeight: 600 }}>{activePatient.receta.tipo || "Multifocal"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.inkMid }}>Próximo Control:</span>
                    <span style={{ fontWeight: 600, color: activePatient.estado === "vencida" ? C.red : C.ink }}>{activePatient.nextControl}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: C.surface, borderRadius: 24, padding: 24, marginBottom: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 15 }}>Estado del Lead</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  {[1, 2, 3, 4].map(step => (
                    <div key={step} style={{ 
                      flex: 1, height: 4, borderRadius: 2, 
                      background: step <= (activePatient.estado === "vencida" ? 2 : 1) ? C.blue : C.border 
                    }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                   <div style={{ fontSize: 24 }}>{activePatient.estado === "vencida" ? "🔥" : "🧊"}</div>
                   <div>
                     <div style={{ fontSize: 13, fontWeight: 700 }}>{activePatient.estado === "vencida" ? "Prioridad Alta" : "Prospecto Nuevo"}</div>
                     <div style={{ fontSize: 11, color: C.inkMid }}>{activePatient.estado === "vencida" ? "Receta expirada: Intención de compra alta" : "Recién ingresado al sistema"}</div>
                   </div>
                </div>
              </div>

              <div style={{ background: C.surface, borderRadius: 24, padding: 24, marginBottom: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 15 }}>Línea de Tiempo</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  {[
                    { t: "Hoy", e: "Consulta vía WhatsApp", i: "💬" },
                    { t: activePatient.receta.fecha, e: "Última compra / Control", i: "🛒" }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 12, position: "relative" }}>
                      <div style={{ fontSize: 14, background: C.bgDeep, width: 24, height: 24, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>{item.i}</div>
                      {idx === 0 && <div style={{ position: "absolute", left: 11, top: 24, bottom: -15, width: 2, background: C.border }} />}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.e}</div>
                        <div style={{ fontSize: 10, color: C.inkMid }}>{item.t}</div>
                      </div>
                    </div>
                  ))}
              <div style={{ background: C.surface, borderRadius: 24, padding: 24, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 15 }}>Acciones de Conversión</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button style={{ padding: "14px", borderRadius: 16, background: C.blue, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                    📅 Agendar Examen Gratis
                  </button>
                  <button style={{ padding: "14px", borderRadius: 16, background: C.surfaceL, color: C.ink, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    💬 Enviar Oferta WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
  );
}
