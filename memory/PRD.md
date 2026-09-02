# PRD — The Law of Silence (Neon City)

## Original Problem Statement
Extend the EXISTING cyberpunk crime game with 22 interlinked systems (Items/Market/Inventory, Black Market, Health/Stamina, Money/Bank/Payments, Inventory money visuals, Notifications/Messages/Friends, Gang + Gang Inventory + Ranks, Rankings, Map, Heists, Crew, Player Specializations, Friend Invites, Success Chance, Vehicles, Drones, Drone Loss, HEAT, Prison/Bail/Bribe, Businesses), reusing existing architecture and assets, single final QA.

## User Choices
- In-game currency only (no real payments / Stripe).
- Deliver all-at-once with a single final QA.
- Generate missing cyberpunk item images (drones, food, drinks, medicine, crates, money tiers).
- Real date logic for gang tenure ranks.

## Architecture
- Backend: FastAPI single module `/app/backend/server.py` (+ config-driven catalogs), MongoDB via motor. JWT auth.
- Frontend: React (CRA/craco), tab-based game shell (`pages/Game.jsx`), inline-styled cyberpunk UI, shadcn available.
- Assets: local `/app/frontend/public/dashboard/` (item_*.png added).

## Implemented (2026-06)
- Unified Item System: FOOD/DRINK/MEDICINE + BLACKMARKET_ITEMS + DRONES catalogs; `/api/catalog` exposes them + config.
- Market tab with Cash/Bank payment selector; Black Market tab (illegal = cash only) + contraband trading.
- Inventory: dynamic money-tier visuals (cash notes / bank gold), consumables with qty + consume, gear/crate/drone storage.
- Health (slow natural + gradual food regen + instant medicine) & Stamina (drinks; consumed by heists). Energy removed. Max scales with level.
- Centralized payments (`charge_payment`, `allowed_payment_methods`); bank deposit/withdraw 10% fee; illegal activities cash-only; Bail cash/bank.
- Notifications / Messages / Friends (requests via notifications, online/offline).
- Gang system (Neon King / GridMaster / Ghost / Hitman via tenure+gang-heists), permissions, invites, roles, kick/leave; Gang Inventory (deposit/withdraw, single image + qty overlay); Gang earnings.
- Rankings: Player Top 15 + own position, Gang Top 15 + own, by total earnings.
- Heists: per-heist cooldown, stamina cost + gate, dynamic Success Chance (level/crew/spec/vehicle/capacity/heat/drone/random), Crew X/Y, Vehicle capacity gating, Friend invites into crew, hired-crew validation.
- Drones: max 1, contextual synergy per heist context, permanent drone loss event.
- HEAT levels + Bribe Police (cash only, scales with heat). Prison/Arrest/Bail (dynamic time & bail, cash/bank), heists locked in prison.
- Businesses: updated values, cash/bank purchase, detailed inspections (Minor / Health-Safety / Illegal / Major Raid) with HEAT + rare temporary closure.

## Status
Final QA (test_reports/iteration_1.json): backend 29/29 pass, frontend flows 100%, no critical/minor issues.

## Iteration 2 (2026-06) — Heist Deep Polish, Black Market Crate Cleanup, Artwork Banners
Tested in test_reports/iteration_2.json (backend + frontend, no issues).
- Black Market: removed the 5 named buyable crates; kept ONE "Mystery Contraband Crate" ($1500) that opens for a RANDOM good with a variable payout (genuine gamble — can lose or jackpot, /api/inventory/open-crate). Street-Prices·Live goods (tobacco/weed/alcohol[Moonshine]/counterfeit/cocaine) now render artwork thumbnails (GOOD_IMG map).
- Heist system (no rebuild): two-phase /api/heist/run. Phase 1 (no 'choice') = Mission Briefing + context-aware approach/entry narrative + interactive Split-Second Decision, NO state change. Phase 2 (choice + t0) resolves: applies decision bias, rolls outcome, streams complication/escape narrative, mutates state.
  - Mission Briefing panel (objective/location/approach/getaway/drone/stamina) + live success chance.
  - Weapon-aware combat: firearm → "shoot/burst", consumes ammo per takedown (ammo pool decreases); melee → "cut/strike down"; unarmed → "overpower bare-handed"; both no ammo.
  - Interactive decision keys: hard/low (combat), rush/slip (stealth), brute/spoof (tech). Aggressive = bigger reward, more heat/capture/HP risk; cautious = safer, smaller.
  - Shared Loot Log: pot split evenly among REAL players only (NPCs get flat fee, no cut); each real player credited + notified; loot_log rendered in outcome.
- Artwork banners added to Social (new bg_social.png), Prison (free state), Gang (no-gang state); PvP already had one. Inventory now shows thumbnails in Equipped Loadout / Weapons / Armor / Vehicles.

## Backlog / Next (P2)
- Optional: split server.py into routers (now ~2295 lines) — maintainability.
- Optional: rename contraband good id 'alcohol' → 'moonshine' for readability.
- Optional: lock heist loadout tuple between phase 1 and phase 2 (signed briefing token) to prevent roll-gaming.
- Optional: gang chat live sessions, heist co-op live sessions.

## Iteration 3 (2026-06) — Gameplay/Economy/PvP/Casino/Daily Contract
- Weapon flavor: per-weapon combat lines (WEAPON_FLAVOR, 21 guns/blades); firearms consume ammo per takedown with strict cap + OUT_OF_AMMO fallback; melee/unarmed never use gun terms or ammo.
- Individual heist cooldowns: each HEIST has its own `cooldown` (120s→7200s by farmability); exposed in /catalog.
- XP from all activities: grant_xp() + XP_RULES; purchases (spend-based, min $1k, cap 60), casino (wager-based, cap 20), raids (win 45 / loss 8 / +10 gang assist). Heists remain highest.
- PvP overhaul: power_score matchmaking (fair band 0.55–1.75x), /pvp/targets random pool + NPC bot fallback, /pvp/search (player or gang by name/tag), /pvp/invite+respond+accepted-allies (friend/gang raid party, loot split), anti-farming (2h per-target cooldown, 30min post-raid protection, 24h diminishing rewards), defender loss floor.
- Casino (in-game only): /casino/play (highcard/slots/roulette NPC) + /casino/challenge(+respond) friend High-Card with escrow; 15% configurable fee (CASINO.fee_pct); house edge; XP; new Casino tab.
- Daily Contract: /daily-contract server-side day-index rotation (24h), +30% cash (DAILY_MULT, configurable), 1 success/cycle, failure retryable after underlying heist cooldown; reuses heist flow; dashboard card + Heists auto-open (window.__openHeist).
- UI: HUD money compact + full-value title tooltip + responsive stat row; heist outcome labels simplified (PERFECT SUCCESS→SUCCESS display) + Daily bonus badge; gang deposit empty-state hint.
- Verified: backend curl (daily-contract, casino slots, pvp targets) + frontend smoke screenshots (dashboard daily card, casino tab). NOT yet run through full testing_agent regression — recommended next.
