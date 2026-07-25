# V11 image-generated weather VFX mockup v3

Mockup-only comparison of the procedural v2 skyline weather treatment against
an image-generated weather VFX library. The authored v11 skyline and production
Phaser weather systems are not modified.

The `assets/sources/` sheets were generated with the built-in image-generation
tool using the exact v11 surface skyline as the style reference. Crisp rain,
snow, and water-impact sheets use chroma-key removal; soft clouds, fog, smoke,
steam, and lightning remain black-backed for screen/additive compositing.

Open `index.html` through a local web server. Use the VFX mode control to compare
`Imagegen VFX` and `Procedural` under identical time, weather, and intensity.

Rebuild processed assets with
`ai-tools/2026-07-11-build-v11-weather-vfx-assets.py` after the three alpha
source sheets have been prepared by the installed imagegen chroma-key helper.

## Post-approval production direction

This v3 directory remains mockup-only. Do not change production weather APIs or
wire these assets into Phaser until the comparison has been visually approved.

After approval, first inspect the real day/night, weather, atmosphere, skyline,
and precipitation-occlusion ownership points and write an implementation-ready
plan that names the exact production files, classes, and symbols. The separate
production pass should then:

- use the approved cloud, rain, snow, splash/ripple, fog, smoke/steam, and
  lightning frames while permanently excluding rejected water frames 8 and 9;
- keep procedural control of spawning, pooling, motion, wind, density, timing,
  parallax, authored roof/ground termination, culling, and performance scaling;
- drive tint, opacity, blend, cloud lighting, windows, chimney smoke, mist,
  stars/fireflies, and lightning exposure from the existing day/night clock with
  smooth dawn, noon, dusk, and night transitions;
- map clear, cloudy, rain, storm, fog, and snow to crossfaded layer presets, with
  wind affecting cloud speed, rain angle, snow drift, fog travel, smoke lean,
  and water-impact intensity;
- preserve the authored skyline and windmill depth separation while using three
  cloud depth families, distant haze behind structures, midground atmosphere,
  and foreground precipitation/impacts instead of a flat screen overlay;
- use the production landing-mask/occlusion system for actual roofs and ground,
  with post-rain steam/mist and persistent puddle ripples where appropriate; and
- retain capped atlas sprites, pooling, camera-aware culling, density scaling,
  performance validation, and a procedural fallback/comparison mode.

Keep identical timing and settings between Procedural and Imagegen during review
so the renderer choice is the only comparison variable.
