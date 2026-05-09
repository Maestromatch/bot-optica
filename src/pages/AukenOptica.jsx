import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const C = {
  bg:       "#07080C",
  surface:  "#0E111A",
  border:   "#1C2230",
  ink:      "#F1F5F9",
  inkMid:   "#64748B",
  blue:     "#0EA5E9",
  amber:    "#F59E0B",
  green:    "#10B981",
};

export default function AukenOptica() {
  const [optica, setOptica] = useState(null);
  const [activeP, setActiveP] = useState(null);
  const [patients, setPatients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const OPTICA_SLUG = "glowvision";

  const fetchBase = useCallback(async () => {
    const { data: opt } = await supabase.from("opticas").select("*").eq("slug", OPTICA_SLUG).maybeSingle();
    const { data: pacs } = await supabase.from("pacientes").select("*").order("created_at", { ascending: false });
    setOptica(opt);
    setPatients(pacs || []);
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (pId) => {
    if (!pId) return;
    const { data } = await supabase.from("mensajes_chat").select("*").eq("paciente_id", pId).order("created_at", { ascending: true });
    setMessages(data || []);
  }, []);

  useEffect(() => { fetchBase(); }, [fetchBase]);
  useEffect(() => { if (activeP) fetchMessages(activeP.id); }, [activeP, fetchMessages]);

  // SUSCRIPCIÓN REALTIME PARA EL CHAT
  useEffect(() => {
    const sub = supabase.channel("realtime_chat").on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes_chat" }, (payload) => {
      if (activeP && payload.new.paciente_id === activeP.id) {
        setMessages(prev => [...prev, payload.new]);
      }
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeP]);

  const handleAgendar = async () => {
    if (!activeP) return;
    const datosCita = {
      nombre: activeP.nombre,
      rut: activeP.rut,
      telefono: activeP.telefono,
      sector: activeP.configuracion?.comuna || "No especificado",
      motivo: "Examen Visual Computarizado",
      gestor: optica?.configuracion?.owner_name || "Ismael"
    };
    alert(`📅 ENVIANDO A CALENDARIO DE ISMAEL:\n\nPaciente: ${datosCita.nombre}\nSector: ${datosCita.sector}\nMotivo: ${datosCita.motivo}\n\nSincronización con Google Calendar Iniciada.`);
    // Aquí iría el webhook de n8n para Google Calendar
  };

  if (loading) return <div style={{ background: C.bg, color: C.inkMid, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>MONITOR v6.7...</div>;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ height: 65, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 35, height: 35, background: C.blue, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>👁️</div>
          <h1 style={{ fontSize: 16, fontWeight: 700 }}>{optica?.nombre} · Monitor IA</h1>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LISTA DE CHATS */}
        <aside style={{ width: 320, borderRight: `1px solid ${C.border}`, overflowY: "auto", background: "#030406" }}>
           {patients.map(p => (
             <div key={p.id} onClick={() => setActiveP(p)} style={{
               padding: 20, borderBottom: `1px solid ${C.border}`, cursor: "pointer",
               background: activeP?.id === p.id ? C.surface : "transparent"
             }}>
               <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</div>
               <div style={{ fontSize: 11, color: C.inkMid }}>{p.telefono}</div>
             </div>
           ))}
        </aside>

        {/* VENTANA DE CHAT REAL */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
           <div style={{ flex: 1, padding: 30, overflowY: "auto", display: "flex", flexDirection: "column", gap: 15 }}>
              {messages.map(m => (
                <div key={m.id} style={{
                  alignSelf: m.remitente === "cliente" ? "flex-start" : "flex-end",
                  background: m.remitente === "cliente" ? C.surface : C.blue,
                  padding: "12px 18px", borderRadius: 18, maxWidth: "70%", fontSize: 13
                }}>
                  {m.contenido}
                </div>
              ))}
              {!activeP && <div style={{ color: C.inkFaint, textAlign: "center", marginTop: 100 }}>Seleccione un paciente para ver la conversación.</div>}
           </div>
           <div style={{ padding: 20, background: C.surface, display: "flex", gap: 10 }}>
              <input placeholder="Escribir como Aukén..." style={{ flex: 1, background: "#000", border: "none", padding: 12, borderRadius: 10, color: "#fff" }} />
              <button style={{ background: C.amber, color: "#000", border: "none", borderRadius: 10, padding: "0 20px", fontWeight: 700 }}>ENVIAR</button>
           </div>
        </section>

        {/* FICHA OPERATIVA */}
        {activeP && (
          <aside style={{ width: 380, borderLeft: `1px solid ${C.border}`, padding: 30 }}>
             <h3 style={{ fontSize: 18, marginBottom: 25 }}>Ficha del Lead</h3>
             <div style={{ background: C.surface, padding: 20, borderRadius: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: C.inkMid, marginBottom: 10 }}>DATOS DE CONTACTO</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{activeP.nombre}</div>
                <div style={{ fontSize: 12, color: C.inkMid }}>{activeP.configuracion?.comuna || "Sector no especificado"}</div>
             </div>
             <button onClick={handleAgendar} style={{ width: "100%", background: C.blue, color: "#fff", padding: 15, borderRadius: 15, border: "none", fontWeight: 700, cursor: "pointer" }}>📅 AGENDAR EN CALENDARIO</button>
          </aside>
        )}
      </main>
    </div>
  );
}
