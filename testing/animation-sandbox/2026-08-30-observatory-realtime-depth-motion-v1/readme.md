# Observatory Segmented Atmosphere Runtime V2

Review-only Phaser/WebGL vertical slice using the existing Observatory `sky13`
background. Nothing here is imported by the production game or Town Square.

The V2 pack is compiled by
`ai-tools/2026-08-30-build-observatory-layered-atmosphere-pack.py`. A generated
clean sky is used only as hidden under-paint. Image-assisted extraction supplies
mask carriers; all visible cloud and architecture layers sample the original
checked-in source pixels. The pack contains five cloud strata, static unlit
architecture, a separate emissive layer, and a stable light-ID texture for 30
independently phased light groups.

The runtime no longer deforms the flattened source. Five transparent cloud
planes run separate traveling-wave flow fields over a clean under-plate.
Architecture never enters a motion pipeline. The light pass uses the ID texture
to animate individual window/lamp groups and adds them over the unlit diffuse
architecture. Every temporal term is periodic at the same 32-second boundary.

Controls expose the untouched source, runtime, split comparison, segmentation,
light IDs, pause, atmospheric motion, and light activity. There is no playback
clip or end-frame reset.

Run from the repository server and open:

`/testing/animation-sandbox/2026-08-30-observatory-realtime-depth-motion-v1/`

Town Square guard: `pack/manifest.json` records the unchanged production town
video path and SHA-256. This mockup does not load or write that video.

`pack/manifest-v2.json` records five source-derived cloud layers, separate
architecture/light assets, reconstruction error, light-group count, and source
hashes. Browser QA remains required before making any fidelity claim.
