import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg: "#060710", surface: "#0D0F1A", border: "#1E2236", text: "#F8FAFC",
  dim: "#94A3B8", muted: "#475569", green: "#10B981", red: "#F43F5E",
  amber: "#F59E0B", blue: "#3B82F6", orange: "#FB923C"
};

const ADMIN_PASSWORD = "auken-admin-2026";

// Simulated optics database (in production this would be Supabase)
const OPTICAS_INICIALES = [
  {
    id: 1, nombre: "Óptica Glow Vision", dueño: "Primo (Punitaqui)", 
    plan: "Anual", sucursales: 1, estado: "activo", 
    mensualidad: 89990, instalacion: 0, ultimoPago: "2026-04-15", vencimiento: "2026-05-15",
    telefono: "+56912345678", ciudad: "Punitaqui", notas: "Primer cliente piloto."
  },
];

export default function AukenAdmin() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [opticas, setOpticas] = useState(OPTICAS_INICIALES);
  const [showAdd, setShowAdd] = useState(false);
  const [newOptica, setNewOptica] = useState({ nombre: "", dueño: "", plan: "Mensual", sucursales: 1, telefono: "", ciudad: "", mensualidad: 89990, instalacion: 150000, notas: "" });

  useEffect(() => {
    if (localStorage.getItem("auken_admin") === "true") setAuthed(true);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pass === ADMIN_PASSWORD) {
      localStorage.setItem("auken_admin", "true");
      setAuthed(true);
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const toggleEstado = (id) => {
    setOpticas(prev => prev.map(o => {
      if (o.id === id) {
        const newState = o.estado === "activo" ? "suspendido" : "activo";
        // Enforce kill switch via localStorage (in production this would be a Supabase flag)
        if (newState === "suspendido") {
          localStorage.setItem("auken_suspended", "true");
        } else {
          localStorage.removeItem("auken_suspended");
        }
        return { ...o, estado: newState };
      }
      return o;
    }));
  };

  const addOptica = (e) => {
    e.preventDefault();
    const nueva = { ...newOptica, id: Date.now(), estado: "activo", ultimoPago: new Date().toISOString().split('T')[0], vencimiento: "—" };
    setOpticas(prev => [...prev, nueva]);
    setShowAdd(false);
    setNewOptica({ nombre: "", dueño: "", plan: "Mensual", sucursales: 1, telefono: "", ciudad: "", mensualidad: 89990 });
  };

  const updatePlan = (id, newPlan) => {
    const precios = { "Mensual": 89990, "Anual": 890000, "Multi-Sucursal": 250000 };
    const instalacion = { "Mensual": 150000, "Anual": 0, "Multi-Sucursal": 400000 };
    setOpticas(prev => prev.map(o => 
      o.id === id ? { ...o, plan: newPlan, mensualidad: precios[newPlan], instalacion: instalacion[newPlan] } : o
    ));
  };

  const updateNotas = (id, notas) => {
    setOpticas(prev => prev.map(o => o.id === id ? { ...o, notas } : o));
  };

  const totalMRR = opticas.filter(o => o.estado === "activo").reduce((s, o) => s + o.mensualidad, 0);

  if (!authed) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap');`}</style>
        <form onSubmit={handleLogin} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, width: 380, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 22, color: C.text, marginBottom: 4 }}>AUKÉN ADMIN</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 28 }}>Panel de Control del Creador</div>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña de Administrador"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 14, borderRadius: 8, outline: "none", fontSize: 14, marginBottom: 16 }} />
          <button type="submit" style={{ width: "100%", background: `linear-gradient(135deg, ${C.orange}, ${C.amber})`, color: "#000", border: "none", borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Acceder al Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap');`}</style>

      {/* Top Bar */}
      <nav style={{ background: `${C.surface}E6`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.orange}, ${C.amber})`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontSize: 14, fontWeight: 900 }}>A</div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>AUKÉN</span>
          <span style={{ color: C.muted, margin: "0 8px" }}>/</span>
          <span style={{ fontSize: 13, color: C.dim, fontWeight: 500 }}>Super Admin</span>
        </div>
        <button onClick={() => { localStorage.removeItem("auken_admin"); setAuthed(false); }}
          style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Salir
        </button>
      </nav>

      <div style={{ padding: "40px 32px", maxWidth: 1100, margin: "0 auto" }}>
        
        {/* Revenue KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `2px solid ${C.green}` }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>💰 MRR (Ingreso Mensual)</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 28, color: C.green }}>${totalMRR.toLocaleString("es-CL")}</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `2px solid ${C.blue}` }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>🏪 Ópticas Activas</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 28, color: C.blue }}>{opticas.filter(o => o.estado === "activo").length}</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `2px solid ${C.red}` }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>⛔ Suspendidas</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 28, color: C.red }}>{opticas.filter(o => o.estado === "suspendido").length}</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `2px solid ${C.amber}` }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>📊 Total Clientes</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 28, color: C.amber }}>{opticas.length}</div>
          </div>
        </div>

        {/* Optics Table */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Mis Clientes (Ópticas)</div>
            <button onClick={() => setShowAdd(true)} style={{ background: C.orange, color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + Nueva Óptica
            </button>
          </div>
          
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: `${C.bg}80` }}>
                {["Óptica", "Plan", "Instalación", "Mensualidad", "Último Pago", "Notas", "Estado", "Acción"].map(h => (
                  <th key={h} style={{ padding: "14px 20px", fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opticas.map(o => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{o.nombre}</div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{o.dueño} · {o.ciudad} · {o.sucursales} local{o.sucursales > 1 ? "es" : ""}</div>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 13 }}>
                    <select 
                      value={o.plan} 
                      onChange={(e) => updatePlan(o.id, e.target.value)}
                      style={{ background: `${C.blue}20`, color: C.blue, border: "none", padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, outline: "none", cursor: "pointer" }}
                    >
                      <option value="Mensual">Plan Mensual</option>
                      <option value="Anual">Plan Anual</option>
                      <option value="Multi-Sucursal">Multi-Sucursal</option>
                    </select>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 13, fontWeight: 600, color: C.dim }}>
                    ${(o.instalacion || 0).toLocaleString("es-CL")}
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 700, color: C.green }}>
                    ${o.mensualidad.toLocaleString("es-CL")}
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 13, color: C.dim }}>{o.ultimoPago}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <input 
                      value={o.notas || ""} 
                      onChange={(e) => updateNotas(o.id, e.target.value)}
                      placeholder="Sin notas..."
                      style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.dim, padding: "4px 8px", borderRadius: 4, fontSize: 11, outline: "none", width: 120 }}
                    />
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{
                      background: o.estado === "activo" ? `${C.green}20` : `${C.red}20`,
                      color: o.estado === "activo" ? C.green : C.red,
                      padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                      border: `1px solid ${o.estado === "activo" ? C.green : C.red}40`
                    }}>
                      {o.estado === "activo" ? "● ACTIVO" : "● SUSPENDIDO"}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <button onClick={() => toggleEstado(o.id)} style={{
                      background: o.estado === "activo" ? `${C.red}20` : `${C.green}20`,
                      color: o.estado === "activo" ? C.red : C.green,
                      border: `1px solid ${o.estado === "activo" ? C.red : C.green}50`,
                      borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                    }}>
                      {o.estado === "activo" ? "⛔ Suspender" : "✅ Reactivar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Óptica */}
      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 420 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Registrar Nueva Óptica</h3>
            <form onSubmit={addOptica} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input required placeholder="Nombre de la Óptica" value={newOptica.nombre} onChange={e => setNewOptica({...newOptica, nombre: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              <input required placeholder="Nombre del Dueño" value={newOptica.dueño} onChange={e => setNewOptica({...newOptica, dueño: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              <div style={{ display: "flex", gap: 12 }}>
                <input required placeholder="Teléfono" value={newOptica.telefono} onChange={e => setNewOptica({...newOptica, telefono: e.target.value})} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
                <input required placeholder="Ciudad" value={newOptica.ciudad} onChange={e => setNewOptica({...newOptica, ciudad: e.target.value})} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <select value={newOptica.plan} onChange={e => {
                  const plan = e.target.value;
                  const precio = plan === "Mensual" ? 89990 : plan === "Anual" ? 890000 : 250000;
                  setNewOptica({...newOptica, plan, mensualidad: precio});
                }} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }}>
                  <option value="Mensual">Plan Mensual</option>
                  <option value="Anual">Plan Anual</option>
                  <option value="Multi-Sucursal">Multi-Sucursal</option>
                </select>
                <input type="number" placeholder="N° Sucursales" value={newOptica.sucursales} onChange={e => setNewOptica({...newOptica, sucursales: Number(e.target.value)})} style={{ width: 100, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: C.dim, marginBottom: 4, display: "block" }}>Costo Instalación</label>
                  <input type="number" placeholder="Instalación $" value={newOptica.instalacion} onChange={e => setNewOptica({...newOptica, instalacion: Number(e.target.value)})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: C.dim, marginBottom: 4, display: "block" }}>Mensualidad</label>
                  <input type="number" placeholder="Mensualidad $" value={newOptica.mensualidad} onChange={e => setNewOptica({...newOptica, mensualidad: Number(e.target.value)})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none" }} />
                </div>
              </div>
              <textarea placeholder="Notas internas..." value={newOptica.notas} onChange={e => setNewOptica({...newOptica, notas: e.target.value})} style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, outline: "none", resize: "none" }} rows={2} />
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, background: C.orange, color: "#000", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
