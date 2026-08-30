# Starlight Talent Tree Runtime

> Gameplay amendment: the final 2026-08-26 rebalance replaces Wayward
> redirection with a one-to-five-star swarm, expands Hollow Sun, and replaces
> Comet player-facing with Stellar Rage. See
> `2026-08-26-talent-and-depth-progression-rebalance.md`; legacy names and
> numbers below are historical implementation context only.

> Presentation amendment: the 2026-07-29 V3 polish replaces the active V2
> layout with a native ultra-wide, three-card carousel treatment while
> retaining every progression and safety rule in this document. See
> `2026-07-29-starlight-talent-tree-v3-polish.md`.

## Outcome

The Star Pillar constellation screen and the ESC `TALENTS` tab now use the same
production view. It exposes ten permanent constellation mutations, three
Celestial Engine paths, exact project art, and one consistent keyboard/mouse
interaction model.

## Player progression

- The Quickslash branch contains Dirt, Copper, Steel, Bronze, and Silver.
- The Thunderstrike branch contains Stone, Dark Dirt, Iron, Hard Dirt, and Gold.
- Both branches are sealed with a bespoke ImageGen Bobo lock until their base
  ability is bought from Bobo. Collected stars and completed mastery remain
  banked; buying the ability activates every already-mastered mutation
  immediately.
- Every mastered constellation grants two separately labelled rewards: +1x
  yield from matching Star Blocks and its exact ability mutation.
- Collecting the first star in a material section opens ESC directly on that
  node and explains its permanent mutation.
- That automatic reveal occurs only once for each material and save slot.
  Additional stars update progress without interrupting play.
- Mastering all ten constellations awards the first Star Heart.
- Completing 20 capped Engine activations awards the second Heart.
- Completing 50 capped Engine activations awards the third Heart.
- Each Heart permanently unlocks one Engine. All three can therefore be owned
  late game, while only one may be equipped and only one activation may exist.

## Shared presentation

`StarlightTalentTreeView` is instantiated by both `PlaySceneUI` and
`StarPillarSystem`. The view owns the two-branch layout, focused talent detail,
mastered/in-progress/Bobo-locked state, banked mastery, three Engine cards,
entrance motion, ambient pulses, hover/focus response, and click feedback.

The shared view uses the 17-piece `starlight-talent-tree-v2` ImageGen family:
tree/detail panels, talent card states, selection halo, Bobo seal, branch
filaments, Star Heart socket, and transparent Heart/Engine medallions. The
dedicated Star Pillar adds the generated outer shell, constellation crest, and
close rune. Phaser provides dynamic text, hit targets, placement, state
alpha/tint, and tweens; it does not draw visible tree frames or connectors.

The detail panel still shows the future exact mutation, stored star/relic
progress, active or pending matching-yield reward, and the explicit
`BUY ... FROM BOBO` prerequisite.

The ESC version is informational and sends Engine interaction back to the
physical Pillar. The Pillar version routes a chosen Engine into
`StarHeartOverlay`, where unowned choices use a Heart and owned choices can be
re-equipped.

The original mockup PNG remains review evidence only. Runtime presentation uses
the exact constellation signs and generated V2 UI pack. Opaque black-background
V1 celestial cores remain available for world effects but are never displayed
inside this UI.

## Ability and world safety

Celestial Engine lifetime, impact, bounce, redirect, travel, charge, and
single-active caps remain authoritative in `values/celestialEngines.js`.
Engine damage still routes through `DigSystem` and `WorldModel.isDiggable()`.
Bedrock and protected structures are never bypassed.

The former forbidden bedrock-breach direction is not present. Hard Dirt now
unlocks Citadel Storm: Thunderstrike affects its main column and at most one
adjacent column on each side. Every target uses the normal protected-tile
check.

`values/constellationBuffs.js` exposes declarative stat, operation, and value
metadata for all ten mutations. `DigSystem`, `PlayerAbilities`, and
`PlayerController` remain the live consumers. The audit contract executes each
consumer rather than accepting UI copy or definition presence as proof.

God Mode exposes and equips all three Engines for free at runtime, ignores
charge, and leaves permanent ownership data untouched. Activation caps and
protected-tile rules remain active.

## Persistence

`StarHeartProgressionSystem` serializes permanent Engine ownership, selected
Engine, Hearts earned/spent, charge, constellation count, and activation count.
The sanitizer migrates the legacy single-selected-Engine payload into the new
ownership array.

`StarTalentRevealState` stores seen and pending first-star reveals separately
per save slot. A pending reveal survives a temporarily blocked UI state and is
marked seen only after the focused tree opens.

## Health and alerting

The runtime canary validates:

- ten unique talent nodes and all ten sign textures;
- all 17 generated V2 textures, including the modal shell and alpha glyphs;
- three Engine definitions, transparent medallions, and visible options;
- the shared view factory and active-view snapshot;
- a live Quick Slash and Thunder Strike ownership provider in both entry paths;
- bounded first-reveal state;
- three-Heart ownership accounting;
- one equipped and one active Engine;
- normal charge and activation caps.

A failure publishes `starlight-talent-tree-invariant`. It enters the existing
canary report, optional remote reporting endpoint, admin health presentation,
and Web Worker heartbeat path.

## Verification

- `testing/2026-07-28-starlight-talent-tree-contract.mjs`
- `testing/2026-07-28-constellation-upgrade-audit-contract.mjs`
- `testing/2026-07-26-celestial-engines-contract.mjs`
- `testing/2026-07-26-godmode-abilities-contract.mjs`
- `testing/2026-07-28-starlight-talent-tree-visual-harness.html`

The visual harness renders first-reveal, mid-progress, and mastered profiles
with production code and assets. Release validation must also exercise the real
ESC tab, the physical/UI-review Star Pillar route, Engine selection, God Mode,
and a fresh browser error window.

## Rollback

`?starHearts=0` disables Celestial Engine runtime behavior without removing
saved ownership data. The shared tree is read-only with respect to
constellation progression and can be removed from either entry point without
altering the underlying save schema.
