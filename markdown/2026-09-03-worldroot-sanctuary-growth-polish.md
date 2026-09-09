# Worldroot Sanctuary: real Stars and growing details

## Runtime

The ground-only Sanctuary remains decorative and contributes zero platforms.
The existing Worldroot resolver, Star territory, discovery, Campfire, Talents,
Titan, and Crown systems still own progression and interaction.

- Discovered Stars display their actual identity atlas frames and light layers.
  Unknown signals use a pixel-exact Moonwhite Star without revealing identity.
  The remaining Talent/Crown crystal markers now use the existing Frost Lilac
  and Soft Amber Star art. No Star is baked into the tree or newly generated.
- Live Star objects survive state changes. Their profile sockets expand with
  discovery; pixel-spaced siblings remain readable in young foliage. Consuming
  one does not rearrange the other Stars. Consumed Stars
  retain separate clickable scars.
- The Titan Archive sits in a clear root-level lane below every Star socket.
  A worst-case spacing contract covers all sibling offsets, growth stages,
  bobbing, and pointer rounding so a nearby Star cannot steal its click.
- Five independent vine/fern pairs grow with each region's known and surviving
  Stars; Campfire upgrades add a restrained growth boost. Five bounded falling
  leaves and gentle sway add motion. Killed regions lose their living plants
  and foliage and reveal blackened, broken branches. Reduced motion disables
  the new plant sway, falling leaves, and plant growth tweens.
- The canopy is compacted for the normal ground camera. All ten original
  Campfire forms retain their original art, dimensions, bottom-center origin,
  ground position, upgrade costs, and selection UI.

`values/worldrootSanctuary.js` owns art keys, placement, growth, and motion.
`WorldrootSanctuaryView`, `WorldrootSanctuaryStars`, and
`WorldrootSanctuaryGrowth` own presentation and teardown only.

## Art provenance

Built-in ImageGen created only three separate botanical details, matching the
accepted bare trunk: a hanging vine, root fern, and single falling leaf.
Their native RGBA pixels are preserved. The three Star carriers are exact
256-pixel existing Common-atlas frames, not recolored or repainted assets.

Sources and complete generation prompts are in
`sprites/environment/worldroot-sanctuary-v2/source/`, including
`prompts-2026-09-03.json` and `leaf-prompt-2026-09-03.json`.
`ai-tools/2026-09-03-build-worldroot-sanctuary-details.mjs` reproducibly exports
the six assets and checks alpha, source-pixel equality, and hashes in the V2
`manifest.json`.

## RoboPlaytest

Run the canonical source server (`serve.py`), then:

```text
node ai-tools/2026-08-03-roboplaytest.mjs --profile=worldroot --url=http://127.0.0.1:8081/index.html?cinematics=0 --no-server=1 --native-gpu=1 --phase-timeout-ms=90000
```

The normal-play route records thirty phases and an unedited screenshot after
each. Real inputs cover ground A/D walking, Campfire E/blessing, S+F mining of
a generated Star with typed DESTROY acknowledgement, all nine Campfire upgrade
buttons with exact single payments, and Talent/Map/Titan/Crown interactions.
The tallest and widest original Campfire forms are included.

Long setup is explicit: travel, map discovery, funds, one Titan discovery, and
bulk consumption are accelerated through existing authorities. Bulk death
advances the real consumption guard's hold clock before calling WorldModel
damage; it never disables that guard. Only the final Crown-requirements case
uses a labeled preview fixture. The fixture restores and the isolated browser
context closes; ordinary player saves are not used.

Latest run artifacts (including the authoritative pass/fail status):
`C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-sanctuary-roboplay-v8/`.
`report.json` contains assertions and warnings; `summary.md` links the phase
screenshots. Treat texture-memory watermark warnings separately from gameplay
assertions. No global asset budget was changed.

The earlier diagnostic folders remain as evidence. They exposed bot setup
issues with forced-software timing, the real typed Star warning, and modal
coordinates, plus two actual defects: the slow-strike hold reset below and an
Archive click target too close to a canopy Star. Game movement and protection
were not weakened to make these checks pass.

## Mining hold repair found by RoboPlay

The repeat-run trace exposed a real hold-tracking defect: F stayed held on the
same Star while its HP remained 45, but the one-second confirmation repeatedly
reset. The guard measured staleness since the previous strike; the slower
pickaxe cycle could exceed its 1.4-second stale-attempt window.

`StarConsumptionGuard` now renews attempt liveness from verified continuous
input on the same target. It keeps the original start time and still admits
damage only at an actual contact after the full hold. Release, retarget,
inactive gameplay, missing input evidence, and genuinely stale frames remain
cancellation conditions. The typed DESTROY gate, hold duration, mining damage,
Star rewards, and consequences are unchanged. A focused regression reproduces
the failure with a slow second strike and checks all cancellation cases.

## Focused checks and limits

The Sanctuary, buffered Campfire input, jump/Flight, Campfire consumable,
Worldroot interconnection, V4 runtime/art rollback, feature residency, and asset
tiering contracts pass. They cover independent growth/death, stable identities,
save-safe presentation, original Campfire dimensions, and full teardown.

The broader RoboPlaytest source contract still flags the untouched legacy
`2026-08-30-roboplaytest-worldroot-motion.mjs` at 342 lines against its 300-line
limit. New Sanctuary helpers are below that limit; the touched legacy entry
point is split into a behavior-preserving interaction helper. These focused
checks and the gameplay run do not establish whole-repository health.
