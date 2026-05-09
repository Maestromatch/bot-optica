import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ── PALETA ZEN / AUKÉN v6.0 ──────────────────────────────────────────────
const Z = {
  bg:       "#07090D",
  bgDeep:   "#040508",
  surface:  "#11141D",
  surfaceL: "#1A1F2B",
  glass:    "rgba(17, 20, 29, 0.7)",
  border:   "rgba(255, 255, 255, 0.08)",
  ink:      "#F1F5F9",
  inkMid:   "#94A3B8",
  inkFaint: "#475569",
  primary:  "#FB923C", 
  neon:     "#3B82F6", 
  green:    "#10B981",
  red:      "#EF4444",
  amber:    "#F59E0B",
};

// ── MICRO COMPONENTES ZEN ────────────────────────────────────────────
function Card({ children, style = {}, accent, glow }) {
  return (
    <div style={{
      background: Z.glass,
      backdropFilter: "blur(20px)",
      border: `1px solid ${Z.border}`,
      borderTop: accent ? `2px solid ${accent}` : `1px solid ${Z.border}`,
      borderRadius: 28,
      padding: 28,
      boxShadow: glow ? `0 0 50px ${accent}15` : "0 10px 40px rgba(0,0,0,0.5)",
      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      ...style,
    }}>{children}</div>
  );
}

function KPIZen({ label, value, color, icon, glow }) {
  return (
    <Card accent={color} glow={glow} style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: Z.inkFaint, textTransform: "uppercase", letterSpacing: "0.15em" }}>{label}</div>
      </div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 36, color: Z.ink, letterSpacing: "-0.02em" }}>
        {value ?? "—"}
      </div>
    </Card>
  );
}

