# Animation Sandbox

Standalone Phaser 3 mini-game for rapid animation & collision testing. Loads player spritesheets and tile textures into a small collidable world — no need to boot the full game.

## How to Run

```bash
# From project root:
python serve.py 8080
# Then open: http://localhost:8080/testing/animation-sandbox/index.html
```

Or if using PHP:
```bash
php -S localhost:8080
# Then open: http://localhost:8080/testing/animation-sandbox/index.html
```

> **Note:** Must be served via HTTP (not opened directly as a file) so spritesheet loading works.

## Controls

| Key | Action |
|-----|--------|
| ← → / A D | Move left/right |
| ↑ / W / Space | Jump |
| ↓ / S | Crouch / dig down |
| E | Dig tile in facing direction |
| SHIFT (hold) | Fly/climb mode (no gravity) |
| Q | Quickslash |
| X | Thunderstrike (charge → strike) |
| R | Reset player to spawn |

## Spawn Panel

On the right side of the screen is a button panel to force-play any animation:

- Idle, Walk Loop, Walk Run, Walk Start, Walk Stop
- Jump, Fall, Duck
- Dig Sideways, Dig Up, Dig Up-Sideways, Dig Down
- Fly, Climb, Wall Push
- Combat Idle (recover animation)
- Quickslash, Thunder Charge, Thunder Strike

## World

- 30 columns × 20 rows tile grid (94px tiles)
- Bottom 2 rows: stone floor + bedrock foundation
- Middle: dirt and stone mix with air pockets for dig testing
- Top: air with dirt walls at left/right edges
- Spawn area cleared at (5, 17) — walkable platform

## Architecture

Single-file Phaser scene (`sandbox.js`) with:

- **`PhysicsBody`** — Custom tile-based physics body with gravity, ground detection, velocity capping (mirrors `PlayerPhysicsBody` from the main game)
- **Tile collision** — Axis-separated collision resolution checking body bounds against surrounding solid tiles
- **Animation state machine** — Transitions based on grounded/air/flying states:
  - idle ↔ walk ↔ jump ↔ fall ↔ dig ↔ fly
- **Spawn panel** — DOM buttons wired directly to animation playback

## Spritesheets Loaded

| Sheet | Source | Frames | Size |
|-------|--------|--------|------|
| Idle | v5-walk/idle-sheet.webp | 35 | 341×341 |
| Walk | v5-walk/walk-sheet.webp | 51 | 341×341 |
| Dig Sideways | v5-walk/dig/dig-sideways-sheet.webp | 18 | 341×341 |
| Dig Up | v5-walk/dig/dig-up-sheet.webp | 9 | 341×341 |
| Dig Up Sideways | v5-walk/dig/dig-up-sideways-sheet.webp | 13 | 341×341 |
| Fly/Climb | v5-walk/fly-climb/fly-climb-sheet.webp | 25 | 341×341 |
| Jump | v8/sheets/jump-sheet.webp | 39 | 341×341 |
| Duck | v8/sheets/duck-sheet.webp | 26 | 341×341 |
| Quickslash | v8/sheets/quickslash-sheet.webp | 10 | 341×341 |
| Thunder Charge | v8/sheets/thunder-charge-sheet.webp | 11 | 341×341 |
| Thunder Strike | v8/sheets/thunder-strike-sheet.webp | 13 | 341×341 |
| Dig Down | v8/sheets/dig-down-sheet.webp | 7 | 341×341 |
| Falling | v8/sheets/falling-sheet.webp | 7 | 341×341 |
| Wall Push | v8/runtime/wall-push-sheet.webp | 7 | 341×341 |
| Combat Idle | v8/runtime/combat-idle-recover-sheet.webp | 16 | 341×341 |
| Walk Run | v8/runtime/walk-run-sheet.webp | 7 | 341×341 |
| Dig Down (r) | v8/runtime/dig-down-sheet.webp | 7 | 341×341 |
| Falling (r) | v8/runtime/falling-downward-through-sky-sheet.webp | 7 | 341×341 |