import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Dices, Coins, Spade, Swords } from "lucide-react";

const FEE = 0.15;

function BetPanel({ bet, setBet, disabled }) {
  const fee = Math.round(bet * FEE);
  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="label-caps" style={{ fontSize: 10 }}>WAGER</span>
        <input data-testid="casino-bet" type="number" min={100} value={bet} onChange={(e) => setBet(Math.max(0, e.target.value | 0))} disabled={disabled} style={{ width: 140 }} />
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>15% fee: <span style={{ color: "#F59E0B" }}>{fmtMoney(fee)}</span> · Total cost: <span className="font-display" style={{ color: "#fff" }}>{fmtMoney(bet + fee)}</span></div>
    </div>
  );
}

export default function Casino() {
  const { user, refresh } = useAuth();
  const [bet, setBet] = useState(500);
  const [last, setLast] = useState(null);
  const [rColor, setRColor] = useState("red");
  const [challenges, setChallenges] = useState([]);
  const [dueTo, setDueTo] = useState("");

  const loadCh = useCallback(async () => { try { const { data } = await api.get("/casino/challenges"); setChallenges(data.incoming || []); } catch {} }, []);
  useEffect(() => { loadCh(); const t = setInterval(loadCh, 8000); return () => clearInterval(t); }, [loadCh]);

  const play = async (game, choice) => {
    try {
      const { data } = await api.post("/casino/play", { game, bet, choice });
      setLast(data); await refresh();
      toast[data.win ? "success" : "error"](data.win ? `WON ${fmtMoney(data.payout)}!` : `Lost. Net ${fmtMoney(data.net)}`);
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
  };

  const challenge = async () => {
    if (!dueTo) return;
    try { const { data } = await api.post("/casino/challenge", { friend_username: dueTo, bet }); await refresh(); setDueTo(""); toast.success("Duel sent. Funds escrowed until they respond."); }
    catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
  };
  const respond = async (id, accept) => {
    try { const { data } = await api.post("/casino/challenge/respond", { request_id: id, accept }); await refresh(); await loadCh();
      if (accept) toast[data.you_won ? "success" : "error"](`High-Card: your ${data.to_card} vs ${data.from_card} — you ${data.you_won ? "WON" : "lost"}.`);
      else toast.success("Declined.");
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
  };

  const fee = Math.round(bet * FEE);
  const canAfford = user.money >= bet + fee && bet >= 100;

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="casino-tab">
      <div>
        <h2 className="font-display" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>NEON CASINO</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>In-game cash only. Every game carries a <span style={{ color: "#F59E0B" }}>15% house fee</span> on your wager. Play smart — the house always has an edge.</div>
      </div>

      <div className="card-glow" style={{ padding: 18, maxWidth: 420 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 10 }}>SET YOUR WAGER</div>
        <BetPanel bet={bet} setBet={setBet} />
        {!canAfford && <div style={{ color: "#EF4444", fontSize: 11 }}>Need {fmtMoney(bet + fee)} (wager + fee). You have {fmtMoney(user.money)}.</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {/* HIGH CARD vs house */}
        <div className="card-glow" style={{ padding: 18 }} data-testid="game-highcard">
          <div className="font-display" style={{ color: "#fff", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Spade size={16} color="#00F0FF" /> HIGH CARD</div>
          <div style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0", minHeight: 34 }}>Draw against the house. Higher card wins 1.9× your wager. Ties go to the house.</div>
          <button data-testid="play-highcard" onClick={() => play("highcard")} disabled={!canAfford} className="btn-primary" style={{ width: "100%", padding: 10, fontSize: 12 }}>DEAL · {fmtMoney(bet + fee)}</button>
        </div>
        {/* SLOTS */}
        <div className="card-glow" style={{ padding: 18 }} data-testid="game-slots">
          <div className="font-display" style={{ color: "#fff", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Dices size={16} color="#EC4899" /> NEON SLOTS</div>
          <div style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0", minHeight: 34 }}>Spin three reels. Two match = 1.4×. Triple match pays up to 15×.</div>
          <button data-testid="play-slots" onClick={() => play("slots")} disabled={!canAfford} className="btn-primary" style={{ width: "100%", padding: 10, fontSize: 12 }}>SPIN · {fmtMoney(bet + fee)}</button>
        </div>
        {/* ROULETTE */}
        <div className="card-glow" style={{ padding: 18 }} data-testid="game-roulette">
          <div className="font-display" style={{ color: "#fff", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Coins size={16} color="#F59E0B" /> NEON ROULETTE</div>
          <div style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0" }}>Bet a color (1.95×) or an exact number 0–36 (35×).</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {["red", "black"].map((c) => <button key={c} onClick={() => setRColor(c)} data-testid={`roulette-${c}`} style={{ flex: 1, padding: 6, fontSize: 10, border: `1px solid ${rColor === c ? "#F59E0B" : "#1a2436"}`, background: rColor === c ? "rgba(245,158,11,0.12)" : "transparent", color: "#fff" }}>{c.toUpperCase()}</button>)}
            <input data-testid="roulette-number" placeholder="#" onChange={(e) => setRColor(e.target.value)} style={{ width: 56 }} />
          </div>
          <button data-testid="play-roulette" onClick={() => play("roulette", rColor)} disabled={!canAfford} className="btn-primary" style={{ width: "100%", padding: 10, fontSize: 12 }}>SPIN · {fmtMoney(bet + fee)}</button>
        </div>
      </div>

      {last && <div className="card-glow" style={{ padding: 18, borderColor: last.win ? "#10B981" : "#EF4444" }} data-testid="casino-result">
        <div className="font-display" style={{ fontSize: 18, color: last.win ? "#10B981" : "#EF4444" }}>{last.win ? "YOU WON" : "NO WIN"} · {last.game.toUpperCase()}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
          {last.game === "slots" && <>Reels: <b style={{ color: "#fff" }}>{last.detail.reels.join(" · ")}</b>. </>}
          {last.game === "highcard" && <>You {last.detail.player_card} vs House {last.detail.house_card}. </>}
          {last.game === "roulette" && <>Landed on <b style={{ color: "#fff" }}>{last.detail.number} {last.detail.color}</b> (you picked {last.detail.pick}). </>}
          Wager {fmtMoney(last.bet)} · fee {fmtMoney(last.fee)} · payout <span className="neon-gold">{fmtMoney(last.payout)}</span> · net <span style={{ color: last.net >= 0 ? "#10B981" : "#EF4444" }}>{fmtMoney(last.net)}</span>{last.xp > 0 && <> · +{last.xp} XP</>}
        </div>
      </div>}

      {/* FRIEND DUEL */}
      <div className="card-glow" style={{ padding: 18 }} data-testid="casino-friend">
        <div className="label-caps neon-purple" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Swords size={13} /> HIGH-CARD DUEL — CHALLENGE A FRIEND</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <input data-testid="duel-friend" placeholder="Friend username" value={dueTo} onChange={(e) => setDueTo(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button data-testid="duel-send" onClick={challenge} disabled={!dueTo || !canAfford} className="btn-primary" style={{ padding: "10px 16px", fontSize: 11 }}>CHALLENGE · {fmtMoney(bet + fee)}</button>
        </div>
        <div style={{ fontSize: 11, color: "#64748B" }}>Winner takes both wagers; both pay the 15% fee. Funds are escrowed until your opponent responds.</div>
        {challenges.length > 0 && <div style={{ marginTop: 14 }}>
          <div className="label-caps neon-cyan" style={{ marginBottom: 8 }}>INCOMING DUELS</div>
          {challenges.map((c) => <div key={c.id} data-testid={`duel-${c.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, border: "1px solid #1a2436", marginBottom: 6 }}>
            <div style={{ color: "#fff", fontSize: 13 }}>{c.from_username} · {fmtMoney(c.bet)} <span style={{ color: "#64748B", fontSize: 11 }}>(+{fmtMoney(c.fee)} fee)</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <button data-testid={`duel-accept-${c.id}`} onClick={() => respond(c.id, true)} className="btn-primary" style={{ padding: "5px 12px", fontSize: 10 }}>ACCEPT</button>
              <button onClick={() => respond(c.id, false)} className="btn-outline" style={{ padding: "5px 12px", fontSize: 10 }}>DECLINE</button>
            </div>
          </div>)}
        </div>}
      </div>
    </div>
  );
}
