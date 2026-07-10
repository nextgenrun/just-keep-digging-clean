# Runtime Sprite Frame Audit

Browser-based review desk for the live legacy-miner player assets. It renders the same source sheets that `BootScene.preloadPlayerSprites()` loads, slices them at Phaser's 341 x 341 frame size, and keeps review feedback local until it is exported.

## Open

Run the project server from the repository root, then open:

```text
http://127.0.0.1:8080/testing/animation-sandbox/frame-audit/index.html
```

## Review loop

1. Choose an animation and direction view. The available direction views show the source frame and the flip currently requested by the runtime.
2. Play or step through every frame on a checker, white, or black matte. Select individual frames to inspect their alpha bounds and neutral/semi-transparent pixel counts.
3. Record direction, transition, anchor, clipping, halo, leakage, or silhouette feedback against the exact frame. The pre-seeded callouts identify the three reported problem paths without changing game code.
4. Export the JSON feedback packet. It preserves the live source file, frame index, direction view, relevant runtime code location, and Piskel review source when one exists.
5. Use the exported packet as the handoff for a targeted Piskel edit, Blender reanimation, or AI-assisted transparent-background cleanup. Re-run the existing Piskel audit before wiring a replacement sheet into the game.

This review desk is intentionally non-destructive. It never writes sprites, Piskel files, or runtime configuration.
