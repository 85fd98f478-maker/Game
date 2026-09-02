import { useAuth } from "../../AuthContext";
import { User, Ghost, Skull, Wrench, Crown, EyeOff } from "lucide-react";
import { characterArt } from "../artwork";

const AVATAR_ICON = { av_1: User, av_2: Ghost, av_3: Skull, av_4: Wrench, av_5: Crown, av_6: EyeOff };

export default function Character() {
  const { user, catalog } = useAuth();
  const spec = catalog?.specializations.find(s => s.id === user.specialization);
  const Icon = AVATAR_ICON[user.avatar_id] || User;
  const xpMax = 1000 + (user.level - 1) * 500;
  const tiers = [
    { name: "Street Thug", range: "1-10", color: "#64748B" },
    { name: "Enforcer", range: "11-20", color: "#38BDF8" },
    { name: "Operative", range: "21-30", color: "#A855F7" },
    { name: "Kingpin", range: "31-40", color: "#F59E0B" },
    { name: "Legend", range: "41+", color: "#EC4899" },
  ];
  const currentTier = user.level <= 10 ? 0 : user.level <= 20 ? 1 : user.level <= 30 ? 2 : user.level <= 40 ? 3 : 4;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="hologram-border card-glow" style={{ padding: 32, display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "center" }} data-testid="character-panel">
        <div style={{ width: 200, height: 220, border: `2px solid ${spec?.color}`, boxShadow: `0 0 30px ${spec?.color}44`, position: "relative", overflow: "hidden", ...characterArt(user.avatar_id) }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 55%, rgba(3,3,8,0.6) 100%)` }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${spec?.color}18 0%, transparent 60%)` }} />
        </div>
        <div>
          <div className="label-caps neon-cyan">OPERATOR PROFILE</div>
          <h1 className="font-display" style={{ fontSize: 40, margin: "4px 0", color: "#fff", letterSpacing: "0.1em" }}>{user.username.toUpperCase()}</h1>
          <div className="font-display" style={{ fontSize: 16, color: spec?.color, fontWeight: 800, letterSpacing: "0.15em" }}>{spec?.name.toUpperCase()}</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6, maxWidth: 500 }}>{spec?.desc}</div>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
            <div><div className="label-caps">Level</div><div className="font-display" style={{ fontSize: 22, color: "#fff" }}>{user.level}</div></div>
            <div><div className="label-caps">XP</div><div className="font-display neon-cyan" style={{ fontSize: 18 }}>{user.xp}/{xpMax}</div></div>
            <div><div className="label-caps">Reputation</div><div className="font-display neon-purple" style={{ fontSize: 22 }}>{user.reputation}</div></div>
            <div><div className="label-caps">Heat</div><div className="font-display neon-red" style={{ fontSize: 22 }}>{user.heat}%</div></div>
          </div>
        </div>
      </div>

      <div className="card-glow" style={{ padding: 22 }}>
        <div className="label-caps neon-pink" style={{ marginBottom: 14 }}>PROGRESSION TIERS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          {tiers.map((t, i) => (
            <div key={t.name} style={{ padding: 16, border: `1px solid ${currentTier === i ? t.color : "#1a2436"}`, background: currentTier === i ? `${t.color}12` : "transparent", boxShadow: currentTier === i ? `0 0 18px ${t.color}44` : "none" }}>
              <div className="font-display" style={{ fontSize: 15, color: t.color, fontWeight: 800 }}>{t.name.toUpperCase()}</div>
              <div style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>LVL {t.range}</div>
              {currentTier === i && <div style={{ marginTop: 8, fontSize: 10, color: "#fff", letterSpacing: "0.15em" }}>◆ CURRENT</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
