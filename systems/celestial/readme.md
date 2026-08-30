# Celestial Powers

The talent system owns up to three permanent power roots; completing a branch
capstone opens another root. Star Heart state owns one equipped power, a shared
legacy 200-charge save bank, and Heart migration. Every action-bar Celestial
power spends the configured 100 GP through `PlayerAbilities`; zero-charge saves
remain fully usable. Effects receive world and reward callbacks; they never
mutate `WorldModel` directly.

All baseline balance, copy, visual sizing, and safety caps live in
`values/celestialEngines.js`; `values/celestialTalentEffects.js` resolves the
purchased-node scaling. Only one power activation may run at once, and every
activation remains bounded by time and impact counts. Protected tiles remain
authoritative in `WorldModel.isDiggable()`.

The single-active-power limit applies only between Celestial Engines. An Engine
does not take Flight or held Quick Slash out of their active states. Wayward Star
and Hollow Sun keep resolving independently while the player slashes or flies;
Stellar Lance composes with the Quick Slash damage/cadence authority and charges
the Quick Slash GP price once for the complete piercing contact.

`WaywardStarSwarmEngine.js` owns one to five independent
`WaywardStarEngine` children, each with separate route, bounce, and supernova
budgets. `HollowSunClusterEngine.js` owns two to five staggered
`HollowSunEngine` children. Every black hole has independent pulse and
implosion budgets, while the cluster rejects duplicate target coordinates and
reports one aggregate hard ceiling. Each core flies authored destroyed-block
fragments inward without moving intact world tiles.

`StellarRageEngine.js` retains its legacy class name for save compatibility but
is player-facing Stellar Lance. It follows the player and visualizes the
projectiles requested by `DigSystem`; it no longer multiplies global mining
damage, attack speed, Thunder Strike, or Stress. `PiercingMiningProjectile.js`
enumerates the ranged lanes. Each diggable tile runs a fresh normal mining
transaction, so front-tile overkill cannot reduce later damage, air is crossed,
Geode Walls may be crossed like Heavy Punch, and other protected tiles stop the
lane. `CometEngine.js` is retired from the runtime; its stable save ID and old
node IDs remain only for migration compatibility.

Runtime health snapshots count complete power budgets: a full Wayward swarm is
145 route plus 120 supernova targets, and a full Hollow Sun cluster is five
cores with 335 pulse plus 60 implosion targets. Their HUD exposes star/hole
counts and aggregate targets; Stellar Lance exposes time, range, lanes, damage,
shots, and pierced targets. Perpetual visual tweens are killed on finish/destroy,
and a partially constructed power rolls back its created visuals before
activation failure is reported. Stellar Lance keeps the authored core as its
orange player aura and fast projectile texture, separating its runtime
silhouette from the retired comet tunnel.

God Mode is supplied by the authoritative `UpgradeSystem` provider. It exposes
all three powers for free runtime switching and zero-GP activation without
mutating permanent Star Heart save data. Normal activation, impact,
protected-tile, and single-active-power caps still apply.
