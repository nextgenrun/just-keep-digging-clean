# Gameplay systems

Status: canonical system responsibilities and current product status

This catalogue describes player-facing purpose. Technical ownership remains in
the nearest directory `readme.md`; exact tunables remain in `/values/`.

## Core system map

| Player-facing system | Runtime authority | Status | Product responsibility |
|---|---|---|---|
| New expedition setup | `NewRunSetupOverlay`, `hardcoreMode.js`, `retentionConfig.js` | SHIPPED | Persist mode and guided/skip choice before an empty slot starts |
| Guided seven-beat opening | `TownSquareTutorialSystem`, `FirstFiveMinutesTutorialBridge` | SHIPPED | Teach Move, Dig, Flight, Portal, Sell, Upgrade, and Resume through real actions |
| Guided town containment | `TutorialTownExitBarrierSystem` | SHIPPED | Block the exit through the protected portal return, then restore exact cells |
| Starter portal | `FirstSessionPortalSystem`, `SpecialTileSystem` | SHIPPED | Guarantee and preserve the 15 m portal, then use normal portal pairing |
| Movement and aim | `PlayerController`, `PlayerInput`, collision systems | SHIPPED | Responsive horizontal travel, directional aim, fixed 1.2-tile jumping, momentum-based Flight |
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
| Stars and constellations | FloatingText/Star Pillar/progression systems | SHIPPED | Collect sky stars, master ten Signs, and buy three 11-node Engine branches |
| Celestial powers | Talent/Star Heart progression, controller, effects | SHIPPED | Wayward's one-to-five-star swarm, Hollow Sun's two-to-five black-hole cluster, and Stellar Lance's ranged piercing mining buff cost 100 GP and keep bounded activations |
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
- Retention state owns tutorial choice, stage, and free-flight bank;
  `UpgradeSystem` owns the permanent Flight unlock and real purchases.
- `hardcoreModeData` owns mode, the single life, death count, and exhaustion;
  the legacy free-revive field is always normalized to false.
- Retention and journal systems may mirror progress for presentation, but cannot
  become a second reward or inventory authority.

### Producer/admission gates

Disabled or completed experiences stop at the producer or admission gate:

- Casual and exhausted saves do not admit the production Wurm.
- Tutorial Skip starts at `SKIPPED`, grants only prerequisite Flight, and cannot
  produce Guided bank, cargo, money, or level rewards.
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

- The active opening is the seven-beat Town Square route. Dormant Golden Five
  modules remain compatibility/reference code and are not a second presenter.
- Guided containment is tied to the protected 15 m portal return, not a timer.
- Skip grants only the prerequisite Flight unlock. It intentionally does not
  grant the 30-second bank, resources, money, or a guaranteed level.
- The 15 m starter portal is universal and self-healing. It is not random cave
  generation and is not removed when tutorial presentation is skipped.
- The existing next-promise tutorial continues through Sell and Upgrade after
  the real Dig/Flight/Portal route.

## Risk and failure systems

Hardcore pressure must be telegraphed and attributable. The Wurm commits its
path after warning and drains GP once per encounter; zero GP hands the cause to
the shared death reducer. Crush-depth and Wurm deaths use the same persisted
mode rules.

Hardcore sequence:

1. the run starts with exactly one life and no revives;
2. the first death consumes that life and exhausts the expedition.

The legacy One-Life identifier uses that same sequence. Casual never consumes a life.
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
