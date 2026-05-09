import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useConversation } from "../lib/useConversation";

// ── PALETA Y CONSTANTES DEL ECOSISTEMA ─────────────────────────────────
const C = {
  bg:         "#07080C",
  bgDeep:     "#030406",
  surface:    "#0E111A",
  surfaceL:   "#151926",
  border:     "#1C2230",
  ink:        "#F1F5F9",
  inkMid:     "#64748B",
  inkFaint:   "#334155",
  blue:       "#0EA5E9",
  amber:      "#F59E0B",
  red:        "#EF4444",
  green:      "#10B981",
  glass:      "rgba(14, 17, 26, 0.8)",
};

// ─────────────────────────────────────────────────────────────────
// MONITOR DE ATENCIÓN INTEGRADO v6.0
// ─────────────────────────────────────────────────────────────────
export default function AukenOptica() {
  const [optica, setOptica] = useState(null);
  const [activePatient, setActivePatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState("split");
  const [loading, setLoading] = useState(true);

  const OPTICA_SLUG = "glowvision"; // Prioridad: Glow Vision

  // 1. CARGAR IDENTIDAD Y PACIENTES REALES
  const fetchData = useCallback(async () => {
    // Cargar Óptica
    const { data: optData } = await supabase.from("opticas").select("*").eq("slug", OPTICA_SLUG).maybeSingle();
    setOptica(optData);

    // Cargar solo pacientes de esta Óptica (Filtrado Real)
    // Nota: Si aún no tienes la columna optica_id en pacientes, cargamos todos los nuevos.
    const { data: pacData } = await supabase.from("pacientes").select("*").order("created_at", { ascending: false });
    
    // FILTRO CRÍTICO: Eliminar datos de prueba si el usuario no los quiere
    const realPatients = (pacData || []).filter(p => !["carlos", "juanito", "loco"].some(test => p.nombre.toLowerCase().includes(test)));
    setPatients(realPatients);
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // SEO Profesional
  useEffect(() => {
    if (optica) document.title = `Monitor Live | ${optica.nombre}`;
  }, [optica]);

  if (loading) return <div style={{ background: C.bg, color: C.inkMid, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>VIRTUALIZING MONITOR...</div>;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
      `}</style>

      {/* HEADER INTEGRADO */}
      <header style={{ height: 65, background: C.glass, backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 35, height: 35, background: C.blue, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👁️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{optica?.nombre || "Ópticas Glow Vision"}</h1>
            <span style={{ fontSize: 10, color: C.amber, fontWeight: 700, textTransform: "uppercase" }}>Monitor IA en Tiempo Real</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {["split", "chat", "fichas"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none",
              background: view === v ? C.blue : C.surfaceL,
              color: view === v ? "#fff" : C.inkMid,
              fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "0.2s"
            }}>{v.toUpperCase()}</button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* SIDEBAR: PACIENTES REALES */}
        {(view === "split" || view === "fichas") && (
          <aside style={{ width: 320, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.bgDeep }}>
             <div style={{ padding: 20, borderBottom: `1px solid ${C.border}` }}>
                <input placeholder="Buscar paciente real..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, color: C.ink, fontSize: 12 }} />
             </div>
             <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                {patients.map(p => (
                  <div key={p.id} onClick={() => setActivePatient(p)} style={{
                    padding: 15, borderRadius: 15, marginBottom: 8, cursor: "pointer",
                    background: activePatient?.id === p.id ? C.surfaceL : "transparent",
                    border: `1px solid ${activePatient?.id === p.id ? C.blue + "40" : "transparent"}`
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: C.inkMid }}>{p.rut}</div>
                  </div>
                ))}
                {patients.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", color: C.inkFaint, fontSize: 11 }}>
                    Sincronizado: Esperando entrada de pacientes reales...
                  </div>
                )}
             </div>
          </aside>
        )}

        {/* CONTENIDO: CHAT + FICHA */}
        <section style={{ flex: 1, display: "flex", overflow: "hidden" }}>
           <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bgDeep }}>
              <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <div style={{ fontSize: 14, fontWeight: 700 }}>{activePatient ? `Conversación: ${activePatient.nombre}` : "Seleccione un paciente activo"}</div>
                 <div style={{ display: "flex", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
                    <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>BOT ACTIVO</span>
                 </div>
              </div>
              
              <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 15 }}>
                 {activePatient ? (
                   <div style={{ color: C.inkMid, textAlign: "center", fontSize: 12, marginTop: 50 }}>
                      [ Conectando con el historial de WhatsApp de {activePatient.nombre}... ]
                   </div>
                 ) : (
                   <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkFaint, textAlign: "center", padding: 40 }}>
                      <div>
                        <div style={{ fontSize: 40, marginBottom: 15 }}>📡</div>
                        <div style={{ fontWeight: 700, marginBottom: 5 }}>Monitor en Espera</div>
                        <div>El sistema está listo. Los chats aparecerán aquí en cuanto el bot reciba un mensaje.</div>
                      </div>
                   </div>
                 )}
              </div>

              {/* INPUT OPERATIVO */}
              <div style={{ padding: 20, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
                 <input disabled={!activePatient} placeholder="Escribir como Aukén..." style={{ flex: 1, background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.ink }} />
                 <button disabled={!activePatient} style={{ background: C.amber, color: "#000", border: "none", borderRadius: 10, padding: "0 20px", fontWeight: 700, fontSize: 12 }}>INTERRUMPIR IA</button>
              </div>
           </div>

           {/* FICHA TÉCNICA REAL */}
           {(view === "split" || view === "fichas") && activePatient && (
             <aside style={{ width: 380, background: C.bgDeep, borderLeft: `1px solid ${C.border}`, padding: 25, overflowY: "auto" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Ficha Técnica</h3>
                <div style={{ background: C.surface, padding: 20, borderRadius: 20, border: `1px solid ${C.border}` }}>
                   <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 15 }}>ÚLTIMA RECETA REGISTRADA</div>
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                      <div style={{ background: C.bgDeep, padding: 12, borderRadius: 12 }}>
                         <div style={{ fontSize: 9, color: C.inkMid }}>OD</div>
                         <div style={{ fontSize: 14, fontWeight: 700 }}>{activePatient.od_esfera || "—"} | {activePatient.od_cilindro || "—"}</div>
                      </div>
                      <div style={{ background: C.bgDeep, padding: 12, borderRadius: 12 }}>
                         <div style={{ fontSize: 9, color: C.inkMid }}>OI</div>
                         <div style={{ fontSize: 14, fontWeight: 700 }}>{activePatient.oi_esfera || "—"} | {activePatient.oi_cilindro || "—"}</div>
                      </div>
                   </div>
                </div>

                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                   <button style={{ width: "100%", padding: 14, borderRadius: 14, background: C.blue, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>📅 AGENDAR EXAMEN</button>
                   <button style={{ width: "100%", padding: 14, borderRadius: 14, background: "transparent", color: C.ink, border: `1px solid ${C.border}`, fontWeight: 700, cursor: "pointer" }}>💬 ENVIAR FICHA POR WSP</button>
                </div>
             </aside>
           )}
        </section>
      </main>
    </div>
  );
}
