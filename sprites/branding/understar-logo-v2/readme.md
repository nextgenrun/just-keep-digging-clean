# UNDERSTAR logo HD V2

2026-09-07. Rift Monolith remaster using built-in ImageGen and Blender.

The 4096 x 1216 transparent PNG is a Blender render, using a lower-resolution
ImageGen texture plus shallow contour geometry, fine surface relief, and studio
lighting. The packed scene is an editable 2.5D relief, not separately sculpted
letters. The original V1 asset is preserved.

`generation.json` records both built-in ImageGen prompts and source paths.
`values/understarLogoHdExport.json` owns export settings. Rebuild with Blender:
`blender --background --python sprites/branding/understar-logo-v2/build-relief.py`.

The source-remaster image contains an unwanted checkerboard; source-chroma is
the corrected extraction source. Only final transparent exports are usable logos.
See `verification.json` for dimensions, hashes and runtime verification.

The local game's shared `brand-logo` key now selects
`understar-rift-monolith-runtime.webp` through `values/branding.js`, covering
the boot splash, loading screen, main menu and save menu. Nothing is deployed.

Open `review.html` through the local server for equal-size before/after views,
light/dark/transparency backgrounds, and downloadable PNG/WebP/Blender files.
In Blender, use Material Preview to see the packed artwork and F12 to render.

Verified: transparent outer edges, zero detected magenta spill, preserved V1 hash, proportional dark/light/mobile comparisons, and both production menu scenes at 3840 x 2160 backing with the 2048 x 608 texture. The browser run reported no page errors. See browser-verification.json and runtime-main-menu.png / runtime-save-menu.png. The runtime WebP is 438,024 bytes; the master is a Blender render, not a native 4K ImageGen texture.
