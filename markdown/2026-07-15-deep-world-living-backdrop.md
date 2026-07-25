# Deep World Living Backdrop

`DeepWorldLivingBackdropSystem` extends the approved living-world presentation into the separately generated Level Two runtime without changing terrain, mining, collision, resources, damage, or saves.

## Runtime scope

- World field: `x132..279`, `y2065..5064`.
- Source art: the existing skyline `atmosphere` atlas; no new texture allocation is required.
- Facade contract: the pass only creates when the v11 depth master and `WorldScenicFacadeSystem` are both active.
- Material language follows `WORLD_SCENIC_FACADE`: magma uses ember/glow, obsidian uses ash, foundry emphasizes steam, blackglass uses restrained ash/haze, and starfire receives the warmest aura.
- All actors use `scrollFactor=1`; movement is anchored in world coordinates and never follows the camera or player.

## Motion and performance

- Four fixed pools: ember `12`, steam `8`, ash `10`, magma aura `10`.
- Camera culling prevents offscreen actors from rendering.
- Motion periods remain between 8 and 20 seconds with bounded sway, bob, rotation, and pulse.
- Surface weather still modulates the pass, but Level Two wind and weather strength are attenuated to `2.5%` and `4.5%` respectively.
- Pools halve below 46 FPS and hide below 34 FPS.

## PlayScene wiring

Integrate after `WorldScenicFacadeSystem` so the required facade owner already exists:

```js
import { DeepWorldLivingBackdropSystem } from "../rendering/DeepWorldLivingBackdropSystem.js";

this.deepWorldLivingBackdropSystem = new DeepWorldLivingBackdropSystem(this);
this.deepWorldLivingBackdropSystem.create();

this.deepWorldLivingBackdropSystem?.update(time, delta);

this.deepWorldLivingBackdropSystem?.destroy();
```

The create call belongs immediately after the world scenic facade has been created, update belongs beside the other background motion systems, and destroy belongs in the PlayScene shutdown cleanup.

## Rollback

- `?deepWorldLiving=0` disables this Level Two pass only.
- `?worldMotion=0` disables this pass together with the shared living-world motion family.
- `?worldFacade=0` prevents creation because the semantic material surface is absent.

Run `testing/2026-07-15-deep-world-living-backdrop-smoke.mjs` to verify range, band inheritance, world anchoring, fixed pools, slow motion, weather attenuation, FPS gates, cleanup, and all rollback paths.
