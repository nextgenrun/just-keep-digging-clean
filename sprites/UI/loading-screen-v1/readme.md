# Loading Screen V1

Production ImageGen artwork for the shared Boot and World Load presentation.

- `loading-screen-foundation-v1.webp` is the opaque 16:9 mine-console shell.
- `loading-progress-amber-v1.webp` is the primary overall-progress energy lane.
- `loading-progress-cyan-v1.webp` is the secondary current-phase energy lane.
- `loading-retry-plate-v1.webp` is the empty authored retry control plate.

Phaser may crop, position, scale, fade, and label these bitmaps. It must not
replace them with visible HTML/CSS, `Graphics`, primitive rectangles, or
generated placeholder textures in the default loader. The foundation keeps the
logo, two progress bays, mining chamber, and seven-tool rail physically
separate so runtime sprites cannot overlap.

The masters were generated with the built-in ImageGen workflow on 2026-07-31.
The three alpha assets used flat `#00ff00` chroma sources followed by the
installed soft-matte/despill removal helper. Original generated masters remain
in the Codex generated-image store; only optimized production outputs live
here.
