# Earthquake Feedback UI V1

Isolated Phaser visual review harness for the production
`EarthquakeFeedbackUI`, `EarthquakeHazardOverlay`, and
`EarthquakeTileFeedbackSystem` classes.

Open `index.html?phase=warning`, `?phase=earthquake`, `?phase=aftershock`, or
`?phase=escape`.
The camera uses the live 1280x720 viewport and 94 px production tile size.
The harness preloads the production generated status frame, seismic medallion,
and all seven world-space seismic sprites. It shows the production one-to-one
floor footprint, ceiling fracture, falling boulder, exact-ground impact, and
offscreen edge signal. The wall loop separately cycles the final warning
fracture, damage, collapse, and rubble-return effects while remaining test-only.
The aftershock state shows the short action card and keeps the pending collapse
zones visible as part of the same event.
