import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Package, RefreshCw, Radar } from "lucide-react";
import { ITEM_IMG, GOOD_IMG } from "../images";

export default function BlackMarket() {
  const { user, catalog, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [qty, setQty] = useState({});
  const [left, setLeft] = useState(0);

  const load = async () => {
    try { const { data } = await api.get("/market/contraband"); setData(data); setLeft(data.seconds_to_refresh); } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { load(); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, []);

  if (!data || !catalog) return null;

  const fmtT = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
  const q = (id) => qty[id] || 1;
  const setQ = (id, v) => setQty((p) => ({ ...p, [id]: Math.max(1, v | 0) }));

  const buyC = async (g) => { try { await api.post("/market/buy-contraband", { good_id: g.id, quantity: q(g.id) }); await refresh(); await load(); toast.success(`Bought ${q(g.id)} ${g.name}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const sellC = async (g) => { try { await api.post("/market/sell-contraband", { good_id: g.id, quantity: q(g.id) }); await refresh(); await load(); toast.success(`Sold ${q(g.id)} ${g.name}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const buyItem = async (it) => { try { await api.post("/market/buy-item", { item_id: it.id, quantity: 1, payment_method: "cash" }); await refresh(); toast.success(`Bought ${it.name} (cash)`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="blackmarket-tab">
      <div>
        <h2 className="font-display" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>BLACK MARKET</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Illegal goods only. <span style={{ color: "#EF4444" }}>Everything here is CASH ONLY.</span> No questions asked.</div>
      </div>

      {/* Black market items + drones */}
      <div>
        <div className="label-caps neon-pink" style={{ marginBottom: 10 }}>CONTRABAND · CRATES · MEDICINE · DRONES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[...catalog.blackmarket_items, ...catalog.drones].map((it) => (
            <div key={it.id} className="card-glow" data-testid={`bm-item-${it.id}`} style={{ padding: 0, overflow: "hidden", borderColor: "rgba(236,72,153,0.35)" }}>
              <div style={{ height: 130, overflow: "hidden", position: "relative", background: "#05060f" }}>
                <img src={ITEM_IMG[it.img]} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(3,3,8,0.6) 100%)" }} />
                {it.type === "drone" && <div className="label-caps" style={{ position: "absolute", top: 8, left: 8, color: "#00F0FF", background: "rgba(0,0,0,0.6)", padding: "2px 6px", display: "flex", gap: 4, alignItems: "center" }}><Radar size={11} /> {it.focus.toUpperCase()}</div>}
              </div>
              <div style={{ padding: 16 }}>
                <div className="font-display" style={{ color: "#fff", fontSize: 14 }}>{it.name.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0", minHeight: 42 }}>{it.desc}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div className="font-display neon-gold">{fmtMoney(it.price)}</div>
                  <button data-testid={`bm-buy-${it.id}`} onClick={() => buyItem(it)} disabled={user.money < it.price} className="btn-primary" style={{ padding: "8px 14px", fontSize: 11 }}>BUY · CASH</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contraband trading */}
      <div className="card-glow" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderColor: "rgba(236,72,153,0.4)" }}>
        <div className="label-caps neon-pink" style={{ display: "flex", alignItems: "center", gap: 8 }}><Package size={14} /> STREET PRICES · LIVE</div>
        <div className="label-caps" style={{ color: "#64748B", fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={11} /> NEW PRICES IN <span className="font-display" style={{ color: "#F59E0B" }}>{fmtT(left)}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {data.goods.map((g) => {
          const price = data.prices[g.id]; const owned = data.holdings[g.id] || 0;
          const pctOfBase = Math.round((price / g.base) * 100); const hot = pctOfBase >= 120;
          return (
            <div key={g.id} className="card-glow" data-testid={`good-${g.id}`} style={{ padding: 0, overflow: "hidden", borderColor: `${g.color}44` }}>
              <div style={{ display: "flex", gap: 14, padding: 16 }}>
                <div style={{ width: 74, height: 74, flexShrink: 0, border: `1px solid ${g.color}44`, overflow: "hidden", background: "#05060f", position: "relative" }}>
                  <img src={GOOD_IMG[g.id]} alt="" loading="lazy" data-testid={`good-img-${g.id}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 45%, ${g.color}22 100%)` }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="font-display" style={{ color: "#fff", fontSize: 16 }}>{g.name.toUpperCase()}</div>
                    <div className="label-caps" style={{ color: g.color, fontSize: 9 }}>/{g.unit}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                    <div className="font-display" style={{ color: g.color, fontSize: 24, fontWeight: 800 }} data-testid={`price-${g.id}`}>{fmtMoney(price)}</div>
                    <div style={{ fontSize: 11, color: hot ? "#10B981" : "#EF4444" }}>{hot ? "▲" : "▼"} {pctOfBase}%</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>You hold: <span className="font-display" style={{ color: "#fff" }}>{owned}</span></div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 16px 16px" }}>
                <input data-testid={`qty-${g.id}`} type="number" min={1} value={q(g.id)} onChange={(e) => setQ(g.id, +e.target.value)} style={{ width: 70 }} />
                <button data-testid={`buy-${g.id}`} onClick={() => buyC(g)} disabled={user.money < price * q(g.id)} className="btn-primary" style={{ padding: "8px 12px", fontSize: 11, flex: 1 }}>BUY</button>
                <button data-testid={`sell-${g.id}`} onClick={() => sellC(g)} disabled={owned < q(g.id)} className="btn-outline" style={{ padding: "8px 12px", fontSize: 11, flex: 1, borderColor: `${g.color}66`, color: g.color }}>SELL</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
