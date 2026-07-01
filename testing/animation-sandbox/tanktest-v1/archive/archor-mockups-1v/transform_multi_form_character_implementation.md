# Transforming Multi-Form Character — Design & Game Implementation Plan

## 1. Core Idea

The character is an **animation-first transforming machine** for a tile-based digging game. Instead of one complex humanoid robot that is hard for AI to animate consistently, the character uses several clear mechanical forms with fixed tile ratios.

The design direction is:

- **No eyes baked into AI animations** because eyes drift, morph, and create unstable expressions.
- **Low-detail mechanical shapes** that stay consistent frame to frame.
- **Different modes for different gameplay states**, each with a strict tile-based size.
- **Simple silhouettes first**, visual polish later.
- **Separate body, drill, dust, flame, and tile-damage effects** where needed.

The character is basically a **WALL-E / utility machine transformer**, but simplified for stable 2D animation.

---

## 2. Final Mode List & Tile Ratios

Use exact tile math in the game engine. Do not trust AI concept-art proportions for final collision.

Assuming `1 tile = 64x64 px`, the recommended art/collision sizes are:

| Mode | Tile Area | Tile Dimensions | Pixel Size at 64px Tiles | Gameplay Purpose |
|---|---:|---:|---:|---|
| **Power Jet Mode** | 16 tiles | 4x4 | 256x256 | Huge fast flight / high-speed traversal / cinematic boost |
| **Big Tank Mode** | 4 tiles | 2x2 | 128x128 | Heavy mining, crushing, powerful abilities, boss-feeling form |
| **Tank Mode** | 1 tile | 1x1 | 64x64 | Main digging / ability mode |
| **Mobility Mode** | 0.5 tile | 1x0.5 | 64x32 | Small fast ground movement, WALL-E-inspired, cool movement animations |
| **Fly Mode** | 0.25 tile | 0.5x0.5 | 32x32 | Tiny drone/scout form, tight spaces, precision movement |

Important ratio check:

```text
Power Jet Mode = 4x4 = 16 tiles
Big Tank Mode  = 2x2 = 4 tiles
Tank Mode      = 1x1 = 1 tile
Mobility Mode  = 1x0.5 = 0.5 tile
Fly Mode       = 0.5x0.5 = 0.25 tile
```

So **Power Jet Mode should be 4x the area of Big Tank Mode** and **twice as wide and twice as tall**.

---

## 3. Art Direction Rules

### Global Rules

- Strong **side-view** camera, not 3/4 perspective.
- Mostly **white / light gray / dark gray / black**.
- Use bright flame color only for exhaust/jet effects.
- Avoid lots of tiny details.
- Avoid visual features that AI can reinterpret between frames.
- Keep each form readable at gameplay scale.

### Avoid

- Eyes, pupils, face screens, expressions.
- Tiny screws, micro panels, symbols, logos.
- Antennas, cables, thin arms, small hands.
- Multiple small black boxes/details.
- Complex perspective angles.
- Multiple wheels inside tracks unless they are very large and intentionally animated.
- Rubber tracks on modes that fly.

### Personality Without Eyes

Give the character personality through:

- Body bobbing.
- Small recoil.
- Compression/squash on landing.
- Exhaust flicker.
- Track movement.
- Transformation timing.
- Sound effects.
- Dust and sparks.

If eyes are ever wanted later, add them as a **separate overlay layer**, not as part of AI-generated animation frames.

---

## 4. Mode Design Notes

## 4.1 Power Jet Mode — 16 Tiles / 4x4

**Purpose:** fast flying, boost, cinematic traversal, special high-speed movement.

Design:

- Large square-ish jet form.
- Strong side-view silhouette.
- No rubber bands/tracks because it flies.
- No black detail boxes.
- Similar white/gray language to tank forms.
- Big thrusters and flame/exhaust trail sell the speed.
- Body can remain mostly static; animation comes from flame, trail, small vibration, and screen shake.

Implementation notes:

- Use this mode only where there is enough space.
- Requires 4x4 clearance if collision is truly 16 tiles.
- It may work better as a special travel/boost mode than a normal tunnel mode.

Recommended animations:

```text
power_jet_idle
power_jet_charge
power_jet_boost_start
power_jet_boost_loop
power_jet_boost_end
power_jet_turn
```

