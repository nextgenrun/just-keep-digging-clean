# Inventory Fullness v3

Ten 256x256 RGBA states for the always-visible inventory HUD control.

- V3 replaces the closed V2 base with one ImageGen-authored open-bag master and a dark interior cavity.
- States 2–10 place progressively denser ore inside that cavity, reduce its brightness for the interior light, and add contact shadow.
- A curved front-rim mask restores the leather wall and clasp over every pile, so cargo is occluded by the bag instead of pasted onto its face.
- `manifest-v3.json` pins runtime/source hashes, the locked-bag invariant, the only region allowed to change, cavity bounds, and the front occlusion curve.
- `inventory-fullness-v3-review.png` is the numbered contact sheet and is not loaded at runtime.
- V2 remains the direct runtime-art rollback; V3 changes presentation only and does not add an inventory capacity.
