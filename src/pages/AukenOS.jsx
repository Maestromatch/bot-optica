import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ── PALETA WAR ROOM ──────────────────────────────────────────────
const K = {
  bg:       "#070A0E",
  bgMid:    "#0C1016",
  bgSurf:   "#131920",
  bgHover:  "#1A2330",
  b0:       "#1E2A38",
  b1:       "#243040",
  ink:      "#D4DCE8",
  inkMid:   "#7A8CA0",
  inkFaint: "#3A4A5A",
  neon:     "#00FFB3",
  neonDim:  "#00C87A",
  neonGhost:"#00FFB310",
  amber:    "#FFB830",
  amberDim: "#CC8A00",
  amberG:   "#FFB83010",
  red:      "#FF4444",
  redG:     "#FF444410",
  blue:     "#4A9EFF",
  blueG:    "#4A9EFF10",
  cobalt:   "#1B4FD8",
  white:    "#FFFFFF",
};

// ── DATOS AGENCIA (Dinamizados en el componente) ────────────────

const PRODUCTS = [
  { id:"widget",       name:"Widget Atendedor",    icon:"💬", clients:4, status:"live",    desc:"Chatbot Claude API · 24/7",          color:K.neon  },
  { id:"optica",       name:"Sistema Óptica",      icon:"👁️", clients:3, status:"live",    desc:"Fichas + recordatorios + chat",       color:K.blue  },
  { id:"landing",      name:"Landing por nicho",   icon:"🏗️", clients:6, status:"live",    desc:"Demo vendible · 5 nichos",            color:K.amber },
  { id:"integrations", name:"Integrations Hub",    icon:"⚡", clients:2, status:"beta",    desc:"n8n + WhatsApp + Google Cal",         color:K.cobalt },
  { id:"dental",       name:"Sistema Dental",      icon:"🦷", clients:0, status:"roadmap", desc:"En construcción · Q3 2025",           color:K.inkFaint },
  { id:"vet",          name:"Sistema Veterinaria", icon:"🐾", clients:0, status:"roadmap", desc:"En construcción · Q4 2025",           color:K.inkFaint },
];

const ACTIVITY = [
  { ts:"10:41", icon:"💬", client:"Clínica Dental Arcos",  event:"Nueva consulta recibida · presupuesto ortodoncia",       color:K.neon  },
  { ts:"10:38", icon:"📅", client:"Óptica Visión Clara",    event:"Cita agendada · examen de vista sábado 10:30",           color:K.blue  },
  { ts:"10:35", icon:"⚠️", client:"Óptica Lux Centro",      event:"Receta vencida · recordatorio enviado a +56933...",      color:K.amber },
  { ts:"10:31", icon:"🆕", client:"Veterinaria PataPata",   event:"Sistema activado · primer mensaje recibido",             color:K.amber },
  { ts:"10:28", icon:"💬", client:"Óptica Visión Clara",    event:"7 consultas resueltas sin intervención humana",          color:K.blue  },
  { ts:"10:15", icon:"📊", client:"Clínica Dental Arcos",  event:"Reporte semanal enviado al dueño por WhatsApp",          color:K.neon  },
  { ts:"09:52", icon:"⭐", client:"Óptica Visión Clara",    event:"Nuevo cliente agendó control · María González",          color:K.blue  },
  { ts:"09:31", icon:"💬", client:"Carnicería El Toro",     event:"Sistema en pausa · último mensaje hace 14 días",         color:K.red   },
];

const MRR_HISTORY = [
  { mes:"Ene", mrr:400  },
  { mes:"Feb", mrr:650  },
  { mes:"Mar", mrr:900  },
  { mes:"Abr", mrr:900  },
  { mes:"May", mrr:1150 },
  { mes:"Jun", mrr:1150 },
];

