# UNDERSTAR: The world within the stone

2026-09-07. Static visual-approval draft generated with built-in ImageGen.

The user selected Unearthed starlight as the strongest direction and requested
more of the actual game's story and visuals inside the existing logo.
selected-reference.png preserves their supplied reference. world-within-draft.png
is the new review image. prompts.json records the exact prompt and references.

## Design intent

- Left: Worldroot roots, subtle foliage and campfire refuge within the stone.
- Middle: excavated strata, mineral resources, a mining explorer and buried Stars.
- Right: celestial movement, Hollow Sun and Stellar Lance-inspired energy.
- Original lettering, bronze border, loose rock fragments, underline and central
  four-point star remain the composition reference.

This is a generated concept, not a contour-exact production asset. Inspect the
large detail and menu-size preview before choosing the next refinement.

## Game references

- values/worldrootSanctuary.js: Worldroot appearance, campfire growth and celestial access.
- values/resourceTypes.js: actual underground materials.
- markdown/2026-09-03-celestial-talent-and-skill-audit.md: Wayward Star, Hollow Sun,
  Stellar Lance and mining powers.
- steam-marketing/2026-09-05-understar-three-minute-trailer/work/clean-capture-proof.png:
  actual surface, player, Worldroot and campfire visual reference.

## Animation gate

The user requested a 15-second seamless loop using their specified OpenRouter
video model only AFTER they visually approve this new logo. No API request,
credential storage, animation job, runtime replacement or deployment belongs to
this static review step. Model availability must be checked after approval.

Native generated PNG on a dark background; this is not a new Blender render.

## Runtime replacement — 2026-09-07

The user approved this direction and requested replacement of the previous logo.
The E was made clearer, with reopened negative spaces and the miner contained
inside its solid lower section. The transparent 2048 x 608 runtime WebP is now
selected by values/branding.js. The 4096 x 1216 master is a Blender export from
native ImageGen artwork; no extra lighting or extrusion was added.

See runtime-prompt.json, build-runtime.py, export-verification.json and
runtime-verification.json. The previous V2 files remain available.
Animation is authorized following the user's visual approval; its API credential
is passed only through process input and is not stored in this package.

## Animation delivered

Seedance 2.0 Mini job completed after visual approval. The separate MP4 is
exactly 15 seconds, 360 frames at 24 fps, 1470 x 630, with no audio. The API
request asked for 720p; 1470 x 630 is the actual delivered raster. Generation
cost was $0.4570804. No additional generation was requested.

A 0.75-second closing blend returns to the decoded first frame for looping;
first/last SSIM improved from 0.925029 to 0.993099. The native source remains
preserved. See video-request.json, video-status.json, video-verification.json.
The game uses the transparent static logo; the MP4 is a separate preview.

## Animated runtime integration

The user approved the video and requested runtime wiring. BrandLogoView.js now
plays understar-logo-loop-alpha-v2.webm in the boot splash, loading views, main
menu and save menu. Original layout dimensions/fades remain intact; the static
logo is the reduced-motion/error fallback. See
markdown/2026-09-07-animated-brand-logo.md and animated-runtime-verification.json.
The MP4 remains available as the original approved animation preview.

## Compact glass and motion tempo (2026-09-07)

The shared logo now places the generated RGBA `understar-logo-glass.png` beneath
both the animated logo and its static fallback. A tight source frame trims the
asset's transparent padding; it occupies the existing logo bounds at 0.76 alpha,
so scenery remains visible through the frosted material without enlarging the
menu layout. Original logo art, anchors, fades and intrinsic dimensions remain.

`BRAND_CONFIG.animation.playbackRate` is 0.67 to bring its local movement closer
to the slowed menu scenery. The source is still 15 seconds; one displayed cycle
now takes about 22.4 seconds. This is a visual tempo adjustment, not phase locking
independent scene clips. `glass-prompt.json` records the built-in ImageGen prompt.
Validation: `verify-glass-tempo.cjs` passed in real Chrome against the local game.
Playback advanced at 0.67x, wrapped the loop without layout drift, retained glass
in MainMenuScene/StartMenuScene and reduced-motion/media-error fallbacks, and
released video textures on scene shutdown and explicit logo destruction.
No page errors. Captures: glass-main-menu.png and glass-save-menu.png.
Metrics: glass-tempo-verification.json. JavaScript syntax checks passed.
## Stone backing and release-label readability (2026-09-07)

Supersedes the glass material above. The user retained the compact card idea but
rejected glass as inconsistent with the other game visuals. The active backing
is now understar-logo-stone.png: matte charcoal stone with a slim aged-bronze
rim, generated from the existing main-menu button material reference. Blender
exports the authored clipped-corner silhouette with real alpha; source geometry
is recorded in values/understarLogoStoneExport.json. The generated source and
stone-prompt.json preserve provenance. No logo artwork or playback changes.

MainMenuScene removes its separate horizontal divider immediately beneath the
logo. The logo's own star ornament remains part of the approved artwork.
MainMenuScene and StartMenuScene share RELEASE_PRESENTATION.footer: 15px bold
warm-cream text with a dark outline and shadow, inset from the bottom-right edge.
The compact backing uses the existing logo bounds and follows its parent fade.

Validation: verify-stone-menu.cjs passed in real Chrome for both MainMenuScene and StartMenuScene, with no page errors on the fresh run. Captures are stone-main-menu.png and stone-save-menu.png; metrics are stone-menu-verification.json. The original logo bounds and 0.67 playback rate remain intact; both footer labels render at 15px with a 4px dark stroke. Syntax and exported RGBA alpha checks passed.

## Steady lettering and smooth light (2026-09-07)

The original sharp static logo now stays visible on the approved stone backing.
BrandLogoView adds only colored light from understar-logo-light-60.mp4, a 60 fps
H.264 derivative of the approved video. Its light motion is retimed offline;
runtime playback is 1x with additive blending at 0.55 opacity. This replaces the
16 fps effective VP9-alpha presentation while preserving the original logo art,
bounds and animation source. The matte no longer controls letter readability.

Build settings are in values/menuMotionRefinement.json. Run
ai-tools/2026-09-07-build-smooth-menu.py and its --verify pass. The original MP4,
alpha WebMs and static artwork remain available. No new generation request was
made. See markdown/2026-09-07-menu-motion-smoothing.md for runtime evidence.


Readable startup export (2026-09-08): understar-world-logo-readable.webp is the brighter Blender export of the approved letter faces. Loading views use it statically at a larger size so media downloads do not compete with required assets. Geometry, star ornament and matte bronze backing are preserved. See markdown/2026-09-08-startup-recovery-and-size.md.
