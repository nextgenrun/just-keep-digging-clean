# Runtime

Generated Phaser-ready PNG assets for Arc Core production v3.

Do not edit these files directly. Rebuild them from `../piskel/` with:

```text
python pipelines/piskel/2026-07-26-build-arc-core-piskel-package.py
```

The runtime files and hashes are registered in
`values/arcCoreVisuals.sprite.json`. Ten roles are loaded in gameplay; the
foundry background is loaded only by the animation sandbox. The same manifest
stores the centered Small/Omega circle-hull geometry used by sandbox and game.
The active V4 impact roles are a compact cyan twin-bore fracture for Small and
a broad violet compression-lattice rupture for Omega; neither reuses a machine
body as impact art.

No generated Arc stage tile or ornamental frame is active here.
