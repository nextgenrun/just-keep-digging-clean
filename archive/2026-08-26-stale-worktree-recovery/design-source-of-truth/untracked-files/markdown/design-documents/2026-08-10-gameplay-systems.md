# Gameplay systems

Status: **CANONICAL**

This catalogue describes the current production game and assigns one authority
to each player-facing rule. Implementation details may be split into small
files, but decision ownership must remain singular.

## Moment-to-moment loop

The active play loop is:

**orient → choose a reachable tile or route → move/aim → dig or use an ability
→ read cost and danger → collect → decide deeper or home → sell/upgrade → set
the next promise**

A system belongs in the core loop only if it changes at least one choice: route,
target, timing, cost, safety, reward, or return plan.

## Production catalogue

| System | Player-facing rule | Values/config authority | Runtime authority | State |
|---|---|---|---|---|
| New-save setup | Tutorial choice, typed skip, then permanent mode choice. | `values/retentionConfig.js`, `values/hardcoreMode.js` | `ui/scenes/StartMenuScene.js` and the two choice overlays | **LIVE** |
| Opening tutorial | Six real actions, persistent progress, Town containment, Flight training, 15 m route. | `values/firstFiveMinutes.js`, `values/retentionConfig.js` | `systems/onboarding/` | **LIVE** |
| Movement and aim | Custom tile collision, WASD/arrows, stable adjacent targeting. | `values/keybindActions.js`, player collision/motion values | `player/PlayerInput.js`, `world/playScene/PlayerInputHandler.js` | **LIVE** |
| Mining | Material HP, damage, cooldown, rewards, exact tile removal, authored hit feedback. | mining, resources, tile, damage-FX values | `systems/mining/`, `world/playScene/PlaySceneGameplay.js` | **LIVE** |
| Flight and GP | Hold-to-fly local recovery funded by Gem Power; exact reserve rules in armed Hardcore. | player ability and Hardcore values | `player/PlayerAbilities.js`, Hardcore bridge | **LIVE** |
| Combat abilities | Quickslash and Thunderstrike are unlockable, GP-funded, directional actions. | ability and constellation values | player ability/action runtimes | **LIVE** |
| Inventory and cargo | Real mined stacks persist and feed selling, upgrades, and loss consequences. | resource/inventory values | inventory UI and `DigSystem` resource totals | **LIVE** |
| Merchants | Town merchants expose distinct economic and progression functions through real interaction. | merchant/shop catalog values | merchant systems and overlays | **LIVE** |
| Portals | Paired gates are long-distance return routes; the first is guaranteed at 15 m. | teleport and first-five values | portal systems and onboarding repair | **LIVE** |
| Depth Gates | 100 m, 300 m, and 1000 m stops require explicit preparation and typed acceptance. | `values/depthGateConfig.js` | progression gate system and typed modal | **LIVE** |
| Upgrades and levels | Earnings create persistent capability; optional purchases cannot auto-complete tutorial. | upgrade, economy, milestone values | progression systems and merchant routes | **LIVE** |
| Stars and Starlight | Discoveries feed the Star Atlas and a choice-driven persistent talent tree. | Star identity and Starlight values | Star systems, inventory Atlas, Star Pillar UI | **LIVE** |
| Milestones | Depth achievements create persistent bonuses and a visible world/home promise. | milestone values | Milestone progression and Pillar views | **LIVE** |
| Hardcore risk | Stress, hazards, GP boundary, free revive/lives, exhaustion, and explicit clearing. | `values/hardcoreMode.js` | `systems/hardcore/`, play-scene Hardcore bridges | **LIVE** |
| Environmental hazards | Earthquakes, falling rock, caves, darkness, and Wurm events expose readable avoid/continue choices. | hazard-specific values | environment and play-scene bridges | **LIVE** |
| Compact caves | Side spaces use real movement, mining, rewards, atmosphere, and save handoff. | cave config/identity values | cave scene/gameplay controllers | **LIVE** |
| Titans | Twenty-five discoveries combine clues, footprints, chambers, trophies, and archive inspection. | Titan catalogs/manifests | Titan world, discovery, archive, and streaming systems | **LIVE** |
| Heavenblocks | Persistent upward-world progression, gates, engines, relics, and vault presentation. | Heavenblocks values | Heavenblocks world/model/view systems | **LIVE** |
| World presentation | Authored surface, sky, terrain, structures, props, details, light, weather, and motion stream by context. | world-visual manifests | `systems/visual/WorldVisualRuntime.js` and specialist views | **LIVE** |
| HUD and notifications | Current state is readable; routine events do not create popup spam. | approved HUD and notification values | `systems/visual/HUDSystem.js`, UI notification admission | **LIVE** |
| Persistence | Exact state, world changes, progression, and mode consequences serialize through one queued save path. | save schema/scheduling values | save store, serializer, backup manager, scene save bridge | **LIVE** |

## Authority boundaries

### Values do not execute

Numeric thresholds, copy, IDs, asset paths, and rollout selectors live in
`/values/`. They may sanitize or resolve configuration, but they do not create
Phaser objects, mutate the world, award resources, or write saves.

### Systems decide; views present

Gameplay systems own state transitions and results. Phaser views display those
results and route input; they never invent progression, rewards, lives, costs,
or tutorial completion.

### One save path

All material state changes join the serialized save scheduler. Feature systems
request persistence; they do not write independent shadow saves. Memorials are
the documented exception: append-only run records live outside save slots so a
later explicit clear cannot erase history.

### One input owner per frame

The topmost modal owns input. World mining, mouse digging, menu navigation, and
typed confirmation cannot consume the same event.

## Admission rules for new systems

A proposed system enters production only when it has:

1. A journey beat and meaningful player decision.
2. A named values owner and runtime owner.
3. Interaction with existing progression rather than a parallel currency or
   duplicate state machine.
4. Authored final-facing art or an invisible/system-only implementation.
5. Save/migration behavior where state persists.
6. A bounded notification policy.
7. Contract and real-browser evidence.
8. A narrow rollback or safe admission gate when risk justifies it.

Do not add a system merely because an asset, mockup, or half-built class exists.

## Explicitly rejected duplication

- No second tutorial controller, new-run setup panel, portal authority, input
  map, wallet, inventory, or save store.
- No separate “demo world” behind the normal launcher.
- No visual overlay may author collision or mined state.
- No hazard may directly delete a slot or bypass the central Hardcore outcome.
- No reward view may grant its own reward.
- No tutorial helper may move the real player or destroy authoritative tiles.
