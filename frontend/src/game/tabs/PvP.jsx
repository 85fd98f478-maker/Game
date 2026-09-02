import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Swords, Shield } from "lucide-react";

export default function PvP() {
  const { user, catalog, refresh } = useAuth();
  const [targets, setTargets] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [crewSel, setCrewSel] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/pvp/targets"); setTargets(data); } catch {}
    try { const { data } = await api.get("/pvp/history"); setHistory(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  if (!catalog) return null;

  const raid = async () => {
    if (!selected) return;
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post("/pvp/raid", { target_username: selected.username, property_id: selected.property_id, crew_ids: crewSel });
      setResult(data); await refresh(); await load();
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  const specColor = (s) => catalog.specializations.find(x => x.id === s)?.color || "#94a3b8";

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div>
        <h2 className="font-display" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>PVP · GANG WARFARE</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Attack other operators' properties. High security = high loss for the attacker. Requires level 5+.</div>
      </div>

      {user.level < 5 && <div style={{ padding: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 13 }}>PvP raids unlock at level 5. Current: {user.level}</div>}

      {!selected && !result && <div>
        <div className="label-caps neon-red" style={{ marginBottom: 10 }}>AVAILABLE TARGETS</div>
        {targets.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No targets in the network yet. Come back later.</div> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
          {targets.map((t, i) => (
            <div key={i} className="card-glow" data-testid={`target-${i}`} style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="font-display" style={{ color: "#fff", fontSize: 15 }}>{t.username}</div>
                  <div className="label-caps" style={{ color: specColor(t.specialization) }}>{t.specialization} · LVL {t.level}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="label-caps"><Shield size={10} style={{ display: "inline" }} /> DEF</div>
                  <div className="font-display" style={{ color: t.security > 60 ? "#EF4444" : t.security > 30 ? "#F59E0B" : "#10B981", fontSize: 18 }}>{t.security}%</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>{t.property_name} · Tier {t.property_tier}</div>
              <div style={{ marginTop: 4, fontSize: 12 }}>Est. Loot: <span className="neon-gold font-display">{fmtMoney(t.estimated_loot)}</span></div>
              <button data-testid={`raid-btn-${i}`} onClick={() => setSelected(t)} disabled={user.level < 5} className="btn-primary" style={{ marginTop: 10, width: "100%", padding: 10, fontSize: 12 }}><Swords size={12} style={{ display: "inline", marginRight: 6 }} /> RAID</button>
            </div>
          ))}
        </div>}

        <div style={{ marginTop: 24 }}>
          <div className="label-caps neon-purple" style={{ marginBottom: 10 }}>RAID HISTORY</div>
          {history.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No raid history.</div> :
          <div style={{ display: "grid", gap: 4 }}>
            {history.slice(0, 10).map((r, i) => {
              const attacker = r.attacker === user.username;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10, padding: "8px 10px", border: "1px solid #1a2436", fontSize: 12 }}>
                  <span style={{ color: "#fff" }}>{attacker ? "You attacked" : "Attacked by"} <b>{attacker ? r.defender : r.attacker}</b></span>
                  <span style={{ color: "#94a3b8" }}>{new Date(r.timestamp).toLocaleString()}</span>
                  <span className="font-display" style={{ color: r.result === "RAID SUCCESSFUL" ? "#10B981" : "#EF4444", fontSize: 10, textAlign: "right" }}>{r.result}</span>
                </div>
              );
            })}
          </div>}
        </div>
      </div>}

      {selected && !result && <div className="hologram-border card-glow" style={{ padding: 24 }}>
        <button data-testid="raid-back" onClick={() => setSelected(null)} className="btn-outline" style={{ padding: "6px 12px", fontSize: 11, marginBottom: 16 }}>← BACK</button>
        <div className="label-caps neon-red">RAID BRIEFING</div>
        <h2 className="font-display" style={{ fontSize: 24, color: "#fff" }}>{selected.username} · {selected.property_name}</h2>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Defender security: <span className="font-display" style={{ color: selected.security > 60 ? "#EF4444" : "#F59E0B" }}>{selected.security}%</span> · Est. loot: <span className="neon-gold">{fmtMoney(selected.estimated_loot)}</span></div>

        <div className="label-caps" style={{ marginBottom: 8 }}>ASSAULT CREW (optional)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 20 }}>
          {user.hired_crew.length === 0 && <div style={{ color: "#64748B", fontSize: 12 }}>No crew hired.</div>}
          {user.hired_crew.map(cid => {
            const n = catalog.npcs.find(x => x.id === cid); if (!n) return null;
            const sel = crewSel.includes(cid);
            const c = specColor(n.spec);
            return (
              <button data-testid={`raid-crew-${cid}`} key={cid} onClick={() => setCrewSel(s => s.includes(cid) ? s.filter(x => x !== cid) : [...s, cid])} style={{ padding: 10, border: `1px solid ${sel ? c : "#1a2436"}`, background: sel ? `${c}15` : "transparent", textAlign: "left" }}>
                <div className="font-display" style={{ color: "#fff", fontSize: 12 }}>{n.name}</div>
                <div className="label-caps" style={{ color: c }}>{n.spec}</div>
              </button>
            );
          })}
        </div>
        <button data-testid="run-raid" onClick={raid} disabled={loading} className="btn-primary" style={{ width: "100%", padding: 14 }}>{loading ? "RAIDING..." : "▶ LAUNCH RAID"}</button>
      </div>}

      {result && <div className="hologram-border card-glow" style={{ padding: 26 }} data-testid="raid-result">
        <div className={`font-display ${result.result === "RAID SUCCESSFUL" ? "outcome-success" : "outcome-failed"}`} style={{ fontSize: 28, letterSpacing: "0.15em", textAlign: "center", fontWeight: 900 }}>{result.result}</div>
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>Success probability was {Math.round(result.success_prob * 100)}%</div>
        <div style={{ marginTop: 18, background: "#04050a", border: "1px solid #1a2436", padding: 16, display: "grid", gap: 6 }}>
          {result.events.map((e, i) => <div key={i} style={{ fontSize: 13, color: "#dbe4ee" }}>· {e}</div>)}
        </div>
        <button data-testid="raid-close" onClick={() => { setSelected(null); setResult(null); setCrewSel([]); }} className="btn-primary" style={{ marginTop: 18, width: "100%", padding: 12 }}>CONTINUE</button>
      </div>}
    </div>
  );
}
