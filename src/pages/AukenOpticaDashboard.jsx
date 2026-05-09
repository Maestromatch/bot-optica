import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const Z = {
  bg:       "#07090D",
  surface:  "#11141D",
  surfaceL: "#1A1F2B",
  border:   "rgba(255, 255, 255, 0.08)",
  ink:      "#F1F5F9",
  inkMid:   "#94A3B8",
  inkFaint: "#475569",
  primary:  "#FB923C", 
  neon:     "#3B82F6", 
  green:    "#10B981",
  red:      "#EF4444",
  grad:     "linear-gradient(135deg, #FB923C 0%, #F59E0B 100%)",
};

export default function AukenOpticaDashboard() {
  const [tab, setTab] = useState("metricas");
  const [period, setPeriod] = useState("mes"); // dia, semana, mes, año
  const [optica, setOptica] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [selectedP, setSelectedP] = useState(null);
  const [loading, setLoading] = useState(true);

  const OPTICA_SLUG = "glowvision";

  const refresh = useCallback(async () => {
    const [optRes, pacRes, vntRes] = await Promise.all([
      supabase.from("opticas").select("*").eq("slug", OPTICA_SLUG).maybeSingle(),
      supabase.from("pacientes").select("*").order("created_at", { ascending: false }),
      supabase.from("ventas").select("*").order("created_at", { ascending: false })
    ]);
    setOptica(optRes.data);
    setPacientes(pacRes.data || []);
    setVentas(vntRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // LÓGICA DE MÉTRICAS POR PERIODO
  const getFilteredVentas = () => {
    const now = new Date();
    return ventas.filter(v => {
      const d = new Date(v.created_at);
      if (period === "dia") return d.toDateString() === now.toDateString();
      if (period === "semana") return (now - d) < 7 * 24 * 3600 * 1000;
      if (period === "mes") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    });
  };

  const currentVentas = getFilteredVentas();
  const totalPeriodo = currentVentas.reduce((s, v) => s + Number(v.monto), 0);

  if (loading) return <div style={{ background: Z.bg, color: Z.inkMid, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>BUSINESS ENGINE v6.7...</div>;

  return (
    <div style={{ background: Z.bg, minHeight: "100vh", color: Z.ink, fontFamily: "'Inter', sans-serif", padding: "40px 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@600;700&display=swap');
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 18px; font-size: 10px; color: ${Z.inkFaint}; text-transform: uppercase; letter-spacing: 0.1em; }
        td { padding: 18px; border-top: 1px solid ${Z.border}; font-size: 13px; }
      `}</style>

      {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div style={{ width: 45, height: 45, background: Z.grad, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👁️</div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 700, margin: 0 }}>{optica?.nombre}</h1>
        </div>
        <div style={{ display: "flex", gap: 10, background: Z.surfaceL, padding: 5, borderRadius: 12 }}>
          {["dia", "semana", "mes", "año"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              background: period === p ? Z.primary : "transparent",
              color: period === p ? Z.bg : Z.inkMid,
              border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase"
            }}>{p}</button>
          ))}
        </div>
      </header>

      {/* NAVEGACIÓN */}
      <nav style={{ display: "flex", gap: 30, borderBottom: `1px solid ${Z.border}`, marginBottom: 30 }}>
        {["metricas", "crm", "campañas", "config"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", padding: "15px 0", color: tab === t ? Z.primary : Z.inkFaint,
            borderBottom: tab === t ? `3px solid ${Z.primary}` : "3px solid transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, textTransform: "uppercase"
          }}>{t === "crm" ? "BASE CLÍNICA" : t.toUpperCase()}</button>
        ))}
      </nav>

      <main>
        {tab === "metricas" && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              <div style={{ background: Z.surface, padding: 25, borderRadius: 24, border: `1px solid ${Z.border}` }}>
                 <div style={{ fontSize: 10, color: Z.inkFaint, marginBottom: 10 }}>VENTAS DEL PERIODO</div>
                 <div style={{ fontSize: 32, fontWeight: 700 }}>${totalPeriodo.toLocaleString()}</div>
                 <div style={{ fontSize: 11, color: Z.green, marginTop: 5 }}>{currentVentas.length} transacciones registradas</div>
              </div>
              {/* Más métricas aquí... */}
           </div>
        )}

        {tab === "crm" && (
           <div style={{ display: "grid", gridTemplateColumns: selectedP ? "1fr 400px" : "1fr", gap: 20 }}>
              <div style={{ background: Z.surface, borderRadius: 24, overflow: "hidden", border: `1px solid ${Z.border}` }}>
                 <table>
                    <thead><tr><th>Paciente</th><th>RUT</th><th>Estado</th><th>Total Invertido</th></tr></thead>
                    <tbody>
                       {pacientes.map(p => (
                         <tr key={p.id} onClick={() => setSelectedP(p)} style={{ cursor: "pointer" }}>
                            <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                            <td style={{ color: Z.inkMid }}>{p.rut}</td>
                            <td><span style={{ color: p.estado === "vigente" ? Z.green : Z.red }}>{p.estado?.toUpperCase()}</span></td>
                            <td style={{ fontWeight: 700 }}>${Number(ventas.filter(v => v.paciente_id === p.id).reduce((s,v) => s+Number(v.monto), 0)).toLocaleString()}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              {selectedP && (
                 <div style={{ background: Z.surfaceL, borderRadius: 24, padding: 25, border: `2px solid ${Z.primary}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                       <h3 style={{ fontSize: 18 }}>Ficha Técnica</h3>
                       <button onClick={() => setSelectedP(null)} style={{ background: "none", border: "none", color: Z.inkMid, cursor: "pointer" }}>✕</button>
                    </div>
                    {/* Botón de Nutrients Integration */}
                    <div style={{ border: `2px dashed ${Z.border}`, borderRadius: 15, padding: 20, textAlign: "center", marginBottom: 20 }}>
                       <div style={{ fontSize: 20 }}>📸</div>
                       <div style={{ fontSize: 11, color: Z.inkMid, marginTop: 5 }}>Escaneo IA: Sube foto de receta</div>
                    </div>
                    <button style={{ width: "100%", background: Z.primary, padding: 12, borderRadius: 10, border: "none", fontWeight: 700 }}>CREAR VENTA</button>
                 </div>
              )}
           </div>
        )}

        {tab === "campañas" && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              <div style={{ background: Z.surface, padding: 25, borderRadius: 24, border: `1px solid ${Z.red}30` }}>
                 <div style={{ fontSize: 20, marginBottom: 10 }}>🔥</div>
                 <h3 style={{ fontSize: 16 }}>Recuperar Vencidos</h3>
                 <p style={{ fontSize: 12, color: Z.inkMid }}>Estrategia: Cupón Renovación + Checkup Gratis.</p>
                 <button onClick={() => alert("Lanzando Campaña de Recuperación vía WhatsApp...")} style={{ width: "100%", background: Z.red, color: "#fff", padding: 12, borderRadius: 10, border: "none", marginTop: 15, fontWeight: 700 }}>LANZAR CAMPAÑA</button>
              </div>
              {/* Más campañas... */}
           </div>
        )}
      </main>
    </div>
  );
}
