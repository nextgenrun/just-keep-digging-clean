# Level 1 background polish — 6 September 2026

The current preview now uses the actual bounded demo gameplay profile and opens
at Level 1's Moonlit Promenade. Its controls cover Town Square through the
Level 1 eastern boundary. Level 2 is disabled, and its waterfall paintings and
landmark renderers are not loaded by this preview.

## Background corrections

Mountain and forest sections now crossfade their original premultiplied colour
and alpha into a single joined section. The former two independent edge fades
could expose the sky through otherwise opaque mountains. The new sections join
without overlapping translucent rectangles. Forest frames also retain real
neighbouring pixels beyond their visible edges so bending crowns do not clip
at a card boundary.

Both Level 1 forest planes now receive rooted wind deformation. A taller rear
canopy adds depth behind the foreground forest, with separate camera parallax.
The earlier wind gate had restricted trees and valley mist to Level 2; that is
why those motions were absent from the accessible level.

A moving cloud deck and closer spacing between the upper cloud rows add
structure to the previously empty surface/flight views. The sky's horizon glow
falls off sooner with altitude, reducing the broad pale areas. Valley mist and
near haze now cover Level 1 and fade as they reach its boundaries.

Town Square keeps its original video. Only its runtime sky-edge mask changes:
the upper sky blends across a wider area while the lower town retains its
existing narrow transition. No source image or video was overwritten.

## Verified

- 21 Level 1 surface/altitude/day/night captures in the actual demo profile.
- All six sampled mountain joins retain alpha 255 across their lower join band.
- Five visible forest sections in the final camera view use the wind shader;
  both forest planes animate and have padded sampling edges.
- Fixed-position pixel comparisons show animated cloud structure and tree
  canopies; the sampled tree-root pixels have exactly zero difference.
- Nine seconds of stationary-camera playback, then real walking and flight.
  Walking advanced about 666 pixels; flight rose about 904 pixels.
- The capture contains 987 real samples at approximately 59.42 samples/second.
  The 16.68-second MP4 exports at 60 fps without speeding up the motion.
- Pause/resume, scene teardown, owned landscape textures and both motion
  pipelines pass. The sample retained 56 cloud sprites including the pool,
  below the 96-sprite limit.
- 50 camera/zoom geometry cases and 3,150 sky coverage samples pass. Existing
  clock/weather, phase-boundary and white-fleck checks also pass.
- No JavaScript or shader errors, no failed tracked asset responses, and no
  requests for the Level 2 landmark paintings in the final verification run.

Two earlier automation runs timed out while waiting for preview startup; fresh
reloads completed the audit and final playback. Generic browser 404 console
messages were also observed but were not attributed to tracked game assets.
These checks cover this background patch, not the full repository test suite.

The rectangular columns around X119/X132 are actual solid level geometry, not
background transparency. They remain visible and collidable: this background
pass does not hide an obstacle or change the world layout. See the earlier
[collision ownership audit](2026-09-06-background-collision-ownership-audit.md).

[Open Level 1](http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=level-one-polish).
[Before survey](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one/before-gallery.html).
[After survey](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one/after-gallery.html).
[Motion clip](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one/level-one-living-backgrounds.mp4).
[Runtime verification](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one/polish-verification.json).
[Material verification](../testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one/material-motion-verification.json).

Town Square video SHA256 is unchanged:
1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6.
