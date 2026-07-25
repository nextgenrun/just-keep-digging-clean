# V11 Polished Runtime Backgrounds

The approved v11 surface and underground art is wired through `WorldBackgroundMasterSystem` as a camera-streamed runtime package.

## Runtime coverage

- Surface: 90 polished neutral-sky v11 objects.
- Level 1: 126 overlapping chunks from raw x41..152 and depth 0..2,000m.
- Level 2: 189 overlapping chunks from raw x153..319 and depth 0..2,000m.
- Current runtime visibility ends near 1,935m because the 2,000 world rows include 65 sky rows. Art through 2,000m is prepared and clipped safely by the existing runtime crop.
- Level 2 future 2,000..5,000m concepts and detail masters are packaged but inactive until world depth is extended.

## Quality and streaming

- Depth chunks use 47 source pixels per gameplay tile and display at the 94px tile grid.
- Logical chunks are 64×32 tiles, with one-tile complementary alpha overlaps on internal edges.
- Maximum generated depth texture size is 3,102×1,598, below the 4,096 texture-side validation limit.
- Six active geological material families prevent one texture from repeating across the full depth.
- Camera-distance unloading prevents the 518.66 MiB disk package from being decoded simultaneously.

## Rollback

- `?worldMaster=0` disables the complete polished package.
- `?worldDepthMaster=0` keeps the 90 surface objects but disables all 315 underground objects.
- Original v3 assets and the saved v11 TMX remain unchanged.

## Rebuild and validation

- `ai-tools/2026-07-12-build-v11-polished-surface-v4.py`
- `ai-tools/2026-07-12-build-v11-depth-backgrounds-v4.py`
- `ai-tools/2026-07-12-validate-v11-runtime-backgrounds-v4.py`
- `testing/2026-07-12-v11-polished-background-runtime-smoke.mjs`

Validated in Phaser on a fresh local origin at the surface, Level 1 cave depths near 118m and 379m, and Level 2 near 703m. The independent depth rollback reported 90 active surface objects and depth disabled.
