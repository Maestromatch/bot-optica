import { useState, useRef, useEffect } from "react";

const C = {
  cream:      "#F5F0E8",
  creamDeep:  "#EDE7D9",
  surface:    "#FFFFFF",
  border:     "#D5CFC4",
  borderDark: "#B8B2A7",
  ink:        "#141010",
  inkMid:     "#3A3530",
  inkFaint:   "#7A7570",
  cobalt:     "#1B3A6B",
  cobaltL:    "#2B5BA8",
  cobaltGhost:"#EBF0F8",
  green:      "#166534",
  greenL:     "#DCFCE7",
  amber:      "#B45309",
  amberL:     "#FEF3C7",
  red:        "#991B1B",
  redL:       "#FEE2E2",
  gold:       "#8B6914",
  goldL:      "#FEF9EC",
};

// ── DATOS ───────────────────────────────────────────────────────
const OPTICAS = [
  {
    id: 1, name: "Óptica Visión Clara", city: "Providencia",
    plan: "Visión Pro", status: "active", since: "2025-01-15",
    monthly: 250000, setup: 600000,
    owner: "Dra. Valeria Rojas", phone: "+56987654321",
    patients: 187, recetasVencidas: 23, proximasControl: 14, vigentes: 150,
    consultasMes: 312, citasAgendadas: 47, recordatoriosEnviados: 31, recuperados: 18,
    channels: ["whatsapp", "web"],
    mrr: 250000,
    weeklyConsultas: [28, 34, 41, 38, 52, 47, 44, 51, 48, 55, 62, 58],
    weeklyRecuperados: [1, 2, 1, 3, 2, 2, 3, 1, 2, 2, 3, 4],
    alertas: ["23 recetas vencidas sin recordatorio enviado", "2 pacientes sin respuesta hace 7 días"],
    color: C.cobalt,
  },
  {
    id: 2, name: "Óptica Lux Centro", city: "Santiago Centro",
    plan: "Visión Base", status: "active", since: "2025-03-01",
    monthly: 150000, setup: 400000,
    owner: "Felipe Contreras", phone: "+56912345678",
    patients: 94, recetasVencidas: 8, proximasControl: 6, vigentes: 80,
    consultasMes: 145, citasAgendadas: 22, recordatoriosEnviados: 12, recuperados: 7,
    channels: ["whatsapp"],
    mrr: 150000,
    weeklyConsultas: [10, 14, 12, 16, 13, 17, 14, 18, 15, 19, 16, 20],
    weeklyRecuperados: [0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1],
    alertas: ["8 recetas vencidas pendientes"],
    color: C.cobaltL,
  },
  {
    id: 3, name: "Óptica Foco Sur", city: "Maipú",
    plan: "Visión Pro", status: "onboarding", since: "2025-05-10",
    monthly: 250000, setup: 600000,
    owner: "Carla Jiménez", phone: "+56955443322",
    patients: 12, recetasVencidas: 0, proximasControl: 1, vigentes: 11,
    consultasMes: 8, citasAgendadas: 1, recordatoriosEnviados: 0, recuperados: 0,
    channels: ["whatsapp", "web"],
    mrr: 250000,
    weeklyConsultas: [0,0,0,0,0,0,0,0,0,1,3,8],
    weeklyRecuperados: [0,0,0,0,0,0,0,0,0,0,0,0],
    alertas: ["Onboarding en curso — carga de fichas pendiente"],
    color: C.amber,
  },
];

const STATUS_MAP = {
  active:     { label: "Activa",      color: C.green,  bg: C.greenL  },
  onboarding: { label: "Onboarding",  color: C.amber,  bg: C.amberL  },
  paused:     { label: "Pausada",     color: C.red,    bg: C.redL    },
};

// ── MICRO ────────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}30`, borderRadius: 3, padding: "2px 8px", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}

function Sparkline({ data, color, w = 100, h = 32 }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}18`} />
    </svg>
  );
}

function MiniBar({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: `${color}22`, borderRadius: "2px 2px 0 0", position: "relative", height: `${Math.max((v / max) * 40, 2)}px` }}>
          <div style={{ position: "absolute", inset: 0, background: color, borderRadius: "2px 2px 0 0", opacity: i === data.length - 1 ? 1 : 0.4 }} />
        </div>
      ))}
    </div>
  );
}

function Fade({ children, delay = 0 }) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.05 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(16px)", transition: `opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

