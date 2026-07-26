# 200 High-Impact, Low-Effort Gameplay Improvements

**Date:** 2026-07-26  
**Status:** Review list only. Nothing in this document is wired yet.

## Goal

Find another 200 practical improvements that make the existing persistent digging game more satisfying, readable, responsive, and difficult to put down without adding a second game on top of it.

Every candidate names the current runtime path it should use. The intent is to reuse existing events, counters, UI, effects, saves, and authored world content rather than introduce broad new architecture.

## Guardrails

- Do not change combo duration, combo decay, or combo timing.
- Do not add daily streaks, login punishment, energy timers, offline-income pressure, loot boxes, battle passes, or another permanent currency.
- Do not turn the game into a roguelite, co-op game, town builder, contract board, or separate expedition mode.
- Do not repeat the 33 systems implemented in the previous retention pass.
- Do not reintroduce the 17 rejected ideas: hollow-wall audio, hidden ore echo, durability pips, GP action pips, remembered portal selection, destination-preview prompts, portal hums, cave-breach moments, geode resonance, depth-band forecasts, automatic constellation focus, seller arrows, ability-teacher markers, merchant affordability markers, shop affordability sorting, material sound ladders, or reactive NPC dialogue.
- Prefer presentation and read-only calculations before new persistent state.
- All tunable numbers and copy belong in `/values/`; systems should expose events and UI should present them.

## Rating key

- **Effort:** XS = a small existing hook or polish pass; S = a focused UI/system change; M = limited save state or multi-file wiring.
- **Risk:** Very low = presentation/read-only; Low = bounded input or state behavior; Medium = economy, save, or collision-sensitive.
- **Impact:** Expected player-facing improvement when polished.

## A. Mining feel and immediate clarity

1. **First-contact target snap** — When the first hit lands on a newly aimed tile, briefly expand and settle the existing aim outline so the player instantly knows the correct block received the hit. **Wire:** `PlayerInputHandler.resolveStableMineTarget()` → `MiningIntentPreviewSystem`; tune in `values/materialFeedback.js`. **Effort: XS · Risk: Very low · Impact: High**

2. **Break follow-through trail** — Let the pickaxe trail continue through the former tile position for a fraction of a second after destruction instead of stopping on the empty cell. **Wire:** `DigSystem` destroyed result → `PickaxeTrailSystem`; timing in `values/gamefeel.js`. **Effort: XS · Risk: Very low · Impact: High**

3. **Ability multi-break badge** — When Quickslash, Thunder Strike, or Heavy Punch destroys several tiles in one action, show one compact “6 BLOCKS” result instead of a pile of overlapping labels. No bonus reward. **Wire:** aggregate results in `PlaySceneUpdate` → `FloatingTextSystem`. **Effort: S · Risk: Very low · Impact: High**

4. **Blocked-hit reason label** — Replace ambiguous failed impacts with a tiny reason such as `BEDROCK`, `PROTECTED`, or `NO TARGET`, shown at the reticle and rate-limited. **Wire:** failed `DigSystem.tryMine()` result → `MiningIntentPreviewSystem`; copy in `values/miningConfig.js`. **Effort: XS · Risk: Very low · Impact: High**

5. **Miss and blocked-hit separation** — A swing into air should feel light; a swing into an unbreakable surface should feel firm. Reuse existing effects but select different intensity, without creating a material sound ladder. **Wire:** `PlaySceneUpdate` mining result → `HitstopSystem`, `CameraShakeSystem`, and `SoundSystem`. **Effort: XS · Risk: Very low · Impact: High**

6. **Rapid-yield roll-up** — Combine repeated gains of the same resource within roughly a quarter-second into one increasing `+1 → +4 → +9` label. **Wire:** resource events from `DigSystem` → a short accumulator in `FloatingTextSystem`; window in `values/materialFeedback.js`. **Effort: S · Risk: Very low · Impact: High**

7. **Jackpot count-up** — Rich, packed, and ancient yields should count rapidly to their final amount rather than appearing as a static large number. **Wire:** existing `rarityMultiplier` and `resourceAmount` → `FloatingTextSystem`; tween via Phaser. **Effort: XS · Risk: Very low · Impact: High**

8. **Yield-scaled pickup arc** — A large yield gets a slightly wider, weightier flight into the inventory while a normal pickup stays quick. Keep total duration short. **Wire:** `DigSystem` result → `LootPickupFxSystem`; bounds in `values/materialFeedback.js`. **Effort: XS · Risk: Very low · Impact: Medium-high**

9. **Changed-resource HUD pulse** — Pulse only the resource slot that changed, not the whole inventory bar. Larger yields get one stronger pulse rather than repeated pulses. **Wire:** `DigSystem` totals update → `UIInventoryPopup` and the resource HUD component. **Effort: XS · Risk: Very low · Impact: High**

10. **Rarity aim tag** — When the aimed block is already visibly rich, packed, or ancient, put its short rarity label under the reticle before the hit. Do not reveal hidden blocks. **Wire:** `getResourceRarityDescriptor()` → `MiningIntentPreviewSystem`. **Effort: XS · Risk: Very low · Impact: High**

11. **Damage-change micro label** — If a temporary buff or recent upgrade changes the current hit damage, show `32 DAMAGE` once on the next valid strike, then stay quiet. **Wire:** `DigSystem.getDamagePreview()` plus `RetentionProgressSystem.consumeUpgradePayoff()` → `FloatingTextSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

12. **Critical multiplier roll-up** — During a burst of rapid crits, show the multiplier identity once and let subsequent crit damage numbers inherit its color rather than repeating `CRITICAL` every hit. **Wire:** crit events in `PlaySceneUpdate` → a short display lock in `FloatingTextSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

13. **Rubble identity** — Label the first rubble break in a session as `RUBBLE • NO ORE` so players understand why it behaves differently; never repeat after comprehension. **Wire:** `wasRubble` from `WorldModel.damageTile()` → `RetentionProgressSystem` tutorial event → `UINotificationSystem`. **Effort: XS · Risk: Very low · Impact: High**

14. **Environmental-break identity** — When earthquakes or scripted effects destroy a tile, distinguish `OPENED BY QUAKE` from a player-mined reward so no missing payout feels like a bug. **Wire:** source metadata from `EarthquakeSystem`/`DigSystem.processDestroyedTile()` → `FloatingTextSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

15. **Adaptive aim-outline contrast** — Automatically switch the existing aim outline between light and dark variants based on the sampled tile/background brightness. **Wire:** `MiningIntentPreviewSystem` → current tile presentation from `WorldRenderer`; colors in `values/uiColors.js`. **Effort: S · Risk: Very low · Impact: High**

16. **Screen-edge text clamping** — Keep damage, rarity, and pickup text inside the visible camera bounds so high or edge mining never loses feedback. **Wire:** `FloatingTextSystem` spawn positions → camera viewport clamp helper. **Effort: XS · Risk: Very low · Impact: High**

17. **Density descriptor after first hit** — On the first hit of unusually durable blocks, briefly show a plain descriptor such as `DENSE` or `EXTREME`, without health bars or pips. **Wire:** `getHitsToBreakPreview()` → `MiningIntentPreviewSystem`; thresholds in `values/tileHealth.js`. **Effort: XS · Risk: Very low · Impact: Medium-high**

18. **Existing-impact variation** — Apply restrained pitch and volume variation to repeated uses of the same approved impact sound so rapid mining does not sound machine-gunned. Do not split sounds by material. **Wire:** mining playback call → `SoundLibraryManager`; ranges in `values/audioConfig.js`. **Effort: XS · Risk: Very low · Impact: High**

19. **Fast-mining debris budget** — When destruction is extremely rapid, merge or shorten old debris before spawning new debris so the newest break remains visually readable. **Wire:** `DigSystem` break rate → `SpecialBlockEffectsManager`/particle pools; cap in `values/gamefeel.js`. **Effort: S · Risk: Very low · Impact: Medium-high**

20. **Visible-resource tally** — When aiming at a resource, optionally show how many matching resource tiles are currently visible on screen. It must never scan hidden tiles. **Wire:** visible tile set from `WorldRenderer` → read-only query in `MiningIntentPreviewSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

