import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ── SISTEMA DE DISEÑO ZEN PREMIUM v6.5 ──────────────────────────────────
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
  grad:     "linear-gradient(135deg, #FB923C 0%, #F59E0B 100%)",
};

// ── COMPONENTES DE ALTO NIVEL ───────────────────────────────────────
function Card({ children, style = {}, accent, glow, hover }) {
  return (
    <div style={{
      background: Z.glass, backdropFilter: "blur(24px)", border: `1px solid ${Z.border}`,
      borderTop: accent ? `3px solid ${accent}` : `1px solid ${Z.border}`,
      borderRadius: 28, padding: 28, position: "relative", overflow: "hidden",
      boxShadow: glow ? `0 20px 40px ${accent}15` : "0 10px 30px rgba(0,0,0,0.3)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      cursor: hover ? "pointer" : "default",
      ...style
    }} className={hover ? "hover-card" : ""}>{children}</div>
  );
}

function MetricCard({ label, value, sub, icon, color }) {
  return (
    <Card accent={color} glow>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
        <div style={{ width: 40, height: 40, background: color + "15", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: Z.inkFaint, letterSpacing: "0.15em" }}>{label}</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: Z.ink }}>{value}</div>
      <div style={{ fontSize: 12, color: Z.inkMid, marginTop: 5 }}>{sub}</div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function AukenOpticaDashboard() {
  const [tab, setTab] = useState("metricas");
  const [optica, setOptica] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [selectedP, setSelectedP] = useState(null);
  const [citas, setCitas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const OPTICA_SLUG = "glowvision";

  const refresh = useCallback(async () => {
    const [optRes, pacRes, citaRes, statRes] = await Promise.all([
      supabase.from("opticas").select("*").eq("slug", OPTICA_SLUG).maybeSingle(),
      supabase.from("pacientes").select("*").order("created_at", { ascending: false }),
      supabase.from("citas").select("*").order("fecha", { ascending: true }),
      supabase.from("estadisticas_optica").select("*").eq("slug", OPTICA_SLUG).maybeSingle()
    ]);

    setOptica(optRes.data);
    setPacientes(pacRes.data || []);
    setCitas(citaRes.data || []);
    setStats(statRes.data);
    setLoading(false);
    document.title = `Aukén Dashboard | ${optRes.data?.nombre || "Glow Vision"}`;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <div style={{ background: Z.bg, color: Z.inkMid, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", letterSpacing: "0.5em" }}>ZEN ENGINE AWAKENING...</div>;

  return (
    <div style={{ background: Z.bg, minHeight: "100vh", color: Z.ink, fontFamily: "'Inter', sans-serif", padding: "40px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .hover-card:hover { transform: translateY(-5px); border-color: ${Z.primary}40; background: ${Z.surfaceL}; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 20px; font-size: 10px; color: ${Z.inkFaint}; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; }
        td { padding: 20px; border-top: 1px solid ${Z.border}; font-size: 14px; }
        .patient-row { cursor: pointer; transition: 0.2s; }
        .patient-row:hover { background: ${Z.surfaceL}; }
      `}</style>

      {/* TOP HEADER PREMIUM */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 60, height: 60, background: Z.grad, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: `0 10px 30px ${Z.primary}40` }}>👁️</div>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>{optica?.nombre || "Ópticas Glow Vision"}</h1>
            <p style={{ color: Z.inkMid, fontSize: 14, margin: "5px 0 0 0" }}>{optica?.slogan || "Gestión Inteligente de Pacientes"}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
           <Card style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, borderRadius: 18 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: Z.green, boxShadow: `0 0 10px ${Z.green}` }} />
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{optica?.configuracion?.owner_name || "GESTOR ACTIVO"}</div>
           </Card>
        </div>
      </header>

      {/* TABS NAVEGACIÓN */}
      <nav style={{ display: "flex", gap: 50, borderBottom: `1px solid ${Z.border}`, marginBottom: 50 }}>
        {[
          ["metricas", "MÉTRICAS CORE"],
          ["pacientes", "BASE CLÍNICA"],
          ["agenda", "AGENDA IA"],
          ["sistema", "CONFIGURACIÓN"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => {setTab(id); setSelectedP(null);}} style={{
            background: "none", border: "none", padding: "20px 0", cursor: "pointer",
            color: tab === id ? Z.primary : Z.inkFaint,
            borderBottom: tab === id ? `4px solid ${Z.primary}` : "4px solid transparent",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", transition: "0.4s"
          }}>{l}</button>
        ))}
      </nav>

      {/* ÁREA DE CONTENIDO */}
      <main>
        {tab === "metricas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 25 }}>
               <MetricCard label="INGRESOS" value={`$${(stats?.ventas_total_clp || 0).toLocaleString()}`} sub="+12% vs mes pasado" icon="💰" color={Z.green} />
               <MetricCard label="CONVERSIÓN" value={`${stats?.tasa_cierre || 0}%`} sub="Leads a Ventas" icon="⚡" color={Z.neon} />
               <MetricCard label="RECETAS VIGENTES" value={pacientes.filter(p => p.estado === "vigente").length} sub="Pacientes activos" icon="✅" color={Z.primary} />
               <MetricCard label="AGENDA" value={citas.length} sub="Citas esta semana" icon="📅" color={Z.amber} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 30 }}>
               <Card accent={Z.primary} glow>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 25, color: Z.inkMid }}>RENDIMIENTO DE CAMPAÑA</h3>
                  <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 15, padding: "0 20px" }}>
                     {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                       <div key={i} style={{ flex: 1, height: `${h}%`, background: Z.grad, borderRadius: "8px 8px 0 0", opacity: 0.8 + (h/500) }} />
                     ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 15, fontSize: 10, color: Z.inkFaint, fontFamily: "monospace" }}>
                     <span>LUN</span><span>MAR</span><span>MIE</span><span>JUE</span><span>VIE</span><span>SAB</span><span>DOM</span>
                  </div>
               </Card>
               <Card accent={Z.amber}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>ALERTAS DEL SISTEMA</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                     <div style={{ background: Z.red + "10", padding: 15, borderRadius: 15, borderLeft: `4px solid ${Z.red}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>3 Recetas Vencen Hoy</div>
                        <div style={{ fontSize: 11, color: Z.inkMid }}>El bot necesita permiso para re-contactar.</div>
                     </div>
                     <div style={{ background: Z.neon + "10", padding: 15, borderRadius: 15, borderLeft: `4px solid ${Z.neon}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>Nueva Cita vía WhatsApp</div>
                        <div style={{ fontSize: 11, color: Z.inkMid }}>Paciente: Ismael Ferreira · 10:30 AM</div>
                     </div>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {tab === "pacientes" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedP ? "1fr 400px" : "1fr", gap: 30 }}>
             <Card style={{ padding: 0, overflow: "hidden" }}>
                <table>
                   <thead>
                     <tr><th>Nombre del Paciente</th><th>RUT</th><th>Estado Clínica</th><th>Acciones</th></tr>
                   </thead>
                   <tbody>
                     {pacientes.map(p => (
                       <tr key={p.id} className="patient-row" onClick={() => setSelectedP(p)}>
                         <td>
                            <div style={{ fontWeight: 700 }}>{p.nombre}</div>
                            <div style={{ fontSize: 11, color: Z.inkMid }}>{p.telefono}</div>
                         </td>
                         <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.rut}</td>
                         <td>
                            <span style={{ 
                              background: p.estado === "vigente" ? Z.green + "15" : Z.red + "15",
                              color: p.estado === "vigente" ? Z.green : Z.red,
                              padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800
                            }}>{p.estado.toUpperCase()}</span>
                         </td>
                         <td><button style={{ background: Z.surfaceL, border: "none", color: Z.ink, padding: "5px 12px", borderRadius: 8, fontSize: 11 }}>VER FICHA</button></td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </Card>

             {selectedP && (
               <Card accent={Z.primary} style={{ animation: "slideIn 0.3s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 25 }}>
                     <h3 style={{ fontSize: 20, fontWeight: 700 }}>Ficha Técnica</h3>
                     <button onClick={() => setSelectedP(null)} style={{ background: "none", border: "none", color: Z.inkFaint, cursor: "pointer" }}>✕</button>
                  </div>
                  
                  <div style={{ background: Z.bgDeep, borderRadius: 20, padding: 20, marginBottom: 20 }}>
                     <div style={{ fontSize: 11, color: Z.inkMid, marginBottom: 15 }}>RECETA ACTUAL</div>
                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                        <div style={{ background: Z.surface, padding: 12, borderRadius: 12 }}>
                           <div style={{ fontSize: 9, color: Z.inkFaint }}>OD</div>
                           <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedP.od_esfera || "—"} | {selectedP.od_cilindro || "—"}</div>
                        </div>
                        <div style={{ background: Z.surface, padding: 12, borderRadius: 12 }}>
                           <div style={{ fontSize: 9, color: Z.inkFaint }}>OI</div>
                           <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedP.oi_esfera || "—"} | {selectedP.oi_cilindro || "—"}</div>
                        </div>
                     </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                     <div style={{ fontSize: 11, color: Z.inkMid, marginBottom: 10 }}>ARCHIVOS Y RECETAS</div>
                     <div style={{ border: `2px dashed ${Z.border}`, borderRadius: 20, padding: 30, textAlign: "center" }}>
                        <div style={{ fontSize: 24, marginBottom: 10 }}>📸</div>
                        <div style={{ fontSize: 12, color: Z.inkFaint }}>Subir Foto de Receta</div>
                     </div>
                  </div>

                  <button style={{ width: "100%", background: Z.primary, color: Z.bgDeep, padding: 15, borderRadius: 15, fontWeight: 700, border: "none", cursor: "pointer" }}>GUARDAR CAMBIOS</button>
               </Card>
             )}
          </div>
        )}

        {tab === "agenda" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
             {citas.map(c => (
               <Card key={c.id} hover accent={Z.neon}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
                     <span style={{ fontSize: 11, fontWeight: 700, color: Z.neon }}>{new Date(c.fecha).toLocaleDateString()}</span>
                     <span style={{ fontSize: 10, color: Z.inkMid }}>{new Date(c.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 5 }}>{c.paciente_nombre}</div>
                  <div style={{ fontSize: 12, color: Z.inkMid, marginBottom: 15 }}>Motivo: {c.motivo || "Examen Visual"}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                     <button style={{ flex: 1, background: Z.green, color: Z.bgDeep, border: "none", padding: "8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>CONFIRMAR</button>
                     <button style={{ flex: 1, background: Z.surfaceL, color: Z.ink, border: "none", padding: "8px", borderRadius: 10, fontSize: 11 }}>RE-AGENDAR</button>
                  </div>
               </Card>
             ))}
          </div>
        )}

        {tab === "sistema" && (
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
              <Card accent={Z.primary}>
                 <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 25 }}>Configuración Identidad</h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                       <label style={{ fontSize: 11, color: Z.inkFaint }}>NOMBRE DE LA ÓPTICA</label>
                       <input defaultValue={optica?.nombre} style={{ width: "100%", background: Z.bgDeep, border: `1px solid ${Z.border}`, color: Z.ink, padding: 15, borderRadius: 12, marginTop: 8 }} />
                    </div>
                    <div>
                       <label style={{ fontSize: 11, color: Z.inkFaint }}>SLOGAN PROFESIONAL</label>
                       <input defaultValue={optica?.slogan} style={{ width: "100%", background: Z.bgDeep, border: `1px solid ${Z.border}`, color: Z.ink, padding: 15, borderRadius: 12, marginTop: 8 }} />
                    </div>
                 </div>
              </Card>
              <Card accent={Z.neon}>
                 <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 25 }}>Servicios y Precios</h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: 15, background: Z.surfaceL, borderRadius: 15 }}>
                       <span>Examen Visual</span>
                       <span style={{ fontWeight: 700, color: Z.green }}>GRATIS</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: 15, background: Z.surfaceL, borderRadius: 15 }}>
                       <span>Lentes Monofocales</span>
                       <span style={{ fontWeight: 700, color: Z.primary }}>Desde $45.000</span>
                    </div>
                 </div>
              </Card>
           </div>
        )}
      </main>

      <footer style={{ marginTop: 80, textAlign: "center", fontSize: 10, color: Z.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
        AUKÉN ZEN MASTER ARCHITECTURE v6.5 · SYSTEM CORE: OPERATIONAL
      </footer>
    </div>
  );
}
