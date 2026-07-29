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
Dynamic runtime directories include the opaque ImageGen resource-tile pack
because BootScene constructs those ten file paths from resource ids; production
must copy the directory even though no complete path literal appears in the
module graph.

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