## B. Movement, camera, and control responsiveness

21. **Jump input buffer** — Remember one jump press for a very short window before landing so near-perfect inputs feel intentional. **Wire:** `PlayerInput` → `PlayerController` grounded transition; duration in `values/playerStats.js`. **Effort: S · Risk: Low · Impact: High**

22. **Coyote-time authority audit** — The controller already references coyote time; make its duration explicit in one value and add a contract so it cannot silently become zero. **Wire:** `PlayerController`/`PlayerPhysicsBody` → `values/playerStats.js` plus a focused test. **Effort: XS · Risk: Low · Impact: High**

23. **Portal-arrival input buffer** — Preserve one movement direction held during the final frames of teleport and apply it immediately after the arrival lock ends. **Wire:** `SpecialTileSystem` arrival completion → `PlayerInput` snapshot. **Effort: S · Risk: Low · Impact: High**

24. **Resume key-release guard** — After unpausing or regaining browser focus, require mine/ability keys to be released once before they can activate. **Wire:** `GameInputHandler` pause/focus transitions → `PlayerInputHandler`. **Effort: XS · Risk: Low · Impact: High**

25. **Fall-speed landing dust** — Scale existing landing dust by downward velocity so small drops stay quiet and big landings feel heavy. **Wire:** `PlayerRigContactSystem` landing event → `GroundEffectsAtmosphere`; curve in `values/playerMotionPolish.js`. **Effort: XS · Risk: Very low · Impact: High**

26. **Fall-speed landing squash** — Use a tiny velocity-scaled body squash on landing, capped low enough that collision and animation timing remain untouched. **Wire:** landing event → `PlayerMotionPolishSystem`; presentation values in `values/playerMotionPolish.js`. **Effort: XS · Risk: Very low · Impact: High**

27. **Predicted landing shadow** — During a fast fall, extend the existing ground contact shadow toward the likely landing row when that row is visible. **Wire:** `PlayerPhysicsBody.vy` plus `TileCollisionSystem` ray query → `PlayerSolidOcclusionSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

28. **Dangerous-fall vignette** — Add a restrained edge treatment only when fall speed exceeds the existing safe visual threshold; remove it instantly on landing. **Wire:** `PlayerController` motion state → `PostFxSystem`; threshold in `values/playerMotionPolish.js`. **Effort: XS · Risk: Very low · Impact: Medium-high**

29. **Downward camera look** — While descending quickly or holding down in flight, bias the camera slightly downward to reveal landing space. **Wire:** player vertical intent/velocity → PlayScene camera follow offset; bounds in `values/playerStats.js`. **Effort: S · Risk: Low · Impact: High**

30. **Horizontal look-ahead** — Give a small camera lead in the sustained movement direction and ease it back when input stops. Disable while precise mining is held. **Wire:** `PlayerMovement` intent → camera offset in `PlaySceneUpdate`; tune in `values/playerStats.js`. **Effort: S · Risk: Low · Impact: High**

31. **Camera recenter grace** — Wait briefly after the final movement input before returning the look-ahead to center, preventing constant camera wobble from small corrections. **Wire:** camera offset state in `PlaySceneUpdate`; delay in `values/playerStats.js`. **Effort: XS · Risk: Very low · Impact: Medium-high**

32. **Moving-only climb dust** — Emit wall-contact dust only when the player is actually moving vertically, not merely touching and holding a wall. **Wire:** `PlayerAbilities.isClimbing()` plus velocity → `ClimbTrailSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

33. **Climb direction-flip smoothing** — When the player reverses climb direction, blend trail direction for a few frames rather than snapping the particles. Physics remains immediate. **Wire:** climb input change → `ClimbTrailSystem`; tween only. **Effort: XS · Risk: Very low · Impact: Medium**

34. **Low-GP flight edge cue** — During active flight only, let the GP bar border and screen edge share one restrained low-GP color pulse. **Wire:** `PlayerAbilities` flight state and GP ratio → `HUDSystem` plus `PostFxSystem`. **Effort: XS · Risk: Very low · Impact: High**

35. **GP-depleted descent explanation** — If flight ends because GP reaches zero, show `GP EMPTY • DESCENDING` once at the player, not as repeated HUD spam. **Wire:** flight state transition in `PlayerAbilities` → `UINotificationSystem`/`FloatingTextSystem`. **Effort: XS · Risk: Very low · Impact: High**

36. **Flight-ready pulse** — When GP regenerates past the exact flight-start cost, pulse the GP frame once. **Wire:** threshold crossing in `PlayerAbilities` → `HUDSystem`; no new state beyond the previous ratio. **Effort: XS · Risk: Very low · Impact: High**

37. **Sky-boundary feedback** — At an authored ceiling or protected sky boundary, compress the flight trail and show a brief boundary ripple rather than letting upward motion appear broken. **Wire:** protected collision result → `FlightFootParticleSystem` and `PlayerLightShaderBridge`. **Effort: S · Risk: Very low · Impact: Medium-high**

38. **One-tile step assist** — When walking into a single-tile lip with clear headroom, allow a tightly bounded automatic step rather than requiring a full jump. **Wire:** `PlayerPhysicsBody` collision query → `TileCollisionSystem`; guardrails in `values/playerCollision.js`. **Effort: S · Risk: Medium · Impact: High**

39. **Stationary-stuck prompt** — If movement input remains held against unchanged collision for a short period, show the existing recovery control once; never auto-teleport. **Wire:** `PlayerController` position delta + input → `UINotificationSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

40. **Live input-glyph refresh** — Update interaction and ability hints immediately when the active keyboard/controller input source changes instead of waiting for the panel to reopen. **Wire:** `GameInputHandler` input-source event → `HUDSystem` and `SettingsPanelContent`. **Effort: S · Risk: Very low · Impact: High**

## C. Ability confidence and power readability

41. **Ability-ready frame flash** — When an ability becomes usable again, flash its existing key/icon frame once rather than showing another toast. **Wire:** ability validity transition in `PlayerAbilities` → `HUDSystem`; flash in `values/hudJuiceConfig.js`. **Effort: XS · Risk: Very low · Impact: High**

42. **Exact GP shortfall** — A failed ability press should say `NEED 7 MORE GP`, not only `NO GP`. Rate-limit by ability. **Wire:** ability failure result and cost getter → `MiningIntentPreviewSystem` or `FloatingTextSystem`. **Effort: XS · Risk: Very low · Impact: High**

43. **Invalid-target reason at reticle** — Show `BLOCKED`, `OUT OF RANGE`, or `NO SOLID TILE` beside the footprint preview, then fade quickly. **Wire:** Quickslash/Thunder/Heavy preview validation → `MiningIntentPreviewSystem`; copy in `values/playerAbilities.js`. **Effort: S · Risk: Very low · Impact: High**

44. **No-target no-spend contract** — Add a focused test proving an invalid ability activation cannot consume GP. Repair only if the test exposes a real leak. **Wire:** public ability activation methods in `PlayerAbilities` → contract test. **Effort: XS · Risk: Low · Impact: High**

45. **Heavy Punch rear-value label** — The existing rear-tile preview should include the visible resource name or `RUBBLE` when known. **Wire:** `DigSystem.getHeavyPunchPreview()` → `MiningIntentPreviewSystem`; use `tileTypeToResource()`. **Effort: XS · Risk: Very low · Impact: High**

46. **Thunder solid-count forecast** — Add `5 SOLID TILES` to the existing Thunder footprint so the player can judge whether the cast is worthwhile. **Wire:** `PlayerAbilities.getThunderStrikePreview().entries` → `MiningIntentPreviewSystem`. **Effort: XS · Risk: Very low · Impact: High**

47. **Quickslash landing safety tint** — Color the final slash destination green when open and safe, amber when tight, and red when invalid. Do not alter the route. **Wire:** Quickslash preview destination → `TileCollisionSystem` read-only query → `MiningIntentPreviewSystem`. **Effort: S · Risk: Low · Impact: High**

48. **Validity-driven preview opacity** — Keep valid ability footprints crisp and invalid footprints faint, using the same shapes already implemented. **Wire:** preview result validity → `MiningIntentPreviewSystem`; alpha in `values/playerAbilities.js`. **Effort: XS · Risk: Very low · Impact: Medium-high**

49. **Buffered-input acknowledgement** — When the bounded Thunder input buffer accepts a press, briefly close a tiny ring around the ability icon so the player knows it was heard. **Wire:** `_thunderStrikeInputBufferedUntil` assignment → `HUDSystem`. **Effort: XS · Risk: Very low · Impact: High**

50. **Buffered-input cancel cue** — If that single buffered action expires or is cancelled by teleport/pause, fade the ring cleanly rather than silently dropping it. **Wire:** buffer expiry/reset branches in `PlaySceneUpdate` → `HUDSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

