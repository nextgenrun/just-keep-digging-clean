# Onboarding

Game systems that teach production mechanics through short, persisted opening
encounters.

- `TownSquareTutorialSystem.js` is the production tutorial authority. A chosen
  tutorial advances only from real movement, tile destruction, resource sale,
  and upgrade-purchase events. It grants its starter cargo, Flight unlock,
  30-second flying-only bank, and money rewards idempotently. Starter cargo
  updates the resource bar and save silently instead of adding a confirmation
  card.
- `TownSquareTutorialDigSite.js` authors one safe one-hit practice block beside
  Town Square without opening a forced shaft. `TownSquareTutorialView.js` keeps
  only its world marker; keyed guide and completion cards use the shared
  notification carousel, so onboarding cannot stack a second objective frame
  or centered reward over another transient message.
- Completed and skipped states render no tutorial UI after load. Existing saves
  migrate to a completed compatibility state and keep Flight available.
- `OpeningFlightArtifactSystem.js` remains only as a save-compatible dormant
  facade. The Golden Five, legacy shaft, cache, and their views are retained as
  rollback/reference modules but cannot control production spawn or level-up
  flow while `OPENING_FLIGHT_ARTIFACT_CONFIG.enabled` is false. Their retained
  compatibility messages also route through the same queue if that rollback is
  deliberately enabled.
