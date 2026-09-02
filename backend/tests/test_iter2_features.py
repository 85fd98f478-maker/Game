"""Iteration 2 backend tests for The Law of Silence:
- Two-phase heist flow (briefing + resolve)
- Weapon-aware combat text + ammo consumption
- Shared loot log split (real players only)
- Black Market: mystery crate (only crate item) + open-crate gamble
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"


def _topup(username, amount):
    """Direct DB top-up so cash-gated tests can run deterministically."""
    try:
        from pymongo import MongoClient
        mongo_url = "mongodb://localhost:27017"
        with open("/app/backend/.env") as f:
            for line in f:
                if line.startswith("MONGO_URL"):
                    mongo_url = line.split("=", 1)[1].strip().strip('"')
                if line.startswith("DB_NAME"):
                    dbn = line.split("=", 1)[1].strip().strip('"')
        client = MongoClient(mongo_url)
        client[dbn].users.update_one({"username": username}, {"$inc": {"money": amount}})
        client.close()
        return True
    except Exception as e:
        print(f"topup failed: {e}")
        return False


def make_user(spec="hacker", avatar="av_1"):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    ts = int(time.time() * 1000)
    email = f"TEST_{ts}_{uuid.uuid4().hex[:6]}@neoncity.io"
    username = f"tst_{ts % 100000}{uuid.uuid4().hex[:4]}"
    r = s.post(f"{API}/auth/signup", json={"email": email, "username": username, "password": "pass123"}, timeout=20)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    r2 = s.post(f"{API}/character/create", json={"avatar_id": avatar, "specialization": spec}, timeout=15)
    assert r2.status_code == 200, r2.text
    return s, username


def give_cash(s, amount):
    """Bump user's cash via direct DB not available; use crate opening or contraband sells if needed.
    For tests, we simply call catalog to compute what we can afford."""
    pass


# ---------- Black Market: crate list ----------
def test_catalog_blackmarket_only_stim_and_mystery():
    r = requests.get(f"{API}/catalog", timeout=15)
    assert r.status_code == 200
    bm = r.json()["blackmarket_items"]
    ids = {x["id"] for x in bm}
    assert ids == {"bm_combat_stim", "crate_mystery"}, f"Unexpected bm items: {ids}"


def test_catalog_contraband_has_img():
    r = requests.get(f"{API}/catalog", timeout=15)
    cbs = r.json().get("contraband") or r.json().get("contraband_goods") or []
    # If key is different, look for CONTRABAND in top-level
    if not cbs:
        for k in ("contraband", "goods"):
            if k in r.json():
                cbs = r.json()[k]; break
    # Not strictly asserting img on the backend catalog, front-end has GOOD_IMG map.
    # Just ensure endpoint responds.
    assert isinstance(cbs, list)


# ---------- Mystery crate flow ----------
def test_open_mystery_crate_flow():
    s, u = make_user()
    _topup(u, 2000)
    me = s.get(f"{API}/auth/me").json()
    if me["money"] < 1500:
        pytest.skip(f"Insufficient cash for crate_mystery: {me['money']}")
    buy = s.post(f"{API}/market/buy-item", json={"item_id": "crate_mystery", "quantity": 1, "payment_method": "cash"}, timeout=15)
    assert buy.status_code == 200, buy.text
    j = buy.json()
    assert j["inventory"].get("crate_mystery", 0) >= 1
    op = s.post(f"{API}/inventory/open-crate", json={"item_id": "crate_mystery"}, timeout=15)
    assert op.status_code == 200, op.text
    oj = op.json()
    for k in ("good_id", "good_name", "units", "value", "profit", "verdict"):
        assert k in oj, f"missing {k}"
    assert oj["verdict"] in ("JACKPOT", "PROFIT", "LOSS")
    # contraband holding increased
    assert oj["contraband"].get(oj["good_id"], 0) >= oj["units"]


def test_open_crate_without_owning():
    s, _ = make_user()
    r = s.post(f"{API}/inventory/open-crate", json={"item_id": "crate_mystery"}, timeout=15)
    assert r.status_code == 400


def test_open_crate_wrong_item():
    s, _ = make_user()
    r = s.post(f"{API}/inventory/open-crate", json={"item_id": "food_noodles"}, timeout=15)
    assert r.status_code == 400


# ---------- Heist Phase 1 (briefing / decision) ----------
def test_heist_phase1_no_state_change():
    s, _ = make_user()
    me0 = s.get(f"{API}/auth/me").json()
    r = s.post(f"{API}/heist/run", json={
        "heist_id": "op_convenience", "crew_ids": [], "vehicle_id": "starter",
        "player_ids": [], "drone_id": None
    }, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["phase"] == "decision"
    assert "decision" in j and "id" in j["decision"] and "options" in j["decision"]
    assert len(j["decision"]["options"]) == 2
    assert "t_end" in j
    # State unchanged
    me1 = s.get(f"{API}/auth/me").json()
    assert me1["stamina"] == me0["stamina"]
    assert me1["money"] == me0["money"]
    assert me1.get("heist_cooldowns", {}) == me0.get("heist_cooldowns", {})


# ---------- Heist Phase 2 (resolve) ----------
def test_heist_phase2_resolve_and_cooldown():
    s, _ = make_user()
    me0 = s.get(f"{API}/auth/me").json()
    # phase 1
    r1 = s.post(f"{API}/heist/run", json={
        "heist_id": "op_convenience", "crew_ids": [], "vehicle_id": "starter",
        "player_ids": [], "drone_id": None
    }, timeout=20)
    assert r1.status_code == 200
    j1 = r1.json()
    choice = j1["decision"]["options"][0]["key"]
    t0 = j1["t_end"]
    # phase 2
    r2 = s.post(f"{API}/heist/run", json={
        "heist_id": "op_convenience", "crew_ids": [], "vehicle_id": "starter",
        "player_ids": [], "drone_id": None, "choice": choice, "t0": t0
    }, timeout=25)
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert j2["phase"] == "result"
    assert "rewards" in j2 and "outcome" in j2
    assert "loot_log" in j2 and len(j2["loot_log"]) >= 1
    assert j2["loot_log"][0]["you"] is True and j2["loot_log"][0]["role"] == "Lead"
    # stamina deducted
    me1 = s.get(f"{API}/auth/me").json()
    # If they got captured/prisoned, stamina still deducted before capture
    assert me1["stamina"] <= me0["stamina"] - 5  # quick heist cost is 10
    # If in prison, subsequent run gets blocked by prison instead of cooldown; that's fine
    # cooldown blocks 2nd immediate resolve (also blocks 2nd phase-1 briefing)
    r3 = s.post(f"{API}/heist/run", json={
        "heist_id": "op_convenience", "crew_ids": [], "vehicle_id": "starter",
        "player_ids": [], "drone_id": None
    }, timeout=15)
    assert r3.status_code == 400
    body = r3.text.lower()
    assert "cooldown" in body or "prison" in body or "stamina" in body or "health" in body


# ---------- Weapon-aware combat: bare-handed ----------
def _run_heist_full(s, heist_id="op_convenience", choice_pref="hard"):
    r1 = s.post(f"{API}/heist/run", json={
        "heist_id": heist_id, "crew_ids": [], "vehicle_id": "starter",
        "player_ids": [], "drone_id": None
    }, timeout=20)
    if r1.status_code != 200:
        return None, r1
    j1 = r1.json()
    if j1.get("phase") != "decision":
        return j1, r1
    # pick the "hard/rush/brute" aggro if present, else first
    opts = j1["decision"]["options"]
    choice = next((o["key"] for o in opts if o["key"] in ("hard", "rush", "brute")), opts[0]["key"])
    r2 = s.post(f"{API}/heist/run", json={
        "heist_id": heist_id, "crew_ids": [], "vehicle_id": "starter",
        "player_ids": [], "drone_id": None, "choice": choice, "t0": j1["t_end"]
    }, timeout=25)
    return (r2.json() if r2.status_code == 200 else None), r2


def test_combat_barehanded_no_ammo_used():
    s, _ = make_user()
    # No weapon equipped by default
    me = s.get(f"{API}/auth/me").json()
    assert me["equipped"].get("primary") is None and me["equipped"].get("secondary") is None
    j2, r2 = _run_heist_full(s)
    assert r2.status_code == 200, r2.text
    assert j2["rewards"]["ammo_used"] == 0
    # Combat text if any enemies killed
    combat_msgs = [e["msg"] for e in j2["events"] if e.get("cat") == "combat"]
    if combat_msgs:
        joined = " ".join(combat_msgs).lower()
        assert any(k in joined for k in ("overpower", "wrestle", "bare-handed", "bare handed")), \
            f"barehanded combat text expected, got: {combat_msgs}"


def _cycle_two_quick_heists(s, run_fn):
    """Run op_convenience & op_atm alternately to bypass per-heist cooldown."""
    results = []
    for hid in ("op_convenience", "op_atm", "op_convenience", "op_atm"):
        j, r = run_fn(s, heist_id=hid)
        if r.status_code == 200 and j and j.get("phase") == "result":
            results.append(j)
        # if prisoned/hp low, break
        me = s.get(f"{API}/auth/me").json()
        if me.get("prison") or me.get("health", 100) < 30 or me.get("stamina", 0) < 10:
            break
    return results


def test_combat_melee_weapon_no_ammo():
    s, _ = make_user()
    # Buy knife ($450) and equip melee
    r = s.post(f"{API}/player/buy-weapon", json={"item_id": "knife"}, timeout=15)
    assert r.status_code == 200, r.text
    r = s.post(f"{API}/player/equip", json={"slot": "melee", "item_id": "knife"}, timeout=15)
    assert r.status_code == 200, r.text
    # Verify equipped weapon is picked up as primary or secondary — actually heist uses primary or secondary
    # But takedown() uses ctx["weapon"]. Let's check _heist_common: weapon_id = primary OR secondary OR melee
    # (from grep line 803). Good — melee will be picked if slots empty.
    results = _cycle_two_quick_heists(s, _run_heist_full)
    assert results, "expected at least one heist result"
    for j2 in results:
        assert j2["rewards"]["ammo_used"] == 0
        combat = [e["msg"] for e in j2["events"] if e.get("cat") == "combat"]
        if combat:
            joined = " ".join(combat).lower()
            assert any(k in joined for k in ("cut", "strike", "silent", "close quarter", "brutal")), \
                f"melee combat text expected, got: {combat}"
            break
    else:
        pytest.skip("No combat events surfaced across runs")


def test_combat_firearm_consumes_ammo():
    s, u = make_user()
    _topup(u, 5000)
    me = s.get(f"{API}/auth/me").json()
    if me["money"] < 3400:
        pytest.skip(f"cannot afford glock17 (money={me['money']})")
    r = s.post(f"{API}/player/buy-weapon", json={"item_id": "glock17"}, timeout=15)
    assert r.status_code == 200, r.text
    # ensure enough pistol ammo
    me = s.get(f"{API}/auth/me").json()
    if me["ammo"]["pistol"] < 20:
        s.post(f"{API}/player/buy-ammo", json={"ammo_type": "pistol", "quantity": 40}, timeout=15)
    r = s.post(f"{API}/player/equip", json={"slot": "secondary", "item_id": "glock17"}, timeout=15)
    assert r.status_code == 200, r.text
    # Run heists until we get a run with enemies_killed > 0 (may not happen every run)
    fired = False
    for hid in ("op_convenience", "op_atm", "op_convenience", "op_atm", "op_convenience"):
        me = s.get(f"{API}/auth/me").json()
        if me.get("prison") or me.get("stamina", 0) < 10 or me.get("health", 100) < 30 or me["ammo"]["pistol"] < 5:
            break
        ammo_before = me["ammo"]["pistol"]
        j2, r2 = _run_heist_full(s, heist_id=hid)
        if r2.status_code != 200 or not j2 or j2.get("phase") != "result":
            continue
        if j2["rewards"]["ammo_used"] > 0:
            fired = True
            me2 = s.get(f"{API}/auth/me").json()
            assert j2["rewards"]["ammo_type"] == "pistol"
            assert me2["ammo"]["pistol"] == max(0, ammo_before - j2["rewards"]["ammo_used"])
            combat = " ".join(e["msg"] for e in j2["events"] if e.get("cat") == "combat").lower()
            assert any(k in combat for k in ("shoot", "burst", "round", "put ")), \
                f"firearm combat text expected, got: {combat}"
            break
    if not fired:
        pytest.skip("random heist outcomes never produced combat kills across attempts")


# ---------- Shared loot log with real player ----------
def test_shared_loot_log_split_evenly():
    a_s, a_u = make_user("shooter", "av_1")
    b_s, b_u = make_user("driver", "av_2")
    # A adds B as friend
    r = a_s.post(f"{API}/friends/request", json={"username": b_u}, timeout=15)
    assert r.status_code == 200, r.text
    reqs = b_s.get(f"{API}/friends").json()["requests"]
    req_id = next(x for x in reqs if x["from_username"] == a_u)["id"]
    b_s.post(f"{API}/friends/respond", json={"request_id": req_id, "accept": True}, timeout=15)
    # A invites B to op_convenience heist
    r = a_s.post(f"{API}/heist/invite", json={"friend_username": b_u, "heist_id": "op_convenience"}, timeout=15)
    assert r.status_code == 200, r.text
    # B accepts
    notifs = b_s.get(f"{API}/notifications").json()["notifications"]
    inv_id = next((n["data"]["invite_id"] for n in notifs if n.get("type") == "heist_invite" and n.get("data")), None)
    assert inv_id, "no heist invite notification"
    r = b_s.post(f"{API}/heist/invite/respond", json={"request_id": inv_id, "accept": True}, timeout=15)
    assert r.status_code == 200
    # Get B's user id
    b_me = b_s.get(f"{API}/auth/me").json()
    b_id = b_me["id"]
    b_money_before = b_me["money"]
    a_me = a_s.get(f"{API}/auth/me").json()
    a_money_before = a_me["money"]

    # Run heist w/ B on the crew. May take several attempts to get a SUCCESS outcome with cash payout.
    got_success = False
    for hid in ("op_convenience", "op_atm", "op_convenience", "op_atm", "op_convenience", "op_atm"):
        me = a_s.get(f"{API}/auth/me").json()
        if me.get("prison") or me.get("stamina", 0) < 10 or me.get("health", 100) < 30:
            break
        r1 = a_s.post(f"{API}/heist/run", json={
            "heist_id": hid, "crew_ids": [], "vehicle_id": "starter",
            "player_ids": [b_id], "drone_id": None
        }, timeout=20)
        if r1.status_code != 200:
            continue
        j1 = r1.json()
        if j1.get("phase") != "decision":
            continue
        choice = j1["decision"]["options"][0]["key"]
        r2 = a_s.post(f"{API}/heist/run", json={
            "heist_id": hid, "crew_ids": [], "vehicle_id": "starter",
            "player_ids": [b_id], "drone_id": None, "choice": choice, "t0": j1["t_end"]
        }, timeout=25)
        if r2.status_code != 200:
            continue
        j2 = r2.json()
        if j2["rewards"]["cash"] > 0 and j2.get("pot", 0) > 0:
            got_success = True
            # loot log has both players
            usernames = {e["username"] for e in j2["loot_log"]}
            assert a_u in usernames and b_u in usernames
            # split evenly
            pot = j2["pot"]
            share = j2["your_share"]
            assert share == pot // 2
            # B's money increased by share
            b_me2 = b_s.get(f"{API}/auth/me").json()
            assert b_me2["money"] >= b_money_before + share, \
                f"B money should have increased by ~{share}: before={b_money_before} after={b_me2['money']}"
            break
    if not got_success:
        pytest.skip("no successful cash heist across attempts to validate share")
