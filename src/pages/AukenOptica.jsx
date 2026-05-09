import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const C = {
  bg:       "#05060A",
  surface:  "rgba(17, 20, 29, 0.6)",
  border:   "rgba(255, 255, 255, 0.08)",
  ink:      "#F1F5F9",
  inkMid:   "#94A3B8",
  primary:  "#FB923C", 
  neon:     "#3B82F6",
  amber:    "#F59E0B",
  green:    "#10B981",
  glass:    "blur(20px)",
};

export default function AukenOptica() {
  const [activeP, setActiveP] = useState(null);
  const [patients, setPatients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const OPTICA_SLUG = "glowvision";

  const refresh = useCallback(async () => {
    const { data: pacs } = await supabase.from("pacientes").select("*").order("created_at", { ascending: false });
    setPatients(pacs || []);
    setLoading(false);
  }, []);

  const loadChat = useCallback(async (pId) => {
    if (!pId) return;
    const { data } = await supabase.from("mensajes_chat").select("*").eq("paciente_id", pId).order("created_at", { ascending: true });
    setMessages(data || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (activeP) loadChat(activeP.id); }, [activeP, loadChat]);

  // REALTIME CONNECTION
  useEffect(() => {
    const sub = supabase.channel("chat_live").on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes_chat" }, (p) => {
      if (activeP && p.new.paciente_id === activeP.id) {
        setMessages(prev => [...prev, p.new]);
      }
      refresh(); // Para re-ordenar la lista lateral
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeP, refresh]);

  if (loading) return <div style={{ background: C.bg, color: C.inkMid, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>AUKÉN ELITE v7.0...</div>;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Inter', sans-serif", display: "flex", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; borderRadius: 10px; }
      `}</style>

      {/* BARRA LATERAL (LISTA DE LEADS) */}
      <aside style={{ width: 350, background: "#000", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
         <div style={{ padding: "30px 24px", borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
               <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.green, boxShadow: `0 0 10px ${C.green}` }} />
               MONITOR EN VIVO
            </h2>
         </div>
         <div style={{ flex: 1, overflowY: "auto" }}>
            {patients.map(p => (
              <div key={p.id} onClick={() => setActiveP(p)} style={{
                padding: "24px", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                background: activeP?.id === p.id ? C.surface : "transparent",
                transition: "0.2s"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                   <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</div>
                   <div style={{ fontSize: 9, color: C.inkMid }}>{new Date(p.ultima_interaccion_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
                <div style={{ fontSize: 11, color: C.inkMid }}>{p.telefono}</div>
              </div>
            ))}
         </div>
      </aside>

      {/* VENTANA DE CHAT (GLASS) */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", background: "radial-gradient(circle at top right, #11141D, #05060A)" }}>
         {activeP ? (
           <>
             <header style={{ padding: "20px 40px", borderBottom: `1px solid ${C.border}`, backdropFilter: C.glass, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                   <div style={{ fontSize: 18, fontWeight: 700 }}>{activeP.nombre}</div>
                   <div style={{ fontSize: 10, color: C.neon, fontWeight: 700 }}>BOT ACTIVO · ANALIZANDO INTENCIÓN</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                   <button style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink, padding: "8px 16px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>INTERRUMPIR IA</button>
                </div>
             </header>

             <div style={{ flex: 1, padding: "40px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    alignSelf: m.remitente === "cliente" ? "flex-start" : "flex-end",
                    maxWidth: "65%", position: "relative"
                  }}>
                    <div style={{
                      background: m.remitente === "cliente" ? C.surface : C.primary,
                      color: m.remitente === "cliente" ? C.ink : "#000",
                      padding: "16px 20px", borderRadius: 24, fontSize: 14, lineHeight: "1.5",
                      border: m.remitente === "cliente" ? `1px solid ${C.border}` : "none",
                      backdropFilter: m.remitente === "cliente" ? C.glass : "none",
                      boxShadow: m.remitente === "bot" ? `0 10px 30px ${C.primary}30` : "none"
                    }}>
                      {m.contenido}
                    </div>
                    <div style={{ fontSize: 9, color: C.inkFaint, marginTop: 5, textAlign: m.remitente === "cliente" ? "left" : "right" }}>
                       {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                ))}
             </div>

             <footer style={{ padding: "30px 40px", borderTop: `1px solid ${C.border}`, background: C.surface, backdropFilter: C.glass }}>
                <div style={{ display: "flex", gap: 15 }}>
                   <input placeholder="Escribir respuesta manual..." style={{ flex: 1, background: "#000", border: `1px solid ${C.border}`, color: "#fff", padding: "16px", borderRadius: 15, fontSize: 13 }} />
                   <button style={{ background: C.primary, color: "#000", border: "none", borderRadius: 15, padding: "0 25px", fontWeight: 700, cursor: "pointer" }}>ENVIAR</button>
                </div>
             </footer>
           </>
         ) : (
           <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkFaint, fontSize: 12, letterSpacing: "0.2em" }}>
              SELECCIONE UNA CONVERSACIÓN PARA INICIAR
           </div>
         )}
      </section>

      {/* FICHA TÉCNICA (MODO ELITE) */}
      {activeP && (
         <aside style={{ width: 400, borderLeft: `1px solid ${C.border}`, background: "#000", padding: "40px" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 30, fontFamily: "'Outfit', sans-serif" }}>Ficha Técnica</h3>
            
            <div style={{ background: C.surface, borderRadius: 24, padding: 25, marginBottom: 20, border: `1px solid ${C.border}` }}>
               <div style={{ fontSize: 10, color: C.inkMid, marginBottom: 15, letterSpacing: "0.1em" }}>DETALLES DEL PACIENTE</div>
               <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{activeP.nombre}</div>
               <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 20 }}>{activeP.rut}</div>
               
               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                  <div style={{ background: "#000", padding: 15, borderRadius: 15 }}>
                     <div style={{ fontSize: 9, color: C.inkFaint }}>OD</div>
                     <div style={{ fontSize: 14, fontWeight: 700 }}>{activeP.od_esfera || "—"}</div>
                  </div>
                  <div style={{ background: "#000", padding: 15, borderRadius: 15 }}>
                     <div style={{ fontSize: 9, color: C.inkFaint }}>OI</div>
                     <div style={{ fontSize: 14, fontWeight: 700 }}>{activeP.oi_esfera || "—"}</div>
                  </div>
               </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
               <button style={{ width: "100%", background: C.neon, color: "#fff", padding: 16, borderRadius: 18, border: "none", fontWeight: 700, cursor: "pointer" }}>📅 AGENDAR EXAMEN</button>
               <button style={{ width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.ink, padding: 16, borderRadius: 18, fontWeight: 700, cursor: "pointer" }}>✉️ ENVIAR FICHA POR WSP</button>
            </div>
         </aside>
      )}
    </div>
  );
}
