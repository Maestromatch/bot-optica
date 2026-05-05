import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Vapi from "@vapi-ai/web";
// ── PALETA FUTURISTA (Dark Mode No Invasivo) ───────────────────
const C = {
  bg:         "#090A0F", // Fondo muy oscuro, casi negro con tono azulado
  surface:    "#11131C", // Tarjetas
  surfaceL:   "#1A1D2A", // Tarjetas hover
  border:     "#23283A", // Bordes sutiles
  borderGlow: "#38BDF840", // Brillo cian
  text:       "#F8FAFC", // Texto principal blanco/plata
  textDim:    "#94A3B8", // Texto secundario
  textMuted:  "#475569", // Texto muy apagado
  
  // Acentos de estado
  neonBlue:   "#FB923C", // Naranjo suave (Glow Vision)
  neonBlueD:  "#7DD3FC", // Azul claro suave
  neonGreen:  "#10B981", // Esmeralda
  neonAmber:  "#F59E0B", // Ambar/Dorado
  neonRed:    "#F43F5E", // Rosa/Rojo
};

// ── CONFIGURACIÓN DE LA ÓPTICA PRINCIPAL ───────────────────────
const MI_OPTICA = {
  id: 1, 
  name: "Ópticas Glow Vision", 
  city: "Punitaqui",
  plan: "Multi-Sucursal", 
  status: "active", 
  since: "2025-01-15",
  owner: "Administrador", 
  phone: "+56987654321",
  automations: {
    thanks: true,
    adjustment: true,
    expiration: true
  }
};

// ── MICRO-COMPONENTES ────────────────────────────────────────────
function Sparkline({ data, color, w = 100, h = 32 }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#grad-${color})`} />
    </svg>
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
    <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(16px)", transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms` }}>
      {children}
    </div>
  );
}

function GlassCard({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: "20px 24px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
      ...style
    }}>
      {children}
    </div>
  );
}

