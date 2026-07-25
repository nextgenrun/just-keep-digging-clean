# Runtime Sprite Frame Audit

Browser-based review desk for the live legacy-miner player assets. It renders the same source sheets that `BootScene.preloadPlayerSprites()` loads, slices them at Phaser's 341 x 341 frame size, and keeps review feedback local until it is exported.

The desk also includes two review-only, not-yet-runtime-wired sets: Quickslash V2 (39 curated frames) and Teleport In (38 curated frames). Both are normalized through `tools/build_legacy_miner_v8_runtime.py`, validated as editable `.piskel` sources, and paired with Blender motion-envelope profiles before appearing here.

## Open

Run the project server from the repository root, then open:

```text
http://127.0.0.1:8080/testing/animation-sandbox/frame-audit/index.html
```

## Review loop

1. Choose an animation and direction view. The available direction views show the source frame and the flip currently requested by the runtime.
2. Use the Sampling control to compare the fixed `LINEAR` gameplay downsample with the old blocky `NEAREST` result. The inspector shows the native 341 x 341 source, the actual 89 x 89 game footprint, and a pixel-exact audit loupe.
3. Play or step through every frame on a checker, white, or black matte. Select individual frames to inspect their alpha bounds and neutral/semi-transparent pixel counts.
4. Record direction, transition, anchor, clipping, halo, leakage, or silhouette feedback against the exact frame. The pre-seeded callouts identify applied feedback and remaining transition checks.
5. Export the JSON feedback packet. It preserves the live source file, frame index, direction view, relevant runtime code location, and Piskel review source when one exists.
6. Use the exported packet as the handoff for a targeted Piskel edit or Blender motion-envelope pass. Re-run the Piskel validator before wiring Quickslash V2 or Teleport In into the game.

For Quickslash V2 and Teleport In, the non-contiguous source numbering is deliberate: removed frames stay removed. Their transition strips expose the curated phase cuts for timing review without treating the missing numbers as pipeline failures.

This review desk is intentionally non-destructive. It never writes sprites, Piskel files, or runtime configuration.
