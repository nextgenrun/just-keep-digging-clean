# Worldroot Gate B art samples

Visual baseline accepted on 2026-08-30. The query gate remains available as the
rollback-safe style anchor for later country samples.

This review-only package contains two native-density countries fitted to the
approved Gate A collision whitebox: `rootways` and `cobalt`. A third tiny,
independently authored `root-cobalt-seat` piece closes their measured handoff
without translating, resizing, or repainting either accepted country. Amber,
Mirrorstone, Starfire, and Crown remain whitebox until the next approval gate.

The `1536 x 1024` guide canvases preserve the authored `94 px` tile density.
The build tool extracts a native crop without resizing, removes the generator's
connected neutral checker, and intersects that foreground with the exact Gate A
polygon-and-connector mask. No painted pixel can exist outside the approved
silhouette, and every one-way collision top is validated against visible art.
For a generator edge that lands a few pixels low, the builder may copy its
nearest existing edge pixel upward by at most `6 px`; it never rescales the
asset. Phaser places the crop at scale `1`.

Stars, fruits, sockets, Titans, Campfire, Celestial Talents, the player, text,
and UI are separate runtime layers and must never be baked into these images.

Rebuild guides or finalize a built-in ImageGen source with:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' ai-tools\2026-08-30-build-worldroot-gate-b-assets.mjs guides
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' ai-tools\2026-08-30-build-worldroot-gate-b-assets.mjs finalize rootways <source-png>
```

The review route requires both `?worldrootWhitebox=1` and
`&worldrootGateB=1`. The default Worldroot V3 remains unchanged.
