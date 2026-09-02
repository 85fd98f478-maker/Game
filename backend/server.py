from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
import os, uuid, bcrypt, jwt, random, logging
from datetime import datetime, timezone, timedelta

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("tls")

# ========== GAME CATALOGS ==========
SPECIALIZATIONS = [
    {"id": "hacker", "name": "Hacker", "desc": "Bypass digital security, cameras, alarms.", "color": "#00F0FF"},
    {"id": "shooter", "name": "Shooter", "desc": "Combat expert. Superior in gunfights.", "color": "#EF4444"},
    {"id": "driver", "name": "Driver", "desc": "Getaway master. Faster escapes, better routes.", "color": "#F59E0B"},
    {"id": "infiltrator", "name": "Infiltrator", "desc": "Silent entry. Avoid alarms and detection.", "color": "#A855F7"},
    {"id": "negotiator", "name": "Negotiator", "desc": "De-escalate hostage & NPC situations.", "color": "#EC4899"},
    {"id": "technician", "name": "Technician", "desc": "Cracks locks, safes, mechanical security.", "color": "#10B981"},
]

WEAPONS = [
    # MELEE
    {"id": "knife", "name": "Tactical Knife", "cat": "melee", "slot": "melee", "damage": 18, "accuracy": 60, "reliability": 90, "price": 450, "ammo_type": None},
    {"id": "bat", "name": "Baseball Bat", "cat": "melee", "slot": "melee", "damage": 22, "accuracy": 55, "reliability": 95, "price": 680, "ammo_type": None},
    {"id": "katana", "name": "Katana", "cat": "melee", "slot": "melee", "damage": 35, "accuracy": 70, "reliability": 88, "price": 3800, "ammo_type": None},
    # PISTOLS
    {"id": "glock17", "name": "Glock 17", "cat": "pistol", "slot": "secondary", "damage": 32, "accuracy": 68, "reliability": 85, "price": 3400, "ammo_type": "pistol"},
    {"id": "beretta", "name": "M9 Beretta", "cat": "pistol", "slot": "secondary", "damage": 34, "accuracy": 72, "reliability": 82, "price": 4200, "ammo_type": "pistol"},
    {"id": "tec9", "name": "TEC-9", "cat": "pistol", "slot": "secondary", "damage": 40, "accuracy": 55, "reliability": 70, "price": 6200, "ammo_type": "pistol"},
    # SMGS
    {"id": "ump45", "name": "UMP-45", "cat": "smg", "slot": "primary", "damage": 48, "accuracy": 62, "reliability": 78, "price": 12500, "ammo_type": "smg"},
    {"id": "mp5", "name": "MP5", "cat": "smg", "slot": "primary", "damage": 50, "accuracy": 70, "reliability": 88, "price": 15800, "ammo_type": "smg"},
    {"id": "p90", "name": "P90", "cat": "smg", "slot": "primary", "damage": 55, "accuracy": 68, "reliability": 82, "price": 19500, "ammo_type": "smg"},
    # RIFLES
    {"id": "ak47", "name": "AK-47", "cat": "rifle", "slot": "primary", "damage": 72, "accuracy": 65, "reliability": 92, "price": 32000, "ammo_type": "rifle"},
    {"id": "m4a1", "name": "M4A1", "cat": "rifle", "slot": "primary", "damage": 68, "accuracy": 78, "reliability": 90, "price": 38000, "ammo_type": "rifle"},
    {"id": "scarl", "name": "SCAR-L", "cat": "rifle", "slot": "primary", "damage": 75, "accuracy": 80, "reliability": 88, "price": 46000, "ammo_type": "rifle"},
    # SHOTGUNS
    {"id": "mossberg", "name": "Mossberg 500", "cat": "shotgun", "slot": "primary", "damage": 88, "accuracy": 50, "reliability": 90, "price": 26000, "ammo_type": "shotgun"},
    {"id": "spas12", "name": "SPAS-12", "cat": "shotgun", "slot": "primary", "damage": 92, "accuracy": 55, "reliability": 85, "price": 34000, "ammo_type": "shotgun"},
    {"id": "aa12", "name": "AA-12", "cat": "shotgun", "slot": "primary", "damage": 95, "accuracy": 60, "reliability": 78, "price": 55000, "ammo_type": "shotgun"},
    # SNIPERS
    {"id": "awm", "name": "AWM", "cat": "sniper", "slot": "primary", "damage": 120, "accuracy": 95, "reliability": 88, "price": 68000, "ammo_type": "sniper"},
    {"id": "m24", "name": "M24", "cat": "sniper", "slot": "primary", "damage": 105, "accuracy": 92, "reliability": 90, "price": 55000, "ammo_type": "sniper"},
    {"id": "dragunov", "name": "Dragunov", "cat": "sniper", "slot": "primary", "damage": 100, "accuracy": 88, "reliability": 92, "price": 48000, "ammo_type": "sniper"},
    # SPECIAL
    {"id": "railgun", "name": "Railgun", "cat": "special", "slot": "primary", "damage": 150, "accuracy": 90, "reliability": 75, "price": 145000, "ammo_type": "special"},
    {"id": "plasma", "name": "Plasma Rifle", "cat": "special", "slot": "primary", "damage": 140, "accuracy": 85, "reliability": 78, "price": 128000, "ammo_type": "special"},
    {"id": "smartsmg", "name": "Smart SMG", "cat": "special", "slot": "primary", "damage": 95, "accuracy": 98, "reliability": 82, "price": 98000, "ammo_type": "special"},
]

# Per-weapon combat flavor. Guns may use {h} (hostile) and {n} (rounds). Melee uses {h} only.
WEAPON_FLAVOR = {
    # MELEE
    "knife": ["You slip behind {h} and drag the blade across.", "A quick knife thrust drops {h} without a sound.", "You bury the tactical knife in {h} and lower them quietly."],
    "bat": ["You swing the bat and {h} crumples.", "One brutal home-run swing and {h} is down.", "The bat cracks across {h}'s skull — lights out."],
    "katana": ["A single clean katana stroke fells {h}.", "You draw the katana and {h} drops in two heartbeats.", "Steel flashes — {h} never even cleared their weapon."],
    # PISTOLS
    "glock17": ["Two Glock rounds and {h} folds — {n} spent.", "You double-tap {h} with the Glock 17.", "The Glock barks {n} times and {h} goes down."],
    "beretta": ["The Beretta cracks twice and {h} drops — {n} rounds.", "You put {h} down with a clean M9 pairing.", "Beretta up, {h} down — {n} spent."],
    "tec9": ["You spray the TEC-9 and {h} scatters, then falls — {n} rounds gone.", "The TEC-9 chatters wildly; {h} still catches enough.", "Wild TEC-9 burst, {h} down — {n} spent."],
    # SMG
    "ump45": ["A tight UMP-45 burst stitches {h} — {n} rounds.", "You rake {h} with the UMP-45.", "The UMP thumps {n} rounds into {h}."],
    "mp5": ["Controlled MP5 burst — {h} drops clean, {n} spent.", "You tap {h} with a precise MP5 salvo.", "The MP5 whispers {n} rounds and {h} folds."],
    "p90": ["The P90 shreds {h} in a heartbeat — {n} rounds.", "You hose {h} with the P90's high cyclic.", "P90 rips {n} rounds through {h}."],
    # RIFLE
    "ak47": ["The AK-47 roars and {h} is thrown back — {n} spent.", "You hammer {h} with the AK's heavy punch.", "Three AK rounds and {h} is finished — {n} gone."],
    "m4a1": ["A precise M4A1 burst drops {h} — {n} rounds.", "You put {h} down with clean M4 fire.", "The M4A1 snaps {n} rounds into {h}."],
    "scarl": ["The SCAR-L punches through {h}'s cover — {n} spent.", "You drill {h} with the SCAR-L.", "SCAR-L barks {n} times; {h} is done."],
    # SHOTGUN
    "mossberg": ["The Mossberg roars and {h} is gone — {n} shell(s).", "One pump, one shell, {h} down.", "You rack the Mossberg and blast {h} off their feet."],
    "spas12": ["The SPAS-12 thunders and {h} folds — {n} shell(s).", "You blow {h} back with the SPAS-12.", "SPAS-12 boom — {h} doesn't get up."],
    "aa12": ["The AA-12 auto-shotgun saws {h} apart — {n} shell(s).", "You dump the AA-12 and {h} is shredded.", "AA-12 thunders {n} shells; {h} is gone."],
    # SNIPER
    "awm": ["One AWM round from the dark and {h} drops.", "The AWM cracks — {h} is down before the echo, {n} round.", "You exhale, squeeze, and the AWM erases {h}."],
    "m24": ["A single M24 shot puts {h} down for good.", "The M24 barks once; {h} folds — {n} round.", "You place one clean M24 round through {h}."],
    "dragunov": ["The Dragunov cracks and {h} drops mid-stride.", "One marksman round from the Dragunov ends {h}.", "You track {h} and the Dragunov finishes it — {n} round."],
    # SPECIAL
    "railgun": ["The railgun screams and {h} is simply gone.", "A magnetic slug punches clean through {h}.", "The railgun discharges — {h} vaporized, {n} cell."],
    "plasma": ["A plasma bolt melts through {h}.", "The plasma rifle hisses and {h} is scorched down.", "Superheated plasma drops {h} — {n} cell."],
    "smartsmg": ["The Smart SMG auto-locks and {h} drops — {n} rounds.", "Guided rounds curve into {h}; no missing.", "The Smart SMG tags {h} with surgical bursts — {n} spent."],
}
FALLBACK_GUN = ["You shoot {h} down — {n} rounds spent.", "You drop {h} with a tight burst.", "You put {h} down, {n} rounds gone."]
FALLBACK_MELEE = ["You strike {h} down in close quarters.", "You take {h} down with a brutal blow.", "You drop {h} up close."]
FALLBACK_UNARMED = ["You overpower {h} bare-handed.", "You wrestle {h} to the ground and choke them out."]
OUT_OF_AMMO = ["Out of ammo — you pistol-whip {h} down.", "Empty mag — you club {h} with the stock.", "No rounds left; you take {h} down hand-to-hand."]

ARMORS = [
    {"id": "light_armor", "name": "Light Armor", "damage_reduction": 15, "price": 2400, "slot": "armor"},
    {"id": "med_armor", "name": "Tactical Vest", "damage_reduction": 30, "price": 9500, "slot": "armor"},
    {"id": "heavy_armor", "name": "Heavy Armor", "damage_reduction": 50, "price": 32000, "slot": "armor"},
]

VEHICLES = [
    {"id": "starter", "name": "Rusty Sedan", "cat": "compact", "speed": 38, "handling": 45, "armor": 20, "escape": 30, "price": 0, "utility": "None. Starter beater."},
    {"id": "compact_x", "name": "Street Compact", "cat": "compact", "speed": 55, "handling": 62, "armor": 28, "escape": 50, "price": 5800, "utility": "Blends in traffic — reduces detection."},
    {"id": "hatchback", "name": "Turbo Hatchback", "cat": "compact", "speed": 65, "handling": 78, "armor": 24, "escape": 62, "price": 11500, "utility": "Tight cornering. Great for old town alleys."},
    {"id": "nightfall", "name": "Nightfall GT", "cat": "sport", "speed": 84, "handling": 76, "armor": 42, "escape": 81, "price": 22000, "utility": "Balanced getaway. All-purpose."},
    {"id": "chrome_r", "name": "Chrome Roadster", "cat": "sport", "speed": 88, "handling": 82, "armor": 38, "escape": 85, "price": 34000, "utility": "Highway escape specialist."},
    {"id": "muscle_v8", "name": "Muscle V8", "cat": "muscle", "speed": 78, "handling": 62, "armor": 65, "escape": 70, "price": 28500, "utility": "Ram police blockades."},
    {"id": "phantom_s", "name": "Phantom Super", "cat": "super", "speed": 95, "handling": 88, "armor": 55, "escape": 92, "price": 78000, "utility": "Outrun helicopters. Premium heist getaway."},
    {"id": "hypercar", "name": "Aeon Hypercar", "cat": "super", "speed": 99, "handling": 92, "armor": 48, "escape": 96, "price": 145000, "utility": "The fastest thing in Neon City."},
    {"id": "neon_bike", "name": "Neon Sport Bike", "cat": "bike", "speed": 92, "handling": 95, "armor": 15, "escape": 88, "price": 24000, "utility": "Squeeze through gridlock. High reward, high risk."},
    {"id": "armored_suv", "name": "Armored SUV", "cat": "armored", "speed": 62, "handling": 55, "armor": 95, "escape": 68, "price": 62000, "utility": "Reduces crew casualties in shootouts."},
    {"id": "riot_truck", "name": "Riot Truck", "cat": "armored", "speed": 55, "handling": 45, "armor": 99, "escape": 60, "price": 105000, "utility": "Bank & armored transport specialist."},
    {"id": "stealth_van", "name": "Stealth Van", "cat": "utility", "speed": 60, "handling": 60, "armor": 55, "escape": 72, "price": 48000, "utility": "Fits full 4-person crew + gear. Reduces heat gain."},
    {"id": "prototype_x", "name": "Prototype X", "cat": "special", "speed": 96, "handling": 90, "armor": 75, "escape": 94, "price": 220000, "utility": "Experimental EMP shielding. Deters police pursuit."},
]

NPCS = [
    {"id": "npc_1", "name": "Vex", "spec": "shooter", "skill": 65, "cut": 15, "hire_cost": 800},
    {"id": "npc_2", "name": "Maya", "spec": "hacker", "skill": 72, "cut": 18, "hire_cost": 1200},
    {"id": "npc_3", "name": "Dante", "spec": "driver", "skill": 68, "cut": 15, "hire_cost": 1000},
    {"id": "npc_4", "name": "Lena", "spec": "negotiator", "skill": 60, "cut": 12, "hire_cost": 700},
    {"id": "npc_5", "name": "Kaz", "spec": "infiltrator", "skill": 75, "cut": 18, "hire_cost": 1400},
    {"id": "npc_6", "name": "Rook", "spec": "technician", "skill": 70, "cut": 16, "hire_cost": 1100},
    {"id": "npc_7", "name": "Blade", "spec": "shooter", "skill": 82, "cut": 22, "hire_cost": 2500},
    {"id": "npc_8", "name": "Ghost", "spec": "infiltrator", "skill": 88, "cut": 25, "hire_cost": 3800},
    {"id": "npc_9", "name": "Cipher", "spec": "hacker", "skill": 90, "cut": 25, "hire_cost": 4200},
    {"id": "npc_10", "name": "Wraith", "spec": "driver", "skill": 85, "cut": 22, "hire_cost": 3200},
]

HEISTS = [
    {"id": "op_convenience", "name": "Convenience Store", "type": "quick", "district": "downtown", "min_level": 1, "min_crew": 0, "difficulty": 1, "reward_min": 280, "reward_max": 620, "heat_gain": 5, "duration": 10, "cooldown": 120},
    {"id": "op_atm", "name": "ATM Grab", "type": "quick", "district": "downtown", "min_level": 1, "min_crew": 0, "difficulty": 1, "reward_min": 320, "reward_max": 720, "heat_gain": 4, "duration": 8, "cooldown": 150},
    {"id": "op_gasstation", "name": "Gas Station Robbery", "type": "quick", "district": "old_town", "min_level": 2, "min_crew": 0, "difficulty": 2, "reward_min": 480, "reward_max": 950, "heat_gain": 6, "duration": 12, "cooldown": 240},
    {"id": "op_street_drug", "name": "Street Drug Deal", "type": "street", "district": "north_side", "min_level": 3, "min_crew": 1, "difficulty": 3, "reward_min": 850, "reward_max": 1850, "heat_gain": 10, "duration": 14, "cooldown": 420},
    {"id": "op_jewelry", "name": "Jewelry Store", "type": "street", "district": "upper_east", "min_level": 5, "min_crew": 1, "difficulty": 4, "reward_min": 1450, "reward_max": 2800, "heat_gain": 15, "duration": 16, "cooldown": 600},
    {"id": "op_warehouse", "name": "Warehouse Raid", "type": "street", "district": "industrial", "min_level": 7, "min_crew": 2, "difficulty": 5, "reward_min": 1950, "reward_max": 3400, "heat_gain": 18, "duration": 20, "cooldown": 900},
    {"id": "op_armored", "name": "Armored Transport", "type": "heist", "district": "docks", "min_level": 10, "min_crew": 2, "difficulty": 6, "reward_min": 3400, "reward_max": 5800, "heat_gain": 25, "duration": 24, "cooldown": 1500},
    {"id": "op_casino", "name": "Casino Vault", "type": "heist", "district": "upper_east", "min_level": 15, "min_crew": 3, "difficulty": 7, "reward_min": 5500, "reward_max": 9500, "heat_gain": 30, "duration": 30, "cooldown": 2400},
    {"id": "op_bank", "name": "Downtown Bank", "type": "heist", "district": "downtown", "min_level": 20, "min_crew": 3, "difficulty": 8, "reward_min": 8500, "reward_max": 15000, "heat_gain": 40, "duration": 35, "cooldown": 3600},
    {"id": "op_datacenter", "name": "Corp Data Center", "type": "major", "district": "black_island", "min_level": 25, "min_crew": 4, "difficulty": 9, "reward_min": 13000, "reward_max": 21000, "heat_gain": 45, "duration": 40, "cooldown": 5400},
    {"id": "op_penthouse", "name": "Kingpin's Penthouse", "type": "major", "district": "black_island", "min_level": 30, "min_crew": 4, "difficulty": 10, "reward_min": 19000, "reward_max": 34000, "heat_gain": 55, "duration": 50, "cooldown": 7200},
]

DISTRICTS = [
    {"id": "downtown", "name": "Downtown", "level_range": "1-10", "color": "#38BDF8"},
    {"id": "old_town", "name": "Old Town", "level_range": "1-15", "color": "#10B981"},
    {"id": "north_side", "name": "North Side", "level_range": "3-15", "color": "#A855F7"},
    {"id": "docks", "name": "Docks", "level_range": "10-25", "color": "#06B6D4"},
    {"id": "upper_east", "name": "Upper East", "level_range": "15-30", "color": "#F59E0B"},
    {"id": "industrial", "name": "Industrial Zone", "level_range": "10-20", "color": "#F97316"},
    {"id": "south_side", "name": "South Side", "level_range": "20-35", "color": "#EF4444"},
    {"id": "black_island", "name": "Black Island", "level_range": "30+", "color": "#EC4899"},
]

AMMO_PRICES = {"pistol": 3, "smg": 5, "rifle": 8, "shotgun": 12, "sniper": 40, "special": 65}

