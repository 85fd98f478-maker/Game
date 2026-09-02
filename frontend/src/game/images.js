// Local image slices from the user's dashboard reference art.
// Files live in /app/frontend/public/dashboard/
const BASE = "/dashboard";

export const HERO_BG = `${BASE}/hero.png`;
export const PORTRAIT_BG = `${BASE}/portrait.png`;

// Dashboard section cards (used by Home.jsx BigCard image={CARD_BG.xxx})
export const CARD_BG = {
  inventory:  `${BASE}/inventory.png`,
  arsenal:    `${BASE}/arsenal.png`,
  garage:     `${BASE}/garage.png`,
  crew:       `${BASE}/crew.png`,
  heists:     `${BASE}/heists.png`,
  properties: `${BASE}/properties.png`,
  businesses: `${BASE}/businesses.png`,
  map:        `${BASE}/map.png`,
  progress:   `${BASE}/progress.png`,
};

// Featured art (weapon/vehicle/contract) - clean artwork
export const FEATURED_ART = {
  weapon:   `${BASE}/featured_weapon_art.png`,
  vehicle:  `${BASE}/featured_vehicle_art.png`,
  contract: `${BASE}/daily_contract_art.png`,
};

// Full city map artworks (used by MapView)
export const CITY_MAP_BG = `${BASE}/citymap_full2.png`;

// Per-item artwork keyed by weapon category
export const WEAPON_IMG = {
  melee:   `${BASE}/weapon_melee.png`,
  pistol:  `${BASE}/weapon_pistol.png`,
  smg:     `${BASE}/weapon_smg.png`,
  rifle:   `${BASE}/weapon_rifle.png`,
  shotgun: `${BASE}/weapon_shotgun.png`,
  sniper:  `${BASE}/weapon_sniper.png`,
  special: `${BASE}/weapon_special.png`,
};

// Armor artwork keyed by armor id
export const ARMOR_IMG = {
  light_armor: `${BASE}/armor_light.png`,
  med_armor:   `${BASE}/armor_tactical.png`,
  heavy_armor: `${BASE}/armor_heavy.png`,
};

// Per-item weapon artwork keyed by weapon id (backend catalog)
export const WEAPON_ITEM_IMG = {
  knife:    `${BASE}/weapon_knife.png`,
  bat:      `${BASE}/weapon_bat.png`,
  katana:   `${BASE}/weapon_katana.png`,
  glock17:  `${BASE}/weapon_glock17.png`,
  beretta:  `${BASE}/weapon_beretta.png`,
  tec9:     `${BASE}/weapon_tec9.png`,
  ump45:    `${BASE}/weapon_ump45.png`,
  mp5:      `${BASE}/weapon_mp5.png`,
  p90:      `${BASE}/weapon_p90.png`,
  ak47:     `${BASE}/weapon_ak47.png`,
  m4a1:     `${BASE}/weapon_m4a1.png`,
  scarl:    `${BASE}/weapon_scarl.png`,
  mossberg: `${BASE}/weapon_mossberg.png`,
  spas12:   `${BASE}/weapon_spas12.png`,
  aa12:     `${BASE}/weapon_aa12.png`,
  awm:      `${BASE}/weapon_awm.png`,
  m24:      `${BASE}/weapon_m24.png`,
  dragunov: `${BASE}/weapon_dragunov.png`,
  railgun:  `${BASE}/weapon_railgun.png`,
  plasma:   `${BASE}/weapon_plasma.png`,
  smartsmg: `${BASE}/weapon_smartsmg.png`,
};

export const VEHICLE_IMG = {
  compact: `${BASE}/vehicle_compact.png`,
  sport:   `${BASE}/vehicle_sport.png`,
  muscle:  `${BASE}/vehicle_muscle.png`,
  super:   `${BASE}/vehicle_super.png`,
  bike:    `${BASE}/vehicle_bike.png`,
  armored: `${BASE}/vehicle_armored.png`,
  utility: `${BASE}/vehicle_compact.png`,
};

