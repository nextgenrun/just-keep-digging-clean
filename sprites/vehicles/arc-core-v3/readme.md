# Arc Core Production v3

Approved Small and Omega Arc Core bodies plus authored energy, cloud, beam,
and impact artwork. Gameplay and `tanktest-v1` consume the same package.

## Pipeline

1. ImageGen originals live in `source/`.
2. Transparent, normalized art is packed into editable `.piskel` documents.
3. `pipelines/piskel/2026-07-26-build-arc-core-piskel-package.py` reads those
   documents back, verifies the fixed anchors, and creates `runtime/`.
4. `values/arcCoreVisuals.sprite.json` is updated with runtime hashes and loads
   the package in Phaser.

The active V4 repair keeps all approved bodies, rings, clouds, and beams, but
replaces the two device-like impact frames with centered Small/Omega fracture
art. V3 remains intact as the source rollback.

The master machine bodies never change between animation phases. Motion comes
from independent authored raster layers positioned against the same anchor.
The pack contains ten production roles. The single foundry background remains
a sandbox/review-stage role and is not loaded by the main game.

The ornamental HUD and generated four-tile atlas were explicitly rejected and
are recoverable only from
`archive/2026-07-26-rejected-arc-review-random-art/`. They are absent from this
package and the active `.sprite` manifest. The accepted prompts and rejection
record are kept in
`2026-07-26-imagegen-prompt-manifest.md`.

Use `?arcCoreVisualsV3=0` for the intact legacy-art rollback.
