# Animation and Mesh Polish V2 Motion Review

Animated, review-only evidence for improving the default Survival player.

Comparison outputs:

- Current Piskel run versus the Blender rollback run and the existing
  review-only Unreal Game Animation Sample retarget.
- Current moving action versus the Blender upward action and the existing
  review-only Unreal mining-strike retarget.
- A genuine Blender lighting/material/deformation A/B rendered from the
  production character master without saving changes to that master.

Files:

- `01-locomotion-current-vs-blender-vs-gasp.mp4` — synchronized eight-second
  loop comparing current Piskel, Blender rollback, and the isolated Unreal
  Game Animation Sample retarget, including a true 123 px display check.
- `02-action-deformation-current-vs-blender-vs-gasp.mp4` — synchronized
  eight-second action comparison focused on hands, wrists, shoulders, and hips.
- `03-blender-lighting-material-motion-ab.mp4` — genuine Blender render A/B:
  current seven-light scene versus a four-light target with corrected normal-map
  color space and preserve-volume skinning enabled.

Confirmed interpretation:

- The production mesh is already dense at 83,188 vertices and 119,304 polygons.
- Existing materials include 4K and 8K PBR maps; subdivision is not the main
  missing-quality lever.
- Both `Body_Normal...` and `HairBrown_Normal.jpg` are currently interpreted as
  sRGB rather than Non-Color.
- Seven active render lights from two overlapping lighting rigs flatten the
  materials and wash out form.
- The eye base-color image is unresolved in the inspected Blender scene.
- The actual 101–123 px presentation remains the hard detail ceiling even when
  the inspection render looks substantially better.

`reviewOnly: true`  
`productionChanged: false`

No video, frame, or script in this package is loaded, registered, preloaded, or
wired into Phaser.