51. **Repeated-failure coalescing** — Several invalid presses of the same ability should refresh one short label instead of stacking sounds and text. **Wire:** ability failure key → dedupe support in `UINotificationSystem`/`FloatingTextSystem`. **Effort: XS · Risk: Very low · Impact: High**

52. **One-time ability practice card** — Immediately after an ability unlock, show its key, GP cost, and one sentence describing its best use. This is direct UI, not an NPC breadcrumb. **Wire:** unlock transition from `UpgradeSystem`/`PlayerLevelSystem` → `RetentionProgressSystem` tutorial event. **Effort: S · Risk: Very low · Impact: High**

53. **First-success acknowledgement** — On the first successful use of each ability, show a small `QUICKSLASH MASTERED`-style confirmation and never repeat it for that save. No reward. **Wire:** successful ability results → a tiny discovered flag in `retentionProgressState.js` → `UINotificationSystem`. **Effort: S · Risk: Low · Impact: Medium-high**

54. **Pause-menu ability reference** — Add a compact page listing unlocked abilities, current keys, GP costs, and exact effects so forgotten controls never require leaving the game. **Wire:** pause overlay in `PlaySceneUI` → public getters in `PlayerAbilities` and `USER_SETTINGS`. **Effort: S · Risk: Very low · Impact: High**

55. **Contextual key-and-cost prompt** — When an ability footprint is visible, append its current key and GP cost directly to that footprint’s label. **Wire:** `USER_SETTINGS.getKeyLabel()` and ability cost getters → `MiningIntentPreviewSystem`. **Effort: XS · Risk: Very low · Impact: High**

56. **Ability damage summary** — The pause ability reference should show current calculated damage/range, not only base copy. **Wire:** `DigSystem.getDamagePreview()`, `PlayerAbilities.getConstellationStats()`, and upgrade effects → read-only UI rows. **Effort: S · Risk: Very low · Impact: High**

57. **Power-source breakdown** — Let the player expand an ability row to see `BASE + UPGRADE + CONSTELLATION + TEMPORARY` contributions. **Wire:** existing upgrade/constellation/temp-buff getters → pause ability reference. **Effort: S · Risk: Very low · Impact: Medium-high**

58. **Temporary-power color separation** — In all calculated ability summaries, color temporary chest/campfire power differently from permanent upgrades so expiration never resembles lost progression. **Wire:** temporary providers in `PlayerLevelSystem`/`CampfireSystem` → UI presentation only. **Effort: XS · Risk: Very low · Impact: High**

59. **Chest-buff final-three pulse** — The existing 20-second chest buff gets a faster but restrained meter pulse for only its final three seconds. Duration and power remain unchanged. **Wire:** `RetentionProgressSystem.getChestCritDamageBonus()` remaining time → `NextPromiseHudSystem`/`HUDSystem`; values in `values/treasureChestConfig.js`. **Effort: XS · Risk: Very low · Impact: High**

60. **Ability-readiness hint toggle** — Add one gameplay setting for ready flashes, shortfall text, and buffered-input rings while leaving footprints and controls intact. **Wire:** `UserSettings.display` → `SettingsPanelContent` → the related HUD presentation calls. **Effort: S · Risk: Very low · Impact: Medium-high**

## D. Selling, upgrading, and town turnaround

61. **Post-sale wallet preview** — Before confirming a quantity sale, show `WALLET 240 → 410` beside the action button. **Wire:** selected quantity and `_adjustedUnitPrice()` in `ShopOverlay` → detail panel text. **Effort: XS · Risk: Very low · Impact: High**

62. **Per-resource total value** — Every sellable inventory row should show unit price and total stack value together. **Wire:** resource totals + `getAdjustedResourceUnitPrice()` → `ShopOverlay._renderSellDetail()`. **Effort: XS · Risk: Very low · Impact: High**

63. **Sale composition receipt** — After Sell All, show the three resources that contributed the most value plus the total, then fade. **Wire:** existing `sellAllResources()` loop → one structured receipt passed to `UINotificationSystem`. **Effort: S · Risk: Very low · Impact: High**

64. **After-sale purchase callout** — Inside the shop only, indicate the single currently selected upgrade that becomes affordable if the proposed sale completes. Do not reorder cards or mark the NPC. **Wire:** sale preview total + `UpgradeSystem.canPurchase()` → current detail panel. **Effort: S · Risk: Very low · Impact: High**

65. **Remaining-wallet purchase preview** — The buy button should show the money left after purchase, especially for expensive upgrades. **Wire:** wallet and `getUpgradeCost()` → `ShopOverlay` action label. **Effort: XS · Risk: Very low · Impact: High**

66. **Current-versus-next stat row** — Alongside hits-to-break, show the one most relevant direct stat as `24 → 28 DAMAGE` or `110 → 120 GP`. **Wire:** `UpgradeSystem.getProjectedUpgradeEffects()` → `ShopOverlay`. **Effort: S · Risk: Very low · Impact: High**

67. **Exact locked requirement** — Replace generic `LOCKED` copy with the actual missing level, prerequisite, world access, or money difference. **Wire:** structured failure reasons from `UpgradeSystem.canPurchase()` → `ShopOverlay`. **Effort: S · Risk: Very low · Impact: High**

68. **Compact maxed-card mode** — Let players collapse already maxed upgrades within their existing category without changing the category order. **Wire:** local `ShopOverlay` view state → render height/filter; no save needed. **Effort: S · Risk: Very low · Impact: Medium-high**

69. **Selection survives redraw** — After buying or selling, keep keyboard/controller focus on the same logical card when it still exists. **Wire:** selected upgrade/resource ID → `ShopOverlay._render()` focus restoration. **Effort: XS · Risk: Very low · Impact: High**

70. **Session-only shop tab memory** — Reopen a merchant on the tab used moments ago, resetting naturally when the game session ends. This does not affect portals or saves. **Wire:** ephemeral field in `ShopOverlay`/`OverlayManager`. **Effort: XS · Risk: Very low · Impact: Medium-high**