PROPERTIES = [
    {"id": "prop_apartment", "name": "Downtown Apartment", "district": "downtown", "tier": 1, "storage_cars": 2, "storage_weapons": 6, "security": 15, "price": 8500, "desc": "Cramped but yours. Basic locks, no guards."},
    {"id": "prop_safehouse", "name": "Docks Safehouse", "district": "docks", "tier": 2, "storage_cars": 4, "storage_weapons": 12, "security": 35, "price": 32000, "desc": "Reinforced doors, one lookout. Cops think twice."},
    {"id": "prop_penthouse", "name": "Upper East Penthouse", "district": "upper_east", "tier": 3, "storage_cars": 8, "storage_weapons": 25, "security": 60, "price": 125000, "desc": "Private guards. Silent alarms. Legitimate facade."},
    {"id": "prop_compound", "name": "Industrial Compound", "district": "industrial", "tier": 4, "storage_cars": 15, "storage_weapons": 60, "security": 85, "price": 320000, "desc": "Armed patrols, cameras everywhere. A fortress."},
    {"id": "prop_estate", "name": "Black Island Estate", "district": "black_island", "tier": 5, "storage_cars": 30, "storage_weapons": 150, "security": 98, "price": 850000, "desc": "The kind of place law enforcement never touches."},
]

BUSINESSES = [
    {"id": "biz_carwash", "name": "Neon Car Wash", "district": "downtown", "price": 18000, "daily_income": 1500, "inspection_risk": 0.06, "fine_min": 800, "fine_max": 2500, "desc": "Legit cover. Steady low income."},
    {"id": "biz_bar", "name": "Underground Bar", "district": "old_town", "price": 42000, "daily_income": 3500, "inspection_risk": 0.14, "fine_min": 2500, "fine_max": 6500, "desc": "Cash-heavy. Health inspectors love this."},
    {"id": "biz_pawn", "name": "Pawn Shop", "district": "north_side", "price": 65000, "daily_income": 5500, "inspection_risk": 0.20, "fine_min": 4000, "fine_max": 12000, "desc": "Move stolen goods. Higher heat gain."},
    {"id": "biz_club", "name": "Neon Nightclub", "district": "upper_east", "price": 155000, "daily_income": 12000, "inspection_risk": 0.25, "fine_min": 8000, "fine_max": 25000, "desc": "The city's pulse. Cops watching."},
    {"id": "biz_casino", "name": "Underground Casino", "district": "black_island", "price": 480000, "daily_income": 35000, "inspection_risk": 0.35, "fine_min": 25000, "fine_max": 75000, "desc": "Massive daily print. Massive risk if raided."},
]

# ========== ITEM SYSTEM (shared: Market / Inventory / Black Market / Gang) ==========
# Consumable items. Food = gradual Health regen. Drinks = Stamina. Medicine = instant Health.
FOOD_ITEMS = [
    {"id": "food_noodles", "name": "Instant Noodles", "type": "food", "price": 120, "health_regen": 25, "img": "food_cheap", "legal": True, "desc": "Cheap street food. Slow, small health regen."},
    {"id": "food_burger", "name": "Neo-Burger Combo", "type": "food", "price": 420, "health_regen": 55, "img": "food_mid", "legal": True, "desc": "A proper meal. Solid gradual health regen."},
    {"id": "food_sushi", "name": "Gourmet Sushi", "type": "food", "price": 1150, "health_regen": 100, "img": "food_expensive", "legal": True, "desc": "Premium nutrition. Large gradual health regen."},
]
DRINK_ITEMS = [
    {"id": "drink_soda", "name": "Med-Volt Soda", "type": "drink", "price": 90, "stamina": 15, "img": "drink_cheap", "legal": True, "desc": "Cheap fizz. Restores a little Stamina."},
    {"id": "drink_sports", "name": "Volt Sports Drink", "type": "drink", "price": 320, "stamina": 35, "img": "drink_mid", "legal": True, "desc": "Balanced boost. Restores medium Stamina."},
    {"id": "drink_elixir", "name": "Stamina Elixir", "type": "drink", "price": 900, "stamina": 70, "img": "drink_expensive", "legal": True, "desc": "Premium formula. Restores high Stamina."},
]
MEDICINE_ITEMS = [
    {"id": "med_stim", "name": "Stimpack", "type": "medicine", "price": 700, "health": 40, "img": "medicine_basic", "legal": True, "desc": "Instant partial heal."},
    {"id": "med_nano", "name": "Nano-Medkit", "type": "medicine", "price": 1900, "health": 100, "img": "medicine_advanced", "legal": True, "desc": "Instant full heal."},
]
# Black Market consumables + special goods (illegal, cash only)
BLACKMARKET_ITEMS = [
    {"id": "bm_combat_stim", "name": "Combat Stim", "type": "bm_medicine", "price": 950, "health": 70, "stamina": 25, "img": "medicine_basic", "legal": False, "desc": "Black-market cocktail. Instant heal + stamina."},
    {"id": "crate_mystery", "name": "Mystery Contraband Crate", "type": "crate", "price": 1500, "img": "contraband_crate", "legal": False, "desc": "A sealed, unmarked crate. Could be near worthless — or a jackpot. Open it and gamble on what's inside."},
]
DRONES = [
    {"id": "drone_recon", "name": "Recon Drone", "type": "drone", "price": 8000, "focus": "stealth", "img": "drone_recon", "legal": False, "tier": 1,
     "boost": 0.05, "detect_reduce": 0.04, "loss_reduce": 0.30, "desc": "Recon & infiltration. Small stealth boost, lowers detection risk. Weak in pure combat."},
    {"id": "drone_combat", "name": "Combat Drone", "type": "drone", "price": 12000, "focus": "combat", "img": "drone_combat", "legal": False, "tier": 2,
     "boost": 0.06, "capture_reduce": 0.05, "loss_reduce": 0.10, "desc": "Combat & confrontation. Small boost on aggressive heists, lowers capture risk."},
    {"id": "drone_tech", "name": "Tech Drone", "type": "drone", "price": 16000, "focus": "tech", "img": "drone_tech", "legal": False, "tier": 3,
     "boost": 0.07, "security_reduce": 0.06, "loss_reduce": 0.15, "desc": "Hacking & security. Boost on tech/bank heists, reduces security difficulty."},
]

def all_items():
    return FOOD_ITEMS + DRINK_ITEMS + MEDICINE_ITEMS + BLACKMARKET_ITEMS + DRONES

def find_any_item(iid):
    return find_item(all_items(), iid)

# ========== GAME CONFIG (centralized, tunable) ==========
CONFIG = {
    "bank_fee": 0.10,                 # deposit & withdraw fee
    "base_health": 100,
    "health_per_level": 5,            # max_health = base + (level-1)*per_level
    "base_stamina": 100,
    "stamina_per_level": 2,
    "natural_health_regen_per_hour": 4.0,
    "food_regen_per_hour": 60.0,      # drains food_buffer into health
    "stamina_regen_per_hour": 20.0,
    "heist_stamina_cost": {"quick": 10, "street": 20, "heist": 30, "major": 40},
    "heist_crew_max": {"quick": 2, "street": 4, "heist": 6, "major": 8},
    "vehicle_capacity_by_cat": {"bike": 2, "compact": 4, "sport": 4, "muscle": 4, "super": 8, "armored": 6, "utility": 6, "special": 8},
    "hitman_days": 30,
    "hitman_gang_heists": 50,
    "gang_ghost_days": 30,
}
# Illegal / cash-only activities (payment classification)
ILLEGAL_ITEM_TYPES = {"bm_medicine", "crate", "drone"}
ILLEGAL_ACTIONS = {"blackmarket", "contraband", "vehicle", "bribe"}

def max_health(level):
    return CONFIG["base_health"] + (level - 1) * CONFIG["health_per_level"]

def max_stamina(level):
    return CONFIG["base_stamina"] + (level - 1) * CONFIG["stamina_per_level"]

# Explicit per-vehicle crew capacity overrides (fall back to category map)
VEHICLE_CAP = {"starter": 2, "compact_x": 2, "hatchback": 2, "nightfall": 2, "chrome_r": 2,
               "neon_bike": 2, "muscle_v8": 4, "phantom_s": 4, "hypercar": 2, "prototype_x": 4,
               "armored_suv": 6, "stealth_van": 6, "riot_truck": 8}

def vehicle_capacity(veh_meta):
    if not veh_meta:
        return 2
    if veh_meta.get("id") in VEHICLE_CAP:
        return VEHICLE_CAP[veh_meta["id"]]
    return CONFIG["vehicle_capacity_by_cat"].get(veh_meta.get("cat"), 2)

def vehicle_max_durability(veh_meta):
    """Max durability scales significantly with price. Cheap ~120, top-tier ~600."""
    if not veh_meta:
        return 100
    return int(100 + min(500, (veh_meta.get("price", 0) / 220000) * 500))

def vehicle_wear(veh_meta, difficulty):
    """Gradual wear per heist. Heavier heists wear a bit more; expensive vehicles wear less."""
    dur = vehicle_max_durability(veh_meta)
    base = 4 + difficulty * 0.8            # ~4.8 .. 12 wear points
    factor = 100 / dur                     # expensive (high dur) -> smaller fraction
    return max(1, int(round(base * factor)))

def heat_level(heat):
    if heat <= 25: return "Low"
    if heat <= 50: return "Medium"
    if heat <= 75: return "High"
    return "Critical"

def allowed_payment_methods(kind):
    """kind: 'legal' | 'illegal' | 'bail'"""
    if kind == "illegal":
        return ["cash"]
    if kind == "bail":
        return ["cash", "bank"]
    return ["cash", "bank"]  # legal default

# Heist "context" drives which specialization & drone focus matter most.
HEIST_CONTEXT = {
    "op_convenience": "combat", "op_atm": "combat", "op_gasstation": "combat",
    "op_street_drug": "combat", "op_armored": "combat",
    "op_jewelry": "stealth", "op_warehouse": "stealth", "op_penthouse": "stealth",
    "op_casino": "tech", "op_bank": "tech", "op_datacenter": "tech",
}
# Which specializations are most valuable for a given context.
CONTEXT_SPECS = {
    "combat": {"shooter", "driver"},
    "stealth": {"infiltrator", "negotiator"},
    "tech": {"hacker", "technician"},
}

def compute_success_chance(user, heist, crew_ids, vehicle_id, drone_id=None, player_crew=None):
    """Dynamic success chance. Returns (chance_float_0_1, breakdown_dict). Never returns 1.0."""
    player_crew = player_crew or []
    context = HEIST_CONTEXT.get(heist["id"], "combat")
    relevant = CONTEXT_SPECS.get(context, set())
    crew_data = [find_item(NPCS, cid) for cid in crew_ids if find_item(NPCS, cid)]
    veh_data = find_item(VEHICLES, vehicle_id)
    cap = vehicle_capacity(veh_data)
    difficulty = heist["difficulty"]
    total_crew = 1 + len(crew_data) + len(player_crew)

    base = 0.34
    b = {}
    b["level"] = min(0.15, max(0, user["level"] - heist["min_level"]) * 0.012)
    b["crew"] = min(0.18, len(crew_data) * 0.02 + len(player_crew) * 0.045)  # players contribute more
    # specialization relevance (player + crew)
    specs = {user.get("specialization")} | {c["spec"] for c in crew_data}
    spec_hits = len(specs & relevant)
    b["spec"] = min(0.16, spec_hits * 0.08)
    b["vehicle"] = min(0.12, veh_data["escape"] / 1000) if veh_data else 0
    # capacity: enough seats for whole crew improves; over-capacity slight
    b["capacity"] = 0.04 if cap >= total_crew else -0.15
    b["difficulty"] = -difficulty * 0.028
    b["heat"] = -min(0.22, user.get("heat", 0) / 100 * 0.28)
    b["reputation"] = min(0.08, user.get("reputation", 0) / 4000)
    # drone contextual synergy
    b["drone"] = 0
    if drone_id:
        drone = find_item(DRONES, drone_id)
        if drone:
            match = 1.0 if drone["focus"] == context else 0.45
            b["drone"] = round(drone["boost"] * match, 4)
    chance = base + sum(b.values())
    chance = max(0.05, min(0.92, chance))  # never guaranteed
    return chance, {"base": base, "context": context, "capacity_ok": cap >= total_crew, "cap": cap, "needed": total_crew, **b}

