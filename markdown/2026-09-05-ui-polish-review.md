# UI polish review — 5 September 2026

A restrained pass through the shared controls and the main player-facing screens, using the existing fonts, colors, borders, and artwork.

## Changes

- Buttons keep icons, labels, and keyboard hints within their visible bounds. Optional icons yield space to long labels. Modal headers fit beside the close control, and the close target is a consistent 44 pixels.
- Main-menu Settings uses its panel space more evenly. Hovering a main-menu option now also selects it for Enter.
- Special Blocks icons are inset inside their rows, with a consistent gap before the label. Keyboard selection now works when Star Codex is still locked.
- Bobo's wallet aligns with the title row. The Casual-run Hardcore offer uses the existing New Expedition gem icon when its dedicated crest is not loaded.
- Tab / Shift+Tab moves through shared controls. Ctrl+Tab / Ctrl+Shift+Tab changes pause sections. Save slots also accept arrows, A/D, and Tab. Settings keybind Reset buttons participate in focus order.
- Slider keyboard focus survives mouse exit, dragging ends cleanly, and closing a panel releases its pointer listeners. Disabled or closing controls reject delayed actions. Modal input stays with the active panel, and short Escape taps survive a slow game frame.

## Verification

Eight focused contracts passed: this pass's new behavior contract, UI alignment, pause/settings layout, mouse priority, Escape routing, the 19-case player traversal regression, Star Codex discovery, and Inventory Resource Codex. All 13 modified JavaScript files passed syntax checks, and the scoped whitespace check passed.

Fresh isolated Edge runs against this checkout's canonical serve.py passed 22 explicit runtime checks across three runs, with no uncaught page errors. The runs exercised menu hover/keyboard agreement, all Settings categories, save navigation and dialog isolation, pause-section cycling, inventory navigation, map opening, shop opening/reopening, and a compact viewport. Test contexts used the save-disabled jkd_e2e fixture.

The final visual run waited for panels to finish fading, then verified all seven Special Blocks icon/label insets and the shop's resident textures. Screenshots were inspected at their rendered size.

The older shop-uptime contract still fails its sound count assertion: its stub expects playUiSelect, while the existing Shop.show implementation calls playMenuOpen. The live shop lifecycle checks passed. This is focused validation; rare endgame and Hardcore-only screens were not each traversed manually, and the full repository test suite was not run.

## Screenshots and evidence

- [Special Blocks](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/final-special-blocks.png)
- [Bobo's counter](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/final-bobo-shop.png)
- [Settings at 960 × 600](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/final-compact-settings.png)
- [Menu runtime results](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/menu-runtime-result.json)
- [Gameplay runtime results](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/gameplay-runtime-result.json)
- [Final visual/runtime results](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/visual-runtime-result.json)
- [Patch against the pre-pass file snapshots](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/review.patch)
- [New behavior contract](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-ui-polish-contract.mjs)

![Special Blocks with inset icons and keyboard selection](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/final-special-blocks.png)

![Bobo's counter with aligned wallet and resident offer artwork](C:/Users/Mila/.codex/visualizations/2026/09/05/01a072c2-0065-76a0-abad-ad08f602b93b/ui-polish/final-bobo-shop.png)

