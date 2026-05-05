import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

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
  neonBlue:   "#38BDF8", // Cyan brillante
  neonBlueD:  "#0284C7", 
  neonGreen:  "#10B981", // Esmeralda
  neonAmber:  "#F59E0B", // Ambar/Dorado
  neonRed:    "#F43F5E", // Rosa/Rojo
};

// ── CONFIGURACIÓN DE LA ÓPTICA PRINCIPAL ───────────────────────
const MI_OPTICA = {
  id: 1, 
  name: "Óptica Visión Clara", 
  city: "Providencia",
  plan: "Aukén Pro", 
  status: "active", 
  since: "2025-01-15",
  owner: "Administrador", 
  phone: "+56987654321",
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

// ── DETALLE ÓPTICA ───────────────────────────────────────────────
function OpticaDetail({ optica: o }) {
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
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 28, color: C.text }}>{o.name}</div>
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
        {["Métricas", "Pacientes", "Campañas IA"].map(t => {
          const id = t.toLowerCase().split(" ")[0];
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              background: active ? C.surfaceL : "transparent",
              color: active ? C.text : C.textDim,
              border: active ? `1px solid ${C.borderGlow}` : "1px solid transparent",
              borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: active ? 600 : 500,
              cursor: "pointer", transition: "all 0.2s"
            }}>
              {t}
            </button>
          );
        })}
      </div>

      {tab === "metricas" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          {/* Main KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
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
                      <button style={{ background: C.neonRed, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Resolver</button>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </Fade>
          </div>
        </div>
      )}

      {tab !== "metricas" && (
        <Fade>
          <GlassCard style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", borderStyle: "dashed" }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.5 }}>🚧</div>
            <div style={{ fontSize: 14, color: C.textDim }}>Módulo de {tab} en desarrollo.</div>
          </GlassCard>
        </Fade>
      )}
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────
export default function AukenOpticaDashboard() {
  const [loading, setLoading] = useState(true);
  const [opticaData, setOpticaData] = useState(MI_OPTICA);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from("pacientes").select("*");
      if (error) {
        console.error("Error cargando pacientes para dashboard:", error);
        setLoading(false);
        return;
      }

      let vencidas = 0;
      let proximas = 0;
      let vigentes = 0;
      const hoy = new Date();

      data.forEach(p => {
        if (!p.fecha_proximo_control) return;
        const control = new Date(p.fecha_proximo_control);
        const dias = Math.round((control - hoy) / (1000 * 60 * 60 * 24));
        if (dias < 0) vencidas++;
        else if (dias <= 30) proximas++;
        else vigentes++;
      });

      setOpticaData(prev => ({
        ...prev,
        patients: data.length,
        recetasVencidas: vencidas,
        proximasControl: proximas,
        vigentes: vigentes,
        consultasMes: 15,
        citasAgendadas: 2,
        recordatoriosEnviados: 5,
        recuperados: 1,
        weeklyConsultas: [1, 2, 0, 1, 3, 2, 1, 4, 2, 3, 1, 5],
        weeklyRecuperados: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        alertas: vencidas > 0 ? [`${vencidas} recetas vencidas pendientes de contactar`] : [],
      }));

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
      `}</style>

      {/* TOPNAV */}
      <nav style={{ 
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.neonGreen, fontWeight: 500, background: `${C.neonGreen}10`, padding: "6px 12px", borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.neonGreen, boxShadow: `0 0 8px ${C.neonGreen}` }}></span>
            Sistema Activo
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <div style={{ padding: "40px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: C.textDim, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.neonBlue, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Sincronizando Inteligencia...
          </div>
        ) : (
          <Fade>
            <OpticaDetail optica={opticaData} />
          </Fade>
        )}
      </div>
    </div>
  );
}
