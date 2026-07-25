# UAL Flight Style Lab v1

Created 2026-07-17 as an additive, review-only flight proof of concept for the
approved Survival-over-UAL character and the UAL source body.

Open:

`http://127.0.0.1:8093/testing/animation-sandbox/ual-flight-style-lab-v1/`

The lab uses the real runtime manifests, WebP sheets, projected rig markers,
109px display size, 94px tile scale, and 31x75 movement body. It does not import
or mutate a gameplay scene.

## Options

| Option | Direction | Motion source | Board |
|---|---|---|---|
| A | Current rocket baseline | `Shield_Dash` + current hover slice | No |
| B | Legacy-style upright board | `Idle_Loop` | Always |
| C | Hoverboard carve | `Crouch_Idle_Loop` | Always |
| D | Blender Superman flight | `Push_Loop` + Blender one-arm/leg pose layer | No |
| E | Board-to-hero hybrid | crouch hover → `Push_Loop` boost | Phase-driven |

The old character's board was flattened into its character frames, so the lab
draws a separate board below projected foot markers. This keeps the prop
tunable and prevents old-character pixels from contaminating the approved body.
Option D now uses the approved Blender Survivor mesh with an isolated pose layer
on the local retargeted `Push_Loop`: one lead arm, one tucked arm, stretched
trailing legs, and a flatter body line. Its review source lives only under
`testing/blender-animation-lab-v1/review-drafts/superman-flight-push-layer-v1/`.
It is not loaded by game-time character profiles.

When collider guides are enabled on Option D, cyan shows the visual 75x31
sideways hull and amber shows the proposed 70x34 safe tile AABB. The game tile
solver is axis-aligned, so this avoids pretending a rotated rectangle is safe
until a later swept-collision promotion is explicitly approved.

## Review controls

- Full takeoff → hover → cruise → boost → brake → landing loop, or isolated phase.
- Survival and UAL bodies.
- 1x game scale and 2.2x inspection scale.
- Speed, pose pitch, playback cadence, board height/scale, trail length, VFX.
- Frame-following foot alignment, fixed-collider guide, and 0.8-tile guide.
- `W/S` lift, `A/D` bank, hold `Shift` to force boost, `Space` to pause.
- Bookmarkable query state, copyable review URL, and copyable tuning JSON.

The browser smoke hook is `window.__UAL_FLIGHT_STYLE_LAB_V1__`. Its snapshot
includes the selected option, character, source action/frame, board opacity,
controls, collider, and `productionChanged: false`.

Validate with:

```powershell
node testing/2026-07-17-ual-flight-style-lab-v1-contract.mjs
```