71. **Quantity shortcuts** — Add clear keyboard/controller actions for sell `1`, `10`, `HALF`, and `ALL` on the focused resource. **Wire:** `GameInputHandler` overlay actions → `ShopOverlay` quantity state; labels from `USER_SETTINGS`. **Effort: S · Risk: Low · Impact: High**

72. **Page-position preservation** — Returning from an upgrade detail or purchase should retain the current category page and scroll position. **Wire:** stable card/page IDs in `ShopOverlay`. **Effort: XS · Risk: Very low · Impact: High**

73. **Price-bonus explanation** — If a market or regional bonus changes a resource price, show the base price and bonus source rather than only the final number. **Wire:** `getAdjustedResourceUnitPrice()` inputs → resource detail breakdown. **Effort: S · Risk: Very low · Impact: High**

74. **Bonus-value highlight** — On a sale receipt, color only the money added by market bonuses so the upgrade’s value is visible. **Wire:** compute base and adjusted totals in `ShopOverlay`; presentation through `UINotificationSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

75. **Skippable wallet count-up** — Large sales can count the wallet up quickly, but any input should immediately finish the tween at the correct total. **Wire:** actual money changes remain immediate in `UpgradeSystem`; animate display value only in `HUDSystem`/`ShopOverlay`. **Effort: S · Risk: Very low · Impact: High**

76. **Optional expensive-buy hold** — For purchases consuming most of the wallet, require a short hold only when the player enables purchase protection. Normal purchases remain instant. **Wire:** percentage check in `ShopOverlay` + toggle in `UserSettings`. **Effort: S · Risk: Low · Impact: Medium**

77. **Double-activation purchase guard** — Lock the purchase action until the current result and redraw finish so one key press cannot buy twice. **Wire:** short transaction lock around `ShopOverlay.purchaseUpgrade()`. **Effort: XS · Risk: Low · Impact: High**

78. **Newly unlocked card treatment** — The first time a previously locked upgrade becomes available, give its card a one-time border sweep when the player opens that category. No NPC or world marker. **Wire:** unlock transitions derived from `UpgradeSystem` → ephemeral/shop-view flags. **Effort: S · Risk: Very low · Impact: High**

79. **Unlock-to-action handoff** — Buying an ability unlock should end with its actual bound key and a `TRY IT UNDERGROUND` line in the purchase result. **Wire:** purchased upgrade ID + `USER_SETTINGS.getKeyLabel()` → `UINotificationSystem`. **Effort: XS · Risk: Very low · Impact: High**

80. **Town turnaround summary** — After a sell-and-buy sequence, show one compact line such as `SOLD 840 M • BOUGHT POWER III • 126 M LEFT`. This is a transaction recap, not another expedition summary. **Wire:** recent sale/purchase events in `RetentionProgressSystem` → shop-close event in `OverlayManager`. **Effort: S · Risk: Very low · Impact: Medium-high**

## E. Persistent-mine exploration and orientation

81. **Previous-expedition turnaround marker** — Place a small, non-colliding marker at the deepest tile reached before the last return to town. **Wire:** expedition summary depth from `RetentionProgressSystem` → a marker view owned by `PlaySceneSetup`; position saved in retention data. **Effort: M · Risk: Low · Impact: High**

82. **Physical best-depth pennant** — At the exact personal-record row, draw a subtle side-wall pennant that moves only when the record improves. **Wire:** best-depth event → `WorldRenderer` overlay; save uses existing best-depth stat. **Effort: S · Risk: Very low · Impact: High**

83. **Mine-entrance progress sign** — Let the surface entrance sign show best depth and the next authored milestone requirement. **Wire:** `RetentionProgressSystem.getBestDepth()` + `MilestoneBoardSystem.getNextMilestone()` → `SurfaceTunnelDoorSystem` prompt/view. **Effort: S · Risk: Very low · Impact: High**

84. **Discovered-landmark nameplate** — Once an authored landmark is discovered, show its name when the player is nearby; undiscovered landmarks remain unnamed. **Wire:** discovery keys in `RetentionProgressSystem` + `WORLD_VISUAL_LANDMARKS` → a restrained world label. **Effort: S · Risk: Very low · Impact: High**

85. **Region-entry title** — On first entry into an existing biome/visual region, show its authored name and depth range for two seconds without stopping play. **Wire:** `BiomeSystem` region change → `UINotificationSystem`; names in `values/worldVisualRegions.js`. **Effort: S · Risk: Very low · Impact: High**

86. **Quiet region re-entry** — After a long absence, re-entry gets only the small region name in a corner, while repeated border crossing stays silent. **Wire:** `BiomeSystem` region ID + last-shown timestamp → HUD presentation. **Effort: XS · Risk: Very low · Impact: Medium-high**

87. **Visible-chest edge cue** — If an unopened authored chest is already inside the camera’s visible tile set but near the edge, show a tiny edge glint. Never reveal an offscreen or hidden chest. **Wire:** visible tile query + `SpecialTileSystem` unopened state → `HUDSystem`. **Effort: S · Risk: Very low · Impact: High**

88. **Spent-chest world mark** — An opened chest site should retain a subtle open/empty visual so revisiting old tunnels communicates permanent history. **Wire:** persisted opened-chest keys in `SpecialTileSystem` → chest renderer state. **Effort: XS · Risk: Very low · Impact: High**

89. **Chest depth in journal** — Add the level and broad depth band to each discovered chest entry without exposing unopened locations. **Wire:** `recordChestOpened()` payload → `retentionProgressState` journal label → `MilestonePillarModal`. **Effort: S · Risk: Low · Impact: Medium-high**

90. **Per-level completion strip** — At the Milestone Pillar, summarize found stars, relics, opened chests, activated portals, and reached milestones separately for Level 1 and Level 2. **Wire:** existing counters/keys from `RetentionProgressSystem`, `AncientRelicSystem`, and `SpecialTileSystem` → `MilestonePillarModal`. **Effort: S · Risk: Very low · Impact: High**

91. **Unknown collectible slots** — Show `?` slots for the authored number of stars/relic caches/chests per level, without revealing coordinates or exact content. **Wire:** counts from `values/starConstellations.js`, `values/ancientRelics.js`, and `values/treasureChestConfig.js` → pillar completion strip. **Effort: S · Risk: Very low · Impact: High**

92. **Nearest-portal distance in pause** — The pause screen can state the tile distance to the nearest activated portal without drawing a normal-play arrow. **Wire:** `SpecialTileSystem.getNearestActivatedPortal()` → `PlaySceneUI` pause context. **Effort: XS · Risk: Very low · Impact: High**

93. **Portal depth difference** — Portal rows should show `+420m deeper` or `-180m shallower` relative to the current player depth. **Wire:** activated portal list + current player tile → portal selection UI. **Effort: XS · Risk: Very low · Impact: High**

94. **Portal landing-status badge** — Mark a destination `SAFE`, `TIGHT`, or `FALLBACK` using the same safe-landing query the teleport code already uses. **Wire:** expose read-only landing resolution from `SpecialTileSystem` → portal list. **Effort: S · Risk: Low · Impact: High**

95. **Arrival destination label** — After teleport completes, briefly show the meaningful portal label and current region. This happens after arrival, not as the rejected preview prompt. **Wire:** successful teleport result → `UINotificationSystem`; reuse `getTeleportPortalLabel()`. **Effort: XS · Risk: Very low · Impact: High**

96. **Fresh-tunnel edge contrast** — Newly broken tile edges remain slightly brighter for a few seconds, helping the player read the route they just created. No persistence required. **Wire:** recent destroyed-tile timestamps in `WorldRenderer`; color/timing in `values/worldVisualDamage.js`. **Effort: S · Risk: Very low · Impact: High**

97. **Recent-footstep trail** — Keep a very short-lived set of floor scuffs behind the player in confusing caves; fade them fully and never save them. **Wire:** grounded movement contacts → `GroundEffectsAtmosphere`; cap in `values/playerMotionPolish.js`. **Effort: S · Risk: Very low · Impact: Medium-high**

98. **Darkness eye adaptation** — Ease underground darkness over a short transition when moving from the bright surface into existing cave lighting, without changing final visibility radius. **Wire:** surface/cave transition → `LightSystem`/`ShaderSystem`; duration in `values/lightConfig.js`. **Effort: S · Risk: Very low · Impact: High**

99. **Interaction prompt priority** — When mine, portal, chest, pillar, campfire, and shop prompts overlap, choose one deterministic priority and show the others as small secondary icons. **Wire:** candidate prompts in `HUDSystem`/`OverlayManager` → one priority resolver in `PlaySceneGameplay`. **Effort: S · Risk: Low · Impact: High**

100. **Pause “You are here” line** — Show level, depth, region, nearest activated portal distance, and current cargo value in one compact pause-screen context row. **Wire:** `PlayerController`, `BiomeSystem`, `SpecialTileSystem`, and `getCargoSellValue()` → `PlaySceneUI`. **Effort: S · Risk: Very low · Impact: High**

## F. Levels, milestones, stars, and relic progression

101. **XP remaining toggle** — Let the XP bar optionally show `84 XP TO LEVEL 12` instead of only a percentage. **Wire:** `PlayerLevelSystem` current XP/requirement → `XPProgressBar`; toggle in `UserSettings`. **Effort: XS · Risk: Very low · Impact: High**

102. **XP overflow sweep** — When one reward crosses a level boundary, fill the old bar, flash the level, then immediately continue at the correct overflow amount. Logic remains immediate. **Wire:** XP gain result → presentation queue in `XPProgressBar`. **Effort: S · Risk: Very low · Impact: High**

103. **Multi-level compression** — A +5 level block should show one `+5 LEVELS` banner and then only the required milestone choices, not five routine banners. **Wire:** `PlayerLevelSystem.gainLevel()` result → `_handleLevelUpResult()` notification aggregation. **Effort: XS · Risk: Low · Impact: High**

104. **Next-choice-level marker** — Put a small diamond on the XP bar and ability reference showing exactly how many levels remain until the next interactive choice. **Wire:** milestone interval from `values/levelConfig.js` + current level → `XPProgressBar`. **Effort: XS · Risk: Very low · Impact: High**

105. **Choice current-bonus comparison** — Every milestone choice card should state the current value and value after choosing it. **Wire:** `PlayerLevelSystem` reward definitions/effects → `LevelUpPopup`. **Effort: S · Risk: Very low · Impact: High**

106. **Choice hits-to-break impact** — If a choice changes mining damage, show one current-depth material result such as `STONE 3 → 2 HITS`. **Wire:** temporary projected reward effects → `DigSystem.getHitsToBreakPreview()` → `LevelUpPopup`. **Effort: S · Risk: Very low · Impact: High**

107. **Permanent-choice tag** — Add an unmistakable `PERMANENT • SAVED` tag to milestone choices so they cannot be confused with the 20-second chest buff. **Wire:** `LevelUpPopup` copy/style; no new state. **Effort: XS · Risk: Very low · Impact: High**

108. **Choice navigation hints** — Show the actual bound left/right/confirm/back controls in the choice popup footer. **Wire:** `USER_SETTINGS` key labels → `LevelUpPopup`. **Effort: XS · Risk: Very low · Impact: Medium-high**

109. **Choice preview highlight** — Focusing a choice should temporarily highlight only the affected stat row in the popup; nothing changes until confirmation. **Wire:** focus events in `LevelUpPopup` → local preview state. **Effort: XS · Risk: Very low · Impact: Medium-high**

110. **Choice result receipt** — After confirmation, show the exact applied delta and new total in one compact result line. **Wire:** `PlayerLevelSystem.applyChoiceReward()` structured result → `UINotificationSystem`. **Effort: XS · Risk: Very low · Impact: High**

111. **Level-source label** — Distinguish normal mining XP, XP blocks, legend blocks, and authored milestone gains in the level-up banner. **Wire:** source metadata from `DigSystem._handleSpecialBlockEffects()` → level result → `_handleLevelUpResult()`. **Effort: S · Risk: Low · Impact: Medium-high**

112. **Level-authority contract** — Add a test proving shops, unlock gates, save cards, and HUD all read the same `PlayerLevelSystem.level`. **Wire:** existing modules → focused pure contract; repair only exposed divergence. **Effort: XS · Risk: Very low · Impact: High**

113. **Milestone-reward proof row** — After claiming/reaching a milestone, show the exact reward as applied to the current stat total, not only its description. **Wire:** `MilestoneBoardSystem` reached event + authoritative stat getter → `MilestonePillarModal`. **Effort: S · Risk: Very low · Impact: High**

114. **Pillar progress header** — Opening the Milestone Pillar should immediately show `3/8 MILESTONES • NEXT IN 42m`. **Wire:** `MilestoneBoardSystem.getReachedDepths()`/`getNextMilestone()` → modal header. **Effort: XS · Risk: Very low · Impact: High**

115. **Milestone reward history** — Completed milestone rows should show when reached and the reward already applied, preventing uncertainty about missed rewards. **Wire:** add reached timestamp only if absent in `MilestoneBoardSystem` save data → `MilestonePillarModal`. **Effort: M · Risk: Low · Impact: Medium-high**

116. **Newest personal-stat highlight** — In Miner Statistics, softly mark any record improved during the current session. **Wire:** session baseline snapshot in `RetentionProgressSystem` → `MilestonePillarModal`; no persistent state needed. **Effort: S · Risk: Very low · Impact: High**

117. **Session-record ribbon** — If the player sets two or more personal records in one session, show a small ribbon on the Pillar’s statistics tab until viewed. **Wire:** improved-stat set in `RetentionProgressSystem` → modal tab badge. **Effort: S · Risk: Very low · Impact: Medium-high**

118. **Recent-upgrade history** — Keep the last five purchased upgrades with their practical deltas in the Miner Statistics view. **Wire:** existing `recordUpgrade()` event → bounded list in retention save state → `MilestonePillarModal`. **Effort: M · Risk: Low · Impact: Medium-high**

119. **Exact constellation remainder** — At the pillar, every incomplete constellation should say exactly how many stars and relics remain, without automatically selecting one. **Wire:** `FloatingTextSystem.getConstellationCounts()` + relic count → `StarPillarSystem`/pillar UI. **Effort: S · Risk: Very low · Impact: High**

120. **Constellation reward preview** — Show the exact current and unlocked bonus values before completion. **Wire:** `values/constellationBuffs.js` + current unlock state → constellation detail UI. **Effort: S · Risk: Very low · Impact: High**

121. **Broad source categories** — Tell players whether missing constellation progress comes from `SKY STARS`, `ANCIENT RELICS`, or `BOTH`, without revealing locations. **Wire:** configured requirements in `values/starConstellations.js`/`values/ancientRelics.js` → detail copy. **Effort: XS · Risk: Very low · Impact: High**

122. **Relic contribution breakdown** — Relic collection should show which locked constellations currently accept relic progress and how much each still needs. **Wire:** `AncientRelicSystem.getCount()` + constellation requirement data → pillar detail panel. **Effort: S · Risk: Very low · Impact: High**

123. **Rapid-star pickup roll-up** — Several stars collected in quick succession should produce one growing constellation-progress display rather than overlapping messages. **Wire:** star pickup events → short accumulator in `FloatingTextSystem`; final counts remain authoritative. **Effort: S · Risk: Very low · Impact: High**

124. **New-journal tab badge** — When a material, portal, chest, depth band, or event is first recorded, mark the Journal tab `NEW` until opened. **Wire:** `_discover()` event in `RetentionProgressSystem` → `MilestonePillarModal` tab badge. **Effort: S · Risk: Very low · Impact: High**

125. **Viewed-state precision** — Clear only the journal entries actually displayed, not all unseen entries when the pillar opens. **Wire:** visible journal keys → bounded viewed-key set in `retentionProgressState.js`. **Effort: M · Risk: Low · Impact: Medium-high**

## G. HUD, overlays, and accessibility

126. **Notification priority lanes** — Critical danger, permanent progression, temporary power, and routine resource messages should have explicit priorities so low-value toasts cannot hide important ones. **Wire:** priority field in `UINotificationSystem`; callers use constants from `values/uiConfig.js`. **Effort: S · Risk: Very low · Impact: High**

127. **Duplicate notification roll-up** — Repeated identical notices should become `STONE +1 ×8` or refresh one timer rather than occupying multiple slots. **Wire:** existing notification keys → count/merge behavior in `UINotificationSystem`. **Effort: S · Risk: Very low · Impact: High**

128. **Hard notification cap** — Limit simultaneous routine notifications and keep critical notifications exempt, preventing visual flooding during rapid mining. **Wire:** queue capacity in `UINotificationSystem`; values in `values/uiConfig.js`. **Effort: XS · Risk: Very low · Impact: High**

129. **Pinned danger state** — Earthquake escape, trapped-state recovery, and save corruption warnings remain pinned until resolved; ordinary messages continue beneath them. **Wire:** persistent notification mode in `UINotificationSystem` → existing danger callers. **Effort: S · Risk: Very low · Impact: High**

130. **Instant routine-dismiss input** — A single configured dismiss action should remove routine summaries/cards without also closing the pause menu or firing gameplay. **Wire:** overlay input capture in `GameInputHandler` → `UINotificationSystem`. **Effort: S · Risk: Low · Impact: High**

131. **Player-overlap HUD fade** — If the player moves directly behind a large HUD element, reduce that element’s background opacity briefly while keeping text readable. **Wire:** player screen position + HUD rectangles → `HUDSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

