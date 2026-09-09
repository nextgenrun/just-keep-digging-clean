# Tools

Development utilities and one-off export scripts used to prepare game data.

## Production snapshot

The one-release SSH overwrite uses `2026-09-07-deploy-compact.py plan`, then
`apply`, then `finish`. It is pinned to compact build `b81aff017f80` and the
verified NextGen `diggame-beta-1` directory. The plan hashes both trees; apply
streams changed files, removes inventoried obsolete game files, checks peak
usage against 5 GB and leaves maintenance enabled until finish verifies and
reopens the game. It creates no prior-release backup or upload archive.
Unknown root files, symlinks or changes since inventory stop the overwrite.
Private player storage and other sites are outside its target. Deployment
evidence contains manifests only, under `.tmp/compact-production-deploy/`.

For the compact SSH release use `python tools/2026-07-17-build-production.py
--out-dir dist-compact`. Upload only that output directory. The builder enforces
the 10,000,000,000-byte unpacked limit before copying and after compression,
including Gzip/Brotli sidecars. It never archives or copies a previous release.
`values/productionPackaging.json` excludes development media, review captures,
raw animation work, archives and credentials; reachable JavaScript modules and
referenced runtime assets remain included. GLB media is supported when referenced
by runtime modules; disconnected legacy renderers do not pull in old model packs.

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
the Star identity/core-light atlas packages, plus only the paired living and
consumed Worldroot V4 outputs, because runtime configuration constructs those
file paths from ids. Production copies those browser assets even though no
complete path literal appears in the module graph; chroma sources and review
guides remain excluded.
The page-shell Barlow Semi Condensed font files are copied with the same
snapshot so the production UI does not fall back to a substitute typeface.
Sound-library review sources referenced only as manifest provenance stay local;
production copies the approved runtime outputs instead.

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

## Worldroot runtime assets

`2026-09-04-build-campfire-worldroot-v2-runtime.mjs` converts the ten
immutable RGB Campfire sources into full-resolution RGBA runtime sprites. It
removes only connected neutral backdrop components, cleans the neutral fringe,
and records source/output hashes plus alpha bounds without resizing or
inventing hearth geometry.

`buildWorldrootV2RuntimeAssets.mjs worldroot-v3` converts the preserved living
and consumed ImageGen source paintings into aligned 1536 x 1024 RGBA runtime
assets. It removes only connected neutral-checker regions, reuses the living
alpha for the consumed state, verifies dimensions/alpha, and never invents
geometry or modifies either source master.

`buildWorldrootModularV4Assets.mjs` extracts the six authored chroma-backed
countries, preserves true alpha, bounds each native-pixel output, derives a
dimension-matched consumed sibling, applies each module's configured locked
alpha matte plus final despill, and writes a SHA-256 manifest. The module
registry and maximum widths come from `values/worldrootModularV4.js`; the
builder does not write gameplay, collision, progression, or save data.

`2026-08-31-build-starless-scar-v3-frontier.mjs` rebuilds the authored
Starless Scar frontier from its retained ImageGen checker source. It extracts
connected neutral background, decontaminates the alpha fringe, caps accidental
bright pixels, and writes the production 1254 x 1254 RGBA decal without
inventing geometry.

The `2026-09-07-*hints*` tools prepare the scoped public hints patch and its guarded SSH release. `2026-09-07-refresh-wiki.mjs [runtime-root]` generates shared hints using that runtime's supported controls and event flags; pass the verified public snapshot when preparing the public wiki.

## Startup release, 2026-09-08

`2026-09-08-deploy-startup.py` uses the same plan/apply/finish workflow for the
approved `dist-startup-20260908` build `9ed9ed4a7893`. Its remote helper retains
peak/final size guards at the user-approved 10 GB allowance and verifies free
space for growth plus one temporary file and a 1 GB reserve. No hosting account
quota is changed. Evidence is in `.tmp/startup-production-deploy-20260908/`.
The earlier dated compact helper remains pinned to its historical release.

The production graph also collects local imports from inline entry-page modules
and versions their specifiers, so browser-owned controls cannot be omitted
just because they are not imported by main.js. The HTTP canary verifies that
entry dependency and the deferred LaunchScene-to-RuntimeScenes boundary.

`2026-09-08-deploy-startup-motion.py` and its matching remote helper use the
same guarded release workflow, pinned to the tested initial-boot/motion build
`35b25aa356da`. The verified plan and release result are stored in
`.tmp/startup-motion-production-deploy-20260908/`.

## Approved menu delta — 9 September 2026

`2026-09-09-prepare-menu-release.py` reconstructs the saved approved menu patch on a fresh SSH live snapshot. It preserves other live code, refreshes module cache keys, includes eight approved media assets, and verifies the prior deployed package used for the local overlay preview. `2026-09-09-check-menu-release.cjs` checks every module with V8 module parsing.

`2026-09-09-deploy-menu-release.py stage|apply|verify|rollback` uses the saved `cline-local` SSH connection and the target fixed in `2026-09-09-menu-release-remote.py`. Stage verifies incoming hashes privately. Apply uses the existing deployment lock, checks the whole live baseline, preserves changed-file transaction copies, briefly enables maintenance, verifies all resulting hashes, and restores the exact original server configuration. No game files are deleted; no backend/PHP changes are included. Evidence is under `.tmp/menu-motion-live-20260909/`.
