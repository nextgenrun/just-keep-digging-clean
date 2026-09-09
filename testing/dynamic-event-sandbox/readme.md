# Dynamic event sandbox

Serve the repository with its root `serve.py`, then open
`/testing/dynamic-event-sandbox/index.html`.

This separate Phaser scene imports the real ShadowMinerRuntime,
GraveborerWurmSystem, Wurm activation/noise bridge, EarthquakeSystem, and their
authored views. It uses an in-memory chamber and an instrumented test body.
It never imports a save store or mounts PlayScene; no wallet, progression,
save slot, or production audio settings are written.

Trigger buttons bypass timing only inside this scene. Shadowminer gets an
explicit seven-tile recorded fixture; Wurm review bypasses its admission gate.
Normal-timer mode uses production chance, cooldown and admission rules. The
hazard-introduction checkbox is an injected progression fixture. The report
lists simulated terrain changes and collisions; it is not a full-game
movement, balance, save, or audio-mix acceptance test.

A/D moves the test body; Auto patrol generates a continuing replay trail.
Mining noise may be added manually or once per simulated second.
Torch light exercises the real Shadowminer repel state.
Run six encounters starts each only after the previous encounter completes,
including earthquake rubble settlement. Reset restores the chamber and seed.
A bounded fixed-step loop supports faster review without oversized frame deltas.

Audio previews use existing approved samples at a conservative review gain;
they are event cue previews, not the production layered sound mixer.

## 2026-09-05 polish

Five Wurm sizes and five behaviors can be selected independently. Broodmother
spawns two smaller Wurms. The chamber uses the same persistent encounter cards
and health observer as PlayScene, plus actual Shadowminer work animations and
bounded ordinary-terrain removal. A distant torch no longer immediately ends
observation. Earthquakes repeatedly acquire nearby valid ceilings and retain
their marked fall lanes while the test body moves.

Run `node testing/2026-09-05-dynamic-event-polish-suite.mjs` from the repository
root for the 14 focused checks. `2026-09-05-polish-contract-results.json` records
those results; `2026-09-05-polish-browser-proof.json` records separate real
browser evidence. The earlier browser-proof file predates this polish.

The normal game also has a local developer EVENTS button and F2 shortcut.
Those trigger the current PlayScene and can change its terrain/GP. This lab is
the isolated option. No new audio assets or production mixing changes were made.

## 2026-09-06 outcome and alignment review

Completion notices use encounter-scoped measurements: blocks mined, Wurm
passes and offspring, or earthquake rocks and hits. Enable Pause on encounter
result to freeze the real card at completion, including at 10x speed. Resume
continues the scene or a running six-encounter sequence; Reset clears results.

The game and lab share text fitting and outcome production. Local developer
controls require debug mode, a local host and no production marker. Production
builds create neither the EVENTS button nor its F2 listener/manual trigger API.

Fresh browser proof is in `2026-09-06-ui-proof/`; the dated September 5 browser
files remain historical evidence. The updated suite has 14 passing contracts.
