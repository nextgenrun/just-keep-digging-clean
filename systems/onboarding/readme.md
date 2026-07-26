# Onboarding

Game systems that teach production mechanics through short, persisted opening
encounters.

- `OpeningFlightArtifactSystem.js` is the stable scene/save facade. The default
  path delegates to the Golden Five runtime; `?openingFlightV2=0` restores the
  previous procedural five-tile encounter without touching saves.
- `OpeningFlightGoldenFiveRuntime.js` is the persisted orchestrator.
  `OpeningFlightGoldenFiveDescentController.js`,
  `OpeningFlightGoldenFiveFlightController.js`, and
  `OpeningFlightGoldenFiveRewardController.js` separately own the guided dig,
  protected first ascent plus pauseable bank, and idempotent cache payout.
- `OpeningFlightGoldenFiveView.js` composes generated artifact/marker, route,
  grounded cache, FX, objective HUD, and centered cache-reward reveal. Both UI
  beats use the premium generated frame with live remap-safe Phaser text rather
  than primitive panels.
- `OpeningFlightStarterSeam.js` keeps the legacy seam intact and separately
  owns the authored 14-cell Golden Five descent, three-wide escape opening,
  and cache ledge.
- Fresh and cache-pending saves spawn at the marked shaft. Saves made during
  the protected escape resume safely on its artifact floor.
- Earthquakes remain paused through the ascent, opening weather is forced calm
  for five minutes, and the 30-second bank does not start until the player has
  reached the surface and is actively flying.
- `OpeningFlightArtifactView.js` and `OpeningFlightTrialView.js` are retained as
  the explicit rollback presentation through `OpeningFlightLegacyRuntime.js`.
