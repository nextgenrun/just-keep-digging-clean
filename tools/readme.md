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
Production also strips the `jkd_e2e`, `ui-review`, and `cave-review` query
switches before game modules load, while preserving gameplay/visual rollbacks.
Every snapshot receives a deterministic, content-derived build ID in both its
manifest and `index.html`. The hash covers reachable modules, collected runtime
media, the page shell, Phaser, CSS, and the builder itself, allowing the runtime
panel, CI artifact, and rollback candidate to identify the exact same build.

## Guarded Heavenblocks commit

`2026-07-29-heavenblocks-commit-health-gate.py` runs the native-world contract,
the complete gameplay regression suite, the production builder contract, and
an isolated packaged HTTP canary. `2026-07-29-guarded-git-commit.py` accepts an
already-staged, otherwise clean worktree, runs that gate before and after the
commit, and automatically creates a normal Git revert commit if the post-check
fails. It never resets, force-pushes, or discards an uncommitted file.

```powershell
python tools/2026-07-29-guarded-git-commit.py --message "Heavenblocks native rebuild"
```

## Character V8 review pipeline

Use the targeted builder to normalize selected frame folders without rebuilding unrelated character animations:

```powershell
python tools/build_legacy_miner_v8_runtime.py --ids quickslash-v2,teleport-in
python tools/piskel-mcp/character_piskel_pipeline.py validate --ids quickslash-v2,teleport-in
python tools/piskel-mcp/character_piskel_pipeline.py audit --ids quickslash-v2,teleport-in
python tools/piskel-mcp/character_piskel_pipeline.py preview --ids quickslash-v2,teleport-in
```

The imported video captures use a stable center-square crop and checker-matte/neutral-fringe cleanup. Their loose PNG selection is authoritative; numbering gaps are preserved as intentional curated cuts.

Generate Blender motion-envelope references with:

```powershell
blender --background --python tools/export_legacy_miner_blender_motion_reference.py -- --profile <motion-profile.json> --out-dir <review-output-directory>
```
