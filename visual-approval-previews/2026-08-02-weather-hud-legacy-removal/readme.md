# Weather HUD legacy removal — 2026-08-02

- `weather-hud.png` is the isolated 1280x720 Phaser/WebGL render of the real
  production `HUDSystem` after staged-disclosure visibility is applied.
- `live-qa-report.json` records approved-frame visibility, live clock/weather
  copy, and the exclusion of the old clock panel, weather panel, and season row.
- `reviewOnly: true`; `productionChanged: true`. The screenshot and report are
  QA evidence only and are not loaded by the game.
