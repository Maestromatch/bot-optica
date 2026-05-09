import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ── SISTEMA DE DISEÑO ZEN BUSINESS v6.6 ────────────────────────────────
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

// ── COMPONENTES BUSINESS ────────────────────────────────────────────
function Card({ children, style = {}, accent, glow, hover }) {
  return (
    <div style={{
      background: Z.glass, backdropFilter: "blur(24px)", border: `1px solid ${Z.border}`,
      borderTop: accent ? `3px solid ${accent}` : `1px solid ${Z.border}`,
      borderRadius: 28, padding: 28, position: "relative",
      boxShadow: glow ? `0 20px 40px ${accent}15` : "0 10px 30px rgba(0,0,0,0.4)",
      transition: "0.3s ease",
      cursor: hover ? "pointer" : "default",
      ...style
    }}>{children}</div>
  );
}

function MetricCard({ label, value, sub, icon, color }) {
  return (
    <Card accent={color} glow>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
        <div style={{ width: 40, height: 40, background: color + "15", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: Z.inkFaint, letterSpacing: "0.15em" }}>{label}</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: Z.ink }}>{value}</div>
      <div style={{ fontSize: 11, color: Z.inkMid, marginTop: 5 }}>{sub}</div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function AukenOpticaDashboard() {
  const [tab, setTab] = useState("metricas");
  const [optica, setOptica] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [citas, setCitas] = useState([]);
  const [selectedP, setSelectedP] = useState(null);
  const [loading, setLoading] = useState(true);

  const OPTICA_SLUG = "glowvision";

  const refresh = useCallback(async () => {
    const [optRes, pacRes, citaRes, vntRes] = await Promise.all([
      supabase.from("opticas").select("*").eq("slug", OPTICA_SLUG).maybeSingle(),
      supabase.from("pacientes").select("*").order("created_at", { ascending: false }),
      supabase.from("citas").select("*").order("fecha", { ascending: true }),
      supabase.from("ventas").select("*").order("created_at", { ascending: false })
    ]);

    setOptica(optRes.data);
    setPacientes(pacRes.data || []);
    setCitas(citaRes.data || []);
    setVentas(vntRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const totalVentas = ventas.reduce((s, v) => s + Number(v.monto), 0);
  const tasaCierre = pacientes.length > 0 ? Math.round((ventas.length / pacientes.length) * 100) : 0;

  if (loading) return <div style={{ background: Z.bg, color: Z.inkMid, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>LOADING BUSINESS ENGINE v6.6...</div>;

  return (
    <div style={{ background: Z.bg, minHeight: "100vh", color: Z.ink, fontFamily: "'Inter', sans-serif", padding: "40px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 20px; font-size: 10px; color: ${Z.inkFaint}; text-transform: uppercase; letter-spacing: 0.15em; }
        td { padding: 20px; border-top: 1px solid ${Z.border}; font-size: 14px; }
        tr:hover { background: ${Z.surfaceL}; }
      `}</style>

      {/* HEADER DINÁMICO ESCALABLE */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 50 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div style={{ width: 50, height: 50, background: Z.grad, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👁️</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 700, margin: 0 }}>{optica?.nombre || "Glow Vision"}</h1>
            <span style={{ fontSize: 10, background: Z.neon + "20", color: Z.neon, padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>v6.6 BUSINESS</span>
          </div>
          <p style={{ color: Z.inkMid, fontSize: 14, marginLeft: 65 }}>{optica?.slogan || "Gestión de Alto Rendimiento"}</p>
        </div>
        <div style={{ display: "flex", gap: 15 }}>
           <Card style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, borderRadius: 15 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: Z.green, boxShadow: `0 0 10px ${Z.green}` }} />
              <div style={{ fontSize: 11, fontWeight: 700 }}>{optica?.configuracion?.owner_name || "Admin"}</div>
           </Card>
        </div>
      </header>

      {/* TABS DE NEGOCIO */}
      <nav style={{ display: "flex", gap: 40, borderBottom: `1px solid ${Z.border}`, marginBottom: 40 }}>
        {[
          ["metricas", "MÉTRICAS CORE"],
          ["crm", "BASE CLÍNICA"],
          ["campañas", "CAMPAÑAS IA"],
          ["agenda", "AGENDA IA"],
          ["config", "SISTEMA"],
        ].map(([id, l]) => (
          <button key={id} onClick={() => {setTab(id); setSelectedP(null);}} style={{
            background: "none", border: "none", padding: "15px 0", cursor: "pointer",
            color: tab === id ? Z.primary : Z.inkFaint,
            borderBottom: tab === id ? `3px solid ${Z.primary}` : "3px solid transparent",
            fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", transition: "0.3s"
          }}>{l}</button>
        ))}
      </nav>

      {/* CONTENIDO POR PESTAÑA */}
      <main>
        {tab === "metricas" && (
           <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                 <MetricCard label="VENTAS TOTALES" value={`$${totalVentas.toLocaleString()}`} sub="Acumulado histórico" icon="💰" color={Z.green} />
                 <MetricCard label="TASA DE CIERRE" value={`${tasaCierre}%`} sub="Conversión Real" icon="⚡" color={Z.neon} />
                 <MetricCard label="PACIENTES" value={pacientes.length} sub="Base de datos activa" icon="👥" color={Z.primary} />
                 <MetricCard label="CITAS" value={citas.length} sub="Agendadas vía Bot" icon="📅" color={Z.amber} />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 30 }}>
                 <Card accent={Z.primary} glow>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: Z.inkMid }}>HISTORIAL DE VENTAS (FLUJO)</h3>
                    <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 10 }}>
                       {ventas.slice(0, 10).map((v, i) => (
                         <div key={i} style={{ flex: 1, height: `${(v.monto/100000)*100}%`, background: Z.grad, borderRadius: "5px 5px 0 0", opacity: 0.8 }} />
                       ))}
                    </div>
                 </Card>
                 <Card accent={Z.red}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>PACIENTES EN RIESGO</h3>
                    <div style={{ fontSize: 24, fontWeight: 700, color: Z.red }}>{pacientes.filter(p => p.estado === "vencida").length}</div>
                    <div style={{ fontSize: 12, color: Z.inkMid, marginTop: 5 }}>Recetas vencidas esperando campaña.</div>
                 </Card>
              </div>
           </div>
        )}

        {tab === "crm" && (
           <div style={{ display: "grid", gridTemplateColumns: selectedP ? "1fr 400px" : "1fr", gap: 30 }}>
              <Card style={{ padding: 0, overflow: "hidden" }}>
                 <table>
                    <thead>
                       <tr><th>Paciente</th><th>Estado</th><th>Última Venta</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                       {pacientes.map(p => (
                         <tr key={p.id} onClick={() => setSelectedP(p)} style={{ cursor: "pointer" }}>
                            <td><div style={{ fontWeight: 700 }}>{p.nombre}</div><div style={{ fontSize: 11, color: Z.inkMid }}>{p.rut}</div></td>
                            <td><span style={{ color: p.estado === "vigente" ? Z.green : Z.red, fontSize: 11, fontWeight: 700 }}>{p.estado.toUpperCase()}</span></td>
                            <td>${Number(ventas.find(v => v.paciente_id === p.id)?.monto || 0).toLocaleString()}</td>
                            <td><button style={{ background: Z.surfaceL, border: "none", color: Z.ink, padding: "5px 12px", borderRadius: 8, fontSize: 11 }}>EXPANDIR</button></td>
                         </tr>
                       ))}
                       {pacientes.length === 0 && <tr><td colSpan="4" style={{ textAlign: "center", padding: 60, color: Z.inkFaint }}>Sin pacientes registrados aún.</td></tr>}
                    </tbody>
                 </table>
              </Card>

              {selectedP && (
                 <Card accent={Z.primary} glow style={{ animation: "fadeIn 0.3s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 25 }}>
                       <h3 style={{ fontSize: 20, fontWeight: 700 }}>Ficha Clínica</h3>
                       <button onClick={() => setSelectedP(null)} style={{ background: "none", border: "none", color: Z.inkFaint, cursor: "pointer" }}>✕</button>
                    </div>
                    <div style={{ background: Z.bgDeep, borderRadius: 20, padding: 20, marginBottom: 20 }}>
                       <div style={{ fontSize: 10, color: Z.inkFaint, marginBottom: 15 }}>RECETA VIGENTE</div>
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
                    <button style={{ width: "100%", background: Z.primary, color: Z.bgDeep, padding: 15, borderRadius: 15, fontWeight: 700, border: "none", cursor: "pointer" }}>REGISTRAR NUEVA VENTA</button>
                 </Card>
              )}
           </div>
        )}

        {tab === "campañas" && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              <Card accent={Z.red} hover>
                 <div style={{ fontSize: 24, marginBottom: 10 }}>🔥</div>
                 <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recuperar Vencidos</h3>
                 <p style={{ fontSize: 12, color: Z.inkMid }}>{pacientes.filter(p => p.estado === "vencida").length} pacientes necesitan control.</p>
                 <button style={{ width: "100%", background: Z.red, color: "#fff", border: "none", borderRadius: 10, padding: 12, marginTop: 15, fontWeight: 700 }}>LANZAR POR WHATSAPP</button>
              </Card>
              <Card accent={Z.amber} hover>
                 <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
                 <h3 style={{ fontSize: 16, fontWeight: 700 }}>Preventiva Mensual</h3>
                 <p style={{ fontSize: 12, color: Z.inkMid }}>Recordatorios para controles próximos.</p>
                 <button style={{ width: "100%", background: Z.amber, color: "#000", border: "none", borderRadius: 10, padding: 12, marginTop: 15, fontWeight: 700 }}>ACTIVAR CAMPAÑA</button>
              </Card>
              <Card accent={Z.neon} hover>
                 <div style={{ fontSize: 24, marginBottom: 10 }}>✨</div>
                 <h3 style={{ fontSize: 16, fontWeight: 700 }}>Leads sin Compra</h3>
                 <p style={{ fontSize: 12, color: Z.inkMid }}>Prospectos que no han cerrado venta.</p>
                 <button style={{ width: "100%", background: Z.neon, color: "#fff", border: "none", borderRadius: 10, padding: 12, marginTop: 15, fontWeight: 700 }}>RE-CONECTAR</button>
              </Card>
           </div>
        )}

        {tab === "agenda" && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {citas.map(c => (
                <Card key={c.id} accent={Z.neon}>
                   <div style={{ fontSize: 11, fontWeight: 700, color: Z.neon, marginBottom: 10 }}>{new Date(c.fecha).toLocaleDateString()} · {new Date(c.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                   <div style={{ fontSize: 18, fontWeight: 700 }}>{c.paciente_nombre}</div>
                   <div style={{ fontSize: 12, color: Z.inkMid, marginTop: 5 }}>Motivo: {c.motivo || "Examen Visual Gratis"}</div>
                </Card>
              ))}
              {citas.length === 0 && <div style={{ color: Z.inkFaint }}>Sin citas agendadas hoy.</div>}
           </div>
        )}
        
        {tab === "config" && (
           <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 30 }}>
              <Card accent={Z.primary}>
                 <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 25 }}>Configuración del Negocio</h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div><label style={{ fontSize: 11, color: Z.inkFaint }}>NOMBRE COMERCIAL</label><input defaultValue={optica?.nombre} style={{ width: "100%", background: Z.bgDeep, border: `1px solid ${Z.border}`, color: Z.ink, padding: 15, borderRadius: 12, marginTop: 8 }} /></div>
                    <div><label style={{ fontSize: 11, color: Z.inkFaint }}>DUEÑO / GESTOR</label><input defaultValue={optica?.configuracion?.owner_name} style={{ width: "100%", background: Z.bgDeep, border: `1px solid ${Z.border}`, color: Z.ink, padding: 15, borderRadius: 12, marginTop: 8 }} /></div>
                    <button style={{ background: Z.primary, color: Z.bgDeep, padding: 15, borderRadius: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>GUARDAR CAMBIOS</button>
                 </div>
              </Card>
           </div>
        )}
      </main>

      <footer style={{ marginTop: 80, textAlign: "center", fontSize: 10, color: Z.inkFaint, fontFamily: "monospace" }}>
        AUKÉN ZEN BUSINESS ENGINE v6.6 · REAL BUSINESS INTELLIGENCE
      </footer>
    </div>
  );
}
