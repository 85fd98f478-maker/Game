import { useAuth } from "../AuthContext";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Bell, Mail, Settings, Power, DollarSign, Landmark, Flame, Crown, Heart, Zap, User as UserIcon, Menu } from "lucide-react";
import { characterArt } from "./artwork";

function CornerFrame({ color }) {
  const s = { position: "absolute", width: 10, height: 10, borderColor: color };
  return (
    <>
      <span style={{ ...s, top: -2, left: -2, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <span style={{ ...s, top: -2, right: -2, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      <span style={{ ...s, bottom: -2, left: -2, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <span style={{ ...s, bottom: -2, right: -2, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
    </>
  );
}

function StatBlock({ Icon, iconColor, label, value, valueColor, testid }) {
  return (
    <div data-testid={testid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", background: "#08080f", border: "1px solid #14141f", minWidth: 0 }}>
      <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: `${iconColor}18`, border: `1px solid ${iconColor}55` }}>
        <Icon size={16} color={iconColor} style={{ filter: `drop-shadow(0 0 4px ${iconColor}aa)` }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="label-caps" style={{ color: iconColor, fontSize: 9, letterSpacing: "0.25em" }}>{label}</div>
        <div className="font-display" style={{ fontSize: 18, color: valueColor, fontWeight: 800, letterSpacing: "0.02em", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      </div>
    </div>
  );
}

function IconBtn({ Icon, badge, onClick, color = "#94a3b8", testid }) {
  return (
    <button data-testid={testid} onClick={onClick} style={{ position: "relative", width: 40, height: 40, border: "1px solid #14141f", background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center", color, transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = color} onMouseLeave={e => e.currentTarget.style.borderColor = "#14141f"}>
      <Icon size={16} />
      {badge && <span style={{ position: "absolute", top: 4, right: 4, minWidth: 12, height: 12, background: "#EF4444", borderRadius: 6, boxShadow: "0 0 6px #EF4444", fontSize: 8, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", fontWeight: 800 }}>{typeof badge === "number" ? badge : ""}</span>}
    </button>
  );
}

const RANKS = [
  { max: 4, title: "Rookie", color: "#94a3b8" },
  { max: 9, title: "Hustler", color: "#38BDF8" },
  { max: 14, title: "Enforcer", color: "#10B981" },
  { max: 19, title: "Operator", color: "#A855F7" },
  { max: 24, title: "Shot Caller", color: "#F59E0B" },
  { max: 29, title: "Underboss", color: "#EC4899" },
  { max: 999, title: "Kingpin", color: "#EF4444" },
];

export default function HUD({ toggleSidebar, showMenu, onSettings, onOpenSocial }) {
  const { user, catalog, logout } = useAuth();
  const [unread, setUnread] = useState({ notif: 0, msg: 0 });
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [{ data: n }, { data: m }] = await Promise.all([api.get("/notifications"), api.get("/messages")]);
        if (alive) setUnread({ notif: n.unread || 0, msg: m.unread || 0 });
      } catch {}
    };
    poll();
    const t = setInterval(poll, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const spec = catalog?.specializations.find(s => s.id === user.specialization);
  const xpMax = 1000 + (user.level - 1) * 500;
  const xpPct = Math.min(100, (user.xp / xpMax) * 100);
  const heatSegs = 20;
  const heatFilled = Math.round((user.heat / 100) * heatSegs);
  const specColor = spec?.color || "#EC4899";
  const rank = RANKS.find(r => user.level <= r.max) || RANKS[RANKS.length - 1];

  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, background: "#030307", borderBottom: "1px solid #14141f", height: 96, display: "grid", gridTemplateColumns: "270px 1fr auto", alignItems: "center", gap: 14, padding: "0 18px" }} data-testid="hud">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }} data-testid="hud-user">
        {showMenu && <button data-testid="menu-btn" onClick={toggleSidebar} style={{ width: 40, height: 40, border: "1px solid #14141f", background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center", color: "#EC4899" }}><Menu size={18} /></button>}
        <div style={{ position: "relative", width: 62, height: 62, border: `1px solid ${specColor}55`, flexShrink: 0 }} data-testid="hud-avatar">
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...characterArt(user.avatar_id) }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${specColor}22 0%, transparent 70%)` }} />
          <CornerFrame color={specColor} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 20, color: "#fff", letterSpacing: "0.08em", fontWeight: 900, lineHeight: 1, textShadow: `0 0 10px ${specColor}66`, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username.toUpperCase()}</div>
          <div data-testid="hud-rank" className="label-caps" style={{ display: "inline-block", marginTop: 5, fontSize: 9, color: rank.color, letterSpacing: "0.24em", fontWeight: 800, padding: "2px 8px", border: `1px solid ${rank.color}55`, background: `${rank.color}14`, textShadow: `0 0 8px ${rank.color}88` }}>{rank.title.toUpperCase()}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <span className="label-caps" style={{ fontSize: 10, color: specColor, letterSpacing: "0.28em", fontWeight: 800 }}>LEVEL {user.level}</span>
            <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em" }}>{user.xp.toLocaleString()} / {xpMax.toLocaleString()} XP</span>
          </div>
          <div style={{ marginTop: 5, width: 200, height: 4, background: "#0a0a12", overflow: "hidden" }}>
            <div style={{ width: `${xpPct}%`, height: "100%", background: `linear-gradient(90deg, ${specColor} 0%, #A855F7 100%)`, boxShadow: `0 0 6px ${specColor}` }} />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <div data-testid="hud-health" style={{ minWidth: 96 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Heart size={11} color="#EF4444" /><span className="label-caps" style={{ fontSize: 8, color: "#EF4444" }}>HP {user.health}/{user.health_max}</span></div>
              <div style={{ marginTop: 3, width: 90, height: 4, background: "#0a0a12" }}><div style={{ width: `${(user.health / (user.health_max || 100)) * 100}%`, height: "100%", background: "#EF4444", boxShadow: "0 0 5px #EF4444" }} /></div>
            </div>
            <div data-testid="hud-stamina" style={{ minWidth: 96 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Zap size={11} color="#38BDF8" /><span className="label-caps" style={{ fontSize: 8, color: "#38BDF8" }}>STA {user.stamina}/{user.stamina_max}</span></div>
              <div style={{ marginTop: 3, width: 90, height: 4, background: "#0a0a12" }}><div style={{ width: `${(user.stamina / (user.stamina_max || 100)) * 100}%`, height: "100%", background: "#38BDF8", boxShadow: "0 0 5px #38BDF8" }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr", gap: 10 }}>
        <StatBlock testid="hud-cash" Icon={DollarSign} iconColor="#10B981" label="CASH" value={`$ ${user.money.toLocaleString()}`} valueColor="#10B981" />
        <div data-testid="hud-heat" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", background: "#08080f", border: "1px solid #14141f", minWidth: 0 }}>
          <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <Flame size={16} color="#EF4444" style={{ filter: "drop-shadow(0 0 4px #EF4444aa)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label-caps" style={{ color: "#EF4444", fontSize: 9, letterSpacing: "0.25em" }}>HEAT</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
              <div style={{ display: "flex", gap: 2, flex: 1 }}>
                {Array.from({ length: heatSegs }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 8, background: i < heatFilled ? (i < 8 ? "#F59E0B" : i < 15 ? "#EF4444" : "#7f1d1d") : "#1a1a26", boxShadow: i < heatFilled ? "0 0 3px #EF4444" : "none" }} />
                ))}
              </div>
              <div className="font-display" style={{ fontSize: 12, color: "#fff", fontWeight: 800, whiteSpace: "nowrap" }}>{user.heat} / 100</div>
            </div>
          </div>
        </div>
        <StatBlock testid="hud-rep" Icon={Crown} iconColor="#A855F7" label="REPUTATION" value={user.reputation.toLocaleString()} valueColor="#fff" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <IconBtn testid="hud-bell" Icon={Bell} badge={unread.notif > 0 ? unread.notif : false} onClick={() => onOpenSocial && onOpenSocial("notifications")} />
        <IconBtn testid="hud-mail" Icon={Mail} badge={unread.msg > 0 ? unread.msg : false} onClick={() => onOpenSocial && onOpenSocial("messages")} />
        <IconBtn testid="hud-settings" Icon={Settings} onClick={onSettings} />
        <IconBtn testid="hud-logout" Icon={Power} onClick={logout} color="#EF4444" />
      </div>
    </header>
  );
}