// ── STATUS CONFIG ────────────────────────────────────────────────
const S = {
  active:     { label:"Activo",     color:K.neon,  bg:K.neonGhost },
  onboarding: { label:"Onboarding", color:K.amber, bg:K.amberG    },
  paused:     { label:"Pausado",    color:K.red,   bg:K.redG      },
  live:       { label:"Live",       color:K.neon,  bg:K.neonGhost },
  beta:       { label:"Beta",       color:K.blue,  bg:K.blueG     },
  roadmap:    { label:"Roadmap",    color:K.inkFaint, bg:K.bgSurf },
};

// ── HOOKS ────────────────────────────────────────────────────────
function useInterval(fn, ms) {
  const cb = useRef(fn);
  useEffect(() => { cb.current = fn; }, [fn]);
  useEffect(() => { const id = setInterval(() => cb.current(), ms); return () => clearInterval(id); }, [ms]);
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useInterval(() => setTime(new Date()), 1000);
  return time;
}

function useCounter(target, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return val;
}

// ── MICRO COMPONENTS ────────────────────────────────────────────
function Chip({ label, color, bg }) {
  return (
    <span style={{ background:bg, color, border:`1px solid ${color}30`, borderRadius:2, padding:"1px 6px", fontSize:9, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>
      {label}
    </span>
  );
}

function Pulse({ color = K.neon, size = 6 }) {
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, opacity:.3, animation:"ping 2s infinite" }} />
      <div style={{ position:"absolute", inset:1, borderRadius:"50%", background:color }} />
    </div>
  );
}

function Separator({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, margin:"4px 0" }}>
      <div style={{ flex:1, height:"1px", background:K.b0 }} />
      {label && <span style={{ fontSize:8, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</span>}
      <div style={{ flex:1, height:"1px", background:K.b0 }} />
    </div>
  );
}

// ── MRR CHART ────────────────────────────────────────────────────
function MRRChart({ data }) {
  const max = Math.max(...data.map(d => d.mrr));
  const W = 280, H = 80;
  const pts = data.map((d, i) => {
    const x = 24 + (i / (data.length - 1)) * (W - 48);
    const y = H - 16 - ((d.mrr / max) * (H - 32));
    return { x, y, ...d };
  });
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `M${pts[0].x},${H - 16} ${pts.map(p => `L${p.x},${p.y}`).join(" ")} L${pts[pts.length-1].x},${H-16} Z`;

  return (
    <svg width={W} height={H} style={{ display:"block", overflow:"visible" }}>
      <defs>
        <linearGradient id="mrrGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={K.neon} stopOpacity=".25" />
          <stop offset="100%" stopColor={K.neon} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#mrrGrad)" />
      <path d={pathD} fill="none" stroke={K.neon} strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={K.bg} stroke={K.neon} strokeWidth="1.5" />
          <text x={p.x} y={H - 4} fill={K.inkFaint} fontSize="8" fontFamily="'IBM Plex Mono',monospace" textAnchor="middle">{p.mes}</text>
        </g>
      ))}
    </svg>
  );
}

