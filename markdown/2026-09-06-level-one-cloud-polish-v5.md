# Level 1 cloud composition and landscape fades V5 - 2026-09-06

The accessible Level 1 candidate now removes the two surface-anchored cloud
planes, outdoor rain mist and post-rain steam. Underground rain mist retains
its existing owner. Sky banks have closer horizontal spacing and shorter
heights. All five sky planes share vertical parallax, with different horizontal
parallax and wind speeds, so the ceiling stays compact during flight.
Only ceiling row zero and rows above it can stream; there are no cloud rows
below the sky ceiling, even when the camera sees beyond the ground.

WeatherSystem still controls cover, optical thickness, size and gusts. Existing
bank/cumulus/wisp assets are reused at or below native size. No artwork was
regenerated for this pass. Cloud planes sit behind all terrain planes.

Landscape joins previously multiplied a solid outgoing tree/ridge alpha by
its crossfade weight even when the incoming source had empty pixels. The new
blend retains maximum silhouette coverage through the overlap interior, with
36 px soft transitions at join borders. Color remains a premultiplied blend.
The 16 px source guards still provide real neighbouring pixels for tree sway.

## Preview and evidence

- [Interactive Level 1 preview](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=cloud-polish-v5)
- [24 paired views and motion recording](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-cloud-polish-v5/gallery.html)
- Evidence directory: testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-cloud-polish-v5/

The final canonical serve.py audit captured 26 views: 24 ground/flight,
day/night and storm views plus two wider camera diagnostics. There were no
runtime errors or weather frame/shader warnings. All clouds stayed on sky rows
zero or above, and Level 2 remained disabled. The isolated headless Chrome run
was necessary because the in-app automation kernel stopped executing. This
is real PlayScene presentation evidence, not a natural progression playthrough.

The actual generated textures passed 1,370,260 overlap coverage samples,
including 247,475 opaque silhouettes meeting transparent source pixels.
All 256,000 neighbouring guard pixels matched with zero alpha or premultiplied
color differences, across all 14 phases of the four landscape layers.

The 24.15-second canvas recording shows horizontal woodland travel, rain
building over the forest and flight-height clouds. Cloud and foliage clocks
both advance throughout. Its four sampled frame rates were 52-59 FPS; these
are observations from this local run, not a performance guarantee.

Focused cloud/mist/fade, geometry/lifecycle, weather visual and Level 1
atmosphere contracts passed. Geometry covered 50 camera cases and 3,150
sky coverage points, bounded pools, native density, pause, culling and teardown.
Rain retains refresh-independent trails and authoritative solid/AIR collision.

The normal review camera uses zoom 1. At the additional zoom 0.6 diagnostic,
existing full-screen lighting/tint overlays reveal rectangular screen bounds;
that separate camera-overlay issue remains. The eastern demo boundary's
horizontal terrain strips/wall are authored gameplay geometry, not background
alpha artifacts. Neither is hidden by this presentation patch.

## Scope and source ownership

The candidate remains query-gated with layeredSky=1. The static baseline,
weather authority, collision, gameplay progression and Level 2 scope are
preserved. Protected Town video SHA256 is unchanged:
1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6.

Configuration: values/worldVisualLayeredSkyReview.js and
values/layeredWeatherVisuals.js. Rendering: WorldVisualLayeredCloudField,
layeredCloudShape and WorldVisualLandscapeSections. Outdoor particle admission:
LayeredWeatherAtlas and WeatherParticleController.
