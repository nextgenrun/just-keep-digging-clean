# Dig Game canonical design source

Last full reconciliation with the active runtime: 2026-08-10
Locomotion contract reconciled with the current rules: 2026-09-04

This directory is the product source of truth for the intended final game. It
defines what the player should experience, which current systems support that
experience, and which mismatches still have to be closed.

## Authority order

When documents or code disagree, use this order:

1. These canonical design documents define the intended player experience.
2. `2026-08-10-runtime-alignment-register.md` states whether that intent is
   actually shipped, partial, gated, or still a target.
3. `/values/` is the runtime single source of truth for exact numbers, keys,
   coordinates, costs, and feature flags.
4. Directory `readme.md` files describe technical ownership and boundaries.
5. Dated implementation notes outside this directory are evidence and history,
   not current product direction.
6. Anything under `/archive/` is non-authoritative provenance.

Do not describe a target as current behavior until its acceptance evidence is
recorded in the alignment register.

## Canonical document set

| Document | Owns |
|---|---|
| `2026-08-10-game-vision.md` | Product promise, pillars, priorities, final-game boundaries |
| `2026-08-10-player-journey.md` | First five minutes, first two hours, long-term journey, game modes |
| `2026-08-10-gameplay-systems.md` | System catalogue, responsibilities, interactions, product rules |
| `2026-08-10-world-and-content.md` | Town, mine, depth bands, portals, caves, sky, Level Two, Heavenblocks |
| `2026-08-10-controls-and-interface.md` | Inputs, remapping, clickable HUD controls, overlay and teaching rules |
| `2026-08-10-progression-economy-and-saves.md` | Resources, money, GP, upgrades, milestones, failure, persistence |
| `2026-08-10-runtime-alignment-register.md` | Current-versus-target truth, gaps, acceptance criteria, delivery order |

## Status vocabulary

- **SHIPPED** — active runtime path exists and has focused automated evidence.
- **PARTIAL** — some authoritative behavior exists, but the complete player
  promise or end-to-end evidence does not.
- **GATED** — implementation exists but the current release profile disables
  access.
- **TARGET** — approved final-game direction that is not implemented.
- **DECISION** — unresolved product choice; implementation must not guess.
- **RETIRED** — deliberately removed from the final direction.

Browser screenshots and playthroughs are required for visual or interaction
approval. Syntax and structural contracts alone cannot promote a visual claim
to SHIPPED.

## Current release profile

`values/gameplayDevFlags.js` currently sets `demoMode: true`. The active demo
profile disables Level Two, Arc Core vehicles, developer cheats, and screen
capture. Those systems remain part of the final-game design, but they are
**GATED**, not part of the currently reachable player journey.

The active bounded mine is Level One: town and the first 2,000 m. The full
world model still contains the separated Level Two continuation through 5,000
m. Re-enabling that continuation requires the acceptance gates in the runtime
alignment register.

## Non-negotiable player-route invariants

- The core loop is **Move → Dig → collect → Flight → portal → sell → upgrade →
  resume deeper**.
- The first five minutes receive the highest polish priority, followed by the
  first two hours, then long-tail content.
- Tutorial participation is optional. Skipping requires the player to type
  `YES`; it cannot happen from one accidental click.
- Guided and skipped runs, Casual and Hardcore, all receive the deterministic
  first teleport tile at exactly 15 m.
- Guided runs remain contained in town until the player has unlocked Flight and
  completed the protected first ascent. Skip runs are never contained.
- Space performs one fixed, non-variable jump exactly 1.2 tiles high. Digging
  uses its separate action. Flight remains momentum-based: Shift powers it,
  A/D steer, and W/S build upward or downward momentum through acceleration
  and braking. Hazards allow walking, digging, cover, jumping, and Flight.
- Casual never consumes lives. Hardcore has exactly one life and no revives.
  The legacy hidden One-Life Hardcore identifier follows the same rules.
- Routine information must not interrupt play with modal popups. One current
  action and one next promise are the default teaching density.
- Production-facing visual UI uses approved or generated bitmap assets with
  live text and invisible hit zones; placeholder panels are not a final result.
- Saves are durable. A run becoming exhausted does not silently delete the
  player’s save or backups.

## Change protocol

Any gameplay change that alters the promised experience must update, in the
same change set:

1. the owning canonical design document;
2. the exact `/values/` contract when numbers or labels change;
3. the alignment-register row and evidence status;
4. a focused automated contract; and
5. browser evidence when the change is visible or interactive.

New documents belong here only when they own a genuinely separate design
domain. Do not create one-off plans that duplicate this set. Historical
implementation reports belong in `/markdown/` and must link back here rather
than becoming competing product roadmaps.

## Archived predecessors

The raw `player-journey.md`, empty `systems.md`, and obsolete June Phase 2/3
roadmaps are preserved under
`/archive/2026-08-10-superseded-design-document-drafts/`. They are provenance,
not requirements.
