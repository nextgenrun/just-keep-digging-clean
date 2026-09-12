# UNDERSTAR: compact Ravenswatch HUD proposal

Date: 2026-09-12. Status: design and mockups for review; no runtime changes.

**Superseded design scope:** The user's follow-up excludes all shop UI redesign, moves stress into a smaller portrait, and requires explicit scroll guidance plus mouse-only LESS/MORE torch buttons. [The five-variant revision](2026-09-12-hud-five-variants.md) is the current design brief and takes precedence over the original proposal below. The old shop mockup and shop geometry are withdrawn from scope. Existing shop appearance, content and layout remain unchanged; only HUD overlay visibility around it is relevant.

## Direction

Closely reproduce the supplied Ravenswatch screenshot's composition and visual treatment: bottom-left vitals, bottom-centre six actions, restrained corner utilities, one top-right objective, fine antique-metal edges and painted dark silhouettes. Adapt the information to UNDERSTAR's existing mechanics and artwork. Keep the side-view mining world, player and merchant identities.

The central playfield and upper-left scenery should be clear. GP and stress are the primary survival information. XP, money and navigation are secondary. A shop becomes the sole interface while it is open.

## Review images

- [Exploration layout](../ai-tools/2026-09-12-ravenswatch-hud-concept.png)
- [Shop layout](../ai-tools/2026-09-12-ravenswatch-shop-concept.png)
- [Stress states](../ai-tools/2026-09-12-ravenswatch-stress-concept.png)

These are generated art-direction mockups using real game screenshots as references, not pixel-preserved screenshots or a tested Phaser implementation. Text values, portrait rendering, bindings and fill geometry are illustrative. The stress detail board supersedes the exploration image's ambiguous gold label backing: at zero stress the entire fill track must be empty. Final art needs the actual approved character portrait and ability icons; real bindings, balances and progression values remain dynamic.

## Evidence and current problems

Inspected the user-provided Ravenswatch screenshot, the saved 1920x1080 UNDERSTAR capture `testing/2026-09-10-f9-broad-after.png`, the shop capture `testing/2026-09-07-bed-scale-ui-evidence/03-shop-owns-ui.png`, and current source. The saved captures are dated evidence, not a fresh live reproduction.

1. The player core, tutorial and Hardcore panel occupy a tall left-hand column. Large navigation plaques also compete with scenery across the top.
2. A separate wide XP panel takes the most useful action-bar location. Money, events and inventory create additional isolated visual anchors.
3. Stress already exists. `HardcoreModeSystem` exposes `stress`, `stressRatio`, `stressBand` and GP drain. Current status presentation instead foregrounds inverse sanity and explanatory text.
4. `HardcoreStatusHud` uses a fixed 336x56 panel at (180,234), depth 3601. The panic banner is depth 3602; `ShopOverlay` uses depth 3000. If visibility suppression fails, these signals can render over the shop.
5. Current code already has suppression: Hardcore checks `hasUiInputPriority(scene)`, and `UiModalShell.show()` acquires that priority. The reported overlap therefore needs a live reproduction across open/close and pause paths; it is not evidence that suppression is absent. Strengthen ownership rather than only moving coordinates or raising the shop depth.

## Complete information layout

| Existing element | New location and behaviour |
| --- | --- |
| GP / survival | Bottom left; largest number and violet bar. No invented HP resource. |
| Hardcore / one life | Small oath or skull badge next to portrait, with `1 LIFE`; detailed rules on focus. |
| Stress / sanity banner | Direct stress track below GP; number, threshold ticks and trend. Remove routine inverse sanity copy. |
| Player level / XP | Diamond level badge and thin XP line integrated into vitals. Exact XP on focus; brief gain feedback. |
| Pickaxe / damage | Small equipped-tool icon; damage and equipment details on focus or inventory. No giant pickaxe panel. |
| Torch intensity | Tiny torch control immediately above vitals; on/off plus intensity. Preserve click/scroll, bindings and 1–200% range. |
| Depth | Short metre count beside torch. Depth hazard boundary stays in the world. |
| Active abilities | Six consistent bottom-centre wells in current saved order. Real keycaps, cooldown masks and unavailable states. |
| Passive buffs | Up to three small chips immediately above the action row; remaining effects under a focusable `+N`. Timers remain legible. |
| Combo | One temporary number and existing decay indicator above the action row, replacing that area's ordinary chips while active. No timing or gameplay change. |
| Money / Star currency | Small bottom-right icon-and-number row. Full materials and large balances in inventory/shop. |
| Bag / map / menu | Three compact controls at bottom right; keep existing shortcuts and controller equivalents. |
| Wiki / audio / events | Wiki and audio in the menu. Events in the map/menu with a small unread marker; preserve F2 access. |
| Tutorial / next promise / quest | A single top-right tracker, maximum two text lines plus optional progress. Explicit tutorial step takes priority over optional goal. |
| Merchant interaction | One short nearby interaction prompt; disappears before the shop entrance transition. |
| Target-tile information | Local to the target, on demand. Avoid permanent large stat panels. |
| Pickup / reward / level-up | Brief shared notification lane above actions. Consolidate repeated pickups; milestone choices remain interactive. |

