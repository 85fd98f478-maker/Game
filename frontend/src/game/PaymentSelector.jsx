import { DollarSign, Landmark } from "lucide-react";
import { fmtMoney } from "../api";

// Explicit payment method chooser. Never switches silently.
export default function PaymentSelector({ allowed = ["cash", "bank"], value, onChange, price, cash = 0, bank = 0, feePct = 0 }) {
  const opts = allowed;
  const bal = { cash, bank };
  const Icon = { cash: DollarSign, bank: Landmark };
  const label = { cash: "CASH", bank: "BANK" };
  const enough = value ? bal[value] >= price : false;
  return (
    <div data-testid="payment-selector" style={{ display: "grid", gap: 8 }}>
      <div className="label-caps" style={{ color: "#64748B" }}>PAYMENT METHOD</div>
      <div style={{ display: "flex", gap: 8 }}>
        {opts.map((m) => {
          const active = value === m;
          const I = Icon[m];
          const color = m === "cash" ? "#10B981" : "#38BDF8";
          return (
            <button
              key={m}
              data-testid={`pay-${m}`}
              onClick={() => onChange(m)}
              style={{
                flex: 1, padding: "10px 12px", border: `1px solid ${active ? color : "#1a2436"}`,
                background: active ? `${color}18` : "transparent", color: active ? "#fff" : "#94a3b8",
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "border-color .15s, background .15s",
              }}
            >
              <I size={14} color={color} />
              <div style={{ textAlign: "left" }}>
                <div className="font-display" style={{ fontSize: 12, letterSpacing: "0.08em" }}>{label[m]}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>{fmtMoney(bal[m])}</div>
              </div>
            </button>
          );
        })}
      </div>
      {opts.length === 1 && opts[0] === "cash" && (
        <div style={{ fontSize: 10, color: "#EF4444", letterSpacing: "0.1em" }}>⚠ ILLEGAL ACTIVITY · CASH ONLY</div>
      )}
      {value && (
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          Price: <span className="neon-gold font-display">{fmtMoney(price)}</span>
          {feePct > 0 && <> · Fee {Math.round(feePct * 100)}%: <span style={{ color: "#F59E0B" }}>{fmtMoney(Math.round(price * feePct))}</span></>}
          {" · "}<span style={{ color: enough ? "#10B981" : "#EF4444" }}>{enough ? "Sufficient balance" : "Insufficient balance"}</span>
        </div>
      )}
    </div>
  );
}
