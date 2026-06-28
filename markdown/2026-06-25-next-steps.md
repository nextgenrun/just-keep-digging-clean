# Next Steps — Phase 2 Implementation

After the clean architecture foundation (Phase 1), the following systems need to be implemented:

## Priority Order

1. **Copy Phaser.js** into `/libs/` from old codebase
2. **TilesheetBuilder.js** — Canvas-based runtime tilesheet composition
3. **Full WorldRenderer.paintInitialWorld()** — Render all tiles on screen
4. **Player Abilities** — `/player/Abilities.js` (gem power, flight, quickslash, thunderstrike)
5. **HUD System** — `/systems/visual/HUDSystem.js`
6. **Floating Text System** — `/systems/visual/FloatingTextSystem.js`
7. **Save/Load integration** — Connect SaveManager to PlayScene
8. **Input handling** — GameInputHandler + PlayerInputHandler
9. **Progression stubs** — UpgradeSystem, PlayerLevelSystem
10. **Atmosphere stubs** — DayNightCycle, WeatherSystem, LightSystem

Each system must:
- Import values from `/values/` only
- Stay under 200 lines
- Have exactly one responsibility