Abilities remain Quick Slash, Thunder Strike, Wayward Star, Hollow Sun, Stellar Lance and Campfire. Preserve saved ordering and real unlock conditions. Mockup keys 1–6 are layout examples, not a requested remapping. Hidden abilities must not cause neighbouring keys to shift; locked wells stay quiet.

## Geometry and screen-space budget

Proposed reference geometry at 1280x720, measured in logical pixels. Coordinates are top-left. These are implementation targets, not measurements of generated art.

| Region | x | y | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| Vitals including torch/depth | 16 | 592 | 304 | 112 |
| Six actions | 440 | 634 | 400 | 70 |
| Currency and utilities | 1000 | 648 | 264 | 56 |
| Objective | 1000 | 16 | 264 | 66 |

These four bounding rectangles total 94,256 pixels, about 10.2% of a 1280x720 viewport. Target no more than 11% persistent HUD bounding area in ordinary play and 14% with routine transient feedback. This is a budget to verify, not a claimed measured improvement. Transparent ornament must stay inside its region. Do not add an opaque full-width footer.

Use 16px safe margins, 14px primary numbers and at least 12px secondary copy at the reference size. Keep click/focus bounds usable even when art is visually smaller. Tooltips open inward from the edge and clamp to safe bounds. Long/localized copy wraps within a reserved region; it must not grow into another region.

At 1920x1080 preserve corner anchors and cap artwork scaling rather than stretching every element by 1.5. Extra space belongs to the world. At 1024px width use compact vitals, shorter currency formatting and icon utilities while retaining six stable actions. Below 900px available width, use an explicit two-row action layout and simplified utilities; do not shrink all text until unreadable. Test large UI/text settings independently. Ultra-wide screens must not place essential signals outside a comfortable visual span; offer a centred safe-area option.

## Stress meter contract

Read the existing authoritative snapshot. Display `STRESS n / 100`; fill from empty to full as danger increases. At zero, no coloured fill. Never render both stress and inverse sanity as competing gauges.

| Range | Appearance | Information |
| --- | --- | --- |
| 0–54 | Quiet pale-gold fill | Numeric amount; cause/recovery on focus. |
| 55–64 | Amber + warning mark | Warning. Brief `Find light` when appropriate. |
| 65–79 | Orange + drain marker | Show actual stress GP drain; 65 is a distinct mechanical breakpoint. |
| 80–100 | Vermilion + critical mark | Critical; actual drain and one short actionable cause/recovery cue. |

Ticks at 55, 65 and 80 come from `values/hardcoreMode.js`. Expose their meaning on hover/focus. The 86-stress example drains 12 GP/s under the current formula: `3 + ((86 - 65) / 35) * 15`. Runtime must consume the system's computed rate rather than duplicate that calculation in the view.

Use number, fill, icon and label together so colour is never the only signal. A rising/falling/steady indicator comes from the net stress-change rate, with a small presentation deadband to prevent jitter. Cause text follows real sources: darkness, rapid descent, deep pressure or recovery near light. Do not promise recovery that the current snapshot does not support.

Keep the meter's geometry fixed at critical. One restrained rim pulse or existing audio cue may mark a threshold; reduced motion removes pulsing. Consolidate the current large panic banner into the meter and shared warning lane. Keep world danger cues readable; any reduction of existing panic effects must remain a presentation-only choice and receive gameplay QA.

Casual mode has no misleading one-life badge or active stress threat. Pending Hardcore shows `Starts with Flight`; armed Hardcore shows `1 LIFE`. GP approaching zero must remain visibly distinct from high stress because other existing hazards can also consume GP.

## Shop and modal ownership

