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
`WaywardStarEngine` children, each with a separate fire-and-forget route and
bounce budget. Route endings never deal blast damage; Homecoming talents can
instead fly a Star back to the player and graze blocks along that return.
`HollowSunClusterEngine.js` owns three to four staggered
`HollowSunEngine` children. Every black hole has independent pulse and
implosion budgets, while the cluster rejects duplicate target coordinates and
reports one aggregate hard ceiling. Each core flies authored destroyed-block
fragments inward without moving intact world tiles. The cluster softly follows
the player, while successful digs steer its lead and can command small pulses.

Each branch ends in one rankable Apex node above its three capstones.
`CelestialApexPassiveSystem.js` owns their no-activation echoes: a leashed
Homebound Star, a small dig-fed Hollow Sun follower, and a short weak Echo
Lance. Passive Star/Hollow contacts use fractional chip damage; Echo Lance uses
the normal first-hit and exact-overkill projectile authority.

`StellarRageEngine.js` retains its legacy class name for save compatibility but
is player-facing Stellar Lance. It visualizes compact Cinder fireballs without
attaching a persistent aura, rotating core, or legacy icon to the character.
Shots cycle blue, purple, then red, with the approved rare prismatic shot. `PiercingMiningProjectile.js` enumerates
each world-bounded lane and gives its first diggable tile one normal mining hit.
Only exact overkill continues; a surviving tile stops that lane and its visual.
Air and Geode Walls may be crossed, while other protected tiles or the
configured 5-to-9-tile range stop each lane. `StellarLanceVfx.js` keeps each
shot fully opaque and schedules a dedicated impact sprite at every actual
tile contact, so future impacts are never visible before arrival. The impact
sprite pivots on its bright authored contact core and rotates its strike axis
into the incoming wave direction. Purchased talents add rhythm interactions:
every fourth shot can resonate wider, broken blocks charge the next shot and
extend the activation within a cap, and the final window gains side lanes. The
baseline activation lasts 15 seconds. The
power no longer multiplies global mining damage, attack speed, Thunder Strike,
or Stress. `CometEngine.js` is retired from the runtime; its stable save ID and
old node IDs remain only for migration compatibility.

Runtime health snapshots count complete power budgets: maximum-rank Wayward
has 215 route targets and zero supernova targets, while a maximum-rank Hollow
Sun cluster keeps bounded pulse and implosion attempts. Their HUD exposes
star/hole counts and aggregate targets; Stellar Lance exposes time, finite
range, lanes, projectile damage, shots, and pierced targets.
Perpetual visual tweens are killed on finish/destroy, and a partially
constructed power rolls back its created visuals before activation failure is
reported. Stellar Lance keeps its player-centred visual count at zero; palette,
launch, state-burst, scheduled-impact, and impact-moment counters are published
separately for runtime verification.

God Mode is supplied by the authoritative `UpgradeSystem` provider. It exposes
all three powers for free runtime switching and zero-GP activation without
mutating permanent Star Heart save data. Normal activation, impact,
protected-tile, and single-active-power caps still apply.

## September 5 presentation pass

`CelestialStarVfx.js` shares textured colour wakes, independently turning corona
layers, smooth reveal/fade envelopes and bounded contact pulses between active
powers and Apex companions. It reuses the existing approved Star, Hollow Sun
and three Lance palette images. Hollow Sun keeps its dark centre; its two static
colour matrices run only on its persistent core/corona images. Celestial presentation values own this tuning and quieter Lance echoes. The separately approved Cinder Lance uses fixed-size shots; stellarLancePresentation.js owns its palette, size and contact timing.

Companions use lower opacity. Transient wakes and pulses have hard allocation
limits, and finish/destroy cancels every owned tween and image. Gameplay
budgets, damage, costs, targeting and saved progression keep their owners.

## September 5 echo and burn follow-up (historical)

Wayward outbound, return, talent speed bonuses and the permanent companion now
move at 40% of their previous speeds. The original Star art cycles through
azure, violet and ember using static colour matrices, including single-star
casts. Core opacity fades during flight; textured fire trails and star echoes
dissolve behind it.

Both Wayward and Cinder Lance use `CelestialContactVfx.js`: the approved dig
flash, fragments and ember-residue frames at the contacted tile face. Its five
colours are azure, violet, ember, mint and rose. Lance retains its fixed 64x28
silhouette and authored hand/foot release, with alpha fading to 32% and bounded
Cinder afterimages. Damage-state transitions do not resize the projectile.

The shared contact renderer owns no mining feedback, damage, hitstop or camera
shake. Every flash, chip, residue and echo is capped and disposed by its owner.

## September 6 crisp presentation

Celestial cores now retain full opacity and fixed size while visible. The strong flight fade, breathing distortion, mixed fire trails and impact burn residue are removed. Short echoes preserve their source palette and silhouette, sit behind the moving core, and fade smoothly on their own. Companion cores stay solid while their echoes remain quieter. Contact flashes are smaller, fixed in shape and brief. The Cinder contact gallery includes the same echo spacing and lifetime as gameplay.
