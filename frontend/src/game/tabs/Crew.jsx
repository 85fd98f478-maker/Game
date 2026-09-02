import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { CREW_IMG } from "../images";

function Face({ id, color, size = 56 }) {
  const url = CREW_IMG[id];
  return (
    <div
      style={{
        width: size, height: size, flexShrink: 0, border: `1px solid ${color}66`,
        overflow: "hidden", background: "#050508",
        backgroundImage: url ? `url("${url}")` : undefined,
        backgroundSize: "cover", backgroundPosition: "center top",
        boxShadow: `0 0 10px ${color}33`,
      }}
    />
  );
}

export default function Crew() {
  const { user, catalog, refresh } = useAuth();
  if (!catalog) return null;

  const specColor = (s) => catalog.specializations.find(x => x.id === s)?.color || "#94a3b8";

  const hire = async (npc) => {
    try { await api.post("/player/hire-crew", { npc_id: npc.id }); await refresh(); toast.success(`${npc.name} joined your crew.`); }
    catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
  };

  // Rotating recruitment window: a subset that shifts over time so the
  // available recruits are not always the same (variety of rotations).
  const pool = catalog.npcs.filter(n => !user.hired_crew.includes(n.id));
  const WINDOW = 5;
  const PERIOD_MS = 1000 * 60 * 60 * 3; // rotates every 3h
  const rot = Math.floor(Date.now() / PERIOD_MS);
  const start = pool.length ? (rot * WINDOW) % pool.length : 0;
  const available = pool.length <= WINDOW
    ? pool
    : Array.from({ length: WINDOW }, (_, i) => pool[(start + i) % pool.length]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 className="font-display" style={{ fontSize: 24, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>CREW</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Build a balanced team. Specializations stack. A diverse crew survives more heists.</div>
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>YOUR ROSTER ({user.hired_crew.length})</div>
        {user.hired_crew.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No crew members yet. Recruit below.</div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {user.hired_crew.map(id => {
              const n = catalog.npcs.find(x => x.id === id); if (!n) return null;
              const c = specColor(n.spec);
              return (
                <div key={id} data-testid={`roster-${id}`} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, border: `1px solid ${c}55` }}>
                  <Face id={id} color={c} />
                  <div style={{ minWidth: 0 }}>
                    <div className="font-display" style={{ color: "#fff", fontSize: 16 }}>{n.name.toUpperCase()}</div>
                    <div className="label-caps" style={{ color: c }}>{n.spec}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>SKILL {n.skill} · CUT {n.cut}%</div>
                  </div>
                </div>
              );
            })}
          </div>}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div className="label-caps neon-pink">RECRUITMENT POOL</div>
          <div className="label-caps" style={{ color: "#64748B", fontSize: 9, display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={11} /> ROTATING ROSTER · REFRESHES PERIODICALLY
          </div>
        </div>
        {available.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>Everyone available has been recruited. Check back after the next rotation.</div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
            {available.map(n => {
              const c = specColor(n.spec);
              return (
                <div key={n.id} className="card-glow" style={{ padding: 16, borderColor: `${c}44` }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                    <Face id={n.id} color={c} size={60} />
                    <div style={{ minWidth: 0 }}>
                      <div className="font-display" style={{ color: "#fff", fontSize: 16 }}>{n.name.toUpperCase()}</div>
                      <div className="label-caps" style={{ color: c }}>{n.spec}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0" }}>SKILL {n.skill} · CUT {n.cut}%</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="font-display neon-gold">{fmtMoney(n.hire_cost)}</div>
                    <button data-testid={`hire-${n.id}`} onClick={() => hire(n)} disabled={user.money < n.hire_cost} className="btn-primary" style={{ padding: "6px 12px", fontSize: 11 }}>HIRE</button>
                  </div>
                </div>
              );
            })}
          </div>}
      </div>
    </div>
  );
}
