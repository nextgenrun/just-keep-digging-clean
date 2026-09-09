# Level 1 living backgrounds

This preview now uses the actual bounded demo gameplay profile. It opens on
Level 1's Moonlit Promenade and can travel from Town Square to the eastern
boundary. Level 2 is disabled and its landmark paintings are not loaded here.

The current background pass repairs translucent landscape joins, enables wind
on both Level 1 forest planes, fills sparse surface/flight views with moving
cloud layers, and blends the preserved Town Square video into its surroundings.
The static baseline remains available using Current world.

Use drag/arrows, location and altitude controls, Slow travel, Hold atmosphere,
time/weather selectors, or Play here for the normal walking and flight inputs.
The existing E2E route disables saving in this review world.

Current evidence is in qa-level-one/: before/after galleries, actual rendered
material comparisons, runtime checks and level-one-living-backgrounds.mp4.
Earlier qa-regenerated/ and qa-natural-motion/ captures are historical.

Configuration lives in values/worldVisualLayeredSkyReview.js and
values/layeredAtmosphereMotion.js. Original art and prompt provenance remain in
sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/. No source art or
Town video bytes were changed by the Level 1 polish pass.

Run serve-review.py with Python to start canonical serve.py on port8195.

Latest: qa-atmosphere-v3/ contains the 44-view Level 1 route/weather/altitude
reaudit, actual cloud shader comparisons, and the updated motion recording.
Use revision=atmosphere-v3 for this pass. Cumulus volume, overcast cover,
celestial artwork, continuous phase brightness and subtle drifting canopy
details extend the approved forest composition. Sunrise and Noon selections
are available alongside the live World clock. Town video remains unchanged.

Latest weather pass: use revision=weather-v4. Seven moving atmosphere planes
include broad overlapping cloud banks, small distant cumulus, larger nearby
formations, cirrus and valley mist. Passing fronts vary cover and apparent
size during fair weather; rain and storms build the same layer into overcast.
The new rain/impact atlas supplies brighter depth-separated precipitation with
refresh-rate-independent trails. Drizzle, rain and storm controls start at
representative intensities; World weather releases the manual override.
The local qa-weather-v4 audit captures actual canonical runtime frames.

Latest cloud/fade pass: use revision=cloud-polish-v5. The ground cloud and mist
planes are removed. Five sky planes now share a compact vertical ceiling with
closer bank spacing, short heights and independent horizontal wind/parallax.
Outdoor rain mist and post-rain steam are disabled in the candidate. Landscape
joins retain opaque tree/ridge silhouettes where neighbouring art is empty.
qa-cloud-polish-v5/gallery.html has 24 before/after pairs and a 24-second motion
clip; after-verification.json includes two additional wide-view diagnostics.
Earlier descriptions of valley mist and seven cloud planes are historical.

## Approved in-game V6

The Level 1 composition is now enabled by default in the normal game. This page
remains a comparison and weather/time control surface. Previous background uses
`layeredSky=0`; In-game background shows the approved presentation.
`revision=level-one-live-v6` identifies the current pass. Rare bird flocks,
leaf eddies and dusk glimmers use the normal ambient schedule here and in the
game. Fresh normal-entry walking, flight, weather, re-entry and rollback
evidence is in `testing/2026-09-06-level-one-live-v6/`. Earlier qa-* directories
are historical captures.
