import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import HUD from "../game/HUD";
import Sidebar from "../game/Sidebar";
import Home from "../game/tabs/Home";
import Character from "../game/tabs/Character";
import Inventory from "../game/tabs/Inventory";
import Arsenal from "../game/tabs/Arsenal";
import Garage from "../game/tabs/Garage";
import Crew from "../game/tabs/Crew";
import Heists from "../game/tabs/Heists";
import MapView from "../game/tabs/MapView";
import Progress from "../game/tabs/Progress";
import Assets from "../game/tabs/Assets";
import Businesses from "../game/tabs/Businesses";
import PvP from "../game/tabs/PvP";
import Market from "../game/tabs/Market";
import BlackMarket from "../game/tabs/BlackMarket";
import Casino from "../game/tabs/Casino";
import Gang from "../game/tabs/Gang";
import Prison from "../game/tabs/Prison";
import Social from "../game/tabs/Social";
import BgManager from "../game/BgManager";
import { api } from "../api";
import { toast } from "sonner";
import { Menu } from "lucide-react";

export default function Game() {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Resolve offline raids on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/tick/offline-raids");
        if (data.events && data.events.length > 0) {
          const attacked = data.events.filter(e => e.type !== "defended");
          const defended = data.events.filter(e => e.type === "defended");
          if (attacked.length > 0) toast.error(`While you were away: ${attacked.length} raid${attacked.length > 1 ? "s" : ""} succeeded. Lost $${data.total_lost}.`, { duration: 6000 });
          if (defended.length > 0) toast.success(`${defended.length} raid${defended.length > 1 ? "s" : ""} repelled by your security.`, { duration: 5000 });
          await refresh();
        }
      } catch {}
    })();
  }, []); // eslint-disable-line

  if (!user) return null;

  const Tab = { home: Home, character: Character, inventory: Inventory, arsenal: Arsenal, garage: Garage, crew: Crew, heists: Heists, map: MapView, progress: Progress, assets: Assets, businesses: Businesses, pvp: PvP, market: Market, blackmarket: BlackMarket, casino: Casino, gang: Gang, prison: Prison, social: Social }[tab] || Home;

  const customBg = user.custom_bgs?.[tab];
  const bgUrl = customBg && customBg.startsWith("/") ? process.env.REACT_APP_BACKEND_URL + customBg : customBg;
  const bgStyle = bgUrl ? { backgroundImage: `url("${bgUrl}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", opacity: 0.4 } : {};

  return (
    <div style={{ minHeight: "100vh", background: "#020204", position: "relative" }}>
      <div className={`section-bg ${tab}`} style={bgStyle} />
      <HUD toggleSidebar={() => setSidebarOpen(o => !o)} showMenu={isMobile} onSettings={() => setBgOpen(true)} onOpenSocial={(sub) => { window.__socialSub = sub; setTab("social"); }} />
      <Sidebar tab={tab} setTab={setTab} open={sidebarOpen} setOpen={setSidebarOpen} />
      <main style={{ marginLeft: isMobile ? 0 : 240, paddingTop: 96, paddingBottom: isMobile ? 80 : 30, minHeight: "100vh", position: "relative" }} data-testid="game-main">
        {user.prison && tab !== "prison" && (
          <div onClick={() => setTab("prison")} data-testid="prison-banner" style={{ margin: "10px 14px 0", padding: 12, border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.08)", color: "#EF4444", fontFamily: "Orbitron", fontSize: 12, letterSpacing: "0.1em", cursor: "pointer" }}>
            🔒 YOU ARE IN PRISON — heists are locked. Tap to pay bail.
          </div>
        )}
        <div style={{ padding: "18px 14px 40px" }}>
          <div className="fade-in-up" key={tab}>
            <Tab setTab={setTab} />
          </div>
        </div>
      </main>
      {bgOpen && <BgManager onClose={() => setBgOpen(false)} />}
    </div>
  );
}
