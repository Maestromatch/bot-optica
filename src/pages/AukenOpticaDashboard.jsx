import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ── SISTEMA DE DISEÑO ZEN v6.0 ──────────────────────────────────────────
const Z = {
  bg:       "#07090D",
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

// ── COMPONENTES REUTILIZABLES ───────────────────────────────────────
function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: Z.glass, backdropFilter: "blur(20px)", border: `1px solid ${Z.border}`,
      borderTop: accent ? `2px solid ${accent}` : `1px solid ${Z.border}`,
      borderRadius: 24, padding: 24, transition: "all 0.3s ease", ...style
    }}>{children}</div>
  );
}

function StatusPill({ status }) {
  const map = {
    vigente:  { c: Z.green, bg: Z.green + "15", l: "Vigente" },
    vencida:  { c: Z.red,   bg: Z.red + "15",   l: "Vencida" },
    proxima:  { c: Z.amber, bg: Z.amber + "15", l: "Próxima" },
  };
  const s = map[status] || { c: Z.inkMid, bg: Z.surfaceL, l: status };
  return (
    <span style={{ color: s.c, background: s.bg, padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{s.l}</span>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function AukenOpticaDashboard() {
  const [tab, setTab] = useState("metricas");
  const [optica, setOptica] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const OPTICA_SLUG = "glowvision";

  const refreshData = useCallback(async () => {
    // 1. Cargar datos de la Óptica
    const { data: optRes } = await supabase.from("opticas").select("*").eq("slug", OPTICA_SLUG).maybeSingle();
    
    // 2. Cargar Pacientes Reales
    const { data: pacRes } = await supabase.from("pacientes").select("*").order("created_at", { ascending: false });

    // 3. Cargar Citas Reales (Agenda)
    const { data: citaRes } = await supabase.from("citas").select("*").order("fecha", { ascending: true });

    // 4. Cargar Estadísticas
    const { data: statRes } = await supabase.from("estadisticas_optica").select("*").eq("slug", OPTICA_SLUG).maybeSingle();

    setOptica(optRes);
    setPacientes(pacRes || []);
    setCitas(citaRes || []);
    setStats(statRes);
    setLoading(false);
    
    // SEO Profesional: Título dinámico
    document.title = `${optRes?.nombre || "Dashboard"} | Aukén Zen v6.0`;
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  if (loading) return <div style={{ background: Z.bg, color: Z.inkMid, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>ZEN ENGINE INITIALIZING...</div>;

  return (
    <div style={{ background: Z.bg, minHeight: "100vh", color: Z.ink, fontFamily: "'Inter', sans-serif", padding: "40px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 15px 20px; font-size: 11px; color: ${Z.inkFaint}; text-transform: uppercase; letter-spacing: 0.1em; }
        td { padding: 15px 20px; border-top: 1px solid ${Z.border}; font-size: 13px; }
        tr:hover { background: ${Z.surfaceL}; }
      `}</style>

      {/* HEADER DINÁMICO */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 50 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div style={{ width: 40, height: 40, background: Z.primary, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👁️</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 700, margin: 0 }}>{optica?.nombre || "Ópticas Glow Vision"}</h1>
            <span style={{ fontSize: 9, background: Z.primary + "20", color: Z.primary, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>v6.0 ZEN</span>
          </div>
          <p style={{ color: Z.inkMid, fontSize: 13, margin: "5px 0 0 55px" }}>{optica?.slogan || "Gestión Inteligente de Pacientes"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, background: Z.surfaceL, padding: "8px 20px", borderRadius: 16, border: `1px solid ${Z.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: Z.green, boxShadow: `0 0 10px ${Z.green}` }} />
          <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{optica?.configuracion?.owner_name || "GESTOR ACTIVO"}</div>
        </div>
      </header>

      {/* NAVEGACIÓN */}
      <nav style={{ display: "flex", gap: 40, borderBottom: `1px solid ${Z.border}`, marginBottom: 40 }}>
        {[
          ["metricas", "MÉTRICAS"],
          ["pacientes", "PACIENTES"],
          ["agenda", "AGENDA"],
          ["sistema", "SISTEMA"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: "none", border: "none", padding: "15px 0", cursor: "pointer",
            color: tab === id ? Z.primary : Z.inkFaint,
            borderBottom: tab === id ? `3px solid ${Z.primary}` : "3px solid transparent",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", transition: "0.3s"
          }}>{l}</button>
        ))}
      </nav>

      {/* CONTENIDO OPERATIVO */}
      <main>
        {tab === "metricas" && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              <Card accent={Z.ink}>
                 <div style={{ fontSize: 10, color: Z.inkFaint, marginBottom: 10 }}>PACIENTES TOTALES</div>
                 <div style={{ fontSize: 32, fontWeight: 700 }}>{pacientes.length}</div>
              </Card>
              <Card accent={Z.green}>
                 <div style={{ fontSize: 10, color: Z.inkFaint, marginBottom: 10 }}>RECETAS VIGENTES</div>
                 <div style={{ fontSize: 32, fontWeight: 700, color: Z.green }}>{pacientes.filter(p => p.estado === "vigente").length}</div>
              </Card>
              <Card accent={Z.amber}>
                 <div style={{ fontSize: 10, color: Z.inkFaint, marginBottom: 10 }}>AGENDA PRÓXIMA</div>
                 <div style={{ fontSize: 32, fontWeight: 700, color: Z.amber }}>{citas.length}</div>
              </Card>
              <Card accent={Z.neon}>
                 <div style={{ fontSize: 10, color: Z.inkFaint, marginBottom: 10 }}>SLA BOT 24/7</div>
                 <div style={{ fontSize: 32, fontWeight: 700, color: Z.neon }}>99.9%</div>
              </Card>
           </div>
        )}

        {tab === "pacientes" && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
             <table>
                <thead>
                  <tr><th>Paciente</th><th>RUT / ID</th><th>Estado Receta</th><th>Próximo Control</th></tr>
                </thead>
                <tbody>
                  {pacientes.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td style={{ color: Z.inkMid }}>{p.rut}</td>
                      <td><StatusPill status={p.estado} /></td>
                      <td style={{ fontFamily: "monospace" }}>{p.fecha_proximo_control || "Pendiente"}</td>
                    </tr>
                  ))}
                  {pacientes.length === 0 && <tr><td colSpan="4" style={{ textAlign: "center", padding: 50, color: Z.inkFaint }}>No hay pacientes registrados aún.</td></tr>}
                </tbody>
             </table>
          </Card>
        )}

        {tab === "agenda" && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
             <table>
                <thead>
                  <tr><th>Fecha</th><th>Paciente</th><th>Motivo</th><th>Canal</th></tr>
                </thead>
                <tbody>
                  {citas.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: Z.neon, fontWeight: 700 }}>{new Date(c.fecha).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{c.paciente_nombre}</td>
                      <td>{c.motivo || "Examen Visual"}</td>
                      <td><span style={{ fontSize: 10, background: "#25D36620", color: "#25D366", padding: "3px 8px", borderRadius: 4 }}>WHATSAPP</span></td>
                    </tr>
                  ))}
                  {citas.length === 0 && <tr><td colSpan="4" style={{ textAlign: "center", padding: 50, color: Z.inkFaint }}>No hay citas agendadas para hoy.</td></tr>}
                </tbody>
             </table>
          </Card>
        )}

        {tab === "sistema" && (
          <div style={{ maxWidth: 600 }}>
             <Card accent={Z.primary}>
                <h3 style={{ fontSize: 16, marginBottom: 20 }}>Configuración de la Óptica</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                   <div>
                      <label style={{ fontSize: 11, color: Z.inkFaint }}>NOMBRE COMERCIAL</label>
                      <input defaultValue={optica?.nombre} style={{ width: "100%", background: Z.surface, border: `1px solid ${Z.border}`, color: Z.ink, padding: 12, borderRadius: 8, marginTop: 5 }} />
                   </div>
                   <div>
                      <label style={{ fontSize: 11, color: Z.inkFaint }}>SLOGAN / DESCRIPCIÓN</label>
                      <input defaultValue={optica?.slogan} style={{ width: "100%", background: Z.surface, border: `1px solid ${Z.border}`, color: Z.ink, padding: 12, borderRadius: 8, marginTop: 5 }} />
                   </div>
                   <button onClick={() => alert("Cambios guardados localmente (Demo)")} style={{ background: Z.primary, color: Z.bgDeep, border: "none", padding: "12px", borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 10 }}>GUARDAR CAMBIOS</button>
                </div>
             </Card>
          </div>
        )}
      </main>

      <footer style={{ marginTop: 60, textAlign: "center", fontSize: 10, color: Z.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
        AUKÉN ZEN OPERATIONAL ENGINE v6.0 · REALTIME SYNC ACTIVE
      </footer>
    </div>
  );
}
