# UNDERSTAR: five compact HUD variants

Review concepts, 2026-09-12. Supersedes the previous shop redesign and separate stress-bar proposal. No runtime code was changed.

## Current scope

Redesign the gameplay overlay only. Preserve the current shop UI completely. Fix HUD overlap by controlling overlay visibility/input when the existing shop owns the screen; do not change its artwork, layout, content or transactions.

Stress belongs in the character portrait: readable facial tension plus a progress edge or restrained face overlay and one numeric value. Remove the separate large stress panel and oversized level/oath badges.

## Five options

| Variant | Composition | Main tradeoff |
| --- | --- | --- |
| [1. Corner Ring](../ai-tools/2026-09-12-hud-variant-01-corner-ring.png) | Small bottom-left portrait/vitals, centre actions, right utilities | Closest evolution of the supplied reference; familiar spatial separation. |
| [2. Central Dock](../ai-tools/2026-09-12-hud-variant-02-central-dock.png) | Compact central grouping of portrait, GP, actions and torch | Short eye travel and a clear left edge; needs careful text sizing at smaller viewports. |
| [3. Top Corner](../ai-tools/2026-09-12-hud-variant-03-top-corner.png) | Top-left rectangular portrait and torch; bottom-centre actions | Keeps the lower-left playfield clear, but competes more with upper scenery. |
| [4. Split Slim](../ai-tools/2026-09-12-hud-variant-04-split-slim.png) | Slim left vitals/torch, right actions; open lower centre | Most open lower centre; eyes travel farther between vitals and actions. |
| [5. Portrait Centre](../ai-tools/2026-09-12-hud-variant-05-portrait-centre.png) | Portrait between two groups of three actions; separate torch slider | Stress stays near abilities; slider gives direct mouse adjustment. |

Preferred starting points: 1 for continuity with the requested reference, 2 for compact grouping, or 4 for an unobstructed lower centre. These are design judgments, not playtest results.

## Shared portrait rules

- Final layout target: portrait approximately 48–56 logical pixels at 1280x720, with capped scaling on larger screens. Include its frame in that budget; no oversized crest behind it.
- Same character identity and crop in every stress state. Calm: neutral expression. Warning: tense brow, pale skin and sweat. Critical: stronger eye shadows and restrained red stress shading. Keep eyes and facial silhouette readable.
- Pair face changes with an edge trace or ring plus one numeric stress value, so the player need not interpret an expression alone.
- Ring/trace is empty at zero, fills proportionally with authoritative stress, and changes warning/drain/critical treatment at the existing 55/65/80 thresholds.
- Keep the portrait at exactly the same size as stress changes. Avoid swelling badges, large flashes or constant shaking. Reduced motion retains the face, number and static edge.
- GP remains the separate violet survival bar. Level and one-life status use tiny readable text, not additional large badges.
- Portrait art in these generated concepts is illustrative. Production requires matching the actual approved character and generating consistent calm/warning/critical portrait frames.

## Torch: clear wheel and mouse-only controls

All five options visibly show `ON`, `100%`, separate minus/plus buttons, `LESS`/`MORE` captions, and `SCROLL ↑ MORE · ↓ LESS`. Variant 5 additionally shows a draggable slider. These are visual mockups, not working controls yet.

1. Scroll up increases torch intensity; scroll down decreases it. Keep this instruction visible in compact form. The existing control already maps wheel direction this way.
2. Clicking LESS or MORE calls the same authoritative intensity-adjustment action as the wheel. Do not require cycling through presets to reach a lower value. Keyboard input is optional for this operation.
3. Clicking the torch flame toggles its on/off state without conflating toggle and intensity. Keep the selected percentage visible while off so the next on-state is predictable.
4. Retain existing configured range, step and GP costs. Current light config defines a 1–200% intensity range; values above 100% should clearly identify overdrive on focus. Do not change the cost curve.
5. Use at least 32x32 logical-pixel click targets around the small authored buttons; labels must not overlap the GP bar or portrait. Disable the appropriate button at a limit.
6. Torch clicks must not mine, attack or activate an ability beneath the UI. Suppress torch wheel adjustment while shop, inventory, menu or another modal owns input; their own scroll behaviour wins. Preserve gameplay wheel scope unless a deliberate change is chosen.
7. Variant 5's slider uses the same intensity state/action and supports dragging; its percentage and endpoint buttons stay visible. A slider is additional to the wheel and buttons.

Current source evidence: `systems/visual/TorchIntensityControl.js` registers a wheel handler mapping negative delta to +1 and positive delta to -1; its existing pointer click calls a cycle callback. The proposed explicit LESS/MORE controls replace ambiguity in that interaction. No code or binding changes were made for these mockups.

## Overlay priority

While the existing shop owns input, hide the gameplay overlay, portrait stress treatment, action hit targets and merchant prompt for the complete open/close transition. Reuse the existing modal input-priority ownership. Do not modify the shop design. Confirm current simulation pause behaviour before hiding any progressing danger signal.

## Review limits and next implementation checks

The five full-scene images share an illustrative stress value of 68 and torch value of 100% to compare placement. The town scene does not claim that these values are a naturally occurring live snapshot. Generated ring fills, sample shortcuts, facial details and exact dimensions are visual studies; final Phaser rendering must calculate exact values and use actual bindings.

Inspect at 1280x720 and 1920x1080, enlarged text, reduced motion and narrow layouts. Check zero/warning/draining/critical stress, both wheel directions, button-only adjustment, torch toggling, intensity limits, and modal open/close input isolation. Verify no large portrait/badge returns in danger states and no overlap with the unchanged shop. No gameplay tuning, combo timing or save-state changes are in scope.
