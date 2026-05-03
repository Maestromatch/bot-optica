import { useState, useEffect, useRef, useCallback } from "react";

import { supabase } from "../lib/supabase";

function dbToPatient(row) {
  const hoy = new Date();
  const control = new Date(row.fecha_proximo_control);
  const dias = Math.round((control - hoy) / (1000 * 60 * 60 * 24));
  const estado = dias < 0 ? "vencida" : dias <= 30 ? "proxima" : "vigente";
  const alertas = [];
  if (estado === "vencida") alertas.push("Receta vencida hace " + Math.abs(dias) + " dias");
  if (estado === "proxima") alertas.push("Control en " + dias + " dias");
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
  bg:        "#F7F5F0",
  bgDeep:    "#EFECE5",
  surface:   "#FFFFFF",
  border:    "#D8D4CB",
  borderDark:"#B8B2A7",
  ink:       "#1A1612",
  inkMid:    "#4A4540",
  inkFaint:  "#8A8580",
  blue:      "#1B3A6B",
  blueLight: "#2B5BA8",
  blueGhost: "#E8EEF7",
  teal:      "#0D6E6E",
  tealLight: "#E0F2F2",
  amber:     "#B45309",
  amberLight:"#FEF3C7",
  red:       "#991B1B",
  redLight:  "#FEE2E2",
  green:     "#166534",
  greenLight:"#DCFCE7",
};

