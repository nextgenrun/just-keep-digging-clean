# Onboarding

Game systems that teach production mechanics through short, persisted opening
encounters.

- `OpeningFlightArtifactSystem.js` owns the one-time Flight Gem encounter,
  starter seam, permanent flight unlock, free-flight budget, and save state.
- `OpeningFlightArtifactView.js` owns its procedural world beacon, large
  directional arrows, pickup burst, and objective banner.
- `OpeningFlightTrialView.js` owns the free-flight timer panel.
- `OpeningFlightStarterSeam.js` owns the deterministic one-hit starter shaft.
- Earthquakes stay paused until the player flies home or spends the full
  free-flight trial, keeping unrelated collapse warnings out of the lesson.