// ── GRÁFICO DE VENTAS ────────────────────────────────────────────
function SalesChart({ pacientes }) {
  const [period, setPeriod] = useState("diario");

  const getBarData = () => {
    const compras = pacientes.filter(p => p.estado_compra === "Compró" && p.monto_venta);
    const now = new Date();
    
    if (period === "diario") {
      // Last 7 days
      const labels = [];
      const values = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        labels.push(i === 0 ? "Hoy" : dayNames[d.getDay()]);
        values.push(compras.filter(p => p.fecha_ultima_visita === key).reduce((s, p) => s + (Number(p.monto_venta) || 0), 0));
      }
      return { labels, values };
    } else if (period === "semanal") {
      // Last 4 weeks
      const labels = ["Semana 4", "Semana 3", "Semana 2", "Esta Semana"];
      const values = [0, 0, 0, 0];
      compras.forEach(p => {
        const pDate = new Date(p.fecha_ultima_visita);
        const diffDays = Math.floor((now - pDate) / (1000 * 60 * 60 * 24));
        const weekIdx = Math.min(3, Math.floor(diffDays / 7));
        values[3 - weekIdx] += Number(p.monto_venta) || 0;
      });
      return { labels, values };
    } else {
      // Last 6 months
      const labels = [];
      const values = [];
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(monthNames[d.getMonth()]);
        values.push(compras.filter(p => {
          const pd = new Date(p.fecha_ultima_visita);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        }).reduce((s, p) => s + (Number(p.monto_venta) || 0), 0));
      }
      return { labels, values };
    }
  };

  const { labels, values } = getBarData();
  const maxVal = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <GlassCard style={{ borderTop: `2px solid ${C.neonAmber}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 Desglose de Ventas</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 24, color: C.neonAmber, marginTop: 4 }}>${total.toLocaleString("es-CL")} CLP</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: 8, padding: 3 }}>
          {[["diario", "Diario"], ["semanal", "Semanal"], ["mensual", "Mensual"]].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} style={{
              background: period === key ? C.surfaceL : "transparent",
              color: period === key ? C.text : C.textMuted,
              border: period === key ? `1px solid ${C.border}` : "1px solid transparent",
              borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "0.2s"
            }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
        {values.map((v, i) => {
          const h = maxVal > 0 ? (v / maxVal) * 120 : 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 10, color: v > 0 ? C.neonAmber : C.textMuted, fontWeight: 700 }}>
                {v > 0 ? `$${(v / 1000).toFixed(0)}k` : "—"}
              </div>
              <div style={{
                width: "100%", maxWidth: 40, height: Math.max(h, 4), borderRadius: "4px 4px 0 0",
                background: v > 0 ? `linear-gradient(180deg, ${C.neonAmber}, ${C.neonAmber}60)` : `${C.border}60`,
                transition: "height 0.4s ease",
                boxShadow: v > 0 ? `0 0 8px ${C.neonAmber}30` : "none"
              }} />
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{labels[i]}</div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ── DETALLE ÓPTICA ───────────────────────────────────────────────
function OpticaDetail({ optica: o, setOpticaData, showModal, setShowModal, sucursalFilter, setEditingPatient, setSelectedPatient, vapiCallStatus, handleStartVapiCall, handleStopVapiCall }) {
  const [tab, setTab] = useState("metricas");

  const KPI = ({ label, value, color, sub, glow = false }) => (
    <GlassCard style={{ 
      display: "flex", flexDirection: "column", justifyContent: "center",
      border: glow ? `1px solid ${color}40` : `1px solid ${C.border}`,
      boxShadow: glow ? `0 0 20px ${color}15, inset 0 1px 0 rgba(255,255,255,0.05)` : undefined
    }}>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 36, color, textShadow: glow ? `0 0 12px ${color}60` : "none" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textDim, fontWeight: 500, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </GlassCard>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* Header Profile */}
      <GlassCard style={{ padding: "30px", background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surfaceL} 100%)`, borderTop: `2px solid ${C.neonBlue}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.neonGreen, boxShadow: `0 0 10px ${C.neonGreen}` }} />
              <div style={{ fontSize: 12, color: C.neonGreen, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Sistema En Línea</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 28, color: C.text }}>{o.name}</div>
              <button onClick={() => setShowProfileModal(true)} style={{ background: "transparent", border: "none", color: C.neonBlue, cursor: "pointer", fontSize: 16, opacity: 0.7 }}>✏️</button>
            </div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
              {o.city} · Gestor: {o.owner} · {o.phone}
            </div>
          </div>
          <div style={{ background: `${C.neonBlue}15`, border: `1px solid ${C.neonBlue}40`, color: C.neonBlue, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em" }}>
            MODO: {o.plan.toUpperCase()}
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
        {[
          { id: "metricas", label: "Métricas" },
          { id: "pacientes", label: "Pacientes" },
          { id: "campanas", label: "Campañas IA" },
          { id: "llamadas", label: "Llamadas IA 🎙️" }
        ].map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: active ? C.surfaceL : "transparent",
              color: active ? C.text : C.textDim,
              border: active ? `1px solid ${C.borderGlow}` : "1px solid transparent",
              borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: active ? 600 : 500,
              cursor: "pointer", transition: "all 0.2s"
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "metricas" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          {/* Main KPIs */}
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <Fade delay={0}>
              <KPI label="Total Pacientes" value={o.patients} color={C.text} sub="En la base de datos" />
            </Fade>
            <Fade delay={50}>
              <KPI label="Vigentes" value={o.vigentes} color={C.neonGreen} sub="Menos de 1 año" />
            </Fade>
            <Fade delay={100}>
              <KPI label="Próximas a Control" value={o.proximasControl} color={C.neonAmber} sub="En menos de 30 días" />
            </Fade>
            <Fade delay={150}>
              <KPI label="Recetas Vencidas" value={o.recetasVencidas} color={C.neonRed} sub="Requieren acción" glow={o.recetasVencidas > 0} />
            </Fade>
          </div>

          {/* Financial KPIs */}
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <Fade delay={180}>
              <GlassCard style={{ borderTop: `2px solid ${C.neonGreen}` }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em" }}>💸 Ventas de Hoy</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 32, color: C.neonGreen, textShadow: `0 0 12px ${C.neonGreen}40` }}>
                  ${(o.pacientesList || []).filter(p => p.estado_compra === "Compró" && p.fecha_ultima_visita === new Date().toISOString().split('T')[0]).reduce((sum, p) => sum + (Number(p.monto_venta) || 0), 0).toLocaleString("es-CL")}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>CLP acumulados hoy</div>
              </GlassCard>
            </Fade>
            <Fade delay={220}>
              <GlassCard style={{ borderTop: `2px solid ${C.neonAmber}` }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em" }}>🎯 Tasa de Cierre</div>
                {(() => {
                  const total = (o.pacientesList || []).filter(p => p.estado_compra && p.estado_compra !== "Pendiente").length;
                  const compras = (o.pacientesList || []).filter(p => p.estado_compra === "Compró").length;
                  const pct = total > 0 ? Math.round((compras / total) * 100) : 0;
                  return <>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 32, color: C.neonAmber }}>{pct}%</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{compras} de {total} atendidos compraron</div>
                  </>;
                })()}
              </GlassCard>
            </Fade>
            <Fade delay={260}>
              <GlassCard style={{ borderTop: `2px solid ${C.neonBlue}` }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em" }}>📊 Ventas Totales</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 32, color: C.neonBlue }}>
                  ${(o.pacientesList || []).filter(p => p.estado_compra === "Compró").reduce((sum, p) => sum + (Number(p.monto_venta) || 0), 0).toLocaleString("es-CL")}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>CLP acumulados total</div>
              </GlassCard>
            </Fade>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Chart Consultas */}
            <Fade delay={200}>
              <GlassCard>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actividad Chatbot</div>
                  <div style={{ color: C.neonBlue, fontWeight: 700 }}>{o.consultasMes} consultas</div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", height: 120 }}>
                  <Sparkline data={o.weeklyConsultas} color={C.neonBlue} w={400} h={120} />
                </div>
              </GlassCard>
            </Fade>

            {/* Alertas */}
            <Fade delay={250}>
              <GlassCard>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Alertas del Sistema</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {o.alertas.length === 0 ? (
                    <div style={{ color: C.textMuted, fontSize: 13, padding: 16, textAlign: "center", background: `${C.border}40`, borderRadius: 8 }}>
                      No hay alertas pendientes. Todo en orden.
                    </div>
                  ) : o.alertas.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", background: `${C.neonRed}10`, borderLeft: `2px solid ${C.neonRed}`, borderRadius: 8 }}>
                      <div style={{ color: C.neonRed, fontSize: 18 }}>⚠️</div>
                      <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{a}</div>
                      <button 
                        onClick={() => {
                          setOpticaData(prev => ({
                            ...prev,
                            alertas: prev.alertas.filter((_, index) => index !== i)
                          }));
                        }}
                        style={{ background: C.neonRed, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        Resolver
                      </button>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </Fade>
          </div>

          {/* Sales Chart */}
          <Fade delay={300}>
            <SalesChart pacientes={o.pacientesList || []} />
          </Fade>
        </div>
      )}

      {tab === "pacientes" && (
        <div>
          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Base de Datos CRM</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 13, background: `${C.neonGreen}20`, color: C.neonGreen, padding: "4px 12px", borderRadius: 20, fontWeight: 500 }}>{o.pacientesList?.length || 0} Registros</div>
                <button onClick={() => setShowModal(true)} style={{ background: C.neonBlue, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}>
                  + Nuevo Prospecto
                </button>
              </div>
            </div>
            
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: `${C.surfaceL}80` }}>
                    <th style={{ padding: "16px 24px", fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Paciente / Lead</th>
                    <th style={{ padding: "16px 24px", fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Contacto</th>
                    <th style={{ padding: "16px 24px", fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Estado</th>
                    <th style={{ padding: "16px 24px", fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(o.pacientesList || [])
                    .filter(p => {
                      if (sucursalFilter === "Todas") return true;
                      const notas = (p.notas_clinicas || "").toLowerCase();
                      const sf = sucursalFilter.toLowerCase();
                      return notas.includes(sf) || (p.comuna || "").toLowerCase().includes(sf) || (p.operativo || "").toLowerCase().includes(sf) || (p.sucursal || "").toLowerCase().includes(sf);
                    })
                    .map((p) => {
                      const isOperativo = p.notas_clinicas?.toLowerCase().includes("operativo") || p.producto_actual?.toLowerCase().includes("operativo");
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.2s", cursor: "pointer" }} 
                          onMouseEnter={(e) => e.currentTarget.style.background = `${C.surfaceL}40`} 
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          onClick={() => { setEditingPatient({...p}); setSelectedPatient(p); }}
                        >
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>{p.nombre || "Sin Nombre"}</div>
                            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>RUT: {p.rut || "—"}</div>
                            {isOperativo && (
                              <div style={{ display: "inline-block", marginTop: 8, fontSize: 10, background: `${C.neonBlue}20`, color: C.neonBlue, padding: "2px 8px", borderRadius: 12, fontWeight: 600, border: `1px solid ${C.neonBlue}40` }}>
                                LEAD OPERATIVO
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ fontSize: 13, color: C.text }}>{p.telefono || "—"}</div>
                            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Visita: {p.fecha_ultima_visita || "—"}</div>
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <select value={p.estado_compra || "Pendiente"} onClick={e => e.stopPropagation()} onChange={async (ev) => {
                                const newEstado = ev.target.value;
                                // Local update
                                setOpticaData(prev => ({
                                  ...prev,
                                  pacientesList: prev.pacientesList.map(px => px.id === p.id ? { ...px, estado_compra: newEstado } : px)
                                }));
                                // Supabase update
                                await supabase.from("pacientes").update({ estado_compra: newEstado }).eq("id", p.id);
                              }} style={{ background: p.estado_compra === "Compró" ? `${C.neonGreen}20` : p.estado_compra === "No Compró" ? `${C.neonRed}20` : C.bg, border: `1px solid ${p.estado_compra === "Compró" ? C.neonGreen : p.estado_compra === "No Compró" ? C.neonRed : C.border}`, color: p.estado_compra === "Compró" ? C.neonGreen : p.estado_compra === "No Compró" ? C.neonRed : C.text, padding: "4px 8px", borderRadius: 6, fontSize: 11, outline: "none", fontWeight: 600 }}>
                                <option>Pendiente</option>
                                <option>Compró</option>
                                <option>No Compró</option>
                              </select>
                              {p.estado_compra === "Compró" && (
                                <input type="number" placeholder="Monto $" value={p.monto_venta || ""} onClick={e => e.stopPropagation()} onBlur={async (ev) => {
                                  // Solo guardar al perder el foco para evitar mil llamadas por cada número
                                  const val = ev.target.value;
                                  await supabase.from("pacientes").update({ monto_venta: val }).eq("id", p.id);
                                }} onChange={(ev) => {
                                  const val = ev.target.value;
                                  setOpticaData(prev => ({
                                    ...prev,
                                    pacientesList: prev.pacientesList.map(px => px.id === p.id ? { ...px, monto_venta: val } : px)
                                  }));
                                }} style={{ background: C.bg, border: `1px solid ${C.neonGreen}40`, color: C.neonGreen, padding: "4px 8px", borderRadius: 6, fontSize: 12, outline: "none", width: 100, fontWeight: 700 }} />
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "16px 24px" }}>
                            <a 
                              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Reserva+Operativo+-+${encodeURIComponent(p.nombre || "")}&details=Teléfono:+${encodeURIComponent(p.telefono || "")}%0A%0A${encodeURIComponent(p.notas_clinicas || "")}`} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ background: `${C.neonBlue}20`, color: C.neonBlue, border: `1px solid ${C.neonBlue}50`, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = C.neonBlue; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = `${C.neonBlue}20`; e.currentTarget.style.color = C.neonBlue; }}
                            >
                              📅 Google
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  {(o.pacientesList || []).filter(p => {
                    if (sucursalFilter === "Todas") return true;
                    const notas = (p.notas_clinicas || "").toLowerCase();
                    const sf = sucursalFilter.toLowerCase();
                    return notas.includes(sf) || (p.comuna || "").toLowerCase().includes(sf) || (p.operativo || "").toLowerCase().includes(sf) || (p.sucursal || "").toLowerCase().includes(sf);
                  }).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: "40px", textAlign: "center", color: C.textDim, fontSize: 14 }}>
                        {sucursalFilter !== "Todas" ? `No hay pacientes en "${sucursalFilter}".` : "Aún no hay pacientes o leads capturados."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {tab === "campanas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* 1. AUTOMATIZACIONES DE RETENCIÓN */}
          <GlassCard style={{ padding: "30px", borderTop: `2px solid ${C.neonGreen}`, background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)` }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Motor de Retención Automática 🤖</div>
              <div style={{ fontSize: 14, color: C.textDim }}>La IA contactará a tus pacientes en momentos clave sin que tengas que hacer nada.</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { id: "thanks", title: "Gracias por tu Compra", desc: "Se envía 3 días después de la venta.", icon: "✨" },
                { id: "adjustment", title: "Ajuste de Comodidad", desc: "Se envía 1 mes después para fidelizar.", icon: "👓" },
                { id: "expiration", title: "Recordatorio de Receta", desc: "Se envía a los 11 meses del control.", icon: "📅" }
              ].map(auto => (
                <div key={auto.id} style={{ background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, transition: "0.2s" }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{auto.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{auto.title}</div>
                  <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16, lineHeight: "1.4" }}>{auto.desc}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: o.automations?.[auto.id] ? C.neonGreen : C.textMuted, fontWeight: 600 }}>{o.automations?.[auto.id] ? "ACTIVADO" : "DESACTIVADO"}</span>
                    <div 
                      onClick={() => setOpticaData({...o, automations: {...o.automations, [auto.id]: !o.automations?.[auto.id]}})}
                      style={{ width: 44, height: 22, background: o.automations?.[auto.id] ? C.neonGreen : C.border, borderRadius: 20, cursor: "pointer", position: "relative", transition: "0.3s" }}
                    >
                      <div style={{ position: "absolute", top: 2, left: o.automations?.[auto.id] ? 24 : 2, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "0.3s" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* 2. GENERADOR DE CAMPAÑAS MASIVAS */}
          <GlassCard style={{ padding: "30px", borderTop: `2px solid ${C.neonAmber}` }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Campañas de Captura Masiva 🚀</div>
              <div style={{ fontSize: 14, color: C.textDim }}>Envía promociones personalizadas a grupos específicos de pacientes.</div>
            </div>

            <div style={{ display: "flex", gap: 32 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Paso 1: Seleccionar Audiencia</label>
                  <select style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, outline: "none" }}>
                    <option>Pacientes que NO compraron ({(o.pacientesList || []).filter(p => p.estado_compra === "No Compró").length})</option>
                    <option>Solo Recetas Vencidas ({o.recetasVencidas || 0})</option>
                    <option>Leads de Operativos Recientes</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Paso 2: Objetivo de la Campaña</label>
                  <textarea 
                    rows={4} 
                    placeholder="Ej: Estaré este viernes en Punitaqui con 50% de descuento en cristales. Pregúntales a qué hora pueden venir..."
                    style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "12px", borderRadius: 8, resize: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13 }}
                  />
                </div>
                <button style={{ background: `linear-gradient(90deg, ${C.neonAmber}, #F59E0B)`, color: "#000", border: "none", borderRadius: 8, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8, boxShadow: `0 4px 15px ${C.neonAmber}30` }}>
                  ⚡ Lanzar Campaña con IA
                </button>
              </div>

              <div style={{ flex: 1 }}>
                 <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", marginBottom: 12 }}>Vista Previa IA</div>
                 <div style={{ background: C.bg, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, position: "relative" }}>
                    <div style={{ background: "#054D44", padding: "12px 16px", borderRadius: "12px 12px 12px 0", color: "#E9EDEF", fontSize: 13, maxWidth: "90%", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", lineHeight: "1.5" }}>
                      ¡Hola Juan! Soy Aukén de Óptica Glow Vision 😎. Vi que estuviste en nuestro operativo pero no concretaste tus lentes. <br/><br/>
                      Justo este viernes volveremos a Punitaqui con una promo especial de 50% de descuento en cristales solo para quienes ya se evaluaron. ¿Te gustaría que te reservemos un cupo para elegir tu marco?
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 12, textAlign: "right" }}>Enviado vía WhatsApp Business API</div>
                 </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {tab === "llamadas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <GlassCard style={{ padding: "30px", borderTop: `2px solid ${C.neonRed}`, background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)` }}>
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>Asistente Telefónico IA (Fase Beta) 🎙️</div>
                <div style={{ fontSize: 14, color: C.textDim }}>IA conversacional con voz humana para agendar pacientes y hacer seguimiento telefónico.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${vapiCallStatus === 'connected' || vapiCallStatus === 'speaking' ? C.neonGreen : vapiCallStatus === 'connecting' ? C.neonAmber : C.neonRed}15`, padding: "8px 16px", borderRadius: 8, border: `1px solid ${vapiCallStatus === 'connected' || vapiCallStatus === 'speaking' ? C.neonGreen : vapiCallStatus === 'connecting' ? C.neonAmber : C.neonRed}40` }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: vapiCallStatus === 'connected' || vapiCallStatus === 'speaking' ? C.neonGreen : vapiCallStatus === 'connecting' ? C.neonAmber : C.neonRed, boxShadow: `0 0 10px ${vapiCallStatus === 'connected' || vapiCallStatus === 'speaking' ? C.neonGreen : vapiCallStatus === 'connecting' ? C.neonAmber : C.neonRed}` }} />
                <span style={{ color: vapiCallStatus === 'connected' || vapiCallStatus === 'speaking' ? C.neonGreen : vapiCallStatus === 'connecting' ? C.neonAmber : C.neonRed, fontSize: 13, fontWeight: 600 }}>
                  {vapiCallStatus === 'connected' ? 'Escuchando...' : vapiCallStatus === 'speaking' ? 'Aukén Hablando 🗣️' : vapiCallStatus === 'connecting' ? 'Conectando...' : 'Motor Desconectado'}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Controles de Llamada */}
              <div style={{ background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                <h4 style={{ fontSize: 14, color: C.textDim, textTransform: "uppercase", marginBottom: 16, letterSpacing: "0.05em" }}>Simulador de Llamada Entrante</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <select style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "12px", borderRadius: 8, outline: "none" }}>
                    <option value="">Simular contexto de llamada entrante...</option>
                    <option value="agenda">Paciente quiere agendar hora médica</option>
                    <option value="dudas">Paciente tiene dudas sobre horario/ubicación</option>
                  </select>
                  <button onClick={vapiCallStatus === 'disconnected' ? handleStartVapiCall : handleStopVapiCall} style={{ background: `linear-gradient(90deg, ${vapiCallStatus === 'disconnected' ? C.neonGreen : C.neonRed}, ${vapiCallStatus === 'disconnected' ? '#10B981' : '#E11D48'})`, color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8, boxShadow: `0 4px 15px ${vapiCallStatus === 'disconnected' ? C.neonGreen : C.neonRed}40`, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                    {vapiCallStatus === 'disconnected' ? '📞 Hablar con Aukén' : '🛑 Cortar Llamada'}
                  </button>
                </div>
              </div>

              {/* Registro de Llamadas */}
              <div style={{ background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column" }}>
                <h4 style={{ fontSize: 14, color: C.textDim, textTransform: "uppercase", marginBottom: 16, letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
                  <span>Historial de Llamadas</span>
                  <span style={{ fontSize: 12, background: C.bg, padding: "2px 8px", borderRadius: 12 }}>Hoy</span>
                </h4>
                
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", border: `1px dashed ${C.border}`, borderRadius: 8, padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📭</div>
                  <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", maxWidth: "80%" }}>
                    No hay llamadas registradas aún. El historial y las grabaciones aparecerán aquí.
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────
export default function AukenOpticaDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [opticaData, setOpticaData] = useState(MI_OPTICA);
  const [vapiCallStatus, setVapiCallStatus] = useState("disconnected");
  const [vapiInstance, setVapiInstance] = useState(null);

  useEffect(() => {
    try {
      const pubKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
      if (pubKey && typeof Vapi !== 'undefined') {
        const vapi = new Vapi(pubKey);
        vapi.on("call-start", () => setVapiCallStatus("connected"));
        vapi.on("call-end", () => setVapiCallStatus("disconnected"));
        vapi.on("speech-start", () => setVapiCallStatus("speaking"));
        vapi.on("speech-end", () => setVapiCallStatus("connected"));
        setVapiInstance(vapi);
      }
    } catch (err) {
      console.warn("Vapi skip:", err);
    }
  }, []);

  const handleStartVapiCall = async () => {
    if (!vapiInstance) return alert("Vapi no configurado.");
    try {
      setVapiCallStatus("connecting");
      await vapiInstance.start(import.meta.env.VITE_VAPI_ASSISTANT_ID);
    } catch (e) {
      console.error(e);
      setVapiCallStatus("disconnected");
      alert("Error al conectar con Vapi");
    }
  };

  const handleStopVapiCall = () => {
    if (vapiInstance) vapiInstance.stop();
  };
  const [showModal, setShowModal] = useState(false);
  const [newLead, setNewLead] = useState({ nombre: "", rut: "", telefono: "", comuna: "", notas: "", sucursal: "Central", recetaImgUrl: null, recetaData: null, estado_compra: "Pendiente", monto_venta: "", operativo: "" });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [sucursalFilter, setSucursalFilter] = useState("Todas");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(MI_OPTICA);

  const handleScanReceta = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX = 800;
        
        if (width > height) {
          if (width > MAX) { height *= MAX / width; width = MAX; }
        } else {
          if (height > MAX) { width *= MAX / height; height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64Full = canvas.toDataURL('image/jpeg', 0.6);
        const base64Str = base64Full.split(',')[1];
        
        try {
          const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Str })
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          const { fecha, OD, OI, adicion, dp } = data.data;
          setNewLead(prev => ({
            ...prev,
            recetaData: { fecha, OD, OI, adicion, dp },
            recetaImgUrl: base64Full
          }));
        } else {
          alert('No se pudo leer la receta.');
        }
      } catch (err) {
        alert('Error conectando con la IA de Visión.');
        } finally {
          setOcrLoading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Helper para recalcular KPIs
  const refreshStats = (list) => {
    const now = new Date();
    const vencidas = list.filter(p => p.recetaData?.fecha && (now - new Date(p.recetaData.fecha)) > 365 * 24 * 60 * 60 * 1000).length;
    const proximas = list.filter(p => p.recetaData?.fecha && (now - new Date(p.recetaData.fecha)) > 330 * 24 * 60 * 60 * 1000 && (now - new Date(p.recetaData.fecha)) <= 365 * 24 * 60 * 60 * 1000).length;
    const vigentes = list.filter(p => !p.recetaData?.fecha || (now - new Date(p.recetaData.fecha)) <= 365 * 24 * 60 * 60 * 1000).length;
    
    setOpticaData(prev => ({
      ...prev,
      patients: list.length,
      recetasVencidas: vencidas,
      proximasControl: proximas,
      vigentes: vigentes,
      pacientesList: list
    }));
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
      const lead = {
        nombre: newLead.nombre,
        rut: newLead.rut,
        telefono: newLead.telefono,
        estado_compra: newLead.estado_compra,
        monto_venta: newLead.monto_venta,
        operativo: newLead.operativo,
        sucursal: newLead.sucursal,
        comuna: newLead.comuna,
        notas_clinicas: newLead.notas,
        fecha_ultima_visita: new Date().toISOString().split('T')[0],
        receta_data: newLead.recetaData,
        receta_img_url: newLead.recetaImgUrl
      };
      
      const { error } = await supabase.from("pacientes").insert([lead]);
      if (!error) {
        setShowModal(false);
        setNewLead({ nombre: "", rut: "", telefono: "", comuna: "", notas: "", sucursal: "Central", recetaImgUrl: null, recetaData: null, estado_compra: "Pendiente", monto_venta: "", operativo: "" });
        // No actualizamos estado local, Realtime lo hará
      } else {
        alert("Error al guardar: " + error.message);
      }
  };

  // Fetch inicial y Suscripción Realtime
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("pacientes").select("*").order('created_at', { ascending: false });
      if (!error && data) {
        const normalized = data.map(p => ({
          ...p,
          recetaImgUrl: p.receta_img_url || p.recetaImgUrl || null
        })).sort((a, b) => new Date(b.created_at || b.fecha_ultima_visita || 0) - new Date(a.created_at || a.fecha_ultima_visita || 0));
        refreshStats(normalized);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 6px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.textMuted}; }
        
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .metrics-grid { grid-template-columns: 1fr !important; }
          .nav-content { padding: 0 16px !important; }
          .main-content { padding: 20px 16px !important; }
          .tab-content { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .patient-modal { width: 95% !important; max-height: 90vh !important; overflow-y: auto !important; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* TOPNAV */}
      <nav className="nav-content" style={{ 
        background: `${C.surface}E6`, 
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`, 
        padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", 
        position: "sticky", top: 0, zIndex: 50 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, " + C.neonBlue + ", " + C.neonBlueD + ")", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, boxShadow: "0 0 15px " + C.neonBlue + "60" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "0.02em" }}>AUKÉN</span>
          <span style={{ color: C.textMuted, margin: "0 8px" }}>/</span>
          <span style={{ fontSize: 13, color: C.textDim, fontWeight: 500 }}>Dashboard Inteligente</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select value={sucursalFilter} onChange={e => setSucursalFilter(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textDim, borderRadius: 8, padding: "6px 12px", fontSize: 12, outline: "none", cursor: "pointer" }}>
            <option value="Todas">Todas las sucursales</option>
            <option value="Central">Central</option>
            <option value="Providencia">Providencia</option>
            <option value="Las Condes">Las Condes</option>
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.neonGreen, fontWeight: 500, background: `${C.neonGreen}10`, padding: "6px 12px", borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.neonGreen, boxShadow: `0 0 8px ${C.neonGreen}` }}></span>
            Sistema Activo
          </div>
          <button 
            onClick={() => { localStorage.removeItem("auken_auth"); navigate("/login"); }}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textDim, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = C.neonRed}
            onMouseLeave={e => e.currentTarget.style.color = C.textDim}
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <div className="main-content" style={{ padding: "40px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: C.textDim, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.neonBlue, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Sincronizando Inteligencia...
          </div>
        ) : (
          <Fade>
            <OpticaDetail 
              optica={opticaData} 
              setOpticaData={setOpticaData} 
              showModal={showModal} 
              setShowModal={setShowModal} 
              sucursalFilter={sucursalFilter}
              setEditingPatient={setEditingPatient}
              setSelectedPatient={setSelectedPatient}
              vapiCallStatus={vapiCallStatus}
              handleStartVapiCall={handleStartVapiCall}
              handleStopVapiCall={handleStopVapiCall}
            />
          </Fade>
        )}
      </div>

      {/* MODAL NUEVO PROSPECTO */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <GlassCard className="patient-modal" style={{ width: 400, background: C.surface }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>Ingresar Prospecto Manual</h3>
            
            {/* OCR Button */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: `${C.neonGreen}20`, border: `1px dashed ${C.neonGreen}60`, color: C.neonGreen, padding: 12, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.neonGreen}30`}
                onMouseLeave={e => e.currentTarget.style.background = `${C.neonGreen}20`}
              >
                {ocrLoading ? "Escaneando receta..." : "📸 Escanear Receta con IA"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleScanReceta} disabled={ocrLoading} />
              </label>
            </div>

            <form onSubmit={handleAddLead} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <select value={newLead.sucursal} onChange={e => setNewLead({...newLead, sucursal: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }}>
                <option value="Central">Sucursal Central</option>
                <option value="Providencia">Sucursal Providencia</option>
                <option value="Las Condes">Sucursal Las Condes</option>
              </select>
              <input required placeholder="Nombre Completo" value={newLead.nombre} onChange={e => setNewLead({...newLead, nombre: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              <input placeholder="RUT (Opcional)" value={newLead.rut} onChange={e => setNewLead({...newLead, rut: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              <div style={{ display: "flex", gap: 12 }}>
                <input required placeholder="Teléfono (+569...)" value={newLead.telefono} onChange={e => setNewLead({...newLead, telefono: e.target.value})} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
                <input required placeholder="Comuna o Ubicación" value={newLead.comuna} onChange={e => setNewLead({...newLead, comuna: e.target.value})} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              </div>
              <textarea placeholder="Notas adicionales (opcional)" value={newLead.notas} onChange={e => setNewLead({...newLead, notas: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none", resize: "none", fontFamily: "'Inter', sans-serif" }} rows={3} />
              
              <input placeholder="Nombre del Operativo (ej. Operativo Macul)" value={newLead.operativo} onChange={e => setNewLead({...newLead, operativo: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              
              <div style={{ display: "flex", gap: 12 }}>
                <select value={newLead.estado_compra} onChange={e => setNewLead({...newLead, estado_compra: e.target.value})} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }}>
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="Compró">✅ Compró</option>
                  <option value="No Compró">❌ No Compró</option>
                </select>
                {newLead.estado_compra === "Compró" && (
                  <input type="number" placeholder="Monto Venta $" value={newLead.monto_venta} onChange={e => setNewLead({...newLead, monto_venta: e.target.value})} style={{ flex: 1, background: C.bg, border: `1px solid ${C.neonGreen}50`, color: C.neonGreen, padding: 12, borderRadius: 8, outline: "none", fontWeight: 700 }} />
                )}
              </div>
              {/* Manual Prescription for New Lead */}
              <div style={{ background: `${C.border}40`, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.neonBlue, textTransform: "uppercase", fontWeight: 700 }}>📋 Ficha Óptica (Editable)</div>
                  {!newLead.recetaData && (
                    <button type="button" onClick={() => setNewLead({...newLead, recetaData: { OD: { esfera: "", cilindro: "", eje: "" }, OI: { esfera: "", cilindro: "", eje: "" }, adicion: "", dp: "" }})} style={{ background: `${C.neonBlue}20`, border: `1px solid ${C.neonBlue}40`, color: C.neonBlue, fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>+ Agregar Datos</button>
                  )}
                </div>
                {newLead.recetaData ? (
                  <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", gap: 8, fontSize: 11 }}>
                    <div style={{ color: C.textMuted }}></div><div style={{ textAlign: "center", color: C.textMuted }}>Esf</div><div style={{ textAlign: "center", color: C.textMuted }}>Cil</div><div style={{ textAlign: "center", color: C.textMuted }}>Eje</div>
                    
                    <div style={{ color: C.neonBlue, fontWeight: 700 }}>OD</div>
                    <input value={newLead.recetaData.OD?.esfera || ""} onChange={e => setNewLead({...newLead, recetaData: {...newLead.recetaData, OD: {...newLead.recetaData.OD, esfera: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 4, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={newLead.recetaData.OD?.cilindro || ""} onChange={e => setNewLead({...newLead, recetaData: {...newLead.recetaData, OD: {...newLead.recetaData.OD, cilindro: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 4, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={newLead.recetaData.OD?.eje || ""} onChange={e => setNewLead({...newLead, recetaData: {...newLead.recetaData, OD: {...newLead.recetaData.OD, eje: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 4, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    
                    <div style={{ color: C.neonBlue, fontWeight: 700 }}>OI</div>
                    <input value={newLead.recetaData.OI?.esfera || ""} onChange={e => setNewLead({...newLead, recetaData: {...newLead.recetaData, OI: {...newLead.recetaData.OI, esfera: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 4, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={newLead.recetaData.OI?.cilindro || ""} onChange={e => setNewLead({...newLead, recetaData: {...newLead.recetaData, OI: {...newLead.recetaData.OI, cilindro: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 4, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={newLead.recetaData.OI?.eje || ""} onChange={e => setNewLead({...newLead, recetaData: {...newLead.recetaData, OI: {...newLead.recetaData.OI, eje: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 4, borderRadius: 4, textAlign: "center", outline: "none" }} />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "10px", color: C.textMuted, fontSize: 11, border: `1px dashed ${C.border}`, borderRadius: 6 }}>
                    Usa el escáner o agrégalos manualmente.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, background: C.neonBlue, border: "none", color: "#fff", padding: 10, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Guardar</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* MODAL FICHA DEL PACIENTE */}
      {selectedPatient && editingPatient && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setSelectedPatient(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 16px 60px rgba(0,0,0,0.6)" }}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${C.surface}, ${C.surfaceL})` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 22, color: C.text }}>{editingPatient.nombre}</div>
                  <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>RUT: {editingPatient.rut || "—"} · Tel: {editingPatient.telefono}</div>
                </div>
                <button onClick={() => setSelectedPatient(null)} style={{ background: "transparent", border: "none", color: C.textMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
            </div>

            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Editable Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Nombre</label>
                  <input value={editingPatient.nombre || ""} onChange={e => setEditingPatient({...editingPatient, nombre: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 6, outline: "none", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>RUT</label>
                  <input value={editingPatient.rut || ""} onChange={e => setEditingPatient({...editingPatient, rut: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 6, outline: "none", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Teléfono</label>
                  <input value={editingPatient.telefono || ""} onChange={e => setEditingPatient({...editingPatient, telefono: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 6, outline: "none", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Estado</label>
                  <select value={editingPatient.estado_compra || "Pendiente"} onChange={e => setEditingPatient({...editingPatient, estado_compra: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 6, outline: "none", fontSize: 13 }}>
                    <option>Pendiente</option><option>Compró</option><option>No Compró</option>
                  </select>
                </div>
              </div>
              
              {editingPatient.estado_compra === "Compró" && (
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Monto de Venta ($CLP)</label>
                  <input type="number" value={editingPatient.monto_venta || ""} onChange={e => setEditingPatient({...editingPatient, monto_venta: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.neonGreen}50`, color: C.neonGreen, padding: 10, borderRadius: 6, outline: "none", fontSize: 16, fontWeight: 700 }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Notas Clínicas</label>
                <textarea value={editingPatient.notas_clinicas || ""} onChange={e => setEditingPatient({...editingPatient, notas_clinicas: e.target.value})} rows={3} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 6, outline: "none", fontSize: 13, resize: "none" }} />
              </div>

              {/* Receta Data (Editable) */}
              <div style={{ background: `${C.border}30`, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.neonBlue, textTransform: "uppercase", fontWeight: 700 }}>📋 Ficha Óptica (Editable)</div>
                  {!editingPatient.recetaData && (
                    <button onClick={() => setEditingPatient({...editingPatient, recetaData: { OD: { esfera: "", cilindro: "", eje: "" }, OI: { esfera: "", cilindro: "", eje: "" }, adicion: "", dp: "" }})} style={{ background: `${C.neonBlue}20`, border: `1px solid ${C.neonBlue}40`, color: C.neonBlue, fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>+ Iniciar Ficha</button>
                  )}
                </div>
                
                {editingPatient.recetaData ? (
                  <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                    <div style={{ color: C.textMuted, fontWeight: 700 }}></div>
                    <div style={{ color: C.textMuted, fontWeight: 700, textAlign: "center" }}>Esfera</div>
                    <div style={{ color: C.textMuted, fontWeight: 700, textAlign: "center" }}>Cilindro</div>
                    <div style={{ color: C.textMuted, fontWeight: 700, textAlign: "center" }}>Eje</div>
                    
                    <div style={{ color: C.neonBlue, fontWeight: 700 }}>OD</div>
                    <input value={editingPatient.recetaData.OD?.esfera || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, OD: {...editingPatient.recetaData.OD, esfera: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={editingPatient.recetaData.OD?.cilindro || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, OD: {...editingPatient.recetaData.OD, cilindro: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={editingPatient.recetaData.OD?.eje || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, OD: {...editingPatient.recetaData.OD, eje: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    
                    <div style={{ color: C.neonBlue, fontWeight: 700 }}>OI</div>
                    <input value={editingPatient.recetaData.OI?.esfera || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, OI: {...editingPatient.recetaData.OI, esfera: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={editingPatient.recetaData.OI?.cilindro || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, OI: {...editingPatient.recetaData.OI, cilindro: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, textAlign: "center", outline: "none" }} />
                    <input value={editingPatient.recetaData.OI?.eje || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, OI: {...editingPatient.recetaData.OI, eje: e.target.value}}})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, textAlign: "center", outline: "none" }} />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "10px", color: C.textMuted, fontSize: 12, border: `1px dashed ${C.border}`, borderRadius: 6 }}>
                    No hay datos clínicos registrados.
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: C.textMuted }}>ADD</label>
                    <input value={editingPatient.recetaData?.adicion || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, adicion: e.target.value}})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, outline: "none", fontSize: 12 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: C.textMuted }}>DP</label>
                    <input value={editingPatient.recetaData?.dp || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, dp: e.target.value}})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, outline: "none", fontSize: 12 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: C.textMuted }}>Fecha</label>
                    <input value={editingPatient.recetaData?.fecha || ""} onChange={e => setEditingPatient({...editingPatient, recetaData: {...editingPatient.recetaData, fecha: e.target.value}})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 6, borderRadius: 4, outline: "none", fontSize: 12 }} />
                  </div>
                </div>
              </div>

              {/* Receta Image (Existing or Upload) */}
              <div style={{ background: `${C.border}20`, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>📷 Imagen de Receta</div>
                {editingPatient.recetaImgUrl ? (
                  <div style={{ position: "relative" }}>
                    <img src={editingPatient.recetaImgUrl} alt="Receta" style={{ width: "100%", borderRadius: 8, border: `1px solid ${C.border}` }} />
                    <button onClick={() => setEditingPatient({...editingPatient, recetaImgUrl: null})} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: `2px dashed ${C.border}`, borderRadius: 8, padding: "20px 0", cursor: "pointer", transition: "0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.neonBlue}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <span style={{ fontSize: 24 }}>📤</span>
                    <span style={{ fontSize: 11, color: C.textDim }}>Subir Foto de Receta</span>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setEditingPatient({...editingPatient, recetaImgUrl: ev.target.result});
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={() => setSelectedPatient(null)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cerrar</button>
                <button onClick={async () => {
                  // Guardar cambios en Supabase
                  const { error } = await supabase.from("pacientes").update({
                    nombre: editingPatient.nombre,
                    rut: editingPatient.rut,
                    telefono: editingPatient.telefono,
                    estado_compra: editingPatient.estado_compra,
                    monto_venta: editingPatient.monto_venta,
                    notas_clinicas: editingPatient.notas_clinicas,
                    receta_data: editingPatient.recetaData, 
                    receta_img_url: editingPatient.recetaImgUrl,
                  }).eq("id", selectedPatient.id);

                  if (!error) {
                    setOpticaData(prev => ({
                      ...prev,
                      pacientesList: prev.pacientesList.map(p => p.id === selectedPatient.id ? { ...p, ...editingPatient } : p)
                    }));
                    setSelectedPatient(null);
                  } else {
                    alert("Error al actualizar paciente: " + error.message);
                  }
                }} style={{ flex: 1, background: C.neonBlue, border: "none", color: "#fff", padding: 12, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  💾 Guardar Cambios
                </button>
              </div>

              {/* DIGITAL RECEIPT SECTION */}
              {editingPatient.estado_compra === "Compró" && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 10 }}>
                   <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Configuración de Comprobante Digital 🎫</div>
                   
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Fecha de Retiro</label>
                        <input type="date" value={editingPatient.fecha_retiro || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]} onChange={e => setEditingPatient({...editingPatient, fecha_retiro: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 6, fontSize: 12 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Lugar de Entrega</label>
                        <input value={editingPatient.sucursal_entrega || o.city} onChange={e => setEditingPatient({...editingPatient, sucursal_entrega: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 6, fontSize: 12 }} />
                      </div>
                   </div>

                   <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => {
                        const msg = `¡Hola ${editingPatient.nombre}! ✨ Bienvenido a Óptica Glow Vision. Es un placer saludarte.\n\nEstamos procesando tu orden. Te avisaremos apenas tus lentes estén listos para retiro. 👓`;
                        window.open(`https://wa.me/${editingPatient.telefono.replace(/\+/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                      }} style={{ flex: 1, background: `${C.neonBlue}20`, color: C.neonBlue, border: `1px solid ${C.neonBlue}40`, padding: "10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        👋 Saludo Bienvenida
                      </button>
                      
                      <button onClick={() => {
                        const f = editingPatient.fecha_retiro || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                        const s = editingPatient.sucursal_entrega || o.city;
                        const msg = `¡Hola ${editingPatient.nombre}! 🎫 Tu orden en Óptica Glow Vision ha sido confirmada.\n\n📅 Fecha estimada de retiro: ${f.split('-').reverse().join('/')}\n👓 Monto pagado: $${editingPatient.monto_venta || '0'}\n📍 Lugar: ${s}\n\nPresenta este mensaje al retirar. ¡Nos vemos!`;
                        window.open(`https://wa.me/${editingPatient.telefono.replace(/\+/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                      }} style={{ flex: 2, background: "#25D366", color: "#fff", border: "none", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <span>📱</span> Enviar Ticket WhatsApp
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL EDITAR PERFIL ÓPTICA */}
      {showProfileModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}>
          <GlassCard style={{ width: 450, padding: 30 }}>
            <h2 style={{ fontSize: 20, marginBottom: 20, color: C.text }}>Editar Perfil de Óptica</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>Nombre Comercial</label>
                <input value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>Ubicación Principal</label>
                <input value={editingProfile.city} onChange={e => setEditingProfile({...editingProfile, city: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>Teléfono Contacto</label>
                  <input value={editingProfile.phone} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>Plan</label>
                  <select value={editingProfile.plan} onChange={e => setEditingProfile({...editingProfile, plan: e.target.value})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }}>
                    <option>Aukén Basic</option>
                    <option>Aukén Pro</option>
                    <option>Multi-Sucursal</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button onClick={() => setShowProfileModal(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                <button onClick={() => {
                  setOpticaData(prev => ({ ...prev, ...editingProfile }));
                  setShowProfileModal(false);
                  alert("Perfil actualizado correctamente");
                }} style={{ flex: 1, background: C.neonBlue, color: "#fff", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>💾 Guardar Cambios</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
