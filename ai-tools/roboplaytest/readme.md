# RoboPlaytest

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

## Save safety

The browser context is new for every run. `?jkd_e2e=1` also suppresses PlayScene
save writes, so the harness does not read or change the player's normal saves.
