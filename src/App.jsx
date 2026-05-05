import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AukenOS              from "./pages/AukenOS";
import AukenLanding         from "./pages/AukenLanding";
import AukenDashboard       from "./pages/AukenDashboard";
import AukenWidget          from "./pages/AukenWidget";
import AukenOptica          from "./pages/AukenOptica";
import AukenOpticaLanding   from "./pages/AukenOpticaLanding";
import AukenOpticaDashboard from "./pages/AukenOpticaDashboard";
import AukenIntegrations    from "./pages/AukenIntegrations";
import AukenLogin           from "./pages/AukenLogin";
import AukenAdmin           from "./pages/AukenAdmin";

// Protected Route Component
function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("auken_auth") === "true";
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<AukenOS />} />
        <Route path="/landing"           element={<AukenLanding />} />
        <Route path="/dashboard"         element={<AukenDashboard />} />
        <Route path="/widget"            element={<AukenWidget />} />
        <Route path="/login"             element={<AukenLogin />} />
        
        {/* Protected Routes for the Optic */}
        <Route path="/optica"            element={<ProtectedRoute><AukenOptica /></ProtectedRoute>} />
        <Route path="/optica/landing"    element={<AukenOpticaLanding />} />
        <Route path="/optica/dashboard"  element={<ProtectedRoute><AukenOpticaDashboard /></ProtectedRoute>} />
        
        <Route path="/integrations"      element={<AukenIntegrations />} />
        <Route path="/admin"             element={<AukenAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}
