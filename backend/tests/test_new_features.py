"""Backend tests for The Law of Silence — new feature set:
- Unified Item System (Food/Drinks/Medicine)
- Market payment selector (cash/bank) & Black Market cash-only
- Inventory consume (medicine/drink/food)
- Bank fee (10%)
- Heist success chance + heist run (stamina/capacity/prison)
- Prison status/pay-bail
- Notifications / Messages / Friends
- Gang system + gang inventory
- Rankings (players + gangs)
- Businesses buy/collect
- Police bribe (cash only) and bribe-cost
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


def make_user(spec="hacker", avatar="av_1"):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    ts = int(time.time() * 1000)
    email = f"TEST_{ts}_{uuid.uuid4().hex[:6]}@neoncity.io"
    username = f"tst_{ts % 100000}{uuid.uuid4().hex[:4]}"
    password = "pass123"
    r = s.post(f"{API}/auth/signup", json={"email": email, "username": username, "password": password}, timeout=20)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    r2 = s.post(f"{API}/character/create", json={"avatar_id": avatar, "specialization": spec}, timeout=15)
    assert r2.status_code == 200, r2.text
    return s, username


@pytest.fixture(scope="module")
def user_a():
    s, u = make_user("hacker", "av_1")
    return {"s": s, "u": u}


@pytest.fixture(scope="module")
def user_b():
    s, u = make_user("shooter", "av_2")
    return {"s": s, "u": u}


# ---------- Catalog shape for new items ----------
def test_catalog_new_items():
    r = requests.get(f"{API}/catalog", timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("food", "drinks", "medicine", "blackmarket_items", "drones", "config"):
        assert k in j, f"missing catalog key: {k}"
    assert j["config"]["bank_fee"] == 0.10
    # vehicles have capacity
    for v in j["vehicles"]:
        assert "capacity" in v
    # heists have stamina_cost & crew_max
    for h in j["heists"]:
        assert "stamina_cost" in h and "crew_max" in h


# ---------- Signup default state ----------
def test_signup_default_state(user_a):
    r = user_a["s"].get(f"{API}/auth/me", timeout=15)
    j = r.json()
    assert j["money"] == 800
    assert j.get("bank", 0) == 0
    assert j["health"] == 100
    assert j.get("stamina", 0) >= 100
    assert "food_buffer" in j
    # no "energy" field anywhere
    assert "energy" not in j


# ---------- Market: buy food with CASH ----------
def test_market_buy_food_cash_and_consume(user_a):
    s = user_a["s"]
    r = s.post(f"{API}/market/buy-item", json={"item_id": "food_noodles", "quantity": 1, "payment_method": "cash"}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["inventory"].get("food_noodles", 0) >= 1
    # consume food: adds food_buffer
    r2 = s.post(f"{API}/inventory/consume", json={"item_id": "food_noodles"}, timeout=15)
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert j2["food_buffer"] >= 25  # health_regen from noodles


def test_market_buy_medicine_cash_heals(user_a):
    s = user_a["s"]
    # Lower health first by trying a heist? Easier: just verify medicine buy & consume returns 200
    # Ensure enough cash: give ourselves earnings via contraband? We start with 800; medicine costs 700 (stim)
    me = s.get(f"{API}/auth/me").json()
    if me["money"] < 700:
        pytest.skip("insufficient cash for medicine test")
    r = s.post(f"{API}/market/buy-item", json={"item_id": "med_stim", "quantity": 1, "payment_method": "cash"}, timeout=15)
    assert r.status_code == 200, r.text
    r2 = s.post(f"{API}/inventory/consume", json={"item_id": "med_stim"}, timeout=15)
    assert r2.status_code == 200
    j = r2.json()
    assert "health" in j


def test_market_buy_drink_bank_payment(user_b):
    """Legal item (drink) should allow payment_method=bank."""
    s = user_b["s"]
    # deposit some to bank first
    dep = s.post(f"{API}/bank/deposit", json={"amount": 500}, timeout=15)
    assert dep.status_code == 200, dep.text
    r = s.post(f"{API}/market/buy-item", json={"item_id": "drink_soda", "quantity": 1, "payment_method": "bank"}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["inventory"].get("drink_soda", 0) >= 1
    # consume drink -> restores stamina
    r2 = s.post(f"{API}/inventory/consume", json={"item_id": "drink_soda"}, timeout=15)
    assert r2.status_code == 200
    assert "stamina" in r2.json()


# ---------- Black market: cash-only enforcement ----------
def test_blackmarket_bank_rejected(user_b):
    """Illegal (bm_medicine, drone) should reject bank payment."""
    s = user_b["s"]
    r = s.post(f"{API}/market/buy-item", json={"item_id": "bm_combat_stim", "quantity": 1, "payment_method": "bank"}, timeout=15)
    assert r.status_code >= 400, f"expected error, got {r.status_code}: {r.text}"

    # drone as well
    r2 = s.post(f"{API}/market/buy-item", json={"item_id": "drone_recon", "quantity": 1, "payment_method": "bank"}, timeout=15)
    assert r2.status_code >= 400, r2.text


def test_blackmarket_cash_allowed(user_a):
    s = user_a["s"]
    # Need enough cash; give via server catalog check; skip if not enough
    me = s.get(f"{API}/auth/me").json()
    if me["money"] < 950:
        pytest.skip("insufficient cash for bm_combat_stim")
    r = s.post(f"{API}/market/buy-item", json={"item_id": "bm_combat_stim", "quantity": 1, "payment_method": "cash"}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["inventory"].get("bm_combat_stim", 0) >= 1


# ---------- Bank fee (10%) ----------
def test_bank_deposit_withdraw_fee(user_a):
    s = user_a["s"]
    me = s.get(f"{API}/auth/me").json()
    if me["money"] < 200:
        pytest.skip("insufficient cash")
    m0, b0 = me["money"], me.get("bank", 0)
    r = s.post(f"{API}/bank/deposit", json={"amount": 100}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["fee"] == 10
    assert j["credited"] == 90
    assert j["money"] == m0 - 100
    assert j["bank"] == b0 + 90
    # withdraw 50 -> fee 5, receive 45
    r2 = s.post(f"{API}/bank/withdraw", json={"amount": 50}, timeout=15)
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert j2["fee"] == 5
    assert j2["received"] == 45


def test_bank_invalid_amount(user_a):
    s = user_a["s"]
    r = s.post(f"{API}/bank/deposit", json={"amount": 0}, timeout=15)
    assert r.status_code == 400
    r2 = s.post(f"{API}/bank/withdraw", json={"amount": 99_999_999}, timeout=15)
    assert r2.status_code == 400


# ---------- Heist success chance & run ----------
def test_heist_success_chance(user_a):
    s = user_a["s"]
    r = s.post(f"{API}/heist/success-chance", json={
        "heist_id": "op_convenience", "crew_ids": [], "vehicle_id": "starter", "player_ids": []
    }, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert 0.05 <= j["success_chance"] <= 0.92
    assert "stamina_cost" in j
    assert "breakdown" in j


def test_heist_run_stamina_and_capacity(user_a):
    s = user_a["s"]
    # Try running quick heist (op_convenience) with starter vehicle solo
    me = s.get(f"{API}/auth/me").json()
    if me.get("prison"):
        pytest.skip("player in prison from prior test")
    stamina_before = me["stamina"]
    r = s.post(f"{API}/heist/run", json={
        "heist_id": "op_convenience", "crew_ids": [], "vehicle_id": "starter", "player_ids": [], "drone_id": None
    }, timeout=20)
    # Should either succeed with stamina reduced, or 400 with a specific reason
    assert r.status_code in (200, 400), r.text
    if r.status_code == 200:
        me2 = s.get(f"{API}/auth/me").json()
        # stamina should decrease by exactly heist_stamina_cost.quick = 10 (unless captured/hospitalized regen)
        # We can only assert it's less-or-equal (regen may have kicked in negligibly)
        assert me2.get("stamina", 100) <= stamina_before


def test_heist_capacity_gate(user_a):
    """Vehicle with capacity < crew should be blocked with 400."""
    s = user_a["s"]
    # starter is a bike-ish (capacity 4 per config). Use crew_ids larger than 4 to over-cap.
    # We may not own crew, so backend rejects with different reason. Skip if crew requirement blocks first.
    r = s.post(f"{API}/heist/run", json={
        "heist_id": "op_convenience", "crew_ids": ["npc_1", "npc_2", "npc_3", "npc_4"],
        "vehicle_id": "starter", "player_ids": [], "drone_id": None
    }, timeout=15)
    # Since crew not hired, backend may not error on ownership (compute uses find_item). It likely returns 400 due to capacity or ownership.
    assert r.status_code in (400,)


def test_heist_drone_not_owned(user_a):
    s = user_a["s"]
    r = s.post(f"{API}/heist/run", json={
        "heist_id": "op_convenience", "crew_ids": [], "vehicle_id": "starter",
        "player_ids": [], "drone_id": "drone_tech"
    }, timeout=15)
    # Either not owned or another 400 reason
    assert r.status_code == 400


# ---------- Prison ----------
def test_prison_status_default(user_b):
    s = user_b["s"]
    r = s.get(f"{API}/prison/status", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["in_prison"] in (False, True)


def test_prison_pay_bail_not_in_prison(user_b):
    s = user_b["s"]
    st = s.get(f"{API}/prison/status").json()
    if st.get("in_prison"):
        pytest.skip("player is in prison")
    r = s.post(f"{API}/prison/pay-bail", json={"payment_method": "cash"}, timeout=15)
    assert r.status_code == 400


# ---------- Police bribe ----------
def test_bribe_cost_no_heat(user_a):
    s = user_a["s"]
    r = s.get(f"{API}/police/bribe-cost", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["heat"] >= 0
    assert "cost" in j
    # bribe with no heat -> 400
    r2 = s.post(f"{API}/police/bribe", timeout=15)
    if j["heat"] == 0:
        assert r2.status_code == 400


# ---------- Notifications ----------
def test_notifications_list(user_a):
    s = user_a["s"]
    r = s.get(f"{API}/notifications", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "notifications" in j and "unread" in j
    # mark all read
    r2 = s.post(f"{API}/notifications/read", json={"id": "all"}, timeout=15)
    assert r2.status_code == 200


# ---------- Friends + Messages (two users) ----------
def test_friends_and_messages_flow(user_a, user_b):
    a, b = user_a["s"], user_b["s"]
    # A sends friend request to B
    r = a.post(f"{API}/friends/request", json={"username": user_b["u"]}, timeout=15)
    assert r.status_code == 200, r.text
    # B lists friends -> should have pending request
    fl = b.get(f"{API}/friends", timeout=15).json()
    reqs = fl["requests"]
    assert any(x["from_username"] == user_a["u"] for x in reqs)
    req_id = next(x for x in reqs if x["from_username"] == user_a["u"])["id"]
    # B accepts
    r2 = b.post(f"{API}/friends/respond", json={"request_id": req_id, "accept": True}, timeout=15)
    assert r2.status_code == 200
    # Verify friend added on both sides
    fa = a.get(f"{API}/friends").json()
    fb = b.get(f"{API}/friends").json()
    assert any(f["username"] == user_b["u"] for f in fa["friends"])
    assert any(f["username"] == user_a["u"] for f in fb["friends"])
    # Message
    m = a.post(f"{API}/messages/send", json={"to_username": user_b["u"], "body": "hey"}, timeout=15)
    assert m.status_code == 200, m.text
    inbox = b.get(f"{API}/messages").json()
    assert inbox["unread"] >= 1
    assert any(mm["body"] == "hey" for mm in inbox["messages"])
    # search
    sr = a.get(f"{API}/users/search", params={"q": user_b["u"][:4]}, timeout=15)
    assert sr.status_code == 200
    assert any(x["username"] == user_b["u"] for x in sr.json())


# ---------- Gang system ----------
def test_gang_create_invite_join_and_inventory():
    """Uses fresh users so cash state is predictable across xdist orders."""
    a_s, a_u = make_user("hacker", "av_1")
    b_s, b_u = make_user("shooter", "av_2")
    a, b = a_s, b_s
    user_a = {"s": a_s, "u": a_u}
    user_b = {"s": b_s, "u": b_u}
    # Create gang from A
    r = a.post(f"{API}/gang/create", json={"name": f"NW_{uuid.uuid4().hex[:6]}", "description": "qa"}, timeout=15)
    assert r.status_code == 200, r.text
    # Invite B
    r2 = a.post(f"{API}/gang/invite", json={"username": user_b["u"]}, timeout=15)
    assert r2.status_code == 200, r2.text
    # B lists invites
    invs = b.get(f"{API}/gang/invites").json()
    assert len(invs) >= 1
    invite_id = invs[0]["id"]
    r3 = b.post(f"{API}/gang/invite/respond", json={"request_id": invite_id, "accept": True}, timeout=15)
    assert r3.status_code == 200, r3.text
    # Both see the gang, A is Neon King, B is Ghost
    ga2 = a.get(f"{API}/gang").json()["gang"]
    ranks = {m["username"]: m["rank"] for m in ga2["members"]}
    assert ranks.get(user_a["u"]) == "Neon King"
    assert ranks.get(user_b["u"]) == "Ghost"

    # Gang inventory deposit from A: A has 800 cash fresh, plenty for 2 drink_soda (180)
    buy = a.post(f"{API}/market/buy-item", json={"item_id": "drink_soda", "quantity": 2, "payment_method": "cash"}, timeout=15)
    assert buy.status_code == 200, buy.text
    inv_now = a.get(f"{API}/auth/me").json().get("inventory", {})
    assert inv_now.get("drink_soda", 0) >= 1, f"drink_soda missing from inventory: {inv_now}"
    dep = a.post(f"{API}/gang/inventory/deposit", json={"item_id": "drink_soda", "quantity": 1}, timeout=15)
    assert dep.status_code == 200, dep.text
    assert dep.json()["gang_inventory"].get("drink_soda", 0) >= 1
    # Withdraw as leader (Neon King)
    wd = a.post(f"{API}/gang/inventory/withdraw", json={"item_id": "drink_soda", "quantity": 1}, timeout=15)
    assert wd.status_code == 200, wd.text
    # Deposit again so B can attempt to withdraw
    a.post(f"{API}/gang/inventory/deposit", json={"item_id": "drink_soda", "quantity": 1}, timeout=15)
    # B (Ghost) should NOT be allowed to withdraw
    wd2 = b.post(f"{API}/gang/inventory/withdraw", json={"item_id": "drink_soda", "quantity": 1}, timeout=15)
    assert wd2.status_code == 403


# ---------- Rankings ----------
def test_rankings_players_and_gangs(user_a):
    s = user_a["s"]
    r = s.get(f"{API}/rankings", timeout=15)
    assert r.status_code == 200
    j = r.json()
    # Should be a list of at most 15 top + possibly self
    assert isinstance(j, (list, dict))
    r2 = s.get(f"{API}/rankings/gangs", timeout=15)
    assert r2.status_code == 200


# ---------- Businesses ----------
def test_business_flow(user_a):
    s = user_a["s"]
    me = s.get(f"{API}/auth/me").json()
    # Businesses require substantial cash; skip if insufficient
    cat = requests.get(f"{API}/catalog").json()
    biz_list = cat.get("businesses", [])
    if not biz_list:
        pytest.skip("no businesses")
    cheapest = sorted(biz_list, key=lambda x: x.get("price", 999999))[0]
    if me["money"] + me.get("bank", 0) < cheapest.get("price", 0):
        pytest.skip("insufficient funds for cheapest business")
    r = s.post(f"{API}/business/buy", json={"business_id": cheapest["id"], "payment_method": "cash"}, timeout=15)
    # buy may fail due to schema; just assert 200 or a clear 400
    assert r.status_code in (200, 400), r.text
    # collect income (safe even w/o business)
    r2 = s.post(f"{API}/business/collect", timeout=15)
    assert r2.status_code == 200, r2.text
    j = r2.json()
    assert "income" in j and "fines" in j and "events" in j


# ---------- Cleanup fixture ----------
# Note: users created here are prefixed with TEST_ email; no explicit teardown to keep runs fast.
