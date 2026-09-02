"""Backend tests for The Law of Silence — focus on Contraband Black Market
plus smoke tests for auth/character/catalog required by the review request.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # frontend/.env is source of truth
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    ts = int(time.time() * 1000)
    email = f"tester_{ts}_{uuid.uuid4().hex[:6]}@neoncity.io"
    username = f"tst_{ts % 10_000_000}"
    password = "password123"

    r = s.post(f"{API}/auth/signup", json={"email": email, "username": username, "password": password}, timeout=20)
    assert r.status_code == 200, f"signup failed {r.status_code} {r.text}"
    data = r.json()
    token = data["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    # create character
    r2 = s.post(f"{API}/character/create", json={"avatar_id": "av_3", "specialization": "shooter"}, timeout=15)
    assert r2.status_code == 200, f"char create failed {r2.text}"
    return {"session": s, "email": email, "username": username, "user": data["user"], "token": token}


# ---------- Smoke tests ----------
def test_root_online():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j.get("status") == "online"


def test_catalog_shape():
    r = requests.get(f"{API}/catalog", timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("specializations", "weapons", "armors", "vehicles", "npcs", "heists", "districts", "properties", "businesses"):
        assert k in j, f"missing {k}"
    # armor ids used by frontend
    armor_ids = {a["id"] for a in j["armors"]}
    assert {"light_armor", "med_armor", "heavy_armor"} <= armor_ids
    # vehicle count
    assert len(j["vehicles"]) == 13 or len(j["vehicles"]) >= 12
    # weapons per category
    cats = {}
    for w in j["weapons"]:
        cats.setdefault(w["cat"], 0)
        cats[w["cat"]] += 1
    for c in ("melee", "pistol", "smg", "rifle", "shotgun", "sniper", "special"):
        assert cats.get(c, 0) >= 3, f"cat {c} has too few weapons"


def test_signup_new_user_state(user_session):
    u = user_session["user"]
    assert u["money"] == 800
    assert u["level"] == 1
    assert u["equipped"]["vehicle"] == "starter"
    assert u["equipped"]["primary"] is None
    # no _id leaked
    assert "_id" not in u
    assert "password_hash" not in u


def test_auth_me(user_session):
    s = user_session["session"]
    r = s.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["username"] == user_session["username"]
    assert j["specialization"] == "shooter"


# ---------- Contraband Market ----------
def test_market_contraband_shape(user_session):
    s = user_session["session"]
    r = s.get(f"{API}/market/contraband", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "goods" in j and "prices" in j and "holdings" in j and "seconds_to_refresh" in j
    ids = {g["id"] for g in j["goods"]}
    assert ids == {"tobacco", "weed", "alcohol", "counterfeit", "cocaine"}
    assert len(j["goods"]) == 5
    for gid in ids:
        assert gid in j["prices"]
        assert isinstance(j["prices"][gid], int) and j["prices"][gid] >= 1
    # seconds_to_refresh should be within a 3h window
    assert 0 < j["seconds_to_refresh"] <= 3 * 3600
    assert j.get("period_hours") == 3
    # holdings default to empty
    assert isinstance(j["holdings"], dict)


def test_market_prices_deterministic_within_window(user_session):
    s = user_session["session"]
    a = s.get(f"{API}/market/contraband", timeout=15).json()["prices"]
    b = s.get(f"{API}/market/contraband", timeout=15).json()["prices"]
    assert a == b, "Contraband prices must be deterministic within a 3h window"


def test_market_buy_and_sell_flow(user_session):
    s = user_session["session"]
    # ensure fresh state
    before = s.get(f"{API}/auth/me", timeout=15).json()
    money0 = before["money"]

    market = s.get(f"{API}/market/contraband", timeout=15).json()
    price_tobacco = market["prices"]["tobacco"]

    # Buy 3 tobacco
    r = s.post(f"{API}/market/buy-contraband", json={"good_id": "tobacco", "quantity": 3}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["contraband"]["tobacco"] == 3
    assert j["money"] == money0 - price_tobacco * 3

    # Verify persistence via /auth/me
    after_buy = s.get(f"{API}/auth/me", timeout=15).json()
    assert after_buy["money"] == j["money"]
    assert after_buy.get("contraband", {}).get("tobacco") == 3

    # Sell 2 tobacco
    r2 = s.post(f"{API}/market/sell-contraband", json={"good_id": "tobacco", "quantity": 2}, timeout=15)
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert j2["contraband"]["tobacco"] == 1
    assert j2["money"] == j["money"] + price_tobacco * 2

    # Sell more than owned -> 400
    r3 = s.post(f"{API}/market/sell-contraband", json={"good_id": "tobacco", "quantity": 999}, timeout=15)
    assert r3.status_code == 400


def test_market_buy_not_enough_cash(user_session):
    s = user_session["session"]
    # Try to buy a large amount of cocaine (base 950, factor up to ~1.8x -> up to 1700; qty 10000 way beyond funds)
    r = s.post(f"{API}/market/buy-contraband", json={"good_id": "cocaine", "quantity": 100000}, timeout=15)
    assert r.status_code == 400


def test_market_unknown_good(user_session):
    s = user_session["session"]
    r = s.post(f"{API}/market/buy-contraband", json={"good_id": "unicorn_dust", "quantity": 1}, timeout=15)
    assert r.status_code == 404
    r2 = s.post(f"{API}/market/sell-contraband", json={"good_id": "unicorn_dust", "quantity": 1}, timeout=15)
    assert r2.status_code == 404


def test_market_requires_auth():
    r = requests.get(f"{API}/market/contraband", timeout=15)
    assert r.status_code == 401
    r2 = requests.post(f"{API}/market/buy-contraband", json={"good_id": "weed", "quantity": 1}, timeout=15)
    assert r2.status_code == 401


# ---------- Hire crew smoke ----------
def test_hire_crew(user_session):
    s = user_session["session"]
    # user starts with 800 cash and no crew. npc_4 (Lena) costs 700.
    # But we may have spent on contraband tests above; add money by selling if needed.
    me = s.get(f"{API}/auth/me", timeout=15).json()
    if me["money"] < 700:
        # cheap: sell any remaining tobacco
        if me.get("contraband", {}).get("tobacco", 0) > 0:
            s.post(f"{API}/market/sell-contraband", json={"good_id": "tobacco", "quantity": me["contraband"]["tobacco"]}, timeout=15)
    me = s.get(f"{API}/auth/me", timeout=15).json()
    if me["money"] < 700:
        pytest.skip("insufficient funds for hire test after prior tests")
    r = s.post(f"{API}/player/hire-crew", json={"npc_id": "npc_4"}, timeout=15)
    assert r.status_code == 200, r.text
    assert "npc_4" in r.json()["hired_crew"]
