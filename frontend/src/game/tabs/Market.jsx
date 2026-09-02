import { useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Utensils, CupSoda, Cross, X } from "lucide-react";
import { ITEM_IMG } from "../images";
import PaymentSelector from "../PaymentSelector";

const SECTIONS = [
  { key: "food", label: "FOOD", icon: Utensils, color: "#F59E0B", note: "Food regenerates Health gradually over time — it does NOT heal instantly." },
  { key: "drinks", label: "DRINKS", icon: CupSoda, color: "#38BDF8", note: "Drinks restore Stamina, the resource consumed by Heists." },
  { key: "medicine", label: "MEDICINE", icon: Cross, color: "#EF4444", note: "Medicine restores Health instantly. Pricier than Food." },
];

function ItemCard({ item, color, onBuy }) {
  const eff = item.type === "food" ? `+${item.health_regen} Health (gradual)`
    : item.type === "drink" ? `+${item.stamina} Stamina`
    : `+${item.health} Health (instant)`;
  return (
    <div className="card-glow" data-testid={`market-item-${item.id}`} style={{ padding: 0, overflow: "hidden", borderColor: `${color}44` }}>
      <div style={{ height: 130, overflow: "hidden", position: "relative", background: "#05060f" }}>
        <img src={ITEM_IMG[item.img]} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(3,3,8,0.6) 100%)" }} />
      </div>
      <div style={{ padding: 16 }}>
        <div className="font-display" style={{ color: "#fff", fontSize: 15, letterSpacing: "0.05em" }}>{item.name.toUpperCase()}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0", minHeight: 30 }}>{item.desc}</div>
        <div className="label-caps" style={{ color }}>{eff}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div className="font-display neon-gold">{fmtMoney(item.price)}</div>
          <button data-testid={`buy-${item.id}`} onClick={() => onBuy(item)} className="btn-primary" style={{ padding: "8px 16px", fontSize: 11 }}>BUY</button>
        </div>
      </div>
    </div>
  );
}

export default function Market() {
  const { user, catalog, refresh } = useAuth();
  const [tab, setTab] = useState("food");
  const [modal, setModal] = useState(null);
  const [method, setMethod] = useState("cash");
  const [qty, setQty] = useState(1);
  if (!catalog) return null;

  const section = SECTIONS.find((s) => s.key === tab);
  const items = catalog[tab] || [];

  const openBuy = (item) => { setModal(item); setMethod("cash"); setQty(1); };
  const confirm = async () => {
    try {
      await api.post("/market/buy-item", { item_id: modal.id, quantity: qty, payment_method: method });
      await refresh();
      toast.success(`Bought ${qty}× ${modal.name}`);
      setModal(null);
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
  };

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="market-tab">
      <div>
        <h2 className="font-display" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>MARKET</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Legal goods. Pay with Cash or Bank — your choice, every time. Purchases drop straight into your Inventory.</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SECTIONS.map((s) => {
          const I = s.icon; const active = tab === s.key;
          return (
            <button key={s.key} data-testid={`market-section-${s.key}`} onClick={() => setTab(s.key)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", border: `1px solid ${active ? s.color : "#1a2436"}`, background: active ? `${s.color}18` : "transparent", color: active ? "#fff" : "#94a3b8", fontFamily: "Orbitron", fontSize: 11, letterSpacing: "0.12em" }}>
              <I size={14} color={s.color} /> {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 12, border: `1px solid ${section.color}44`, background: `${section.color}0d`, fontSize: 12, color: section.color, letterSpacing: "0.03em" }}>
        {section.note}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {items.map((it) => <ItemCard key={it.id} item={it} color={section.color} onBuy={openBuy} />)}
      </div>

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card-glow" data-testid="buy-modal" style={{ padding: 24, maxWidth: 420, width: "100%", background: "#08080f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="font-display" style={{ color: "#fff", fontSize: 18 }}>{modal.name.toUpperCase()}</div>
              <button data-testid="close-modal" onClick={() => setModal(null)} style={{ color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span className="label-caps">QUANTITY</span>
              <input data-testid="buy-qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value | 0))} style={{ width: 80 }} />
              <div style={{ marginLeft: "auto" }} className="font-display neon-gold">{fmtMoney(modal.price * qty)}</div>
            </div>
            <PaymentSelector allowed={["cash", "bank"]} value={method} onChange={setMethod} price={modal.price * qty} cash={user.money} bank={user.bank} />
            <button data-testid="confirm-buy" onClick={confirm} className="btn-primary" style={{ width: "100%", padding: 12, marginTop: 18 }}>CONFIRM PURCHASE</button>
          </div>
        </div>
      )}
    </div>
  );
}
