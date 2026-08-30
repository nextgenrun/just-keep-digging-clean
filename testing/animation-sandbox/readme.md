# Animation Sandbox

Standalone Phaser 3 mini-game for rapid animation & collision testing. Loads player spritesheets and tile textures into a small collidable world — no need to boot the full game.

## Surface living background mockup

`2026-08-26-surface-living-background-mockup-v1/` is an isolated ten-candidate
AI image-to-video review of the surface plus one continuous two-tile-deep earth
cross-section. Five models each receive two quiet motion profiles. The chooser
keeps camera and geology fixed, measures endpoint drift, and uses identical
endpoint conditioning plus a 700 ms playback overlap to prevent a harsh loop
reset. It does not modify the production scenic renderer.

`2026-08-26-real-surface-living-background-v1/` replaces that synthetic test
with four focused Seedance loops built from the actual town beauty, slate cap,
and Level One facade. Visible wind motion is generated as a half-cycle and then
made mechanically loopable by appending its exact reverse.

`2026-08-26-surface-background-loops-v2/` is the corrected background-only
review. It stacks three camera-locked, approximately 18-second Seedance Mini
cycles over a separate static production floor/ground image. The final loops
move forward continuously, exclude the ground crop, and use a deterministic
tail-to-head closure instead of reverse playback.

## Mixamo punch sequence review

`mixamo-punch-sequence-review-v1/` retargets eight clean unarmed Mixamo
motions onto the approved high-resolution Survival character, then compares
the current repeated SIDE/UP/DOWN attacks with rhythmic authored chains. It
includes individual animated clips, six preset recipes, a custom three-strike
builder, 94 px target tiles, the 31x75 collider, game-scale viewing and
browser-local verdicts. It never changes production animation ownership.

## Mixamo current-role replacement review

`mixamo-replacement-review-v1/` compares only game-mapped Mixamo candidates
against the exact current runtime animation family they could replace or extend.
It includes flight/descent, locomotion handoffs, directional mining, crouch,
wall/abilities, reactions, and death. Accept/Maybe/Reject verdicts are local to
the browser and never change runtime animation ownership.

## Flight style lab

`ual-flight-style-lab-v1/` is the additive five-direction flight chooser for the
approved Survival/UAL character. It compares the current Shield Dash baseline,
upright and crouched hoverboards, rotated Push Loop Superman flight, and a
board-to-hero hybrid. The board follows projected feet while the 31x75 collider
stays prop-free. All controls are bookmarkable and the lab never mutates
gameplay.

## Survivor side-combo review

`survival-side-combo-review-v1/` is the review-only A–D chooser for a more satisfying unarmed SIDE combo. It plays the real Survivor UAL Jab/Cross sheets beside the approved Blender Survivor v2 `MINER_attack` and `MINER_dig_side` sheets at the 0.8-tile / 31×75 game contract. The selection is browser-local and cannot modify the live combo.

## Current UAL pose and hitbox editor

For the promoted native UAL character, use
`ual-animation-tuning-lab-v2/` (stable URL, v3 editor). It loads the actual
21-action / 943-frame review manifest while clearly separating the 18 sheets /
867 frames loaded by gameplay. The active SIDE, UP, and UP-SIDE set is
punch-only; Hook, the authored kick, and `Sword_Regular_C` remain rejected
review actions. The lab applies the production 109px base and 123px locomotion
display sizes and adds direct body/contact resize handles,
flip-aware logical hand dragging, current-frame/action pose overrides, weighted
frame holds, undo/redo, range copy, production comparison, and atomic JSON patch
import/export. Contact/marker validation is visual diagnostic evidence, not a
gameplay gate; production cooldown begins at action start while damage waits for
the authored contact. The older root mini-game below remains useful as a
collidable legacy harness.

## Current-character run review

`ual-run-review-v1/` is the review-only in-game frame for five running
animation candidates using the current Survival character: the production
Blender v2 run, the Unreal-retargeted run, the UE5-retargeted UAL jog, and two
grounded walk-source stress tests evaluated at run speed. It uses the live 94px
tile grid, 31x75 collider, and 109px locomotion render. It never promotes a
selection into gameplay.

## Phase handoff review

`phase-handoff-review-v1/` compares current frame-zero sheet switching with a
measured phase-aware moving-dig handoff and two-frame planted reversal. It uses
the promoted Survival Jog and moving-dig art, real Game Rig v2 foot markers,
the central moving-dig compositor, the live 31x75 collider, and the unchanged
14-frame/contact-frame action contract. Facing and movement reverse on the
input frame in both rows; the proposed pivot changes visuals only. Production
routing remains untouched until the comparison is approved.

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

## Production earthquake feedback harness

`earthquake-feedback-ui-v1/` runs the production feedback, FallZone, grounded
impact, and tile-feedback classes at the live 1280x720 viewport and 94px tile
scale. Open `?phase=warning`, `earthquake`, or `escape`; it remains test-only
and does not mutate a save or world model.

## Earthquake dodge world review

`earthquake-dodge-world-v1/` is the test-only in-engine review for one-to-one
fall-zone warnings. It uses the current 94px tile, 31x75 player body, Survival
idle art, earthquake HUD frame, and an approved cavern background. Bookmark
`?shot=warning`, `dodge`, `impact`, `hit`, or `play`. The interactive state uses
`A`/`D` and held Shift Flight; it has no jump action and never mutates production
earthquake logic.

## Held Dig next-five review

`held-dig-next-five-review-v1/` now hosts the stronger V2 attack scale/anchor
review after the earlier micro-handoff set was rejected. It exposes the real
123-to-109 px standing-attack shrink and 88.6% moving-torso scale, then compares
one 123 px / 100% attack family across moving hold, standing Jab/Cross, movement
start and the held chain. The 94 px tile, 31x75 collider, 750 ms cadence and
contact frames remain fixed; production is untouched.

## Vertical Dig Before / After review

`vertical-dig-before-after-v1/` compares stationary UP, stationary DOWN, moving
UP-SIDE, and moving DOWN-SIDE against body-locked candidates. It reproduces the
current contact translation, tile overlap and DOWN-source shrink, then keeps the
31x75 collider, 94 px tile, contact frame and zero-delay input fixed while the
candidate reuses the central Piskel alignment and diagonal Jog compositor.
Production remains untouched until explicit visual approval.

## Player animation 500-point optimisation review

`player-animation-optimization-500-review-v1/` materializes exactly 500
measurable polish points from 20 animation families and 25 repeatable review
lenses. Its synchronized Before/After loops target stationary SIDE/Q release,
landing finish, and wall brace/push with visible collider, tile, anchor, and
silhouette guides. Filters and approvals are browser-local; production remains
untouched.

## Mixamo Atlas V2

`mixamo-atlas-v2/` expands the focused 13-row locomotive comparison into
exactly 130 role-mapped animated candidates. Every card keeps an exact current
runtime reference on the left and clearly distinguishes V4 character proof,
source-only motion scouting, and strict gate failures. Decisions are
browser-local; jump-only clips remain future reference and production is not
wired or changed.

## Mixamo proof audit V3

`mixamo-proof-audit-v3/` restores the clearer one-row comparison format while
retaining the expanded research pool behind it. The auditable surface contains
only 44 Survival-rig V4 proofs beside exact current runtime references; all
candidate GIFs replay infinitely and generic Mixamo-character previews are
excluded. It reuses Atlas V2 browser-local verdicts and does not wire runtime.

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
