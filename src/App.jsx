import { useState, useEffect } from "react";

// ── Supabase config ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://mdrzvikkloedhgznxaar.supabase.co";
const SUPABASE_KEY = "sb_publishable_zFku8JGjzoiRjSyeIo2dOg_FZokAPOE";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

async function dbGetPlayers() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/players?order=number.asc`, { headers });
  if (!r.ok) return null;
  return r.json();
}

async function dbUpsertPlayers(players) {
  await fetch(`${SUPABASE_URL}/rest/v1/players`, {
    method: "POST",
    headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(players),
  });
}

async function dbDeletePlayer(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${id}`, { method: "DELETE", headers });
}

async function dbGetGames() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/games?order=date.desc`, { headers });
  if (!r.ok) return null;
  const rows = await r.json();
  // convert array → object keyed by id
  const obj = {};
  rows.forEach(g => { obj[g.id] = { ...g, eventLog: g.event_log, players: g.players || [] }; });
  return obj;
}

async function dbUpsertGame(game) {
  await fetch(`${SUPABASE_URL}/rest/v1/games`, {
    method: "POST",
    headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: game.id,
      name: game.name,
      date: game.date,
      event_log: game.eventLog,
      players: game.players,
      updated_at: new Date().toISOString(),
    }),
  });
}

// ── Brand ─────────────────────────────────────────────────────────────────
const ORANGE     = "#E8490F";
const NAVY       = "#0E1B2E";
const NAVY2      = "#162235";
const NAVYBORDER = "#243550";
const MUTED      = "#5a7a9a";
const TEXT       = "#EDF2F7";

// ── Constants ─────────────────────────────────────────────────────────────
const POSITIONS = ["Prop","Hooker","Lock","Flanker","Eightman","Scrum Half","Fly Half","Inside Centre","Outside Centre","Wing","Fullback"];

const EVENT_TYPES = [
  { id:"tackle_made_bgl",  label:"Tackle Made",    sub:"Behind GL",     color:"#34D399", group:"defense" },
  { id:"tackle_miss_bgl",  label:"Tackle Missed",  sub:"Behind GL",     color:"#F87171", group:"defense" },
  { id:"tackle_made",      label:"Tackle Made",    sub:"Not Behind GL", color:"#6EE7B7", group:"defense" },
  { id:"tackle_miss",      label:"Tackle Missed",  sub:"Not Behind GL", color:"#FCA5A5", group:"defense" },
  { id:"offload_allowed",  label:"Offload Allowed",sub:"",              color:"#FCD34D", group:"defense" },
  { id:"carry",            label:"Carry",          sub:"",              color:ORANGE,    group:"attack"  },
  { id:"offload",          label:"Offload",        sub:"",              color:"#FB923C", group:"attack"  },
  { id:"linebreak",        label:"Linebreak",      sub:"",              color:"#F472B6", group:"attack"  },
  { id:"playmake",         label:"Playmake",       sub:"",              color:"#A78BFA", group:"attack"  },
  { id:"to_won",           label:"TO Won",         sub:"",              color:"#34D399", group:"turnover"},
  { id:"to_lost",          label:"TO Lost",        sub:"",              color:"#F87171", group:"turnover"},
];

const QUARTER_LABELS = ["0–20","20–40","40–60","60–80"];

const DEFAULT_PLAYERS = [
  { id:"p16", number:16, name:"Lauryn Carlton",    position:"Prop",           mins:80 },
  { id:"p2",  number:2,  name:"Lauren Ferridge",   position:"Hooker",         mins:80 },
  { id:"p3",  number:3,  name:"Caitlin Weigel",    position:"Prop",           mins:80 },
  { id:"p4",  number:4,  name:"Molly McAlevey",    position:"Lock",           mins:80 },
  { id:"p5",  number:5,  name:"Jenny Kronish",     position:"Lock",           mins:80 },
  { id:"p6",  number:6,  name:"Asialeata Meni",    position:"Flanker",        mins:80 },
  { id:"p7",  number:7,  name:"Shelby Vance",      position:"Flanker",        mins:80 },
  { id:"p8",  number:8,  name:"Yeja Dunn",         position:"Eightman",       mins:80 },
  { id:"p9",  number:9,  name:"Gen Quirion",       position:"Scrum Half",     mins:80 },
  { id:"p10", number:10, name:"PK Vincze",         position:"Fly Half",       mins:80 },
  { id:"p11", number:11, name:"Emma Santosuosso",  position:"Wing",           mins:80 },
  { id:"p12", number:12, name:"Lauren Kuffel",     position:"Inside Centre",  mins:80 },
  { id:"p13", number:13, name:"Amanda Wild",       position:"Outside Centre", mins:80 },
  { id:"p14", number:14, name:"Keisha Durden",     position:"Wing",           mins:80 },
  { id:"p15", number:15, name:"Morgan Cunningham", position:"Fullback",       mins:80 },
  { id:"pb1", number:null, name:"Delaney Dill",    position:"Prop",           mins:0  },
  { id:"pb2", number:null, name:"Nickky Nguyen",   position:"Flanker",        mins:0  },
  { id:"pb3", number:null, name:"Q Okine",         position:"Lock",           mins:0  },
  { id:"pb4", number:null, name:"Salma Bezzat",    position:"Hooker",         mins:0  },
  { id:"pb5", number:null, name:"Cassie Depner",   position:"Prop",           mins:0  },
  { id:"pb6", number:null, name:"Kate Boggs",      position:"Scrum Half",     mins:0  },
  { id:"pb7", number:null, name:"Kate Muldoon",    position:"Wing",           mins:0  },
  { id:"pb8", number:null, name:"Desiree Leaupepe",position:"Fullback",       mins:0  },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function calcStats(player, events) {
  const mins = player.mins || 80;
  const per20 = v => mins > 0 ? (v / mins) * 20 : 0;
  const sum = arr => (arr || [0,0,0,0]).reduce((a,b) => a+b, 0);
  const tm_bgl    = sum(events.tackle_made_bgl);
  const tmiss_bgl = sum(events.tackle_miss_bgl);
  const tm        = sum(events.tackle_made);
  const tmiss     = sum(events.tackle_miss);
  const totalMade     = tm_bgl + tm;
  const totalMissed   = tmiss_bgl + tmiss;
  const totalAttempts = totalMade + totalMissed;
  const completion    = totalAttempts > 0 ? totalMade / totalAttempts : null;
  const bgl_pct       = (tm_bgl + tmiss_bgl) > 0 ? tm_bgl / (tm_bgl + tmiss_bgl) : null;
  const carries    = sum(events.carry);
  const offloads   = sum(events.offload);
  const linebreaks = sum(events.linebreak);
  const playmakes  = sum(events.playmake);
  const oaAllowed  = sum(events.offload_allowed);
  const toLost     = sum(events.to_lost);
  const toWon      = sum(events.to_won);
  return { mins, totalMade, totalMissed, totalAttempts, completion, bgl_pct,
    carries, offloads, linebreaks, playmakes, oaAllowed, toLost, toWon,
    tacklesPer20: per20(totalMade), missedPer20: per20(totalMissed), carriesPer20: per20(carries) };
}

function pct(v) { return v === null || v === undefined ? "—" : (v*100).toFixed(0)+"%"; }

// ── Shared styles ─────────────────────────────────────────────────────────
const S = {
  backBtn:    { background:"none", border:`1px solid ${NAVYBORDER}`, color:MUTED, padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:12, marginBottom:16, display:"block" },
  primaryBtn: { background:ORANGE, color:"#fff", border:"none", padding:"8px 18px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  ghostBtn:   { background:"none", border:`1px solid ${NAVYBORDER}`, color:MUTED, padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:12 },
  input:      { background:NAVY, border:`1px solid ${NAVYBORDER}`, color:TEXT, padding:"8px 12px", borderRadius:8, fontSize:13, outline:"none" },
  card:       { background:NAVY2, border:`1px solid ${NAVYBORDER}`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 },
  th:         { padding:"8px 10px", color:MUTED, fontWeight:600, fontSize:11, textTransform:"uppercase", textAlign:"center", letterSpacing:"0.08em" },
  td:         { padding:"8px 10px", textAlign:"center", color:MUTED, fontFamily:"'DM Mono', monospace" },
};

// ── Spinner ───────────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", height:"100vh", background:NAVY, gap:16 }}>
      <div style={{ width:40, height:40, border:`3px solid ${NAVYBORDER}`, borderTop:`3px solid ${ORANGE}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      {label && <div style={{ color:MUTED, fontSize:13 }}>{label}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Jersey badge ──────────────────────────────────────────────────────────
function Jersey({ number, size=28 }) {
  if (!number) return <div style={{ width:size, height:size, flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:6, background:`${ORANGE}22`, border:`1.5px solid ${ORANGE}66`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.38, fontWeight:800, color:ORANGE, fontFamily:"'DM Mono', monospace", flexShrink:0 }}>{number}</div>
  );
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{ background:NAVY, border:`1px solid ${accent}33`, borderRadius:8, padding:"8px 14px", minWidth:80, textAlign:"center" }}>
      <div style={{ fontSize:10, color:MUTED, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color:accent||TEXT, fontFamily:"'DM Mono', monospace" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, val, color }) {
  return (
    <div style={{ textAlign:"center", minWidth:38 }}>
      <div style={{ fontSize:9, color:MUTED, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:700, color, fontFamily:"'DM Mono', monospace" }}>{val}</div>
    </div>
  );
}