# ========== HELPERS ==========
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(401, "User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        ensure_defaults(user)
        changed = apply_regen(user)
        await db.users.update_one({"id": user["id"]}, {"$set": changed})
        return user
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

def xp_for_level(lvl: int) -> int:
    return 1000 + (lvl - 1) * 500

def check_level_up(user: dict) -> dict:
    while user["xp"] >= xp_for_level(user["level"]):
        user["xp"] -= xp_for_level(user["level"])
        user["level"] += 1
    return user

# Centralized XP grant. Heists give high XP directly; everything else routes here for
# small, exploit-resistant gains. `spend`/`wager` based sources scale with real money moved
# (finite resource) so spamming cheap actions yields ~0 XP.
def grant_xp(user: dict, amount: int):
    amt = max(0, int(amount))
    if amt <= 0:
        return user
    user["xp"] = user.get("xp", 0) + amt
    return check_level_up(user)

# XP tuning (small vs heists). Purchases/casino scale with money moved; capped per action.
XP_RULES = {
    "purchase_per_1k": 1,      # 1 XP per $1,000 spent on gear/items
    "purchase_cap": 60,        # max XP from a single purchase
    "purchase_min_spend": 1000,# below this spend, no XP (blocks cheap-item spam)
    "casino_per_1k_wager": 1,  # 1 XP per $1,000 wagered
    "casino_cap": 20,          # max XP per casino game
    "raid_win": 45,            # medium XP for a successful raid
    "raid_loss": 8,            # small XP for a failed raid attempt
    "gang_assist": 10,         # bonus XP when raiding with gang allies
}

def purchase_xp(spend: int) -> int:
    if spend < XP_RULES["purchase_min_spend"]:
        return 0
    return min(XP_RULES["purchase_cap"], (spend // 1000) * XP_RULES["purchase_per_1k"])

def power_score(u: dict) -> float:
    """Relative strength for PvP matchmaking. Uses progression already in the game."""
    eq = u.get("equipped", {}) or {}
    wid = eq.get("primary") or eq.get("secondary") or eq.get("melee")
    w = find_item(WEAPONS, wid) if wid else None
    wdmg = w["damage"] if w else 8
    aid = eq.get("armor")
    a = find_item(ARMORS, aid) if aid else None
    ar = a["damage_reduction"] if a else 0
    return u.get("level", 1) * 8 + wdmg + ar + u.get("reputation", 0) * 0.25


def find_item(items: list, iid: str):
    for it in items:
        if it["id"] == iid:
            return it
    return None

def apply_regen(user: dict):
    """Applies time-based Health & Stamina regeneration. Mutates user, returns dict of changed fields."""
    now = datetime.now(timezone.utc)
    last = user.get("last_regen_tick")
    if last:
        try:
            hours = (now - datetime.fromisoformat(last)).total_seconds() / 3600
        except Exception:
            hours = 0
    else:
        hours = 0
    hours = max(0, min(hours, 72))
    mh = max_health(user.get("level", 1))
    ms = max_stamina(user.get("level", 1))
    health = user.get("health", 100)
    stamina = user.get("stamina", ms)
    food_buf = user.get("food_buffer", 0)
    if hours > 0 and not user.get("prison"):
        # natural slow regen
        health += CONFIG["natural_health_regen_per_hour"] * hours
        # food buffer drains into health
        if food_buf > 0:
            drain = min(food_buf, CONFIG["food_regen_per_hour"] * hours)
            health += drain
            food_buf -= drain
        stamina += CONFIG["stamina_regen_per_hour"] * hours
    health = int(max(0, min(mh, health)))
    stamina = int(max(0, min(ms, stamina)))
    food_buf = int(max(0, food_buf))
    user["health"] = health
    user["stamina"] = stamina
    user["health_max"] = mh
    user["stamina_max"] = ms
    user["food_buffer"] = food_buf
    user["heat_level"] = heat_level(user.get("heat", 0))
    user["last_regen_tick"] = now.isoformat()
    return {"health": health, "stamina": stamina, "food_buffer": food_buf, "last_regen_tick": now.isoformat(), "health_max": mh, "stamina_max": ms}

def ensure_defaults(user: dict):
    user.setdefault("armors", [])
    user.setdefault("properties", [])
    user.setdefault("businesses", [])
    user.setdefault("bank", 0)
    user.setdefault("hired_crew", [])
    user.setdefault("weapons", [])
    user.setdefault("vehicles", [])
    user.setdefault("ammo", {"pistol": 0, "smg": 0, "rifle": 0, "shotgun": 0, "sniper": 0, "special": 0})
    user.setdefault("equipped", {"primary": None, "secondary": None, "melee": None, "armor": None, "vehicle": "starter"})
    user.setdefault("inventory", {})           # {item_id: qty}
    user.setdefault("drones", {})              # {drone_id: qty}
    user.setdefault("stamina", max_stamina(user.get("level", 1)))
    user.setdefault("food_buffer", 0)
    user.setdefault("gang_id", None)
    user.setdefault("prison", None)            # {until, bail, reason} or None
    user.setdefault("friends", [])
    user.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    stats = user.get("stats", {})
    for k, v in {"ops_completed": 0, "ops_failed": 0, "enemies_killed": 0, "times_shot": 0, "crew_lost": 0, "total_earnings": 0, "total_spent": 0, "business_income": 0, "fines_paid": 0, "raids_survived": 0, "gang_heists": 0, "times_arrested": 0}.items():
        stats.setdefault(k, v)
    user["stats"] = stats

# ========== MODELS ==========
class SignupIn(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=6)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class CharacterIn(BaseModel):
    avatar_id: str
    specialization: str

class BuyIn(BaseModel):
    item_id: str

class EquipIn(BaseModel):
    item_id: Optional[str] = None  # None/omitted = unequip (not allowed for vehicle)
    slot: str  # primary | secondary | melee | armor | vehicle

class AmmoIn(BaseModel):
    ammo_type: str
    quantity: int

class RepairIn(BaseModel):
    vehicle_id: str

class HireIn(BaseModel):
    npc_id: str

class HeistIn(BaseModel):
    heist_id: str
    crew_ids: List[str] = []
    vehicle_id: str
    drone_id: Optional[str] = None
    player_ids: List[str] = []  # invited friends (real players) that accepted
    choice: Optional[str] = None  # interactive decision key (None = phase 1 briefing)
    t0: int = 0  # narrative clock offset carried from phase 1

class BankIn(BaseModel):
    amount: int

class RaidIn(BaseModel):
    target_username: str
    property_id: str
    crew_ids: List[str] = []
    ally_ids: List[str] = []

class BgIn(BaseModel):
    section: str
    url: str = ""

# ========== AUTH ==========
@api.post("/auth/signup")
async def signup(data: SignupIn):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    if await db.users.find_one({"username": data.username}):
        raise HTTPException(400, "Username taken")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "email": email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "avatar_id": None,
        "specialization": None,
        "level": 1,
        "xp": 0,
        "money": 800,
        "reputation": 0,
        "heat": 0,
        "health": 100,
        "stamina": max_stamina(1),
        "health_max": max_health(1),
        "stamina_max": max_stamina(1),
        "food_buffer": 0,
        "inventory": {},
        "drones": {},
        "gang_id": None,
        "prison": None,
        "friends": [],
        "last_regen_tick": datetime.now(timezone.utc).isoformat(),
        "weapons": [],
        "armors": [],
        "vehicles": [{"id": "starter", "condition": 100, "instance_id": str(uuid.uuid4())}],
        "ammo": {"pistol": 20, "smg": 0, "rifle": 0, "shotgun": 0, "sniper": 0, "special": 0},
        "equipped": {"primary": None, "secondary": None, "melee": None, "armor": None, "vehicle": "starter"},
        "hired_crew": [],
        "properties": [],
        "businesses": [],
        "bank": 0,
        "last_tick": datetime.now(timezone.utc).isoformat(),
        "stats": {"ops_completed": 0, "ops_failed": 0, "enemies_killed": 0, "times_shot": 0, "crew_lost": 0, "total_earnings": 0, "total_spent": 0, "business_income": 0, "fines_paid": 0, "raids_survived": 0},
    }
    await db.users.insert_one(user)
    token = create_token(uid)
    user.pop("_id", None); user.pop("password_hash", None)
    return {"token": token, "user": user}

@api.post("/auth/login")
async def login(data: LoginIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"])
    user.pop("_id", None); user.pop("password_hash", None)
    ensure_defaults(user)
    changed = apply_regen(user)
    await db.users.update_one({"id": user["id"]}, {"$set": changed})
    return {"token": token, "user": user}

@api.get("/auth/me")
async def me(request: Request):
    return await get_current_user(request)

# ========== CHARACTER ==========
@api.post("/character/create")
async def create_character(data: CharacterIn, request: Request):
    user = await get_current_user(request)
    if data.specialization not in [s["id"] for s in SPECIALIZATIONS]:
        raise HTTPException(400, "Invalid specialization")
    await db.users.update_one({"id": user["id"]}, {"$set": {"avatar_id": data.avatar_id, "specialization": data.specialization}})
    updated = await db.users.find_one({"id": user["id"]})
    updated.pop("_id", None); updated.pop("password_hash", None)
    return updated

# ========== CATALOG ==========
@api.get("/catalog")
async def catalog():
    vehicles = [{**v, "capacity": vehicle_capacity(v), "max_durability": vehicle_max_durability(v)} for v in VEHICLES]
    heists = [{**h, "stamina_cost": CONFIG["heist_stamina_cost"].get(h["type"], 20), "crew_max": CONFIG["heist_crew_max"].get(h["type"], 4), "cooldown": h.get("cooldown", 180)} for h in HEISTS]
    return {"specializations": SPECIALIZATIONS, "weapons": WEAPONS, "armors": ARMORS, "vehicles": vehicles, "npcs": NPCS, "heists": heists, "districts": DISTRICTS, "ammo_prices": AMMO_PRICES, "properties": PROPERTIES, "businesses": BUSINESSES,
            "food": FOOD_ITEMS, "drinks": DRINK_ITEMS, "medicine": MEDICINE_ITEMS, "blackmarket_items": BLACKMARKET_ITEMS, "drones": DRONES, "config": CONFIG}

# ========== CONTRABAND BLACK MARKET ==========
CONTRABAND = [
    {"id": "tobacco", "name": "Bootleg Tobacco", "base": 25, "unit": "carton", "color": "#F59E0B", "img": "crate_tobacco"},
    {"id": "weed", "name": "Weed", "base": 45, "unit": "oz", "color": "#22C55E", "img": "crate_weed"},
    {"id": "alcohol", "name": "Moonshine", "base": 70, "unit": "crate", "color": "#38BDF8", "img": "crate_alcohol"},
    {"id": "counterfeit", "name": "Counterfeit Cash", "base": 320, "unit": "stack", "color": "#A855F7", "img": "crate_counterfeit"},
    {"id": "cocaine", "name": "Cocaine", "base": 950, "unit": "kg", "color": "#EC4899", "img": "crate_cocaine"},
]
CONTRABAND_PERIOD = 3 * 3600  # prices refresh every 3 hours

def _contraband_window():
    import time as _t
    return int(_t.time() // CONTRABAND_PERIOD)

def _contraband_price(good_id, base, window):
    import hashlib
    h = int(hashlib.sha256(f"{good_id}:{window}".encode()).hexdigest(), 16)
    factor = 0.45 + (h % 1000) / 1000.0 * 1.35  # ranges ~0.45x .. ~1.8x
    return max(1, int(round(base * factor)))

def _contraband_prices():
    w = _contraband_window()
    return {g["id"]: _contraband_price(g["id"], g["base"], w) for g in CONTRABAND}

class ContrabandTrade(BaseModel):
    good_id: str
    quantity: int

@api.get("/market/contraband")
async def market_contraband(request: Request):
    import time as _t
    user = await get_current_user(request)
    w = _contraband_window()
    seconds_left = int((w + 1) * CONTRABAND_PERIOD - _t.time())
    return {"goods": CONTRABAND, "prices": _contraband_prices(), "holdings": user.get("contraband", {}), "seconds_to_refresh": seconds_left, "period_hours": 3}

@api.post("/market/buy-contraband")
async def buy_contraband(data: ContrabandTrade, request: Request):
    user = await get_current_user(request)
    g = find_item(CONTRABAND, data.good_id)
    if not g:
        raise HTTPException(404, "Unknown good")
    qty = min(10000, max(1, int(data.quantity)))
    cost = _contraband_prices()[g["id"]] * qty
    if user["money"] < cost:
        raise HTTPException(400, "Not enough cash")
    holdings = user.get("contraband", {})
    holdings[g["id"]] = holdings.get(g["id"], 0) + qty
    user["money"] -= cost
    user["stats"]["total_spent"] = user["stats"].get("total_spent", 0) + cost
    check_level_up(user)
    await db.users.update_one({"id": user["id"]}, {"$set": {"contraband": holdings, "money": user["money"], "xp": user["xp"], "level": user["level"], "stats": user["stats"]}})
    return {"ok": True, "money": user["money"], "xp": user["xp"], "level": user["level"], "contraband": holdings}

@api.post("/market/sell-contraband")
async def sell_contraband(data: ContrabandTrade, request: Request):
    user = await get_current_user(request)
    g = find_item(CONTRABAND, data.good_id)
    if not g:
        raise HTTPException(404, "Unknown good")
    holdings = user.get("contraband", {})
    have = holdings.get(g["id"], 0)
    qty = min(10000, max(1, int(data.quantity)))
    if have < qty:
        raise HTTPException(400, "Not enough to sell")
    gain = _contraband_prices()[g["id"]] * qty
    holdings[g["id"]] = have - qty
    user["money"] += gain
    user["stats"]["total_earnings"] = user["stats"].get("total_earnings", 0) + gain
    # XP is only granted here (on completed sell), not on buy, so a buy+sell
    # round trip can no longer be farmed for double XP regardless of profit.
    user["xp"] += min(20, max(1, qty // 2))
    check_level_up(user)
    await db.users.update_one({"id": user["id"]}, {"$set": {"contraband": holdings, "money": user["money"], "xp": user["xp"], "level": user["level"], "stats": user["stats"]}})
    return {"ok": True, "money": user["money"], "xp": user["xp"], "level": user["level"], "contraband": holdings}


# ========== PLAYER STATE ==========
@api.get("/player/state")
async def player_state(request: Request):
    return await get_current_user(request)

@api.post("/player/buy-weapon")
async def buy_weapon(data: BuyIn, request: Request):
    user = await get_current_user(request)
    w = find_item(WEAPONS, data.item_id)
    if not w:
        raise HTTPException(404, "Weapon not found")
    if user["money"] < w["price"]:
        raise HTTPException(400, "Not enough money")
    weapons = user["weapons"]
    existing = next((x for x in weapons if x["id"] == data.item_id), None)
    if existing:
        existing["qty"] += 1
    else:
        weapons.append({"id": data.item_id, "qty": 1})
    new_money = user["money"] - w["price"]
    new_spent = user["stats"]["total_spent"] + w["price"]
    xp = purchase_xp(w["price"]); user = grant_xp(user, xp)
    await db.users.update_one({"id": user["id"]}, {"$set": {"weapons": weapons, "money": new_money, "stats.total_spent": new_spent, "xp": user["xp"], "level": user["level"]}})
    return {"ok": True, "money": new_money, "weapons": weapons, "xp": xp}

@api.post("/player/buy-armor")
async def buy_armor(data: BuyIn, request: Request):
    user = await get_current_user(request)
    a = find_item(ARMORS, data.item_id)
    if not a:
        raise HTTPException(404, "Armor not found")
    if user["money"] < a["price"]:
        raise HTTPException(400, "Not enough money")
    armors = user["armors"]
    ex = next((x for x in armors if x["id"] == data.item_id), None)
    if ex: ex["qty"] += 1
    else: armors.append({"id": data.item_id, "qty": 1})
    new_money = user["money"] - a["price"]
    xp = purchase_xp(a["price"]); user = grant_xp(user, xp)
    await db.users.update_one({"id": user["id"]}, {"$set": {"armors": armors, "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + a["price"], "xp": user["xp"], "level": user["level"]}})
    return {"ok": True, "money": new_money, "armors": armors, "xp": xp}

@api.post("/player/buy-vehicle")
async def buy_vehicle(data: BuyIn, request: Request):
    user = await get_current_user(request)
    v = find_item(VEHICLES, data.item_id)
    if not v:
        raise HTTPException(404, "Vehicle not found")
    if user["money"] < v["price"]:
        raise HTTPException(400, "Not enough money")
    vehicles = user["vehicles"]
    vehicles.append({"id": data.item_id, "condition": 100, "instance_id": str(uuid.uuid4())})
    new_money = user["money"] - v["price"]
    xp = purchase_xp(v["price"]); user = grant_xp(user, xp)
    await db.users.update_one({"id": user["id"]}, {"$set": {"vehicles": vehicles, "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + v["price"], "xp": user["xp"], "level": user["level"]}})
    return {"ok": True, "money": new_money, "vehicles": vehicles, "xp": xp}

@api.post("/player/equip")
async def equip(data: EquipIn, request: Request):
    user = await get_current_user(request)
    slot = data.slot
    equipped = user["equipped"]
    if slot not in equipped:
        raise HTTPException(400, "Invalid slot")
    if slot == "vehicle":
        if not data.item_id or not any(v["id"] == data.item_id for v in user["vehicles"]):
            raise HTTPException(400, "Vehicle not owned")
        equipped[slot] = data.item_id
    elif not data.item_id:
        # Unequip: armor and weapon slots can be cleared, vehicle cannot.
        equipped[slot] = None
    elif slot == "armor":
        if not any(a["id"] == data.item_id for a in user["armors"]):
            raise HTTPException(400, "Armor not owned")
        equipped[slot] = data.item_id
    else:
        w = find_item(WEAPONS, data.item_id)
        if not w or w["slot"] != slot:
            raise HTTPException(400, "Weapon can't be equipped in this slot")
        if not any(x["id"] == data.item_id for x in user["weapons"]):
            raise HTTPException(400, "Weapon not owned")
        equipped[slot] = data.item_id
    await db.users.update_one({"id": user["id"]}, {"$set": {"equipped": equipped}})
    return {"ok": True, "equipped": equipped}

@api.post("/player/buy-ammo")
async def buy_ammo(data: AmmoIn, request: Request):
    user = await get_current_user(request)
    if data.ammo_type not in AMMO_PRICES:
        raise HTTPException(400, "Invalid ammo type")
    if data.quantity <= 0 or data.quantity > 5000:
        raise HTTPException(400, "Invalid quantity")
    total = AMMO_PRICES[data.ammo_type] * data.quantity
    if user["money"] < total:
        raise HTTPException(400, "Not enough money")
    ammo = user["ammo"]
    ammo[data.ammo_type] = ammo.get(data.ammo_type, 0) + data.quantity
    new_money = user["money"] - total
    await db.users.update_one({"id": user["id"]}, {"$set": {"ammo": ammo, "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + total}})
    return {"ok": True, "money": new_money, "ammo": ammo}

@api.post("/player/repair")
async def repair(data: RepairIn, request: Request):
    user = await get_current_user(request)
    veh = next((v for v in user["vehicles"] if v.get("instance_id") == data.vehicle_id or v["id"] == data.vehicle_id), None)
    if not veh:
        raise HTTPException(404, "Vehicle not found")
    dmg = 100 - veh["condition"]
    cost = dmg * 50
    if user["money"] < cost:
        raise HTTPException(400, "Not enough money")
    veh["condition"] = 100
    new_money = user["money"] - cost
    await db.users.update_one({"id": user["id"]}, {"$set": {"vehicles": user["vehicles"], "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + cost}})
    return {"ok": True, "money": new_money, "cost": cost}

@api.post("/player/heal")
async def heal(request: Request):
    user = await get_current_user(request)
    missing = 100 - user["health"]
    cost = missing * 25
    if user["money"] < cost:
        raise HTTPException(400, "Not enough money")
    new_money = user["money"] - cost
    await db.users.update_one({"id": user["id"]}, {"$set": {"health": 100, "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + cost}})
    return {"ok": True, "money": new_money, "health": 100, "cost": cost}

@api.post("/player/hire-crew")
async def hire_crew(data: HireIn, request: Request):
    user = await get_current_user(request)
    npc = find_item(NPCS, data.npc_id)
    if not npc:
        raise HTTPException(404, "NPC not found")
    if data.npc_id in user["hired_crew"]:
        raise HTTPException(400, "Already hired")
    if user["money"] < npc["hire_cost"]:
        raise HTTPException(400, "Not enough money")
    hired = user["hired_crew"] + [data.npc_id]
    new_money = user["money"] - npc["hire_cost"]
    await db.users.update_one({"id": user["id"]}, {"$set": {"hired_crew": hired, "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + npc["hire_cost"]}})
    return {"ok": True, "money": new_money, "hired_crew": hired}

# ========== HEIST SIMULATION ==========
DISTRICT_FLAVOR = {
    "downtown": "the neon-drowned downtown grid",
    "old_town": "the cracked backstreets of Old Town",
    "north_side": "the North Side sprawl",
    "upper_east": "the gilded Upper East district",
    "industrial": "the rusted Industrial belt",
    "docks": "the fog-choked Docks",
    "black_island": "fortified Black Island",
}

# Interactive decision presented mid-run, chosen by the operation's context.
HEIST_DECISIONS = {
    "tech": {
        "id": "ice",
        "prompt": "Deep inside the network, the intrusion countermeasures start adapting faster than your intel promised. You have seconds to call it.",
        "options": [
            {"key": "brute", "label": "BRUTE-FORCE THE CORE", "hint": "Rip the data now — louder, faster. Bigger payout, higher risk."},
            {"key": "spoof", "label": "SPOOF & SLIP OUT CLEAN", "hint": "Cover your tracks and extract quietly. Safer, smaller take."},
        ],
    },
    "stealth": {
        "id": "patrol",
        "prompt": "A guard rotation shifts early and a gap cracks open in the patrol pattern. It won't last.",
        "options": [
            {"key": "rush", "label": "TAKE THE WHOLE SCORE NOW", "hint": "Grab everything while the gap holds. Riskier, richer."},
            {"key": "slip", "label": "STAY GHOST — TAKE WHAT'S SAFE", "hint": "Lift only the easy reach and vanish. Safer, smaller."},
        ],
    },
    "combat": {
        "id": "front",
        "prompt": "Security is thicker than the intel said. More bodies, more guns, and they're getting organized.",
        "options": [
            {"key": "hard", "label": "HIT HARD AND FAST", "hint": "Overwhelm them before they set up. Bigger, bloodier, riskier."},
            {"key": "low", "label": "KEEP IT CONTROLLED", "hint": "Measured force, careful angles. Safer, smaller take."},
        ],
    },
}
CHOICE_AGGRO = {"brute", "rush", "hard"}
CHOICE_SAFE = {"spoof", "slip", "low"}


def _heist_common(user, heist, crew_ids, vehicle_id, drone_id, player_crew):
    """Shared context gathering for both phases."""
    spec = user["specialization"]
    weapon_id = user["equipped"].get("primary") or user["equipped"].get("secondary") or user["equipped"].get("melee")
    weapon = find_item(WEAPONS, weapon_id) if weapon_id else None
    veh_data = find_item(VEHICLES, vehicle_id)
    armor_id = user["equipped"].get("armor")
    armor = find_item(ARMORS, armor_id) if armor_id else None
    crew_data = [find_item(NPCS, cid) for cid in crew_ids if find_item(NPCS, cid)]
    drone_meta = find_item(DRONES, drone_id) if drone_id else None
    chance, breakdown = compute_success_chance(user, heist, crew_ids, vehicle_id, drone_id, player_crew or [])
    context = breakdown["context"]
    specs_available = {spec} | {c["spec"] for c in crew_data}
    return {
        "spec": spec, "weapon": weapon, "veh_data": veh_data, "armor": armor,
        "crew_data": crew_data, "drone_meta": drone_meta, "chance": chance,
        "breakdown": breakdown, "context": context, "specs_available": specs_available,
    }


def heist_briefing(user, heist, crew_ids, vehicle_id, drone_id, player_crew):
    """Phase 1: approach + entry narrative and the interactive decision. No state change."""
    ctx = _heist_common(user, heist, crew_ids, vehicle_id, drone_id, player_crew)
    specs = ctx["specs_available"]; context = ctx["context"]
    veh_data = ctx["veh_data"]; drone_meta = ctx["drone_meta"]
    heat = user.get("heat", 0)
    events = []
    t = [random.randint(2, 6)]
    def add(msg, cat="info"):
        t[0] += random.randint(2, 7)
        mm, ss = divmod(t[0], 60)
        events.append({"time": f"{mm:02d}:{ss:02d}", "msg": msg, "cat": cat})

    district = DISTRICT_FLAVOR.get(heist["district"], "the city")
    # --- Approach ---
    add(f"Crew rolls out toward {district}.", "info")
    if veh_data:
        if veh_data.get("escape", 0) >= 75:
            add(f"The {veh_data['name']} slides into the shadows two blocks out — engine barely a whisper.", "info")
        elif veh_data.get("escape", 0) <= 45:
            add(f"The {veh_data['name']} grumbles into position; not subtle, but it's what you've got.", "warn")
        else:
            add(f"The {veh_data['name']} eases into a blind spot near the target.", "info")
    if heat >= 60:
        add("Patrol density is brutal tonight — the whole grid is watching. Heat is working against you.", "bad")
    elif heat >= 30:
        add("Extra units are cruising the area. Stay tight.", "warn")
    if drone_meta:
        add(f"{drone_meta['name']} lifts off for overwatch, feeding you a live map.", "info")

    # --- Entry (reacts to specialization mix vs context) ---
    if context == "tech":
        if "hacker" in specs:
            add("Hacker jacks into the building's netgrid and loops the camera feeds.", "good")
        if "technician" in specs:
            add("Technician spikes the alarm relay before it can phone home.", "good")
        if not (specs & {"hacker", "technician"}):
            add("No specialist for the systems here — you're going in half-blind.", "bad")
    elif context == "stealth":
        if "infiltrator" in specs:
            add("Infiltrator ghosts through the service entrance, killing motion sensors one by one.", "good")
        if "negotiator" in specs:
            add("Negotiator talks a night guard into looking the other way.", "good")
        if not (specs & {"infiltrator", "negotiator"}):
            add("No one trained for a quiet entry — every step feels loud.", "bad")
    else:  # combat
        if "shooter" in specs:
            add("Shooter takes point, weapon up, clearing the entry.", "good")
        if "driver" in specs:
            add("Driver keeps the engine hot at the curb, eyes on every mirror.", "good")
        if not (specs & {"shooter", "driver"}):
            add("Crew stacks on the door with more nerve than skill.", "warn")
    add("You're inside. Clock's running.", "info")

    decision = HEIST_DECISIONS.get(context, HEIST_DECISIONS["combat"])
    return {
        "phase": "decision",
        "events": events,
        "decision": decision,
        "success_chance": round(ctx["chance"], 3),
        "context": context,
        "t_end": t[0],
    }


def resolve_heist(user, heist, crew_ids, vehicle_id, drone_id, player_crew, choice, t0=0):
    """Phase 2: apply the decision, roll the outcome, and generate the complication + escape."""
    player_crew = player_crew or []
    ctx = _heist_common(user, heist, crew_ids, vehicle_id, drone_id, player_crew)
    specs_available = ctx["specs_available"]; context = ctx["context"]
    weapon = ctx["weapon"]; veh_data = ctx["veh_data"]; armor = ctx["armor"]
    crew_data = ctx["crew_data"]; drone_meta = ctx["drone_meta"]
    difficulty = heist["difficulty"]
    base = ctx["chance"]

    events = []
    t = [max(t0, 0) + random.randint(2, 6)]
    def add(msg, cat="info"):
        t[0] += random.randint(2, 8)
        mm, ss = divmod(t[0], 60)
        events.append({"time": f"{mm:02d}:{ss:02d}", "msg": msg, "cat": cat})

    # --- Apply the interactive decision ---
    aggro = choice in CHOICE_AGGRO
    safe = choice in CHOICE_SAFE
    reward_bias = 0.20 if aggro else (-0.12 if safe else 0.0)
    capture_bias = 0.06 if aggro else (-0.05 if safe else 0.0)
    hp_bias = 1.15 if aggro else (0.9 if safe else 1.0)
    base_adj = base + (-0.06 if aggro else (0.07 if safe else 0.0))
    base_adj = max(0.05, min(0.92, base_adj))

    decision_lines = {
        "brute": "You slam the core and start ripping data — every siren in the district could light up now.",
        "spoof": "You feed the system a ghost and back out clean, taking only what's safe.",
        "rush": "You break cover and sweep the whole score while the gap holds.",
        "slip": "You stay a shadow, lifting only what won't be missed, and melt back.",
        "hard": "You hit them hard and fast, no hesitation, all momentum.",
        "low": "You keep it surgical — controlled bursts, careful angles, no wasted motion.",
    }
    if choice in decision_lines:
        add(decision_lines[choice], "warn" if aggro else "info")

    roll = random.random()
    if roll < base_adj - 0.35:
        outcome = "PERFECT SUCCESS"; mult = 1.5; rep_mult = 2.0; hp_loss_pct = 0.08
    elif roll < base_adj - 0.15:
        outcome = "SUCCESS"; mult = 0.9; rep_mult = 1.0; hp_loss_pct = 0.22
    elif roll < base_adj + 0.10:
        outcome = "PARTIAL SUCCESS"; mult = 0.45; rep_mult = 0.4; hp_loss_pct = 0.45
    elif roll < base_adj + 0.30:
        outcome = "FAILED"; mult = 0.0; rep_mult = -0.15; hp_loss_pct = 0.65
    else:
        outcome = "DISASTER"; mult = 0.0; rep_mult = -0.30; hp_loss_pct = 0.95

    # --- Combat / complication beats (varied by context, outcome AND equipped weapon) ---
    enemies_killed = 0
    times_shot = 0
    ammo_ref = [0]
    hostile = "a guard" if context != "combat" else "a hostile"
    is_firearm = bool(weapon and weapon.get("ammo_type"))
    is_melee = bool(weapon and weapon.get("cat") == "melee")
    wid = weapon["id"] if weapon else None
    ammo_type = weapon.get("ammo_type") if weapon else None
    ammo_avail = user["ammo"].get(ammo_type, 0) if ammo_type else 0

    def takedown():
        """One enemy neutralised — text and ammo match the equipped weapon.
        Ammo is only spent on real firearm actions, and never below what the player carries."""
        if is_firearm:
            rounds = random.randint(2, 6)
            if ammo_ref[0] + rounds <= ammo_avail:
                ammo_ref[0] += rounds
                add(random.choice(WEAPON_FLAVOR.get(wid) or FALLBACK_GUN).format(h=hostile, n=rounds), "combat")
            else:
                # firearm ran dry mid-fight — improvise, no ammo consumed
                add(random.choice(OUT_OF_AMMO).format(h=hostile), "combat")
        elif is_melee:
            add(random.choice(WEAPON_FLAVOR.get(wid) or FALLBACK_MELEE).format(h=hostile), "combat")
        else:
            add(random.choice(FALLBACK_UNARMED).format(h=hostile), "combat")

    if outcome == "PERFECT SUCCESS":
        add(random.choice([
            "It goes like clockwork — the crew moves as one.",
            "Every angle covered. They never see you coming.",
            "Textbook. In and through before anyone reacts.",
        ]), "good")
        if context == "combat":
            enemies_killed = random.randint(1, 2 + difficulty // 2)
            for _ in range(enemies_killed): takedown()
    elif outcome == "SUCCESS":
        enemies_killed = random.randint(1, 3 + difficulty // 2)
        for _ in range(enemies_killed): takedown()
        if random.random() < (0.5 if aggro else 0.3):
            times_shot += 1; add("A round clips you — you keep moving.", "bad")
    elif outcome == "PARTIAL SUCCESS":
        enemies_killed = random.randint(1, 4)
        times_shot = random.randint(1, 2)
        add("It gets messy — the score is only half in reach.", "warn")
        for _ in range(enemies_killed): takedown()
        for _ in range(times_shot): add("You take a hit and stagger.", "bad")
        add("Alarms are screaming now.", "warn")
    elif outcome == "FAILED":
        enemies_killed = random.randint(0, 2)
        times_shot = random.randint(2, 4)
        add("It falls apart fast.", "bad")
        for _ in range(enemies_killed): takedown()
        for _ in range(times_shot): add("Rounds tear into you.", "bad")
        add("Crew member down.", "bad")
        add("Sirens closing from every street.", "bad")
    else:  # DISASTER
        times_shot = random.randint(3, 6)
        add("Everything that can go wrong, does.", "bad")
        for _ in range(times_shot): add("You're hit — badly.", "bad")
        add("Crew member down.", "bad")
        if len(crew_data) >= 2: add("Crew member down.", "bad")
        add("Exits are sealed. Lockdown deployed.", "bad")

    # --- Escape (reacts to driver / vehicle / outcome) ---
    if outcome in ("PERFECT SUCCESS", "SUCCESS", "PARTIAL SUCCESS"):
        add("Score secured — cash and product in the bags.", "good")
    if outcome in ("PERFECT SUCCESS", "SUCCESS"):
        if "driver" in specs_available:
            add("Driver threads an alternate route through the backstreets.", "good")
        elif veh_data and veh_data.get("escape", 0) >= 75:
            add(f"The {veh_data['name']} eats the distance and loses the tail.", "good")
        add("Police lose the trail in the neon haze.", "good")
        add("Clean extraction. You're ghosts again.", "good")
    elif outcome == "PARTIAL SUCCESS":
        add(f"The {veh_data['name'] if veh_data else 'getaway car'} takes damage smashing through the cordon.", "warn")
        add("You break the perimeter — barely. Half the score, but you're breathing.", "warn")
    elif outcome == "FAILED":
        add("You bail with nothing. Operation aborted.", "bad")
    else:
        add("Down and surrounded. Catastrophic failure.", "bad")

    # --- Rewards & deltas ---
    base_cash = random.randint(heist["reward_min"], heist["reward_max"])
    cash = int(base_cash * mult * (1 + (reward_bias if mult > 0 else 0)))
    xp = int((heist["reward_min"] / 8) * (mult if mult > 0 else 0.2))
    rep = int(heist["difficulty"] * 3 * rep_mult)
    heat_gain = heist["heat_gain"] if mult >= 0.5 else int(heist["heat_gain"] * 1.5)
    if outcome == "PERFECT SUCCESS": heat_gain = int(heat_gain * 0.5)
    if aggro: heat_gain = int(heat_gain * 1.2)

    hp_loss = int(100 * hp_loss_pct * hp_bias)
    if armor:
        hp_loss = int(hp_loss * (1 - armor["damage_reduction"] / 100))
    veh_dmg = vehicle_wear(veh_data, difficulty)
    if outcome == "PARTIAL SUCCESS": veh_dmg = int(veh_dmg * 1.4)

    ammo_used = ammo_ref[0] if is_firearm else 0

    crew_lost = sum(1 for e in events if e["msg"] == "Crew member down.")

    # --- Drone loss ---
    drone_loss = False
    if drone_meta:
        loss_base = 0.005 if heist["type"] == "quick" else difficulty * 0.012
        loss_base *= (1 - drone_meta.get("loss_reduce", 0))
        if specs_available & {"infiltrator", "hacker"}:
            loss_base *= 0.8
        if aggro: loss_base *= 1.3
        if random.random() < loss_base:
            drone_loss = True
            add(f"{drone_meta['name']} contact lost — something shot it down. Destroyed.", "bad")

    # --- Capture / arrest ---
    captured = False
    if outcome in ("FAILED", "DISASTER"):
        cap_prob = (0.12 if outcome == "FAILED" else 0.30) + user.get("heat", 0) / 100 * (0.15 if outcome == "FAILED" else 0.22)
        cap_prob += capture_bias
        if drone_meta and drone_meta.get("capture_reduce"):
            cap_prob -= drone_meta["capture_reduce"]
        if random.random() < max(0, cap_prob):
            captured = True
            add("They drag you down in cuffs. You're going away.", "bad")

    return {
        "events": events,
        "outcome": outcome,
        "success_chance": round(base_adj, 3),
        "context": context,
        "drone_loss": drone_loss,
        "captured": captured,
        "rewards": {"cash": cash, "xp": xp, "rep": rep, "heat": heat_gain, "hp_loss": hp_loss, "veh_dmg": veh_dmg, "ammo_used": ammo_used, "ammo_type": weapon["ammo_type"] if weapon else None, "enemies_killed": enemies_killed, "times_shot": times_shot, "crew_lost": crew_lost},
    }

@api.post("/heist/run")
async def run_heist(data: HeistIn, request: Request):
    user = await get_current_user(request)
    if not user.get("specialization"):
        raise HTTPException(400, "Character not created")
    if user.get("prison"):
        raise HTTPException(400, "You are in prison. Pay bail first.")
    heist = find_item(HEISTS, data.heist_id)
    if not heist:
        raise HTTPException(404, "Heist not found")
    if user["level"] < heist["min_level"]:
        raise HTTPException(400, f"Level {heist['min_level']} required")
    # security: only allow NPCs the player has actually hired
    data.crew_ids = [c for c in data.crew_ids if c in user.get("hired_crew", [])]
    if (len(data.crew_ids) + len(data.player_ids)) < heist["min_crew"]:
        raise HTTPException(400, f"Need at least {heist['min_crew']} crew members")
    # capacity: vehicle must seat the whole crew (player + npcs + friends)
    if not any(v["id"] == data.vehicle_id for v in user["vehicles"]):
        raise HTTPException(400, "Vehicle not owned")
    veh_meta = find_item(VEHICLES, data.vehicle_id)
    total_crew = 1 + len(data.crew_ids) + len(data.player_ids)
    if vehicle_capacity(veh_meta) < total_crew:
        raise HTTPException(400, f"Vehicle capacity {vehicle_capacity(veh_meta)} too small for crew of {total_crew}. Use a bigger vehicle.")
    if user["health"] < 30:
        raise HTTPException(400, "Health too low. Heal first.")
    # stamina gate
    stamina_cost = CONFIG["heist_stamina_cost"].get(heist["type"], 20)
    if user.get("stamina", 0) < stamina_cost:
        raise HTTPException(400, f"Not enough Stamina. Need {stamina_cost}, have {user.get('stamina', 0)}. Drink something to recover.")
    # drone: max 1, must be owned
    drone_id = data.drone_id
    if drone_id:
        if user.get("drones", {}).get(drone_id, 0) < 1:
            raise HTTPException(400, "Drone not owned")
    # per-heist cooldown (individual per heist, tuned by farmability)
    cooldown_map = {"quick": 90, "street": 240, "heist": 600, "major": 1200}
    cd_seconds = heist.get("cooldown", cooldown_map.get(heist["type"], 180))
    cds = user.get("heist_cooldowns", {})
    last = cds.get(data.heist_id)
    if last:
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds()
        remaining = cd_seconds - elapsed
        if remaining > 0:
            raise HTTPException(400, f"Cooldown active. {int(remaining)}s remaining for this heist.")
    # check ammo
    weapon_id = user["equipped"].get("primary") or user["equipped"].get("secondary")
    weapon = find_item(WEAPONS, weapon_id) if weapon_id else None
    if weapon and weapon["ammo_type"] and user["ammo"].get(weapon["ammo_type"], 0) < 5:
        raise HTTPException(400, f"Not enough {weapon['ammo_type']} ammo. Buy more.")

    # ===== PHASE 1: briefing + interactive decision (no state change) =====
    if data.choice is None:
        return heist_briefing(user, heist, data.crew_ids, data.vehicle_id, drone_id, data.player_ids)

    # ===== PHASE 2: resolve the operation with the chosen decision =====
    # consume stamina exactly once, now that the heist actually starts
    user["stamina"] = max(0, user.get("stamina", 0) - stamina_cost)

    result = resolve_heist(user, heist, data.crew_ids, data.vehicle_id, drone_id, data.player_ids, data.choice, data.t0)
    rew = result["rewards"]

    # ===== Daily Contract bonus: +30% cash if this heist is today's contract & not yet completed =====
    dc = get_or_roll_daily(user)
    daily_bonus = False
    if dc["heist_id"] == data.heist_id and not dc["completed"] and result["outcome"] in ("PERFECT SUCCESS", "SUCCESS", "PARTIAL SUCCESS"):
        rew["cash"] = int(rew["cash"] * DAILY_MULT)
        dc["completed"] = True
        user["daily_contract"] = dc
        daily_bonus = True
    rew["daily_bonus"] = daily_bonus

    # split cash evenly among real players (NPCs never count); runner keeps one share
    real_players = []
    if data.player_ids:
        real_players = await db.users.find({"id": {"$in": data.player_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(20)
    shares = 1 + len(real_players)
    pot = rew["cash"]
    my_share = pot // shares if shares > 0 else pot
    rew["pot"] = pot
    rew["your_share"] = my_share
    rew["cash"] = my_share  # what the runner actually receives
    # shared loot log — real players only; NPCs work for a flat fee and take no cut
    loot_log = [{"username": user["username"], "share": my_share, "you": True, "role": "Lead"}]
    if real_players and my_share > 0:
        per = my_share
        for rp in real_players:
            await db.users.update_one({"id": rp["id"]}, {"$inc": {"money": per, "stats.total_earnings": per}})
            await notify(rp["id"], "heist_payout", "Heist Payout", f"You received ${per:,} as your share of {heist['name']}.", link="heists")
            loot_log.append({"username": rp.get("username", "Operator"), "share": per, "you": False, "role": "Crew"})
    elif real_players:
        for rp in real_players:
            loot_log.append({"username": rp.get("username", "Operator"), "share": 0, "you": False, "role": "Crew"})
    npc_count = len(data.crew_ids)
    rew["loot_log"] = loot_log
    rew["npc_count"] = npc_count

    # apply deltas (runner gets only their share)
    user["money"] += my_share
    user["xp"] += rew["xp"]
    user["reputation"] = max(0, user["reputation"] + rew["rep"])
    user["heat"] = min(100, max(0, user["heat"] + rew["heat"]))
    user["health"] = max(0, user["health"] - rew["hp_loss"])
    veh = next((v for v in user["vehicles"] if v["id"] == data.vehicle_id), None)
    if veh:
        veh["condition"] = max(0, veh["condition"] - rew["veh_dmg"])
    if rew["ammo_type"] and rew["ammo_used"] > 0:
        user["ammo"][rew["ammo_type"]] = max(0, user["ammo"].get(rew["ammo_type"], 0) - rew["ammo_used"])
    # stats
    user["stats"]["enemies_killed"] += rew["enemies_killed"]
    user["stats"]["times_shot"] += rew["times_shot"]
    user["stats"]["crew_lost"] += rew["crew_lost"]
    user["stats"]["total_earnings"] += rew["cash"]
    if rew["cash"] > 0:
        user["stats"]["ops_completed"] += 1
    else:
        user["stats"]["ops_failed"] += 1
    # gang heist counting: at least one gang member in the crew
    gang_id = user.get("gang_id")
    if gang_id and data.player_ids:
        mates = await db.users.find({"id": {"$in": data.player_ids}, "gang_id": gang_id}, {"_id": 0, "id": 1}).to_list(20)
        if mates:
            user["stats"]["gang_heists"] = user["stats"].get("gang_heists", 0) + 1
    if gang_id and pot > 0:
        await db.gangs.update_one({"id": gang_id}, {"$inc": {"earnings": pot}})

    # drone loss — permanently remove
    drone_lost = result.get("drone_loss") and drone_id
    if drone_lost:
        drones = user.get("drones", {})
        drones[drone_id] = max(0, drones.get(drone_id, 0) - 1)
        if drones[drone_id] == 0:
            drones.pop(drone_id, None)
        user["drones"] = drones

    # capture -> prison
    prison = None
    if result.get("captured"):
        weapon_fired = rew["enemies_killed"] > 0 or (weapon and weapon["cat"] not in ("melee",))
        prison, reason = build_prison(heist, user, weapon, weapon_fired, rew["cash"])
        user["prison"] = prison
        user["stats"]["times_arrested"] = user["stats"].get("times_arrested", 0) + 1

    user = check_level_up(user)
    cds[data.heist_id] = datetime.now(timezone.utc).isoformat()

    await db.users.update_one({"id": user["id"]}, {"$set": {
        "money": user["money"], "xp": user["xp"], "level": user["level"], "reputation": user["reputation"],
        "heat": user["heat"], "health": user["health"], "stamina": user["stamina"], "vehicles": user["vehicles"],
        "ammo": user["ammo"], "stats": user["stats"], "drones": user.get("drones", {}),
        "heist_cooldowns": cds, "prison": user.get("prison"), "daily_contract": user.get("daily_contract"),
    }})

    await db.operations.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "heist_id": data.heist_id, "heist_name": heist["name"],
        "outcome": result["outcome"], "cash": rew["cash"], "xp": rew["xp"], "rep": rew["rep"], "heat": rew["heat"],
        "crew_ids": data.crew_ids, "vehicle_id": data.vehicle_id, "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    updated = await db.users.find_one({"id": user["id"]})
    updated.pop("_id", None); updated.pop("password_hash", None)
    ensure_defaults(updated)
    return {"phase": "result", "events": result["events"], "outcome": result["outcome"], "rewards": rew, "user": updated,
            "loot_log": rew.get("loot_log", []), "pot": rew.get("pot", 0), "your_share": rew.get("your_share", 0),
            "cooldown_seconds": cd_seconds, "success_chance": result.get("success_chance"),
            "drone_lost": bool(drone_lost), "captured": result.get("captured"), "prison": prison}


def build_prison(heist, user, weapon, weapon_fired, money_seized):
    """Dynamic prison time (seconds) + bail cost based on crime severity."""
    difficulty = heist["difficulty"]
    reasons = []
    if heist["id"] in ("op_bank", "op_datacenter"):
        reasons.append("Arrested during Bank Heist")
    if weapon_fired and weapon and weapon.get("cat") not in ("melee", None):
        reasons.append("Weapon Discharged")
    if money_seized > 0:
        reasons.append("Money Recovered")
    if not reasons:
        reasons.append("Armed Robbery")
    reason = reasons[0]
    severity = difficulty + (3 if weapon_fired else 0) + (user.get("heat", 0) // 25)
    record = user.get("stats", {}).get("times_arrested", 0)
    minutes = int(2 + severity * 1.2 + record * 1.5)  # prison time in minutes
    bail = int(1500 * difficulty + user.get("heat", 0) * 40 + money_seized * 0.5 + record * 2000)
    until = (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()
    return {"until": until, "bail": bail, "reason": reason, "minutes": minutes}, reason

@api.get("/heist/history")
async def heist_history(request: Request, limit: int = 30):
    user = await get_current_user(request)
    ops = await db.operations.find({"user_id": user["id"]}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return ops

# ========== RANKINGS ==========
@api.get("/rankings")
async def rankings(request: Request):
    """Player ranking: Top 15 by total earnings (all activities) + caller's own position if outside."""
    cur = await db.users.find({"specialization": {"$ne": None}}, {"_id": 0, "password_hash": 0, "email": 0}).to_list(2000)
    ranked = sorted(cur, key=lambda u: (u.get("stats") or {}).get("total_earnings", 0), reverse=True)
    def row(u, i):
        return {"position": i + 1, "username": u.get("username", "?"), "level": u.get("level", 1),
                "earnings": (u.get("stats") or {}).get("total_earnings", 0), "specialization": u.get("specialization")}
    top = [row(u, i) for i, u in enumerate(ranked[:15])]
    me = None
    try:
        user = await get_current_user(request)
        idx = next((i for i, u in enumerate(ranked) if u.get("id") == user["id"] or u.get("username") == user["username"]), None)
        if idx is not None and idx >= 15:
            me = row(ranked[idx], idx)
    except Exception:
        pass
    return {"top": top, "me": me}

# ========== PROPERTIES ==========
@api.post("/property/buy")
async def buy_property(data: BuyIn, request: Request):
    user = await get_current_user(request)
    p = find_item(PROPERTIES, data.item_id)
    if not p:
        raise HTTPException(404, "Property not found")
    if any(x["id"] == data.item_id for x in user.get("properties", [])):
        raise HTTPException(400, "Already owned")
    if user["money"] < p["price"]:
        raise HTTPException(400, "Not enough money")
    props = user.get("properties", []) + [{"id": p["id"], "security": p["security"], "instance_id": str(uuid.uuid4()), "cash_stash": 0}]
    new_money = user["money"] - p["price"]
    await db.users.update_one({"id": user["id"]}, {"$set": {"properties": props, "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + p["price"]}})
    return {"ok": True, "money": new_money, "properties": props}

@api.post("/property/upgrade-security")
async def upgrade_security(data: BuyIn, request: Request):
    user = await get_current_user(request)
    prop = next((p for p in user.get("properties", []) if p["id"] == data.item_id), None)
    if not prop:
        raise HTTPException(404, "Property not owned")
    if prop["security"] >= 100:
        raise HTTPException(400, "Security maxed")
    upgrade_cost = int(prop["security"] * 250 + 2000)
    if user["money"] < upgrade_cost:
        raise HTTPException(400, "Not enough money")
    prop["security"] = min(100, prop["security"] + 5)
    new_money = user["money"] - upgrade_cost
    await db.users.update_one({"id": user["id"]}, {"$set": {"properties": user["properties"], "money": new_money, "stats.total_spent": user["stats"]["total_spent"] + upgrade_cost}})
    return {"ok": True, "money": new_money, "properties": user["properties"], "cost": upgrade_cost}

# ========== BUSINESSES ==========
class BuyBizIn(BaseModel):
    item_id: str
    payment_method: str = "cash"

@api.post("/business/buy")
async def buy_business(data: BuyBizIn, request: Request):
    user = await get_current_user(request)
    b = find_item(BUSINESSES, data.item_id)
    if not b:
        raise HTTPException(404, "Business not found")
    if any(x["id"] == data.item_id for x in user.get("businesses", [])):
        raise HTTPException(400, "Already owned")
    charge_payment(user, b["price"], data.payment_method, "legal")
    biz = user.get("businesses", []) + [{"id": b["id"], "instance_id": str(uuid.uuid4()), "last_collected": datetime.now(timezone.utc).isoformat(), "closed_until": None}]
    await db.users.update_one({"id": user["id"]}, {"$set": {"businesses": biz, "money": user["money"], "bank": user.get("bank", 0), "stats": user["stats"]}})
    return {"ok": True, "money": user["money"], "bank": user.get("bank", 0), "businesses": biz}

@api.post("/business/collect")
async def collect_business(request: Request):
    """Collect accrued income. Rolls a detailed inspection per business each collect."""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    total_income = 0
    total_fines = 0
    heat_add = 0
    events = []
    for biz in user.get("businesses", []):
        meta = find_item(BUSINESSES, biz["id"])
        if not meta:
            continue
        # closure check
        closed_until = biz.get("closed_until")
        if closed_until and datetime.fromisoformat(closed_until) > now:
            events.append({"biz": meta["name"], "type": "closed", "amount": 0, "reason": "Temporarily closed by authorities", "msg": f"{meta['name']}: Closed until {closed_until[:10]}. No income."})
            biz["last_collected"] = now.isoformat()
            continue
        last = datetime.fromisoformat(biz["last_collected"])
        accrued_hours = min(48, (now - last).total_seconds() / 3600)
        income = int((meta["daily_income"] / 24) * accrued_hours)
        total_income += income
        events.append({"biz": meta["name"], "type": "income", "amount": income, "msg": f"{meta['name']}: +${income} collected."})
        biz["last_collected"] = now.isoformat()
        # inspection roll
        if random.random() < meta["inspection_risk"] * max(0.3, accrued_hours / 24):
            r = random.random()
            if r < 0.45:
                fine = random.randint(meta["fine_min"], int(meta["fine_min"] * 1.5))
                total_fines += fine
                events.append({"biz": meta["name"], "type": "inspection", "result": "Minor Violation", "amount": fine, "reason": "Paperwork & permits out of date", "consequence": "Small fine", "msg": f"{meta['name']}: Minor Violation — fine ${fine}."})
            elif r < 0.72:
                fine = random.randint(int(meta["fine_min"] * 1.3), int((meta["fine_min"] + meta["fine_max"]) / 2))
                total_fines += fine
                # temporary income loss: push last_collected forward a bit
                events.append({"biz": meta["name"], "type": "inspection", "result": "Health/Safety", "amount": fine, "reason": "Health & safety hazards found", "consequence": "Larger fine + temporary income loss", "msg": f"{meta['name']}: Health/Safety violation — fine ${fine}, income disrupted."})
            elif r < 0.90:
                fine = random.randint(int((meta["fine_min"] + meta["fine_max"]) / 2), meta["fine_max"])
                total_fines += fine
                heat_add += 8
                events.append({"biz": meta["name"], "type": "inspection", "result": "Illegal Activity", "amount": fine, "reason": "Evidence of illegal operations", "consequence": "Heavy fine + increased HEAT", "msg": f"{meta['name']}: Illegal Activity uncovered — fine ${fine}, +8 HEAT."})
            else:
                fine = random.randint(int(meta["fine_max"] * 0.9), int(meta["fine_max"] * 1.3))
                total_fines += fine
                heat_add += 15
                closure = ""
                if random.random() < 0.3:  # closure is RARE, not on every Major Raid
                    days = random.randint(2, 3)
                    biz["closed_until"] = (now + timedelta(days=days)).isoformat()
                    closure = f" Shut down for {days} days."
                events.append({"biz": meta["name"], "type": "inspection", "result": "Major Raid", "amount": fine, "reason": "Full-scale police raid", "consequence": f"Very heavy fine + HEAT.{closure}", "msg": f"{meta['name']}: MAJOR RAID — fine ${fine}, +15 HEAT.{closure}"})
    net = total_income - total_fines
    new_money = max(0, user["money"] + net)
    new_heat = min(100, user.get("heat", 0) + heat_add)
    user["stats"]["business_income"] = user["stats"].get("business_income", 0) + total_income
    user["stats"]["fines_paid"] = user["stats"].get("fines_paid", 0) + total_fines
    user["stats"]["total_earnings"] = user["stats"].get("total_earnings", 0) + total_income
    await db.users.update_one({"id": user["id"]}, {"$set": {"businesses": user["businesses"], "money": new_money, "heat": new_heat, "stats": user["stats"]}})
    return {"income": total_income, "fines": total_fines, "net": net, "money": new_money, "heat": new_heat, "events": events}

# ========== BANK ==========
@api.post("/bank/deposit")
async def bank_deposit(data: BankIn, request: Request):
    user = await get_current_user(request)
    if data.amount <= 0 or user["money"] < data.amount:
        raise HTTPException(400, "Invalid amount")
    fee = int(round(data.amount * CONFIG["bank_fee"]))
    credited = data.amount - fee
    await db.users.update_one({"id": user["id"]}, {"$inc": {"money": -data.amount, "bank": credited}})
    return {"money": user["money"] - data.amount, "bank": user.get("bank", 0) + credited, "fee": fee, "credited": credited}

@api.post("/bank/withdraw")
async def bank_withdraw(data: BankIn, request: Request):
    user = await get_current_user(request)
    if data.amount <= 0 or user.get("bank", 0) < data.amount:
        raise HTTPException(400, "Invalid amount")
    fee = int(round(data.amount * CONFIG["bank_fee"]))
    received = data.amount - fee
    await db.users.update_one({"id": user["id"]}, {"$inc": {"money": received, "bank": -data.amount}})
    return {"money": user["money"] + received, "bank": user.get("bank", 0) - data.amount, "fee": fee, "received": received}

# ========== PVP RAID ==========
class PvpInviteIn(BaseModel):
    friend_username: str
    heist_id: str  # here: the raid target username/gang the ally is invited against

class PvpRespondIn(BaseModel):
    request_id: str
    accept: bool = True

RAID_TARGET_COOLDOWN = 2 * 3600      # same attacker cannot re-raid same defender for 2h
RAID_PROTECTION = 30 * 60            # a raided defender is protected for 30 min
RAID_POWER_MIN = 0.55                # matchmaking band relative to attacker power
RAID_POWER_MAX = 1.75

async def _last_raid_between(attacker_name, defender_name):
    return await db.raids.find_one({"attacker": attacker_name, "defender": defender_name}, sort=[("timestamp", -1)])

async def _raids_today(attacker_name, defender_name):
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    return await db.raids.count_documents({"attacker": attacker_name, "defender": defender_name, "timestamp": {"$gte": since}})

def _target_preview(t, attacker_power, is_bot=False):
    props = t.get("properties", [])
    meta = None; prop = None
    for p in props:
        m = find_item(PROPERTIES, p["id"])
        if m and (meta is None or m["tier"] > meta["tier"]):
            meta, prop = m, p
    if not meta:
        return None
    tp = power_score(t)
    ratio = tp / attacker_power if attacker_power > 0 else 1
    diff = "EASY" if ratio < 0.8 else ("FAIR" if ratio < 1.2 else "HARD")
    est = int(prop.get("cash_stash", 0) + meta["tier"] * 600 + min(t.get("money", 0) // 6, meta["tier"] * 1500))
    return {"username": t["username"], "level": t.get("level", 1), "specialization": t.get("specialization"),
            "property_id": prop["id"], "property_name": meta["name"], "property_tier": meta["tier"],
            "security": prop["security"], "power": round(tp), "difficulty": diff, "estimated_loot": est, "is_bot": is_bot}

def _bot_targets(attacker, n):
    """Synthetic fallback opponents scaled to the attacker — used only when too few real players."""
    out = []
    lvl = attacker["level"]
    for i in range(n):
        blvl = max(5, lvl + random.randint(-2, 2))
        tier = min(5, max(1, blvl // 6 + 1))
        pmeta = [p for p in PROPERTIES if p["tier"] == tier][0]
        out.append({"username": f"bot_{random.choice(['Raze','Vex','Nyx','Kilo','Zeta','Onyx'])}{random.randint(100,999)}",
                    "level": blvl, "specialization": random.choice([s["id"] for s in SPECIALIZATIONS]),
                    "property_id": pmeta["id"], "property_name": pmeta["name"], "property_tier": tier,
                    "security": pmeta["security"], "power": round(blvl * 8 + 40), "difficulty": "FAIR",
                    "estimated_loot": int(tier * 700 + blvl * 120), "is_bot": True})
    return out

@api.get("/pvp/targets")
async def pvp_targets(request: Request, limit: int = 8):
    user = await get_current_user(request)
    ap = power_score(user)
    now = datetime.now(timezone.utc)
    cands = await db.users.find(
        {"id": {"$ne": user["id"]}, "specialization": {"$ne": None}, "properties": {"$ne": []}},
        {"_id": 0, "password_hash": 0, "email": 0}
    ).limit(200).to_list(200)
    eligible = []
    for t in cands:
        tp = power_score(t)
        if not (RAID_POWER_MIN * ap <= tp <= RAID_POWER_MAX * ap):
            continue
        prot = t.get("raid_protection_until")
        if prot and datetime.fromisoformat(prot) > now:
            continue
        last = await _last_raid_between(user["username"], t["username"])
        if last and (now - datetime.fromisoformat(last["timestamp"])).total_seconds() < RAID_TARGET_COOLDOWN:
            continue
        pv = _target_preview(t, ap)
        if pv:
            eligible.append(pv)
    random.shuffle(eligible)
    eligible = eligible[:limit]
    if len(eligible) < 3:
        eligible += _bot_targets(user, 3 - len(eligible))
    return eligible

@api.get("/pvp/search")
async def pvp_search(request: Request, q: str, kind: str = "player"):
    user = await get_current_user(request)
    ap = power_score(user)
    now = datetime.now(timezone.utc)
    def eligibility(t):
        tp = power_score(t)
        if t["id"] == user["id"]:
            return "You cannot raid yourself."
        prot = t.get("raid_protection_until")
        if prot and datetime.fromisoformat(prot) > now:
            return "Target is under post-raid protection right now."
        if not (RAID_POWER_MIN * ap <= tp <= RAID_POWER_MAX * ap):
            return "Target is outside your fair raid range."
        if not t.get("properties"):
            return "Target owns no raidable property."
        return None
    results = []
    if kind == "gang":
        gang = await db.gangs.find_one({"$or": [{"name": {"$regex": f"^{q}$", "$options": "i"}}, {"tag": {"$regex": f"^{q}$", "$options": "i"}}]})
        if gang:
            leader = await db.users.find_one({"id": gang["leader_id"]})
            if leader:
                pv = _target_preview(leader, ap)
                if pv:
                    pv["gang_name"] = gang["name"]; pv["reason"] = eligibility(leader)
                    results.append(pv)
    else:
        cur = await db.users.find({"username": {"$regex": f"^{q}$", "$options": "i"}}, {"_id": 0, "password_hash": 0, "email": 0}).limit(5).to_list(5)
        for t in cur:
            pv = _target_preview(t, ap)
            if pv is None:
                pv = {"username": t["username"], "level": t.get("level", 1), "property_id": None, "reason": "Target owns no raidable property."}
            else:
                pv["reason"] = eligibility(t)
            results.append(pv)
    return results

@api.post("/pvp/invite")
async def pvp_invite(data: PvpInviteIn, request: Request):
    user = await get_current_user(request)
    ally = await db.users.find_one({"username": data.friend_username})
    if not ally or ally["id"] == user["id"]:
        raise HTTPException(404, "Player not found")
    inv = {"id": str(uuid.uuid4()), "type": "raid", "from_id": user["id"], "from_username": user["username"], "to_id": ally["id"], "target": data.heist_id, "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.raid_invites.insert_one(inv)
    await notify(ally["id"], "raid_invite", "Raid Invite", f"{user['username']} wants you on a raid against {data.heist_id}.", link="pvp", data={"invite_id": inv["id"]})
    return {"ok": True}

@api.post("/pvp/invite/respond")
async def pvp_invite_respond(data: PvpRespondIn, request: Request):
    user = await get_current_user(request)
    inv = await db.raid_invites.find_one({"id": data.request_id, "to_id": user["id"], "status": "pending"})
    if not inv:
        raise HTTPException(404, "Invite not found")
    await db.raid_invites.update_one({"id": inv["id"]}, {"$set": {"status": "accepted" if data.accept else "declined"}})
    if data.accept:
        await notify(inv["from_id"], "raid_accept", "Raid Invite Accepted", f"{user['username']} joined your raid party.", link="pvp")
    return {"ok": True, "accepted": data.accept}

@api.get("/pvp/accepted-allies/{target}")
async def pvp_accepted_allies(target: str, request: Request):
    user = await get_current_user(request)
    invs = await db.raid_invites.find({"from_id": user["id"], "target": target, "status": "accepted"}, {"_id": 0}).to_list(20)
    ids = [i["to_id"] for i in invs]
    players = []
    if ids:
        cur = await db.users.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "username": 1, "level": 1, "specialization": 1}).to_list(20)
        players = [{"id": u["id"], "username": u["username"], "level": u.get("level", 1), "specialization": u.get("specialization"), "power": round(power_score(u))} for u in cur]
    return players

@api.post("/pvp/raid")
async def pvp_raid(data: RaidIn, request: Request):
    attacker = await get_current_user(request)
    if attacker["level"] < 5:
        raise HTTPException(400, "Level 5+ required for PvP raids")
    if attacker["health"] < 40:
        raise HTTPException(400, "Health too low")
    now = datetime.now(timezone.utc)
    ap = power_score(attacker)
    is_bot = data.target_username.startswith("bot_")

    weapon_id = attacker["equipped"].get("primary") or attacker["equipped"].get("secondary")
    weapon = find_item(WEAPONS, weapon_id) if weapon_id else None
    attack_power = attacker["level"] * 3 + (weapon["damage"] if weapon else 10)
    for cid in data.crew_ids:
        if cid in attacker["hired_crew"]:
            npc = find_item(NPCS, cid)
            if npc: attack_power += npc["skill"] * 0.6
    # real-player allies (from friends/gang, invite-accepted) add power and share loot
    ally_players = []
    if data.ally_ids:
        ally_players = await db.users.find({"id": {"$in": data.ally_ids}}, {"_id": 0, "id": 1, "username": 1, "level": 1}).to_list(10)
        for a in ally_players:
            attack_power += a.get("level", 1) * 2 + 12

    if is_bot:
        # synthetic opponent — no defender record touched
        blvl = max(5, attacker["level"] + random.randint(-2, 2))
        prop_meta = next((p for p in PROPERTIES if p["id"] == data.property_id), PROPERTIES[0])
        defense_power = prop_meta["security"] + blvl * 2 + prop_meta["tier"] * 8
        defender = None; prop = None; stash = 0
    else:
        defender = await db.users.find_one({"username": data.target_username})
        if not defender or defender["id"] == attacker["id"]:
            raise HTTPException(404, "Target not found")
        # anti-farming: post-raid protection + per-target cooldown
        prot = defender.get("raid_protection_until")
        if prot and datetime.fromisoformat(prot) > now:
            raise HTTPException(400, "Target is under post-raid protection. Try later or pick another target.")
        last = await _last_raid_between(attacker["username"], defender["username"])
        if last and (now - datetime.fromisoformat(last["timestamp"])).total_seconds() < RAID_TARGET_COOLDOWN:
            raise HTTPException(400, "You raided this target too recently. Cooldown active.")
        tp = power_score(defender)
        if not (RAID_POWER_MIN * ap <= tp <= RAID_POWER_MAX * ap):
            raise HTTPException(400, "Target is outside your fair raid range.")
        prop = next((p for p in defender.get("properties", []) if p["id"] == data.property_id), None)
        if not prop:
            raise HTTPException(404, "Property not found on target")
        prop_meta = find_item(PROPERTIES, data.property_id)
        defense_power = prop["security"] + defender["level"] * 2 + prop_meta["tier"] * 8
        stash = prop.get("cash_stash", 0)

    total = attack_power + defense_power
    success_prob = max(0.1, min(0.85, attack_power / total if total > 0 else 0.5))
    won = random.random() < success_prob
    events = []
    loot_log = []
    xp_gain = 0

    if won:
        base_loot = int(prop_meta["tier"] * 700 + stash * 0.6 + ap * 2)
        if is_bot:
            loot = max(400, int(prop_meta["tier"] * 650 + attacker["level"] * 110))
        else:
            # reward balance: cap to a fraction of defender liquidity; leave the defender a floor
            cap = defender["money"] // 5 + stash
            loot = max(300, min(base_loot, cap))
            # diminishing returns for repeat targets in 24h
            recent = await _raids_today(attacker["username"], defender["username"])
            if recent:
                loot = int(loot * max(0.25, 1 - 0.35 * recent))
        hp_loss = random.randint(8, 22)
        events.append(f"Breached {prop_meta['name']}. Defenders down.")
        events.append(f"Extracted ${loot:,} in cash and valuables.")
        events.append(f"Took {hp_loss} damage during the exchange.")
        # split loot with allies
        shares = 1 + len(ally_players)
        my_share = loot // shares
        loot_log.append({"username": attacker["username"], "share": my_share, "you": True})
        for a in ally_players:
            await db.users.update_one({"id": a["id"]}, {"$inc": {"money": my_share, "stats.total_earnings": my_share}})
            await notify(a["id"], "raid_payout", "Raid Payout", f"You received ${my_share:,} from the raid on {data.target_username}.", link="pvp")
            loot_log.append({"username": a["username"], "share": my_share, "you": False})
        attacker["money"] += my_share
        attacker["health"] = max(0, attacker["health"] - hp_loss)
        attacker["reputation"] += 8
        attacker["heat"] = min(100, attacker["heat"] + 15)
        xp_gain = XP_RULES["raid_win"] + (XP_RULES["gang_assist"] if ally_players else 0)
        if not is_bot:
            # defender loses only the looted cash (floored), gains protection
            new_stash = max(0, stash - loot)
            cash_from_wallet = max(0, loot - stash)
            new_def_money = max(0, defender["money"] - cash_from_wallet)
            for p in defender["properties"]:
                if p["id"] == prop["id"]:
                    p["cash_stash"] = new_stash
            await db.users.update_one({"id": defender["id"]}, {"$set": {
                "money": new_def_money, "properties": defender["properties"],
                "raid_protection_until": (now + timedelta(seconds=RAID_PROTECTION)).isoformat()}})
            await notify(defender["id"], "raided", "You Were Raided", f"{attacker['username']} raided your {prop_meta['name']} and took ${loot:,}. You have 30 min protection.", link="pvp")
        result = "RAID SUCCESSFUL"
    else:
        loss = min(random.randint(400, 2000) + attacker["level"] * 40, attacker["money"])
        hp_loss = random.randint(20, 45)
        events.append(f"Security repelled the assault at {prop_meta['name']}.")
        events.append(f"Lost ${loss:,} in equipment and bribes.")
        events.append(f"Took {hp_loss} damage.")
        attacker["money"] = max(0, attacker["money"] - loss)
        attacker["health"] = max(0, attacker["health"] - hp_loss)
        attacker["reputation"] = max(0, attacker["reputation"] - 3)
        attacker["heat"] = min(100, attacker["heat"] + 25)
        xp_gain = XP_RULES["raid_loss"]
        if not is_bot:
            await db.users.update_one({"id": defender["id"]}, {"$inc": {"reputation": 4, "stats.raids_survived": 1}})
        result = "RAID FAILED"

    attacker = grant_xp(attacker, xp_gain)
    await db.users.update_one({"id": attacker["id"]}, {"$set": {"money": attacker["money"], "health": attacker["health"], "reputation": attacker["reputation"], "heat": attacker["heat"], "xp": attacker["xp"], "level": attacker["level"]}})
    updated = await db.users.find_one({"id": attacker["id"]})
    updated.pop("_id", None); updated.pop("password_hash", None)
    ensure_defaults(updated)
    await db.raids.insert_one({"id": str(uuid.uuid4()), "attacker": attacker["username"], "defender": data.target_username, "property_id": data.property_id, "result": result, "is_bot": is_bot, "timestamp": now.isoformat()})
    return {"result": result, "events": events, "success_prob": round(success_prob, 2), "xp": xp_gain, "loot_log": loot_log, "user": updated}

@api.get("/pvp/history")
async def pvp_history(request: Request, limit: int = 20):
    user = await get_current_user(request)
    raids = await db.raids.find({"$or": [{"attacker": user["username"]}, {"defender": user["username"]}]}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return raids

# ================= CASINO (in-game currency only) =================
CASINO = {"fee_pct": 0.15, "min_bet": 100, "max_bet": 100000}  # 15% fee — configurable

def _casino_charge(user, bet):
    if bet < CASINO["min_bet"] or bet > CASINO["max_bet"]:
        raise HTTPException(400, f"Bet must be ${CASINO['min_bet']:,}–${CASINO['max_bet']:,}.")
    fee = int(round(bet * CASINO["fee_pct"]))
    total = bet + fee
    if user.get("money", 0) < total:
        raise HTTPException(400, f"Need ${total:,} (wager ${bet:,} + 15% fee ${fee:,}).")
    return fee, total

def _casino_xp(bet):
    return min(XP_RULES["casino_cap"], (bet // 1000) * XP_RULES["casino_per_1k_wager"])

class CasinoPlayIn(BaseModel):
    game: str
    bet: int
    choice: Optional[str] = None

@api.post("/casino/play")
async def casino_play(data: CasinoPlayIn, request: Request):
    """NPC casino games. Fee charged when the game starts; wager is at risk. House edge built in."""
    user = await get_current_user(request)
    bet = int(data.bet)
    fee, total = _casino_charge(user, bet)
    user["money"] -= total
    game = data.game; payout = 0; win = False; detail = {}
    if game == "highcard":
        p = random.randint(2, 14); h = random.randint(2, 14)
        win = p > h
        payout = int(bet * 1.9) if win else 0
        detail = {"player_card": p, "house_card": h}
    elif game == "slots":
        reels = [random.choice(["7", "BAR", "CHERRY", "BELL", "STAR"]) for _ in range(3)]
        if reels[0] == reels[1] == reels[2]:
            mult = {"7": 15, "BAR": 8, "STAR": 6, "BELL": 5, "CHERRY": 4}[reels[0]]
            payout = bet * mult; win = True
        elif reels[0] == reels[1] or reels[1] == reels[2] or reels[0] == reels[2]:
            payout = int(bet * 1.4); win = True
        detail = {"reels": reels}
    elif game == "roulette":
        n = random.randint(0, 36)
        color = "green" if n == 0 else ("red" if n % 2 == 1 else "black")
        c = (data.choice or "red").lower()
        if c in ("red", "black"):
            win = (c == color); payout = int(bet * 1.95) if win else 0
        else:
            try: pick = int(c)
            except Exception: pick = -1
            win = (pick == n); payout = bet * 35 if win else 0
        detail = {"number": n, "color": color, "pick": data.choice}
    else:
        raise HTTPException(400, "Unknown game")
    user["money"] += payout
    xp = _casino_xp(bet)
    user = grant_xp(user, xp)
    await db.users.update_one({"id": user["id"]}, {"$set": {"money": user["money"], "xp": user["xp"], "level": user["level"]}})
    updated = await db.users.find_one({"id": user["id"]}); updated.pop("_id", None); updated.pop("password_hash", None); ensure_defaults(updated)
    return {"win": win, "game": game, "bet": bet, "fee": fee, "payout": payout, "net": payout - total, "detail": detail, "xp": xp, "user": updated}

class CasinoChallengeIn(BaseModel):
    friend_username: str
    bet: int

@api.post("/casino/challenge")
async def casino_challenge(data: CasinoChallengeIn, request: Request):
    """Friend High-Card duel — challenger's funds escrowed now; opponent pays on accept."""
    user = await get_current_user(request)
    opp = await db.users.find_one({"username": data.friend_username})
    if not opp or opp["id"] == user["id"]:
        raise HTTPException(404, "Player not found")
    bet = int(data.bet)
    fee, total = _casino_charge(user, bet)
    user["money"] -= total
    await db.users.update_one({"id": user["id"]}, {"$set": {"money": user["money"]}})
    ch = {"id": str(uuid.uuid4()), "from_id": user["id"], "from_username": user["username"], "to_id": opp["id"],
          "to_username": opp["username"], "bet": bet, "fee": fee, "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.casino_challenges.insert_one(ch)
    await notify(opp["id"], "casino_challenge", "Casino Duel", f"{user['username']} challenges you to High-Card for ${bet:,} (+15% fee).", link="casino", data={"challenge_id": ch["id"]})
    updated = await db.users.find_one({"id": user["id"]}); updated.pop("_id", None); updated.pop("password_hash", None); ensure_defaults(updated)
    return {"ok": True, "challenge_id": ch["id"], "user": updated}

@api.get("/casino/challenges")
async def casino_challenges(request: Request):
    user = await get_current_user(request)
    incoming = await db.casino_challenges.find({"to_id": user["id"], "status": "pending"}, {"_id": 0}).to_list(20)
    return {"incoming": incoming}

@api.post("/casino/challenge/respond")
async def casino_challenge_respond(data: PvpRespondIn, request: Request):
    user = await get_current_user(request)
    ch = await db.casino_challenges.find_one({"id": data.request_id, "to_id": user["id"], "status": "pending"})
    if not ch:
        raise HTTPException(404, "Challenge not found")
    if not data.accept:
        # refund challenger
        await db.users.update_one({"id": ch["from_id"]}, {"$inc": {"money": ch["bet"] + ch["fee"]}})
        await db.casino_challenges.update_one({"id": ch["id"]}, {"$set": {"status": "declined"}})
        return {"ok": True, "accepted": False}
    total = ch["bet"] + ch["fee"]
    if user.get("money", 0) < total:
        # cannot cover — refund challenger, cancel
        await db.users.update_one({"id": ch["from_id"]}, {"$inc": {"money": ch["bet"] + ch["fee"]}})
        await db.casino_challenges.update_one({"id": ch["id"]}, {"$set": {"status": "cancelled"}})
        raise HTTPException(400, f"You need ${total:,} to accept (wager + 15% fee).")
    # escrow opponent
    await db.users.update_one({"id": user["id"]}, {"$inc": {"money": -total}})
    # resolve high-card; tie re-rolls in challenger's favor rarely — decide winner
    fc, tc = random.randint(2, 14), random.randint(2, 14)
    while fc == tc:
        fc, tc = random.randint(2, 14), random.randint(2, 14)
    challenger_wins = fc > tc
    pot = ch["bet"] * 2  # both wagers; fees are the house sink
    winner_id = ch["from_id"] if challenger_wins else user["id"]
    await db.users.update_one({"id": winner_id}, {"$inc": {"money": pot}})
    # small XP for both
    for uid in (ch["from_id"], user["id"]):
        u = await db.users.find_one({"id": uid})
        if u:
            u = grant_xp(u, _casino_xp(ch["bet"]))
            await db.users.update_one({"id": uid}, {"$set": {"xp": u["xp"], "level": u["level"]}})
    await db.casino_challenges.update_one({"id": ch["id"]}, {"$set": {"status": "resolved", "winner_id": winner_id, "from_card": fc, "to_card": tc}})
    await notify(ch["from_id"], "casino_result", "Casino Duel Result", f"High-Card vs {user['username']}: you {'WON' if challenger_wins else 'LOST'} ${ch['bet']:,}.", link="casino")
    updated = await db.users.find_one({"id": user["id"]}); updated.pop("_id", None); updated.pop("password_hash", None); ensure_defaults(updated)
    return {"ok": True, "accepted": True, "you_won": not challenger_wins, "from_card": fc, "to_card": tc, "pot": pot, "user": updated}

# ================= DAILY CONTRACT (reuses existing Heist system) =================
DAILY_MULT = 1.30  # +30% cash bonus, configurable

def _daily_day_index():
    return int(datetime.now(timezone.utc).timestamp() // 86400)

def _roll_daily_for(user):
    di = _daily_day_index()
    eligible = [h for h in HEISTS if h["min_level"] <= user.get("level", 1)] or [HEISTS[0]]
    rng = random.Random(di * 1009 + (hash(user["id"]) % 100000))
    h = rng.choice(eligible)
    return {"day_index": di, "heist_id": h["id"], "completed": False}

def get_or_roll_daily(user):
    dc = user.get("daily_contract")
    di = _daily_day_index()
    if not dc or dc.get("day_index") != di or not find_item(HEISTS, dc.get("heist_id")):
        dc = _roll_daily_for(user)
        user["daily_contract"] = dc
    return dc

@api.get("/daily-contract")
async def daily_contract(request: Request):
    user = await get_current_user(request)
    before = user.get("daily_contract")
    dc = get_or_roll_daily(user)
    if before != dc:
        await db.users.update_one({"id": user["id"]}, {"$set": {"daily_contract": dc}})
    h = find_item(HEISTS, dc["heist_id"])
    now = datetime.now(timezone.utc)
    seconds_to_rotation = 86400 - int(now.timestamp()) % 86400
    # normal cooldown state for this underlying heist
    cds = user.get("heist_cooldowns", {})
    cd_remaining = 0
    last = cds.get(dc["heist_id"])
    if last:
        cd_remaining = max(0, int(h.get("cooldown", 180) - (now - datetime.fromisoformat(last)).total_seconds()))
    heist_full = {**h, "stamina_cost": CONFIG["heist_stamina_cost"].get(h["type"], 20), "crew_max": CONFIG["heist_crew_max"].get(h["type"], 4), "cooldown": h.get("cooldown", 180)}
    return {
        "heist": heist_full, "completed": dc["completed"], "reward_multiplier": DAILY_MULT,
        "seconds_to_rotation": seconds_to_rotation, "cooldown_remaining": cd_remaining,
        "normal_reward_min": h["reward_min"], "normal_reward_max": h["reward_max"],
        "daily_reward_min": int(h["reward_min"] * DAILY_MULT), "daily_reward_max": int(h["reward_max"] * DAILY_MULT),
        "status": "COMPLETED" if dc["completed"] else ("COOLDOWN" if cd_remaining > 0 else "AVAILABLE"),
    }


# ========== AUTO / OFFLINE RAIDS ==========
@api.post("/tick/offline-raids")
async def offline_raids(request: Request):
    """Resolve offline events since last tick: police fines + gang raids per property."""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    last = datetime.fromisoformat(user.get("last_tick", now.isoformat()))
    hours = min(72, (now - last).total_seconds() / 3600)
    if hours < 0.5:
        return {"events": [], "hours": round(hours, 2)}
    events = []
    total_loss = 0
    stash_loss = 0
    heat_delta = 0
    for prop in user.get("properties", []):
        meta = find_item(PROPERTIES, prop["id"])
        if not meta: continue
        sec = prop.get("security", 30)
        # attempts scale with time and heat
        raid_chance = min(0.6, (hours / 48) * (1 + user["heat"] / 200))
        # police raid
        if random.random() < raid_chance * 0.6:
            if random.random() * 100 > sec:
                fine = random.randint(500, 3000) + meta["tier"] * 400
                total_loss += fine
                events.append({"type": "police", "prop": meta["name"], "msg": f"Police raided {meta['name']}. Fine ${fine}.", "amount": fine})
            else:
                heat_delta -= 3
                events.append({"type": "defended", "prop": meta["name"], "msg": f"{meta['name']} security repelled a police search.", "amount": 0})
        # gang raid
        if random.random() < raid_chance * 0.5:
            if random.random() * 100 > sec:
                steal = min(prop.get("cash_stash", 0) + random.randint(300, 1500), user["money"] // 3 + 500)
                stash_loss += steal
                events.append({"type": "gang", "prop": meta["name"], "msg": f"Rival gang looted {meta['name']} for ${steal}.", "amount": steal})
            else:
                events.append({"type": "defended", "prop": meta["name"], "msg": f"{meta['name']} guards drove off a gang assault.", "amount": 0})
    total = total_loss + stash_loss
    new_money = max(0, user["money"] - total)
    new_heat = max(0, min(100, user["heat"] + heat_delta))
    stats = user["stats"]; stats["fines_paid"] += total_loss
    await db.users.update_one({"id": user["id"]}, {"$set": {"money": new_money, "heat": new_heat, "last_tick": now.isoformat(), "stats": stats}})
    return {"events": events, "hours": round(hours, 2), "total_lost": total, "money": new_money}

# ========== DAILY MISSIONS ==========
def get_daily_missions(user: dict):
    """3 rotating deterministic daily missions."""
    seed = int(datetime.now(timezone.utc).strftime("%Y%m%d")) + hash(user["id"]) % 1000
    rng = random.Random(seed)
    pool = [
        {"id": "mission_quick", "title": "Street Hustle", "desc": "Complete 3 Quick Operations", "target": 3, "type": "ops_quick", "reward_cash": 1200, "reward_rep": 5, "reward_xp": 150},
        {"id": "mission_kills", "title": "Bloody Hands", "desc": "Neutralize 8 enemies during operations", "target": 8, "type": "kills", "reward_cash": 1800, "reward_rep": 8, "reward_xp": 200},
        {"id": "mission_earnings", "title": "Cash Flow", "desc": "Earn $5,000 from operations", "target": 5000, "type": "earnings", "reward_cash": 1500, "reward_rep": 6, "reward_xp": 180},
        {"id": "mission_arsenal", "title": "Arms Dealer", "desc": "Purchase any 1 weapon", "target": 1, "type": "buy_weapon", "reward_cash": 900, "reward_rep": 3, "reward_xp": 100},
        {"id": "mission_crew", "title": "Growing Family", "desc": "Hire any 1 new crew member", "target": 1, "type": "hire_crew", "reward_cash": 1000, "reward_rep": 4, "reward_xp": 120},
        {"id": "mission_survive", "title": "Untouchable", "desc": "Successfully repel 1 PvP raid", "target": 1, "type": "raids_survived", "reward_cash": 2200, "reward_rep": 10, "reward_xp": 220},
        {"id": "mission_heist", "title": "Big Score", "desc": "Complete 1 Heist tier operation", "target": 1, "type": "ops_heist", "reward_cash": 3000, "reward_rep": 12, "reward_xp": 280},
    ]
    rng.shuffle(pool)
    return pool[:3]

@api.get("/missions/daily")
async def daily_missions(request: Request):
    user = await get_current_user(request)
    missions = get_daily_missions(user)
    claimed = user.get("missions_claimed", {})
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    result = []
    for m in missions:
        # measure progress
        t = m["type"]; s = user["stats"]
        if t == "ops_quick": prog = s.get("ops_completed", 0)  # simplification
        elif t == "kills": prog = s.get("enemies_killed", 0)
        elif t == "earnings": prog = s.get("total_earnings", 0)
        elif t == "buy_weapon": prog = len(user.get("weapons", []))
        elif t == "hire_crew": prog = len(user.get("hired_crew", []))
        elif t == "raids_survived": prog = s.get("raids_survived", 0)
        elif t == "ops_heist": prog = s.get("ops_completed", 0)
        else: prog = 0
        is_claimed = claimed.get(f"{today}_{m['id']}", False)
        result.append({**m, "progress": min(prog, m["target"]), "complete": prog >= m["target"] and not is_claimed, "claimed": is_claimed})
    return result

class ClaimIn(BaseModel):
    mission_id: str

@api.post("/missions/claim")
async def claim_mission(data: ClaimIn, request: Request):
    user = await get_current_user(request)
    missions = get_daily_missions(user)
    m = next((x for x in missions if x["id"] == data.mission_id), None)
    if not m:
        raise HTTPException(404, "Mission not available today")
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    key = f"{today}_{m['id']}"
    claimed = user.get("missions_claimed", {})
    if claimed.get(key):
        raise HTTPException(400, "Already claimed")
    # verify progress
    t = m["type"]; s = user["stats"]
    if t == "ops_quick": prog = s.get("ops_completed", 0)
    elif t == "kills": prog = s.get("enemies_killed", 0)
    elif t == "earnings": prog = s.get("total_earnings", 0)
    elif t == "buy_weapon": prog = len(user.get("weapons", []))
    elif t == "hire_crew": prog = len(user.get("hired_crew", []))
    elif t == "raids_survived": prog = s.get("raids_survived", 0)
    elif t == "ops_heist": prog = s.get("ops_completed", 0)
    else: prog = 0
    if prog < m["target"]:
        raise HTTPException(400, "Not complete yet")
    claimed[key] = True
    new_money = user["money"] + m["reward_cash"]
    new_xp = user["xp"] + m["reward_xp"]
    new_rep = user["reputation"] + m["reward_rep"]
    tmp = {"level": user["level"], "xp": new_xp}
    check_level_up(tmp)
    await db.users.update_one({"id": user["id"]}, {"$set": {"money": new_money, "xp": tmp["xp"], "level": tmp["level"], "reputation": new_rep, "missions_claimed": claimed}})
    return {"ok": True, "reward": {"cash": m["reward_cash"], "xp": m["reward_xp"], "rep": m["reward_rep"]}, "money": new_money}

# ========== CUSTOM BACKGROUNDS ==========
# Upload endpoint moved to Emergent Object Storage (see below).

@api.post("/player/set-bg")
async def set_bg(data: BgIn, request: Request):
    user = await get_current_user(request)
    if data.section not in {"home", "character", "inventory", "arsenal", "garage", "crew", "heists", "assets", "businesses", "pvp", "map", "progress"}:
        raise HTTPException(400, "Invalid section")
    bgs = user.get("custom_bgs") or {}
    if data.url.strip():
        bgs[data.section] = data.url.strip()
    else:
        bgs.pop(data.section, None)
    await db.users.update_one({"id": user["id"]}, {"$set": {"custom_bgs": bgs}})
    return {"ok": True, "custom_bgs": bgs}

# ========================================================================
# ============== NEW SYSTEMS: PAYMENTS / ITEMS / SOCIAL / GANG ===========
# ========================================================================

def charge_payment(user: dict, amount: int, method: str, kind: str):
    """Validates & applies an in-game payment. Mutates user['money']/['bank']. Raises on invalid."""
    allowed = allowed_payment_methods(kind)
    if method not in allowed:
        raise HTTPException(400, f"Payment method '{method}' not allowed here. Allowed: {allowed}")
    if method == "cash":
        if user["money"] < amount:
            raise HTTPException(400, "Not enough cash")
        user["money"] -= amount
    else:  # bank
        if user.get("bank", 0) < amount:
            raise HTTPException(400, "Not enough bank balance")
        user["bank"] = user.get("bank", 0) - amount
    user["stats"]["total_spent"] = user["stats"].get("total_spent", 0) + amount

async def notify(user_id: str, ntype: str, title: str, body: str, link: str = None, data: dict = None):
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, "type": ntype, "title": title, "body": body,
           "link": link, "data": data or {}, "read": False, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.notifications.insert_one(doc)
    return doc

def is_online(u: dict) -> bool:
    t = u.get("last_regen_tick")
    if not t:
        return False
    try:
        return (datetime.now(timezone.utc) - datetime.fromisoformat(t)).total_seconds() < 300
    except Exception:
        return False

# ---------- MARKET / ITEM PURCHASE ----------
class BuyItemIn(BaseModel):
    item_id: str
    quantity: int = 1
    payment_method: str = "cash"

class ConsumeIn(BaseModel):
    item_id: str

def _item_kind(item):
    return "illegal" if (item.get("type") in ILLEGAL_ITEM_TYPES or item.get("legal") is False) else "legal"

@api.post("/market/buy-item")
async def buy_item(data: BuyItemIn, request: Request):
    user = await get_current_user(request)
    item = find_any_item(data.item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    qty = max(1, min(999, int(data.quantity)))
    kind = _item_kind(item)
    total = item["price"] * qty
    charge_payment(user, total, data.payment_method, kind)
    if item["type"] == "drone":
        drones = user.get("drones", {})
        drones[item["id"]] = drones.get(item["id"], 0) + qty
        user["drones"] = drones
        field = {"drones": drones}
    else:
        inv = user.get("inventory", {})
        inv[item["id"]] = inv.get(item["id"], 0) + qty
        user["inventory"] = inv
        field = {"inventory": inv}
    xp = purchase_xp(total); user = grant_xp(user, xp)
    await db.users.update_one({"id": user["id"]}, {"$set": {"money": user["money"], "bank": user.get("bank", 0), "stats": user["stats"], "xp": user["xp"], "level": user["level"], **field}})
    return {"ok": True, "money": user["money"], "bank": user.get("bank", 0), "inventory": user.get("inventory", {}), "drones": user.get("drones", {}), "xp": xp}

@api.post("/inventory/consume")
async def consume_item(data: ConsumeIn, request: Request):
    user = await get_current_user(request)
    item = find_any_item(data.item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    inv = user.get("inventory", {})
    if inv.get(item["id"], 0) < 1:
        raise HTTPException(400, "You don't have this item")
    t = item["type"]
    if t not in ("food", "drink", "medicine", "bm_medicine"):
        raise HTTPException(400, "This item can't be consumed")
    mh, ms = max_health(user["level"]), max_stamina(user["level"])
    msg = ""
    if t == "food":
        user["food_buffer"] = user.get("food_buffer", 0) + item["health_regen"]
        msg = f"Eating {item['name']} — +{item['health_regen']} Health will regenerate gradually."
    elif t == "drink":
        user["stamina"] = min(ms, user.get("stamina", 0) + item["stamina"])
        msg = f"+{item['stamina']} Stamina restored."
    elif t == "medicine":
        user["health"] = min(mh, user["health"] + item["health"])
        msg = f"+{item['health']} Health restored instantly."
    elif t == "bm_medicine":
        user["health"] = min(mh, user["health"] + item.get("health", 0))
        user["stamina"] = min(ms, user.get("stamina", 0) + item.get("stamina", 0))
        msg = f"+{item.get('health',0)} Health, +{item.get('stamina',0)} Stamina."
    inv[item["id"]] -= 1
    if inv[item["id"]] <= 0:
        inv.pop(item["id"], None)
    user["inventory"] = inv
    await db.users.update_one({"id": user["id"]}, {"$set": {"inventory": inv, "health": user["health"], "stamina": user["stamina"], "food_buffer": user.get("food_buffer", 0)}})
    return {"ok": True, "message": msg, "health": user["health"], "stamina": user["stamina"], "food_buffer": user.get("food_buffer", 0), "inventory": inv}

# ---------- CRATE OPENING ----------
@api.post("/inventory/open-crate")
async def open_crate(data: ConsumeIn, request: Request):
    user = await get_current_user(request)
    item = find_any_item(data.item_id)
    if not item or item.get("type") != "crate":
        raise HTTPException(400, "Not a crate")
    inv = user.get("inventory", {})
    if inv.get(item["id"], 0) < 1:
        raise HTTPException(400, "You don't have this crate")
    # Mystery gamble: random good + random total value that can fall well below the
    # crate's price (a loss) or land far above it (a jackpot).
    good = random.choice(CONTRABAND)
    price = _contraband_prices()[good["id"]]
    target_value = int(item["price"] * random.uniform(0.3, 1.9))
    units = max(1, int(round(target_value / max(1, price))))
    value = price * units
    holdings = user.get("contraband", {})
    holdings[good["id"]] = holdings.get(good["id"], 0) + units
    inv[item["id"]] -= 1
    if inv[item["id"]] <= 0:
        inv.pop(item["id"], None)
    await db.users.update_one({"id": user["id"]}, {"$set": {"inventory": inv, "contraband": holdings}})
    profit = value - item["price"]
    verdict = "JACKPOT" if profit >= item["price"] else ("PROFIT" if profit > 0 else "LOSS")
    return {"ok": True, "good_id": good["id"], "good_name": good["name"], "units": units, "unit": good["unit"],
            "value": value, "paid": item["price"], "profit": profit, "verdict": verdict, "contraband": holdings, "inventory": inv,
            "message": f"{verdict}! Opened crate: {units} {good['unit']}(s) of {good['name']} worth ~${value:,} (paid ${item['price']:,})."}


# ---------- DRONES ----------
@api.post("/drone/buy")
async def buy_drone(data: BuyItemIn, request: Request):
    data.item_id = data.item_id
    return await buy_item(BuyItemIn(item_id=data.item_id, quantity=1, payment_method="cash"), request)

@api.post("/heist/success-chance")
async def heist_success_preview(data: HeistIn, request: Request):
    user = await get_current_user(request)
    heist = find_item(HEISTS, data.heist_id)
    if not heist:
        raise HTTPException(404, "Heist not found")
    chance, breakdown = compute_success_chance(user, heist, data.crew_ids, data.vehicle_id, data.drone_id, data.player_ids)
    return {"success_chance": round(chance, 3), "breakdown": breakdown, "stamina_cost": CONFIG["heist_stamina_cost"].get(heist["type"], 20)}

# ---------- POLICE / BRIBE ----------
@api.post("/police/bribe")
async def bribe_police(request: Request):
    user = await get_current_user(request)
    heat = user.get("heat", 0)
    if heat <= 0:
        raise HTTPException(400, "No heat to clear")
    cost = int(300 + heat * heat * 3)  # scales with heat (cash only)
    charge_payment(user, cost, "cash", "illegal")
    user["heat"] = 0
    await db.users.update_one({"id": user["id"]}, {"$set": {"money": user["money"], "heat": 0, "stats": user["stats"]}})
    return {"ok": True, "money": user["money"], "heat": 0, "cost": cost}

@api.get("/police/bribe-cost")
async def bribe_cost(request: Request):
    user = await get_current_user(request)
    heat = user.get("heat", 0)
    return {"heat": heat, "heat_level": heat_level(heat), "cost": int(300 + heat * heat * 3)}

# ---------- PRISON / BAIL ----------
class BailIn(BaseModel):
    payment_method: str = "cash"

@api.get("/prison/status")
async def prison_status(request: Request):
    user = await get_current_user(request)
    prison = user.get("prison")
    if not prison:
        return {"in_prison": False}
    remaining = (datetime.fromisoformat(prison["until"]) - datetime.now(timezone.utc)).total_seconds()
    if remaining <= 0:
        await db.users.update_one({"id": user["id"]}, {"$set": {"prison": None}})
        return {"in_prison": False, "released": True}
    return {"in_prison": True, "remaining_seconds": int(remaining), "bail": prison["bail"], "reason": prison["reason"], "minutes": prison.get("minutes")}

@api.post("/prison/pay-bail")
async def pay_bail(data: BailIn, request: Request):
    user = await get_current_user(request)
    prison = user.get("prison")
    if not prison:
        raise HTTPException(400, "You are not in prison")
    charge_payment(user, prison["bail"], data.payment_method, "bail")
    await db.users.update_one({"id": user["id"]}, {"$set": {"money": user["money"], "bank": user.get("bank", 0), "prison": None, "stats": user["stats"]}})
    return {"ok": True, "money": user["money"], "bank": user.get("bank", 0), "released": True}

# ---------- NOTIFICATIONS ----------
@api.get("/notifications")
async def get_notifications(request: Request, limit: int = 40):
    user = await get_current_user(request)
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": items, "unread": unread}

class IdIn(BaseModel):
    id: str

@api.post("/notifications/read")
async def read_notification(data: IdIn, request: Request):
    user = await get_current_user(request)
    if data.id == "all":
        await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    else:
        await db.notifications.update_one({"user_id": user["id"], "id": data.id}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- MESSAGES ----------
class MessageIn(BaseModel):
    to_username: str
    body: str

@api.get("/messages")
async def get_messages(request: Request, limit: int = 60):
    user = await get_current_user(request)
    items = await db.messages.find({"$or": [{"to_id": user["id"]}, {"from_id": user["id"]}]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    unread = await db.messages.count_documents({"to_id": user["id"], "read": False})
    return {"messages": items, "unread": unread}

@api.post("/messages/send")
async def send_message(data: MessageIn, request: Request):
    user = await get_current_user(request)
    to = await db.users.find_one({"username": data.to_username})
    if not to:
        raise HTTPException(404, "User not found")
    doc = {"id": str(uuid.uuid4()), "from_id": user["id"], "from_username": user["username"], "to_id": to["id"],
           "to_username": to["username"], "body": data.body[:1000], "read": False, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.messages.insert_one(doc)
    await notify(to["id"], "message", "New Message", f"{user['username']}: {data.body[:60]}", link="messages")
    doc.pop("_id", None)
    return {"ok": True, "message": doc}

# ---------- GANG CHAT (uses existing messages infra, gang channel) ----------
class GangChatIn(BaseModel):
    body: str

@api.get("/messages/gang")
async def gang_chat(request: Request, limit: int = 80):
    user = await get_current_user(request)
    if not user.get("gang_id"):
        return {"messages": [], "gang": None}
    msgs = await db.gang_messages.find({"gang_id": user["gang_id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"messages": list(reversed(msgs))}

@api.post("/messages/gang/send")
async def gang_chat_send(data: GangChatIn, request: Request):
    user = await get_current_user(request)
    if not user.get("gang_id"):
        raise HTTPException(400, "You are not in a gang")
    doc = {"id": str(uuid.uuid4()), "gang_id": user["gang_id"], "from_id": user["id"], "from_username": user["username"],
           "body": data.body[:1000], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.gang_messages.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "message": doc}

# ---------- FRIEND CHAT (direct-message conversation view) ----------
@api.get("/messages/with/{username}")
async def messages_with(username: str, request: Request, limit: int = 80):
    user = await get_current_user(request)
    other = await db.users.find_one({"username": username})
    if not other:
        raise HTTPException(404, "User not found")
    msgs = await db.messages.find({"$or": [
        {"from_id": user["id"], "to_id": other["id"]},
        {"from_id": other["id"], "to_id": user["id"]},
    ]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    await db.messages.update_many({"from_id": other["id"], "to_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"messages": list(reversed(msgs))}


@api.post("/messages/read")
async def read_message(data: IdIn, request: Request):
    user = await get_current_user(request)
    if data.id == "all":
        await db.messages.update_many({"to_id": user["id"]}, {"$set": {"read": True}})
    else:
        await db.messages.update_one({"to_id": user["id"], "id": data.id}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- FRIENDS ----------
class UsernameIn(BaseModel):
    username: str

@api.get("/users/search")
async def search_users(request: Request, q: str = ""):
    user = await get_current_user(request)
    if len(q) < 2:
        return []
    cur = await db.users.find({"username": {"$regex": q, "$options": "i"}, "id": {"$ne": user["id"]}, "specialization": {"$ne": None}}, {"_id": 0, "username": 1, "level": 1, "specialization": 1, "id": 1, "last_regen_tick": 1}).limit(15).to_list(15)
    return [{"username": u["username"], "level": u.get("level", 1), "specialization": u.get("specialization"), "online": is_online(u)} for u in cur]

@api.get("/friends")
async def get_friends(request: Request):
    user = await get_current_user(request)
    fids = user.get("friends", [])
    friends = []
    if fids:
        cur = await db.users.find({"id": {"$in": fids}}, {"_id": 0, "id": 1, "username": 1, "level": 1, "specialization": 1, "last_regen_tick": 1}).to_list(200)
        friends = [{"id": u["id"], "username": u["username"], "level": u.get("level", 1), "specialization": u.get("specialization"), "online": is_online(u)} for u in cur]
    # pending incoming requests
    reqs = await db.friend_requests.find({"to_id": user["id"], "status": "pending"}, {"_id": 0}).to_list(50)
    return {"friends": friends, "requests": reqs}

@api.post("/friends/request")
async def friend_request(data: UsernameIn, request: Request):
    user = await get_current_user(request)
    to = await db.users.find_one({"username": data.username})
    if not to or to["id"] == user["id"]:
        raise HTTPException(404, "User not found")
    if to["id"] in user.get("friends", []):
        raise HTTPException(400, "Already friends")
    existing = await db.friend_requests.find_one({"from_id": user["id"], "to_id": to["id"], "status": "pending"})
    if existing:
        raise HTTPException(400, "Request already sent")
    req = {"id": str(uuid.uuid4()), "from_id": user["id"], "from_username": user["username"], "to_id": to["id"], "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.friend_requests.insert_one(req)
    await notify(to["id"], "friend_request", "Friend Request", f"{user['username']} wants to be your friend.", link="friends", data={"request_id": req["id"]})
    return {"ok": True}

class RespondIn(BaseModel):
    request_id: str
    accept: bool

@api.post("/friends/respond")
async def friend_respond(data: RespondIn, request: Request):
    user = await get_current_user(request)
    req = await db.friend_requests.find_one({"id": data.request_id, "to_id": user["id"], "status": "pending"})
    if not req:
        raise HTTPException(404, "Request not found")
    status = "accepted" if data.accept else "declined"
    await db.friend_requests.update_one({"id": req["id"]}, {"$set": {"status": status}})
    if data.accept:
        await db.users.update_one({"id": user["id"]}, {"$addToSet": {"friends": req["from_id"]}})
        await db.users.update_one({"id": req["from_id"]}, {"$addToSet": {"friends": user["id"]}})
        await notify(req["from_id"], "friend_accept", "Friend Request Accepted", f"{user['username']} accepted your friend request.", link="friends")
    return {"ok": True}

@api.post("/friends/remove")
async def friend_remove(data: UsernameIn, request: Request):
    user = await get_current_user(request)
    other = await db.users.find_one({"username": data.username})
    if not other:
        raise HTTPException(404, "User not found")
    await db.users.update_one({"id": user["id"]}, {"$pull": {"friends": other["id"]}})
    await db.users.update_one({"id": other["id"]}, {"$pull": {"friends": user["id"]}})
    return {"ok": True}

# ---------- HEIST FRIEND INVITES ----------
class HeistInviteIn(BaseModel):
    friend_username: str
    heist_id: str

@api.post("/heist/invite")
async def heist_invite(data: HeistInviteIn, request: Request):
    user = await get_current_user(request)
    friend = await db.users.find_one({"username": data.friend_username})
    if not friend:
        raise HTTPException(404, "Friend not found")
    heist = find_item(HEISTS, data.heist_id)
    inv = {"id": str(uuid.uuid4()), "type": "heist", "from_id": user["id"], "from_username": user["username"], "to_id": friend["id"], "heist_id": data.heist_id, "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.heist_invites.insert_one(inv)
    await notify(friend["id"], "heist_invite", "Heist Invite", f"{user['username']} invited you to {heist['name'] if heist else 'a heist'}.", link="heists", data={"invite_id": inv["id"]})
    return {"ok": True}

@api.post("/heist/invite/respond")
async def heist_invite_respond(data: RespondIn, request: Request):
    user = await get_current_user(request)
    inv = await db.heist_invites.find_one({"id": data.request_id, "to_id": user["id"], "status": "pending"})
    if not inv:
        raise HTTPException(404, "Invite not found")
    await db.heist_invites.update_one({"id": inv["id"]}, {"$set": {"status": "accepted" if data.accept else "declined"}})
    if data.accept:
        await notify(inv["from_id"], "heist_accept", "Heist Invite Accepted", f"{user['username']} joined your crew.", link="heists")
    return {"ok": True, "accepted": data.accept}

@api.get("/heist/accepted-crew/{heist_id}")
async def heist_accepted_crew(heist_id: str, request: Request):
    """Friends (real players) who accepted my invite for this heist."""
    user = await get_current_user(request)
    invs = await db.heist_invites.find({"from_id": user["id"], "heist_id": heist_id, "status": "accepted"}, {"_id": 0}).to_list(20)
    ids = [i["to_id"] for i in invs]
    players = []
    if ids:
        cur = await db.users.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "username": 1, "level": 1, "specialization": 1}).to_list(20)
        players = [{"id": u["id"], "username": u["username"], "level": u.get("level", 1), "specialization": u.get("specialization")} for u in cur]
    return players

# ========================= GANG SYSTEM =========================
class GangCreateIn(BaseModel):
    name: str = Field(min_length=3, max_length=30)
    description: str = ""
    max_members: int = 20

async def gang_member_rank(gang, member):
    """Compute display rank for a member using role + tenure + gang heists."""
    if member["user_id"] == gang["leader_id"]:
        return "Neon King"
    if member.get("role") == "gridmaster":
        return "GridMaster"
    joined = datetime.fromisoformat(member["joined_at"])
    days = (datetime.now(timezone.utc) - joined).total_seconds() / 86400
    mu = await db.users.find_one({"id": member["user_id"]}, {"_id": 0, "stats": 1})
    gh = ((mu or {}).get("stats") or {}).get("gang_heists", 0)
    if days >= CONFIG["hitman_days"] or gh >= CONFIG["hitman_gang_heists"]:
        return "Hitman"
    return "Ghost"

def gang_permissions(rank):
    return {
        "invite": rank in ("Neon King", "GridMaster"),
        "remove": rank == "Neon King",
        "manage": rank == "Neon King",
        "manage_inventory": rank in ("Neon King", "GridMaster", "Hitman"),
    }

async def serialize_gang(gang, viewer_id=None):
    members = []
    for m in gang.get("members", []):
        rank = await gang_member_rank(gang, m)
        mu = await db.users.find_one({"id": m["user_id"]}, {"_id": 0, "username": 1, "level": 1, "last_regen_tick": 1, "stats": 1})
        members.append({"user_id": m["user_id"], "username": (mu or {}).get("username", "?"), "level": (mu or {}).get("level", 1),
                        "rank": rank, "role": m.get("role"), "joined_at": m["joined_at"],
                        "gang_heists": ((mu or {}).get("stats") or {}).get("gang_heists", 0),
                        "online": is_online(mu or {}), "permissions": gang_permissions(rank)})
    return {"id": gang["id"], "name": gang["name"], "description": gang.get("description", ""), "max_members": gang.get("max_members", 20),
            "leader_id": gang["leader_id"], "created_at": gang.get("created_at"), "level": gang.get("level", 1),
            "earnings": gang.get("earnings", 0), "members": members, "member_count": len(members),
            "inventory": gang.get("inventory", {})}

@api.get("/gang")
async def my_gang(request: Request):
    user = await get_current_user(request)
    if not user.get("gang_id"):
        return {"gang": None}
    gang = await db.gangs.find_one({"id": user["gang_id"]})
    if not gang:
        await db.users.update_one({"id": user["id"]}, {"$set": {"gang_id": None}})
        return {"gang": None}
    return {"gang": await serialize_gang(gang, user["id"])}

@api.post("/gang/create")
async def create_gang(data: GangCreateIn, request: Request):
    user = await get_current_user(request)
    if user.get("gang_id"):
        raise HTTPException(400, "You are already in a gang")
    if await db.gangs.find_one({"name": data.name}):
        raise HTTPException(400, "Gang name taken")
    gid = str(uuid.uuid4())
    gang = {"id": gid, "name": data.name, "description": data.description, "max_members": max(2, min(50, data.max_members)),
            "leader_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat(), "level": 1, "earnings": 0,
            "members": [{"user_id": user["id"], "joined_at": datetime.now(timezone.utc).isoformat(), "role": "leader"}],
            "inventory": {}}
    await db.gangs.insert_one(gang)
    await db.users.update_one({"id": user["id"]}, {"$set": {"gang_id": gid}})
    return {"ok": True, "gang": await serialize_gang(gang, user["id"])}

@api.post("/gang/invite")
async def gang_invite(data: UsernameIn, request: Request):
    user = await get_current_user(request)
    gang = await db.gangs.find_one({"id": user.get("gang_id")})
    if not gang:
        raise HTTPException(400, "You are not in a gang")
    me = next((m for m in gang["members"] if m["user_id"] == user["id"]), None)
    rank = await gang_member_rank(gang, me)
    if not gang_permissions(rank)["invite"]:
        raise HTTPException(403, "You don't have permission to invite")
    if len(gang["members"]) >= gang["max_members"]:
        raise HTTPException(400, "Gang is full")
    target = await db.users.find_one({"username": data.username})
    if not target:
        raise HTTPException(404, "User not found")
    if target.get("gang_id"):
        raise HTTPException(400, "User already in a gang")
    inv = {"id": str(uuid.uuid4()), "type": "gang", "gang_id": gang["id"], "gang_name": gang["name"], "from_username": user["username"], "to_id": target["id"], "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.gang_invites.insert_one(inv)
    await notify(target["id"], "gang_invite", "Gang Invite", f"{user['username']} invited you to join {gang['name']}.", link="gang", data={"invite_id": inv["id"]})
    return {"ok": True}

@api.get("/gang/invites")
async def gang_invites(request: Request):
    user = await get_current_user(request)
    invs = await db.gang_invites.find({"to_id": user["id"], "status": "pending"}, {"_id": 0}).to_list(20)
    return invs

@api.post("/gang/invite/respond")
async def gang_invite_respond(data: RespondIn, request: Request):
    user = await get_current_user(request)
    inv = await db.gang_invites.find_one({"id": data.request_id, "to_id": user["id"], "status": "pending"})
    if not inv:
        raise HTTPException(404, "Invite not found")
    await db.gang_invites.update_one({"id": inv["id"]}, {"$set": {"status": "accepted" if data.accept else "declined"}})
    if data.accept:
        if user.get("gang_id"):
            raise HTTPException(400, "Already in a gang")
        gang = await db.gangs.find_one({"id": inv["gang_id"]})
        if not gang:
            raise HTTPException(404, "Gang no longer exists")
        if len(gang["members"]) >= gang["max_members"]:
            raise HTTPException(400, "Gang is full")
        await db.gangs.update_one({"id": gang["id"]}, {"$push": {"members": {"user_id": user["id"], "joined_at": datetime.now(timezone.utc).isoformat(), "role": "member"}}})
        await db.users.update_one({"id": user["id"]}, {"$set": {"gang_id": gang["id"]}})
        await notify(gang["leader_id"], "gang_join", "New Gang Member", f"{user['username']} joined {gang['name']}.", link="gang")
    return {"ok": True, "accepted": data.accept}

class GangMemberActionIn(BaseModel):
    user_id: str
    role: Optional[str] = None  # "gridmaster" | "member"

@api.post("/gang/set-role")
async def gang_set_role(data: GangMemberActionIn, request: Request):
    user = await get_current_user(request)
    gang = await db.gangs.find_one({"id": user.get("gang_id")})
    if not gang or gang["leader_id"] != user["id"]:
        raise HTTPException(403, "Only the Neon King can assign roles")
    role = data.role if data.role in ("gridmaster", "member") else "member"
    members = gang["members"]
    for m in members:
        if m["user_id"] == data.user_id:
            m["role"] = role
    await db.gangs.update_one({"id": gang["id"]}, {"$set": {"members": members}})
    return {"ok": True, "gang": await serialize_gang({**gang, "members": members}, user["id"])}

@api.post("/gang/kick")
async def gang_kick(data: GangMemberActionIn, request: Request):
    user = await get_current_user(request)
    gang = await db.gangs.find_one({"id": user.get("gang_id")})
    if not gang or gang["leader_id"] != user["id"]:
        raise HTTPException(403, "Only the Neon King can remove members")
    if data.user_id == gang["leader_id"]:
        raise HTTPException(400, "Leader can't be removed")
    members = [m for m in gang["members"] if m["user_id"] != data.user_id]
    await db.gangs.update_one({"id": gang["id"]}, {"$set": {"members": members}})
    await db.users.update_one({"id": data.user_id}, {"$set": {"gang_id": None}})
    return {"ok": True}

@api.post("/gang/leave")
async def gang_leave(request: Request):
    user = await get_current_user(request)
    gang = await db.gangs.find_one({"id": user.get("gang_id")})
    if not gang:
        raise HTTPException(400, "Not in a gang")
    if gang["leader_id"] == user["id"]:
        # disband if leader leaves
        for m in gang["members"]:
            await db.users.update_one({"id": m["user_id"]}, {"$set": {"gang_id": None}})
        await db.gangs.delete_one({"id": gang["id"]})
        return {"ok": True, "disbanded": True}
    members = [m for m in gang["members"] if m["user_id"] != user["id"]]
    await db.gangs.update_one({"id": gang["id"]}, {"$set": {"members": members}})
    await db.users.update_one({"id": user["id"]}, {"$set": {"gang_id": None}})
    return {"ok": True}

# ---------- GANG INVENTORY ----------
class GangItemIn(BaseModel):
    item_id: str
    quantity: int = 1

@api.post("/gang/inventory/deposit")
async def gang_deposit(data: GangItemIn, request: Request):
    user = await get_current_user(request)
    gang = await db.gangs.find_one({"id": user.get("gang_id")})
    if not gang:
        raise HTTPException(400, "Not in a gang")
    qty = max(1, int(data.quantity))
    inv = user.get("inventory", {})
    if inv.get(data.item_id, 0) < qty:
        raise HTTPException(400, "Not enough in your inventory")
    inv[data.item_id] -= qty
    if inv[data.item_id] <= 0:
        inv.pop(data.item_id, None)
    ginv = gang.get("inventory", {})
    ginv[data.item_id] = ginv.get(data.item_id, 0) + qty
    await db.users.update_one({"id": user["id"]}, {"$set": {"inventory": inv}})
    await db.gangs.update_one({"id": gang["id"]}, {"$set": {"inventory": ginv}})
    return {"ok": True, "gang_inventory": ginv, "inventory": inv}

@api.post("/gang/inventory/withdraw")
async def gang_withdraw(data: GangItemIn, request: Request):
    user = await get_current_user(request)
    gang = await db.gangs.find_one({"id": user.get("gang_id")})
    if not gang:
        raise HTTPException(400, "Not in a gang")
    me = next((m for m in gang["members"] if m["user_id"] == user["id"]), None)
    rank = await gang_member_rank(gang, me)
    if not gang_permissions(rank)["manage_inventory"]:
        raise HTTPException(403, "No permission to withdraw")
    qty = max(1, int(data.quantity))
    ginv = gang.get("inventory", {})
    if ginv.get(data.item_id, 0) < qty:
        raise HTTPException(400, "Not enough in gang inventory")
    ginv[data.item_id] -= qty
    if ginv[data.item_id] <= 0:
        ginv.pop(data.item_id, None)
    inv = user.get("inventory", {})
    if find_any_item(data.item_id) and find_any_item(data.item_id)["type"] == "drone":
        drones = user.get("drones", {})
        drones[data.item_id] = drones.get(data.item_id, 0) + qty
        await db.users.update_one({"id": user["id"]}, {"$set": {"drones": drones}})
    else:
        inv[data.item_id] = inv.get(data.item_id, 0) + qty
        await db.users.update_one({"id": user["id"]}, {"$set": {"inventory": inv}})
    await db.gangs.update_one({"id": gang["id"]}, {"$set": {"inventory": ginv}})
    return {"ok": True, "gang_inventory": ginv}

# ---------- GANG RANKINGS ----------
@api.get("/rankings/gangs")
async def gang_rankings(request: Request):
    gangs = await db.gangs.find({}, {"_id": 0}).to_list(2000)
    ranked = sorted(gangs, key=lambda g: g.get("earnings", 0), reverse=True)
    def row(g, i):
        return {"position": i + 1, "name": g["name"], "level": g.get("level", 1), "earnings": g.get("earnings", 0), "members": len(g.get("members", []))}
    top = [row(g, i) for i, g in enumerate(ranked[:15])]
    me = None
    try:
        user = await get_current_user(request)
        if user.get("gang_id"):
            idx = next((i for i, g in enumerate(ranked) if g["id"] == user["gang_id"]), None)
            if idx is not None and idx >= 15:
                me = row(ranked[idx], idx)
    except Exception:
        pass
    return {"top": top, "me": me}

@api.get("/")
async def root():
    return {"game": "The Law of Silence", "status": "online"}

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    log.info("The Law of Silence — backend online.")

@app.on_event("shutdown")
async def shutdown():
    client.close()
