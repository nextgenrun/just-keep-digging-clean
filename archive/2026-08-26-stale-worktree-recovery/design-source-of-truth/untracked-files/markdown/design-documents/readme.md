# Dig Game design source of truth

Status: **CANONICAL**  
Baseline: 2026-08-10, full Phaser source at `b430d6346c13674e58ccbd1704f590be815d2949`

This directory defines the intended final game. Runtime code, values modules,
assets, tests, and implementation notes must agree with it. A dated technical
note can explain how a feature was built, but it cannot silently redefine the
product.

## Status language

Every significant decision uses one of four states:

| State | Meaning |
|---|---|
| **LIVE** | Implemented in the active Phaser runtime and contract-checked. |
| **TARGET** | Approved direction that still needs implementation or final evidence. |
| **DEFERRED** | Deliberately not scheduled; do not wire it opportunistically. |
| **ARCHIVED** | Superseded history; never use it as current guidance. |

If a document and runtime disagree, record the mismatch in the alignment
register before changing either side. Do not disguise a target as live.

## Canonical document map

| Document | Owns |
|---|---|
| [`2026-08-10-game-vision.md`](2026-08-10-game-vision.md) | Product promise, priorities, experience pillars, and non-negotiables. |
| [`2026-08-10-player-journey.md`](2026-08-10-player-journey.md) | New-save flow, optional tutorial, first five minutes, first two hours, and return sessions. |
| [`2026-08-10-gameplay-systems.md`](2026-08-10-gameplay-systems.md) | System catalogue, authority boundaries, and moment-to-moment game loop. |
| [`2026-08-10-world-and-content.md`](2026-08-10-world-and-content.md) | World topology, authored content, landmarks, caves, Titans, and Heavenblocks. |
| [`2026-08-10-controls-and-interface.md`](2026-08-10-controls-and-interface.md) | Fixed aliases, remappable controls, HUD access, menus, prompts, and input priority. |
| [`2026-08-10-progression-economy-and-saves.md`](2026-08-10-progression-economy-and-saves.md) | Modes, lives, risk, economy, progression, save durability, and migration. |
| [`2026-08-10-runtime-alignment-register.md`](2026-08-10-runtime-alignment-register.md) | Current implementation evidence, remaining targets, and mismatch log. |

## Decision hierarchy

1. Product intent and acceptance criteria in this directory.
2. Stable configuration in `/values/`.
3. One runtime owner for each decision under `/systems/`, `/world/`, `/player/`,
   or `/ui/`.
4. Executable contracts under `/testing/`.
5. Dated implementation notes under `/markdown/`.
6. Provenance under `/archive/`.

An implementation must not create a second owner to make a test pass. Change
the canonical document first when product intent changes, then the values
owner, runtime owner, contract, and relevant directory readme in that order.

## Non-negotiable baseline

- The first five minutes receive the highest polish priority; the first two
  hours come next.
- Tutorial choice precedes mode choice for a new save. Skipping requires typing
  `YES`; existing saves never repeat these choices.
- The guided route has six real actions. Routine guidance is persistent and
  compact, not a chain of forced popups.
- Every opening route receives Flight and a guaranteed first portal at x12,
  15 m depth.
- Hardcore is the recommended risk experience: first fall free, then two lives.
  One-Life Hardcore is hidden and has one life with no free revive.
- A finished Hardcore run remains preserved in its slot. Clearing is always an
  explicit player action; automatic save deletion is forbidden.
- WASD and arrows work for movement/aim. `F` and Space work for digging.
  Inventory and ESC menu affordances are both keyboard-accessible and clickable.
- Approved bitmap art and native Phaser presentation are production UI. Visible
  HTML, emoji, generic primitives, and placeholder textures are not substitutes.
- The modern authored world is the game. The old root tutorial/demo launcher,
  colored-square tiles, and June foundation checklists are archived history.

## Change checklist

For every material design change:

1. State the player-facing reason and affected journey beat.
2. Mark the entry **TARGET** before implementation.
3. Name one values owner and one runtime owner.
4. Preserve save migration and a narrow rollback where relevant.
5. Add or update an executable contract.
6. Verify the real browser build, not only syntax or HTTP status.
7. Mark **LIVE** only after runtime evidence exists.

Superseded drafts are indexed at
`archive/2026-08-10-superseded-design-document-drafts/INDEX.md`.