// ── Coach Mode ────────────────────────────────────────────────────────────
function CoachMode({ games, players, onSaveGame, onBack }) {
  const [step, setStep]             = useState("game_select");
  const [gameId, setGameId]         = useState(null);
  const [gameName, setGameName]     = useState("");
  const [gameDate, setGameDate]     = useState("");
  const [quarter, setQuarter]       = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [eventLog, setEventLog]     = useState({});
  const [flash, setFlash]           = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (gameId && games[gameId]) {
      const g = games[gameId];
      setEventLog(g.eventLog || {});
      setGameName(g.name || "");
      setGameDate(g.date || "");
    }
  }, [gameId]);

  function startNewGame() {
    const id = "game_" + Date.now();
    setGameId(id); setEventLog({}); setGameName(gameName); setStep("logging");
  }

  function logEvent(playerId, eventId) {
    setEventLog(prev => {
      const pe = prev[playerId] || {};
      const q  = pe[eventId] ? [...pe[eventId]] : [0,0,0,0];
      q[quarter] = (q[quarter]||0) + 1;
      return { ...prev, [playerId]: { ...pe, [eventId]: q } };
    });
    setFlash({ playerId, eventId });
    setLastAction({ playerId, eventId, quarter });
    setTimeout(() => setFlash(null), 280);
  }

  function undoLast() {
    if (!lastAction) return;
    const { playerId, eventId, quarter: q } = lastAction;
    setEventLog(prev => {
      const pe = prev[playerId] || {};
      const qs = pe[eventId] ? [...pe[eventId]] : [0,0,0,0];
      qs[q] = Math.max(0, (qs[q]||0) - 1);
      return { ...prev, [playerId]: { ...pe, [eventId]: qs } };
    });
    setLastAction(null);
  }

  async function finishGame() {
    setSaving(true);
    await onSaveGame(gameId, {
      id: gameId,
      name: gameName || "Game " + new Date().toLocaleDateString(),
      date: gameDate || new Date().toISOString().split("T")[0],
      eventLog,
      players: players.map(p => ({ ...p })),
    });
    setSaving(false);
    setStep("game_select"); setGameId(null); setEventLog({});
  }

  // ── Game select
  if (step === "game_select") {
    return (
      <div style={{ padding:"24px 20px", maxWidth:600, margin:"0 auto" }}>
        <button onClick={onBack} style={S.backBtn}>← Back</button>
        <h2 style={{ color:ORANGE, fontFamily:"'DM Serif Display', serif", fontSize:26, marginBottom:6 }}>Coach Mode</h2>
        <p style={{ color:MUTED, marginBottom:20, fontSize:13 }}>Log a new game or continue an existing session.</p>
        <div style={{ background:NAVY2, border:`1px solid ${NAVYBORDER}`, borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            <input placeholder="Opponent (e.g. vs Denver Onyx)" value={gameName} onChange={e=>setGameName(e.target.value)} style={{ ...S.input, flex:1, minWidth:160 }} />
            <input type="date" value={gameDate} onChange={e=>setGameDate(e.target.value)} style={{ ...S.input, width:148 }} />
          </div>
          <button onClick={startNewGame} style={S.primaryBtn}>+ New Game</button>
        </div>
        {Object.values(games).length > 0 && (
          <>
            <div style={{ color:MUTED, fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Saved Games</div>
            {Object.values(games).sort((a,b)=>b.date?.localeCompare(a.date||"")||0).map(g => (
              <div key={g.id} style={{ ...S.card, cursor:"pointer", marginBottom:6 }}
                onClick={()=>{ setGameId(g.id); setStep("logging"); }}>
                <div>
                  <div style={{ color:TEXT, fontWeight:600 }}>{g.name}</div>
                  <div style={{ color:MUTED, fontSize:12 }}>{g.date}</div>
                </div>
                <span style={{ color:ORANGE, fontSize:12 }}>Edit →</span>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  const currentPlayer = players.find(p => p.id === selectedPlayer);

  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"14px 12px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <button onClick={()=>setStep("game_select")} style={S.backBtn}>← Games</button>
        <div style={{ flex:1, color:TEXT, fontWeight:700, fontSize:15 }}>{gameName || "New Game"}</div>
        <button onClick={undoLast} disabled={!lastAction} style={{ ...S.ghostBtn, opacity:lastAction?1:0.3 }}>↩ Undo</button>
        <button onClick={finishGame} disabled={saving} style={{ ...S.primaryBtn, opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : "Save & Finish"}
        </button>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {QUARTER_LABELS.map((q,i) => (
          <button key={i} onClick={()=>setQuarter(i)} style={{
            flex:1, padding:"8px 0", borderRadius:8, border:"none", cursor:"pointer",
            background: quarter===i ? ORANGE : NAVY2,
            color: quarter===i ? "#fff" : MUTED,
            fontWeight: quarter===i ? 700 : 400, fontSize:13, transition:"all 0.12s",
          }}>{q}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6, marginBottom:14 }}>
        {[...players].sort((a,b)=>(a.number||99)-(b.number||99)).map(p => {
          const isSelected = selectedPlayer === p.id;
          const isFlash    = flash?.playerId === p.id;
          const events     = eventLog[p.id] || {};
          const total      = EVENT_TYPES.reduce((acc,e) => acc+((events[e.id]||[0,0,0,0]).reduce((a,b)=>a+b,0)), 0);
          return (
            <button key={p.id} onClick={()=>setSelectedPlayer(isSelected?null:p.id)} style={{
              background: isFlash ? `${ORANGE}22` : isSelected ? NAVY2 : NAVY,
              border:`2px solid ${isSelected?ORANGE:isFlash?ORANGE+"66":NAVYBORDER}`,
              borderRadius:10, padding:"8px", cursor:"pointer", textAlign:"left", transition:"all 0.1s",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                <Jersey number={p.number} size={22} />
                <div style={{ color:TEXT, fontWeight:700, fontSize:12, lineHeight:1.2 }}>{p.name.split(" ")[1]||p.name}</div>
              </div>
              <div style={{ color:MUTED, fontSize:10 }}>{p.position}</div>
              {total > 0 && <div style={{ fontSize:10, color:ORANGE, marginTop:2 }}>✓ {total}</div>}
            </button>
          );
        })}
      </div>

      {selectedPlayer ? (
        <div style={{ background:NAVY, border:`1px solid ${NAVYBORDER}`, borderRadius:12, padding:14 }}>
          <div style={{ color:MUTED, fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>
            <span style={{ color:ORANGE }}>{currentPlayer?.name}</span> · Q{quarter+1} ({QUARTER_LABELS[quarter]})
          </div>
          {["defense","attack","turnover"].map(group => (
            <div key={group} style={{ marginBottom:12 }}>
              <div style={{ color:NAVYBORDER, fontSize:10, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>{group}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {EVENT_TYPES.filter(e=>e.group===group).map(ev => {
                  const val = (eventLog[selectedPlayer]?.[ev.id]||[0,0,0,0])[quarter]||0;
                  return (
                    <button key={ev.id} onClick={()=>logEvent(selectedPlayer,ev.id)} style={{
                      background:`${ev.color}15`, border:`1.5px solid ${ev.color}55`,
                      borderRadius:8, padding:"7px 11px", cursor:"pointer", color:ev.color,
                      fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5,
                    }}>
                      {ev.label}{ev.sub && <span style={{ opacity:0.6, fontWeight:400, fontSize:10 }}> {ev.sub}</span>}
                      {val>0 && <span style={{ background:ev.color, color:"#000", borderRadius:99, width:17, height:17, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800 }}>{val}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign:"center", color:NAVYBORDER, padding:30, fontSize:14 }}>↑ Select a player to log events</div>
      )}
    </div>
  );
}

// ── Stats Dashboard ───────────────────────────────────────────────────────
function StatsDashboard({ games, players, onBack }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [viewPlayer, setViewPlayer]     = useState(null);
  const [filterPos, setFilterPos]       = useState("All");

  const game = selectedGame ? games[selectedGame] : null;

  if (!game) {
    return (
      <div style={{ padding:"24px 20px", maxWidth:700, margin:"0 auto" }}>
        <button onClick={onBack} style={S.backBtn}>← Back</button>
        <h2 style={{ color:ORANGE, fontFamily:"'DM Serif Display', serif", fontSize:26, marginBottom:6 }}>Team Stats</h2>
        <p style={{ color:MUTED, marginBottom:20, fontSize:13 }}>Select a game to view the breakdown.</p>
        {Object.values(games).length === 0 ? (
          <div style={{ color:NAVYBORDER, textAlign:"center", padding:40 }}>No games logged yet.</div>
        ) : Object.values(games).sort((a,b)=>b.date?.localeCompare(a.date||"")||0).map(g => (
          <div key={g.id} style={{ ...S.card, cursor:"pointer", marginBottom:8 }} onClick={()=>setSelectedGame(g.id)}>
            <div>
              <div style={{ color:TEXT, fontWeight:600 }}>{g.name}</div>
              <div style={{ color:MUTED, fontSize:12 }}>{g.date}</div>
            </div>
            <span style={{ color:ORANGE, fontSize:12 }}>View →</span>
          </div>
        ))}
      </div>
    );
  }

  const gamePlayers = game.players?.length ? game.players : players;

  if (viewPlayer) {
    const p      = gamePlayers.find(pl => pl.id === viewPlayer);
    if (!p) return null;
    const events = game.eventLog?.[p.id] || {};
    const stats  = calcStats(p, events);
    return (
      <div style={{ padding:"20px 16px", maxWidth:680, margin:"0 auto" }}>
        <button onClick={()=>setViewPlayer(null)} style={S.backBtn}>← Back to Game</button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <Jersey number={p.number} size={36} />
          <div>
            <h2 style={{ color:TEXT, fontFamily:"'DM Serif Display', serif", fontSize:28, margin:0 }}>{p.name}</h2>
            <div style={{ color:ORANGE, fontSize:13 }}>{p.position} · {p.mins} mins</div>
          </div>
        </div>
        <div style={{ color:MUTED, fontSize:12, marginBottom:20 }}>{game.name} · {game.date}</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24 }}>
          <StatPill label="Tackles"    value={stats.totalMade}       accent="#34D399" />
          <StatPill label="Missed"     value={stats.totalMissed}     accent="#F87171" />
          <StatPill label="Completion" value={pct(stats.completion)} accent="#6EE7B7" />
          <StatPill label="BGL %"      value={pct(stats.bgl_pct)}    accent="#A78BFA" />
          <StatPill label="Carries"    value={stats.carries}         accent={ORANGE}  />
          <StatPill label="Offloads"   value={stats.offloads}        accent="#FB923C" />
          <StatPill label="Linebreaks" value={stats.linebreaks}      accent="#F472B6" />
          <StatPill label="Playmakes"  value={stats.playmakes}       accent="#A78BFA" />
          <StatPill label="OA Allowed" value={stats.oaAllowed}       accent="#FCD34D" />
          <StatPill label="TO Won"     value={stats.toWon}           accent="#34D399" />
          <StatPill label="TO Lost"    value={stats.toLost}          accent="#F87171" />
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${NAVYBORDER}` }}>
                <th style={{ ...S.th, textAlign:"left" }}>Event</th>
                {QUARTER_LABELS.map(q=><th key={q} style={S.th}>{q}</th>)}
                <th style={S.th}>Total</th>
                <th style={S.th}>Per 20</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_TYPES.map(ev => {
                const q     = events[ev.id] || [0,0,0,0];
                const total = q.reduce((a,b)=>a+b,0);
                if (total===0) return null;
                const per20 = p.mins>0 ? ((total/p.mins)*20).toFixed(2) : "—";
                return (
                  <tr key={ev.id} style={{ borderBottom:`1px solid ${NAVY2}` }}>
                    <td style={{ padding:"8px 0", color:ev.color, fontWeight:600 }}>
                      {ev.label}{ev.sub && <span style={{ color:MUTED, fontWeight:400 }}> ({ev.sub})</span>}
                    </td>
                    {q.map((v,i)=><td key={i} style={{ ...S.td, color:v>0?TEXT:NAVYBORDER }}>{v||"—"}</td>)}
                    <td style={{ ...S.td, color:TEXT, fontWeight:700 }}>{total}</td>
                    <td style={{ ...S.td }}>{per20}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const posOptions = ["All", ...POSITIONS.filter(pos => gamePlayers.some(p=>p.position===pos))];
  const filtered   = gamePlayers.filter(p => filterPos==="All" || p.position===filterPos);

  return (
    <div style={{ padding:"20px 16px", maxWidth:700, margin:"0 auto" }}>
      <button onClick={()=>setSelectedGame(null)} style={S.backBtn}>← All Games</button>
      <h2 style={{ color:ORANGE, fontFamily:"'DM Serif Display', serif", fontSize:24, marginBottom:2 }}>{game.name}</h2>
      <div style={{ color:MUTED, fontSize:12, marginBottom:16 }}>{game.date}</div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:16 }}>
        {posOptions.map(pos => (
          <button key={pos} onClick={()=>setFilterPos(pos)} style={{
            padding:"4px 10px", borderRadius:99, border:"1px solid",
            borderColor: filterPos===pos ? ORANGE : NAVYBORDER,
            background:  filterPos===pos ? `${ORANGE}22` : "transparent",
            color:       filterPos===pos ? ORANGE : MUTED,
            cursor:"pointer", fontSize:11,
          }}>{pos}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {[...filtered].sort((a,b)=>(a.number||99)-(b.number||99)).map(p => {
          const events = game.eventLog?.[p.id] || {};
          const stats  = calcStats(p, events);
          const hasData= stats.totalMade+stats.totalMissed+stats.carries > 0;
          return (
            <div key={p.id} onClick={()=>setViewPlayer(p.id)}
              style={{ ...S.card, cursor:"pointer", transition:"border-color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=`${ORANGE}55`}
              onMouseLeave={e=>e.currentTarget.style.borderColor=NAVYBORDER}
            >
              <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:150 }}>
                <Jersey number={p.number} size={26} />
                <div>
                  <div style={{ color:TEXT, fontWeight:700, fontSize:13 }}>{p.name}</div>
                  <div style={{ color:MUTED, fontSize:11 }}>{p.position}</div>
                </div>
              </div>
              {hasData ? (
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", flex:1, justifyContent:"flex-end" }}>
                  <MiniStat label="Tkl"  val={stats.totalMade}      color="#34D399" />
                  <MiniStat label="Miss" val={stats.totalMissed}     color="#F87171" />
                  <MiniStat label="Comp" val={pct(stats.completion)} color="#6EE7B7" />
                  <MiniStat label="BGL"  val={pct(stats.bgl_pct)}    color="#A78BFA" />
                  <MiniStat label="Car"  val={stats.carries}         color={ORANGE}  />
                  <MiniStat label="LB"   val={stats.linebreaks}      color="#F472B6" />
                </div>
              ) : (
                <div style={{ color:NAVYBORDER, fontSize:12 }}>No events logged</div>
              )}
              <span style={{ color:NAVYBORDER, fontSize:12, marginLeft:8 }}>→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Manage Players ────────────────────────────────────────────────────────
function ManagePlayers({ players, onSave, onBack }) {
  const [list, setList]       = useState(players.map(p=>({...p})));
  const [newName, setNewName] = useState("");
  const [newPos, setNewPos]   = useState("Prop");
  const [newNum, setNewNum]   = useState("");
  const [newMins, setNewMins] = useState(80);
  const [saving, setSaving]   = useState(false);

  function addPlayer() {
    if (!newName.trim()) return;
    setList(prev => [...prev, { id:"p_"+Date.now(), number:newNum?Number(newNum):null, name:newName.trim(), position:newPos, mins:Number(newMins) }]);
    setNewName(""); setNewNum("");
  }

  async function handleSave() {
    setSaving(true);
    await onSave(list);
    setSaving(false);
  }

  return (
    <div style={{ padding:"24px 20px", maxWidth:600, margin:"0 auto" }}>
      <button onClick={onBack} style={S.backBtn}>← Back</button>
      <h2 style={{ color:ORANGE, fontFamily:"'DM Serif Display', serif", fontSize:26, marginBottom:20 }}>Manage Roster</h2>
      <div style={{ background:NAVY2, border:`1px solid ${NAVYBORDER}`, borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ color:MUTED, fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Add Player</div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          <input placeholder="Name" value={newName} onChange={e=>setNewName(e.target.value)} style={{ ...S.input, flex:1, minWidth:130 }} />
          <input type="number" placeholder="#" value={newNum} onChange={e=>setNewNum(e.target.value)} style={{ ...S.input, width:60 }} />
          <select value={newPos} onChange={e=>setNewPos(e.target.value)} style={{ ...S.input, minWidth:130 }}>
            {POSITIONS.map(p=><option key={p}>{p}</option>)}
          </select>
          <input type="number" placeholder="Mins" value={newMins} onChange={e=>setNewMins(e.target.value)} style={{ ...S.input, width:70 }} />
          <button onClick={addPlayer} style={S.primaryBtn}>Add</button>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {[...list].sort((a,b)=>(a.number||99)-(b.number||99)).map(p => (
          <div key={p.id} style={S.card}>
            <Jersey number={p.number} size={24} />
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ color:TEXT, fontWeight:600, minWidth:130 }}>{p.name}</span>
              <span style={{ color:MUTED, fontSize:12, minWidth:110 }}>{p.position}</span>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ color:MUTED, fontSize:12 }}>Mins:</span>
                <input type="number" value={p.mins}
                  onChange={e=>setList(prev=>prev.map(pl=>pl.id===p.id?{...pl,mins:Number(e.target.value)}:pl))}
                  style={{ ...S.input, width:58, padding:"4px 8px" }} />
              </div>
            </div>
            <button onClick={()=>setList(prev=>prev.filter(pl=>pl.id!==p.id))}
              style={{ background:"none", border:"none", color:"#F87171", cursor:"pointer", fontSize:16 }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} style={{ ...S.primaryBtn, marginTop:20, width:"100%", opacity:saving?0.6:1 }}>
        {saving ? "Saving to database…" : "Save Roster"}
      </button>
    </div>
  );
}

// ── Mode card ─────────────────────────────────────────────────────────────
function ModeCard({ title, desc, accent, icon, onClick, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background: hov?`${accent}12`:NAVY2, border:`1.5px solid ${hov?accent+"66":NAVYBORDER}`,
      borderRadius:14, padding:"18px 20px", cursor:"pointer", textAlign:"left",
      transition:"all 0.15s", width:"100%", display:"flex", alignItems:"center", gap:14,
    }}>
      <span style={{ fontSize:24 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ color:accent, fontWeight:700, fontSize:15, marginBottom:3, display:"flex", alignItems:"center", gap:8 }}>
          {title}
          {badge && <span style={{ background:`${accent}22`, color:accent, fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600 }}>{badge}</span>}
        </div>
        <div style={{ color:MUTED, fontSize:13, lineHeight:1.4 }}>{desc}</div>
      </div>
      <span style={{ color:accent, opacity:hov?1:0.3 }}>→</span>
    </button>
  );
}

// ── App root ──────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]       = useState("home");
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Loading roster…");
  const [games, setGames]     = useState({});
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);

  useEffect(() => {
    async function init() {
      setLoadMsg("Loading roster…");
      const dbPlayers = await dbGetPlayers();
      if (dbPlayers && dbPlayers.length > 0) {
        setPlayers(dbPlayers);
      } else {
        // First run — seed default roster
        await dbUpsertPlayers(DEFAULT_PLAYERS);
      }
      setLoadMsg("Loading games…");
      const dbGames = await dbGetGames();
      if (dbGames) setGames(dbGames);
      setLoading(false);
    }
    init();
  }, []);

  async function handleSaveGame(id, gameData) {
    await dbUpsertGame(gameData);
    setGames(prev => ({ ...prev, [id]: gameData }));
  }

  async function handleSavePlayers(newPlayers) {
    // Upsert all, then delete removed ones
    const oldIds  = new Set(players.map(p=>p.id));
    const newIds  = new Set(newPlayers.map(p=>p.id));
    const removed = [...oldIds].filter(id => !newIds.has(id));
    await dbUpsertPlayers(newPlayers);
    for (const id of removed) await dbDeletePlayer(id);
    setPlayers(newPlayers);
    setMode("home");
  }

  if (loading) return <Spinner label={loadMsg} />;

  const gameCount = Object.keys(games).length;

  return (
    <div style={{ background:NAVY, minHeight:"100vh", color:TEXT, fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;600&display=swap');
        * { box-sizing:border-box; }
        input,select,button { font-family:inherit; }
        input[type=number]::-webkit-inner-spin-button { opacity:0.4; }
        select option { background:${NAVY2}; }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:${NAVY}}
        ::-webkit-scrollbar-thumb{background:${NAVYBORDER};border-radius:3px}
      `}</style>

      {mode === "home" && (
        <div style={{ maxWidth:500, margin:"0 auto", padding:"44px 24px 32px" }}>
          <div style={{ marginBottom:36 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
              <div style={{ width:44, height:44, background:`linear-gradient(135deg,${ORANGE},#c0392b)`,
                borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👻</div>
              <div>
                <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:24, color:TEXT, lineHeight:1 }}>Boston Banshees</div>
                <div style={{ fontSize:11, color:MUTED, letterSpacing:"0.15em", textTransform:"uppercase" }}>Performance Tracker</div>
              </div>
            </div>
            <div style={{ color:NAVYBORDER, fontSize:12, marginTop:6 }}>
              {gameCount > 0 ? `${gameCount} game${gameCount!==1?"s":""} logged · ` : ""}{players.length} players on roster
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <ModeCard title="Coach Mode"    desc="Log events while coding film — tap player, tap event." accent={ORANGE}  icon="🎥" onClick={()=>setMode("coach")} />
            <ModeCard title="Team Stats"    desc="Per-player breakdowns, quarter splits, and metrics."   accent="#A78BFA" icon="📊" onClick={()=>setMode("stats")} badge={gameCount>0?`${gameCount} games`:null} />
            <ModeCard title="Manage Roster" desc="Add players, update numbers and minutes played."       accent="#FCD34D" icon="👥" onClick={()=>setMode("roster")} badge={`${players.length} players`} />
          </div>

          <div style={{ marginTop:28, padding:"12px 16px", background:NAVY2, borderRadius:10, border:`1px solid ${NAVYBORDER}` }}>
            <div style={{ color:MUTED, fontSize:11, textAlign:"center", lineHeight:1.8 }}>
              🌐 Live data — all teammates see the same stats in real time.<br/>
              Share this URL with the team to view game breakdowns.
            </div>
          </div>
        </div>
      )}

      {mode==="coach"  && <CoachMode  games={games}   players={players} onSaveGame={handleSaveGame}    onBack={()=>setMode("home")} />}
      {mode==="stats"  && <StatsDashboard games={games} players={players}                               onBack={()=>setMode("home")} />}
      {mode==="roster" && <ManagePlayers  players={players}              onSave={handleSavePlayers}     onBack={()=>setMode("home")} />}
    </div>
  );
}
