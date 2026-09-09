# Level 1 living backgrounds - approved in-game V6

Date: 2026-09-06. Status: enabled in the local game by the user's explicit
approval to wire the reviewed work in-game. Scope: the bounded Level 1 demo.

The normal scenic game now uses the approved layered background without a
preview flag. Existing time, weather, wind and pause state drive the sun/moon,
compact cloud ceiling, forest sway, precipitation and ambient movement. V5's
removal of ground cloud/mist layers and outdoor rain steam remains active.
Town Square's original living video and gameplay authority remain intact.

## Final polish

- Rare flocks of 2-4 small swallows cross the distant sky, alternating authored
  wingbeats and glides with independent phases and slight banking.
- Occasional leaf eddies and warm dusk glimmers reuse Worldroot artwork.
  One event is admitted at a time, at most six sprites, followed by 45-88
  seconds of quiet. First admission waits 14-25 seconds. Weather can extend
  these gaps. Events share the existing pause clock, use a private visual
  random stream, stop admitting in rain/storms, and fade smoothly in bad weather.
- Reduced-motion preference and surfaceEvents=0 disable the new events.
  Underground views and large camera jumps release active event sprites.
- The final route audit found a remaining vertical mountain fade in the east.
  Adjacent painted skylines now align within the existing overlap before color
  blending. Ridge interiors remain opaque; source files are untouched. Forest
  joins retain the approved V5 treatment. The measured synthetic 80-pixel
  skyline mismatch now has a maximum one-pixel step between adjacent columns.

## Ownership and rollback

values/worldVisualRuntimeSelection.js holds the existing renderer selector;
values/worldVisualRuntime.js re-exports its public API. This avoids circular
configuration imports and prevents a legacy renderer selecting the new assets.
values/worldVisualLayeredSkyReview.js enables the background for the canonical
demo profile. The historical Review names and inspector remain compatible.
Explicit layeredSky=0/off/false restores the previous background. Local
full-review retains its previous opt-in layeredSky=1 route; production/remote
profile resolution keeps Level 2 excluded.

values/levelOneAmbientEvents.js owns all new event tuning.
WorldVisualLevelOneAmbientEvents owns its actors and six atlas frames through
WorldVisualLayeredSkyReview. landscapeRidgeJoin.js performs the one-time ridge
join composition. No event writes WorldModel, progression, resources, saves,
collision or the shared world random state.

## Runtime evidence

See testing/2026-09-06-level-one-live-v6/gallery.html and runtime-verification.json.
Canonical serve.py served the real game at port 8195. An isolated Chrome run
entered with only jkd_e2e=1 and cinematics=0; saving was disabled. No layeredSky,
sandbox, pacing or gameplay-profile enable flag was used.

- Actual D walking moved the player and Shift/W/D powered flight gained altitude.
- Nineteen final captures cover entry, movement, Town-to-east surface positions,
  daytime/night, the canopy, cloud corridor, storm and scene re-entry. Camera,
  time and weather fixtures stage the route after the real input checks; this
  is not a natural full progression playthrough.
- A two-bird flock appeared through the normal scheduler without a trigger or
  rate override. Pause preserved exact positions, frames and the shared clock.
- Storm prevented event admission. Underground views released cloud/event
  sprites. Stopping PlayScene removed every owned bird frame and joined
  landscape texture. Same-page re-entry recreated the normal background.
- Explicit layeredSky=0 restored the previous far renderer.
- The 25.7-second silent MP4 contains actual canvas motion at 1920x1080/30 fps.
  The flock is natural; leaf/glimmer admission and the clock change are staged
  for coverage. The source WEBM remains alongside it.
- Six focused contracts passed: default/profile/ambient ownership; unequal ridge
  joins; 50-camera geometry with 3,150 sky coverage samples; weather/rain at
  30/60/144 Hz and solid/AIR impacts; atmosphere/orbit continuity; V5 compact
  clouds, no outdoor mist and silhouette coverage. Source art was also inspected.

The run had zero uncaught JavaScript errors and no asset/frame/shader warnings.
Six WebGL INVALID_ENUM framebuffer attachment-query warnings were recorded.
The lifecycle registry reports existing npcManager.stop and Star Scar
presentation disposal errors with both the new and previous background. They
are outside this patch; background teardown and scene re-entry passed despite
them. This is focused background validation, not a whole-game health clearance.

The earlier wide diagnostic zoom 0.6 screen-overlay coverage issue remains;
normal gameplay zoom 1 is the verified presentation. Stone forms at the eastern
boundary are actual solid-bedrock presentation and are left readable.

## Artwork provenance

Built-in ImageGen produced the byte-identical 1536x1024 RGBA swallow source:
sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/swallow-flight-v6.png.
The six cells have measured body origins and transparent gutters. The exact
prompt and source path are recorded in 2026-09-06-swallow-v6-prompt.json;
2026-09-06-swallow-v6-manifest.json records alpha bounds and SHA256.

Bird atlas SHA256:
04dded941dba5600d2aae526259e94bb7c784d30e52012b35d014d76a7d9b738

Unchanged Town video:
sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4
SHA256: 1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6

This change promotes the local game's default presentation. No external site
was deployed, no commit was created and no save was migrated.
