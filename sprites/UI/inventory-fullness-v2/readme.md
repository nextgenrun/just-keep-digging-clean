# Inventory Fullness v2

Ten 256x256 RGBA states for the always-visible inventory HUD control.

- State 1 is the locked empty-bag master; states 2–10 composite progressively denser ImageGen-authored ore overlays onto those exact bag pixels.
- Leather, handle, stitching, side pockets, and clasp therefore keep one silhouette and palette across the full set.
- The clasp is restored above dense ore piles so the control remains recognizable at HUD scale.
- `manifest-v2.json` pins dimensions, decoded memory, alpha checks, runtime hashes, source hashes, and the byte-identical upper-bag invariant.
- `inventory-fullness-v2-review.png` is the numbered contact sheet and is not loaded at runtime.
- V1 remains available as the direct rollback; V2 changes presentation only and does not add an inventory capacity.
