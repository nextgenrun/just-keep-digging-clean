# Worldroot Gate C art sample

This review-only package adds exactly two native-density countries to the
accepted Gate A/B baseline: `amber` and `mirror`. Gate B Rootways and Cobalt
remain unchanged. Starfire and Crown remain whitebox.

The alignment pass keeps the accepted Amber country intact and layers one
native `amber-temple-cap` over its upper shelf. That cap gives the complete
walkable threshold its own correctly aligned source instead of stretching the
combined country painting. Mirrorstone's main road is translated down by 110
native pixels so its authored top, rather than a cut through its interior,
meets the Gate A contact. No source is rescaled.

Amber and Mirrorstone each exceed a single `1536 x 1024` carrier when their
long incoming inter-country tendons are included. Gate C therefore paints each
complete country body, its internal fork/drop, and both walkable levels at the
authored `94 px` tile density. The incoming `cobalt-to-amber` and
`amber-to-mirror` tendons intentionally remain Gate A whitebox. They will be
authored as separate native pieces only after the country styles are accepted.
Nothing is squeezed or stretched to fit.

Mirrorstone is deliberately emitted as two sprites: its main road and its
reflection shelf/drop. The generator repeatedly displaced the lower level when
both were baked into one canvas. They remain one country and meet on the exact
Gate A connector.

The shared builder removes only edge-connected neutral checker, clips every
painted pixel to the exact Gate A silhouette, and creates a native crop without
resizing. For Gate C it may copy the nearest existing edge pixel upward by at
most `12 px` to close a generator-only contact gap. Phaser displays every crop
at scale `1`.

The Amber Temple and Mirrorstone memorial/observatory are embedded biome
architecture. Stars, fruits, sockets, Titans, Campfire, Celestial Talents, the
player, vendors, text, and UI remain separate runtime layers.

Build commands:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' ai-tools\2026-08-30-build-worldroot-gate-c-assets.mjs guides
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' ai-tools\2026-08-30-build-worldroot-gate-c-assets.mjs finalize amber <source-png>
```

Review requires
`?worldrootWhitebox=1&worldrootGateB=1&worldrootGateC=1`. Gate C cannot load
without Gate B, and the default Worldroot V3 remains unchanged.
