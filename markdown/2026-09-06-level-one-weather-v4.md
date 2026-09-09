# Level 1 weather V4 — 2026-09-06

The Level 1 comparison now has broad overlapping cloud banks alongside small
cumulus, larger near formations, cirrus and surface mist. Stable seeded sizes
span approximately 260–1,600 world pixels. Independent slow growth and internal
billowing preserve the mixed scale while avoiding synchronized breathing.
All sprites remain at or below native source scale.

WeatherSystem owns the passing fronts. Its normal lighting snapshot carries
cover, sun attenuation, fog and gusts to the background and celestial systems.
Fair weather can become thin or cloudy; approaching weather builds the same
layer into overcast. The in-app 84-game-second audit measured cover from
0.040 to 0.595. The independent export replay measured 0.125 to 0.625.

Rain uses a new neutral silver atlas, three depths, randomized streak widths,
wind slopes and clearer surface contact splashes. A 52 ms photographic trail
keeps its apparent length independent of render refresh. The same tested drop
renders about 68 world pixels long at 30, 60 and 144 FPS. Existing swept world
rays still stop at the first real solid and let rain traverse AIR shafts.
Snowflakes are smaller and lighter. Wet-surface ripple frames now resolve to
their own texture correctly. The preview's World weather selection releases
manual weather back to the existing director.

## Review

- [Interactive Level 1](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=weather-v4)
- [27-view gallery and motion recording](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-weather-v4/gallery.html)
- [Motion MP4](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-weather-v4/level-one-weather-v4.mp4)

The 26-second movie records actual rain, storm build-up and flight-height clouds.
The MP4 is encoded at 30 FPS for playback from the original variable-cadence
canvas recording; it is not a claim that every game frame rendered at 30 FPS.

## Validation

The canonical serve.py review used the bounded demo profile with saves disabled.
In-app checks covered 22 location/weather/time views plus five cloud-front views.
The in-app automation kernel stopped executing during large media export; the
already saved verification remains in verification.json. A separate local
headless review repeated the capture through the audit page's visible controls.
Its export-verification.json has 116 passing checks and no runtime errors or
weather frame/shader warnings during the run. All 27 saved PNG files decode.

Focused contracts passed for candidate cloud evolution and frame-independent
rain, actual world precipitation, swept collision, lighting, precipitation
transitions, atlas ownership and the Level 1 atmosphere. The geometry contract
also passed 50 camera cases / 3,150 sky coverage samples, native density,
bounded pools, underground culling, pause and teardown.

The active candidate remains query-gated with layeredSky=1. Level 2 stays
disabled in this demo. The Town video has SHA256
1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6,
identical to the protected source before this work.

## Generated asset paths and exact prompts

Both files were generated with the built-in image_gen.imagegen tool and copied
unchanged. Source PNG alpha is preserved; runtime frame rectangles follow the
actual transparent gutters. No source art was repainted by scripts.

- [Cloud banks, 1672x941 RGBA](../sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/cloud-banks-v4.png) — [exact prompt and source](../sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/2026-09-06-cloud-banks-v4-prompts.json)
- [Rain and impacts, 1774x887 RGBA](../sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/weather-v4.png) — [exact prompt and source](../sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/2026-09-06-weather-v4-prompts.json)
- [Hashes and dimensions](../sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/2026-09-06-weather-v4-manifest.json)

Configuration is in values/layeredWeatherVisuals.js,
values/worldVisualLayeredSkyReview.js and values/layeredAtmosphereMotion.js.