---

## 4.2 Big Tank Mode — 4 Tiles / 2x2

**Purpose:** heavy form, high power, strong impact, crushing, large obstacle breaking.

Design:

- Big square tank shape.
- Simple black continuous track/band.
- No small gray circle on top.
- Low detail.
- Massive, heavy, stable.

Implementation notes:

- 2x2 hitbox.
- Only transform into this form if there is 2x2 space available.
- Great for large tunnels, bosses, heavy rock, special mining layers.

Recommended animations:

```text
big_tank_idle
big_tank_drive_loop
big_tank_heavy_dig
big_tank_crush
big_tank_transform_in
big_tank_transform_out
```

---

## 4.3 Tank Mode — 1 Tile / 1x1

**Purpose:** main digging and ability form.

Design:

- One-tile square tank.
- Single black rubber band/track.
- Very simple body.
- Stable silhouette.
- Drill can be attached to front, but should ideally be its own separate sprite/effect if digging needs to feel good.

Implementation notes:

- This is the safest main gameplay form.
- Keep the hitbox exactly 1 tile.
- Do not force the drill into the body hitbox. A drill/effect can visually extend into the target tile.

Recommended animations:

```text
tank_idle
tank_drive_loop
tank_dig_contact
tank_dig_loop
tank_dig_break
tank_recoil
tank_transform_in
tank_transform_out
```

---

## 4.4 Mobility Mode — 0.5 Tile / 1x0.5

**Purpose:** fast ground movement, traversal, personality, small form.

Design:

- WALL-E-inspired but without eyes.
- 1 tile wide, 0.5 tile high.
- Singular shared track/band, not two separate wheel sets.
- No red.
- No arms.
- No rocket.
- Animation should be cool, but the design should remain simple.

Implementation notes:

- This can move through half-height spaces if the game supports them.
- If the game grid is strictly full tiles only, the mode can still use a 1x0.5 visual/hitbox but occupy one tile for pathing.
- Good for speed and responsiveness.

Recommended animations:

```text
mobility_idle
mobility_drive_loop
mobility_brake
mobility_turn
mobility_hop_or_bounce
mobility_transform_in
mobility_transform_out
```

---

## 4.5 Fly Mode — 0.25 Tile / 0.5x0.5

**Purpose:** tiny drone mode, scouting, narrow gaps, precision.

Design:

- Tiny 0.5x0.5 tile form.
- No eyes.
- Very low detail.
- Hover/jet flicker can sell movement.
- Should not look like a detailed character; it is a compact machine pod.

Implementation notes:

- Can access tiny spaces.
- Should probably have limited digging power or no digging at all.
- Useful for scouting or collecting small items.

Recommended animations:

```text
fly_idle_hover
fly_move_loop
fly_dash
fly_turn
fly_transform_in
fly_transform_out
```

---

## 5. Collision & Hitbox System

Use different hitboxes per mode. This is fully doable.

The art sprite and collision box do not have to be identical, but the collision box must be consistent and predictable.

Example mode data:

```json
{
  "tileSize": 64,
  "modes": {
    "power_jet": {
      "sizeTiles": [4.0, 4.0],
      "hitboxTiles": [4.0, 4.0],
      "speed": "very_fast",
      "canDig": false
    },
    "big_tank": {
      "sizeTiles": [2.0, 2.0],
      "hitboxTiles": [2.0, 2.0],
      "speed": "slow",
      "canDig": true
    },
    "tank": {
      "sizeTiles": [1.0, 1.0],
      "hitboxTiles": [1.0, 1.0],
      "speed": "medium",
      "canDig": true
    },
    "mobility": {
      "sizeTiles": [1.0, 0.5],
      "hitboxTiles": [1.0, 0.5],
      "speed": "fast",
      "canDig": false
    },
    "fly": {
      "sizeTiles": [0.5, 0.5],
      "hitboxTiles": [0.5, 0.5],
      "speed": "fast_precise",
      "canDig": false
    }
  }
}
```

### Transform Clearance Rule

Transforming into a smaller form is usually safe.

Transforming into a larger form must check available space first:

```text
Can transform into Power Jet?
Need 4x4 empty tile area.

Can transform into Big Tank?
Need 2x2 empty tile area.

Can transform into Tank?
Need 1x1 empty tile area.
```

