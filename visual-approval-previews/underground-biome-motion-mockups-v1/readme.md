# Underground Biome Motion Mockups V1

Status:

- `reviewOnly: true`
- `productionChanged: false`
- The approved 50-card underground background runtime remains unchanged.

This folder contains one motion-ready key-art direction for each live underground
biome band plus an interactive Canvas review gallery. The gallery demonstrates
loop timing, parallax, light breathing, atmospheric particles, and hard-darkness
compatibility without importing anything into the Phaser runtime.

Open `index.html` through the repository's local web server to run the animated
gallery. `2026-07-26-imagegen-prompt-manifest.md` records the complete art
direction and the production references used for all ten plates.

The playable terrain shown by the review gallery is only an illustrative
occlusion mask. In production, `WorldModel` remains authoritative for ground and
collision. Buildings, bridges, roots, machinery, and other scenic silhouettes in
these mockups are always background elements.

## Review controls

- Select any biome card to switch the active visual direction.
- Toggle motion to compare the animated and still treatments.
- Adjust motion strength to test a restrained or dramatic loop.
- Toggle darkness preview to check torch/readability compatibility.

Nothing in this directory is a production dependency. Promotion into runtime
requires explicit visual approval and a separate Phaser integration pass.
