# Underground Biome Background Production V2

Fifty background-only 1536x1024 source plates generated from the approved
underground gameplay-mockup direction.

- `reviewOnly: false`
- `productionChanged: true`
- Generated with the built-in ImageGen workflow on 2026-07-26.
- Mockups 51-100 add five new visual compositions for each of the ten live
  underground material bands.
- Runtime derivatives are written to
  `sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/`.
- Final prompt set:
  `2026-07-26-imagegen-prompt-manifest.md`.

These are scenic background sources only. They intentionally contain no player,
HUD, torch vignette, tile-shaped ground, foreground ledge, or collision
silhouette. Buildings, bridges, roots, rails, machinery, and ruins are painted
as distant scenery and are rendered behind the authoritative
`WorldVisualMaterialField` terrain facade.

The runtime package is rebuilt with:

```powershell
python ai-tools/2026-07-26-build-underground-biome-backgrounds-v2.py
```