If space is blocked:

- Deny transform.
- Show a small bump/failed-transform animation.
- Play an error sound.
- Optionally queue the transform until the player reaches open space.

---

## 6. Digging Implementation

The biggest issue discussed was: if the tank is only 1 tile wide, how can the drill dig into the tile next to it without looking like clipping?

There are two good solutions.

---

## 6.1 Simple Motherload-Style Digging

This is the safest first implementation.

The vehicle does not need realistic drill penetration. Instead:

```text
1. Tank touches dirt tile.
2. Drill/contact point vibrates.
3. Dirt tile cracks.
4. Dust/sparks hide the contact point.
5. Tile breaks.
6. Tank moves into the empty tile.
```

This avoids complicated masking.

The player reads the action as digging because:

- The tank is facing the block.
- The dirt reacts.
- The block breaks.
- The sound and dust sell the hit.
- Movement happens after the tile is cleared.

Recommended first version:

```text
No deep drill penetration.
No complicated arm.
No full AI animation.
Just: tank shake + drill spin + dirt crack + dust + break.
```

---

## 6.2 Advanced Drill Extension With Hole Overlay

If more realism is needed, use a separate drill sprite.

Important: do not simply slide a full drill behind a flat dirt mask. That can look like the back of the drill enters first.

Instead use:

```text
Tank body = mostly static
Drill = separate extending sprite
Dirt hole = separate overlay
Dust/light = separate effect
```

Correct sequence:

```text
Frame 1: drill touches dirt
Frame 2: small dark hole appears around tip
Frame 3: tip disappears into hole
Frame 4: hole grows, cracks appear, dust covers contact
Frame 5: tile breaks
Frame 6: drill retracts
```

This makes it look like the tip entered first.

### Render Order For Advanced Digging

```text
1. Terrain base tile
2. Tank body
3. Drill / tool sprite
4. Dirt hole rim overlay
5. Crack overlay
6. Dust / sparks / impact flash
```

The key is the **hole rim overlay**, not just a hard rectangular mask.

---

## 7. Recommended Asset Splitting

Avoid one giant AI-animated character sprite. Split into stable pieces.

Recommended folder layout:

```text
assets/character_transformer/
  manifest.json

  common/
    palette.png
    shadow_blob.png
    transform_flash_01.png
    transform_flash_02.png

  modes/
    power_jet/
      power_jet_idle_001.png
      power_jet_boost_loop_001.png
      power_jet_boost_loop_002.png
      power_jet_boost_loop_003.png
      power_jet_transform_in_001.png
      power_jet_transform_out_001.png

    big_tank/
      big_tank_idle_001.png
      big_tank_drive_001.png
      big_tank_drive_002.png
      big_tank_heavy_dig_001.png
      big_tank_heavy_dig_002.png

    tank/
      tank_body_idle_001.png
      tank_track_loop_001.png
      tank_track_loop_002.png
      tank_drill_idle.png
      tank_drill_extend_001.png
      tank_drill_extend_002.png
      tank_drill_extend_003.png

    mobility/
      mobility_idle_001.png
      mobility_drive_001.png
      mobility_drive_002.png
      mobility_drive_003.png
      mobility_brake_001.png

    fly/
      fly_idle_001.png
      fly_hover_001.png
      fly_hover_002.png
      fly_dash_001.png

  effects/
    dust/
      dust_small_001.png
      dust_small_002.png
      dust_burst_001.png
    sparks/
      spark_001.png
      spark_002.png
    exhaust/
      flame_small_001.png
      flame_small_002.png
      flame_big_001.png
      flame_big_002.png
    tile_damage/
      dirt_hole_001.png
      dirt_hole_002.png
      dirt_crack_001.png
      dirt_crack_002.png
      dirt_break_001.png
```

---

## 8. Animation Rules Per Mode

### Power Jet Mode

Animation should come from:

- Large flame/exhaust trail.
- Speed lines.
- Small body vibration.
- Camera shake at boost start.
- Charging glow if desired.

The body itself should not morph much.

### Big Tank Mode

Animation should come from:

- Tracks scrolling.
- Heavy body bob.
- Large dust puffs.
- Screen shake on heavy dig/crush.

