import { useState, useEffect, useRef } from "react";
import katex from "katex";
import { PYTHON_PHASES, PYTHON_QUIZ, PYTHON_TIPS } from "./python-lab-data.js";

/* ════════════════════════════════════════════════════════════
   Apti — Editorial / Academic study system
   Light + Dark themes. Designed to feel like a typeset textbook.
   ════════════════════════════════════════════════════════════ */

/* ─── Theme palettes ─────────────────────────────────────────── */
const THEMES = {
  light: {
    bg:        "#F4F1EA",
    bgAlt:     "#EDE8DD",
    panel:     "#FBFAF6",
    card:      "#FFFFFF",
    ink:       "#1A1814",
    sub:       "#5C564B",
    faint:     "#928B7D",
    line:      "#DDD6C8",
    lineStr:   "#C9C0AD",
    accent:    "#9A2A1E",
    accentSf:  "#9A2A1E14",
    gold:      "#A87B2C",
    green:     "#3F6B43",
    blue:      "#2E4A6B",
    rule:      "#1A1814",
    shadow:    "0 1px 2px rgba(26,24,20,0.06), 0 8px 24px rgba(26,24,20,0.05)",
  },
  dark: {
    bg:        "#15130F",
    bgAlt:     "#1C1915",
    panel:     "#1E1A15",
    card:      "#222019",
    ink:       "#EDE8DB",
    sub:       "#A89F8C",
    faint:     "#6E6657",
    line:      "#332E26",
    lineStr:   "#443D32",
    accent:    "#D4674E",
    accentSf:  "#D4674E1A",
    gold:      "#D4A857",
    green:     "#7FA86B",
    blue:      "#7B9DC4",
    rule:      "#EDE8DB",
    shadow:    "0 1px 2px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.3)",
  },
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=Newsreader:ital,opsz@0,6..72;1,6..72&family=Spline+Sans+Mono:wght@400;500&display=swap');
`;

/* ─── API ─────────────────────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

/* ─── Push subscription ───────────────────────────────────────── */
function _b64urlToUint8(b64url) {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready;
  const { public_key } = await apiFetch("/api/push/vapid-key");
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: _b64urlToUint8(public_key),
  });
  const j = sub.toJSON();
  await apiFetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }),
  });
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); detail = j.detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

/* ─── CSS ─────────────────────────────────────────────────────── */
const buildCSS = (c) => `
  ${FONTS}
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  ::selection { background:${c.accent}; color:${c.bg}; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:${c.line}; border-radius:99px; }

  .root {
    background:${c.bg};
    color:${c.ink};
    font-family:'Newsreader', Georgia, serif;
    min-height:100vh;
    transition:background 0.4s ease, color 0.4s ease;
  }
  .shell { display:flex; min-height:100vh; }

  .sidebar {
    width:248px; flex-shrink:0;
    background:${c.panel};
    border-right:1px solid ${c.line};
    padding:32px 20px 24px;
    position:sticky; top:0; height:100vh;
    display:flex; flex-direction:column;
    overflow-y:auto;
  }
  .main { flex:1; min-width:0; }
  .bottom-nav { display:none; }

  @media (max-width:820px) {
    .sidebar { display:none; }
    .bottom-nav {
      display:flex; position:fixed; bottom:0; left:0; right:0;
      background:${c.panel}; border-top:1px solid ${c.line};
      padding:10px 0 16px; z-index:100;
      box-shadow:0 -4px 24px rgba(0,0,0,0.08);
    }
    .main { padding-bottom:78px; }
  }

  .display { font-family:'Fraunces', serif; font-weight:900; letter-spacing:-0.02em; line-height:1.05; }
  .serif-h { font-family:'Fraunces', serif; font-weight:600; letter-spacing:-0.01em; }
  .body { font-family:'Newsreader', serif; }
  .mono { font-family:'Spline Sans Mono', monospace; }
  .kicker {
    font-family:'Spline Sans Mono', monospace; font-size:11px;
    letter-spacing:0.22em; text-transform:uppercase; color:${c.faint};
  }

  .header { padding:40px 48px 0; }
  .header-rule { border-bottom:2px solid ${c.rule}; padding-bottom:24px; }
  @media (max-width:820px){ .header { padding:28px 20px 0; } }

  .content { padding:32px 48px 56px; }
  @media (max-width:820px){ .content { padding:24px 20px 40px; } }

  .two-col { display:grid; grid-template-columns:1fr 320px; gap:40px; }
  @media (max-width:1080px){ .two-col { grid-template-columns:1fr; gap:28px; } }

  .session-col { display:grid; grid-template-columns:1fr 360px; gap:40px; align-items:start; }
  @media (max-width:1000px){ .session-col { grid-template-columns:1fr; gap:24px; } }

  .stat-row { display:grid; grid-template-columns:repeat(4,1fr); gap:0; border:1px solid ${c.line}; border-radius:4px; overflow:hidden; }
  @media (max-width:680px){ .stat-row { grid-template-columns:repeat(2,1fr); } }

  .skill-list { display:flex; flex-direction:column; }

  .paper {
    background:${c.card};
    border:1px solid ${c.line};
    border-radius:4px;
  }

  .skill-row {
    display:flex; align-items:center; gap:20px;
    padding:20px 24px;
    border-bottom:1px solid ${c.line};
    cursor:pointer;
    transition:background 0.2s ease, padding-left 0.2s ease;
    position:relative;
  }
  .skill-row:last-child { border-bottom:none; }
  .skill-row.unlocked:hover { background:${c.bgAlt}; padding-left:30px; }
  .skill-row::before {
    content:""; position:absolute; left:0; top:0; bottom:0; width:0;
    background:${c.accent}; transition:width 0.2s ease;
  }
  .skill-row.unlocked:hover::before { width:4px; }

  .btn {
    font-family:'Spline Sans Mono', monospace; font-size:12px;
    letter-spacing:0.1em; text-transform:uppercase;
    padding:13px 26px; border-radius:3px; cursor:pointer;
    border:1.5px solid ${c.ink}; background:${c.ink}; color:${c.bg};
    transition:all 0.2s ease;
  }
  .btn:hover { background:transparent; color:${c.ink}; }
  .btn:disabled { opacity:0.4; cursor:not-allowed; }
  .btn-ghost { background:transparent; color:${c.ink}; border-color:${c.line}; }
  .btn-ghost:hover { border-color:${c.ink}; background:${c.bgAlt}; }
  .btn-accent { background:${c.accent}; border-color:${c.accent}; color:#fff; }
  .btn-accent:hover { background:transparent; color:${c.accent}; }

  .nav-item {
    display:flex; align-items:baseline; gap:14px;
    padding:11px 14px; border-radius:3px; cursor:pointer;
    font-family:'Newsreader', serif; font-size:16px;
    color:${c.sub}; transition:all 0.18s ease;
    width:100%; text-align:left; background:none; border:none;
    border-left:2px solid transparent;
  }
  .nav-item:hover { color:${c.ink}; background:${c.bgAlt}; }
  .nav-item.active { color:${c.ink}; border-left-color:${c.accent}; background:${c.bgAlt}; font-weight:500; }
  .nav-num { font-family:'Spline Sans Mono', monospace; font-size:11px; color:${c.faint}; width:18px; }

  .opt {
    width:100%; text-align:left; cursor:pointer;
    padding:16px 20px; margin-bottom:10px;
    border:1px solid ${c.line}; border-radius:3px;
    background:${c.card}; display:flex; align-items:center; gap:16px;
    font-family:'Newsreader', serif; font-size:17px;
    transition:all 0.18s ease;
  }
  .opt:hover { border-color:${c.lineStr}; background:${c.bgAlt}; }

  .fc {
    min-height:240px; border:1px solid ${c.line}; border-radius:4px;
    background:${c.card}; padding:40px 36px; cursor:pointer;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    text-align:center; transition:all 0.3s ease; position:relative;
    box-shadow:${c.shadow};
  }
  .fc::before {
    content:""; position:absolute; top:14px; left:14px; right:14px; bottom:14px;
    border:1px solid ${c.line}; border-radius:2px; pointer-events:none;
  }
  .fc:hover { border-color:${c.lineStr}; }
  .fc.flip { background:${c.bgAlt}; }

  .dropcap::first-letter {
    font-family:'Fraunces', serif; font-weight:900;
    font-size:3.4em; line-height:0.8; float:left;
    margin:6px 10px 0 0; color:${c.accent};
  }

  @keyframes fadeUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
  .fade { animation:fadeUp 0.45s ease both; }
  @keyframes grow { from{width:0;} to{width:var(--w);} }
  .bar { height:100%; border-radius:99px; animation:grow 0.9s ease both; width:var(--w); }

  .ring-c { transition:stroke-dasharray 1s ease; }

  code.inl {
    font-family:'Spline Sans Mono', monospace; font-size:0.9em;
    background:${c.accentSf}; color:${c.accent};
    padding:2px 7px; border-radius:3px;
  }

  textarea.open-ans {
    width:100%; min-height:140px; padding:16px 20px;
    border:1px solid ${c.line}; border-radius:3px;
    background:${c.card}; color:${c.ink};
    font-family:'Newsreader',serif; font-size:17px; line-height:1.6;
    resize:vertical; outline:none; transition:border-color 0.18s;
  }
  textarea.open-ans:focus { border-color:${c.lineStr}; }
`;

/* ─── Helpers ─────────────────────────────────────────────────── */
function Ring({ pct, color, size=80, stroke=3 }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, dash=(pct/100)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" opacity="0.12" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="butt" className="ring-c"/>
    </svg>
  );
}

const ThemeToggle = ({ mode, setMode, c }) => (
  <button onClick={()=>setMode(mode==="light"?"dark":"light")}
    style={{
      background:"none", border:`1px solid ${c.line}`, borderRadius:99,
      padding:"6px 14px", cursor:"pointer", color:c.sub,
      fontFamily:"'Spline Sans Mono',monospace", fontSize:11,
      letterSpacing:"0.1em", display:"flex", alignItems:"center", gap:8,
      transition:"all 0.2s",
    }}>
    {mode==="light" ? "◐ DARK" : "◑ LIGHT"}
  </button>
);

/* ─── Loading / Error screens ────────────────────────────────── */
function Loading({ c, message = "Loading…" }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"80vh",gap:20}}>
      <div style={{
        width:52,height:52,borderRadius:"50%",
        background:c.accentSf,border:`1px solid ${c.accent}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:24,color:c.accent,
      }}>A</div>
      <p className="body" style={{fontSize:17,color:c.sub,textAlign:"center",maxWidth:320,lineHeight:1.7}}>{message}</p>
    </div>
  );
}

function ErrorScreen({ c, message, onBack }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"80vh",gap:16,padding:"0 24px",textAlign:"center"}}>
      <div className="serif-h" style={{fontSize:22,color:c.accent}}>Something went wrong</div>
      <p className="body" style={{fontSize:16,color:c.sub,maxWidth:400,lineHeight:1.6}}>{message}</p>
      <button className="btn btn-ghost" style={{marginTop:8}} onClick={onBack}>← Back to Dashboard</button>
    </div>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────── */
const NAV = [
  { id:"dashboard",  num:"01", label:"Dashboard" },
  { id:"flashcards", num:"02", label:"Flashcards" },
  { id:"session",    num:"03", label:"Study Hall" },
  { id:"progress",   num:"04", label:"Progress" },
];

const SUBJECT_COLORS = {
  mathematics:            "accent",
  electrical_engineering: "blue",
  programming:            "green",
};