132. **Adaptive HUD backing** — Increase HUD backing opacity against bright sky and reduce it underground using existing scene luminance/region state. **Wire:** `BiomeSystem`/light state → `ApprovedHudSkin` presentation. **Effort: S · Risk: Very low · Impact: High**

133. **Safe-zone anchoring** — Anchor HUD groups to configurable safe margins so different resolutions never clip promise text, GP, or resources. **Wire:** scale resize event → `HUDSystem`, `NextPromiseHudSystem`, `XPProgressBar`; margins in `values/hudLayout.js`. **Effort: S · Risk: Very low · Impact: High**

134. **Ultrawide layout contract** — Add a deterministic layout test for 16:9, 16:10, ultrawide, and small-window sizes. **Wire:** HUD resize functions → pure geometry contract. **Effort: S · Risk: Very low · Impact: High**

135. **HUD text-scale setting** — Offer small, default, and large UI text scales without changing world zoom. **Wire:** `UserSettings.display` → font-scale multiplier consumed by UI factories and HUD. **Effort: M · Risk: Low · Impact: High**

136. **Reduced-motion setting** — Provide one setting that shortens UI tweens, removes decorative bobbing, and reduces nonessential particles while leaving gameplay timing unchanged. **Wire:** `UserSettings.display` → `PostFxSystem`, UI tween helpers, particle systems. **Effort: M · Risk: Low · Impact: High**

