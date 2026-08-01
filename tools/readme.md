# Tools

Development utilities and one-off export scripts used to prepare game data.

## Production snapshot

The development server remains unchanged. Build and preview the isolated,
debug-disabled production snapshot with:

```powershell
python tools/2026-07-17-build-production.py
python tools/2026-07-17-serve-production.py 8081
```

The builder copies the reachable ES-module graph and referenced runtime assets
into ignored `dist/`, then creates deterministic Gzip and optional Brotli
sidecars. The production server serves only that snapshot with correct media
MIME types, byte ranges, validators, cache policy, and security headers. It is
read-only and intentionally does not expose the development screen-recording
endpoint or a PHP save backend; browser/local-storage saves continue to work.
The snapshot preserves the current raw ES modules because this checkout has no
project bundler dependency; network transfer is still precompressed. Bundling
and minification can be added later without changing this deployment contract.
Production also strips the `jkd_e2e`, `ui-review`, `cave-review`, `wurm`, and
`wurm10x` query switches before game modules load. The Wurm switches are
development controls rather than player-facing rollbacks; other gameplay and
visual rollback parameters remain available.
Every snapshot receives a deterministic, content-derived build ID in both its
manifest and `index.html`. The hash covers reachable modules, collected runtime
media, the page shell, Phaser, CSS, and the builder itself, allowing the runtime
panel, CI artifact, and rollback candidate to identify the exact same build.
Dynamic runtime directories include the opaque ImageGen resource-tile pack and
the Star identity/core-light atlas packages because runtime configuration
constructs those file paths from resource or rarity ids; production must copy
those directories even though no complete path literal appears in the module
graph.

## Star identity assets

`2026-07-30-build-star-identity-assets.py` slices six built-in ImageGen contact
sheets into 50 straight-alpha 320 px frames, writes one atlas per rarity,
normalizes the authored Star Atlas UI foundation to 1536x800, and records
source/output SHA-256 hashes, dimensions, and alpha coverage in
`sprites/environment/star-identities-v1/star-identities-v1.manifest.json`.
It never generates substitute star art.

`2026-07-30-build-star-identity-assets-v2.py` preserves those fifty frames and
adds fourteen built-in ImageGen expansion sheets for 250 total lights. It
writes six 256 px, ten-column atlases plus a V2 manifest with source/frame
offsets, hashes, dimensions, alpha coverage, and decoded memory. The package
decodes to 62.5 MiB under its 64 MiB cap. V1 inputs and outputs remain
untouched for rollback.

## Graveborer Wurm sprite package

`build_graveborer_wurm_sprite_package.py` validates the five transparent
ImageGen masters in `sprites/environment/graveborer-wurm-v1/`, applies bounded
high-quality downsampling, writes lossless alpha WebPs, and reports dimensions,
byte sizes, and SHA-256 hashes. It never generates substitute artwork.

## Hardcore memorial assets

`2026-07-28-build-hardcore-memorial-assets.py` validates the transparent
ImageGen grave and death-action masters, crops only transparent padding, applies
bounded Lanczos downsampling, writes lossless alpha WebPs, and reports hashes.
It never creates fallback art.

## Character V8 review pipeline

Use the targeted builder to normalize selected frame folders without rebuilding unrelated character animations:

```powershell
python tools/build_legacy_miner_v8_runtime.py --ids quickslash-v2,teleport-in
python tools/piskel-mcp/character_piskel_pipeline.py validate --ids quickslash-v2,teleport-in
python tools/piskel-mcp/character_piskel_pipeline.py audit --ids quickslash-v2,teleport-in
python tools/piskel-mcp/character_piskel_pipeline.py preview --ids quickslash-v2,teleport-in
```

The imported video captures use a stable center-square crop and checker-matte/neutral-fringe cleanup. Their loose PNG selection is authoritative; numbering gaps are preserved as intentional curated cuts.

The shared Piskel bridge is split into focused document, analysis, artifact,
pack, and command modules. Run `polish` for manifest-enabled animation sources:

```powershell
python tools/piskel-mcp/character_piskel_pipeline.py polish --ids survival-blender-v2-dig-up
```

The manifest chooses a pose-resistant body anchor and baseline. One uniform
scale is allowed for the whole animation; individual frames are never resized.
This keeps deliberate limb extension while removing body/root and ground-line
drift.

The approved Arc v3 uses the stricter fixed-canvas Piskel pipeline under
`pipelines/piskel/`.
`pipelines/piskel/2026-07-26-build-arc-core-piskel-package.py` validates two
editable projects, exports ten production roles plus one sandbox background,
and refreshes their SHA-256 entries in `values/arcCoreVisuals.sprite.json`.
The obsolete tile-based mockup compositor is archived with the rejected tile
art.

Generate Blender motion-envelope references with:

```powershell
blender --background --python tools/export_legacy_miner_blender_motion_reference.py -- --profile <motion-profile.json> --out-dir <review-output-directory>
```

## Star discovery assets

`build_star_discovery_assets.py` splits the two selected 2x3 ImageGen alpha
masters into six rarity plates and six matching XP fills, normalizes each
family without stretching, enforces transparent corners/alpha coverage, and
writes a hash manifest. It never generates substitute artwork.