function Sidebar({ view, setView, c, mode, setMode, skills, subjects, activeSubject, setActiveSubject }) {
  const overall = skills.length
    ? Math.round(skills.reduce((a,s)=>a+s.mastery,0)/skills.length)
    : 0;
  return (
    <aside className="sidebar">
      <div style={{marginBottom:8}}>
        <div className="display" style={{fontSize:26, color:c.ink}}>
          Ap<span style={{color:c.accent}}>ti</span>
        </div>
        <div className="kicker" style={{marginTop:4}}>Adaptive Study System</div>
      </div>

      <div style={{height:2, background:c.rule, margin:"22px 0 24px"}}/>

      <nav style={{flex:1}}>
        <div className="kicker" style={{paddingLeft:14, marginBottom:10}}>Contents</div>
        {NAV.map(n=>(
          <button key={n.id} className={`nav-item ${view===n.id?"active":""}`} onClick={()=>setView(n.id)}>
            <span className="nav-num">{n.num}</span>{n.label}
          </button>
        ))}
      </nav>

      {subjects.length > 0 && (
        <div style={{borderTop:`1px solid ${c.line}`, paddingTop:16, marginBottom:16}}>
          <div className="kicker" style={{paddingLeft:14, marginBottom:10}}>Subject</div>
          {subjects.map(s => {
            const col = c[SUBJECT_COLORS[s.id]] || c.accent;
            const active = s.id === activeSubject;
            return (
              <button key={s.id} onClick={()=>{setActiveSubject(s.id); setView("dashboard");}} style={{
                display:"flex", alignItems:"center", gap:10, width:"100%",
                background: active ? col+"18" : "none",
                border:"none", borderRadius:3, padding:"8px 14px",
                cursor:"pointer", textAlign:"left",
                borderLeft: active ? `3px solid ${col}` : "3px solid transparent",
                transition:"all 0.15s",
              }}>
                <div style={{flex:1}}>
                  <div className="serif-h" style={{fontSize:13, color:active?col:c.sub, lineHeight:1.2}}>{s.name}</div>
                  <div className="mono" style={{fontSize:9, color:c.faint, marginTop:2}}>{s.mastery}% mastery</div>
                </div>
              </button>
            );
          })}
          {activeSubject === "programming" && (
            <button onClick={()=>setView("python-lab")} style={{
              display:"flex", alignItems:"center", gap:8, width:"100%",
              background: view==="python-lab" ? c.green+"14" : "none",
              border:"none", borderRadius:3, padding:"7px 14px", marginTop:4,
              cursor:"pointer", textAlign:"left",
              borderLeft: view==="python-lab" ? `3px solid ${c.green}` : "3px solid transparent",
            }}>
              <span style={{fontSize:13}}>⚡</span>
              <div>
                <div className="serif-h" style={{fontSize:13, color: view==="python-lab" ? c.green : c.sub, lineHeight:1.2}}>Practice Lab</div>
                <div className="mono" style={{fontSize:9, color:c.faint, marginTop:2}}>notes · exercises · quiz</div>
              </div>
            </button>
          )}
        </div>
      )}

      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
        border:`1px solid ${c.line}`, borderRadius:3, marginBottom:20,
      }}>
        <span style={{
          width:30, height:30, borderRadius:"50%", flexShrink:0,
          background:c.accentSf, border:`1px solid ${c.accent}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:15, color:c.accent,
        }}>A</span>
        <div>
          <div className="serif-h" style={{fontSize:14, color:c.ink, lineHeight:1.1}}>Apti</div>
          <div className="mono" style={{fontSize:9, color:c.faint, letterSpacing:"0.1em"}}>YOUR TUTOR · ONLINE</div>
        </div>
      </div>

      <div style={{borderTop:`1px solid ${c.line}`, paddingTop:20}}>
        <div className="kicker" style={{marginBottom:12}}>Cumulative Mastery</div>
        <div style={{display:"flex", alignItems:"center", gap:14}}>
          <div style={{position:"relative", color:c.ink}}>
            <Ring pct={overall} color={c.accent} size={56} stroke={3}/>
          </div>
          <div>
            <div className="display" style={{fontSize:30, color:c.accent, lineHeight:1}}>{overall}</div>
            <div className="kicker" style={{fontSize:9, marginTop:2}}>PER CENT</div>
          </div>
        </div>
        <div style={{marginTop:18}}>
          <ThemeToggle mode={mode} setMode={setMode} c={c}/>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ view, setView, c }) {
  return (
    <div className="bottom-nav">
      {NAV.map(n=>{
        const active=view===n.id;
        return (
          <button key={n.id} onClick={()=>setView(n.id)} style={{
            flex:1, background:"none", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:4,
            padding:"4px 0",
          }}>
            <span className="mono" style={{fontSize:10, color:active?c.accent:c.faint, letterSpacing:"0.1em"}}>{n.num}</span>
            <span className="body" style={{fontSize:13, color:active?c.ink:c.faint, fontWeight:active?500:400}}>{n.label}</span>
            {active && <div style={{width:14, height:2, background:c.accent, marginTop:1}}/>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────── */
function Dashboard({ setView, setActiveSkill, c, mode, setMode, skills, subjects, activeSubject, setActiveSubject, onEnterHall }) {
  const [sessions,     setSessions]     = useState([]);
  const [streak,       setStreak]       = useState(null);
  const [notifState,   setNotifState]   = useState("idle"); // idle | requesting | granted | denied | unsupported

  useEffect(() => {
    apiFetch("/api/sessions/recent")
      .then(d => setSessions(d.sessions || []))
      .catch(() => {});
    apiFetch("/api/streak")
      .then(d => setStreak(d.streak))
      .catch(() => {});
    // Check current notification permission
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifState("unsupported");
    } else if (Notification.permission === "granted") {
      setNotifState("granted");
    } else if (Notification.permission === "denied") {
      setNotifState("denied");
    }
  }, []);

  const enableReminders = async () => {
    setNotifState("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setNotifState("denied"); return; }
      await subscribeToPush();
      setNotifState("granted");
    } catch {
      setNotifState("idle");
    }
  };

  const due     = skills.reduce((a,s)=>a+s.due,0);
  const overall = skills.length ? Math.round(skills.reduce((a,s)=>a+s.mastery,0)/skills.length) : 0;
  const unlocked = skills.filter(s=>!s.locked).length;

  const stats = [
    { k:"Mastery",   v:`${overall}%`,                  sub:"cumulative" },
    { k:"Due Today", v:due,                             sub:"flashcards" },
    { k:"Streak",    v: streak === null ? "—" : streak, sub:"days" },
    { k:"Unlocked",  v:`${unlocked}/${skills.length}`,  sub:"chapters" },
  ];

  return (
    <div className="fade">
      <div className="header">
        <div className="header-rule">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12}}>
            <div>
              <div className="kicker">{subjects.find(s=>s.id===activeSubject)?.name ?? "Curriculum"}</div>
              <h1 className="display" style={{fontSize:46, marginTop:10, color:c.ink}}>
                {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,"; })()}<br/>Engineer.
              </h1>
            </div>
            <div className="mono" style={{fontSize:12, color:c.faint, textAlign:"right", paddingTop:6}}>
              {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
            </div>
          </div>
          <p className="body" style={{fontSize:18, color:c.sub, marginTop:16, maxWidth:560, lineHeight:1.5}}>
            {due>0
              ? <>You have <span style={{color:c.accent, fontWeight:500}}>{due} flashcards</span> awaiting review. A focused half hour will move the needle.</>
              : "Your retention is current. Begin a new chapter when you're ready."}
          </p>
        </div>
      </div>

      {/* Notification opt-in banner — shown only when not yet granted */}
      {(notifState === "idle" || notifState === "requesting") && (
        <div style={{
          background: c.accentSf, borderBottom: `1px solid ${c.line}`,
          padding: "12px 40px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          <p className="body" style={{fontSize:14, color:c.sub, margin:0}}>
            Enable daily study reminders so Apti can nudge you at your study window.
          </p>
          <button className="btn btn-accent" style={{fontSize:13, padding:"7px 18px", whiteSpace:"nowrap"}}
            onClick={enableReminders} disabled={notifState === "requesting"}>
            {notifState === "requesting" ? "Requesting…" : "Enable Reminders"}
          </button>
        </div>
      )}

      <div className="content">
        <div className="two-col">
          <div>
            <div className="stat-row" style={{marginBottom:36}}>
              {stats.map((s,i)=>(
                <div key={s.k} style={{
                  padding:"20px 22px",
                  borderRight: i<stats.length-1 ? `1px solid ${c.line}` : "none",
                }}>
                  <div className="kicker" style={{fontSize:9.5}}>{s.k}</div>
                  <div className="display" style={{fontSize:34, color:c.ink, margin:"6px 0 2px"}}>{s.v}</div>
                  <div className="mono" style={{fontSize:10, color:c.faint}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {due>0 && (
              <div onClick={()=>setView("flashcards")} className="paper" style={{
                padding:"20px 24px", marginBottom:36, cursor:"pointer",
                borderLeft:`4px solid ${c.accent}`,
                display:"flex", justifyContent:"space-between", alignItems:"center",
              }}>
                <div>
                  <div className="serif-h" style={{fontSize:19, color:c.ink}}>{due} flashcards due for review</div>
                  <div className="body" style={{fontSize:15, color:c.sub, marginTop:3}}>Reinforce retention · approx. five minutes</div>
                </div>
                <span style={{fontSize:24, color:c.accent}}>→</span>
              </div>
            )}

            {/* Subject tabs */}
            {subjects.length > 0 && (
              <div style={{display:"flex", gap:0, marginBottom:20, borderBottom:`2px solid ${c.rule}`}}>
                {subjects.map(s => {
                  const col = c[SUBJECT_COLORS[s.id]] || c.accent;
                  const active = s.id === activeSubject;
                  return (
                    <button key={s.id} onClick={()=>setActiveSubject(s.id)} style={{
                      background:"none", border:"none", cursor:"pointer",
                      padding:"10px 20px 12px", fontSize:14,
                      fontFamily:"'Newsreader',serif", fontWeight: active ? 600 : 400,
                      color: active ? col : c.sub,
                      borderBottom: active ? `2px solid ${col}` : "2px solid transparent",
                      marginBottom:-2, transition:"all 0.15s",
                    }}>{s.name}</button>
                  );
                })}
              </div>
            )}

            <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:16, borderBottom:`1px solid ${c.line}`, paddingBottom:10}}>
              <h2 className="serif-h" style={{fontSize:20, color:c.ink}}>
                {subjects.find(s=>s.id===activeSubject)?.name ?? "Skills"}
              </h2>
              <span className="kicker">{(subjects.find(s=>s.id===activeSubject)?.skills||[]).length} chapters</span>
            </div>

            <div className="paper skill-list" style={{boxShadow:c.shadow}}>
              {(subjects.find(s=>s.id===activeSubject)?.skills || skills.filter(s=>s.subjectId===activeSubject || !s.subjectId)).map(skill=>{
                const ac = c[skill.accentKey] || c.accent;
                return (
                  <div key={skill.id}
                    className={`skill-row ${skill.locked?"":"unlocked"}`}
                    onClick={()=>{ if(!skill.locked){ setActiveSkill({...skill, subjectId:activeSubject, subs:skill.subs||[], subMastery:skill.subMastery||[], subIds:skill.subIds||[]}); setView("skill"); }}}
                    style={{opacity:skill.locked?0.4:1, cursor:skill.locked?"default":"pointer"}}>
                    <div className="display" style={{fontSize:28, color:skill.locked?c.faint:ac, width:52, flexShrink:0, lineHeight:1}}>
                      {skill.locked ? "·" : skill.num}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:7}}>
                        <span className="serif-h" style={{fontSize:18, color:skill.locked?c.faint:c.ink}}>{skill.label}</span>
                        {skill.due>0 && (
                          <span className="mono" style={{fontSize:10, color:c.accent, border:`1px solid ${c.accent}`, borderRadius:99, padding:"1px 8px"}}>
                            {skill.due} DUE
                          </span>
                        )}
                        {skill.locked && <span style={{fontSize:13}}>🔒</span>}
                      </div>
                      <div style={{display:"flex", alignItems:"center", gap:12}}>
                        <div style={{flex:1, height:3, background:c.line, borderRadius:99, overflow:"hidden"}}>
                          <div className="bar" style={{"--w":`${skill.mastery}%`, background:skill.locked?c.faint:ac}}/>
                        </div>
                        <span className="mono" style={{fontSize:12, color:skill.locked?c.faint:ac, width:38, textAlign:"right"}}>{skill.mastery}%</span>
                      </div>
                    </div>
                    {!skill.locked && <span style={{color:c.faint, fontSize:18, flexShrink:0}}>›</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{borderBottom:`2px solid ${c.rule}`, paddingBottom:10, marginBottom:18}}>
              <h2 className="serif-h" style={{fontSize:20, color:c.ink}}>Recent Study</h2>
            </div>
            <div style={{marginBottom:36}}>
              {sessions.length === 0
                ? <p className="body" style={{fontSize:15,color:c.faint,padding:"12px 0"}}>No sessions yet — enter Study Hall to begin.</p>
                : sessions.map((s,i)=>(
                  <div key={i} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"baseline",
                    padding:"14px 0", borderBottom:`1px solid ${c.line}`,
                  }}>
                    <div>
                      <div className="serif-h" style={{fontSize:16, color:c.ink}}>{s.topic}</div>
                      <div className="mono" style={{fontSize:11, color:c.faint, marginTop:3}}>{s.date.toUpperCase()} · {s.duration}</div>
                    </div>
                    <div className="display" style={{
                      fontSize:24,
                      color: s.score>=80?c.green : s.score>=65?c.gold : c.accent,
                    }}>{s.score}</div>
                  </div>
                ))
              }
            </div>

            <div style={{borderBottom:`2px solid ${c.rule}`, paddingBottom:10, marginBottom:18}}>
              <h2 className="serif-h" style={{fontSize:20, color:c.ink}}>Begin</h2>
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              <button className="btn btn-accent" onClick={onEnterHall}>Enter Study Hall</button>
              <button className="btn btn-ghost" onClick={()=>setView("flashcards")}>Review Flashcards</button>
              <button className="btn btn-ghost" onClick={()=>setView("progress")}>Full Progress</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Skill Detail ────────────────────────────────────────────── */
function SkillDetail({ skill, setView, c, onEnterHall, setLabPhase }) {
  const [notes,     setNotes]     = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved

  useEffect(() => {
    if (!skill) return;
    apiFetch(`/api/notes/${skill.id}`)
      .then(d => setNotes(d.content || ""))
      .catch(() => {});
  }, [skill?.id]);

  const saveNotes = async (content) => {
    setSaveState("saving");
    try {
      await apiFetch(`/api/notes/${skill.id}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  };

  if(!skill) return null;
  const ac = c[skill.accentKey] || c.accent;
  return (
    <div className="fade">
      <div className="header">
        <button onClick={()=>setView("dashboard")} className="mono" style={{
          background:"none", border:"none", color:c.faint, cursor:"pointer",
          fontSize:11, letterSpacing:"0.1em", marginBottom:18, padding:0,
        }}>← BACK TO CURRICULUM</button>
        <div className="header-rule">
          <div style={{display:"flex", alignItems:"baseline", gap:18}}>
            <div className="display" style={{fontSize:60, color:ac, lineHeight:0.9}}>{skill.num}</div>
            <div>
              <div className="kicker">Chapter {skill.num}</div>
              <h1 className="display" style={{fontSize:40, color:c.ink, marginTop:4}}>{skill.label}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="two-col">
          <div>
            <div className="paper" style={{padding:"28px 30px", marginBottom:32, display:"flex", gap:32, alignItems:"center", boxShadow:c.shadow}}>
              <div style={{textAlign:"center", color:c.ink}}>
                <div style={{position:"relative", display:"inline-block"}}>
                  <Ring pct={skill.mastery} color={ac} size={96} stroke={4}/>
                  <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                    <span className="display" style={{fontSize:28, color:ac}}>{skill.mastery}</span>
                  </div>
                </div>
                <div className="kicker" style={{marginTop:10}}>Mastery</div>
              </div>
              <div style={{flex:1}}>
                {[["Due Reviews", skill.due]].map(([k,v])=>(
                  <div key={k} style={{display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${c.line}`}}>
                    <span className="body" style={{fontSize:15, color:c.sub}}>{k}</span>
                    <span className="serif-h" style={{fontSize:16, color:c.ink}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{borderBottom:`2px solid ${c.rule}`, paddingBottom:10, marginBottom:18}}>
              <h2 className="serif-h" style={{fontSize:22, color:c.ink}}>Sections in this Chapter</h2>
            </div>
            <div className="paper" style={{boxShadow:c.shadow}}>
              {(skill.subs||[]).map((s,i)=>(
                <div key={s} style={{
                  display:"flex", alignItems:"center", gap:18, padding:"16px 24px",
                  borderBottom: i<skill.subs.length-1?`1px solid ${c.line}`:"none",
                }}>
                  <span className="mono" style={{fontSize:12, color:c.faint, width:20}}>{i+1}</span>
                  <span className="serif-h" style={{fontSize:17, color:c.ink, flex:1}}>{s}</span>
                  <div style={{width:120, height:3, background:c.line, borderRadius:99, overflow:"hidden"}}>
                    <div className="bar" style={{"--w":`${(skill.subMastery||[])[i]||0}%`, background:ac}}/>
                  </div>
                  <span className="mono" style={{fontSize:12, color:ac, width:34, textAlign:"right"}}>{(skill.subMastery||[])[i]||0}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{borderBottom:`2px solid ${c.rule}`, paddingBottom:10, marginBottom:18}}>
              <h2 className="serif-h" style={{fontSize:20, color:c.ink}}>Actions</h2>
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:10, marginBottom:28}}>
              <button className="btn btn-accent" onClick={onEnterHall}>Enter Study Hall</button>
              {skill.subjectId === "programming" && (
                <button className="btn btn-ghost" onClick={() => setView("python-lab")}
                  style={{ borderColor: c.green, color: c.green }}>
                  ⚡ Python Practice Lab
                </button>
              )}
              {skill.due>0 && <button className="btn btn-ghost" onClick={()=>setView("flashcards")}>Review {skill.due} Flashcards</button>}
              <button className="btn btn-ghost" onClick={()=>setView("dashboard")}>Back to Curriculum</button>
            </div>

            <div className="paper" style={{padding:"20px 22px", borderLeft:`4px solid ${c.gold}`, marginBottom:24}}>
              <div className="kicker" style={{marginBottom:10}}>Adaptive Scheduling</div>
              <p className="body" style={{fontSize:15, color:c.sub, lineHeight:1.6}}>
                Apti picks the topic where you need the most work and generates a fresh lesson each session.
              </p>
            </div>

            <div>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", borderBottom:`2px solid ${c.rule}`, paddingBottom:10, marginBottom:14}}>
                <h2 className="serif-h" style={{fontSize:20, color:c.ink}}>Study Notes</h2>
                <span className="mono" style={{fontSize:10, color: saveState==="saved" ? c.green : c.faint}}>
                  {saveState === "saving" ? "SAVING…" : saveState === "saved" ? "SAVED" : "AUTO-SAVES ON EXIT"}
                </span>
              </div>
              <p className="body" style={{fontSize:13, color:c.faint, marginBottom:10, lineHeight:1.5}}>
                Write what clicked, what confused you, your own analogies. Apti reads these when preparing your next lesson.
              </p>
              <textarea
                className="open-ans"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={e => saveNotes(e.target.value)}
                placeholder={`e.g. "I keep mixing up factoring and expanding — need to practise the sign rules."`}
                style={{minHeight:160, fontSize:15}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Time helpers & Pomodoro ─────────────────────────────────── */
const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const POMODORO = { focus: 50*60, break: 10*60 };

function usePomodoro() {
  const [running, setRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [left, setLeft]       = useState(POMODORO.focus);
  const [cycles, setCycles]   = useState(0);
  const tick = useRef(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft(prev => {
        if (prev > 1) return prev - 1;
        const goingToBreak = !onBreak;
        if (goingToBreak) setCycles(x => x + 1);
        setOnBreak(goingToBreak);
        return goingToBreak ? POMODORO.break : POMODORO.focus;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running, onBreak]);

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setOnBreak(false); setLeft(POMODORO.focus); setCycles(0); };
  const skip  = () => {
    const goingToBreak = !onBreak;
    if (goingToBreak) setCycles(x => x + 1);
    setOnBreak(goingToBreak);
    setLeft(goingToBreak ? POMODORO.break : POMODORO.focus);
  };
  return { running, onBreak, left, cycles, start, pause, reset, skip };
}

function FocusTimer({ c }) {
  const p = usePomodoro();
  const total = p.onBreak ? POMODORO.break : POMODORO.focus;
  const pct = ((total - p.left) / total) * 100;
  const tone = p.onBreak ? c.green : c.accent;
  const started = p.running || p.left !== POMODORO.focus || p.cycles > 0;

  return (
    <div className="paper" style={{ padding: 24, marginBottom: 16, boxShadow: c.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span className="kicker">Focus Timer</span>
        <span className="mono" style={{ fontSize: 10, color: c.faint }}>50 / 10</span>
      </div>
      <div style={{ position: "relative", display: "flex", justifyContent: "center", color: c.ink, marginBottom: 16 }}>
        <Ring pct={pct} color={tone} size={150} stroke={3} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="kicker" style={{ fontSize: 9, color: tone, marginBottom: 4 }}>
            {p.onBreak ? "BREAK" : "DEEP FOCUS"}
          </span>
          <span className="display" style={{ fontSize: 38, color: c.ink, lineHeight: 1 }}>{fmt(p.left)}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {!p.running
          ? <button className="btn btn-accent" style={{ flex: 1 }} onClick={p.start}>{started ? "Resume" : "Begin Focus"}</button>
          : <button className="btn btn-ghost" style={{ flex: 1 }} onClick={p.pause}>Pause</button>
        }
        <button className="btn btn-ghost" onClick={p.skip} style={{ padding: "13px 16px" }}>⇥</button>
        <button className="btn btn-ghost" onClick={p.reset} style={{ padding: "13px 16px" }}>↺</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${c.line}` }}>
        <span className="body" style={{ fontSize: 14, color: c.faint }}>Focus blocks done</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: Math.max(4, p.cycles) }).map((_, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < p.cycles ? c.accent : c.line }} />
          ))}
        </div>
        <span className="serif-h" style={{ fontSize: 15, color: c.ink, marginLeft: 4 }}>{p.cycles}</span>
      </div>
    </div>
  );
}

