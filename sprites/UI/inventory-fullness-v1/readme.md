# Inventory Fullness v1

Ten 256x256 RGBA bag states for the always-visible inventory HUD control.

- State 1 is empty; state 10 is visually packed with ore.
- Runtime selection uses real carried resource units against a presentation-only 100-unit saturation target.
- The saturation target does not impose a storage limit or alter selling, drops, saves, or resource totals.
- The set was authored with built-in ImageGen precise-object edits against `sprites/UI/loot-pickups/inventory-bag-approved-full.png`, then normalized to transparent runtime PNGs and downsampled with Lanczos.
- `manifest-v1.json` records dimensions, decoded memory, alpha checks, and SHA-256 hashes.
- `inventory-fullness-v1-review.png` is the numbered contact sheet for visual review and is not loaded at runtime.