// ── OPTICA CARD (sidebar) ────────────────────────────────────────
function OpticaCard({ optica: o, selected, onClick }) {
  const s = STATUS_MAP[o.status];
  return (
    <div onClick={() => onClick(o)} style={{
      background: selected ? C.cobaltGhost : C.surface,
      border: `1px solid ${selected ? C.cobalt : C.border}`,
      borderLeft: `3px solid ${o.color}`,
      borderRadius: 7, padding: "12px 14px", cursor: "pointer",
      transition: "all .18s", marginBottom: 8,
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = C.creamDeep; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = C.surface; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 14, color: C.ink }}>{o.name}</div>
          <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 1 }}>{o.city} · {o.plan}</div>
        </div>
        <Badge label={s.label} color={s.color} bg={s.bg} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 500, color: C.cobalt }}>{o.patients}</div>
            <div style={{ fontSize: 9, color: C.inkFaint }}>pacientes</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 500, color: o.recetasVencidas > 0 ? C.red : C.green }}>{o.recetasVencidas}</div>
            <div style={{ fontSize: 9, color: C.inkFaint }}>vencidas</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 500, color: C.amber }}>{o.proximasControl}</div>
            <div style={{ fontSize: 9, color: C.inkFaint }}>próx.</div>
          </div>
        </div>
        <Sparkline data={o.weeklyConsultas} color={o.color} w={70} h={24} />
      </div>
    </div>
  );
}