function useSessionClock() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return secs;
}

/* ─── MathText: renders $...$ / $$...$$ / ```lang ... ``` ────── */
function MathText({ text, c, style = {} }) {
  if (!text) return null;

  const parts = [];
  // Split on display math $$...$$, inline math $...$, and fenced code blocks
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|```[\w]*\n[\s\S]*?```)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("$$")) {
      parts.push({ type: "display-math", content: tok.slice(2, -2).trim() });
    } else if (tok.startsWith("$")) {
      parts.push({ type: "inline-math", content: tok.slice(1, -1).trim() });
    } else {
      const nl = tok.indexOf("\n");
      const lang = tok.slice(3, nl).trim();
      const code = tok.slice(nl + 1, -3);
      parts.push({ type: "code", lang, content: code });
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });

  return (
    <span style={style}>
      {parts.map((p, i) => {
        if (p.type === "inline-math") {
          let html = "";
          try { html = katex.renderToString(p.content, { throwOnError: false }); } catch {}
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        if (p.type === "display-math") {
          let html = "";
          try { html = katex.renderToString(p.content, { throwOnError: false, displayMode: true }); } catch {}
          return <span key={i} style={{ display: "block", overflowX: "auto", margin: "12px 0" }} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        if (p.type === "code") {
          return (
            <pre key={i} style={{
              background: c.bgAlt, border: `1px solid ${c.line}`, borderRadius: 3,
              padding: "14px 18px", margin: "12px 0", overflowX: "auto",
              fontFamily: "'Spline Sans Mono', monospace", fontSize: 14, lineHeight: 1.6,
              color: c.ink,
            }}>
              {p.lang && <div style={{ fontSize: 10, color: c.faint, marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.lang}</div>}
              <code>{p.content}</code>
            </pre>
          );
        }
        return <span key={i}>{p.content}</span>;
      })}
    </span>
  );
}

/* ─── Study Hall ──────────────────────────────────────────────── */
function StudyHall({ setView, c, activeSkill, onComplete }) {
  const [phase,        setPhase]        = useState("loading");
  const [sessionId,    setSessionId]    = useState(null);
  const [lesson,       setLesson]       = useState(null);
  const [stageIdx,     setStageIdx]     = useState(0);
  const [practiceStep, setPracticeStep] = useState("problem"); // problem | hints | solution
  const [hintsShown,   setHintsShown]   = useState(0);
  const [practiceOut,  setPracticeOut]  = useState("unaided"); // unaided | hint_used | solution_revealed
  const [recallIdx,    setRecallIdx]    = useState(0);
  const [recallShown,  setRecallShown]  = useState(false);
  const [questions,    setQuestions]    = useState([]);
  const [qIdx,         setQIdx]         = useState(0);
  const [sel,          setSel]          = useState(null);
  const [openText,     setOpenText]     = useState("");
  const [answers,      setAnswers]      = useState([]);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const qStartRef = useRef({});
  const elapsed   = useSessionClock();

  // Ordered stage keys matching the lesson schema
  const STAGE_KEYS = ["hook", "intuition", "analogy", "build", "worked", "practice", "recall", "connections"];

  useEffect(() => {
    if (!activeSkill) { setView("dashboard"); return; }
    const subMastery = activeSkill.subMastery || [];
    const lowestIdx  = subMastery.length ? subMastery.indexOf(Math.min(...subMastery)) : 0;
    const topic      = (activeSkill.subs || [])[lowestIdx] || activeSkill.label;

    apiFetch("/api/session/start", {
      method: "POST",
      body: JSON.stringify({ skill_id: activeSkill.id, topic }),
    })
      .then(d => { setSessionId(d.session_id); setLesson(d.lesson); setPhase("lesson"); })
      .catch(e => { setError(e.message); setPhase("error"); });
  }, [activeSkill]);

  const fetchQuiz = async () => {
    setPhase("quiz_loading");
    setSel(null); setOpenText(""); setAnswers([]);
    try {
      const d  = await apiFetch("/api/session/quiz", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
      const qs = d.questions || [];
      setQuestions(qs); setQIdx(0); setPhase("quiz");
      if (qs[0]) qStartRef.current[qs[0].id] = Date.now();
    } catch (e) { setError(e.message); setPhase("error"); }
  };

  const recordAnswer = (questionId, value) => {
    const rt = qStartRef.current[questionId] ? Date.now() - qStartRef.current[questionId] : null;
    const updated = [...answers, { question_id: questionId, value: String(value), response_time_ms: rt }];
    setAnswers(updated);
    const next = qIdx + 1;
    if (next < questions.length) {
      setQIdx(next); setSel(null); setOpenText("");
      qStartRef.current[questions[next].id] = Date.now();
    } else {
      submitSession(updated);
    }
  };

  const submitSession = async (finalAnswers) => {
    setPhase("submitting");
    try {
      const d = await apiFetch("/api/session/submit", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          answers: finalAnswers,
          practice_outcome: practiceOut,
        }),
      });
      setResult(d); setPhase("result");
    } catch (e) { setError(e.message); setPhase("error"); }
  };

  if (phase === "loading")      return <Loading c={c} message="Apti is preparing your lesson…" />;
  if (phase === "quiz_loading") return <Loading c={c} message="Apti is writing your quiz…" />;
  if (phase === "submitting")   return <Loading c={c} message="Grading your answers…" />;
  if (phase === "error")        return <ErrorScreen c={c} message={error} onBack={() => setView("dashboard")} />;

  /* ── Lesson (8 stages) ── */
  if (phase === "lesson" && lesson) {
    // If the backend returned the old 3-field format (deployment mismatch),
    // bail out with a clear message rather than silently blank stages.
    if (!lesson.stages) {
      return <ErrorScreen c={c} message="Lesson format mismatch — the backend may still be deploying. Wait 2–3 minutes and try again." onBack={() => setView("dashboard")} />;
    }
    const stages = lesson.stages;
    const currentKey = STAGE_KEYS[stageIdx];
    const isLast = stageIdx === STAGE_KEYS.length - 1;
    const totalStages = STAGE_KEYS.length;

    const STAGE_LABELS = {
      hook:        { label: "Hook",        color: c.accent },
      intuition:   { label: "Intuition",   color: c.accent },
      analogy:     { label: "Analogy",     color: c.gold   },
      build:       { label: "Build",       color: c.ink    },
      worked:      { label: "Worked Example", color: c.blue },
      practice:    { label: "Practice",    color: c.green  },
      recall:      { label: "Recall",      color: c.gold   },
      connections: { label: "Connections", color: c.faint  },
    };

    const meta = STAGE_LABELS[currentKey];

    const advance = () => {
      setStageIdx(i => i + 1);
      setPracticeStep("problem");
      setHintsShown(0);
      setRecallIdx(0);
      setRecallShown(false);
    };

    const renderStage = () => {
      if (currentKey === "hook") {
        return (
          <div className="body" style={{fontSize:22, lineHeight:1.65, color:c.ink, fontStyle:"italic"}}>
            <MathText text={stages.hook} c={c} />
          </div>
        );
      }

      if (currentKey === "intuition") {
        return (
          <div className="body dropcap" style={{fontSize:21, lineHeight:1.65, color:c.ink}}>
            <MathText text={stages.intuition} c={c} />
          </div>
        );
      }

      if (currentKey === "analogy") {
        return (
          <div className="body" style={{fontSize:18, lineHeight:1.7, color:c.sub}}>
            <MathText text={stages.analogy} c={c} />
          </div>
        );
      }

      if (currentKey === "build") {
        return (
          <div>
            {(stages.build || []).map((step, i) => (
              <div key={i} style={{marginBottom:24}}>
                <div className="mono" style={{fontSize:11, color:c.faint, marginBottom:6, letterSpacing:"0.1em"}}>STEP {i+1}</div>
                <div className="body" style={{fontSize:18, lineHeight:1.65, color:c.ink, marginBottom:8}}>
                  <MathText text={step.step} c={c} />
                </div>
                <div className="body" style={{fontSize:15, lineHeight:1.6, color:c.sub, paddingLeft:16, borderLeft:`2px solid ${c.line}`}}>
                  <MathText text={step.why} c={c} />
                </div>
                {i < (stages.build||[]).length - 1 && <div style={{height:1, background:c.line, margin:"20px 0"}}/>}
              </div>
            ))}
          </div>
        );
      }

      if (currentKey === "worked") {
        const w = stages.worked || {};
        return (
          <div>
            <div className="paper" style={{padding:"18px 22px", marginBottom:20, borderLeft:`4px solid ${c.blue}`}}>
              <div className="kicker" style={{color:c.blue, marginBottom:8}}>Problem</div>
              <div className="body" style={{fontSize:18, lineHeight:1.6, color:c.ink}}>
                <MathText text={w.problem} c={c} />
              </div>
            </div>
            <div className="kicker" style={{marginBottom:12}}>Expert Reasoning</div>
            {(w.reasoning || []).map((line, i) => (
              <div key={i} style={{display:"flex", gap:14, marginBottom:14}}>
                <span className="mono" style={{
                  fontSize:11, color:c.blue, width:22, height:22, flexShrink:0,
                  border:`1px solid ${c.blue}`, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>{i+1}</span>
                <div className="body" style={{fontSize:16, lineHeight:1.65, color:c.ink}}>
                  <MathText text={line} c={c} />
                </div>
              </div>
            ))}
            {w.answer && (
              <div style={{marginTop:20, padding:"14px 18px", background:c.bgAlt, borderRadius:3, border:`1px solid ${c.line}`}}>
                <div className="kicker" style={{marginBottom:6}}>Answer</div>
                <div className="body" style={{fontSize:17, color:c.ink}}>
                  <MathText text={w.answer} c={c} />
                </div>
              </div>
            )}
          </div>
        );
      }

      if (currentKey === "practice") {
        const pr = stages.practice || {};
        const hints = pr.hints || [];
        return (
          <div>
            <div className="paper" style={{padding:"18px 22px", marginBottom:20, borderLeft:`4px solid ${c.green}`}}>
              <div className="kicker" style={{color:c.green, marginBottom:8}}>Your Turn</div>
              <div className="body" style={{fontSize:18, lineHeight:1.6, color:c.ink}}>
                <MathText text={pr.problem} c={c} />
              </div>
            </div>

            {practiceStep === "problem" && (
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                {hints.length > 0 && (
                  <button className="btn btn-ghost" onClick={()=>{
                    setHintsShown(1); setPracticeStep("hints");
                    if (practiceOut === "unaided") setPracticeOut("hint_used");
                  }}>Show Hint 1</button>
                )}
                <button className="btn btn-ghost" onClick={()=>{
                  setPracticeStep("solution"); setPracticeOut("solution_revealed");
                }}>Show Solution</button>
              </div>
            )}

            {practiceStep === "hints" && (
              <div>
                {hints.slice(0, hintsShown).map((h, i) => (
                  <div key={i} style={{
                    padding:"12px 16px", marginBottom:10,
                    border:`1px solid ${c.line}`, borderRadius:3,
                    borderLeft:`3px solid ${c.gold}`,
                  }}>
                    <div className="mono" style={{fontSize:9, color:c.gold, marginBottom:4}}>HINT {i+1}</div>
                    <div className="body" style={{fontSize:15, color:c.sub, lineHeight:1.6}}>
                      <MathText text={h} c={c} />
                    </div>
                  </div>
                ))}
                <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:10}}>
                  {hintsShown < hints.length && (
                    <button className="btn btn-ghost" onClick={()=>setHintsShown(n=>n+1)}>
                      Show Hint {hintsShown+1}
                    </button>
                  )}
                  <button className="btn btn-ghost" onClick={()=>{
                    setPracticeStep("solution"); setPracticeOut("solution_revealed");
                  }}>Show Solution</button>
                </div>
              </div>
            )}

            {practiceStep === "solution" && (
              <div style={{padding:"18px 22px", background:c.bgAlt, borderRadius:3, border:`1px solid ${c.line}`}}>
                <div className="kicker" style={{marginBottom:8}}>Solution</div>
                <div className="body" style={{fontSize:16, lineHeight:1.65, color:c.ink}}>
                  <MathText text={pr.solution} c={c} />
                </div>
              </div>
            )}
          </div>
        );
      }

      if (currentKey === "recall") {
        const items = stages.recall || [];
        const item = items[recallIdx];
        if (!item) return null;
        return (
          <div>
            <div className="kicker" style={{marginBottom:8}}>
              Quick Check {recallIdx+1} of {items.length}
            </div>
            <div className="body" style={{fontSize:20, lineHeight:1.5, color:c.ink, marginBottom:20}}>
              <MathText text={item.q} c={c} />
            </div>
            {!recallShown ? (
              <button className="btn btn-ghost" onClick={()=>setRecallShown(true)}>Reveal Answer</button>
            ) : (
              <div>
                <div style={{padding:"14px 18px", background:c.bgAlt, borderRadius:3, border:`1px solid ${c.line}`, marginBottom:16}}>
                  <div className="body" style={{fontSize:16, color:c.ink}}>
                    <MathText text={item.a} c={c} />
                  </div>
                </div>
                {recallIdx + 1 < items.length ? (
                  <button className="btn btn-ghost" onClick={()=>{ setRecallIdx(i=>i+1); setRecallShown(false); }}>
                    Next Check →
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      }

      if (currentKey === "connections") {
        return (
          <div className="body" style={{fontSize:18, lineHeight:1.7, color:c.sub}}>
            <MathText text={lesson.connections} c={c} />
          </div>
        );
      }

      return null;
    };

    // For recall: "Continue" only appears after all recall items are revealed
    const recallItems = stages.recall || [];
    const recallDone = currentKey !== "recall" || (recallShown && recallIdx === recallItems.length - 1);

    return (
      <div className="fade">
        <div className="header">
          <button onClick={()=>setView("dashboard")} className="mono" style={{background:"none",border:"none",color:c.faint,cursor:"pointer",fontSize:11,letterSpacing:"0.1em",marginBottom:18,padding:0}}>
            ← DASHBOARD
          </button>
          <div className="header-rule">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12}}>
              <div>
                <div className="kicker">Study Hall · {activeSkill?.label}</div>
                <h1 className="display" style={{fontSize:42, color:c.ink, marginTop:10}}>{lesson.topic}</h1>
              </div>
              <div className="mono" style={{fontSize:12, color:c.faint, paddingTop:6, display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap"}}>
                <span style={{width:6, height:6, borderRadius:"50%", background:c.green, display:"inline-block"}}/>
                {fmt(elapsed)} elapsed
              </div>
            </div>

            {/* Stage progress bar */}
            <div style={{display:"flex", gap:4, marginTop:16}}>
              {STAGE_KEYS.map((k, i) => (
                <div key={k} style={{
                  flex:1, height:3,
                  background: i < stageIdx ? c.accent : i === stageIdx ? meta.color : c.line,
                  borderRadius:99, transition:"background 0.3s",
                }}/>
              ))}
            </div>
          </div>
        </div>

        <div className="content">
          <div className="session-col">
            <article className="fade" key={currentKey}>
              <div className="kicker" style={{color:meta.color, marginBottom:14}}>
                {`${stageIdx + 1} / ${totalStages} — ${meta.label}`}
              </div>

              {renderStage()}

              {lesson.key_terms?.length > 0 && currentKey === "connections" && (
                <>
                  <div style={{height:1, background:c.line, margin:"32px 0"}}/>
                  <div>
                    <div className="kicker" style={{marginBottom:14}}>Key Terms</div>
                    {lesson.key_terms.map(kt=>(
                      <div key={kt.term} style={{marginBottom:10}}>
                        <span className="serif-h" style={{fontSize:16, color:c.ink}}>{kt.term}</span>
                        <span className="body" style={{fontSize:15, color:c.sub}}> — {kt.meaning}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {lesson.watch_out && currentKey === "connections" && (
                <>
                  <div style={{height:1, background:c.line, margin:"32px 0"}}/>
                  <div className="paper" style={{padding:"16px 20px", borderLeft:`4px solid ${c.gold}`}}>
                    <div className="kicker" style={{color:c.gold, marginBottom:8}}>Watch Out</div>
                    <div className="body" style={{fontSize:15, color:c.sub, lineHeight:1.6}}>
                      <MathText text={lesson.watch_out} c={c} />
                    </div>
                  </div>
                </>
              )}

              <div style={{marginTop:32}}>
                {isLast ? (
                  <button className="btn btn-accent" onClick={fetchQuiz} disabled={!recallDone}>
                    Begin Quiz →
                  </button>
                ) : (
                  <button className="btn btn-accent" onClick={advance} disabled={!recallDone}>
                    Continue →
                  </button>
                )}
              </div>
            </article>

            <div style={{position:"sticky", top:24}}>
              <FocusTimer c={c}/>
              <div className="paper" style={{padding:24, boxShadow:c.shadow}}>
                <div className="kicker" style={{marginBottom:16}}>Lecture Notes</div>
                {[["Topic",lesson.topic],["Chapter",activeSkill?.label||"—"],["Stage",`${stageIdx+1} / ${totalStages}`]].map(([k,v])=>(
                  <div key={k} style={{display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${c.line}`}}>
                    <span className="body" style={{fontSize:15, color:c.faint}}>{k}</span>
                    <span className="serif-h" style={{fontSize:15, color:c.ink}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Quiz ── */
  if (phase === "quiz" && questions.length > 0) {
    const q     = questions[qIdx];
    const isMCQ = q.type === "mcq";
    const answered = sel !== null;

    return (
      <div className="fade">
        <div className="header">
          <button onClick={()=>setPhase("lesson")} className="mono" style={{background:"none",border:"none",color:c.faint,cursor:"pointer",fontSize:11,letterSpacing:"0.1em",marginBottom:18,padding:0}}>
            ← LECTURE
          </button>
          <div className="header-rule">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
              <h1 className="serif-h" style={{fontSize:26, color:c.ink}}>Examination</h1>
              <span className="mono" style={{fontSize:13, color:c.faint}}>{qIdx+1} / {questions.length}</span>
            </div>
            <div style={{display:"flex", gap:6, marginTop:14}}>
              {questions.map((_,i)=>(
                <div key={i} style={{flex:1, height:3, background: i<qIdx?c.green : i===qIdx?c.accent : c.line}}/>
              ))}
            </div>
          </div>
        </div>

        <div className="content">
          <div className="session-col">
            <div>
              <div className="mono" style={{fontSize:10, color:c.faint, marginBottom:10}}>
                {q.layer.toUpperCase()} · {isMCQ ? "MULTIPLE CHOICE" : "OPEN ANSWER"}
              </div>
              <div className="serif-h" style={{fontSize:24, lineHeight:1.4, color:c.ink, marginBottom:28}}><MathText text={q.prompt} c={c}/></div>

              {isMCQ ? (
                <>
                  {(q.options||[]).map((opt,i)=>{
                    const isSel=sel===i, isCorrect=i===q.correct_index;
                    let border=c.line, color=c.ink, numC=c.faint;
                    if(answered){
                      if(isCorrect){ border=c.green; color=c.green; numC=c.green; }
                      else if(isSel){ border=c.accent; color=c.accent; numC=c.accent; }
                    } else if(isSel){ border=c.ink; numC=c.ink; }
                    return (
                      <button key={i} className="opt" onClick={()=>!answered&&setSel(i)}
                        style={{borderColor:border, color, cursor:answered?"default":"pointer"}}>
                        <span className="mono" style={{
                          fontSize:13, color:numC, width:26, height:26, borderRadius:"50%",
                          border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                        }}>
                          {answered ? (isCorrect?"✓":isSel?"✗":String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
                        </span>
                        <MathText text={opt} c={c}/>
                      </button>
                    );
                  })}
                  {answered && (
                    <button className="btn btn-accent" style={{marginTop:10}}
                      onClick={()=>recordAnswer(q.id, sel)}>
                      {qIdx+1<questions.length ? "Next →" : "Conclude →"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    className="open-ans"
                    value={openText}
                    onChange={e=>setOpenText(e.target.value)}
                    placeholder="Write your answer here…"
                  />
                  <button className="btn btn-accent" style={{marginTop:14}}
                    disabled={!openText.trim()}
                    onClick={()=>recordAnswer(q.id, openText)}>
                    {qIdx+1<questions.length ? "Submit & Continue →" : "Submit & Conclude →"}
                  </button>
                </>
              )}
            </div>

            <div>
              <div className="paper" style={{padding:24, position:"sticky", top:24, boxShadow:c.shadow}}>
                <div className="kicker" style={{marginBottom:16}}>Answer Sheet</div>
                {questions.map((_,i)=>{
                  const done = i < answers.length;
                  return (
                    <div key={i} style={{display:"flex", alignItems:"center", gap:14, padding:"9px 0", borderBottom:`1px solid ${c.line}`}}>
                      <span className="mono" style={{
                        fontSize:12, width:24, height:24, borderRadius:"50%", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        border:`1px solid ${done ? c.green : i===qIdx ? c.ink : c.line}`,
                        color: done ? c.green : i===qIdx ? c.ink : c.faint,
                      }}>{done ? "✓" : i+1}</span>
                      <span className="body" style={{fontSize:15, color:i===qIdx?c.ink:c.faint}}>
                        Question {i+1}
                        <span className="mono" style={{fontSize:10, marginLeft:8, color:c.faint}}>
                          {questions[i].type === "open" ? "OPEN" : "MCQ"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Result ── */
  if (phase === "result" && result) {
    const mastery = result.new_mastery ?? 0;
    const delta   = result.mastery_delta ?? 0;
    const sc      = mastery>=80 ? c.green : mastery>=50 ? c.gold : c.accent;
    const unlock  = result.unlock_decision;

    return (
      <div className="fade" style={{maxWidth:640, margin:"0 auto", padding:"64px 24px"}}>
        <div className="kicker" style={{marginBottom:24, textAlign:"center"}}>Examination Concluded</div>

        <div style={{position:"relative", display:"flex", justifyContent:"center", marginBottom:16, color:c.ink}}>
          <Ring pct={mastery} color={sc} size={150} stroke={4}/>
          <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
            <span className="display" style={{fontSize:48, color:sc}}>{mastery}</span>
            <span className="kicker" style={{fontSize:9}}>MASTERY</span>
          </div>
        </div>

        <div style={{textAlign:"center", marginBottom:28}}>
          <div className="mono" style={{fontSize:15, color: delta>=0?c.green:c.accent, marginBottom:10}}>
            {delta>=0 ? `+${delta}` : delta} mastery points this session
          </div>
          <h2 className="display" style={{fontSize:32, color:c.ink, marginBottom:10}}>
            {unlock?.unlock ? "Progressing." : "Keep Building."}
          </h2>
          <p className="body" style={{fontSize:17, color:c.sub, lineHeight:1.7, maxWidth:460, marginInline:"auto"}}>
            {unlock?.message ?? (delta>=0 ? "Good session. Apti has updated your schedule." : "Review this topic again soon.")}
          </p>
          {unlock?.focus_if_held?.length > 0 && (
            <div style={{marginTop:14, display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap"}}>
              {unlock.focus_if_held.map(f=>(
                <span key={f} className="mono" style={{fontSize:10, color:c.gold, border:`1px solid ${c.gold}`, borderRadius:99, padding:"3px 10px"}}>{f}</span>
              ))}
            </div>
          )}
        </div>

        {result.open_results?.length > 0 && (
          <div style={{marginBottom:32}}>
            <div style={{borderBottom:`2px solid ${c.rule}`, paddingBottom:8, marginBottom:16}}>
              <span className="serif-h" style={{fontSize:18, color:c.ink}}>Answer Feedback</span>
            </div>
            {result.open_results.map(r=>{
              const col = r.verdict==="mastered" ? c.green : r.verdict==="fragile" ? c.gold : c.accent;
              const pct = Math.round((0.5*r.intuition + 0.3*r.method + 0.2*r.accuracy)*100);
              return (
                <div key={r.question_id} style={{
                  padding:"16px 20px", marginBottom:12,
                  border:`1px solid ${c.line}`, borderRadius:3,
                  borderLeft:`4px solid ${col}`,
                }}>
                  <div className="mono" style={{fontSize:10, color:col, marginBottom:6}}>
                    {r.verdict.toUpperCase()} · {pct}%
                  </div>
                  <p className="body" style={{fontSize:15, color:c.sub, lineHeight:1.6}}>{r.feedback}</p>
                </div>
              );
            })}
          </div>
        )}

        <div style={{display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap"}}>
          <button className="btn btn-ghost" onClick={()=>{ setPhase("lesson"); setAnswers([]); setQIdx(0); setSel(null); }}>
            Revisit Lecture
          </button>
          <button className="btn btn-accent" onClick={()=>{ onComplete(); setView("dashboard"); }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Loading c={c} message="Preparing…" />;
}

/* ─── Flashcards ──────────────────────────────────────────────── */
function Flashcards({ setView, c }) {
  const [cards, setCards] = useState(null);
  const [idx,   setIdx]   = useState(0);
  const [flip,  setFlip]  = useState(false);
  const [done,  setDone]  = useState([]);

  useEffect(() => {
    apiFetch("/api/reviews/due")
      .then(d => setCards(d.cards || []))
      .catch(() => setCards([]));
  }, []);

  const rate = async (grade) => {
    const card = cards[idx];
    try {
      await apiFetch("/api/reviews/grade", {
        method: "POST",
        body: JSON.stringify({ card_id: card.id, grade }),
      });
    } catch (_) { /* still advance even if grade call fails */ }
    const newDone = [...done, idx];
    setDone(newDone);
    if (idx + 1 < cards.length) { setIdx(idx + 1); setFlip(false); }
    else setIdx(cards.length);
  };

  if (cards === null) return <Loading c={c} message="Loading your due flashcards…" />;

  if (cards.length === 0) return (
    <div className="fade" style={{maxWidth:520, margin:"0 auto", padding:"80px 24px", textAlign:"center"}}>
      <div className="display" style={{fontSize:64, color:c.green, marginBottom:8}}>✓</div>
      <h2 className="display" style={{fontSize:36, color:c.ink, marginBottom:14}}>All caught up.</h2>
      <p className="body" style={{fontSize:17, color:c.sub, lineHeight:1.7, marginBottom:32}}>
        No flashcards are due today. Complete a study session to generate new cards, or return tomorrow.
      </p>
      <button className="btn btn-accent" onClick={()=>setView("dashboard")}>Return to Dashboard</button>
    </div>
  );

  if (idx >= cards.length) return (
    <div className="fade" style={{maxWidth:520, margin:"0 auto", padding:"80px 24px", textAlign:"center"}}>
      <div className="display" style={{fontSize:64, color:c.green, marginBottom:8}}>✓</div>
      <h2 className="display" style={{fontSize:36, color:c.ink, marginBottom:14}}>Reviewed in full.</h2>
      <p className="body" style={{fontSize:17, color:c.sub, lineHeight:1.7, marginBottom:32}}>
        Apti has recalculated your retention schedule. Each card now returns at its own optimal interval — the strong ones weeks away, the shaky ones sooner.
      </p>
      <button className="btn btn-accent" onClick={()=>setView("dashboard")}>Return to Dashboard</button>
    </div>
  );

  const card = cards[idx];
  return (
    <div className="fade">
      <div className="header">
        <button onClick={()=>setView("dashboard")} className="mono" style={{background:"none",border:"none",color:c.faint,cursor:"pointer",fontSize:11,letterSpacing:"0.1em",marginBottom:18,padding:0}}>
          ← DASHBOARD
        </button>
        <div className="header-rule">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
            <h1 className="serif-h" style={{fontSize:26, color:c.ink}}>Flashcard Review</h1>
            <span className="mono" style={{fontSize:13, color:c.faint}}>{idx+1} / {cards.length}</span>
          </div>
          <div style={{display:"flex", gap:6, marginTop:14}}>
            {cards.map((_,i)=>(
              <div key={i} style={{flex:1, height:3, background: done.includes(i)?c.green : i===idx?c.gold:c.line}}/>
            ))}
          </div>
        </div>
      </div>

      <div className="content">
        <div className="session-col">
          <div>
            <div className="kicker" style={{marginBottom:14}}>{card.skill_id} · Card {idx+1}</div>
            <div className={`fc ${flip?"flip":""}`} onClick={()=>setFlip(!flip)}>
              <div className="kicker" style={{marginBottom:20, color:c.faint}}>
                {flip ? "Verso — rate your recall" : "Recto — click to turn"}
              </div>
              <p className="body" style={{
                fontSize:flip?19:24, lineHeight:1.6, color:c.ink,
                fontFamily:flip?"'Newsreader',serif":"'Fraunces',serif",
                fontWeight:flip?400:600, whiteSpace:"pre-line",
              }}>{flip ? card.back : card.front}</p>
            </div>

            {flip && (
              <div className="fade" style={{marginTop:24}}>
                <p className="body" style={{fontSize:15, color:c.sub, textAlign:"center", marginBottom:14}}>How well did you recall this?</p>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
                  {[["Forgot",0,c.accent],["Partial",1,c.gold],["Mastered",2,c.green]].map(([l,g,col])=>(
                    <button key={l} onClick={()=>rate(g)} style={{
                      background:"transparent", border:`1px solid ${col}`, borderRadius:3,
                      padding:"16px 8px", cursor:"pointer", color:col,
                      display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                      transition:"all 0.2s",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background=col+"20"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span className="serif-h" style={{fontSize:16}}>{l}</span>
                      <span className="mono" style={{fontSize:10, color:c.faint}}>grade {g}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="paper" style={{padding:24, position:"sticky", top:24, boxShadow:c.shadow}}>
              <div className="kicker" style={{marginBottom:16}}>On Spaced Repetition</div>
              {[
                ["Optimal Timing","Each card surfaces just before you'd forget it — the moment recall does the most good."],
                ["Self-Adjusting","Your honest rating tunes the next interval. Mastered cards drift weeks apart."],
                ["Connected Recall","Forgetting one concept can flag related cards for earlier review."],
              ].map(([t,d],i)=>(
                <div key={t} style={{paddingBottom:16, marginBottom:16, borderBottom:i<2?`1px solid ${c.line}`:"none"}}>
                  <div className="serif-h" style={{fontSize:16, color:c.ink, marginBottom:5}}>{t}</div>
                  <div className="body" style={{fontSize:14, color:c.sub, lineHeight:1.6}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Progress ────────────────────────────────────────────────── */
function Progress({ c, skills }) {
  const overall  = skills.length ? Math.round(skills.reduce((a,s)=>a+s.mastery,0)/skills.length) : 0;
  const mastered = skills.filter(s=>!s.locked&&s.mastery>=80).length;
  return (
    <div className="fade">
      <div className="header">
        <div className="header-rule">
          <div className="kicker">The Record</div>
          <h1 className="display" style={{fontSize:46, color:c.ink, marginTop:10}}>Your Progress</h1>
          <p className="body" style={{fontSize:18, color:c.sub, marginTop:14}}>The complete account of your journey through engineering mathematics.</p>
        </div>
      </div>

      <div className="content">
        <div className="paper" style={{padding:"32px", marginBottom:32, display:"flex", gap:40, alignItems:"center", flexWrap:"wrap", boxShadow:c.shadow}}>
          <div style={{textAlign:"center", color:c.ink}}>
            <div style={{position:"relative", display:"inline-block"}}>
              <Ring pct={overall} color={c.accent} size={128} stroke={4}/>
              <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
                <span className="display" style={{fontSize:42, color:c.accent}}>{overall}</span>
                <span className="kicker" style={{fontSize:9}}>PER CENT</span>
              </div>
            </div>
          </div>
          <div style={{flex:1, minWidth:240}}>
            <h2 className="serif-h" style={{fontSize:24, color:c.ink, marginBottom:14}}>Cumulative Standing</h2>
            <p className="body" style={{fontSize:16, color:c.sub, lineHeight:1.6, marginBottom:16}}>
              {mastered} {mastered===1?"chapter":"chapters"} brought to mastery · {skills.filter(s=>s.locked).length} chapters yet to unlock.
            </p>
            <div style={{height:6, background:c.line, borderRadius:99, overflow:"hidden"}}>
              <div className="bar" style={{"--w":`${overall}%`, background:`linear-gradient(90deg,${c.accent},${c.green})`}}/>
            </div>
          </div>
        </div>

        <div style={{borderBottom:`2px solid ${c.rule}`, paddingBottom:10, marginBottom:0}}>
          <h2 className="serif-h" style={{fontSize:24, color:c.ink}}>Chapter Ledger</h2>
        </div>
        <div className="paper" style={{boxShadow:c.shadow}}>
          {skills.map((skill,i)=>{
            const ac=c[skill.accentKey]||c.accent;
            return (
              <div key={skill.id} style={{
                padding:"22px 24px",
                borderBottom: i<skills.length-1?`1px solid ${c.line}`:"none",
                opacity:skill.locked?0.4:1,
              }}>
                <div style={{display:"flex", alignItems:"center", gap:20}}>
                  <div className="display" style={{fontSize:30, color:skill.locked?c.faint:ac, width:56, flexShrink:0}}>
                    {skill.locked?"·":skill.num}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:8, gap:12}}>
                      <span className="serif-h" style={{fontSize:18, color:skill.locked?c.faint:c.ink}}>
                        {skill.label}{skill.locked && " 🔒"}
                      </span>
                      <span className="display" style={{fontSize:22, color:skill.locked?c.faint:skill.mastery>=80?c.green:skill.mastery>=40?ac:c.accent}}>
                        {skill.mastery}%
                      </span>
                    </div>
                    <div style={{height:3, background:c.line, borderRadius:99, overflow:"hidden", marginBottom:skill.locked?0:12}}>
                      <div className="bar" style={{"--w":`${skill.mastery}%`, background:skill.locked?c.faint:skill.mastery>=80?c.green:ac}}/>
                    </div>
                    {!skill.locked && (
                      <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                        {(skill.subs||[]).map((s,j)=>(
                          <span key={s} className="mono" style={{
                            fontSize:10.5, color:(skill.subMastery||[])[j]>50?ac:c.faint,
                            border:`1px solid ${(skill.subMastery||[])[j]>50?ac:c.line}`, borderRadius:99, padding:"2px 10px",
                          }}>{s} · {(skill.subMastery||[])[j]||0}%</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Python Practice Lab ─────────────────────────────────────── */
function PythonLab({ c, setView, skills, setActiveSkill }) {
  const LS_KEY = "apti-python-lab-done-v1";

  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [modIdx,    setModIdx]    = useState(0);
  const [tab,       setTab]       = useState("notes");
  const [noteIdx,   setNoteIdx]   = useState(0);
  const [exOpen,    setExOpen]    = useState(null);
  const [solShown,  setSolShown]  = useState({});
  const [exDone,    setExDone]    = useState({});
  const [quizSt,    setQuizSt]    = useState({ active: false, idx: 0, score: 0, answers: [], qs: [] });

  useEffect(() => {
    try { const s = localStorage.getItem(LS_KEY); if (s) setExDone(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(exDone)); } catch {}
  }, [exDone]);

  const phase  = PYTHON_PHASES[phaseIdx];
  const mod    = phase.modules[modIdx];
  const notes  = mod.notes || [];
  const exs    = mod.exercises || [];
  const accent = c[phase.accent] || c.accent;

  const totalEx = PYTHON_PHASES.reduce((s,p) => s + p.modules.reduce((s2,m) => s2 + (m.exercises||[]).length, 0), 0);
  const doneN   = Object.values(exDone).filter(Boolean).length;

  const goPhase = (pi) => { setPhaseIdx(pi); setModIdx(0); setTab("notes"); setNoteIdx(0); setExOpen(null); setSolShown({}); };
  const goMod   = (mi) => { setModIdx(mi); setTab("notes"); setNoteIdx(0); setExOpen(null); setSolShown({}); };

  // Find matching Apti skill for "Study with Apti" button
  const aptiSkill = mod.aptiSkillId
    ? skills.find(s => s.id === mod.aptiSkillId)
    : null;

  const studyWithApti = () => {
    if (aptiSkill && !aptiSkill.locked) {
      setActiveSkill({ ...aptiSkill, subjectId: "programming", subs: [], subMastery: [], subIds: [] });
      setView("session");
    }
  };

  // Quiz helpers
  const startQuiz = () => {
    const shuffled = [...PYTHON_QUIZ].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuizSt({ active: true, idx: 0, score: 0, answers: [], qs: shuffled });
    setTab("quiz");
  };
  const answerQuiz = (i) => {
    const q = quizSt.qs[quizSt.idx];
    const ok = i === q.a;
    const answers = [...quizSt.answers, { text: q.q, ok, correct: q.opts[q.a] }];
    const score = quizSt.score + (ok ? 1 : 0);
    if (quizSt.idx + 1 >= quizSt.qs.length) {
      setQuizSt({ active: false, idx: quizSt.idx + 1, score, answers, qs: quizSt.qs });
    } else {
      setQuizSt({ ...quizSt, idx: quizSt.idx + 1, score, answers });
    }
  };

  // Tip of the day
  const tip = PYTHON_TIPS[Math.floor(Date.now() / 86_400_000) % PYTHON_TIPS.length];

  return (
    <div className="fade">
      {/* ── Header ── */}
      <div className="header">
        <button onClick={() => setView("dashboard")} className="mono"
          style={{ background:"none", border:"none", color:c.faint, cursor:"pointer", fontSize:11, letterSpacing:"0.1em", marginBottom:18, padding:0 }}>
          ← BACK TO DASHBOARD
        </button>
        <div className="header-rule">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div>
              <div className="kicker">Python Practice Lab</div>
              <h1 className="display" style={{ fontSize:42, color:c.ink, marginTop:8 }}>⚡ Python Mastery</h1>
              <p className="body" style={{ fontSize:16, color:c.sub, marginTop:10, maxWidth:540, lineHeight:1.6 }}>
                Curated notes, engineering exercises, and a quiz — use alongside Apti's AI lessons.
              </p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
              <div className="mono" style={{ fontSize:11, color:c.faint }}>
                {doneN} / {totalEx} exercises done
              </div>
              <div style={{ width:140, height:3, background:c.line, borderRadius:99, overflow:"hidden" }}>
                <div className="bar" style={{ "--w": `${totalEx ? doneN/totalEx*100 : 0}%`, background: c.green }}/>
              </div>
              <button onClick={startQuiz} className="btn btn-ghost" style={{ fontSize:13 }}>
                Knowledge Quiz
              </button>
            </div>
          </div>
        </div>

        {/* ── Tip ── */}
        <div style={{ margin:"12px 0 0", padding:"10px 16px", background:c.bgAlt, borderRadius:3, borderLeft:`3px solid ${c.gold}` }}>
          <span className="kicker" style={{ color:c.gold, marginRight:10 }}>TIP</span>
          <span className="body" style={{ fontSize:13, color:c.sub }}>{tip}</span>
        </div>

        {/* ── Phase tabs ── */}
        <div style={{ display:"flex", gap:6, marginTop:18, flexWrap:"wrap" }}>
          {PYTHON_PHASES.map((p, pi) => (
            <button key={p.id} onClick={() => goPhase(pi)}
              style={{
                padding:"7px 16px", borderRadius:3, border: pi===phaseIdx ? `1px solid ${c[p.accent]||c.accent}` : `1px solid ${c.line}`,
                background: pi===phaseIdx ? `${c[p.accent]||c.accent}14` : "none",
                color: pi===phaseIdx ? c[p.accent]||c.accent : c.sub,
                cursor:"pointer", fontFamily:"'Spline Sans Mono',monospace", fontSize:11, letterSpacing:"0.05em",
              }}>
              {p.icon} {p.title}
              <span className="mono" style={{ fontSize:9, opacity:0.7, marginLeft:6 }}>{p.weeks}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="content">
        <div className="two-col">

          {/* ── Left: module list ── */}
          <div style={{ minWidth:0 }}>
            <div style={{ borderBottom:`2px solid ${c.rule}`, paddingBottom:8, marginBottom:16 }}>
              <h2 className="serif-h" style={{ fontSize:20, color:c.ink }}>{phase.icon} {phase.title}</h2>
              <div className="body" style={{ fontSize:13, color:c.faint, marginTop:4 }}>{phase.description}</div>
            </div>

            {/* Module tabs */}
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:20 }}>
              {phase.modules.map((m, mi) => (
                <button key={m.id} onClick={() => goMod(mi)}
                  style={{
                    padding:"5px 12px", borderRadius:3,
                    border: mi===modIdx ? `1px solid ${accent}` : `1px solid ${c.line}`,
                    background: mi===modIdx ? `${accent}14` : "none",
                    color: mi===modIdx ? accent : c.sub,
                    cursor:"pointer", fontFamily:"'Spline Sans Mono',monospace", fontSize:11,
                  }}>
                  {m.id}
                </button>
              ))}
            </div>

            {/* Tab bar */}
            <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${c.line}`, paddingBottom:12 }}>
              {["notes","exercises","resources","quiz"].map(t => (
                <button key={t} onClick={() => t === "quiz" ? startQuiz() : setTab(t)}
                  style={{
                    padding:"6px 14px", borderRadius:3,
                    border: tab===t && t!=="quiz" ? `1px solid ${c.ink}` : `1px solid ${c.line}`,
                    background: tab===t && t!=="quiz" ? c.ink : "none",
                    color: tab===t && t!=="quiz" ? c.bg : c.sub,
                    cursor:"pointer", fontFamily:"'Spline Sans Mono',monospace", fontSize:11, letterSpacing:"0.05em",
                    textTransform:"uppercase",
                  }}>
                  {t === "notes" ? "📖 Notes" : t === "exercises" ? "💻 Exercises" : t === "resources" ? "📚 Resources" : "🧪 Quiz"}
                </button>
              ))}
            </div>

            {/* ── NOTES tab ── */}
            {tab === "notes" && (
              <div>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:14 }}>
                  <div>
                    <div className="kicker" style={{ color:accent }}>Module {mod.id}</div>
                    <h3 className="serif-h" style={{ fontSize:22, color:c.ink }}>{mod.title}</h3>
                    <div className="mono" style={{ fontSize:10, color:c.faint, marginTop:2 }}>{mod.duration}</div>
                  </div>
                  {aptiSkill && (
                    <button
                      onClick={studyWithApti}
                      disabled={aptiSkill.locked}
                      className="btn btn-accent"
                      style={{ fontSize:12, padding:"8px 14px", opacity: aptiSkill.locked ? 0.4 : 1 }}
                      title={aptiSkill.locked ? "Unlock the prerequisite skill first" : "Open an AI lesson on this topic"}>
                      {aptiSkill.locked ? "🔒 Locked" : "Study with Apti →"}
                    </button>
                  )}
                </div>

                {/* Note page tabs */}
                {notes.length > 1 && (
                  <div style={{ display:"flex", gap:3, marginBottom:14, flexWrap:"wrap" }}>
                    {notes.map((n, ni2) => (
                      <button key={ni2} onClick={() => setNoteIdx(ni2)}
                        style={{
                          padding:"4px 10px", borderRadius:3,
                          border: ni2===noteIdx ? `1px solid ${accent}` : `1px solid ${c.line}`,
                          background: ni2===noteIdx ? `${accent}18` : c.bgAlt,
                          color: ni2===noteIdx ? accent : c.faint,
                          cursor:"pointer", fontFamily:"'Spline Sans Mono',monospace", fontSize:10,
                        }}>
                        {ni2 + 1}
                      </button>
                    ))}
                  </div>
                )}

                {notes.length > 0 ? (() => {
                  const n = notes[noteIdx];
                  return (
                    <div className="paper" style={{ padding:"24px 28px", boxShadow:c.shadow }}>
                      <h4 className="serif-h" style={{ fontSize:19, color:c.ink, marginBottom:14 }}>{n.title}</h4>
                      <div className="body" style={{ fontSize:15, color:c.sub, lineHeight:1.75, whiteSpace:"pre-wrap", marginBottom: n.code ? 20 : 0 }}>
                        {n.body}
                      </div>
                      {n.code && (
                        <div style={{ marginBottom: n.afterCode ? 16 : 0 }}>
                          <div className="kicker" style={{ marginBottom:8, fontSize:9 }}>EXAMPLE CODE</div>
                          <pre style={{
                            background:c.bgAlt, border:`1px solid ${c.line}`, borderRadius:3,
                            padding:"16px 18px", fontSize:13, lineHeight:1.65, color:c.ink,
                            fontFamily:"'Spline Sans Mono',monospace", overflowX:"auto", whiteSpace:"pre",
                          }}><code>{n.code}</code></pre>
                        </div>
                      )}
                      {n.afterCode && (
                        <div style={{ padding:"10px 14px", borderLeft:`3px solid ${c.gold}`, background:c.bgAlt, borderRadius:"0 3px 3px 0" }}>
                          <div className="body" style={{ fontSize:13, color:c.sub, lineHeight:1.65 }}>💡 {n.afterCode}</div>
                        </div>
                      )}
                      {/* Pagination */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:24, paddingTop:16, borderTop:`1px solid ${c.line}` }}>
                        <button onClick={() => setNoteIdx(n2 => Math.max(0, n2-1))} disabled={noteIdx===0}
                          style={{ padding:"7px 18px", borderRadius:3, border:`1px solid ${c.line}`, background:"none", color:noteIdx===0?c.line:c.sub, cursor:noteIdx===0?"default":"pointer", fontFamily:"'Spline Sans Mono',monospace", fontSize:12 }}>
                          ← Prev
                        </button>
                        <span className="mono" style={{ fontSize:10, color:c.faint }}>{noteIdx+1} / {notes.length}</span>
                        {noteIdx < notes.length - 1 ? (
                          <button onClick={() => setNoteIdx(n2 => n2+1)} className="btn btn-accent" style={{ fontSize:12, padding:"7px 18px" }}>
                            Next →
                          </button>
                        ) : (
                          <button onClick={() => setTab("exercises")} style={{ padding:"7px 18px", borderRadius:3, border:"none", background:c.green, color:"#fff", cursor:"pointer", fontFamily:"'Spline Sans Mono',monospace", fontSize:12, fontWeight:600 }}>
                            Exercises →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="paper" style={{ padding:"40px 28px", textAlign:"center", color:c.faint }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📖</div>
                    <div className="body">Notes coming soon — jump to Exercises or Resources.</div>
                  </div>
                )}
              </div>
            )}

            {/* ── EXERCISES tab ── */}
            {tab === "exercises" && (
              <div>
                <div style={{ marginBottom:20 }}>
                  <div className="kicker" style={{ color:accent }}>Module {mod.id} · {mod.title}</div>
                  <h3 className="serif-h" style={{ fontSize:22, color:c.ink }}>Practice Exercises</h3>
                  <div className="body" style={{ fontSize:13, color:c.faint, marginTop:6, lineHeight:1.6 }}>
                    Type the code yourself — don't copy-paste. Reveal the solution only after a genuine attempt.
                  </div>
                </div>

                {exs.length > 0 ? exs.map((ex, ei) => {
                  const eid = `${mod.id}-${ei}`;
                  const open = exOpen === ei;
                  return (
                    <div key={ei} className="paper" style={{ marginBottom:12, overflow:"hidden", boxShadow:"none", border:`1px solid ${open ? accent : c.line}` }}>
                      <div onClick={() => setExOpen(open ? null : ei)}
                        style={{ padding:"14px 20px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          <input type="checkbox" checked={!!exDone[eid]}
                            onChange={e => { e.stopPropagation(); setExDone(d => ({...d, [eid]: !d[eid]})); }}
                            style={{ accentColor: accent, width:16, height:16 }}
                            onClick={e => e.stopPropagation()}
                          />
                          <div>
                            <div className="serif-h" style={{ fontSize:16, color:c.ink }}>{ex.title}</div>
                            <div className="mono" style={{ fontSize:10, color:c.faint, marginTop:2 }}>{ex.difficulty}</div>
                          </div>
                        </div>
                        <span className="mono" style={{ fontSize:14, color:open ? accent : c.faint, transition:"transform .2s", display:"inline-block", transform: open?"rotate(180deg)":"none" }}>▾</span>
                      </div>
                      {open && (
                        <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${c.line}` }}>
                          <div className="body" style={{ fontSize:14, color:c.sub, lineHeight:1.65, margin:"12px 0" }}>{ex.description}</div>
                          <div className="kicker" style={{ marginBottom:8, fontSize:9 }}>STARTER CODE</div>
                          <pre style={{
                            background:c.bgAlt, border:`1px solid ${c.line}`, borderRadius:3,
                            padding:"14px 16px", fontSize:12.5, lineHeight:1.65, color:c.ink,
                            fontFamily:"'Spline Sans Mono',monospace", overflowX:"auto", whiteSpace:"pre",
                          }}><code>{ex.starter}</code></pre>
                          <div style={{ marginTop:14, display:"flex", gap:10, flexWrap:"wrap" }}>
                            <button onClick={() => setSolShown(s => ({...s, [ei]: !s[ei]}))}
                              style={{
                                padding:"7px 16px", borderRadius:3, cursor:"pointer",
                                border:`1px solid ${solShown[ei] ? accent : c.line}`,
                                background: solShown[ei] ? `${accent}14` : "none",
                                color: solShown[ei] ? accent : c.sub,
                                fontFamily:"'Spline Sans Mono',monospace", fontSize:11,
                              }}>
                              {solShown[ei] ? "Hide Solution" : "Reveal Solution"}
                            </button>
                            <button onClick={() => setExDone(d => ({...d, [eid]: true}))}
                              style={{ padding:"7px 16px", borderRadius:3, cursor:"pointer", border:`1px solid ${c.green}`, background:"none", color:c.green, fontFamily:"'Spline Sans Mono',monospace", fontSize:11 }}>
                              Mark Complete ✓
                            </button>
                          </div>
                          {solShown[ei] && (
                            <div style={{ marginTop:12 }}>
                              <div className="kicker" style={{ marginBottom:8, fontSize:9, color:c.green }}>SOLUTION</div>
                              <pre style={{
                                background:c.bgAlt, border:`1px solid ${c.green}30`, borderLeft:`3px solid ${c.green}`, borderRadius:3,
                                padding:"14px 16px", fontSize:12.5, lineHeight:1.65, color:c.ink,
                                fontFamily:"'Spline Sans Mono',monospace", overflowX:"auto", whiteSpace:"pre",
                              }}><code>{ex.solution}</code></pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="paper" style={{ padding:"40px 28px", textAlign:"center", color:c.faint }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>💻</div>
                    <div className="body">Exercises coming soon for this module.</div>
                  </div>
                )}
              </div>
            )}

            {/* ── RESOURCES tab ── */}
            {tab === "resources" && (
              <div>
                <div style={{ marginBottom:20 }}>
                  <div className="kicker" style={{ color:accent }}>{phase.icon} {phase.title}</div>
                  <h3 className="serif-h" style={{ fontSize:22, color:c.ink }}>Books & Resources</h3>
                </div>

                <div style={{ borderBottom:`2px solid ${c.rule}`, paddingBottom:8, marginBottom:14 }}>
                  <h4 className="serif-h" style={{ fontSize:16, color:c.ink }}>Recommended Books</h4>
                </div>
                <div style={{ marginBottom:28 }}>
                  {phase.books.map((b, i) => (
                    <div key={i} className="paper" style={{ padding:"16px 20px", marginBottom:8, boxShadow:"none" }}>
                      <div className="serif-h" style={{ fontSize:16, color:c.ink }}>{b.title}</div>
                      <div className="body" style={{ fontSize:13, color:c.faint, marginTop:2 }}>by {b.author}</div>
                      <div className="body" style={{ fontSize:13, color:c.sub, marginTop:4 }}>{b.note}</div>
                      {b.url && (
                        <a href={b.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize:12, color:accent, textDecoration:"none", marginTop:6, display:"inline-block", fontFamily:"'Spline Sans Mono',monospace" }}>
                          {b.url} →
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ borderBottom:`2px solid ${c.rule}`, paddingBottom:8, marginBottom:14 }}>
                  <h4 className="serif-h" style={{ fontSize:16, color:c.ink }}>Online Resources</h4>
                </div>
                {phase.resources.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{ display:"block", padding:"12px 16px", borderRadius:3, border:`1px solid ${c.line}`, marginBottom:6, textDecoration:"none", background:c.bgAlt }}>
                    <div className="serif-h" style={{ fontSize:14, color:c.ink }}>{r.name}</div>
                    <div className="mono" style={{ fontSize:10, color:c.faint, marginTop:3 }}>{r.url}</div>
                  </a>
                ))}
              </div>
            )}

            {/* ── QUIZ tab ── */}
            {tab === "quiz" && (
              <div style={{ maxWidth:560 }}>
                {quizSt.qs.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0" }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>🧪</div>
                    <h3 className="serif-h" style={{ fontSize:24, color:c.ink, marginBottom:12 }}>Python Knowledge Quiz</h3>
                    <div className="body" style={{ fontSize:15, color:c.sub, lineHeight:1.7, marginBottom:24, maxWidth:420, marginInline:"auto" }}>
                      10 questions drawn randomly from {PYTHON_QUIZ.length} covering all four phases. No stakes — it's a self-check.
                    </div>
                    <button onClick={startQuiz} className="btn btn-accent">Start Quiz →</button>
                  </div>
                ) : !quizSt.active ? (
                  <div>
                    <div style={{ textAlign:"center", padding:"20px 0 28px" }}>
                      <div style={{ position:"relative", display:"inline-block" }}>
                        <Ring pct={quizSt.score/quizSt.qs.length*100} color={quizSt.score>=8?c.green:quizSt.score>=6?c.gold:c.accent} size={120} stroke={4}/>
                        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                          <span className="display" style={{ fontSize:36, color:c.ink }}>{quizSt.score}</span>
                          <span className="kicker" style={{ fontSize:8 }}>/ {quizSt.qs.length}</span>
                        </div>
                      </div>
                      <h3 className="serif-h" style={{ fontSize:22, color:c.ink, marginTop:16 }}>
                        {quizSt.score >= 8 ? "Excellent." : quizSt.score >= 6 ? "Good progress." : "Keep practising."}
                      </h3>
                      <button onClick={startQuiz} className="btn btn-ghost" style={{ marginTop:16, fontSize:13 }}>Retry</button>
                    </div>
                    <div style={{ borderTop:`1px solid ${c.line}`, paddingTop:16 }}>
                      {quizSt.answers.map((a, i) => (
                        <div key={i} style={{
                          display:"flex", gap:10, alignItems:"flex-start",
                          padding:"9px 12px", borderRadius:3, marginBottom:4,
                          background: a.ok ? `${c.green}14` : `${c.accent}10`,
                          border:`1px solid ${a.ok ? c.green+"40" : c.accent+"30"}`,
                        }}>
                          <span className="mono" style={{ fontSize:13, color: a.ok ? c.green : c.accent, flexShrink:0 }}>{a.ok ? "✓" : "✗"}</span>
                          <div>
                            <div className="body" style={{ fontSize:13, color:c.ink }}>{a.text}</div>
                            {!a.ok && <div className="mono" style={{ fontSize:11, color:c.sub, marginTop:2 }}>Correct: {a.correct}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (() => {
                  const q = quizSt.qs[quizSt.idx];
                  return (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                        <span className="mono" style={{ fontSize:11, color:c.faint }}>Q {quizSt.idx+1} / {quizSt.qs.length}</span>
                        <span className="mono" style={{ fontSize:11, color:c.green }}>Score: {quizSt.score}</span>
                      </div>
                      <div style={{ height:3, background:c.line, borderRadius:99, marginBottom:20, overflow:"hidden" }}>
                        <div className="bar" style={{ "--w":`${quizSt.idx/quizSt.qs.length*100}%`, background:accent }}/>
                      </div>
                      <div className="serif-h" style={{ fontSize:20, color:c.ink, marginBottom:22, lineHeight:1.45 }}>{q.q}</div>
                      {q.opts.map((opt, i) => (
                        <button key={i} onClick={() => answerQuiz(i)}
                          style={{
                            display:"flex", alignItems:"center", gap:12, width:"100%", textAlign:"left",
                            padding:"12px 16px", borderRadius:3, marginBottom:8, cursor:"pointer",
                            border:`1px solid ${c.line}`, background:"none", color:c.ink,
                          }}>
                          <span className="mono" style={{
                            fontSize:12, width:24, height:24, borderRadius:"50%",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            border:`1px solid ${c.line}`, color:c.faint, flexShrink:0,
                          }}>
                            {String.fromCharCode(65+i)}
                          </span>
                          <span className="body" style={{ fontSize:15 }}>{opt}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div>
            {/* Module overview */}
            <div className="paper" style={{ padding:"22px 24px", marginBottom:20, boxShadow:c.shadow }}>
              <div className="kicker" style={{ marginBottom:14 }}>This Module</div>
              {[
                ["Module", mod.id],
                ["Topic", mod.title],
                ["Duration", mod.duration],
                ["Notes", `${notes.length} sections`],
                ["Exercises", `${exs.length} problems`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${c.line}` }}>
                  <span className="body" style={{ fontSize:14, color:c.faint }}>{k}</span>
                  <span className="serif-h" style={{ fontSize:14, color:c.ink }}>{v}</span>
                </div>
              ))}
              {aptiSkill && !aptiSkill.locked && (
                <button onClick={studyWithApti} className="btn btn-accent" style={{ width:"100%", marginTop:16, fontSize:13 }}>
                  Study with Apti →
                </button>
              )}
              {aptiSkill?.locked && (
                <div className="body" style={{ fontSize:12, color:c.faint, marginTop:12, lineHeight:1.5 }}>
                  🔒 Complete prerequisite skills to unlock an Apti session for this topic.
                </div>
              )}
            </div>

            {/* Roadmap */}
            <div className="paper" style={{ padding:"22px 24px", boxShadow:c.shadow }}>
              <div className="kicker" style={{ marginBottom:14 }}>12-Week Roadmap</div>
              {PYTHON_PHASES.map((p, pi) => (
                <div key={p.id} style={{ marginBottom:14 }}>
                  <div className="mono" style={{ fontSize:10, color:c[p.accent]||c.accent, marginBottom:6, letterSpacing:"0.08em" }}>
                    PHASE {p.id} · {p.weeks}
                  </div>
                  {p.modules.map((m, mi) => {
                    const active = pi === phaseIdx && mi === modIdx;
                    return (
                      <div key={m.id} onClick={() => { goPhase(pi); goMod(mi); }}
                        style={{
                          display:"flex", alignItems:"center", gap:10, padding:"6px 8px", borderRadius:3,
                          marginBottom:3, cursor:"pointer",
                          background: active ? `${c[p.accent]||c.accent}18` : "none",
                        }}>
                        <span className="mono" style={{ fontSize:10, color:active ? c[p.accent]||c.accent : c.faint, width:28 }}>{m.id}</span>
                        <span className="body" style={{ fontSize:13, color: active ? c.ink : c.sub }}>{m.title}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────── */
export default function App() {
  const [mode,          setMode]          = useState("light");
  const [view,          setView]          = useState("dashboard");
  const [activeSkill,   setActiveSkill]   = useState(null);
  const [skills,        setSkills]        = useState([]);
  const [subjects,      setSubjects]      = useState([]);
  const [activeSubject, setActiveSubject] = useState("mathematics");
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [labPhase,      setLabPhase]      = useState(0);
  const c = THEMES[mode];

  const fetchData = () => {
    apiFetch("/api/skills")
      .then(d => setSkills(d.skills || []))
      .catch(console.error);
    apiFetch("/api/subjects")
      .then(d => setSubjects(d.subjects || []))
      .catch(console.error);
  };

  useEffect(fetchData, [refreshKey]);

  const subjectSkills = subjects.find(s => s.id === activeSubject)?.skills || [];

  const handleEnterHall = () => {
    let skill = activeSkill;
    if (!skill || skill.subjectId !== activeSubject) {
      skill = subjectSkills.find(s => !s.locked);
      if (!skill) {
        alert("No unlocked skills in this subject yet. Complete the required prerequisite skills first.");
        return;
      }
      setActiveSkill({...skill, subjectId: activeSubject, subs: [], subMastery: [], subIds: []});
    }
    setView("session");
  };

  return (
    <>
      <style>{buildCSS(c)}</style>
      <div className="root">
        <div className="shell">
          <Sidebar
            view={view} setView={setView} c={c} mode={mode} setMode={setMode}
            skills={skills} subjects={subjects}
            activeSubject={activeSubject} setActiveSubject={setActiveSubject}
          />
          <main className="main">
            {view==="dashboard"   && <Dashboard setView={setView} setActiveSkill={setActiveSkill} c={c} mode={mode} setMode={setMode} skills={skills} subjects={subjects} activeSubject={activeSubject} setActiveSubject={setActiveSubject} onEnterHall={handleEnterHall}/>}
            {view==="skill"       && <SkillDetail skill={activeSkill} setView={setView} c={c} onEnterHall={handleEnterHall} setLabPhase={setLabPhase}/>}
            {view==="session"     && <StudyHall setView={setView} c={c} activeSkill={activeSkill} onComplete={()=>setRefreshKey(k=>k+1)}/>}
            {view==="flashcards"  && <Flashcards setView={setView} c={c}/>}
            {view==="progress"    && <Progress c={c} skills={skills} subjects={subjects}/>}
            {view==="python-lab"  && <PythonLab c={c} setView={setView} skills={skills} setActiveSkill={setActiveSkill}/>}
          </main>
          <BottomNav view={view} setView={setView} c={c}/>
        </div>
      </div>
    </>
  );
}
