
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AukenOpticaDashboard() {
  const navigate = useNavigate();
  return (
    <div style={{ 
      background: "#090A0F", 
      color: "#38BDF8", 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center",
      fontFamily: "sans-serif" 
    }}>
      <h1 style={{ fontSize: 40, marginBottom: 20 }}>💎 AUKÉN DASHBOARD</h1>
      <p style={{ fontSize: 20, color: "#fff" }}>¡LA PÁGINA ESTÁ CARGANDO CORRECTAMENTE!</p>
      <div style={{ marginTop: 40, padding: 20, border: "1px solid #38BDF8", borderRadius: 12 }}>
        <p>Si estás viendo esto, el error estaba en el diseño anterior.</p>
        <button 
          onClick={() => { localStorage.removeItem("auken_auth"); navigate("/login"); }}
          style={{ marginTop: 20, background: "#38BDF8", color: "#000", border: "none", padding: "10px 20px", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}
        >
          CERRAR SESIÓN PARA PROBAR
        </button>
      </div>
    </div>
  );
}