export const VEHICLE_ITEM_IMG = {
  compact_x:   `${BASE}/vehicle_compact.png`,
  hatchback:   `${BASE}/vehicle_hatchback.png`,
  nightfall:   `${BASE}/vehicle_sport.png`,
  chrome_r:    `${BASE}/vehicle_chrome.png`,
  muscle_v8:   `${BASE}/vehicle_muscle.png`,
  phantom_s:   `${BASE}/vehicle_super.png`,
  hypercar:    `${BASE}/vehicle_hyper.png`,
  neon_bike:   `${BASE}/vehicle_bike.png`,
  armored_suv: `${BASE}/vehicle_armored.png`,
  riot_truck:  `${BASE}/vehicle_riot.png`,
  stealth_van: `${BASE}/vehicle_van.png`,
  prototype_x: `${BASE}/vehicle_prototype.png`,
  starter:     `${BASE}/vehicle_compact.png`,
};

// Character portraits keyed by avatar id (see CharacterSelect.jsx AVATARS)
export const CHARACTER_IMG = {
  av_1: `${BASE}/char_street_thug.png`, // Street Thug
  av_2: `${BASE}/char_netrunner.png`,   // Netrunner
  av_3: `${BASE}/char_solo.png`,        // Solo
  av_4: `${BASE}/char_techie.png`,      // Techie
  av_5: `${BASE}/char_kingpin.png`,     // Kingpin
  av_6: `${BASE}/char_legend.png`,      // Wraith → Legend art
  av_7: `${BASE}/char_operative_f.png`, // Operative (f)
  av_8: `${BASE}/char_enforcer_f.png`,  // Enforcer (f)
  av_9: `${BASE}/char_ronin_f.png`,     // Ronin (f)
  av_10: `${BASE}/char_assassin_f.png`, // Assassin (f)
  av_11: `${BASE}/char_enforcer_m.png`, // Enforcer robot + bat
  av_12: `${BASE}/char_legend_crown.png`, // Golden skull + crown
};

// Property artwork keyed by property id
export const PROPERTY_IMG = {
  prop_apartment: `${BASE}/property_apartment.png`,
  prop_safehouse: `${BASE}/property_safehouse.png`,
  prop_penthouse: `${BASE}/property_penthouse.png`,
  prop_compound:  `${BASE}/property_compound.png`,
  prop_estate:    `${BASE}/property_estate.png`,
};
export const BUSINESS_IMG = {
  biz_carwash: `${BASE}/business_carwash.png`,
  biz_bar:     `${BASE}/business_bar.png`,
  biz_pawn:    `${BASE}/business_pawn.png`,
  biz_club:    `${BASE}/business_club.png`,
  biz_casino:  `${BASE}/business_casino.png`,
};

// Heist / operation artwork keyed by heist id
export const HEIST_IMG = {
  op_convenience: `${BASE}/heist_convenience.png`,
  op_atm:         `${BASE}/heist_atm.png`,
  op_gasstation:  `${BASE}/heist_gasstation.png`,
  op_street_drug: `${BASE}/heist_street_drug.png`,
  op_jewelry:     `${BASE}/heist_jewelry.png`,
  op_warehouse:   `${BASE}/heist_warehouse.png`,
  op_armored:     `${BASE}/heist_armored.png`,
  op_casino:      `${BASE}/heist_casino.png`,
  op_bank:        `${BASE}/heist_bank.png`,
  op_datacenter:  `${BASE}/heist_datacenter.png`,
  op_penthouse:   `${BASE}/heist_penthouse.png`,
};

// Crew member avatars keyed by npc id
export const CREW_IMG = {
  npc_1:  `${BASE}/crew_npc_1.png`,
  npc_2:  `${BASE}/crew_npc_2.png`,
  npc_3:  `${BASE}/crew_npc_3.png`,
  npc_4:  `${BASE}/crew_npc_4.png`,
  npc_5:  `${BASE}/crew_npc_5.png`,
  npc_6:  `${BASE}/crew_npc_6.png`,
  npc_7:  `${BASE}/crew_npc_7.png`,
  npc_8:  `${BASE}/crew_npc_8.png`,
  npc_9:  `${BASE}/crew_npc_9.png`,
  npc_10: `${BASE}/crew_npc_10.png`,
};

