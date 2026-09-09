# Level 1 atmosphere V3 - 2026-09-06

The approved Level 1 woodland composition now has thicker generated cumulus
banks, stronger weather cover, authored sun/moon artwork, smoother phase
brightness and subtle floating canopy details. The current preview remains
`testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=atmosphere-v3`
on the checkout's canonical server at port 8195, using the real demo PlayScene
with saving disabled. This is still the `layeredSky=1` comparison candidate.

## What changed

- Two new RGBA sources: four cumulus variations and a sun/moon sheet. Existing
  forest, ridges, sky, mist and Town footage retain their sources. Generated
  files, prompts, alpha measurements and SHA256 hashes are in the existing
  regenerated-horizon-v2 asset directory.
- Clouds preserve their world layout while optical thickness and opacity
  increase with authoritative cloud cover. An additional ceiling fades in for
  overcast weather. Daylight, sunset warmth, night blue and lightning come from
  the existing clock/weather snapshots. Billow deformation has gentler amplitude
  and explicit soft frame guards.
- DayNightCycle owns the celestial sprites through LayeredCelestialView. The
  candidate's demo orbit uses Level 1's playable width. World position, camera
  projection and lighting agree; bodies remain behind mountains/clouds. Owned
  halo textures remove source-cell edges. Sun/moon phase brightness interpolates
  continuously, including midnight, while the baseline orbit remains unchanged.
- Reused Worldroot leaf/glimmer artwork floats near the canopy with wind,
  curl, flutter and lifetime fades. It becomes subdued during precipitation;
  warm glimmers appear at night. A maximum of 42 sprites share the cloud motion
  clock and pause gate. Old static white flecks remain disabled.

## Verification

`qa-atmosphere-v3/gallery.html` contains 44 actual runtime captures: 13 positions
across the entire Level 1 route in daylight and at night, six altitude/zoom
views, five solar/lunar phases, five weather conditions (winter for snow), and
1366/1920-wide viewport checks. The contact sheet was visually reviewed.

`verification.json` passed: no page exceptions, shader compile errors, tracked
failed asset responses or Level 2 landmark requests. Sun coordinates and
lighting coordinates matched. Pool limits, native cloud density, forest guard
bands, pause, real D walking, Shift+W flight and teardown all passed. Scene
shutdown removed the inspector, both motion pipelines and owned celestial/
landscape textures.

The 17-second `level-one-atmosphere-v3.mp4` is H.264, 1470x826, 60 fps. It records
stationary cloud/particle motion, a transition into drizzle, walking and flight.
1014 original captures averaged 59.89 samples/second; viewport FPS readings
ranged from 52.21 during early sampling to 60. Isolated actual GPU renders
changed 24.8% of cloud-region pixels after one second and 19.9% when increasing
thickness at the same animation time. See `pixel-analysis.json`.

Passing focused checks:

- `testing/2026-09-06-regenerated-background-contract.mjs`: 50 Level 1 camera/zoom
  cases, 3150 opaque sky coverage samples, native scale, legacy exclusion,
  pause, underground culling and lifecycle.
- `testing/2026-09-06-level-one-atmosphere-contract.mjs`: Level 1 orbit, unchanged
  baseline/full-world orbit, continuous phase alpha, camera projection,
  weather thickness and night cloud colour.
- Existing celestial-clock and weather-sunlight smoke checks.

The protected Town video SHA256 is unchanged:
`1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6`.

## Observed limits

One fresh headless Chrome launch timed out before PlayScene; a fresh retry
completed the audit. Console output retained existing omitted-anchor warnings,
two generic 404 messages without failed tracked asset responses, and Chromium
framebuffer-query warnings during capture. These are recorded separately from
page/shader/asset failures; this is focused local evidence, not a global suite.

The authored solid barriers at X119/X132 and the horizontal geometry near the
eastern boundary remain visible. Their collision ownership was established in
`2026-09-06-background-collision-ownership-audit.md`; this background pass does
not erase them. Town retains its protected moonlit footage. No Level 2 work was
added and this candidate was not made the default renderer.