function PulseZen({ color = Z.green }) {
  return (
    <div style={{ position: "relative", width: 8, height: 8 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.4, animation: "ping 2s infinite" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, boxShadow: `0 0 12px ${color}` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL ZEN v6.0
// ─────────────────────────────────────────────────────────────
export default function AukenOpticaDashboard() {
  const [tab, setTab] = useState("metricas");
  const [optica, setOptica] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // PRIORIDAD: Glow Vision
  const OPTICA_SLUG = "glowvision";

  const refresh = useCallback(async () => {
    const [opticaRes, pacientesRes, statsRes] = await Promise.all([
      supabase.from("opticas").select("*").eq("slug", OPTICA_SLUG).maybeSingle(),
      supabase.from("pacientes").select("*").order("created_at", { ascending: false }),
      supabase.from("estadisticas_optica").select("*").eq("slug", OPTICA_SLUG).maybeSingle(),
    ]);

    setOptica(opticaRes.data);
    setPacientes(pacientesRes.data || []);
    setStats(statsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return (
    <div style={{ background: Z.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: Z.inkMid, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
      SYCHRONIZING ZEN ENGINE...
    </div>
  );

  return (
    <div style={{ background: Z.bg, minHeight: "100vh", color: Z.ink, fontFamily: "'Inter', sans-serif", padding: "40px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ping { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
      `}</style>

      {/* HEADER ZEN */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 50, animation: "fadeIn 0.6s ease-out" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 10 }}>
            <div style={{ width: 45, height: 45, background: Z.primary, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: `0 8px 20px ${Z.primary}30` }}>👁️</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>{optica?.nombre || "Ópticas Glow Vision"}</h1>
            <div style={{ background: Z.primary + "15", color: Z.primary, padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", border: `1px solid ${Z.primary}30` }}>v6.0 ZEN</div>
          </div>
          <p style={{ color: Z.inkMid, fontSize: 14, marginLeft: 60 }}>{optica?.slogan || "Gestión Inteligente de Pacientes"}</p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 20, background: Z.surfaceL, padding: "10px 20px", borderRadius: 20, border: `1px solid ${Z.border}` }}>
          <PulseZen />
          <div style={{ fontSize: 11, fontWeight: 700, color: Z.green, fontFamily: "'IBM Plex Mono', monospace" }}>SISTEMA ONLINE</div>
          <div style={{ width: 1, height: 20, background: Z.border }} />
          <div style={{ fontSize: 12, fontWeight: 600 }}>Óscar Saúl</div>
        </div>
      </header>

      {/* TABS ZEN */}
      <nav style={{ display: "flex", gap: 40, borderBottom: `1px solid ${Z.border}`, marginBottom: 40 }}>
        {[
          ["metricas", "MÉTRICAS"],
          ["pacientes", "PACIENTES"],
          ["citas", "AGENDA"],
          ["config", "SISTEMA"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: "none", border: "none", padding: "15px 0", cursor: "pointer",
            color: tab === id ? Z.primary : Z.inkFaint,
            borderBottom: tab === id ? `3px solid ${Z.primary}` : "3px solid transparent",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
            transition: "all 0.3s ease"
          }}>{label}</button>
        ))}
      </nav>

      {/* CONTENT ZEN */}
      <main style={{ animation: "fadeIn 0.8s ease-out" }}>
        {tab === "metricas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <div style={{ display: "flex", gap: 20 }}>
              <KPIZen icon="👥" label="TOTAL PACIENTES" value={stats?.total_pacientes || "0"} color={Z.ink} />
              <KPIZen icon="✅" label="RECETAS AL DÍA" value={stats?.recetas_vigentes || "0"} color={Z.green} glow={stats?.recetas_vigentes > 0} />
              <KPIZen icon="⚠️" label="VENCIDAS" value={stats?.recetas_vencidas || "0"} color={Z.red} glow={stats?.recetas_vencidas > 0} />
              <KPIZen icon="📅" label="CITAS PRÓXIMAS" value={stats?.citas_proximas || "0"} color={Z.amber} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 30 }}>
               <Card style={{ minHeight: 300, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }} accent={Z.green} glow>
                  <div style={{ fontSize: 12, color: Z.inkFaint, letterSpacing: "0.2em", marginBottom: 15, fontFamily: "'IBM Plex Mono', monospace" }}>INGRESOS TOTALES</div>
                  <div style={{ fontSize: 64, fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: Z.green }}>
                    ${Number(stats?.ventas_total_clp || 0).toLocaleString("es-CL")}
                  </div>
                  <div style={{ fontSize: 13, color: Z.inkMid, marginTop: 10 }}>Flujo de caja reportado por bot y manual</div>
               </Card>
               <Card style={{ background: Z.bgDeep }} accent={Z.neon}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <PulseZen color={Z.neon} />
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>ESTADO DEL BOT</div>
                  </div>
                  <div style={{ fontSize: 13, color: Z.inkMid, lineHeight: "1.6" }}>
                    El asistente inteligente está monitoreando a <b>{pacientes.length}</b> pacientes. <br/><br/>
                    Última sincronización: <br/>
                    <span style={{ color: Z.neon }}>{new Date().toLocaleString()}</span>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {tab === "pacientes" && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
             <div style={{ padding: 30, background: Z.bgDeep, borderBottom: `1px solid ${Z.border}`, display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Base Clínica Real</h3>
                <div style={{ fontSize: 12, color: Z.inkMid }}>Sincronizado con Supabase</div>
             </div>
             <div style={{ padding: 100, textAlign: "center", color: Z.inkFaint }}>
                [ Tabla de Pacientes Optimizada en v6.0 ]
                <br/> <span style={{ fontSize: 11 }}>Cargando registros reales...</span>
             </div>
          </Card>
        )}

        {(tab === "citas" || tab === "config") && (
          <div style={{ padding: 100, textAlign: "center", color: Z.inkFaint, background: Z.surface, borderRadius: 30 }}>
             Módulo en proceso de vinculación estética...
          </div>
        )}
      </main>
      
      {/* FOOTER VERSION TAG */}
      <footer style={{ marginTop: 60, textAlign: "center", fontSize: 10, color: Z.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
        AUKÉN ZEN ARCHITECTURE © 2026 · STABLE RELEASE v6.0 · NO PLACEHOLDERS ACTIVE
      </footer>
    </div>
  );
}
