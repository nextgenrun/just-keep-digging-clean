# Implemented gameplay presentation — 2026-09-05

The approved visuals are wired into the active local game. Tile health is in the top HUD beside GP, with material above and current/max HP on the GP row. It reads the existing mining target and world health, including the held target. Destroyed or unbreakable tiles and open overlays suppress the plate.

Merchant prompts reuse the approved buff-chip artwork and font. The title and the bound interaction key/action occupy separate centered lines. Only the nearest merchant appears, matching the existing interaction tie order and competing world interactions. Projection and clamping keep a 12-logical-pixel viewport margin. Scale uses the logical viewport so the native-resolution render pass cannot enlarge the plate. Existing tutorial world anchors remain valid.

The compact objective preserves its existing priority and cargo/progression data. Wiki, Map and Menu use the existing click zones in the top row. Locked abilities are hidden, Campfire remains usable, and saved slot numbers/order remain stable. Buffs and the Hardcore status have separate vertical lanes. Mining damage uses its existing provider in the player core; duplicate actionbar GP is hidden.

Decorative roots, overlays, structures and biome expansion art use the approved 0.58 alpha multiplier in their owning renderers, applied from the authored alpha on creation and refresh. Terrain/resource art and gameplay lighting keep their existing values.

## Verification

- Real game on the active checkout's canonical serve.py, isolated Chrome/WebGL, save writes blocked.
- Real mouse mining: stone HP 88/88 became 80/88 in both the world and the top HUD.
- A one-HP stone fixture was then destroyed through real input; the target plate hid. Retargeting copper displayed COPPER and HP 142/142.
- E opened Bobo's actual shop and hid prompts. Clicks on the relocated Map and Menu controls opened their actual interfaces. The map suppressed target HP.
- 800×450, 1280×720 and 1920×1080 browser viewports retained contained target text and utility buttons using the game's logical 1280×720 HUD.
- All five surface merchant names and actions fit within their 208×48 logical plates after viewport changes. Left, right, top and bottom edges respected the 12-pixel margin. Zoom 0.8 and 1.35 retained width and containment.
- Five focused contracts passed: new target/merchant presentation, HUD click zones, actionbar activation/drag/order/resize/teardown, mining target/mouse digging, NPC shop interaction.
- Syntax checked all 20 scoped production files; runtime checks recorded no page errors.

Evidence: wired-live-checks.json, wired-bounds-checks.json, wired-contract-results.json, wired-mining-live.png, wired-mining-1080.png, wired-surface-1080.png, and the five wired-merchant PNGs.

The browser work was a focused visual/input check using staged mining cells and controlled camera positions, not an extended playthrough or a full repository test run. The scoped implementation diff is in wired-implementation.patch.
