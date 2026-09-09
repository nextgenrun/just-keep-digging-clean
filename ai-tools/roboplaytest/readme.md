# RoboPlaytest

The `worldroot` profile captures all nine real Campfire upgrade transitions and
their settled tree states. `2026-09-03-roboplaytest-hearth-evolution.mjs` also mines
two genuine generated Ember seams through normal `S + F`, captures first/refill
and repeat/charge reveals, dismisses them with `E`, and uses slot `6`. Access
tunnels, positioning and temporary real Dragon Pickaxe/Strength/Quick Reflexes
grants are explicitly accelerated fixtures; target ore health, mining input and
reward authority are unchanged. Original equipment is restored after each find.

`../2026-08-03-roboplaytest.mjs` is an isolated, deep beginning-to-end playtest
for the current Phaser game. The default `deep` profile runs the critical path
and broad system analysis; `--profile=critical` keeps only the shorter route.

It drives the real main menu, creates a fresh casual save in a clean browser
context, and mines a live tile through the normal `S/W/A/D + F` input path. It
then accelerates the otherwise very long campaign through the live progression
systems: the three depth gates, World Two, all three Heavenblock parts, Arc Core,
the three Omega vaults, Omega Arc Core, and the 5000 m endpoint.

The game currently has no separate victory/credits scene. The pass condition is
therefore the authoritative progression-graph endpoint: Omega Arc Core owned,
three Heavenblock parts installed, three Omega vaults opened, Zenith Keystone
present, and best depth at least 5000 m.

The deep profile also audits:

- the live PlayScene collaborator graph and every WorldModel cell;
- resource, upgrade, mining, serialization, and staged-disclosure contracts;
- real walking, Flight, starter mining, and six world/depth mining samples;
- pause/settings, shops, inventory, boards, depth gates, and dialog surfaces;
- every configured weather, random-event, and cave-hazard family;
- Hardcore stress/cost/save rules in a fresh in-memory rules engine;
- special tiles, retention, Journey, Stars, Titans, crafting, and map snapshots;
- Starlight lazy loading while open and asset release while closed;
- every Worldroot growth stage, memory/current threshold, route, terrace, and
  Star-arrival lifecycle;
- eleven World 1/World 2 visual checkpoints from the surface to 4990 m.

## Run

From the repository root, using the bundled Node runtime when `node` is not on
`PATH`:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' ai-tools\2026-08-03-roboplaytest.mjs
```

Useful options:

```powershell
# Watch the bot
node ai-tools\2026-08-03-roboplaytest.mjs --headed=1

# Test an already-running server
node ai-tools\2026-08-03-roboplaytest.mjs --url=http://127.0.0.1:8080/ --no-server=1

# Choose a stable evidence directory
node ai-tools\2026-08-03-roboplaytest.mjs --output=C:\tmp\dig-game-roboplaytest

# Run only the shorter beginning-to-end route
node ai-tools\2026-08-03-roboplaytest.mjs --profile=critical

# Audit every I-menu and ESC-menu tab with real pointer input
node ai-tools\2026-08-03-roboplaytest.mjs --profile=ui

# Repeat the menu audit in a compact viewport
node ai-tools\2026-08-03-roboplaytest.mjs --profile=ui --viewport-width=960 --viewport-height=640

# Exercise real movement and the guided first test block
node ai-tools\2026-08-03-roboplaytest.mjs --profile=opening --tutorial=guided

# Audit the normal-play ground sanctuary and each original Campfire form
node ai-tools\2026-08-03-roboplaytest.mjs --profile=worldroot

# Use the desktop GPU backend for the local source-server check
node ai-tools\2026-08-03-roboplaytest.mjs --profile=worldroot --native-gpu=1 --url=http://127.0.0.1:8081/index.html?cinematics=0 --no-server=1

# Audit the collision-first Gate A layout against an already-running server
node ai-tools\2026-08-03-roboplaytest.mjs --profile=worldroot --url='http://127.0.0.1:8092/?worldrootWhitebox=1'
```

Use `--help` for all options.

## Evidence

Each run writes:

- `summary.md` — human-readable pass/fail summary;
- `report.json` — phase snapshots, progression state, visual metrics, and issues;
- `browser-events.json` — console, page, request, and HTTP failures;
- one PNG per phase.

PNG analysis catches effectively black frames. The screenshots still need human
review for art direction, readability, animation quality, or subtle visual
placement problems; those cannot be approved reliably from heuristics alone.

The run does not spend the real-world hours needed to mine every campaign tile
at natural speed. Any direct positioning or progression grant is labeled
`accelerated setup`; mining after positioning still uses the real keyboard path.
The harness waits for teleport-in recovery before pressing the mining keys; on
software-rendered headless Edge, an individual depth sample can take 60–90
seconds and should not be treated as a shipping-frame-rate measurement.
Hardcore destructive death is not triggered—the rules are exercised in an
isolated in-memory instance instead.

In normal play, the focused `worldroot` profile uses the ground-only V3
sanctuary: actual A/D walking, E blessing, a generated Star visited and mined
with S+F (including its typed destruction acknowledgement), growth and death,
all ten original Campfire forms with real upgrade clicks and exact payments,
Talent/Map/Titan/Crown routes, and a screenshot after every action. Placement,
bulk map discovery, purchase funds, Titan discovery, and bulk consumption are
explicitly accelerated through their existing authorities. Only the final
Crown-requirements case uses a labeled preview fixture, which is restored.
No tree platforms are expected. `2026-09-03-roboplaytest-sanctuary.mjs` owns this
route; its actions helper contains the real keyboard/pointer operations.
Each return checks the active tall-tree texture, zero extra Star light layers,
exactly fifteen living bush instances, surface headroom and visible canopy
Stars. Every paid Campfire tier must grow the trunk while leaving the ground
interaction coordinates unchanged.

`--native-gpu=1` opts into Chromium's normal desktop GPU backend. The default
remains software-rendered SwiftShader for CI; neither run is a shipping FPS
benchmark. All runs retain a fresh isolated browser context.

With an explicit `?worldrootArt=v4` or `?worldrootArt=v3`, the legacy route
accelerates only the unlock setup. It still
uses the real E key for every Hearth, biome, intact/consumed Star, Titan, and
Crown route. It validates all twenty-five sprite-alpha V4 branch contacts with
real falling-body landings (or thirteen under the V3 rollback), then waits for
live Star-arrival objects to complete and clean themselves up. Real movement
lands on the Crown approach, walks across it, and drops through it with Down.
A dedicated live-Titan phase reveals
the surface statues, measures the grounded and vertical gaps, checks that the
statues render in front, and captures both systems in the same camera.

With `?worldrootWhitebox=1`, the profile instead records the complete
51.6-tile Gate A overview and drives the actual player across Rootways,
Cobalt/Amber, Mirrorstone, Starfire, and Crown. It uses real D, Shift+W, Down,
and E inputs; checks all fifty empty Star sockets and all 25 live Titans; and
never loads the rejected tree composite into the review view.

## Save safety

The browser context is new for every run. `?jkd_e2e=1` also suppresses PlayScene
save writes, so the harness does not read or change the player's normal saves.