137. **Screen-flash intensity setting** — Separate screen-flash strength from camera shake so players can keep impact motion but reduce bright flashes. **Wire:** new display field → `ScreenFlashSystem`; slider in `SettingsPanelContent`. **Effort: S · Risk: Very low · Impact: High**

138. **Rarity shape coding** — Pair rich, packed, and ancient colors with one, two, and three small geometric marks so rarity is readable without color alone. **Wire:** rarity feedback in `MiningIntentPreviewSystem`/`FloatingTextSystem`; glyphs from `UiIconAtlas`. **Effort: S · Risk: Very low · Impact: High**

139. **Currency-shape distinction** — Always pair money, GP, XP, stars, and relics with their icon, not color alone, in mixed summaries. **Wire:** `UI_RESOURCE_PRESENTATION`/`UiIconAtlas` → notifications, shop, pillar, and pause context. **Effort: S · Risk: Very low · Impact: High**

140. **Controller focus halo** — Use one consistent halo for the currently focused interactive element across shops, settings, pause, pillar, and level choices. **Wire:** shared focus state in `PhaserUiKit.createButton()`/modal helpers. **Effort: S · Risk: Very low · Impact: High**

141. **Disabled-button reason** — Hovering or focusing a disabled action should always reveal the exact blocker in the same location. **Wire:** disabled reason field added to `PhaserUiKit` controls → existing overlays. **Effort: S · Risk: Very low · Impact: High**

142. **One universal back action** — Every modal and overlay should consume the same configured back action and close only the topmost layer. **Wire:** `OverlayManager` stack → `GameInputHandler`; key from `USER_SETTINGS`. **Effort: S · Risk: Low · Impact: High**

143. **Overlay gameplay-input lock** — Add a contract proving mine, jump, and abilities cannot fire behind shops, settings, the pillar, or level choices. **Wire:** `OverlayManager` visibility → `GameInputHandler`/`PlayerInputHandler` gate plus test. **Effort: XS · Risk: Low · Impact: High**

144. **Overlay-close release guard** — Require held gameplay keys to return up once after closing an overlay, preventing an accidental swing or ability. **Wire:** overlay close event → same input-release guard used after pause. **Effort: XS · Risk: Low · Impact: High**

145. **Controller hides pointer** — Hide the mouse pointer after controller navigation starts and restore it on mouse movement, avoiding two competing focus signals. **Wire:** active input-source state → scene canvas cursor style. **Effort: XS · Risk: Very low · Impact: Medium-high**

146. **Mouse preserves focus** — Moving the mouse should focus only the hovered control, not reset the entire keyboard/controller selection history. **Wire:** pointerover handling in `PhaserUiKit` → overlay focus manager. **Effort: XS · Risk: Very low · Impact: Medium-high**

147. **Instant controller tooltips** — Controller focus shows explanatory tooltips immediately; mouse hover can retain a short delay to avoid flicker. **Wire:** input source → tooltip delay in shared UI kit. **Effort: XS · Risk: Very low · Impact: Medium-high**

148. **Reset hints only** — Add a settings action that resets first-run cards and contextual hints without resetting progress, controls, or display options. **Wire:** tutorial/discovery viewed flags in retention/UserSettings data → `SettingsPanelContent`. **Effort: S · Risk: Low · Impact: High**

149. **UI sound deduplication** — Focus changes caused by redraw should not replay navigation sounds; only genuine user navigation should. **Wire:** focus origin metadata → `SoundSystem` UI calls. **Effort: XS · Risk: Very low · Impact: Medium-high**

150. **Compact active-effects row** — Show chest and campfire effects in one small row with icon, remaining time, and exact benefit; hide the row when empty. **Wire:** `RetentionProgressSystem` chest timer + `CampfireSystem` blessing state → `HUDSystem`; presentation values in `/values/`. **Effort: S · Risk: Very low · Impact: High**

## H. Audio, VFX, and atmosphere hierarchy

151. **Impact stereo positioning** — Pan existing mining impacts slightly toward their world position so left/right digging reads before the player looks at text. **Wire:** tile world X and camera center → `SoundSystem` playback pan. **Effort: XS · Risk: Very low · Impact: High**

