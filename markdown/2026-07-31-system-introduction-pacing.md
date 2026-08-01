# System introduction pacing — 2026-07-31

## Player-facing outcome

The game now treats the opening as a sequence of understandable promises instead of a simultaneous feature dump. A fresh save starts with the core loop, the tutorial, and the two core shops. Later systems become visible and interactive only after the player has completed the preceding loop or reached a deliberate depth milestone.

The first-five-minute tutorial remains the authority for movement, digging, return, selling, and the first upgrade. This layer takes over after that opening and keeps the next system explicit:

| Moment | Newly introduced layer |
| --- | --- |
| Tutorial complete | Flight / Gem Power path |
| First return | Gem Merchant, campfire, clock, weather, journey, map, milestones, combo HUD |
| 40m | Gear Merchant and deeper gear |
| 80m | Special tiles and portals/chests |
| 100m | Constellations and Star Atlas |
| 140m | Caves and torch progression |
| 220m | Hazards and earthquake pressure |
| 250m | Relics and Heavenblocks |
| 350m | Titans and their archive |
| 500m | Abilities, Bobo, and random events |
| 1000m | Arc Core / late-run systems |

The thresholds are deliberately spaced. A player can still move through the world and complete the core loop without needing to understand every later vocabulary term.

## Clarity and spam controls

- `Next Promise` remains one persistent current objective. When the tutorial is active, the tutorial owns that surface; after the tutorial, the pacing director supplies the next promise.
- Routine notifications need a 1.4-second gap and are limited to three messages in a seven-second window. Tutorial and high-priority feedback can bypass that routine gate.
- Locked merchants are hidden, non-interactive, and absent from shop upgrade lists. Locked pause tabs, Gem Power, Star Atlas, and late snapshot rows are omitted rather than shown as unexplained placeholders.
- World update and interaction calls are gated as well as UI. Caves, hazards, special tiles, constellations, relics, titans, abilities, random events, and late Arc Core behavior do not quietly keep teaching themselves before their introduction point.

## Rollback and verification

The profile is reversible with `?systemPacing=0` (or `off`, `false`, or `legacy`). The existing first-five rollback remains `?firstFive=0`. The pacing director is a configuration profile in the live checkout, not a second game fork.

Focused validation:

```text
node testing/2026-07-31-system-introduction-pacing-contract.mjs
node --check systems/onboarding/SystemIntroductionSystem.js
node --check world/playScene/PlaySceneUpdate.js
```

## Tutorial descent safety

The first-five tutorial now treats every route below the town floor as locked
until the player has visibly lifted off with Flight. This covers the deliberate
surface-drop input, walking into the authored surface shaft, and downward
mining. If a loaded or accidental position is already below the surface, the
tutorial immediately returns the player to the last safe town tile and keeps
the persistent promise focused on Flight.
