import { BrowserRouter, Routes, Route } from "react-router-dom";
import AukenOS              from "./pages/AukenOS";
import AukenLanding         from "./pages/AukenLanding";
import AukenDashboard       from "./pages/AukenDashboard";
import AukenWidget          from "./pages/AukenWidget";
import AukenOptica          from "./pages/AukenOptica";
import AukenOpticaLanding   from "./pages/AukenOpticaLanding";
import AukenOpticaDashboard from "./pages/AukenOpticaDashboard";
import AukenIntegrations    from "./pages/AukenIntegrations";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<AukenOS />} />
        <Route path="/landing"           element={<AukenLanding />} />
        <Route path="/dashboard"         element={<AukenDashboard />} />
        <Route path="/widget"            element={<AukenWidget />} />
        <Route path="/optica"            element={<AukenOptica />} />
        <Route path="/optica/landing"    element={<AukenOpticaLanding />} />
        <Route path="/optica/dashboard"  element={<AukenOpticaDashboard />} />
        <Route path="/integrations"      element={<AukenIntegrations />} />
      </Routes>
    </BrowserRouter>
  );
}
