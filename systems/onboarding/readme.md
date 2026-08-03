# Onboarding

Game systems that teach production mechanics through short, persisted opening
encounters.

- `TownSquareTutorialSystem.js` remains the production tutorial authority. A
  chosen tutorial advances only from real movement, tile destruction, Flight,
  first-portal activation, resource sale, and the paired return route. The only
  idempotent grant is Flight plus a 30-second flying-only practice bank; the
  tutorial grants no cargo, money, or required shop upgrade.
- `FirstSessionPortalSystem.js` guarantees one real `TELEPORT_TILE` at x12
  and 40 terrain rows below the air layer. It repairs model, health, dug-source,
  and renderer state after persistent world restore, so the opening return
  promise cannot disappear behind an asynchronous save load.
- `TutorialTownExitBarrierSystem.js` temporarily restores three authored
  doorway cells as Bedrock during MOVE and DIG only. It restores their exact
  model/map state when FLIGHT starts, the tutorial is skipped, or the scene is
  destroyed; it owns no popup or reminder.
- `FirstFiveMinutesTutorialBridge.js` is the reversible presentation/safety
  layer. It feeds the existing Next Promise strip with one persistent,
  remapped-key action, blocks the one-way surface drop until one real Flight
  frame, and never focuses a shop or opens a reminder card.
- `TutorialNarrationController.js` follows the same persisted stages and can
  play exact local voice recordings beside captions. Recordings remain disabled
  until real files are supplied; captions and world markers stay authoritative.
- `SystemIntroductionSystem.js` is the post-tutorial staged-disclosure director.
  It reads persisted depth/return signals and supplies one North Star or the
  next affordable upgrade promise. All five Level-1 merchants remain visible
  and open; progression is
  expressed through locked catalog rows with explicit unlock copy and an
  authoritative purchase gate. The Level-2 Arc Forge and later non-shop systems
  retain their progression gates.
- `TownSquareTutorialDigSite.js` authors the normal-HP Dirt at x12 without
  opening a forced shaft. Under `?firstFive=0` it restores the former x24
  one-HP practice tile. `TownSquareTutorialView.js` reuses the existing world
  marker only; the persistent objective is rendered by
  `NextPromiseHudSystem`.
- Completed/skipped guided saves preserve the learned route without replaying
  rewards. Legacy sell/upgrade stages migrate into the nearest safe step of the
  six-stage route.
- `?firstFive=0` is the parent rollback for this layer. It does not alter the
  independent `?surfaceDrop=0` or `?randomEvents=0`
  diagnostic switches.
- `OpeningFlightArtifactSystem.js` remains only as a save-compatible dormant
  facade. The Golden Five, legacy shaft, cache, and their views are retained as
  rollback/reference modules but cannot control production spawn or level-up
  flow while `OPENING_FLIGHT_ARTIFACT_CONFIG.enabled` is false.
- `TutorialSurfaceSafetySystem.js` closes every tutorial descent route until
  Flight is visibly used, including the authored surface shaft and downward
  mining, and returns an accidental underground position to a safe town tile.
