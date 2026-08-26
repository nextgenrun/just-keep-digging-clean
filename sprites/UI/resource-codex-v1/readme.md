# Resource Codex V1

- `resource-codex-foundation-v1.png` is the authored 1738 x 905 I-key Resource
  Codex foundation.
- `resource-dossier-atlas-v1.png` is a 4 x 4 ImageGen portrait atlas. Frames
  0-13 follow `INVENTORY_RESOURCE_GUIDE.resourceKeys`; frames 14-15 are empty.

These portraits are purpose-built specimen scenes. They replace inventory/world
guide previews that pasted semantic resource overlays onto legacy world tiles.
The world renderer still owns gameplay terrain; this package is presentation
art only.

`values/inventoryCodex.js` owns the source dimensions, crop inset, frame order,
and measured socket anchors. Runtime artwork, text, selection borders, and hit
zones must all use the same source-to-display transform to prevent alignment
drift at different viewports.
