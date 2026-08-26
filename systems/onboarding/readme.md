# Onboarding

Game systems that teach production mechanics through short, persisted opening
encounters.

- `TownSquareTutorialSystem.js` remains the production tutorial authority. A
  chosen tutorial advances only from real movement, tile destruction, Flight,
  first-portal activation, resource sale, one real shop upgrade, and the paired return route. The only
  idempotent grant is Flight plus a 30-second flying-only practice bank; the
  tutorial grants no cargo or money and never injects an upgrade purchase.
- `FirstSessionPortalSystem.js` guarantees one real `TELEPORT_TILE` at x12
  and 40 terrain rows below the air layer. It repairs model, health, dug-source,
  and renderer state after persistent world restore, so the opening return
  promise cannot disappear behind an asynchronous save load.
- `TutorialTownExitBarrierSystem.js` temporarily closes the Town immediately
  beyond the Money Monster and wraps the x12 starter descent in restorable
  Bedrock sides/floor through MOVE, DIG, FLIGHT, and PORTAL. The protected 15 m
  activation advances into SELL, immediately restores the exact prior model/map
  state, and makes the guaranteed pair plus Town ascent free until RESUME
  completes;
  skip, completion, and scene teardown also restore it. It owns no popup or reminder.
- `TutorialPortalGhostGuide.js` reuses the live approved player sprite as a
  translucent route ghost from Town to the guaranteed 15 m gate during FLIGHT
  and PORTAL. Its one-tile player footprint probes the live collision model,
  advances only through already-open shaft tiles, and stops above the next
  solid tile instead of falling through the terrain. It changes no physics,
  terrain, rewards, or progression.
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
- `ContextualMechanicTutorialSystem.js` adds four post-route, one-time lessons
  for real darkness, armed Hardcore, an aware earthquake warning, and the first
  production Graveborer breach. Each lesson temporarily owns the approved Next
  Promise strip, counts only visible dwell time, then persists its acknowledgement
  through retention save data; no modal or generic notification is opened.
- `TownSquareTutorialDigSite.js` authors the normal-HP Dirt seam at x12 inside
  the ground row without opening a forced shaft. It explicitly clears the
  former full-tile legacy Dirt overlay, so the authored Town facade and the
  existing objective marker carry presentation. Under `?firstFive=0` the
  legacy profile remains available. `TownSquareTutorialView.js` reuses the
  existing world marker only; the persistent objective is rendered by
  `NextPromiseHudSystem`.
- Completed/skipped guided saves preserve the learned route without replaying
  rewards. Skip receives Flight but no 30-second bank. Legacy stages migrate
  into the nearest safe step of the seven-stage route.
- `?firstFive=0` is the parent rollback for this layer. It does not alter the
  independent `?surfaceDrop=0` or `?randomEvents=0`
  diagnostic switches.
- `OpeningFlightArtifactSystem.js` remains only as a save-compatible dormant
  facade. The Golden Five, legacy shaft, cache, and their views are retained as
  rollback/reference modules but cannot control production spawn or level-up
  flow while `OPENING_FLIGHT_ARTIFACT_CONFIG.enabled` is false.
- `TutorialSurfaceSafetySystem.js` closes every tutorial descent route until
  Flight is visibly used, including the authored surface shaft and downward
  mining. Until the first portal actually succeeds, surface drop and downward
  mining are allowed only inside the Bedrock-wrapped x12 starter corridor; an
  accidental underground position anywhere else is returned to a safe town tile.
