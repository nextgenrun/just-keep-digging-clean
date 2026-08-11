# Gameplay systems

Status: canonical system responsibilities and current product status

This catalogue describes player-facing purpose. Technical ownership remains in
the nearest directory `readme.md`; exact tunables remain in `/values/`.

## Core system map

| Player-facing system | Runtime authority | Status | Product responsibility |
|---|---|---|---|
| New expedition setup | `NewRunSetupPanel`, `hardcoreMode.js`, `openingFlightArtifact.js` | SHIPPED | Persist mode and guided/skip choice before an empty slot starts |
| Golden Five opening | `OpeningFlightArtifactSystem` and Golden Five controllers | SHIPPED | Teach Dig and Flight through the authored descent, ascent, and cache |
| Guided town containment | `OpeningFlightTownExitBarrierSystem` | SHIPPED | Block the surface exit until the protected ascent proves Flight |
| Starter portal | `FirstSessionPortalSystem`, `SpecialTileSystem` | SHIPPED | Guarantee and preserve the 15 m portal, then use normal portal pairing |
| Movement and aim | `PlayerController`, `PlayerInput`, collision systems | SHIPPED | Responsive horizontal travel, directional aim, Flight, no jump |
| Mining | `DigSystem`, `TileCollisionSystem`, WorldModel | SHIPPED | Damage authoritative targets; produce resources, XP, combo, feedback |
| Mining momentum | `ComboSystem`, material/gamefeel systems | SHIPPED | Reward sustained accurate mining without changing the return decision |
| Inventory and selling | `DigSystem` ledger, Inventory, merchants, UpgradeSystem | SHIPPED | Keep one authoritative cargo ledger and convert it to money/progression |
| Player levels | `PlayerLevelSystem`, Level Up UI | SHIPPED | XP rewards, bounded stat growth, occasional meaningful choice |
| Upgrades and abilities | `UpgradeSystem`, merchant definitions, PlayerAbilities | SHIPPED | Flight, stats, pickaxes, economy bonuses, Quick Slash, Thunder, torch |
| Portal network | `SpecialTileSystem` | SHIPPED for Level One; GATED for Level Two | Pair underground portals to authored sky gates and quick-return routes |
| Integrated caves | World generation, cave identity/seam/hazard systems | SHIPPED | Optional authored-feeling deviations with resources, darkness, hazards |
| Earthquakes | `EarthquakeSystem` plus feedback/hazard UI | SHIPPED | Local world-space event with readable epicenter, cave-ins, aftermath |
| Hardcore Wurm | Wurm system/bridge/visual/HUD | SHIPPED structurally | Flight-gated 120 m noise predator with committed path and life consequence |
| Day, weather, light | environment, lighting, shader systems | SHIPPED | One coherent surface clock/weather/light state; depth-safe response |
| Map and discovery | map discovery/activity registry and overlay | SHIPPED | Persist explored cells and request markers from owning gameplay systems |
| Milestones | depth values, board, cinematic, retention state | SHIPPED through 2,000 m | Turn depth progress into permanent GP/speed/crit rewards and authored beats |
| Stars and constellations | FloatingText/Star Pillar/progression systems | SHIPPED | Collect sky stars, unlock ten constellations, feed Star Heart progress |
| Celestial Engines | Star Heart progression/controller/effects | SHIPPED | One permanent normal-play attunement with bounded charge and impacts |
| Ancient Relics and Titans | relic, retention, discovery FX, journal/archive | SHIPPED structurally | Persistent collection and gates without duplicate reward authority |
| Heavenblocks | access, progression, presentation, crafting | PARTIAL | Three sky regions, parts, vaults, and Zenith chain; reachability needs QA |
| Level Two | separated world values/rendering/tunnel/economy | GATED | Distinct 5,000 m continuation and resource ecology |
| Arc Core / Omega | vehicle, visual, crafting, upgrade ownership | GATED | Reuse player progression with 2x2/8x8 mining footprints |
| Saves and backups | `DugTilesSaveStore`, backup manager, scene serializers | SHIPPED | Durable slot state, sanitization, backup/export/import, idempotent rewards |

## System interaction rules

### One authority per fact

- `WorldModel` owns tile type, HP, solidity, diggability, and coordinate truth.
- `DigSystem` owns the resource ledger and mining transactions.
- `UpgradeSystem` owns money and purchased upgrade levels.
- `PlayerLevelSystem` owns XP and player level.
- `SpecialTileSystem` owns activated portal pairs.
- `OpeningFlightArtifactSystem` owns opening-stage and reward-idempotency state.
- `hardcoreModeData` owns mode, lives, free revive, death count, and exhaustion.
- Retention and journal systems may mirror progress for presentation, but cannot
  become a second reward or inventory authority.

### Producer/admission gates

Disabled or completed experiences stop at the producer or admission gate:

- Casual and exhausted saves do not admit the production Wurm.
- Tutorial Skip marks the opening complete before Golden Five presentation or
  cache payout can be produced.
- Completed opening state stops the objective HUD and free-flight provider.
- Demo mode removes Level Two/Arc Core upgrades, keys, world bounds, and portal
  access at their feature gates.
- Presentation rollback flags choose renderers; they do not fork gameplay data.

### Persistence before presentation

Any permanent reward is recorded or made idempotent before its celebration can
repeat. Interrupted cache, portal, relic, Star Heart, Heavenblocks, and crafting
flows must repair safely from saved state.

### Bounded events

Earthquakes, cave hazards, Wurm passes, Celestial Engines, particles, floating
text, camera shake, and notifications have explicit caps, cooldowns, or cleanup.
No dramatic system may create unbounded objects or mutate distant world state.

## Opening-system decisions

- The Golden Five replaces the old loose-block tutorial concept.
- Guided containment is tied to successful surface return, not a timer.
- Skip grants only the prerequisite Flight unlock. It intentionally does not
  grant the cache, 30-second bank, resources, money, tank level, or guaranteed
  Level 2.
- The 15 m starter portal is universal and self-healing. It is not random cave
  generation and is not removed when tutorial presentation is skipped.
- The existing next-promise tutorial continues through Sell and Upgrade after
  the authored Flight route.

## Risk and failure systems

Hardcore pressure must be telegraphed and attributable. The Wurm commits its
path after warning and drains GP once per encounter; zero GP hands the cause to
the shared death reducer. Crush-depth and Wurm deaths use the same persisted
mode rules.

Hardcore sequence:

1. death 1 uses the free revive; lives stay 2;
2. death 2 consumes a life; lives become 1;
3. death 3 consumes the last life; the expedition becomes exhausted.

One-Life sequence is one death to exhausted. Casual never consumes a life.
Automatic save deletion is retired; explicit player clearing and backups remain
the recovery boundary.

## Progression reveal order

Do not present every active system at spawn. Reveal in this order unless a
playtest demonstrates a better sequence:

1. movement, aim, Dig;
2. Flight and GP;
3. starter cache and return;
4. portal interaction;
5. selling and one upgrade;
6. cave/darkness/hazard literacy;
7. abilities and milestone choices;
8. collections and celestial progression;
9. Level Two/Arc Core;
10. Heavenblocks/Zenith resolution.

## System-quality gates

A system cannot move from PARTIAL/GATED/TARGET to SHIPPED until:

- its value and save contracts sanitize old and hostile input;
- its normal, reload, interruption, completion, and cleanup paths pass;
- it does not duplicate an existing authority;
- feature-off and rollback behavior are explicit;
- player-visible controls and consequences are readable in-browser; and
- its alignment-register row names the evidence.
