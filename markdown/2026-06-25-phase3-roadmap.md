# Phase 3 Roadmap — Systems Integration & Gameplay Polish

All core files are written. Phase 3 is about connecting everything, adding visual polish, and making the game playable.

## Priority Order

### 1. World Generation ✅ [DONE]
- [x] TerrainGenerator — base biome, dirt/stone layers
- [x] CaveGenerator — cave paths and rooms
- [x] GeodeGenerator — resource pockets
- [x] SeededRandom — deterministic seed-based RNG
- [x] WorldGenerator — orchestrates all generators

### 2. Rendering ✅ [DONE]
- [x] TilesheetBuilder — runtime canvas tilesheet from colored squares
- [x] WorldRenderer — tilemap creation + paintInitialWorld + applyTileUpdate

**Critical gap:** Tilesheet colors are placeholder. Must replace with actual sprite assets.

### 3. Player Systems ✅ [DONE]
- [x] Input — WASD + Space + Shift + Z + F key handlers
- [x] PhysicsBody — tile-based gravity + collision on typed arrays
- [x] Movement — velocity integration + collision response
- [x] State — IDLE/WALKING/DIGGING/CLIMBING/GEM_VISION/AIRBORNE
- [x] Abilities — gem power, flight, gem vision, quickslash, thunder
- [x] PlayerController — thin orchestrator tying it together

### 4. Mining Systems ✅ [DONE]
- [x] DigSystem — tile damage, resource drops, cooldowns
- [x] TileCollision — X/Y tile collision from physics body

**Needs:** drop-to-inventory integration, mining animations

### 5. Progression Systems ✅ [DONE]
- [x] UpgradeSystem — level storage, cost calculation, purchase
- [x] PlayerLevelSystem — XP gain, level bonuses, XP table

### 6. UI ✅ [DONE]
- [x] BootScene — asset loading
- [x] MainMenuScene — title screen + ENTER to start
- [x] HUDSystem — GP bar, flash status messages

**Needs:** resource inventory HUD, escape menu, pause overlay

### 7. Next Critical Work

**HIGH PRIORITY — Gameplay:**
- [/] **Save/Load integration** — SaveManager exists but isn't wired to PlayScene
- [ ] **Input handler refactor** — GameInputHandler + PlayerInputHandler for modular key binding
- [ ] **Inventory system** — tracking copper/silver/gold/etc. and spending them
- [ ] **Combo system** — score multiplier based on chain mining
- [ ] **Floating text system** — "+5 Copper!" popups on resource pickup
- [ ] **Camera shake + hitstop** — gamefeel from /values/gamefeel.js

**MEDIUM PRIORITY — Visual:**
- [ ] **Replace placeholder tilesheet** — load actual sprite images instead of colored squares
- [ ] **Player sprites** — run/stand/dig animations from spritesheet
- [ ] **Particle effects** — dirt particles when mining
- [ ] **Background/sky rendering** — parallax background, gradient sky
- [ ] **Lighting** — day/night cycle, darkness simulation
- [ ] **Zoom bands** — camera zoom based on depth

**LOW PRIORITY — Meta:**
- [ ] **Pause/escape menu** — settings, upgrade shop (Bobo/Money Monster)
- [ ] **Sound system** — audio manager with Web Audio API fallback
- [ ] **Mobile support** — touch controls, virtual joystick
- [ ] **GitHub Pages deploy** — automation script in /pipelines/
- [ ] **Tiled exporter** — /exports/tiled/ for map editor export

### File Size Targets

| System | Current | Target |
|--------|---------|--------|
| Abilities.js | ~200 lines | Keep |
| DigSystem.js | ~150 lines | Keep |
| UpgradeSystem.js | ~150 lines | Keep |
| WorldRenderer.js | ~120 lines | Keep |
| Setup.js | ~80 lines | Keep |

**Rule:** If any file exceeds 300 lines, split it.