// ── DETALLE ÓPTICA ───────────────────────────────────────────────
function OpticaDetail({ optica: o }) {
  const [tab, setTab] = useState("metricas");
  const s = STATUS_MAP[o.status];
  const weeks = ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12"];

  const KPI = ({ label, value, color, sub }) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "16px 18px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 28, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.inkMid, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ background: C.cobalt, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 22, color: "#fff" }}>{o.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
              {o.owner} · {o.phone} · {o.city}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge label={s.label} color={s.color} bg={s.bg} />
            <div style={{ background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: 3, padding: "4px 10px", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              {o.plan}
            </div>
          </div>
        </div>
        {/* Tab nav */}
        <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", padding: "0 22px", background: C.creamDeep }}>
          {[["metricas", "Métricas"], ["recetas", "Recetas & Alertas"], ["campana", "Campaña recordatorio"], ["factura", "Facturación"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setTab(val)} style={{
              background: "none", border: "none", padding: "11px 14px",
              fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              color: tab === val ? C.cobalt : C.inkFaint,
              borderBottom: tab === val ? `2px solid ${C.cobalt}` : "2px solid transparent",
              marginBottom: -1, transition: "all .15s",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Tab: Métricas */}
      {tab === "metricas" && (
        <Fade>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KPI label="Consultas este mes"    value={o.consultasMes}           color={C.cobalt} />
              <KPI label="Citas agendadas"       value={o.citasAgendadas}         color={C.green}  sub={`${Math.round(o.citasAgendadas/o.consultasMes*100)}% conversión`} />
              <KPI label="Recordatorios enviados" value={o.recordatoriosEnviados} color={C.amber}  />
              <KPI label="Pacientes recuperados" value={o.recuperados}            color={C.green}  sub={`${Math.round(o.recuperados/o.recordatoriosEnviados*100||0)}% tasa respuesta`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Consultas semanales (12 semanas)</div>
                <MiniBar data={o.weeklyConsultas} color={C.cobalt} />
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {weeks.map(w => <div key={w} style={{ flex: 1, fontSize: 8, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textAlign: "center" }}>{w}</div>)}
                </div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Estado de fichas</div>
                {[
                  { label: "Recetas vigentes",   value: o.vigentes,          color: C.green, total: o.patients },
                  { label: "Próx. a vencer",      value: o.proximasControl,  color: C.amber, total: o.patients },
                  { label: "Recetas vencidas",    value: o.recetasVencidas,   color: C.red,   total: o.patients },
                ].map(({ label, value, color, total }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: C.inkMid, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
                      <span style={{ fontSize: 11, color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{value}</span>
                    </div>
                    <div style={{ height: 4, background: `${color}20`, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(value / total) * 100}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Fade>
      )}

      {/* Tab: Recetas & Alertas */}
      {tab === "recetas" && (
        <Fade>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {o.alertas.length > 0 && (
              <div style={{ background: C.redL, border: `1px solid #FCA5A5`, borderRadius: 7, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.red, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>⚠ ALERTAS ACTIVAS</div>
                {o.alertas.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.red, fontFamily: "'IBM Plex Mono', monospace', display: 'flex', gap: 5" }}>· {a}</div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Vencidas", count: o.recetasVencidas, color: C.red, bg: C.redL, action: "Enviar recordatorio masivo →" },
                { label: "Próximas a vencer (30 días)", count: o.proximasControl, color: C.amber, bg: C.amberL, action: "Programar recordatorio →" },
                { label: "Vigentes", count: o.vigentes, color: C.green, bg: C.greenL, action: "Ver todas →" },
              ].map(({ label, count, color, bg, action }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 7, padding: 18 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 36, color }}>{count}</div>
                  <div style={{ fontSize: 11, color: C.inkMid, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4, marginBottom: 12 }}>{label}</div>
                  <button style={{ background: color, color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                    {action}
                  </button>
                </div>
              ))}
            </div>
            {/* Tabla mock pacientes con alertas */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Pacientes con receta vencida o próxima
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.creamDeep }}>
                    {["Paciente", "Último control", "Estado", "Próximo control", "Acción"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textAlign: "left", fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "María González",   last: "14 Ago 2024", estado: "vencida",  next: "14 Ago 2025", dias: "-274" },
                    { name: "Carlos Méndez",    last: "20 Ene 2025", estado: "proxima",  next: "20 Jul 2025", dias: "+83"  },
                    { name: "Ana Flores",       last: "02 Sep 2024", estado: "vencida",  next: "02 Sep 2025", dias: "-255" },
                    { name: "Pedro Riquelme",   last: "28 Feb 2025", estado: "proxima",  next: "28 Ago 2025", dias: "+122" },
                  ].map((p, i) => (
                    <tr key={p.name} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : C.cream }}>
                      <td style={{ padding: "10px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 13, color: C.ink }}>{p.name}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{p.last}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge label={p.estado === "vencida" ? "Vencida" : "Próx. vencer"} color={p.estado === "vencida" ? C.red : C.amber} bg={p.estado === "vencida" ? C.redL : C.amberL} />
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {p.next} <span style={{ color: +p.dias < 0 ? C.red : C.amber }}>({p.dias}d)</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button style={{ background: C.cobalt, color: "#fff", border: "none", borderRadius: 3, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                          Enviar WA →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Fade>
      )}

      {/* Tab: Campaña de recordatorio */}
      {tab === "campana" && (
        <Fade>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 14 }}>CONFIGURAR CAMPAÑA</div>
                {[
                  { label: "Disparador", options: ["Receta vencida", "30 días antes del control", "60 días antes"] },
                  { label: "Canal", options: ["WhatsApp", "WhatsApp + Web", "Solo web"] },
                  { label: "Frecuencia", options: ["Una vez", "Recordatorio semanal", "Cada 3 días"] },
                ].map(({ label, options }) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>{label}</label>
                    <select style={{ width: "100%", background: C.creamDeep, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", fontSize: 12, color: C.ink, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <button style={{ width: "100%", background: C.cobalt, color: "#fff", border: "none", borderRadius: 4, padding: 11, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em", marginTop: 4 }}>
                  ACTIVAR CAMPAÑA →
                </button>
              </div>
              {/* Stats recordatorio */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>RESULTADOS ÚLTIMAS CAMPAÑAS</div>
                {[
                  { label: "Recordatorios enviados", value: o.recordatoriosEnviados, color: C.cobalt },
                  { label: "Pacientes que respondieron", value: Math.round(o.recordatoriosEnviados * 0.6), color: C.amber },
                  { label: "Controles agendados", value: o.recuperados, color: C.green },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: C.inkMid, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
                      <span style={{ fontSize: 13, color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{value}</span>
                    </div>
                    <div style={{ height: 3, background: `${color}20`, borderRadius: 2, marginTop: 4 }}>
                      <div style={{ height: "100%", width: `${(value / o.recordatoriosEnviados) * 100}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Preview mensaje WhatsApp */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>PREVIEW MENSAJE WHATSAPP</div>
              <div style={{ background: "#E8F5E9", borderRadius: 8, padding: 16, fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ background: "#25D366", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>👁️</span>
                  <strong>Óptica Visión Clara</strong>
                </div>
                <div style={{ background: "#fff", borderRadius: "8px 8px 8px 0", padding: "10px 12px", fontSize: 13, color: "#1a1a1a", lineHeight: 1.6, boxShadow: "0 1px 2px rgba(0,0,0,.1)", marginBottom: 6 }}>
                  Hola <strong>María</strong> 👋<br /><br />
                  Te escribimos de <strong>Óptica Visión Clara</strong>.<br /><br />
                  Notamos que tu última revisión fue en <strong>agosto 2024</strong> y tu receta está vencida. Es un buen momento para un control — tu visión puede haber cambiado.<br /><br />
                  ¿Te acomoda esta semana? Tenemos horas disponibles de <strong>lunes a viernes 9:30–19:30</strong>. 🗓️
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Sí, quiero hora", "Ver horarios", "Más tarde"].map(btn => (
                    <div key={btn} style={{ background: "#fff", border: "1px solid #25D366", color: "#25D366", borderRadius: 14, padding: "4px 10px", fontSize: 10, cursor: "pointer" }}>{btn}</div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: "#999", textAlign: "right", marginTop: 6 }}>✓✓ Enviado · 09:14</div>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button style={{ flex: 1, background: "none", border: `1px solid ${C.border}`, color: C.inkMid, borderRadius: 4, padding: 9, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Editar mensaje
                </button>
                <button style={{ flex: 1, background: "#25D366", color: "#fff", border: "none", borderRadius: 4, padding: 9, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Enviar ahora →
                </button>
              </div>
            </div>
          </div>
        </Fade>
      )}

      {/* Tab: Facturación */}
      {tab === "factura" && (
        <Fade>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>RESUMEN FINANCIERO</div>
              {[
                { label: "Plan activo",            value: o.plan,                                    color: C.cobalt },
                { label: "Mensualidad",             value: `$${o.monthly.toLocaleString("es-CL")} CLP`, color: C.green  },
                { label: "Implementación cobrada",  value: `$${o.setup.toLocaleString("es-CL")} CLP`,   color: C.inkMid },
                { label: "Cliente desde",           value: o.since,                                    color: C.inkMid },
                { label: "Próximo cobro",           value: "15 Junio 2025",                            color: C.amber  },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
                  <span style={{ fontSize: 12, color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>ROI ESTIMADO PARA EL CLIENTE</div>
              {[
                { label: "Consultas atendidas automáticamente", value: `${o.consultasMes}`, sub: "este mes" },
                { label: "Pacientes recuperados vía recordatorio", value: `${o.recuperados}`, sub: "controles generados" },
                { label: "Ingreso estimado adicional", value: `$${(o.recuperados * 65000).toLocaleString("es-CL")}`, sub: "CLP · $65K por control" },
                { label: "ROI mensual estimado", value: `${Math.round((o.recuperados * 65000) / o.monthly * 10) / 10}×`, sub: "vs. mensualidad" },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 11, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 20, color: C.cobalt }}>{value}</span>
                  </div>
                  <div style={{ fontSize: 9, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", textAlign: "right" }}>{sub}</div>
                </div>
              ))}
              <div style={{ background: C.cobaltGhost, border: `1px solid ${C.cobalt}30`, borderRadius: 5, padding: "10px 12px", marginTop: 8 }}>
                <div style={{ fontSize: 10, color: C.cobalt, fontFamily: "'IBM Plex Mono', monospace" }}>
                  → Mostrar este reporte al cliente aumenta retención en 40%.
                </div>
              </div>
            </div>
          </div>
        </Fade>
      )}
    </div>
  );
}

// ── GLOBAL KPIs ──────────────────────────────────────────────────
function GlobalKPIs({ opticas }) {
  const mrr = opticas.filter(o => o.status !== "paused").reduce((a, o) => a + o.monthly, 0);
  const totalPacientes = opticas.reduce((a, o) => a + o.patients, 0);
  const totalVencidas = opticas.reduce((a, o) => a + o.recetasVencidas, 0);
  const totalRecuperados = opticas.reduce((a, o) => a + o.recuperados, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
      {[
        { label: "MRR agencia",          value: `$${(mrr/1000).toFixed(0)}K`, sub: "CLP mensual",             color: C.green  },
        { label: "Pacientes en sistema", value: totalPacientes,               sub: "total fichas activas",      color: C.cobalt },
        { label: "Recetas vencidas",     value: totalVencidas,                sub: "requieren recordatorio",    color: C.red    },
        { label: "Pacientes recuperados",value: totalRecuperados,             sub: "controles generados",       color: C.amber  },
      ].map(({ label, value, sub, color }) => (
        <Fade key={label}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 30, color }}>{value}</div>
            <div style={{ fontSize: 10, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>{label}</div>
            <div style={{ fontSize: 9, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{sub}</div>
          </div>
        </Fade>
      ))}
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────
export default function AukenOpticaDashboard() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = OPTICAS.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) || o.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "'IBM Plex Mono', monospace", color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@300;400;500&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; background: ${C.creamDeep}; }
        ::-webkit-scrollbar-thumb { background: ${C.borderDark}; border-radius: 4px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>

      {/* TOPBAR */}
      <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, background: C.cobalt, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👁️</div>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 17, color: C.ink }}>AUKÉN</span>
          <span style={{ color: C.border, margin: "0 6px" }}>·</span>
          <span style={{ fontSize: 10, color: C.inkFaint }}>panel ópticas</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: C.creamDeep, border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 12px", fontSize: 10, color: C.inkFaint }}>
            🌲 bosque mode · Santiago
          </div>
          <div style={{ width: 30, height: 30, background: C.cobalt, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>A</div>
        </div>
      </nav>

      {/* LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "calc(100vh - 52px)" }}>

        {/* SIDEBAR */}
        <div style={{ borderRight: `1px solid ${C.border}`, padding: 16, overflowY: "auto", background: C.creamDeep }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar óptica..."
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "8px 10px", fontSize: 11, color: C.ink, outline: "none", marginBottom: 14 }}
            onFocus={e => e.target.style.borderColor = C.cobalt}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <div style={{ fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            {filtered.length} óptica{filtered.length !== 1 ? "s" : ""}
          </div>
          {filtered.map(o => (
            <OpticaCard key={o.id} optica={o} selected={selected?.id === o.id} onClick={setSelected} />
          ))}
        </div>

        {/* MAIN */}
        <div style={{ padding: 24, overflowY: "auto" }}>
          {selected ? (
            <Fade key={selected.id}>
              <OpticaDetail optica={selected} />
            </Fade>
          ) : (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 24, color: C.ink, marginBottom: 3 }}>
                  Buenos días, agencia 🌲
                </h1>
                <p style={{ fontSize: 11, color: C.inkFaint }}>
                  {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · {OPTICAS.filter(o => o.status === "active").length} ópticas activas
                </p>
              </div>
              <GlobalKPIs opticas={OPTICAS} />
              {/* Feed alertas globales */}
              <Fade delay={100}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                  <div style={{ fontSize: 10, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>ALERTAS GLOBALES</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {OPTICAS.flatMap(o => o.alertas.map((a, i) => ({ optica: o.name, alerta: a, color: o.color, key: `${o.id}-${i}` }))).map(({ optica, alerta, color, key }) => (
                      <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: C.cream, borderRadius: 5, borderLeft: `3px solid ${color}` }}>
                        <span style={{ fontSize: 12 }}>⚠</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.ink, fontFamily: "'Cormorant Garamond', serif" }}>{optica}</span>
                          <span style={{ fontSize: 11, color: C.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}> · {alerta}</span>
                        </div>
                        <button style={{ background: C.cobalt, color: "#fff", border: "none", borderRadius: 3, padding: "3px 8px", fontSize: 9, cursor: "pointer" }}>
                          Resolver →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Fade>
              <Fade delay={150}>
                <div style={{ marginTop: 14, background: C.surface, border: `1px dashed ${C.borderDark}`, borderRadius: 8, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>👁️</div>
                  <div style={{ fontSize: 11, color: C.inkFaint }}>Selecciona una óptica para ver métricas, recetas y campañas de recordatorio</div>
                </div>
              </Fade>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
