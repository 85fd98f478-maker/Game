import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { HEIST_IMG, ITEM_IMG_BY_ID } from "../images";
import { Zap, Users, Radar, UserPlus } from "lucide-react";

const TYPE_COLORS = { quick: "#10B981", street: "#38BDF8", heist: "#F59E0B", major: "#EF4444" };

export default function Heists({ setTab }) {
  const { user, catalog, refresh } = useAuth();
  const [selected, setSelected] = useState(null);
  const [crewSel, setCrewSel] = useState([]);
  const [vehSel, setVehSel] = useState(user.equipped.vehicle || "starter");
  const [droneSel, setDroneSel] = useState(null);
  const [playerSel, setPlayerSel] = useState([]);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [history, setHistory] = useState([]);
  const [chance, setChance] = useState(null);
  const [friends, setFriends] = useState([]);
  const [accepted, setAccepted] = useState([]);

  useEffect(() => { (async () => { try { const { data } = await api.get("/heist/history"); setHistory(data); } catch {} })(); }, []);
  useEffect(() => { (async () => { try { const { data } = await api.get("/friends"); setFriends(data.friends || []); } catch {} })(); }, []);

  const loadAccepted = useCallback(async (hid) => { try { const { data } = await api.get(`/heist/accepted-crew/${hid}`); setAccepted(data); } catch {} }, []);

  const ownedDrones = Object.entries(user.drones || {}).filter(([, q]) => q > 0).map(([id]) => catalog?.drones.find((d) => d.id === id)).filter(Boolean);

  // live success chance recompute
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.post("/heist/success-chance", { heist_id: selected.id, crew_ids: crewSel, vehicle_id: vehSel, drone_id: droneSel, player_ids: playerSel });
        setChance(data);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [selected, crewSel, vehSel, droneSel, playerSel]);

  if (!catalog) return null;

  const open = (h) => { setSelected(h); setCrewSel([]); setDroneSel(null); setPlayerSel([]); setAccepted([]); setVehSel(user.equipped.vehicle || "starter"); loadAccepted(h.id); };
  const toggleCrew = (id) => setCrewSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const togglePlayer = (id) => setPlayerSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const invite = async (fr) => { try { await api.post("/heist/invite", { friend_username: fr.username, heist_id: selected.id }); toast.success(`Invite sent to ${fr.username}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  const totalCrew = 1 + crewSel.length + playerSel.length;
  const vehMeta = catalog.vehicles.find((v) => v.id === vehSel);
  const crewMax = selected?.crew_max || 4;
  const capOk = vehMeta ? vehMeta.capacity >= totalCrew : true;

  const start = async () => {
    if (!selected) return;
    setRunning(true); setEvents([]); setOutcome(null);
    try {
      const { data } = await api.post("/heist/run", { heist_id: selected.id, crew_ids: crewSel, vehicle_id: vehSel, drone_id: droneSel, player_ids: playerSel });
      for (let i = 0; i < data.events.length; i++) { await new Promise((r) => setTimeout(r, 500)); setEvents((prev) => [...prev, data.events[i]]); }
      await new Promise((r) => setTimeout(r, 300));
      setOutcome(data);
      await refresh();
      const { data: h } = await api.get("/heist/history"); setHistory(h);
      if (data.captured) toast.error("You were ARRESTED! Go to the Prison tab to pay bail.");
      if (data.drone_lost) toast.error("Drone destroyed — permanently lost.");
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); setRunning(false); }
  };

  const closeOutcome = () => { setRunning(false); setOutcome(null); setEvents([]); setSelected(null); };
  const outcomeClass = { "PERFECT SUCCESS": "outcome-perfect", "SUCCESS": "outcome-success", "PARTIAL SUCCESS": "outcome-partial", "FAILED": "outcome-failed", "DISASTER": "outcome-disaster" };
  const pct = chance ? Math.round(chance.success_chance * 100) : null;

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="heists-tab">
      {!running && !selected && <>
        <div>
          <h2 className="font-display" style={{ fontSize: 24, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>OPERATIONS</h2>
          <div style={{ color: "#64748B", fontSize: 13 }}>Each heist costs Stamina and has its own cooldown. Build the right crew, vehicle and drone to raise your odds.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
          {catalog.heists.map((h) => {
            const locked = user.level < h.min_level; const color = TYPE_COLORS[h.type];
            return (
              <div key={h.id} className="card-glow" data-testid={`heist-${h.id}`} onClick={() => !locked && open(h)} style={{ padding: 0, overflow: "hidden", opacity: locked ? 0.45 : 1, cursor: locked ? "not-allowed" : "pointer", borderColor: `${color}55` }}>
                {HEIST_IMG[h.id] && <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
                  <img src={HEIST_IMG[h.id]} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(3,3,8,0.55) 75%, #08080f 100%)" }} />
                </div>}
                <div style={{ padding: 18 }}>
                  <div className="label-caps" style={{ color }}>{h.type.toUpperCase()} · {h.district.replace("_", " ").toUpperCase()}</div>
                  <div className="font-display" style={{ color: "#fff", fontSize: 18, marginTop: 4 }}>{h.name.toUpperCase()}</div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>Diff {h.difficulty}/10</span>
                    <span><Users size={11} style={{ display: "inline" }} /> {h.min_crew}-{h.crew_max}</span>
                    <span style={{ color: "#38BDF8" }}><Zap size={11} style={{ display: "inline" }} /> {h.stamina_cost}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>Reward: <span className="font-display neon-gold">{fmtMoney(h.reward_min)} – {fmtMoney(h.reward_max)}</span></div>
                  <div style={{ marginTop: 4, fontSize: 11, color: locked ? "#EF4444" : "#64748B" }}>{locked ? `LOCKED · LVL ${h.min_level}` : `MIN LEVEL ${h.min_level}`}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="card-glow" style={{ padding: 20 }}>
          <div className="label-caps neon-purple" style={{ marginBottom: 10 }}>HEIST HISTORY</div>
          {history.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No operations yet.</div> :
            <div style={{ display: "grid", gap: 6 }}>
              {history.slice(0, 10).map((o) => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a2436", fontSize: 12 }}>
                  <span style={{ color: "#fff" }}>{o.heist_name}</span>
                  <span className={outcomeClass[o.outcome]} style={{ fontFamily: "Orbitron", fontSize: 10 }}>{o.outcome}</span>
                  <span className="font-display neon-gold">{fmtMoney(o.cash)}</span>
                </div>
              ))}
            </div>}
        </div>
      </>}

      {!running && selected && <div className="hologram-border card-glow" style={{ padding: 24 }}>
        <button data-testid="back-to-heists" onClick={() => setSelected(null)} className="btn-outline" style={{ padding: "6px 12px", fontSize: 11, marginBottom: 16 }}>← BACK</button>
        <div className="label-caps neon-cyan">PREPARE OPERATION</div>
        <h2 className="font-display" style={{ fontSize: 28, color: "#fff" }}>{selected.name.toUpperCase()}</h2>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>Reward: <span className="neon-gold">{fmtMoney(selected.reward_min)} – {fmtMoney(selected.reward_max)}</span> · Difficulty {selected.difficulty}/10 · Heat +{selected.heat_gain}</div>

        {/* live status bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 20 }}>
          <div style={{ padding: 12, border: "1px solid #1a2436" }}><div className="label-caps">CREW</div><div className="font-display" style={{ fontSize: 18, color: totalCrew > crewMax ? "#EF4444" : "#fff" }} data-testid="crew-count">{totalCrew}/{crewMax}</div></div>
          <div style={{ padding: 12, border: "1px solid #1a2436" }}><div className="label-caps">STAMINA</div><div className="font-display" style={{ fontSize: 18, color: user.stamina >= selected.stamina_cost ? "#38BDF8" : "#EF4444" }} data-testid="stamina-cost">{selected.stamina_cost} <span style={{ fontSize: 11, color: "#64748B" }}>({user.stamina} left)</span></div></div>
          <div style={{ padding: 12, border: "1px solid #1a2436" }}><div className="label-caps">CAPACITY</div><div className="font-display" style={{ fontSize: 18, color: capOk ? "#10B981" : "#EF4444" }}>{vehMeta?.capacity || "-"}</div></div>
          <div style={{ padding: 12, border: `1px solid ${pct >= 60 ? "#10B981" : pct >= 35 ? "#F59E0B" : "#EF4444"}` }}><div className="label-caps">SUCCESS CHANCE</div><div className="font-display" style={{ fontSize: 20, color: pct >= 60 ? "#10B981" : pct >= 35 ? "#F59E0B" : "#EF4444" }} data-testid="success-chance">{pct === null ? "…" : `${pct}%`}</div></div>
        </div>
        {chance && <div style={{ fontSize: 11, color: "#64748B", marginBottom: 16 }}>Context: <span style={{ color: "#00F0FF" }}>{chance.breakdown.context.toUpperCase()}</span> — matching specializations & drone focus boost your odds. Never guaranteed.</div>}

        {selected.min_crew > 0 && crewSel.length + playerSel.length < selected.min_crew && <div style={{ padding: 10, border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444", fontSize: 12, marginBottom: 14 }}>Requires at least {selected.min_crew} crew.</div>}

        <div style={{ marginBottom: 18 }}>
          <div className="label-caps" style={{ marginBottom: 8 }}>NPC CREW</div>
          {user.hired_crew.length === 0 && <div style={{ color: "#EF4444", fontSize: 12 }}>No crew hired. Visit the Crew tab.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
            {user.hired_crew.map((cid) => {
              const n = catalog.npcs.find((x) => x.id === cid); if (!n) return null; const sel = crewSel.includes(cid);
              const color = catalog.specializations.find((s) => s.id === n.spec)?.color;
              return <button data-testid={`select-crew-${cid}`} key={cid} onClick={() => toggleCrew(cid)} style={{ padding: 10, border: `1px solid ${sel ? color : "#1a2436"}`, background: sel ? `${color}15` : "transparent", textAlign: "left" }}><div className="font-display" style={{ color: "#fff", fontSize: 13 }}>{n.name}</div><div className="label-caps" style={{ color }}>{n.spec} · NPC</div></button>;
            })}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="label-caps" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><UserPlus size={12} /> INVITE FRIENDS (real players contribute more)</div>
          {friends.length === 0 ? <div style={{ color: "#64748B", fontSize: 12 }}>No friends yet. Add some in the Social tab.</div> :
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
              {friends.map((fr) => (
                <div key={fr.id} style={{ padding: 10, border: "1px solid #1a2436", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <div><div className="font-display" style={{ color: "#fff", fontSize: 12 }}>{fr.username}</div><div style={{ fontSize: 10, color: fr.online ? "#10B981" : "#64748B" }}>{fr.online ? "● ONLINE" : "○ OFFLINE"}</div></div>
                  <button data-testid={`invite-${fr.username}`} onClick={() => invite(fr)} className="btn-outline" style={{ padding: "4px 8px", fontSize: 9 }}>INVITE</button>
                </div>
              ))}
            </div>}
          {accepted.length > 0 && <div style={{ marginTop: 10 }}>
            <div className="label-caps neon-green" style={{ marginBottom: 6 }}>ACCEPTED — SELECT TO ADD TO CREW</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
              {accepted.map((p) => { const sel = playerSel.includes(p.id); return <button data-testid={`player-crew-${p.username}`} key={p.id} onClick={() => togglePlayer(p.id)} style={{ padding: 10, border: `1px solid ${sel ? "#10B981" : "#1a2436"}`, background: sel ? "rgba(16,185,129,0.1)" : "transparent", textAlign: "left" }}><div className="font-display" style={{ color: "#fff", fontSize: 12 }}>{p.username}</div><div className="label-caps" style={{ color: "#10B981" }}>LVL {p.level} · {p.specialization}</div></button>; })}
            </div>
          </div>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="label-caps" style={{ marginBottom: 8 }}>GETAWAY VEHICLE (must seat entire crew)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
            {user.vehicles.map((v) => { const meta = catalog.vehicles.find((x) => x.id === v.id); if (!meta) return null; const sel = vehSel === v.id;
              return <button data-testid={`select-veh-${v.id}`} key={v.instance_id || v.id} onClick={() => setVehSel(v.id)} style={{ padding: 10, border: `1px solid ${sel ? "#00F0FF" : "#1a2436"}`, background: sel ? "rgba(0,240,255,0.08)" : "transparent", textAlign: "left" }}><div className="font-display" style={{ color: "#fff", fontSize: 13 }}>{meta.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>CAP {meta.capacity} · ESC {meta.escape}</div></button>; })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="label-caps" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Radar size={12} /> DRONE (max 1 · optional · never required)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
            <button data-testid="drone-none" onClick={() => setDroneSel(null)} style={{ padding: 10, border: `1px solid ${droneSel === null ? "#00F0FF" : "#1a2436"}`, background: droneSel === null ? "rgba(0,240,255,0.08)" : "transparent", textAlign: "left" }}><div className="font-display" style={{ color: "#fff", fontSize: 13 }}>NO DRONE</div><div className="label-caps">Play it safe</div></button>
            {ownedDrones.map((d) => { const sel = droneSel === d.id; return <button data-testid={`select-drone-${d.id}`} key={d.id} onClick={() => setDroneSel(d.id)} style={{ padding: 10, border: `1px solid ${sel ? "#00F0FF" : "#1a2436"}`, background: sel ? "rgba(0,240,255,0.08)" : "transparent", textAlign: "left", display: "flex", gap: 8, alignItems: "center" }}><img src={ITEM_IMG_BY_ID[d.id]} alt="" style={{ width: 32, height: 32, objectFit: "cover" }} /><div><div className="font-display" style={{ color: "#fff", fontSize: 12 }}>{d.name}</div><div className="label-caps" style={{ color: "#00F0FF" }}>{d.focus}</div></div></button>; })}
          </div>
          {ownedDrones.length === 0 && <div style={{ color: "#64748B", fontSize: 11, marginTop: 6 }}>No drones owned. Buy them in the Black Market (cash only).</div>}
        </div>

        <button data-testid="run-operation" onClick={start} disabled={(crewSel.length + playerSel.length) < selected.min_crew || !capOk || user.stamina < selected.stamina_cost} className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 14 }}>
          {user.stamina < selected.stamina_cost ? "⚡ NOT ENOUGH STAMINA" : !capOk ? "🚗 VEHICLE TOO SMALL" : "▶ RUN OPERATION"}
        </button>
      </div>}

      {running && <div className="hologram-border card-glow" style={{ padding: 24 }} data-testid="operation-running">
        <div className="label-caps neon-cyan">OPERATION IN PROGRESS</div>
        <h2 className="font-display" style={{ fontSize: 24, color: "#fff", margin: "6px 0 16px" }}>{selected?.name.toUpperCase()}</h2>
        <div style={{ maxHeight: 360, overflowY: "auto", padding: 16, background: "#04050a", border: "1px solid #1a2436", fontSize: 13, display: "grid", gap: 6 }}>
          {events.map((e, i) => <div key={i} className={`ticker-line event-${e.cat || "info"}`}><span style={{ color: "#64748B", fontFamily: "Orbitron", fontSize: 11 }}>{e.time}</span> · {e.msg}</div>)}
          {events.length === 0 && <div style={{ color: "#64748B" }}>Initializing operation...</div>}
        </div>
        {outcome && <div style={{ marginTop: 20, padding: 24, border: `2px solid ${outcome.outcome.includes("PERFECT") ? "#F59E0B" : outcome.outcome === "SUCCESS" ? "#10B981" : outcome.outcome === "PARTIAL SUCCESS" ? "#38BDF8" : "#EF4444"}` }} data-testid="operation-outcome">
          <div className={`font-display ${outcomeClass[outcome.outcome]}`} style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.15em", textAlign: "center" }}>{outcome.outcome}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 14, marginTop: 20 }}>
            <div><div className="label-caps">Cash</div><div className="font-display neon-gold" style={{ fontSize: 20 }}>+{fmtMoney(outcome.rewards.cash)}</div></div>
            <div><div className="label-caps">XP</div><div className="font-display neon-cyan" style={{ fontSize: 20 }}>+{outcome.rewards.xp}</div></div>
            <div><div className="label-caps">Heat</div><div className="font-display neon-red" style={{ fontSize: 20 }}>+{outcome.rewards.heat}</div></div>
            <div><div className="label-caps">HP Loss</div><div className="font-display" style={{ fontSize: 20, color: "#EF4444" }}>-{outcome.rewards.hp_loss}</div></div>
          </div>
          {outcome.drone_lost && <div style={{ marginTop: 14, padding: 12, border: "1px solid #EF4444", color: "#EF4444", fontSize: 12 }} data-testid="drone-lost-msg">🛰 DRONE CONTACT LOST — Something shot down your drone. <b>Destroyed. Returned to Inventory: No.</b></div>}
          {outcome.captured && <div style={{ marginTop: 14, padding: 12, border: "1px solid #EF4444", color: "#EF4444", fontSize: 12 }} data-testid="captured-msg">🚔 ARRESTED — {outcome.prison?.reason}. Go to the Prison tab to pay bail (${outcome.prison?.bail}).</div>}
          <button data-testid="close-outcome" onClick={() => { closeOutcome(); if (outcome.captured && setTab) setTab("prison"); }} className="btn-primary" style={{ marginTop: 20, width: "100%", padding: 12 }}>CONTINUE</button>
        </div>}
      </div>}
    </div>
  );
}