// ─────────────────────────────────────────────────────────────────
// DATOS MOCK — FICHAS DE PACIENTES
// ─────────────────────────────────────────────────────────────────
const PATIENTS_DB = [
  {
    id: "p001", rut: "12.345.678-9",
    name: "María González", age: 42, phone: "+56912345678",
    lastVisit: "2024-08-14",
    nextControl: "2025-08-14",
    receta: {
      fecha: "14 Agosto 2024",
      od: { esf: "-2.50", cil: "-0.75", eje: "180°", av: "10/10" },
      oi: { esf: "-3.00", cil: "-1.00", eje: "175°", av: "10/10" },
      adicion: "+1.50",
      dp: "62mm",
      tipo: "Multifocal progresivo",
      notas: "Uso prolongado de pantallas. Recomendar filtro azul.",
      optometrista: "Dra. Valeria Rojas",
    },
    historial: [
      { fecha: "2023-02-10", motivo: "Control anual", cambio: "Aumento de -0.25 en OD" },
      { fecha: "2022-01-20", motivo: "Primera consulta", cambio: "Diagnóstico inicial miopía bilateral" },
    ],
    producto: "Hoya Hilux 1.67 Antirreflex",
    estado: "vencida", // proxima | vigente | vencida
    alertas: ["Receta vencida hace 3 meses", "Control pendiente"],
  },
  {
    id: "p002", rut: "8.901.234-5",
    name: "Carlos Méndez", age: 67, phone: "+56987654321",
    lastVisit: "2025-01-20",
    nextControl: "2025-07-20",
    receta: {
      fecha: "20 Enero 2025",
      od: { esf: "+1.75", cil: "-0.50", eje: "90°", av: "9/10" },
      oi: { esf: "+2.00", cil: "-0.75", eje: "85°", av: "9/10" },
      adicion: "+2.50",
      dp: "64mm",
      tipo: "Bifocal",
      notas: "Presbicia avanzada. Derivar a oftalmólogo si persisten molestias.",
      optometrista: "Dr. Patricio Vega",
    },
    historial: [
      { fecha: "2024-01-15", motivo: "Control anual", cambio: "Aumento adición a +2.50" },
      { fecha: "2023-01-08", motivo: "Control anual", cambio: "Primer diagnóstico presbicia" },
    ],
    producto: "Zeiss Bifocal Hardcoating",
    estado: "proxima",
    alertas: ["Control en 2 meses"],
  },
  {
    id: "p003", rut: "15.678.901-2",
    name: "Sofía Herrera", age: 28, phone: "+56955443322",
    lastVisit: "2025-03-05",
    nextControl: "2026-03-05",
    receta: {
      fecha: "5 Marzo 2025",
      od: { esf: "-1.00", cil: "0.00", eje: "—", av: "10/10" },
      oi: { esf: "-1.25", cil: "-0.25", eje: "165°", av: "10/10" },
      adicion: null,
      dp: "60mm",
      tipo: "Monofocal",
      notas: "Miopía leve. Sin urgencia de corrección permanente.",
      optometrista: "Dra. Valeria Rojas",
    },
    historial: [
      { fecha: "2024-03-01", motivo: "Primera consulta", cambio: "Diagnóstico miopía leve" },
    ],
    producto: "Essilor Crizal Prevencia 1.5",
    estado: "vigente",
    alertas: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPT PARA CLAUDE
// ─────────────────────────────────────────────────────────────────
const buildSystemPrompt = (patient) => {
  const p = patient;
  const hasPatient = !!p;
  const recetaVencida = p?.estado === "vencida";
  const proximoControl = p?.estado === "proxima";

  const fichaSection = hasPatient ? `
=== FICHA DEL PACIENTE IDENTIFICADO ===
Nombre: ${p.name} | RUT: ${p.rut} | Edad: ${p.age} años
Último control: ${p.lastVisit} | Próximo control: ${p.nextControl}
Producto actual: ${p.producto}
Estado receta: ${p.estado === "vencida" ? "VENCIDA" : p.estado === "proxima" ? "PRÓXIMA A VENCER" : "VIGENTE"}
Alertas: ${p.alertas.join(", ") || "Ninguna"}

RECETA ÓPTICA (${p.receta.fecha}):
- OD: esf ${p.receta.od.esf} | cil ${p.receta.od.cil} | eje ${p.receta.od.eje} | AV ${p.receta.od.av}
- OI: esf ${p.receta.oi.esf} | cil ${p.receta.oi.cil} | eje ${p.receta.oi.eje} | AV ${p.receta.oi.av}
${p.receta.adicion ? `- Adición: ${p.receta.adicion}` : ""}
- DP: ${p.receta.dp} | Tipo: ${p.receta.tipo}
- Notas clínicas: ${p.receta.notas}
- Optometrista: ${p.receta.optometrista}
======================================
` : "";

  const alertSection = recetaVencida
    ? `INSTRUCCIÓN IMPORTANTE: Este paciente tiene la receta VENCIDA. Al inicio de la conversación menciona amablemente que su receta del ${p?.receta.fecha} ha vencido y recomienda agendar un control. No seas insistente pero sí claro.`
    : proximoControl
    ? `INSTRUCCIÓN: El control de este paciente se aproxima (${p?.nextControl}). Menciona que se acerca la fecha de su próximo control.`
    : "";

  return `Eres "Lente", el asistente virtual de Óptica Visión Clara, una óptica profesional en Santiago de Chile.

Personalidad: Cálido, preciso y confiable. Hablas en español chileno natural. Eres experto en óptica sin ser condescendiente.

Servicios disponibles:
- Examen visual computarizado: $25.000
- Lentes monofocales desde: $45.000
- Lentes multifocales progresivos desde: $180.000
- Lentes de contacto: desde $35.000/mes
- Lentes de sol con medida: desde $95.000
- Reparaciones de marcos: desde $8.000

Horarios: Lunes a Viernes 9:30–19:30 · Sábado 10:00–14:00
Dirección: Av. Italia 1456, Providencia, Santiago
WhatsApp: +56 9 8765 4321

${fichaSection}
${alertSection}

Reglas:
1. Si el usuario se identifica por nombre o RUT y está en la ficha, úsala para personalizar.
2. Explica los valores de receta solo si te lo piden, sin jerga innecesaria.
3. Si alguien pregunta "¿cuándo fue mi última visita?" o "¿cuál es mi receta?", responde con los datos de la ficha.
4. Para agendamiento pide: nombre, servicio, y horario preferido.
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

function findPatient(text) {
  const normalized = text.toLowerCase().replace(/\s/g, "").replace(/[.\-]/g, "");
  return PATIENTS_DB.find(p => {
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
      background: bg, color, border: `1px solid ${border || color + "40"}`,
      borderRadius: 4, padding: "2px 7px", fontSize: 10,
      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500,
      letterSpacing: "0.04em",
    }}>{label}</span>
  );
}

function StatePill({ estado }) {
  const map = {
    vigente:  { label: "Vigente",      color: C.green,  bg: C.greenLight },
    proxima:  { label: "Próx. vencer", color: C.amber,  bg: C.amberLight },
    vencida:  { label: "Vencida",      color: C.red,    bg: C.redLight   },
  };
  const s = map[estado] || map.vigente;
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FICHA CARD — vista colapsable
// ─────────────────────────────────────────────────────────────────
function FichaCard({ patient, compact = false }) {
  const [open, setOpen] = useState(!compact);
  const p = patient;
  const days = daysBetween(p.nextControl);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, overflow: "hidden",
      borderLeft: `3px solid ${p.estado === "vencida" ? C.red : p.estado === "proxima" ? C.amber : C.blue}`,
    }}>
      {/* Header */}
      <div onClick={() => compact && setOpen(o => !o)}
        style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: compact ? "pointer" : "default", background: C.bgDeep }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'Playfair Display', serif", flexShrink: 0 }}>
            {p.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: "'Playfair Display', serif" }}>{p.name}</div>
            <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{p.rut} · {p.age} años</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatePill estado={p.estado} />
          {compact && <span style={{ fontSize: 10, color: C.inkFaint }}>{ open ? "▲" : "▼" }</span>}
        </div>
      </div>

      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Alertas */}
          {p.alertas.length > 0 && (
            <div style={{ background: p.estado === "vencida" ? C.redLight : C.amberLight, borderRadius: 6, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
              {p.alertas.map((a, i) => (
                <div key={i} style={{ fontSize: 11, color: p.estado === "vencida" ? C.red : C.amber, fontFamily: "'IBM Plex Mono', monospace", display: "flex", gap: 5 }}>
                  <span>⚠</span><span>{a}</span>
                </div>
              ))}
            </div>
          )}

          {/* Receta */}
          <div>
            <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Receta · {p.receta.fecha}</div>
            <div style={{ background: C.bgDeep, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                <thead>
                  <tr style={{ background: C.blue }}>
                    {["", "Esf.", "Cil.", "Eje", "AV"].map(h => (
                      <th key={h} style={{ padding: "5px 8px", color: "#fff", fontWeight: 500, textAlign: "center", fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[["OD", p.receta.od], ["OI", p.receta.oi]].map(([eye, vals]) => (
                    <tr key={eye} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "5px 8px", fontWeight: 700, color: C.blue, textAlign: "center" }}>{eye}</td>
                      {[vals.esf, vals.cil, vals.eje, vals.av].map((v, i) => (
                        <td key={i} style={{ padding: "5px 8px", color: C.ink, textAlign: "center" }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {p.receta.adicion && (
                <div style={{ padding: "5px 10px", fontSize: 10, color: C.inkMid, display: "flex", justifyContent: "space-between" }}>
                  <span>Adición: <strong>{p.receta.adicion}</strong></span>
                  <span>DP: <strong>{p.receta.dp}</strong></span>
                  <span>Tipo: <strong>{p.receta.tipo}</strong></span>
                </div>
              )}
            </div>
            {p.receta.notas && (
              <div style={{ marginTop: 5, fontSize: 10, color: C.inkMid, fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic", padding: "4px 6px", borderLeft: `2px solid ${C.blue}` }}>
                {p.receta.notas}
              </div>
            )}
          </div>

          {/* Control */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>Próximo control</div>
              <div style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>{p.nextControl}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
                {days < 0 ? `Hace ${Math.abs(days)} días` : `En ${days} días`}
              </div>
              <div style={{ fontSize: 11, color: C.inkMid }}>{p.producto}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// REMINDER CARD — se inyecta en el chat como tarjeta visual
// ─────────────────────────────────────────────────────────────────
function ReminderCard({ patient }) {
  const p = patient;
  const days = daysBetween(p.nextControl);
  const isVencida = p.estado === "vencida";

  return (
    <div style={{
      background: isVencida ? C.redLight : C.amberLight,
      border: `1px solid ${isVencida ? "#FCA5A5" : "#FCD34D"}`,
      borderRadius: 8, padding: "12px 14px",
      borderLeft: `4px solid ${isVencida ? C.red : C.amber}`,
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18 }}>{isVencida ? "📋" : "⏰"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isVencida ? C.red : C.amber, marginBottom: 3, fontFamily: "'Playfair Display', serif" }}>
            {isVencida ? "Receta vencida" : "Control próximo"}
          </div>
          <div style={{ fontSize: 11, color: C.inkMid, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5 }}>
            Última receta: <strong>{p.receta.fecha}</strong><br />
            Optometrista: {p.receta.optometrista}<br />
            Próximo control: <strong>{p.nextControl}</strong>
            {days < 0 && <span style={{ color: C.red }}> (hace {Math.abs(days)} días)</span>}
          </div>
          <button style={{
            marginTop: 8, background: isVencida ? C.red : C.amber,
            color: "#fff", border: "none", borderRadius: 5,
            padding: "6px 12px", fontSize: 11, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
          }}>
            Agendar control →
          </button>
        </div>
      </div>
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
    <div style={{ animation: isLast ? "slideUp .3s ease" : "none" }}>
      {msg.meta?.type === "ficha" && <FichaCard patient={msg.meta.patient} compact={false} />}
      {msg.meta?.type === "reminder" && <ReminderCard patient={msg.meta.patient} />}
    </div>
  );

  return (
    <div style={{
      display: "flex", gap: 8,
      justifyContent: isBot ? "flex-start" : "flex-end",
      alignItems: "flex-end",
      animation: isLast ? "slideUp .25s ease" : "none",
    }}>
      {isBot && (
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
        }}>👁️</div>
      )}
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 2, alignItems: isBot ? "flex-start" : "flex-end" }}>
        {isBot && (
          <span style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginLeft: 2 }}>
            Lente · {msg.ts}
          </span>
        )}
        <div style={{
          padding: "9px 13px",
          borderRadius: isBot ? "3px 14px 14px 14px" : "14px 3px 14px 14px",
          background: isBot ? C.surface : C.blue,
          color: isBot ? C.ink : "#fff",
          fontSize: 13, lineHeight: 1.6,
          border: isBot ? `1px solid ${C.border}` : "none",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: isBot ? "0 1px 4px rgba(0,0,0,.06)" : `0 2px 8px ${C.blue}50`,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        {!isBot && (
          <span style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginRight: 2 }}>
            {msg.ts}
          </span>
        )}
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
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>👁️</div>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("pacientes").select("*").order("nombre")
      .then(({ data, error }) => {
        if (!error && data) setPatients(data.map(dbToPatient));
        setLoading(false);
      });
  }, []);

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.rut.includes(search);
    const matchFilter = filter === "all" || p.estado === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    all:     patients.length,
    vencida: patients.filter(p => p.estado === "vencida").length,
    proxima: patients.filter(p => p.estado === "proxima").length,
    vigente: patients.filter(p => p.estado === "vigente").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      {/* Header panel */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Fichas de pacientes
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, color: C.ink, outline: "none", fontFamily: "'IBM Plex Mono', monospace" }} />

        {/* Filtros */}
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          {[["all", "Todos", C.blue], ["vencida", "Vencidas", C.red], ["proxima", "Próximas", C.amber], ["vigente", "Vigentes", C.green]].map(([val, lbl, col]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              flex: 1, background: filter === val ? col : C.surface,
              color: filter === val ? "#fff" : C.inkFaint,
              border: `1px solid ${filter === val ? col : C.border}`,
              borderRadius: 5, padding: "4px 2px", fontSize: 9, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              transition: "all .15s",
            }}>
              {lbl} ({counts[val]})
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => onSelectPatient(p)}
            style={{
              background: activePatient?.id === p.id ? C.blueGhost : C.surface,
              border: `1px solid ${activePatient?.id === p.id ? C.blue : C.border}`,
              borderRadius: 8, padding: "10px 12px", cursor: "pointer",
              transition: "all .15s",
              borderLeft: `3px solid ${p.estado === "vencida" ? C.red : p.estado === "proxima" ? C.amber : C.teal}`,
            }}
            onMouseEnter={e => { if (activePatient?.id !== p.id) e.currentTarget.style.background = C.bgDeep; }}
            onMouseLeave={e => { if (activePatient?.id !== p.id) e.currentTarget.style.background = C.surface; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: "'Playfair Display', serif" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 1 }}>{p.rut} · {p.age} años</div>
              </div>
              <StatePill estado={p.estado} />
            </div>
            {p.alertas.length > 0 && (
              <div style={{ marginTop: 5, fontSize: 10, color: p.estado === "vencida" ? C.red : C.amber, fontFamily: "'IBM Plex Mono', monospace" }}>
                ⚠ {p.alertas[0]}
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
              Último control: {p.lastVisit}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen alertas */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: C.bgDeep }}>
        <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 5 }}>RESUMEN DE ALERTAS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {PATIENTS_DB.filter(p => p.alertas.length > 0).map(p => (
            <div key={p.id} style={{ fontSize: 10, color: p.estado === "vencida" ? C.red : C.amber, fontFamily: "'IBM Plex Mono', monospace", display: "flex", gap: 5 }}>
              <span>·</span><span>{p.name}: {p.alertas[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHAT PRINCIPAL
// ─────────────────────────────────────────────────────────────────
function Chat({ activePatient }) {
  const WELCOME = activePatient
    ? `¡Hola, ${activePatient.name.split(" ")[0]}! Bienvenido/a de vuelta a Óptica Visión Clara. ${activePatient.estado === "vencida" ? "Vi que tu receta del " + activePatient.receta.fecha + " está vencida — te recomiendo agendar un control pronto. " : activePatient.estado === "proxima" ? "Tu próximo control se acerca (" + activePatient.nextControl + "). " : ""}¿En qué te puedo ayudar hoy?`
    : "¡Hola! Soy Lente, el asistente de Óptica Visión Clara. Puedo ayudarte con tu receta, agendar un control o responder tus dudas. Si eres paciente nuestro, dime tu nombre o RUT y accedo a tu ficha. ¿Cómo te llamo?";

  const [messages, setMessages] = useState([mkMsg("assistant", WELCOME)]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [detectedPatient, setDetectedPatient] = useState(activePatient || null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Reset al cambiar paciente activo
  useEffect(() => {
    setDetectedPatient(activePatient);
    setMessages([mkMsg("assistant", WELCOME)]);
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
      const found = findPatient(txt);
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
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: config.systemPrompt,
    messages: history,
  }),
});
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") ||
        "Disculpa, tuve un problema. Llámanos al +56 9 8765 4321.";
      setMessages(prev => [...prev, mkMsg("assistant", reply)]);
    } catch {
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
          <div style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14 }}>
            Lente — Óptica Visión Clara
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 4px #4ADE80" }} />
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
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
              color: C.inkMid, fontSize: 11, cursor: "pointer",
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
          placeholder={detectedPatient ? `Escríbele a Lente, ${detectedPatient.name.split(" ")[0]}...` : "Escribe tu consulta..."}
          disabled={loading}
          style={{ flex: 1, background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.ink, outline: "none", fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.6 : 1 }}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
          style={{ background: input.trim() && !loading ? C.blue : C.bgDeep, color: input.trim() && !loading ? "#fff" : C.inkFaint, border: "none", borderRadius: 8, width: 40, height: 40, cursor: input.trim() && !loading ? "pointer" : "default", fontSize: 16, transition: "all .2s", flexShrink: 0 }}>
          {loading ? "…" : "↑"}
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
  const [activePatient, setActivePatient] = useState(null);
  const [view, setView] = useState("split"); // split | chat | fichas

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=IBM+Plex+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; background: ${C.bgDeep}; }
        ::-webkit-scrollbar-thumb { background: ${C.borderDark}; border-radius: 4px; }
        @keyframes slideUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes dot      { 0%,80%,100%{transform:translateY(0);opacity:.5} 40%{transform:translateY(-5px);opacity:1} }
      `}</style>

      {/* TOP NAV */}
      <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: C.blue, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👁️</div>
          <div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Óptica Visión Clara</span>
            <span style={{ color: C.border, margin: "0 8px" }}>·</span>
            <span style={{ fontSize: 11, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>sistema aukén</span>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", background: C.bgDeep, borderRadius: 7, padding: 3, gap: 2, border: `1px solid ${C.border}` }}>
          {[["split", "⊞ Completo"], ["fichas", "📋 Fichas"], ["chat", "💬 Chat"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setView(val)} style={{
              background: view === val ? C.surface : "transparent",
              color: view === val ? C.blue : C.inkFaint,
              border: view === val ? `1px solid ${C.border}` : "1px solid transparent",
              borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              boxShadow: view === val ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              transition: "all .15s",
            }}>{lbl}</button>
          ))}
        </div>

        {/* Alertas badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ background: C.redLight, border: `1px solid ${C.red}40`, borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10, color: C.red, fontFamily: "'IBM Plex Mono', monospace" }}>
              ⚠ {PATIENTS_DB.filter(p => p.alertas.length > 0).length} alertas pendientes
            </span>
          </div>
          <div style={{ width: 28, height: 28, background: C.blue, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
            VC
          </div>
        </div>
      </nav>

      {/* BODY */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Panel fichas */}
        {(view === "split" || view === "fichas") && (
          <div style={{ width: view === "fichas" ? "100%" : 300, borderRight: `1px solid ${C.border}`, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <PanelFichas onSelectPatient={setActivePatient} activePatient={activePatient} />
          </div>
        )}

        {/* Chat */}
        {(view === "split" || view === "chat") && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <Chat activePatient={activePatient} key={activePatient?.id || "no-patient"} />
          </div>
        )}
      </div>

      {/* Instrucción demo */}
      {view === "split" && !activePatient && (
        <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", background: C.blue, color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
          ← Selecciona un paciente para simular una conversación personalizada
        </div>
      )}
    </div>
  );
}
