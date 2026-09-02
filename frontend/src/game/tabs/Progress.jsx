import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtMoney } from "../../api";

function RankTable({ title, color, data, cols, myLabel }) {
  return (
    <div className="card-glow" style={{ padding: 22 }}>
      <div className="label-caps" style={{ color, marginBottom: 12 }}>{title}</div>
      {(!data || (data.top || []).length === 0) ? <div style={{ color: "#64748B", fontSize: 13 }}>Rankings populate as players progress.</div> :
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 70px 130px", gap: 10, padding: "6px 8px", borderBottom: "1px solid #1a2436" }} className="label-caps">
            <span>#</span><span>{cols[0]}</span><span>Level</span><span>Earnings</span>
          </div>
          {data.top.map((r, i) => (
            <div key={i} data-testid={`rank-${i}`} style={{ display: "grid", gridTemplateColumns: "50px 1fr 70px 130px", gap: 10, padding: "8px", background: r[myLabel] ? "rgba(0,240,255,0.08)" : "transparent", fontSize: 13 }}>
              <span className="font-display neon-gold">#{r.position}</span>
              <span style={{ color: "#fff" }}>{r.name || r.username}</span>
              <span className="font-display">{r.level}</span>
              <span className="neon-gold font-display">{fmtMoney(r.earnings)}</span>
            </div>
          ))}
          {data.me && <>
            <div style={{ textAlign: "center", color: "#64748B", fontSize: 11, padding: "4px 0" }}>· · ·</div>
            <div data-testid="rank-me" style={{ display: "grid", gridTemplateColumns: "50px 1fr 70px 130px", gap: 10, padding: "8px", background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.4)", fontSize: 13 }}>
              <span className="font-display neon-pink">#{data.me.position}</span>
              <span style={{ color: "#fff" }}>{data.me.name || data.me.username} (You)</span>
              <span className="font-display">{data.me.level}</span>
              <span className="neon-gold font-display">{fmtMoney(data.me.earnings)}</span>
            </div>
          </>}
        </div>}
    </div>
  );
}

export default function Progress() {
  const { user } = useAuth();
  const [players, setPlayers] = useState(null);
  const [gangs, setGangs] = useState(null);
  useEffect(() => { (async () => {
    try { const { data } = await api.get("/rankings"); data.top.forEach((r) => { r._me = r.username === user.username; }); setPlayers(data); } catch {}
    try { const { data } = await api.get("/rankings/gangs"); setGangs(data); } catch {}
  })(); }, [user.username]);

  const s = user.stats;
  const stats = [
    { label: "Level", value: user.level }, { label: "XP", value: user.xp },
    { label: "Rank", value: (() => { const r = ["Rookie","Hustler","Enforcer","Operator","Shot Caller","Underboss","Kingpin"]; return r[Math.min(r.length - 1, Math.floor((user.level) / 5))]; })() },
    { label: "Health", value: `${user.health}/${user.health_max}` }, { label: "Stamina", value: `${user.stamina}/${user.stamina_max}` },
    { label: "Heat", value: `${user.heat}% (${user.heat_level})` },
    { label: "Ops Completed", value: s.ops_completed }, { label: "Ops Failed", value: s.ops_failed },
    { label: "Total Earnings", value: fmtMoney(s.total_earnings) }, { label: "Total Spent", value: fmtMoney(s.total_spent) },
    { label: "Gang Heists", value: s.gang_heists || 0 }, { label: "Times Arrested", value: s.times_arrested || 0 },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="progress-tab">
      <div>
        <h2 className="font-display" style={{ fontSize: 24, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>PROGRESS</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Your standing in Neon City. Rankings are driven by total earnings across all activities.</div>
      </div>

      <div className="card-glow" style={{ padding: 22 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>YOUR STATS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
          {stats.map((x) => <div key={x.label} style={{ padding: 12, border: "1px solid #1a2436" }}><div className="label-caps">{x.label}</div><div className="font-display" style={{ fontSize: 18, color: "#fff", marginTop: 4 }}>{x.value}</div></div>)}
        </div>
      </div>

      <RankTable title="PLAYER RANKING · TOP 15" color="#EC4899" data={players} cols={["Player"]} myLabel="_me" />
      <RankTable title="GANG RANKING · TOP 15" color="#A855F7" data={gangs} cols={["Gang"]} myLabel="_me" />
    </div>
  );
}