The shop-open concept hides exploration HUD, objectives, ability interaction, merchant prompts, routine toasts, Hardcore status and panic chrome. Wallet and purchase requirements are shown inside the shop. The reference shop content remains intact: selected upgrade, current/next values, price, milestone requirement, disabled reason, sell tab and navigation.

Reuse `UiModalShell` and the existing scene input-priority registry. Acquire ownership before the first visible shop frame and release only after the final close-transition frame. Ensure suppression is synchronously applied on open, not dependent on an update that might stop while paused. Cover rapid reopen, nested confirmation, resize and destroy. Restore only views that are still eligible after closing.

Keep gameplay HUD below modal depth as a secondary safeguard. A high depth is never a substitute for hiding and disabling the HUD. Hide hit targets and focus along with art; shop input must not activate abilities or move the player underneath.

Verify existing simulation pause/stress behaviour during shop ownership. Do not hide an actively progressing lethal condition: if a path allows hazards to continue, resolve its existing modal pause contract or retain a minimal live vitals strip outside shop bounds. Do not silently introduce immunity or change stress recovery as part of the art refactor.

Desktop shop target is approximately 1120x680 at 1920x1080; at 1280x720 fit approximately 960x600. Use an upgrade-list/detail split around 34/66, internal scrolling and one footer. On narrow layouts switch to list/detail navigation with a clear Back control. Reserve readable room for localized prices and failure messages.

## Implementation sequence

1. Reproduce the reported overlap in current local gameplay: calm and critical Hardcore, each merchant, open/close transitions, resize and nested confirmation. Capture baseline rectangles and screenshots.
2. Extend existing layout values and authored HUD owners. Consolidate vitals/XP, move actions, shrink navigation and give the objective lane one owner. Avoid creating a new general UI framework.
3. Generate/approve final transparent frames and portrait/icon art. Build visible presentation in Phaser; keep runtime numbers, bindings, fills and focus states live. Mockup lettering is not a runtime atlas.
4. Add the stress view using the existing Hardcore snapshot and configured thresholds. Preserve stress, GP, combo, cooldown, unlock, save and difficulty rules.
5. Apply shared modal visibility and input ownership to HUD components, merchant prompts and transient feedback. Reuse existing lifecycle hooks and clean up listeners/tweens.
6. Validate the full state/viewport matrix and compare occupancy against the baseline before deciding on release.

Likely existing owners: `values/approvedHudSkin.js`, `values/hudLayout.js`, `values/celestialActionBar.js`, `values/hardcoreMode.js`, `values/hardcorePanicPresentation.js`, `systems/visual/ApprovedHudSkin.js`, `systems/visual/HUDSystem.js`, `systems/visual/HardcoreStatusHud.js`, `systems/visual/HardcorePanicOverlay.js`, `systems/visual/ApprovedHudBuffView.js`, `ui/UiModalShell.js`, `ui/overlays/ShopOverlay.js` and the relevant `world/playScene` presentation bridges. Confirm each active owner before edits.

## Acceptance checks for implementation

- 1920x1080, 1280x720, 1024x768, ultra-wide and narrow layout; normal and enlarged text/UI.
- Stress 0, 54, 55, 64, 65, 79, 80 and 100; increasing, stable and recovering; GP low/empty; Casual, pending and armed Hardcore.
- Zero HUD/shop intersections or surviving HUD hit targets throughout open, close, reopen and nested-dialog transitions.
- All six actions, locked states, cooldowns, rebound keys, controller focus, inventory, torch control and event access remain usable.
- Stress fill endpoints and threshold ticks match exact configured values; warning copy matches actual sources and drain.
- Long currency values and translated copy fit; subtitles, tutorial, combo and rewards respect their reserved lanes.
- Runtime checks confirm unchanged gameplay timing/state and clean lifecycle/console. Browser proof uses a test save or `?jkd_e2e=1`.

## Web research

- [Passtech's official Ravenswatch page and screenshot gallery](https://www.passtechgames.com/ravenswatch/): primary developer source and gallery discovery.
- [Official Steam listing](https://store.steampowered.com/app/2071280/Ravenswatch/): developer/publisher listing describes dark fantasy combined with comic-book styling, supporting the painted direction.
- The supplied screenshot is the direct visual source for the layout analysis. The Ravenswatch homepage returned HTTP 403 and two gallery-image fetches failed in the web tool; no extra unseen screenshots are claimed as analysed.

Deliverables were visually inspected for hierarchy, shop isolation, content and stress-state legibility. Generated art is illustrative; runtime geometry, overlap correction and behavioural tests remain future implementation work.
