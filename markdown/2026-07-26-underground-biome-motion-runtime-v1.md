# Underground biome motion runtime V1

Date: 2026-07-26  
Status: rejected and superseded by baked moving-image V2

V1 tried to translate ten strong paintings into pooled Phaser Graphics lines,
circles and particles. The result did not match the visual quality of the
source images and is no longer production code.

Removed production pieces:

- `values/worldVisualDepthMotion.js`
- `WorldVisualDepthSignatureLayer`
- `WorldVisualDepthSignatureEffects`
- the procedural ambient Graphics layer
- the Canvas overlay review renderer and its screenshots

The ten original 1536 × 1024 source paintings remain in
`visual-approval-previews/underground-biome-motion-mockups-v1/` as Keyframe A.
Their earlier static WebP conversions may remain as inactive source
derivatives, but no configured asset uses them for motion.

The replacement is documented in
`2026-07-26-underground-biome-baked-motion-runtime-v2.md`. It edits each
painting into a composition-locked Keyframe B, interpolates the painted pixels,
bakes the subtle whole-image float into a finished VP9 loop, and lets Phaser
play that moving image behind authoritative ground.