// ── NICHE BREAKDOWN ──────────────────────────────────────────────
function NicheBreakdown({ clients }) {
  const groups = clients.reduce((acc, c) => {
    if (!acc[c.niche]) acc[c.niche] = { icon: c.icon, count: 0, mrr: 0 };
    acc[c.niche].count++;
    acc[c.niche].mrr += c.mrr;
    return acc;
  }, {});
  const total = Object.values(groups).reduce((a, g) => a + g.mrr, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {Object.entries(groups).map(([niche, g]) => {
        const pct = total > 0 ? Math.round((g.mrr / total) * 100) : 0;
        return (
          <div key={niche}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:12 }}>{g.icon}</span>
                <span style={{ fontSize:10, color:K.inkMid, fontFamily:"'IBM Plex Mono',monospace", textTransform:"capitalize" }}>{niche}</span>
                <span style={{ fontSize:9, color:K.inkFaint }}>({g.count})</span>
              </div>
              <span style={{ fontSize:10, color:K.neon, fontFamily:"'IBM Plex Mono',monospace" }}>{pct}%</span>
            </div>
            <div style={{ height:3, background:K.bgHover, borderRadius:2 }}>
              <div style={{ height:"100%", width:`${pct}%`, background:K.neon, borderRadius:2, opacity: pct > 0 ? 1 : 0.2, transition:"width .6s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CLIENT ROW ───────────────────────────────────────────────────
function ClientRow({ client: c, idx }) {
  const s = S[c.status];
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"24px 1fr 80px 70px 70px 70px 80px",
      alignItems:"center", padding:"9px 14px",
      background: idx % 2 === 0 ? K.bgSurf : K.bg,
      borderBottom:`1px solid ${K.b0}`,
      transition:"background .15s", cursor:"pointer",
      gap:8,
    }}
      onMouseEnter={e => e.currentTarget.style.background = K.bgHover}
      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? K.bgSurf : K.bg}
    >
      <span style={{ fontSize:14 }}>{c.icon}</span>
      <div>
        <div style={{ fontSize:12, color:K.ink, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, letterSpacing:"0.02em" }}>{c.name}</div>
        <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{c.plan} · desde {c.since}</div>
      </div>
      <Chip label={s.label} color={s.color} bg={s.bg} />
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:13, color:c.mrr > 0 ? K.neon : K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", fontWeight:500 }}>
          {c.mrr > 0 ? `$${(c.mrr/1000).toFixed(0)}K` : "—"}
        </div>
      </div>
      <div style={{ textAlign:"right", fontSize:12, color:K.blue, fontFamily:"'IBM Plex Mono',monospace" }}>{c.contacts}</div>
      <div style={{ textAlign:"right", fontSize:12, color:K.neon, fontFamily:"'IBM Plex Mono',monospace" }}>{c.booked}</div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:4 }}>
        <button style={{ background:K.bgHover, border:`1px solid ${K.b1}`, color:K.inkMid, borderRadius:3, padding:"3px 8px", fontSize:9, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" }}>
          ver →
        </button>
      </div>
    </div>
  );
}

// ── PRODUCT CARD ─────────────────────────────────────────────────
function ProductCard({ product: p }) {
  const s = S[p.status];
  return (
    <div style={{
      background:K.bgSurf, border:`1px solid ${K.b0}`,
      borderTop:`2px solid ${p.color}`,
      borderRadius:6, padding:"14px 16px",
      cursor:"pointer", transition:"all .2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = K.bgHover; e.currentTarget.style.borderColor = p.color; }}
      onMouseLeave={e => { e.currentTarget.style.background = K.bgSurf; e.currentTarget.style.borderColor = K.b0; e.currentTarget.style.borderTopColor = p.color; }}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <span style={{ fontSize:20 }}>{p.icon}</span>
        <Chip label={s.label} color={s.color} bg={s.bg} />
      </div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, color:K.ink, letterSpacing:"0.02em", marginBottom:3 }}>{p.name}</div>
      <div style={{ fontSize:10, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", marginBottom:10 }}>{p.desc}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:10, color:p.color, fontFamily:"'IBM Plex Mono',monospace" }}>
          {p.clients > 0 ? `${p.clients} cliente${p.clients !== 1 ? "s" : ""}` : "—"}
        </span>
        {p.status !== "roadmap" && (
          <span style={{ fontSize:9, color:K.inkFaint }}>abrir →</span>
        )}
      </div>
    </div>
  );
}

// ── SYSTEM STATUS ─────────────────────────────────────────────────
function SystemStatus() {
  const services = [
    { name:"Claude API",          status:"ok",   latency:"312ms",  uptime:"99.9%" },
    { name:"WhatsApp Business",   status:"ok",   latency:"—",      uptime:"99.7%" },
    { name:"n8n Webhooks",        status:"ok",   latency:"88ms",   uptime:"100%"  },
    { name:"Google Calendar API", status:"warn", latency:"1.2s",   uptime:"98.4%" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {services.map(svc => (
        <div key={svc.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, background: svc.status === "ok" ? K.neon : K.amber, boxShadow: `0 0 5px ${svc.status === "ok" ? K.neon : K.amber}` }} />
          <span style={{ flex:1, fontSize:10, color:K.inkMid, fontFamily:"'IBM Plex Mono',monospace" }}>{svc.name}</span>
          <span style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{svc.latency}</span>
          <span style={{ fontSize:9, color:svc.status==="ok" ? K.neon : K.amber, fontFamily:"'IBM Plex Mono',monospace" }}>{svc.uptime}</span>
        </div>
      ))}
    </div>
  );
}

// ── STAT BOX ─────────────────────────────────────────────────────
function StatBox({ value, label, sub, color, prefix = "", suffix = "" }) {
  const n = typeof value === "number" ? useCounter(value) : null;
  return (
    <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, padding:"14px 16px" }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:34, color, lineHeight:1, letterSpacing:"-0.01em" }}>
        {prefix}{n !== null ? n.toLocaleString("es-CL") : value}{suffix}
      </div>
      <div style={{ fontSize:10, color:K.inkMid, fontFamily:"'IBM Plex Mono',monospace", marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ── ONBOARDING MODAL ─────────────────────────────────────────────
function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ name:"", niche:"optica", plan:"pro", owner:"", phone:"" });
  const NICHES = [["dental","🦷","Dental"],["optica","👁️","Óptica"],["veterinaria","🐾","Vet"],["carniceria","🥩","Carnicería"]];
  const PLANS  = [["base","Base · $150K"],["pro","Pro · $250K"],["total","Total · $380K"]];
  const steps  = ["Datos","Producto","Canales","Deploy"];
  const inp    = (key, ph) => (
    <input value={data[key]} onChange={e => setData(p=>({...p,[key]:e.target.value}))} placeholder={ph}
      style={{ width:"100%", background:K.bg, border:`1px solid ${K.b1}`, borderRadius:4, padding:"9px 11px", color:K.ink, fontSize:12, fontFamily:"'IBM Plex Mono',monospace", outline:"none", marginTop:5 }}
      onFocus={e=>e.target.style.borderColor=K.neon} onBlur={e=>e.target.style.borderColor=K.b1} />
  );

  const handleActivate = async () => {
    const newClient = {
      nombre: data.name || "Nuevo Cliente",
      niche: data.niche,
      plan: data.plan,
      icon: NICHES.find(n => n[0] === data.niche)?.[1] || "🏢",
      status: "onboarding",
      mrr: data.plan === "pro" ? 250000 : data.plan === "total" ? 380000 : 150000,
      contacts: 0,
      booked: 0,
      color: data.niche === "optica" ? K.blue : data.niche === "dental" ? K.neon : data.niche === "veterinaria" ? K.amber : K.red,
      since: new Date().toLocaleDateString("es-CL", { month: "short", year: "numeric" }),
      owner_name: data.owner,
      phone: data.phone,
    };

    const { error } = await supabase.from("clientes_agencia").insert([newClient]);
    if (error) {
      alert("Error al activar cliente: " + error.message);
    } else {
      onClose();
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", backdropFilter:"blur(8px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:K.bgMid, border:`1px solid ${K.b1}`, borderRadius:10, width:"100%", maxWidth:480, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:K.bgSurf, padding:"16px 20px", borderBottom:`1px solid ${K.b0}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:16, color:K.ink, letterSpacing:"0.04em" }}>NUEVO CLIENTE</div>
            <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", marginTop:1 }}>Paso {step} de {steps.length} · {steps[step-1]}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:`1px solid ${K.b1}`, color:K.inkFaint, width:26, height:26, borderRadius:4, cursor:"pointer", fontSize:13 }}>✕</button>
        </div>
        {/* Progress */}
        <div style={{ display:"flex", gap:2, padding:"0 20px", paddingTop:14 }}>
          {steps.map((s,i) => (
            <div key={s} style={{ flex:1, height:2, borderRadius:1, background: i < step ? K.neon : K.b0, transition:"background .3s" }} />
          ))}
        </div>
        {/* Content */}
        <div style={{ padding:"16px 20px 12px" }}>
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div><div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Nombre del negocio</div>{inp("name","Óptica Visión Clara")}</div>
              <div><div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Nombre del dueño</div>{inp("owner","Dra. Valeria Rojas")}</div>
              <div><div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>WhatsApp</div>{inp("phone","+56 9 1234 5678")}</div>
            </div>
          )}
          {step === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Nicho</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                  {NICHES.map(([val,ico,lbl]) => (
                    <button key={val} onClick={() => setData(p=>({...p,niche:val}))} style={{ background:data.niche===val ? K.neonGhost : K.bgSurf, border:`1px solid ${data.niche===val ? K.neon : K.b1}`, borderRadius:5, padding:"10px 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <span style={{ fontSize:18 }}>{ico}</span>
                      <span style={{ fontSize:9, color:data.niche===val ? K.neon : K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Plan</div>
                <div style={{ display:"flex", gap:6 }}>
                  {PLANS.map(([val,lbl]) => (
                    <button key={val} onClick={() => setData(p=>({...p,plan:val}))} style={{ flex:1, background:data.plan===val ? K.neonGhost : K.bgSurf, border:`1px solid ${data.plan===val ? K.neon : K.b1}`, borderRadius:4, padding:"9px 4px", cursor:"pointer", fontSize:10, color:data.plan===val ? K.neon : K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textAlign:"center" }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[["💬 WhatsApp Business API","Canal principal · obligatorio"],["🌐 Chat web embebible","Widget en sitio del cliente"],["📷 Instagram DM","Requiere cuenta Business"]].map(([ch,desc]) => (
                <div key={ch} style={{ background:K.bgSurf, border:`1px solid ${K.b1}`, borderRadius:6, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, color:K.ink, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600 }}>{ch}</div>
                    <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{desc}</div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:4, background:K.neonGhost, border:`1px solid ${K.neon}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:K.neon }}>✓</div>
                </div>
              ))}
            </div>
          )}
          {step === 4 && (
            <div style={{ textAlign:"center", padding:"12px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🐻‍❄️</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:20, color:K.ink, letterSpacing:"0.04em", marginBottom:8 }}>LISTO PARA DEPLOY</div>
              <div style={{ fontSize:11, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", lineHeight:1.7, marginBottom:16 }}>
                {data.name || "El negocio"} será activado en producción.<br/>Sistema vivo en menos de 72 horas.
              </div>
              <div style={{ background:K.bgSurf, border:`1px solid ${K.b1}`, borderRadius:6, padding:"12px 16px", textAlign:"left" }}>
                {[["Negocio", data.name||"—"], ["Plan", `Oso Polar ${data.plan}`], ["Nicho", data.niche], ["Dueño", data.owner||"—"]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${K.b0}` }}>
                    <span style={{ fontSize:10, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{k}</span>
                    <span style={{ fontSize:10, color:K.neon, fontFamily:"'IBM Plex Mono',monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Nav */}
        <div style={{ padding:"12px 20px 16px", display:"flex", justifyContent:"space-between" }}>
          <button onClick={() => step > 1 ? setStep(s=>s-1) : onClose()} style={{ background:"none", border:`1px solid ${K.b1}`, color:K.inkMid, padding:"8px 16px", borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
            {step===1 ? "Cancelar" : "← Atrás"}
          </button>
          <button onClick={() => step < steps.length ? setStep(s=>s+1) : handleActivate()} style={{ background:step===steps.length ? K.neonDim : K.bgHover, color:step===steps.length ? K.bg : K.ink, border:`1px solid ${step===steps.length ? K.neon : K.b1}`, padding:"8px 18px", borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:"0.06em" }}>
            {step===steps.length ? "🐻‍❄️ ACTIVAR" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────
export default function AukenOS() {
  const [clients, setClients] = useState([]);
  const [view, setView]             = useState("overview");
  const [showOnboard, setOnboard]   = useState(false);
  const [liveActivity, setActivity] = useState(ACTIVITY);
  const [loading, setLoading]       = useState(true);
  const clock                       = useClock();

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from("clientes_agencia").select("*").order("created_at", { ascending: false });
      if (!error && data) setClients(data);
      setLoading(false);
    };
    fetchClients();
    
    // Suscripción Realtime
    const sub = supabase.channel("saas-clients").on("postgres_changes", { event: "*", schema: "public", table: "clientes_agencia" }, fetchClients).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const mrr    = clients.filter(c=>c.status!=="paused").reduce((a,c)=>a+Number(c.mrr || 0),0);
  const active = clients.filter(c=>c.status==="active").length;

  // Simula actividad en vivo
  const NEW_EVENTS = [
    { icon:"💬", client:"Clínica Dental Arcos",  event:"Nueva consulta · paciente pregunta por blanqueamiento",  color:K.neon  },
    { icon:"📅", client:"Óptica Visión Clara",    event:"Cita confirmada · viernes 14:00",                        color:K.blue  },
    { icon:"⚡", client:"Veterinaria PataPata",   event:"Flujo n8n activado · recordatorio vacunación",           color:K.amber },
    { icon:"💬", client:"Óptica Lux Centro",      event:"Consulta resuelta sin intervención humana",              color:K.blue  },
  ];
  useInterval(() => {
    const e = NEW_EVENTS[Math.floor(Math.random() * NEW_EVENTS.length)];
    const ts = clock.toLocaleTimeString("es-CL", { hour:"2-digit", minute:"2-digit" });
    setActivity(a => [{ ...e, ts }, ...a].slice(0, 20));
  }, 5000);

  const NAV = [
    { id:"overview",   label:"Overview",     icon:"◈" },
    { id:"clients",    label:"Clientes",     icon:"◉" },
    { id:"products",   label:"Productos",    icon:"◻" },
    { id:"revenue",    label:"Ingresos",     icon:"◈" },
  ];

  return (
    <div style={{ background:K.bg, minHeight:"100vh", color:K.ink, fontFamily:"'Barlow Condensed','IBM Plex Mono',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; background:${K.bg}; }
        ::-webkit-scrollbar-thumb { background:${K.b1}; border-radius:3px; }
        @keyframes ping    { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes slide   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }
        @keyframes glow    { 0%,100%{text-shadow:0 0 8px ${K.neon}40} 50%{text-shadow:0 0 20px ${K.neon}80} }
      `}</style>

      {showOnboard && <OnboardingModal onClose={() => setOnboard(false)} />}

      {/* ── TOP BAR ── */}
      <div style={{ background:K.bgMid, borderBottom:`1px solid ${K.b0}`, height:48, display:"flex", alignItems:"center", padding:"0 18px", gap:0, position:"sticky", top:0, zIndex:50 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, paddingRight:18, borderRight:`1px solid ${K.b0}` }}>
          <Pulse color={K.neon} size={7} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:18, letterSpacing:"0.1em", color:K.neon, animation:"glow 3s infinite" }}>AUKÉN</span>
          <span style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>os v1.0</span>
        </div>

        {/* Nav */}
        <div style={{ display:"flex", gap:1, paddingLeft:12, flex:1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              background: view===n.id ? K.bgSurf : "none",
              border: view===n.id ? `1px solid ${K.b1}` : "1px solid transparent",
              color: view===n.id ? K.neon : K.inkMid,
              borderRadius:4, padding:"5px 12px", cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
              fontSize:12, letterSpacing:"0.06em", textTransform:"uppercase",
              transition:"all .15s",
            }}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Right cluster */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:4, padding:"4px 10px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:K.neonDim }}>
            {clock.toLocaleTimeString("es-CL", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
          </div>
          <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:4, padding:"4px 10px", fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>
            🌲 bosque · Santiago
          </div>
          <button onClick={() => setOnboard(true)} style={{ background:K.neonDim, color:K.bg, border:"none", borderRadius:4, padding:"6px 14px", fontSize:11, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:"0.08em", cursor:"pointer" }}>
            + CLIENTE
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding:"16px 18px", maxWidth:1400, margin:"0 auto" }}>

        {/* ── OVERVIEW ── */}
        {view === "overview" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:14, animation:"fadeIn .4s ease" }}>
            {/* Left column */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* KPI row */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                <StatBox value={mrr/1000} label="MRR" sub="miles CLP / mes" color={K.neon} suffix="K" />
                <StatBox value={active} label="Clientes activos" sub={`de ${clients.length} totales`} color={K.blue} />
                <StatBox value={clients.reduce((a,c)=>a+Number(c.contacts || 0),0)} label="Consultas atendidas" sub="total histórico" color={K.amber} />
                <StatBox value={clients.reduce((a,c)=>a+Number(c.booked || 0),0)} label="Citas generadas" sub="por el sistema" color={K.neon} />
              </div>

              {/* Products grid */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Productos activos</div>
                  <button onClick={() => setView("products")} style={{ background:"none", border:"none", color:K.neon, fontSize:9, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" }}>ver todos →</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {PRODUCTS.slice(0,3).map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>

              {/* Clients table */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Clientes</div>
                  <button onClick={() => setView("clients")} style={{ background:"none", border:"none", color:K.neon, fontSize:9, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" }}>ver todos →</button>
                </div>
                <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, overflow:"hidden" }}>
                  {/* Table header */}
                  <div style={{ display:"grid", gridTemplateColumns:"24px 1fr 80px 70px 70px 70px 80px", padding:"7px 14px", background:K.bgMid, borderBottom:`1px solid ${K.b0}`, gap:8 }}>
                    {["","Cliente","Estado","MRR","Consultas","Citas",""].map((h,i) => (
                      <div key={i} style={{ fontSize:8, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em", textAlign: i > 2 ? "right" : "left" }}>{h}</div>
                    ))}
                  </div>
                  {clients.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: K.inkFaint, fontSize: 12 }}>
                      No hay clientes registrados aún. Usa el botón + CLIENTE para empezar.
                    </div>
                  ) : (
                    clients.map((c, i) => <ClientRow key={c.id} client={c} idx={i} />)
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              {/* MRR chart */}
              <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, padding:"14px 16px" }}>
                <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>MRR — crecimiento</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:28, color:K.neon, marginBottom:8 }}>
                  ${(mrr/1000).toFixed(0)}K <span style={{ fontSize:12, color:K.neonDim }}>+28% M/M</span>
                </div>
                <MRRChart data={MRR_HISTORY} />
              </div>

              {/* Niche breakdown */}
              <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, padding:"14px 16px" }}>
                <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>MRR por nicho</div>
                {clients.length > 0 ? <NicheBreakdown clients={clients} /> : <div style={{ fontSize:10, color:K.inkFaint }}>Sin datos</div>}
              </div>

              {/* System status */}
              <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, padding:"14px 16px" }}>
                <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Estado de servicios</div>
                <SystemStatus />
              </div>

              {/* Live activity */}
              <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, overflow:"hidden", flex:1 }}>
                <div style={{ padding:"10px 14px", borderBottom:`1px solid ${K.b0}`, display:"flex", alignItems:"center", gap:6 }}>
                  <Pulse color={K.neon} size={6} />
                  <span style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em" }}>Actividad en vivo</span>
                </div>
                <div style={{ maxHeight:280, overflowY:"auto", padding:"8px 12px", display:"flex", flexDirection:"column", gap:7 }}>
                  {liveActivity.map((a, i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", animation: i===0 ? "slide .3s ease" : "none" }}>
                      <div style={{ width:26, height:26, borderRadius:5, background:K.bgHover, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>{a.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:10, color:a.color, fontFamily:"'IBM Plex Mono',monospace", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.client}</div>
                        <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", lineHeight:1.4, marginTop:1 }}>{a.event}</div>
                      </div>
                      <div style={{ fontSize:8, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", flexShrink:0 }}>{a.ts}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENTS VIEW ── */}
        {view === "clients" && (
          <div style={{ animation:"fadeIn .4s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, letterSpacing:"0.06em" }}>CLIENTES</div>
                <div style={{ fontSize:10, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{clients.length} registrados · {active} activos</div>
              </div>
              <button onClick={() => setOnboard(true)} style={{ background:K.neonDim, color:K.bg, border:"none", borderRadius:4, padding:"8px 16px", fontSize:11, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:"0.08em", cursor:"pointer" }}>
                + AGREGAR CLIENTE
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {clients.map(c => {
                const s = S[c.status];
                return (
                  <div key={c.id} style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderLeft:`3px solid ${c.color}`, borderRadius:6, padding:"14px 16px", cursor:"pointer", transition:"all .2s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=K.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background=K.bgSurf}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:20 }}>{c.icon}</span>
                        <div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, color:K.ink }}>{c.name}</div>
                          <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>desde {c.since}</div>
                        </div>
                      </div>
                      <Chip label={s.label} color={s.color} bg={s.bg} />
                    </div>
                    <Separator />
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginTop:8 }}>
                      {[["MRR", c.mrr > 0 ? `$${(c.mrr/1000).toFixed(0)}K` : "—", K.neon], ["Consultas", c.contacts, K.blue], ["Citas", c.booked, K.neonDim]].map(([l,v,col]) => (
                        <div key={l} style={{ textAlign:"center" }}>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:20, color:col }}>{v}</div>
                          <div style={{ fontSize:8, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PRODUCTS VIEW ── */}
        {view === "products" && (
          <div style={{ animation:"fadeIn .4s ease" }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, letterSpacing:"0.06em" }}>PRODUCTOS</div>
              <div style={{ fontSize:10, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>Stack completo de la agencia</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {PRODUCTS.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

        {/* ── REVENUE VIEW ── */}
        {view === "revenue" && (
          <div style={{ animation:"fadeIn .4s ease" }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:22, letterSpacing:"0.06em" }}>INGRESOS</div>
              <div style={{ fontSize:10, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>MRR · proyecciones · breakdown</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, padding:"20px 22px" }}>
                <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>MRR actual</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:42, color:K.neon, animation:"glow 3s infinite" }}>
                  ${(mrr/1000).toFixed(0)}K
                </div>
                <div style={{ fontSize:11, color:K.neonDim, fontFamily:"'IBM Plex Mono',monospace", marginTop:2 }}>CLP / mes</div>
                <div style={{ marginTop:16 }}>
                  <MRRChart data={MRR_HISTORY} />
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, padding:"16px 18px" }}>
                  <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Breakdown por cliente</div>
                  {clients.filter(c=>Number(c.mrr)>0).map(c => (
                    <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${K.b0}` }}>
                      <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                        <span style={{ fontSize:12 }}>{c.icon}</span>
                        <span style={{ fontSize:11, color:K.inkMid, fontFamily:"'IBM Plex Mono',monospace" }}>{(c.nombre || c.name).replace(/Clínica |Óptica |Veterinaria /,"")}</span>
                      </div>
                      <span style={{ fontSize:12, color:K.neon, fontFamily:"'IBM Plex Mono',monospace", fontWeight:500 }}>${(Number(c.mrr)/1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
                <div style={{ background:K.bgSurf, border:`1px solid ${K.b0}`, borderRadius:6, padding:"16px 18px" }}>
                  <div style={{ fontSize:9, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Proyección 6 meses</div>
                  {[3,6,12].map(m => (
                    <div key={m} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${K.b0}` }}>
                      <span style={{ fontSize:11, color:K.inkFaint, fontFamily:"'IBM Plex Mono',monospace" }}>+{m} meses ({m === 3 ? "3 clientes" : m === 6 ? "5 clientes" : "8 clientes"})</span>
                      <span style={{ fontSize:12, color:K.amber, fontFamily:"'IBM Plex Mono',monospace" }}>${((mrr*(1+m*0.15))/1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
