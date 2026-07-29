# Pickaxe HUD v1

Seven production transparent overlays for the approved 417x93 player HUD core.
Each overlay combines the exact owned-pickaxe icon with its material-colored
inner medallion, tier rivets, restrained GP engraving, and bar end cap.

Runtime continues to own all changing information:

- `UpgradeSystem.ownedPickaxe` selects the overlay and persists through saves.
- Phaser text supplies depth, the compact pickaxe tier label, and the GP value.
- The existing GP fill remains purple at normal charge and retains its
  authoritative orange/red low-charge warning colors.
- The existing player-core texture continues to switch between torch ON and OFF
  below the pickaxe overlay.
- A save without an owned pickaxe keeps the original generic player core.

`?pickaxeHud=0` hides the themed overlay and restores the generic approved HUD
without changing purchases or save data.

Rebuild all seven overlays, their SHA-256 manifest, and the exact 320x71
readability sheet with:

```powershell
python ai-tools/2026-07-28-build-pickaxe-hud-overlays-v1.py
```

`pickaxe-hud-runtime-contact-sheet-v1.png` is visual QA only. Production
preloads only the seven `*-pickaxe-hud-overlay-v1.png` files.
