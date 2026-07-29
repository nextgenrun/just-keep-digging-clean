# Pickaxe HUD Theme Review v1

Status: review-only. Nothing in this folder is preloaded or referenced by the
runtime.

`2026-07-28-pickaxe-hud-gp-theme-mockup-v1.png` is a 1672x941 ImageGen review
board for making the purchased pickaxe permanently visible in the existing
top-left HUD without increasing its 320x71 runtime footprint.

SHA-256:
`c3fa95344d94212aad8981f10de1b25f42d1f7b70fb25ac05772224fe1629550`

## Proposed visual contract

- Replace the baked generic tool inside the left medallion with the exact
  currently owned pickaxe icon.
- Keep depth as the first read and add one compact `<TIER NAME> <ROMAN>` cue.
- Use seven tiny rivet/pip lights so the progression tier is readable without
  another bar or badge.
- Keep Gem Power purple at every tier. Only the rim light, engraving, end cap,
  and restrained motif inherit the equipped pickaxe material.
- Preserve the existing orange and red low-GP urgency states; warning color
  always overrides the decorative tier accent.
- Keep the existing torch and key presentation on the right.
- Before the first pickaxe purchase, retain the current generic HUD.

Suggested tier accents:

| Pickaxe | Accent |
|---|---|
| Bronze | hammered copper and warm amber |
| Iron | gunmetal and muted silver |
| Steel | polished silver and cool slate |
| Mithril | moon-silver and cyan |
| Adamant | black-green and emerald |
| Rune | indigo and violet |
| Dragon | blackened gold and ember orange |

## Later runtime path, only after approval

The existing authoritative state is `UpgradeSystem.ownedPickaxe`. The intended
integration points are `ApprovedHudSkin` for the medallion/theme presentation,
`HUDSystem` for state synchronization, `ShopOverlay.purchaseUpgrade()` for an
immediate successful-purchase refresh, and `PlaySceneUI.drawStatusBars()` for
the theme-aware GP edge treatment. The underlying GP amount, thresholds, save
schema, and pickaxe gameplay remain unchanged.

The complete built-in ImageGen prompt is stored in
`2026-07-28-pickaxe-hud-gp-theme-prompt-v1.md`.
