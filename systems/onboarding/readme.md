# Onboarding

Game systems that teach production mechanics through short, persisted opening
encounters.

- `TownSquareTutorialSystem.js` remains the production tutorial authority. A
  chosen tutorial advances only from real movement, tile destruction, resource
  sale, and the authored starter-upgrade purchase. Rewards remain idempotent:
  starter cargo, Flight unlock, a 30-second flying-only bank, and money.
- `FirstFiveMinutesTutorialBridge.js` is the reversible presentation/safety
  layer. It feeds the existing Next Promise strip with persistent remapped-key
  guidance, focuses SELL and Miner's Grip in the real shops, blocks the one-way
  surface drop during training, requires one real Flight frame, then points at
  the normal-HP payoff block. The consumed Flight bank persists the safety
  proof without a save-schema change.
- `SystemIntroductionSystem.js` is the post-tutorial staged-disclosure director.
  It reads persisted depth/return signals and supplies the single next-system
  promise. All five Level-1 merchants remain visible and open; progression is
  expressed through locked catalog rows with explicit unlock copy and an
  authoritative purchase gate. The Level-2 Arc Forge and later non-shop systems
  retain their progression gates.
- `TownSquareTutorialDigSite.js` authors normal-HP Dirt at x11 and a payoff
  block at x12 without opening a forced shaft. Under `?firstFive=0` it restores
  the former x24 one-HP practice tile. `TownSquareTutorialView.js` reuses the
  existing world marker and notification carousel; the persistent objective is
  rendered by `NextPromiseHudSystem`.
- Completed/skipped guided saves keep the Flight prompt only until Flight is
  actually demonstrated. Legacy saves remain exempt. Once Flight and the
  payoff block are complete, no tutorial objective remains after load.
- `?firstFive=0` is the parent rollback for this layer. It does not alter the
  independent `?surfaceDrop=0`, `?randomEvents=0`, or `?loadingMine=0`
  diagnostic switches.
- `OpeningFlightArtifactSystem.js` remains only as a save-compatible dormant
  facade. The Golden Five, legacy shaft, cache, and their views are retained as
  rollback/reference modules but cannot control production spawn or level-up
  flow while `OPENING_FLIGHT_ARTIFACT_CONFIG.enabled` is false. Their retained
  compatibility messages also route through the same queue if that rollback is
  deliberately enabled.
- `TutorialSurfaceSafetySystem.js` closes every tutorial descent route until
  Flight is visibly used, including the authored surface shaft and downward
  mining, and returns an accidental underground position to a safe town tile.
