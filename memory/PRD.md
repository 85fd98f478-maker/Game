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

## Backlog / Next (P2)
- Optional: split server.py into routers for maintainability.
- Optional: crate "open" mechanic for random contraband.
- Optional: gang chat, heist co-op live sessions.
