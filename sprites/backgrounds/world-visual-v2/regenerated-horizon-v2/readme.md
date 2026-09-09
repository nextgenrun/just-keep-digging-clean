# Regenerated Horizon V2

Original background art generated with the built-in imagegen tool. Town Square's existing living video remains unchanged.

The active pack has nine source files: one opaque night sky, three rich blue mountain panoramas, a transparent forest, a four-wisp transparent cloud atlas, two waterfall landmark paintings, and one transparent floating-island underside.

The richer mountain and waterfall revision uses explicit generated magenta mattes. Transparency requests returned RGB checkerboard/black backgrounds, so those versions were rejected. A subsequent ImageGen edit supplied an identifiable matte. compositeGeneratedMatte derives transparency and removes edge spill in renderer-owned canvas textures; it never modifies the saved source PNGs. Broad side feathering blends the panoramas. Forest, clouds and island retain their original generated alpha.

Waterfall motion comes from a shader confined to the painted water channels, with separate drifting spray sprites. The surrounding cliff remains rigid. Landmark placements and valley/near mist are restricted to Level 2. Their tint, cover, fog and wind use the existing world clock and weather snapshots. The sky gradient follows the clock palette; the generated night sky fades out during daylight.

See manifest.json for native dimensions, source paths and hashes. The latest exact prompts, style references, rejected transparency attempts and chosen matte sources are in 2026-09-06-level2-motion-prompts.json. The initial alpha pack is documented in 2026-09-06-prompts.json and 2026-09-06-before-rich-mountains-manifest.json.

island-rocks.png aligns its measured contact edge to the actual Heavenblock collision platforms. It contains no gates, buildings or surrounding sky.

Current scope: the Level 1 polish uses only the six sky/ridge/forest/cloud
sources. The extra landmark/island files remain for historical work. Layered
landscape sections now crossfade into opaque joins; both Level 1 forest planes
animate, and a moving cloud deck fills the formerly sparse upper views.
Town Square's file is unchanged. See markdown/2026-09-06-level-one-background-polish.md.

Atmosphere V3 adds cloud-cumulus-v3.png and celestial-v3.png as byte-identical
ImageGen RGBA sources. 2026-09-06-atmosphere-v3-prompts.json and the matching
manifest record provenance, alpha and hashes. Runtime cloud shaders soften
frame borders; separate owned sun/moon canvases taper the authored aureoles
before their cell edges. The sources remain intact. Existing Worldroot leaf
and glimmer artwork is reused by sparse floating details.

Weather V4 adds cloud-banks-v4.png (1672x941 RGBA) and weather-v4.png
(1774x887 RGBA), copied unchanged from built-in ImageGen output. The dated
cloud-banks-v4 and weather-v4 prompt JSON files preserve the exact prompts and
source paths. Measured frame rectangles follow the real transparent gutters;
the generated source images are not cropped or repainted on disk.

## Approved Level 1 V6 bird art

`swallow-flight-v6.png` is an unchanged 1536x1024 RGBA output from built-in
ImageGen, with six wing poses in a 3x2 grid. Runtime frames use measured body
origins so changing wing poses keeps the body anchored. Only small, distant
silhouettes are displayed. Alpha is transparent with clean cell borders.
The exact prompt is `2026-09-06-swallow-v6-prompt.json`; source path, SHA256,
dimensions and per-frame alpha bounds are recorded in
`2026-09-06-swallow-v6-manifest.json`. Leaves and glimmers reuse the existing
Worldroot artwork. Town Square video bytes remain unchanged.