// Item system artwork (food / drinks / medicine / black market / drones)
const IB = "/dashboard";
export const ITEM_IMG = {
  food_cheap: `${IB}/item_food_cheap.png`,
  food_mid: `${IB}/item_food_mid.png`,
  food_expensive: `${IB}/item_food_expensive.png`,
  drink_cheap: `${IB}/item_drink_cheap.png`,
  drink_mid: `${IB}/item_drink_mid.png`,
  drink_expensive: `${IB}/item_drink_expensive.png`,
  medicine_basic: `${IB}/item_medicine_basic.png`,
  medicine_advanced: `${IB}/item_medicine_advanced.png`,
  drone_recon: `${IB}/item_drone_recon.png`,
  drone_combat: `${IB}/item_drone_combat.png`,
  drone_tech: `${IB}/item_drone_tech.png`,
  contraband_crate: `${IB}/item_contraband_crate.png`,
  crate_tobacco: `${IB}/item_crate_tobacco.png`,
  crate_weed: `${IB}/item_crate_weed.png`,
  crate_alcohol: `${IB}/item_crate_alcohol.png`,
  crate_counterfeit: `${IB}/item_crate_counterfeit.png`,
  crate_cocaine: `${IB}/item_crate_cocaine.png`,
};
// Dynamic money-tier artwork. Cash = banknotes/piles only. Bank can reach gold bars.
export const CASH_TIERS = [
  { min: 0, img: `${IB}/item_cash_tier1.png` },
  { min: 10000, img: `${IB}/item_cash_tier2.png` },
  { min: 100000, img: `${IB}/item_cash_tier3.png` },
];
export const BANK_TIERS = [
  { min: 0, img: `${IB}/item_cash_tier2.png` },
  { min: 50000, img: `${IB}/item_cash_tier3.png` },
  { min: 250000, img: `${IB}/item_bank_gold.png` },
];
export function tierImg(tiers, val) {
  let out = tiers[0].img;
  for (const t of tiers) { if (val >= t.min) out = t.img; }
  return out;
}
export const ITEM_IMG_BY_ID = {
  food_noodles: ITEM_IMG.food_cheap, food_burger: ITEM_IMG.food_mid, food_sushi: ITEM_IMG.food_expensive,
  drink_soda: ITEM_IMG.drink_cheap, drink_sports: ITEM_IMG.drink_mid, drink_elixir: ITEM_IMG.drink_expensive,
  med_stim: ITEM_IMG.medicine_basic, med_nano: ITEM_IMG.medicine_advanced,
  bm_combat_stim: ITEM_IMG.medicine_basic, bm_crate: ITEM_IMG.contraband_crate, crate_mystery: ITEM_IMG.contraband_crate,
  crate_tobacco: ITEM_IMG.crate_tobacco, crate_weed: ITEM_IMG.crate_weed, crate_alcohol: ITEM_IMG.crate_alcohol,
  crate_counterfeit: ITEM_IMG.crate_counterfeit, crate_cocaine: ITEM_IMG.crate_cocaine,
  drone_recon: ITEM_IMG.drone_recon, drone_combat: ITEM_IMG.drone_combat, drone_tech: ITEM_IMG.drone_tech,
};
// Contraband good artwork keyed by good id (Street Prices · Live)
export const GOOD_IMG = {
  tobacco: ITEM_IMG.crate_tobacco,
  weed: ITEM_IMG.crate_weed,
  alcohol: ITEM_IMG.crate_alcohol,
  counterfeit: ITEM_IMG.crate_counterfeit,
  cocaine: ITEM_IMG.crate_cocaine,
};
