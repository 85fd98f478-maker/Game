import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail } from "../../api";
import { toast } from "sonner";
import { Users, Mail, Bell, UserPlus, Send, Shield } from "lucide-react";

export default function Social({ setTab }) {
  const { refresh } = useAuth();
  const [sub, setSub] = useState(window.__socialSub || "friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [msgTo, setMsgTo] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [gangMsgs, setGangMsgs] = useState([]);
  const [gangBody, setGangBody] = useState("");
  const loadGang = useCallback(async () => { try { const { data } = await api.get("/messages/gang"); setGangMsgs(data.messages || []); } catch {} }, []);
  useEffect(() => { if (sub === "gangchat") { loadGang(); const t = setInterval(loadGang, 8000); return () => clearInterval(t); } }, [sub, loadGang]);
  const sendGang = async () => { if (!gangBody.trim()) return; try { await api.post("/messages/gang/send", { body: gangBody }); setGangBody(""); await loadGang(); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  const load = useCallback(async () => {
    try { const { data } = await api.get("/friends"); setFriends(data.friends || []); setRequests(data.requests || []); } catch {}
    try { const { data } = await api.get("/messages"); setMessages(data.messages || []); } catch {}
    try { const { data } = await api.get("/notifications"); setNotifs(data.notifications || []); } catch {}
  }, []);
  useEffect(() => { load(); window.__socialSub = undefined; }, [load]);

  const doSearch = async (q) => { setSearch(q); if (q.length < 2) { setResults([]); return; } try { const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`); setResults(data); } catch {} };
  const sendReq = async (username) => { try { await api.post("/friends/request", { username }); toast.success(`Request sent to ${username}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const respond = async (id, accept) => { try { await api.post("/friends/respond", { request_id: id, accept }); await load(); await refresh(); toast.success(accept ? "Friend added" : "Declined"); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const removeFriend = async (username) => { try { await api.post("/friends/remove", { username }); await load(); toast.success("Removed"); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const send = async () => { try { await api.post("/messages/send", { to_username: msgTo, body: msgBody }); setMsgBody(""); await load(); toast.success("Message sent"); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const readNotif = async (n) => { try { await api.post("/notifications/read", { id: n.id }); await load(); if (n.link && setTab) setTab(n.link); } catch {} };
  const readAll = async () => { try { await api.post("/notifications/read", { id: "all" }); await load(); } catch {} };

  const SUBS = [{ k: "friends", label: "FRIENDS", icon: Users }, { k: "messages", label: "MESSAGES", icon: Mail }, { k: "gangchat", label: "GANG CHAT", icon: Shield }, { k: "notifications", label: "NOTIFICATIONS", icon: Bell }];

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="social-tab">
      <div style={{ position: "relative", overflow: "hidden", height: 150, border: "1px solid rgba(0,240,255,0.3)" }} data-testid="social-banner">
        <img src="/dashboard/bg_social.png" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(2,2,4,0.92) 0%, rgba(2,2,4,0.3) 100%)" }} />
        <div style={{ position: "relative", padding: 24 }}>
          <h2 className="font-display" style={{ fontSize: 28, color: "#fff", letterSpacing: "0.1em", fontWeight: 900 }}>SOCIAL</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, maxWidth: 560 }}>Friends, messages and notifications. Invite friends to heists for a real edge.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SUBS.map((s) => { const I = s.icon; const active = sub === s.k; return <button key={s.k} data-testid={`social-${s.k}`} onClick={() => setSub(s.k)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", border: `1px solid ${active ? "#00F0FF" : "#1a2436"}`, background: active ? "rgba(0,240,255,0.1)" : "transparent", color: active ? "#fff" : "#94a3b8", fontFamily: "Orbitron", fontSize: 11, letterSpacing: "0.12em" }}><I size={14} /> {s.label}</button>; })}
      </div>

      {sub === "friends" && <>
        <div className="card-glow" style={{ padding: 18 }}>
          <div className="label-caps neon-pink" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><UserPlus size={13} /> FIND PLAYERS</div>
          <input data-testid="friend-search" placeholder="Search username…" value={search} onChange={(e) => doSearch(e.target.value)} style={{ width: "100%" }} />
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {results.map((r) => <div key={r.username} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, border: "1px solid #1a2436" }}>
              <div style={{ color: "#fff" }}>{r.username} <span style={{ fontSize: 10, color: r.online ? "#10B981" : "#64748B" }}>{r.online ? "● ONLINE" : "○ OFFLINE"}</span> <span style={{ color: "#64748B", fontSize: 10 }}>· LVL {r.level}</span></div>
              <button data-testid={`add-friend-${r.username}`} onClick={() => sendReq(r.username)} className="btn-outline" style={{ padding: "4px 10px", fontSize: 10 }}>ADD</button>
            </div>)}
          </div>
        </div>
        {requests.length > 0 && <div className="card-glow" style={{ padding: 18 }}>
          <div className="label-caps neon-cyan" style={{ marginBottom: 10 }}>FRIEND REQUESTS</div>
          {requests.map((r) => <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, border: "1px solid #1a2436", marginBottom: 6 }}>
            <div style={{ color: "#fff" }}>{r.from_username}</div>
            <div style={{ display: "flex", gap: 6 }}><button data-testid={`accept-friend-${r.id}`} onClick={() => respond(r.id, true)} className="btn-primary" style={{ padding: "4px 12px", fontSize: 10 }}>ACCEPT</button><button onClick={() => respond(r.id, false)} className="btn-outline" style={{ padding: "4px 12px", fontSize: 10 }}>DECLINE</button></div>
          </div>)}
        </div>}
        <div className="card-glow" style={{ padding: 18 }}>
          <div className="label-caps neon-green" style={{ marginBottom: 10 }}>YOUR FRIENDS ({friends.length})</div>
          {friends.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No friends yet.</div> :
            <div style={{ display: "grid", gap: 6 }}>{friends.map((f) => <div key={f.id} data-testid={`friend-${f.username}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, border: "1px solid #1a2436" }}>
              <div style={{ color: "#fff" }}>{f.username} <span style={{ fontSize: 10, color: f.online ? "#10B981" : "#64748B" }}>{f.online ? "● ONLINE" : "○ OFFLINE"}</span> <span style={{ color: "#64748B", fontSize: 10 }}>· LVL {f.level}</span></div>
              <div style={{ display: "flex", gap: 6 }}><button onClick={() => { setSub("messages"); setMsgTo(f.username); }} className="btn-outline" style={{ padding: "4px 10px", fontSize: 10 }}>MESSAGE</button><button onClick={() => removeFriend(f.username)} className="btn-outline" style={{ padding: "4px 10px", fontSize: 10, borderColor: "#EF4444", color: "#EF4444" }}>REMOVE</button></div>
            </div>)}</div>}
        </div>
      </>}

      {sub === "messages" && <>
        <div className="card-glow" style={{ padding: 18 }}>
          <div className="label-caps neon-pink" style={{ marginBottom: 10 }}>NEW MESSAGE</div>
          <div style={{ display: "grid", gap: 8 }}>
            <input data-testid="msg-to" placeholder="To username" value={msgTo} onChange={(e) => setMsgTo(e.target.value)} />
            <textarea data-testid="msg-body" placeholder="Message…" value={msgBody} onChange={(e) => setMsgBody(e.target.value)} style={{ background: "#05060f", border: "1px solid #1a2436", color: "#fff", padding: 10, minHeight: 70 }} />
            <button data-testid="send-msg" onClick={send} disabled={!msgTo || !msgBody} className="btn-primary" style={{ padding: 10 }}><Send size={13} style={{ display: "inline", marginRight: 4 }} /> SEND</button>
          </div>
        </div>
        <div className="card-glow" style={{ padding: 18 }}>
          <div className="label-caps neon-cyan" style={{ marginBottom: 10 }}>INBOX</div>
          {messages.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No messages.</div> :
            <div style={{ display: "grid", gap: 6 }}>{messages.map((m) => <div key={m.id} style={{ padding: 10, border: "1px solid #1a2436" }}>
              <div style={{ fontSize: 11, color: "#64748B" }}>{m.from_username} → {m.to_username}</div>
              <div style={{ color: "#fff", fontSize: 13 }}>{m.body}</div>
            </div>)}</div>}
        </div>
      </>}

      {sub === "gangchat" && <div className="card-glow" style={{ padding: 18 }} data-testid="gang-chat">
        <div className="label-caps neon-purple" style={{ marginBottom: 10 }}>GANG CHAT — members only</div>
        <div style={{ display: "grid", gap: 6, maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
          {gangMsgs.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No messages yet. Say hi to your crew (you must be in a gang).</div> :
            gangMsgs.map((m) => <div key={m.id} style={{ padding: 8, border: "1px solid #1a2436" }}><span className="font-display" style={{ color: "#A855F7", fontSize: 11 }}>{m.from_username}</span> <span style={{ color: "#fff", fontSize: 13 }}>{m.body}</span></div>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input data-testid="gangchat-input" placeholder="Message your gang…" value={gangBody} onChange={(e) => setGangBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendGang()} style={{ flex: 1 }} />
          <button data-testid="gangchat-send" onClick={sendGang} className="btn-primary" style={{ padding: "10px 16px" }}><Send size={13} /></button>
        </div>
      </div>}

      {sub === "notifications" && <div className="card-glow" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><div className="label-caps neon-cyan">NOTIFICATIONS</div><button data-testid="mark-all-read" onClick={readAll} className="btn-outline" style={{ padding: "4px 10px", fontSize: 10 }}>MARK ALL READ</button></div>
        {notifs.length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No notifications.</div> :
          <div style={{ display: "grid", gap: 6 }}>{notifs.map((n) => <div key={n.id} data-testid={`notif-${n.id}`} onClick={() => readNotif(n)} style={{ padding: 12, border: `1px solid ${n.read ? "#1a2436" : "#00F0FF55"}`, background: n.read ? "transparent" : "rgba(0,240,255,0.05)", cursor: "pointer" }}>
            <div className="font-display" style={{ color: "#fff", fontSize: 13 }}>{n.title}{!n.read && <span style={{ color: "#00F0FF", marginLeft: 6, fontSize: 10 }}>● NEW</span>}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{n.body}</div>
          </div>)}</div>}
      </div>}
    </div>
  );
}