### Tank Mode

Animation should come from:

- Drill spin/contact.
- Dirt tile damage.
- Dust and sparks.
- Tiny body recoil.

### Mobility Mode

Animation should come from:

- Track loop.
- Small bounce.
- Quick lean while moving.
- Brake skid dust.

### Fly Mode

Animation should come from:

- Hover bob.
- Tiny flame flicker.
- Small squash/stretch on acceleration.
- Optional trail particles.

---

## 9. State Machine Structure

Use one main character controller with mode-specific configuration.

Example pseudocode:

```pseudo
enum Mode {
    POWER_JET,
    BIG_TANK,
    TANK,
    MOBILITY,
    FLY
}

currentMode = TANK

function requestTransform(nextMode):
    if canFitModeAtPosition(nextMode, player.position):
        playTransformAnimation(currentMode, nextMode)
        currentMode = nextMode
        applyModeStats(nextMode)
    else:
        playFailedTransformFeedback()
```

Each mode defines:

```pseudo
mode.widthTiles
mode.heightTiles
mode.speed
mode.gravity
mode.canDig
mode.canFly
mode.canCrush
mode.allowedAbilities
mode.spriteSet
mode.hitbox
```

---

## 10. Dig Logic Pseudocode

For tile-based digging:

```pseudo
function startDig(direction):
    if currentMode cannot dig:
        return

    targetTile = getAdjacentTile(player.tilePosition, direction)

    if targetTile is not diggable:
        playBumpFeedback()
        return

    playDigAnimation(direction)
    damageTile(targetTile, drillPower)

    if targetTile.health <= 0:
        breakTile(targetTile)
        spawnDebris(targetTile.position)
        allowMoveIntoTile(targetTile)
```

For the 1-tile tank:

```text
Player body hitbox stays inside current tile.
Tool/dig effect targets the adjacent tile.
The player only moves after the tile is destroyed.
```

---

## 11. Transform Rules

### Smaller Mode Transform

Usually safe:

```text
Big Tank -> Tank
Tank -> Mobility
Mobility -> Fly
```

### Bigger Mode Transform

Requires clearance:

```text
Fly -> Mobility: needs 1x0.5 space
Mobility -> Tank: needs 1x1 space
Tank -> Big Tank: needs 2x2 space
Big Tank -> Power Jet: needs 4x4 space
```

### Failed Transform Feedback

If no room:

```text
- character shakes
- small puff/spark
- mechanical error sound
- UI icon flashes
```

This makes the limitation feel intentional instead of broken.

---

## 12. Production Recommendation

Build the system in this order:

### Phase 1 — Gameplay Prototype

- Use basic rectangle sprites.
- Implement mode switching.
- Implement different hitboxes.
- Implement transform clearance checks.
- Implement simple Motherload-style digging.

### Phase 2 — Animation Scaffold

- Add separate sprite sheets per mode.
- Add track loops, flame loops, dust bursts.
- Add body recoil and bobbing.
- Add tile crack states.

### Phase 3 — Polish

- Add transformation effects.
- Add camera shake.
- Add sound layers.
- Add upgrade variants.
- Add advanced drill/hole overlay if needed.

Do **not** start with complex AI animation as the foundation. Use AI mainly for mockups and final visual inspiration, then implement stable sprite animation manually or through simple rigged parts.

---

## 13. Key Takeaway

The safest and strongest character concept is:

```text
A multi-form transforming utility machine:

Power Jet Mode = huge 4x4 fast flying form
Big Tank Mode  = 2x2 heavy power form
Tank Mode      = 1x1 main digging form
Mobility Mode  = 1x0.5 fast WALL-E-inspired ground form
Fly Mode       = 0.5x0.5 tiny drone form
```

The implementation should be **mode-based, hitbox-based, and effect-driven**.

The character does not need complex facial animation or detailed limbs. The satisfaction should come from:

- clean transformations,
- strong tile-size contrast,
- clear gameplay roles,
- powerful dust/flame/sound feedback,
- and simple, readable animations that do not drift.

critical big tank and super big tank the 16 tile and 4x4 digger (double size old tank we will same same sprite should be unlocked later and shown in town as a ''unlock with high endgame resources'' we will not animate them yet now just mobility mode tank mode and fly mode)