152. **Impact concurrency cap** — During extremely fast mining, preserve the newest and strongest impact while fading redundant old instances instead of stacking volume. **Wire:** mining sound group in `SoundLibraryManager`; cap in `values/audioConfig.js`. **Effort: XS · Risk: Very low · Impact: High**

153. **Big-event ambience duck** — Briefly duck ambience under chest openings, constellation completion, portal activation, and major milestones, then restore smoothly. **Wire:** existing event callbacks → `SoundSystem` category ducking; curve in `values/audioConfig.js`. **Effort: S · Risk: Very low · Impact: High**

154. **Signature-stinger priority** — If two major stingers collide, play the higher-priority one and delay or suppress the other rather than creating noise. **Wire:** small priority queue in `SoundSystem`; event priorities in `values/audioConfig.js`. **Effort: S · Risk: Very low · Impact: High**

155. **Pause low-pass transition** — Ease music and ambience into the paused mix over a short tween, then restore on resume. **Wire:** pause/resume event → `SoundSystem`; use Phaser tween support. **Effort: XS · Risk: Very low · Impact: High**

156. **Focus-loss audio fade** — Fade master output down when the browser loses focus and restore to the saved volume on focus, avoiding abrupt loops. **Wire:** window focus events in `GameInputHandler`/scene → `SoundSystem`. **Effort: XS · Risk: Very low · Impact: High**

157. **Weather crossfade smoothing** — Ensure rain, wind, and clear ambience crossfade from the actual current volume, even when weather changes mid-transition. **Wire:** `WeatherAudioController` transition state → one cancellable tween. **Effort: S · Risk: Very low · Impact: Medium-high**

158. **Portal-tail continuity** — Let the departure sound tail carry into the arrival sound instead of hard-cutting during scene/camera relocation. **Wire:** teleport timeline in `SpecialTileSystem` → `SoundSystem` scheduled playback. **Effort: XS · Risk: Very low · Impact: High**

159. **One-shot low-GP warning** — Play the existing low-GP warning once per threshold crossing, not continuously while below the threshold. **Wire:** GP ratio crossing in `PlayerAbilities` → `SoundSystem`; reset only after recovery margin. **Effort: XS · Risk: Very low · Impact: High**

160. **Optional ability-ready chime** — Pair the ready-frame flash with one restrained common chime, controlled by the ability-readiness hint toggle. **Wire:** readiness transition → `SoundSystem`; no new asset required if an approved UI sound fits. **Effort: XS · Risk: Very low · Impact: Medium-high**

161. **Disabled-action sound** — Use one quiet, consistent rejection click for every disabled UI action and pair it with the visible blocker reason. **Wire:** shared disabled path in `PhaserUiKit` → `SoundSystem`. **Effort: XS · Risk: Very low · Impact: High**

