import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Briefcase, Crosshair, Car, Users, Target, Home as HomeIcon, Building2, Map as MapIcon, Trophy, User as UserIcon, Skull, Zap, Wrench, Activity, Shield, Sparkles, Clock, DollarSign, TrendingUp, Flame, CheckCircle2, Circle } from "lucide-react";
import { HERO_BG, CARD_BG, FEATURED_ART, PORTRAIT_BG } from "../images";
import { characterArt } from "../artwork";
import { WEAPON_ITEM_IMG, VEHICLE_ITEM_IMG } from "../images";

function BigCard({ id, title, color, image, desc, onClick, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} className="fade-in-up" style={{ padding: 0, textAlign: "left", overflow: "hidden", border: "1px solid #14141f", background: "#08080f", transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}88`; e.currentTarget.style.boxShadow = `0 0 20px ${color}22`; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#14141f"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "relative", height: 145, overflow: "hidden" }}>
        <img src={image} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 0%, rgba(8,8,15,0.5) 60%, #08080f 100%)` }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${color}25 0%, transparent 55%)` }} />
        <div style={{ position: "absolute", top: 14, left: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div className="font-display" style={{ fontSize: 18, color, fontWeight: 800, letterSpacing: "0.14em", filter: `drop-shadow(0 0 8px ${color}88)` }}>{title}</div>
          <div style={{ height: 1, width: 30, background: color, boxShadow: `0 0 6px ${color}`, marginTop: 2 }} />
        </div>
      </div>
      <div style={{ padding: "12px 16px 14px", background: "#050508" }}>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </button>
  );
}

function FeaturedCard({ title, color, children, testid }) {
  return (
    <div className="fade-in-up" style={{ background: "#08080f", border: "1px solid #14141f", padding: 18, position: "relative", overflow: "hidden" }} data-testid={testid}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div className="font-display" style={{ fontSize: 13, color, fontWeight: 800, letterSpacing: "0.2em", filter: `drop-shadow(0 0 6px ${color}88)` }}>{title}</div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }} />
      </div>
      {children}
    </div>
  );
}

function StatBar({ label, value, color = "#EC4899", segments = 10 }) {
  const filled = Math.round((value / 100) * segments);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div className="label-caps" style={{ fontSize: 9, width: 78, color: "#94a3b8" }}>{label}</div>
      <div style={{ display: "flex", gap: 2, flex: 1 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 8, background: i < filled ? color : "#1a1a26", boxShadow: i < filled ? `0 0 4px ${color}88` : "none" }} />
        ))}
      </div>
    </div>
  );
}

function RightBlock({ title, color, children, testid }) {
  return (
    <div style={{ background: "#08080f", border: "1px solid #14141f", padding: 16, marginBottom: 14 }} data-testid={testid}>
      <div className="font-display" style={{ fontSize: 11, color, fontWeight: 800, letterSpacing: "0.2em", marginBottom: 12, filter: `drop-shadow(0 0 6px ${color}88)` }}>{title}</div>
      {children}
    </div>
  );
}

function EmpireRow({ Icon, label, value, max }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #14141f", fontSize: 11 }}>
      <Icon size={13} color="#94a3b8" />
      <span className="label-caps" style={{ flex: 1, color: "#94a3b8" }}>{label}</span>
      <span className="font-display" style={{ color: "#fff", fontWeight: 700 }}>{value} <span style={{ color: "#475569" }}>/ {max}</span></span>
    </div>
  );
}

function EffectRow({ Icon, iconColor, label, sub, time }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #14141f", fontSize: 11 }}>
      <Icon size={15} color={iconColor} style={{ filter: `drop-shadow(0 0 4px ${iconColor}88)` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: iconColor, fontWeight: 700, fontSize: 11 }}>{label}</div>
        <div style={{ color: "#64748B", fontSize: 10 }}>{sub}</div>
      </div>
      <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{time}</div>
    </div>
  );
}

function timeAgo(iso) {
  const d = new Date(iso); const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function DailyContract({ setTab }) {
  const [dc, setDc] = useState(null);
  const [left, setLeft] = useState(0);
  useEffect(() => { (async () => { try { const { data } = await api.get("/daily-contract"); setDc(data); setLeft(data.seconds_to_rotation); } catch {} })(); }, []);
  useEffect(() => { const t = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000); return () => clearInterval(t); }, []);
  if (!dc) return null;
  const h = dc.heist;
  const fmtT = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  const statusColor = dc.status === "COMPLETED" ? "#10B981" : dc.status === "COOLDOWN" ? "#F59E0B" : "#00F0FF";
  const statusText = dc.completed ? "COMPLETED" : dc.cooldown_remaining > 0 ? "FAILED — AVAILABLE AFTER COOLDOWN" : "AVAILABLE";
  const openIt = () => { window.__openHeist = h.id; setTab("heists"); };
  return (
    <div className="fade-in-up" data-testid="daily-contract-card" style={{ border: "1px solid rgba(245,158,11,0.4)", background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(8,8,15,0.6))", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="font-display" style={{ color: "#F59E0B", fontSize: 13, letterSpacing: "0.2em", fontWeight: 800 }}>◆ DAILY CONTRACT</div>
        <div className="label-caps" style={{ fontSize: 9, color: "#64748B" }}>ROTATES IN <span style={{ color: "#F59E0B" }}>{fmtT(left)}</span></div>
      </div>
      <div className="font-display" style={{ color: "#fff", fontSize: 22, margin: "6px 0" }}>{h.name.toUpperCase()}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, margin: "10px 0" }}>
        <div><div className="label-caps" style={{ fontSize: 8 }}>ZONE</div><div style={{ color: "#cbd5e1", fontSize: 12, textTransform: "capitalize" }}>{h.district.replace(/_/g, " ")}</div></div>
        <div><div className="label-caps" style={{ fontSize: 8 }}>DIFFICULTY</div><div style={{ color: "#cbd5e1", fontSize: 12 }}>{h.difficulty}/10</div></div>
        <div><div className="label-caps" style={{ fontSize: 8 }}>REQ LEVEL</div><div style={{ color: "#cbd5e1", fontSize: 12 }}>{h.min_level}</div></div>
        <div><div className="label-caps" style={{ fontSize: 8 }}>STAMINA</div><div style={{ color: "#38BDF8", fontSize: 12 }}>{h.stamina_cost}</div></div>
        <div><div className="label-caps" style={{ fontSize: 8 }}>CREW</div><div style={{ color: "#cbd5e1", fontSize: 12 }}>{h.min_crew}-{h.crew_max}</div></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Normal: {fmtMoney(dc.normal_reward_min)}–{fmtMoney(dc.normal_reward_max)}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: "#F59E0B" }}>+30% →</span> <span className="font-display neon-gold">{fmtMoney(dc.daily_reward_min)}–{fmtMoney(dc.daily_reward_max)}</span></div>
        </div>
        <div className="label-caps" data-testid="daily-status" style={{ fontSize: 9, color: statusColor, border: `1px solid ${statusColor}55`, padding: "4px 8px" }}>{statusText}</div>
      </div>
      <button data-testid="daily-start" onClick={openIt} disabled={dc.completed} className="btn-primary" style={{ width: "100%", padding: 11, marginTop: 12, fontSize: 12, opacity: dc.completed ? 0.5 : 1 }}>{dc.completed ? "ALREADY COMPLETED TODAY" : "▶ START CONTRACT HEIST"}</button>
    </div>
  );
}


export default function HomeTab({ setTab }) {
  const { user, catalog, refresh } = useAuth();
  const spec = catalog?.specializations.find(s => s.id === user.specialization);
  const nextOp = (catalog?.heists || []).filter(h => user.level >= h.min_level).slice(-1)[0];
  const [ops, setOps] = useState([]);
  const [raids, setRaids] = useState([]);
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/heist/history"); setOps(data); } catch {}
      try { const { data } = await api.get("/pvp/history"); setRaids(data); } catch {}
      try { const { data } = await api.get("/missions/daily"); setMissions(data); } catch {}
    })();
  }, []);

  const claimMission = async (id) => {
    try {
      const { data } = await api.post("/missions/claim", { mission_id: id });
      toast.success(`Mission claimed! +${fmtMoney(data.reward.cash)} · +${data.reward.xp}XP · +${data.reward.rep}REP`);
      await refresh();
      const { data: fresh } = await api.get("/missions/daily"); setMissions(fresh);
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
  };

  // Equipped weapon + active vehicle (from user.equipped)
  const eqWid = user.equipped?.primary || user.equipped?.secondary || user.equipped?.melee || null;
  const featuredWeapon = eqWid ? (catalog?.weapons || []).find(w => w.id === eqWid) : null;
  const activeVehId = user.equipped?.vehicle || "starter";
  const featuredVehicle = (catalog?.vehicles || []).find(v => v.id === activeVehId) || null;
  const dailyContract = nextOp;
  const totalWeapons = user.weapons.reduce((a, w) => a + w.qty, 0);
  const totalArmor = (user.armors || []).reduce((a, x) => a + x.qty, 0);
  const dailyIncome = (user.businesses || []).reduce((acc, b) => { const m = (catalog?.businesses || []).find(x => x.id === b.id); return acc + (m?.daily_income || 0); }, 0);

  // Skill points (visual only, derived from specs and level)
  const skills = [
    { Icon: Target, val: Math.min(50, 5 + user.level * 1.2 | 0), color: "#EF4444" },
    { Icon: Activity, val: Math.min(50, 3 + user.level | 0), color: "#F59E0B" },
    { Icon: Sparkles, val: Math.min(50, 2 + user.level * 1.5 | 0), color: "#A855F7" },
    { Icon: Shield, val: Math.min(50, 1 + user.level | 0), color: "#38BDF8" },
    { Icon: Wrench, val: Math.min(50, 4 + user.level * 1.3 | 0), color: "#EC4899" },
  ];

  return (
    <div className="dashboard-grid" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="fade-in-up" style={{ position: "relative", overflow: "hidden", minHeight: 260, border: "1px solid #14141f", background: "#050508" }}>
          <img src={HERO_BG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.72 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(3,3,8,0.35) 55%, #050508 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(3,3,8,0.7) 0%, transparent 45%)" }} />
        </div>

        <DailyContract setTab={setTab} />

        <div className="cards-5" style={{ display: "grid", gap: 12 }}>
          <BigCard testid="home-card-inventory" title="INVENTORY" color="#A855F7" image={CARD_BG.inventory} desc="Manage your items, ammo, gear and more." onClick={() => setTab("inventory")} />
          <BigCard testid="home-card-arsenal" title="ARSENAL" color="#EF4444" image={CARD_BG.arsenal} desc="Buy, upgrade and customize weapons." onClick={() => setTab("arsenal")} />
          <BigCard testid="home-card-garage" title="GARAGE" color="#38BDF8" image={CARD_BG.garage} desc="Your vehicles and vehicle upgrades." onClick={() => setTab("garage")} />
          <BigCard testid="home-card-crew" title="CREW" color="#F59E0B" image={CARD_BG.crew} desc="Manage your crew and assignments." onClick={() => setTab("crew")} />
          <BigCard testid="home-card-heists" title="HEISTS" color="#EC4899" image={CARD_BG.heists} desc="Plan, prepare and run operations." onClick={() => setTab("heists")} />
        </div>

        <div className="cards-4" style={{ display: "grid", gap: 12 }}>
          <BigCard testid="home-card-properties" title="PROPERTIES" color="#EC4899" image={CARD_BG.properties} desc="Buy, upgrade and manage your properties." onClick={() => setTab("assets")} />
          <BigCard testid="home-card-businesses" title="BUSINESSES" color="#F59E0B" image={CARD_BG.businesses} desc="Generate passive income and expand your empire." onClick={() => setTab("businesses")} />
          <BigCard testid="home-card-map" title="CITY MAP" color="#10B981" image={CARD_BG.map} desc="Explore the city and plan your moves." onClick={() => setTab("map")} />
          <BigCard testid="home-card-progress" title="PROGRESS" color="#A855F7" image={CARD_BG.progress} desc="Track your progress and unlock rewards." onClick={() => setTab("progress")} />
        </div>

        <div className="cards-3" style={{ display: "grid", gap: 12 }}>
          <FeaturedCard title="EQUIPPED WEAPON" color="#EC4899" testid="featured-weapon">
            <div style={{ height: 130, marginLeft: -18, marginRight: -18, marginTop: -6, marginBottom: 12, position: "relative", overflow: "hidden", background: "#000" }}>
              <img src={featuredWeapon ? (WEAPON_ITEM_IMG[featuredWeapon.id] || FEATURED_ART.weapon) : FEATURED_ART.weapon} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: featuredWeapon ? 1 : 0.35 }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, #08080f 100%)" }} />
            </div>
            {featuredWeapon ? <>
              <div className="font-display" style={{ fontSize: 20, color: "#fff", fontWeight: 800, letterSpacing: "0.06em" }}>{featuredWeapon.name.toUpperCase()}</div>
              <div className="label-caps" style={{ fontSize: 9, color: "#EC4899", marginTop: 2 }}>{featuredWeapon.cat.toUpperCase()}</div>
              <div style={{ marginTop: 14 }}>
                <StatBar label="DAMAGE" value={featuredWeapon.damage / 1.5} color="#EF4444" />
                <StatBar label="ACCURACY" value={featuredWeapon.accuracy} color="#EF4444" />
                <StatBar label="RELIABILITY" value={featuredWeapon.reliability} color="#EF4444" />
              </div>
            </> : <>
              <div className="font-display" style={{ fontSize: 18, color: "#fff", fontWeight: 800, letterSpacing: "0.06em" }}>NONE EQUIPPED</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Buy a weapon in the Arsenal, then equip it from your Inventory.</div>
            </>}
          </FeaturedCard>

          {featuredVehicle && <FeaturedCard title="ACTIVE VEHICLE" color="#38BDF8" testid="featured-vehicle">
            <div style={{ height: 130, marginLeft: -18, marginRight: -18, marginTop: -6, marginBottom: 12, position: "relative", overflow: "hidden", background: "#000" }}>
              <img src={VEHICLE_ITEM_IMG[featuredVehicle.id] || FEATURED_ART.vehicle} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, #08080f 100%)" }} />
            </div>
            <div className="font-display" style={{ fontSize: 20, color: "#fff", fontWeight: 800, letterSpacing: "0.06em" }}>{featuredVehicle.name.toUpperCase()}</div>
            <div className="label-caps" style={{ fontSize: 9, color: "#38BDF8", marginTop: 2 }}>{featuredVehicle.cat.toUpperCase()}</div>
            <div style={{ marginTop: 14 }}>
              <StatBar label="SPEED" value={featuredVehicle.speed} color="#38BDF8" />
              <StatBar label="HANDLING" value={featuredVehicle.handling} color="#38BDF8" />
              <StatBar label="ARMOR" value={featuredVehicle.armor} color="#38BDF8" />
              <StatBar label="ESCAPE" value={featuredVehicle.escape} color="#38BDF8" />
            </div>
          </FeaturedCard>}

        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#08080f", border: "1px solid #14141f", padding: 16, marginBottom: 14, position: "relative", overflow: "hidden" }} data-testid="stats-panel">
          <div style={{ height: 200, marginBottom: 14, position: "relative", overflow: "hidden", border: `1px solid ${spec?.color || "#EC4899"}33`, ...characterArt(user.avatar_id) }} data-testid="dashboard-avatar">
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 40%, rgba(5,5,8,0.85) 100%)` }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${spec?.color || "#EC4899"}22 0%, transparent 60%)` }} />
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <StatRow label="HEALTH" value={user.health} max={user.health_max || 100} color="#EF4444" />
            <StatRow label="STAMINA" value={user.stamina} max={user.stamina_max || 100} color="#38BDF8" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 14, paddingTop: 14, borderTop: "1px solid #14141f" }}>
            {skills.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <s.Icon size={16} color={s.color} style={{ filter: `drop-shadow(0 0 4px ${s.color}88)` }} />
                <div className="font-display" style={{ fontSize: 12, color: s.color, fontWeight: 800, marginTop: 3 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        <RightBlock title="DAILY MISSIONS" color="#F59E0B" testid="daily-missions">
          {missions.length === 0 && <div style={{ color: "#64748B", fontSize: 11 }}>Loading missions...</div>}
          {missions.map(m => (
            <div key={m.id} data-testid={`mission-${m.id}`} style={{ padding: "10px 0", borderBottom: "1px solid #14141f" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {m.claimed ? <CheckCircle2 size={13} color="#10B981" /> : m.complete ? <CheckCircle2 size={13} color="#F59E0B" /> : <Circle size={13} color="#64748B" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: m.claimed ? "#64748B" : "#fff", fontWeight: 700, textDecoration: m.claimed ? "line-through" : "none" }}>{m.title}</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>{m.desc}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 4, background: "#0a0a12", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%`, height: "100%", background: m.claimed ? "#10B981" : "#F59E0B" }} />
                </div>
                <span style={{ fontSize: 9, color: "#94a3b8", whiteSpace: "nowrap" }}>{m.progress}/{m.target}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 9, color: "#10B981" }}>+{fmtMoney(m.reward_cash)} · +{m.reward_xp}XP</span>
                {m.complete && <button data-testid={`claim-${m.id}`} onClick={() => claimMission(m.id)} className="btn-primary" style={{ padding: "4px 10px", fontSize: 9 }}>CLAIM</button>}
              </div>
            </div>
          ))}
        </RightBlock>

        <RightBlock title="EMPIRE OVERVIEW" color="#00F0FF" testid="empire-overview">
          <EmpireRow Icon={HomeIcon} label="PROPERTIES" value={(user.properties || []).length} max={catalog?.properties.length || 5} />
          <EmpireRow Icon={Building2} label="BUSINESSES" value={(user.businesses || []).length} max={catalog?.businesses.length || 5} />
          <EmpireRow Icon={Users} label="CREW MEMBERS" value={user.hired_crew.length} max={catalog?.npcs.length || 10} />
          <EmpireRow Icon={Car} label="VEHICLES" value={user.vehicles.length} max={catalog?.vehicles.length || 13} />
          <EmpireRow Icon={Crosshair} label="WEAPONS" value={totalWeapons + totalArmor} max={50} />
        </RightBlock>

        <RightBlock title="ACTIVE EFFECTS" color="#10B981" testid="active-effects">
          {dailyIncome > 0 && <EffectRow Icon={TrendingUp} iconColor="#10B981" label="BUSINESS INCOME" sub={`+${fmtMoney(dailyIncome)}/day`} time="live" />}
          {user.hired_crew.length >= 3 && <EffectRow Icon={Users} iconColor="#F59E0B" label="CREW BONUS" sub="+diverse team edge" time="active" />}
          {user.heat < 20 && <EffectRow Icon={Flame} iconColor="#00F0FF" label="LOW HEAT" sub="-10% Heat Gain" time="active" />}
          {dailyIncome === 0 && user.hired_crew.length < 3 && user.heat >= 20 && <div style={{ color: "#64748B", fontSize: 11 }}>No active effects.</div>}
        </RightBlock>

        <RightBlock title="UPCOMING EVENTS" color="#F59E0B" testid="upcoming-events">
          {ops.slice(0, 2).map((o, i) => <EffectRow key={i} Icon={Target} iconColor="#EC4899" label={`HEIST · ${o.outcome}`} sub={o.heist_name} time={timeAgo(o.timestamp) + " ago"} />)}
          {raids.slice(0, 2).map((r, i) => <EffectRow key={i} Icon={Skull} iconColor="#EF4444" label={r.attacker === user.username ? "RAID SENT" : "RAID RECEIVED"} sub={r.attacker === user.username ? r.defender : r.attacker} time={timeAgo(r.timestamp) + " ago"} />)}
          {ops.length === 0 && raids.length === 0 && <div style={{ color: "#64748B", fontSize: 11 }}>No recent activity.</div>}
        </RightBlock>
      </div>
    </div>
  );
}

function StatRow({ label, value, max, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="label-caps" style={{ fontSize: 9 }}>{label}</span>
        <span className="font-display" style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{value} / {max}</span>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < Math.round((value / max) * 10);
          return <div key={i} style={{ flex: 1, height: 8, background: filled ? color : "#1a1a26", boxShadow: filled ? `0 0 4px ${color}88` : "none" }} />;
        })}
      </div>
    </div>
  );
}
