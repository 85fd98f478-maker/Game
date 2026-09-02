import { LayoutDashboard, User, Briefcase, Crosshair, Car, Users, Target, Home, Trophy, Swords, Map, ShoppingCart, Skull, Shield, Users2 } from "lucide-react";

const TABS = [
  { id: "home", label: "HOME", icon: LayoutDashboard },
  { id: "inventory", label: "INVENTORY", icon: Briefcase },
  { id: "arsenal", label: "ARSENAL", icon: Crosshair },
  { id: "garage", label: "GARAGE", icon: Car },
  { id: "crew", label: "CREW", icon: Users },
  { id: "heists", label: "HEISTS", icon: Target },
  { id: "market", label: "MARKET", icon: ShoppingCart },
  { id: "blackmarket", label: "BLACK MKT", icon: Skull },
  { id: "gang", label: "GANG", icon: Shield },
  { id: "social", label: "SOCIAL", icon: Users2 },
  { id: "map", label: "MAP", icon: Map },
  { id: "progress", label: "RANK", icon: Trophy },
  { id: "pvp", label: "PVP", icon: Swords },
];

export default function BottomNav({ tab, setTab }) {
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(3,3,8,0.96)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(168,85,247,0.25)", padding: "8px 10px", overflowX: "auto" }} data-testid="bottom-nav">
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-around", alignItems: "center", gap: 2, minWidth: "max-content" }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button data-testid={`nav-${t.id}`} key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 8px", borderTop: active ? "2px solid #00F0FF" : "2px solid transparent", color: active ? "#00F0FF" : "#64748B", textShadow: active ? "0 0 12px rgba(0,240,255,0.6)" : "none", minWidth: 56, transition: "all 0.2s" }}>
              <Icon size={18} strokeWidth={active ? 2.4 : 1.7} />
              <span className="font-display" style={{ fontSize: 8.5, letterSpacing: "0.15em", fontWeight: 700 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