162. **Transaction sound scaling** — Small sales/purchases use the normal confirm; very large transactions add a short low layer without becoming louder than milestone stingers. **Wire:** transaction value ratio → existing approved sound layers in `ShopOverlay`/`SoundSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

163. **Directional earthquake rumble** — Pan the existing rumble slightly toward the epicenter and reduce directionality as intensity grows. **Wire:** player-to-epicenter vector from `EarthquakeSystem` → `SoundSystem` pan. **Effort: S · Risk: Very low · Impact: High**

164. **Campfire distance mix** — Smoothly fade the existing fire loop by distance and occlusion rather than toggling it at a hard radius. **Wire:** player/campfire distance + `WeatherOcclusionSampler`-style line query → `CampfireSystem` audio. **Effort: S · Risk: Very low · Impact: High**

165. **Chest-power mix lift** — For the first half-second of the 20-second buff, slightly lift high-frequency impact layers, then return to the normal mix; stats remain unchanged. **Wire:** chest buff start event → temporary mix tween in `SoundSystem`. **Effort: XS · Risk: Very low · Impact: High**

166. **Directional impact shake** — Bias mining shake a few pixels opposite the struck face instead of always shaking uniformly. **Wire:** aim direction in mining result → `CameraShakeSystem`; magnitude remains within existing settings. **Effort: S · Risk: Very low · Impact: High**

167. **Single multi-break hitstop** — An ability destroying many blocks should trigger one capped hitstop based on the strongest result, never one hitstop per tile. **Wire:** aggregated ability result → `HitstopSystem`; add a contract. **Effort: S · Risk: Low · Impact: High**

168. **Tile-tinted debris** — Tint existing generic debris toward the destroyed tile’s current visual palette so breaks feel connected without requiring new sprites. **Wire:** tile presentation color from `WorldRenderer` → `SpecialBlockEffectsManager`. **Effort: S · Risk: Very low · Impact: High**

169. **Open-space debris direction** — Bias debris toward neighboring air cells, making breaks look like material bursts into the tunnel rather than through solid walls. **Wire:** four-neighbor `WorldModel` query → particle velocity selection. **Effort: S · Risk: Very low · Impact: Medium-high**

170. **Yield-weight icon scale** — Large pickup yields briefly scale the resource icon more than normal yields, with a strict cap to keep the HUD stable. **Wire:** `resourceAmount` → `LootPickupFxSystem` and changed-slot pulse. **Effort: XS · Risk: Very low · Impact: High**

171. **Reticle visibility protection** — Keep the aim outline and ability footprints above darkness, fog, weather, and post-processing while still respecting UI opacity settings. **Wire:** rendering depth/pipeline placement in `MiningIntentPreviewSystem` and `PostFxSystem`. **Effort: S · Risk: Very low · Impact: High**

172. **HUD flash isolation** — Screen flashes should affect the world more than text and critical HUD information so numbers remain readable. **Wire:** separate camera/pipeline layers in `ScreenFlashSystem` and HUD setup. **Effort: S · Risk: Very low · Impact: High**

173. **Weather readability bubble** — Reduce only decorative rain/fog opacity in a small radius around the player and current target during intense weather. Gameplay weather remains unchanged. **Wire:** player/target positions → `WeatherParticleController`; radius in `values/weatherConfig.js`. **Effort: S · Risk: Very low · Impact: High**

174. **Surface light continuity** — Smoothly blend player light, sky light, and underground darkness across the entrance rows so repeated town returns never produce a hard lighting pop. **Wire:** depth transition → `LightSystem`, `ShaderSystem`, and `PlayerLightShaderBridge`. **Effort: S · Risk: Very low · Impact: High**

175. **Hold-to-hide HUD capture** — Add a non-persistent hold action that temporarily hides only HUD/notifications for clean screenshots and restores them on release. It is not a photo mode. **Wire:** new rebindable action in `values/keybindActions.js` → HUD visibility group in `PlaySceneUI`. **Effort: S · Risk: Low · Impact: Medium-high**

## I. Save confidence, onboarding, and optional platform wins

176. **Save-in-progress icon** — Show a tiny animated save icon while `_dugTileSavePromise` is active and hide it only after success or failure. **Wire:** `PlaySceneUI` save promise lifecycle → `HUDSystem`. **Effort: XS · Risk: Very low · Impact: High**

177. **Last-saved timestamp** — The pause screen should state `SAVED 12s AGO`, updating from the last confirmed successful save rather than the request time. **Wire:** successful `DugTilesSaveStore.save()` result → ephemeral timestamp in `PlaySceneUI`. **Effort: XS · Risk: Very low · Impact: High**

178. **Slot-specific save confirmation** — Manual save feedback should name the slot and current depth: `SLOT 2 SAVED • 684m`. **Wire:** save slot + current retention depth → existing save notification. **Effort: XS · Risk: Very low · Impact: High**

179. **Save-request coalescing** — Multiple rapid save requests should merge into the active promise plus one final follow-up save, not produce overlapping writes. **Wire:** `queueDugTilesSave()`/`_dugTileSavePromise` → dirty-after-save flag; add contract. **Effort: S · Risk: Medium · Impact: High**

180. **Retryable save failure** — A failed manual save should expose one `RETRY` action and leave gameplay available; automatic saves retry with bounded backoff. **Wire:** save failure result → `UINotificationSystem` action callback; retry limits in `/values/`. **Effort: S · Risk: Medium · Impact: High**

181. **Automatic pre-import backup** — Before importing over a slot, create a backup of the current payload and say where it can be restored. **Wire:** import path in `StartMenuScene` → `SaveBackupManager.createBackup()` before write. **Effort: S · Risk: Low · Impact: High**

182. **Import preview card** — Before overwrite, show imported version, level, best depth, wallet, stars, timestamp, and compatibility status. **Wire:** `DugTilesSaveStore.normalizePayload()` read-only result → `StartMenuScene` import modal. **Effort: S · Risk: Very low · Impact: High**

183. **Human-readable export filename** — Export files as `understar-slot-2-level-18-depth-684m-2026-07-26.json`. **Wire:** export handler in `StartMenuScene` + normalized save summary. **Effort: XS · Risk: Very low · Impact: High**

184. **Backup restore preview** — Selecting a backup should compare its level, depth, wallet, stars, and date against the current slot before confirmation. **Wire:** `SaveBackupManager` summaries → backup modal in `StartMenuScene`. **Effort: S · Risk: Very low · Impact: High**

185. **Duplicate save slot** — Allow copying one slot into an empty slot for safe experimentation, preserving the source and assigning the target slot identity. **Wire:** normalized payload read/write through `DugTilesSaveStore`; create backup first. **Effort: M · Risk: Medium · Impact: High**

186. **Hold-to-delete slot** — Replace easy accidental deletion with a short visible hold meter; keyboard/controller and pointer share the same confirmation. **Wire:** delete action in `StartMenuScene` → shared hold button in `PhaserUiKit`. **Effort: S · Risk: Low · Impact: High**

187. **Main-menu quick continue** — If a valid last-played slot exists, add `CONTINUE SLOT 2` above Play while preserving the normal slot screen. **Wire:** latest valid summary from `DugTilesSaveStore` → `MainMenuScene`; preference is inferred, not a new save dependency. **Effort: S · Risk: Low · Impact: High**

188. **Continue snapshot subtitle** — The quick-continue button should include level and best depth so the target is never ambiguous. **Wire:** existing save-card summary → `MainMenuScene` button subtitle. **Effort: XS · Risk: Very low · Impact: High**

189. **Save-aware loading messages** — During load, rotate short messages relevant to the selected save’s nearest milestone, unlocked abilities, or deepest level rather than generic tips only. **Wire:** selected save summary → `WorldLoadScene`/`LoadingScreenView`; templates in `values/loadingMessages.js`. **Effort: S · Risk: Very low · Impact: Medium-high**

190. **First-run progress strip** — The three-step mine/sell/upgrade contract should show `1/3`, allow skipping, and disappear permanently when completed. **Wire:** existing first-run state in `RetentionProgressSystem` → `NextPromiseHudSystem` and pause help. **Effort: XS · Risk: Very low · Impact: High**

191. **Replay tutorial topics** — Add a help page where players can replay controls, mining, selling, portals, stars/relics, and earthquakes individually without resetting discoveries. **Wire:** tutorial event emitters → pause ability/help reference; viewed state stays untouched. **Effort: S · Risk: Very low · Impact: High**

192. **Live controls cheat sheet** — The help page must display current bindings from `USER_SETTINGS`, including any rebinding, rather than hardcoded keys. **Wire:** `KEYBIND_ACTIONS` + `USER_SETTINGS.getKeyLabel()` → help page. **Effort: XS · Risk: Very low · Impact: High**

193. **Binding-conflict explanation** — When rebinding fails, identify the action already using that key and offer swap/cancel rather than only rejecting it. **Wire:** `UserSettings.setKeybind()` structured conflict result → `SettingsPanelContent`. **Effort: S · Risk: Low · Impact: High**

194. **Focus-loss auto-pause setting** — Allow players to choose whether browser focus loss pauses gameplay, while always preventing stuck held inputs on return. **Wire:** focus events → `GameInputHandler`; toggle in `UserSettings`. **Effort: S · Risk: Low · Impact: High**

195. **Exit waits for active save** — Main-menu/quit transitions should wait for the current save promise, show `FINISHING SAVE`, then continue or expose a failure choice. **Wire:** return actions in `PlaySceneUI` → `_dugTileSavePromise`. **Effort: S · Risk: Medium · Impact: High**

196. **Crash-recovery notice** — If the newest payload fails validation and a backup is loaded, tell the player exactly which backup was used and preserve the corrupt payload for inspection. **Wire:** load fallback in `DugTilesSaveStore`/`SaveBackupManager` → `StartMenuScene` notice. **Effort: M · Risk: Medium · Impact: High**

197. **Save-migration summary** — After a version migration, show one non-alarming line such as `SAVE UPDATED TO V9 • BACKUP KEPT`, once. **Wire:** `normalizePayload()` migration metadata → start/load notification; viewed flag in payload metadata only if needed. **Effort: S · Risk: Low · Impact: High**

198. **Local achievement mirror** — Convert a restrained subset of existing milestones and personal statistics into cosmetic local badges with no currency or gameplay reward. **Wire:** `RetentionProgressSystem` stats/milestones → a badge tab in `MilestonePillarModal`; definitions in `/values/`. **Effort: M · Risk: Low · Impact: Medium-high**

199. **Steam stats and achievement bridge** — If the Steam wrapper is present, mirror already-authoritative local counters and selected local badges; never make Steam availability affect gameplay. **Wire:** `RetentionProgressSystem` snapshot → optional adapter around Steam `ISteamUserStats`; local state remains authoritative. **Effort: M · Risk: Medium · Impact: High**

200. **Steam Auto-Cloud save sync** — Configure the existing save files for Steam Auto-Cloud so the persistent mine follows the player between computers without changing save code. Test developer-only before release. **Wire:** Steamworks Auto-Cloud path configuration → current `DugTilesSaveStore` file location; no gameplay-system dependency. **Effort: XS configuration · Risk: Medium · Impact: High**

## Recommended first wiring wave

The best low-risk first wave is deliberately presentation-heavy:

1. First-contact target snap (#1)
2. Ability multi-break badge (#3)
3. Blocked-hit reason label (#4)
4. Rapid-yield roll-up (#6)
5. Changed-resource HUD pulse (#9)
6. Adaptive aim-outline contrast (#15)
7. Screen-edge text clamping (#16)
8. Jump input buffer (#21)
9. Resume key-release guard (#24)
10. Flight-ready pulse (#36)
11. Exact GP shortfall (#42)
12. Thunder solid-count forecast (#46)
13. Repeated-failure coalescing (#51)
14. Post-sale wallet preview (#61)
15. Remaining-wallet purchase preview (#65)
16. Selection survives redraw (#69)
17. Mine-entrance progress sign (#83)
18. Nearest-portal distance in pause (#92)
19. Pause “You are here” line (#100)
20. Next-choice-level marker (#104)
21. Choice current-bonus comparison (#105)
22. Notification priority lanes (#126)
23. Duplicate notification roll-up (#127)
24. Ability-readiness hint toggle (#60)
25. Save-in-progress icon and timestamp (#176–177)

## Suggested review workflow

- Reply with `1 yes`, `2 no`, and so on; ranges are fine.
- Treat every item as rejected until explicitly approved.
- After review, wire only the smallest coherent group.
- Start with presentation/read-only hooks, then bounded input changes, then save/economy changes.
- Add new persistent fields only when an approved feature cannot derive its state from existing counters.
