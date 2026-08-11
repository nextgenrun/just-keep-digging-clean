# Dig Game development environment

Last reconciled: 2026-08-10

This repository contains the Phaser/JavaScript Dig Game runtime, production
assets, values, tests, tooling, and canonical game design.

## Required reading order

1. `.clinerules` — mandatory repository, architecture, archive, and visual rules.
2. `markdown/design-documents/readme.md` — canonical product source of truth.
3. `markdown/design-documents/2026-08-10-game-vision.md` — intended final game.
4. `markdown/design-documents/2026-08-10-runtime-alignment-register.md` — current
   shipped/partial/gated truth.
5. `markdown/readme.md` — documentation map and policies.
6. The nearest directory `readme.md` for the subsystem being changed.

## Current player route

For an empty save slot:

```text
Boot → Main Menu → Save Slot → Mode + Tutorial Choice → World Load → Play
```

The intended first complete loop is:

```text
Move → Dig → Flight → Portal → Sell → Upgrade → Resume deeper
```

Guided runs use the authored Golden Five Flight opening and temporary town-exit
barrier. Tutorial Skip requires typed confirmation and grants Flight without the
guided cache rewards. Every mode/tutorial combination receives the guaranteed
15 m starter portal.

## Active release profile

`values/gameplayDevFlags.js` currently sets `demoMode: true`. The active player
boundary is Level One through 2,000 m. Level Two, Arc Core vehicles, developer
cheats, and screen capture are gated even though implementation/assets remain
in the repository. Do not describe those systems as currently reachable; see
the alignment register.

## Architecture

```text
values/   ← pure runtime configuration and constants
   ↓
systems/  ← focused game systems using values
   ↓
world/ and player/ ← model, scene orchestration, player authority
   ↓
ui/       ← scenes, HUD, overlays, interaction surfaces
```

Core rules:

- `/values/` is the technical single source of truth for tunables and IDs.
- One authority owns each gameplay fact; UI and journals consume it.
- Avoid circular dependencies; inject collaborators during scene setup.
- Split files around one responsibility before they become unreviewable.
- Player-facing production UI uses approved/generated bitmap art with live text
  and invisible interaction plumbing—not visible placeholder primitives.
- Presentation cannot mutate WorldModel, rewards, progression, or saves.

## Main directories

| Directory | Responsibility |
|---|---|
| `values/` | Config, IDs, layouts, balance, feature gates, asset keys |
| `world/` | World model, generation, rendering, PlayScene orchestration |
| `player/` | Player input, movement, collision-facing state, abilities |
| `systems/` | Mining, progression, onboarding, environment, visual, map, save, celestial, crafting, vehicle systems |
| `ui/` | Phaser scenes, HUD, overlays, components, notifications |
| `sprites/`, `sound/`, `shaders/` | Production media and rendering inputs |
| `testing/` | Deterministic contracts and visual harnesses |
| `markdown/` | Canonical design, policies, evidence, feedback, operations |
| `archive/` | Dated non-authoritative provenance with INDEX files |

Every active directory should contain a `readme.md` explaining ownership.

## Scene lifecycle

```text
BootScene
  → MainMenuScene
  → StartMenuScene (slot; empty slots choose mode/tutorial)
  → WorldLoadScene
  → PlayScene
```

`MenuAudioScene` runs alongside menu scenes and stops at game entry. PlayScene
is decomposed across `world/playScene/` setup, update, gameplay, UI, input, and
bridge modules.

## How to run

From this directory:

```powershell
python serve.py 8080
```

Open `http://127.0.0.1:8080/`. The development server disables caching for
HTML, JavaScript modules, CSS, and JSON so reloads do not mix module revisions.
Media remains cacheable.

## Verification expectations

- Pure values/state: deterministic Node contract.
- World mutation: install/self-heal/restore contract.
- Persistence: save, reload/readback, interruption, idempotency.
- Visible/input behavior: real browser playthrough and screenshot.
- Feature promotion: feature-on and feature-off tests plus normal-player E2E.

HTTP liveness, syntax, or a structural contract is not visual approval.

## Documentation and archive

Use `markdown/design-documents/` for product direction. Dated Markdown files
elsewhere are implementation evidence, not parallel roadmaps. Superseded
documents belong in `/archive/YYYY-MM-DD-description/` with a local `INDEX.md`
and an entry in `archive/INDEX.md`.

The pre-reconciliation player-journey draft and obsolete June roadmaps are in
`archive/2026-08-10-superseded-design-document-drafts/`.
