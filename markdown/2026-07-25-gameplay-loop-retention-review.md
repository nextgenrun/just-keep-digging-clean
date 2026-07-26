# Gameplay Loop and Retention Review

**Date:** 2026-07-25
**Status:** Implemented and contract-tested on 2026-07-26 after the requested pre-implementation Git checkpoint.

## Goal

Increase the feeling of “one more dig” with low-effort, low-risk improvements that make existing digging, discovery, progression, selling, upgrading, and returning underground feel better. Avoid manipulative retention systems, unnecessary currencies, or changes that make the current controls and economy harder to understand.

## Locked decisions

1. **Routine level-ups stay in flow.** Normal level gains should use compact, non-blocking feedback. Authored milestone levels still stop for their existing reward choice.
2. **Combo decay remains exactly as it is.** Do not change its duration, timing, or decay rules. Add restrained GP-restoration checkpoints to the combo, award only a small amount of GP, and show the next GP boost subtly in the UI. It must feel like a nice extra, not a required GP engine.
3. **Add a contextual next-promise HUD.** Surface one useful nearby goal, unlock, reward, or discovery without turning the HUD into a checklist.
4. **Make authored chests meaningful.** A chest grants a 20-second ultra-fast critical-damage buff and money, with an occasional star. Chests do not become a broad random-loot system.
5. **Make rich, packed, and ancient material rolls readable.** Players should immediately recognize that they found an unusually valuable block.
6. **Add a personal-best depth chase.** Make approaching, matching, and beating the player’s record clear and satisfying.
7. **Extend surprise cadence into Level 2.** Deep play should continue producing authored-feeling discoveries instead of becoming a long stretch of only ordinary resources and caves.

## Non-negotiable guardrails

- Do not alter combo decay or combo timing.
- GP restoration must remain small, occasional, and clearly communicated.
- Keep milestone reward choices interactive.
- Chest contents remain money plus an occasional star; the temporary combat/digging payoff is the fixed 20-second critical-damage speed buff.
- Do not add daily streaks, login punishment, offline income pressure, loot boxes, forced losses, or another permanent currency.
- Implement only the approved candidates recorded below.

## Rating key

- **Effort:** XS = tiny hook/polish pass, S = small system/UI change, M = small feature with new state.
- **Risk:** Very low = presentation/read-only state, Low = limited gameplay interaction, Medium = requires careful input, save, or economy validation.
- **Impact:** Estimated player-facing value if executed cleanly.

## 50 additional candidates, ranked by expected return

1. **Hollow-wall knock** — When a player is one block away from a cave or air pocket, add a faint hollow impact layer. It creates a powerful “there is something behind this” moment using information the world already knows. **Effort: XS · Risk: Very low · Impact: High**
2. **Ore-vein echo** — Breaking a resource briefly glints directly adjacent blocks of the same resource. This encourages “one more block” without revealing an entire vein or adding a scanner. **Effort: S · Risk: Low · Impact: High**
3. **Final-hit cue** — Make a tile look and sound clearly ready to break when the next normal hit will destroy it. This removes uncertainty and makes every last strike more satisfying. **Effort: XS · Risk: Very low · Impact: High**
4. **Compact tile-durability pips** — Show two to five tiny segments near the aimed block instead of a large number or intrusive health bar. Only show them while actively targeting a durable block. **Effort: S · Risk: Very low · Impact: High**
5. **Distinct critical-hit identity** — Give critical hits one unmistakable color, sound, impact shape, and floating-text treatment. The player should recognize a crit before reading a number. **Effort: XS · Risk: Very low · Impact: High**
6. **GP action pips** — Near the GP meter, show how many Quickslashes or Thunder Strikes the current GP can fund. This converts an abstract bar into an immediate action promise. **Effort: S · Risk: Very low · Impact: High**
7. **Hits-to-break shop comparison** — Upgrade cards should show the practical result at the player’s current depth, such as “3 hits → 2 hits,” not only a percentage increase. **Effort: S · Risk: Very low · Impact: High**
8. **Upgrade breakpoint badge** — Highlight any purchase that will cross a real hits-to-break threshold for the current material band. This makes the best purchase obvious without changing balance. **Effort: S · Risk: Very low · Impact: High**
9. **Cargo sell-value preview** — Show the estimated money value of the current inventory before the player returns to the seller. This gives every extra resource a visible purpose. **Effort: XS · Risk: Very low · Impact: High**
10. **Expedition return summary** — On returning to town, briefly show depth gained, sell value carried home, best material found, stars found, and notable discoveries. Keep it compact and instantly dismissible. **Effort: S · Risk: Very low · Impact: High**
11. **Previous-haul comparison** — Add one positive comparison to the expedition summary, such as “18% more value than last trip” or “12m deeper.” Avoid negative scolding. **Effort: S · Risk: Very low · Impact: Medium-high**
12. **Welcome-back snapshot** — On loading a save, show where the player was, their nearest meaningful goal, and one suggested action. Do not use a generic welcome modal. **Effort: S · Risk: Very low · Impact: High**
13. **Deepest-portal quick resume** — Offer one clear action in town to resume from the deepest activated safe portal. Preserve the normal portal selection for players who want it. **Effort: S · Risk: Low · Impact: High**
14. **Remember the last portal choice** — Preselect the last-used portal, falling back to the deepest safe portal. This removes repeated menu work without removing choice. **Effort: XS · Risk: Very low · Impact: Medium**
15. **Meaningful portal labels** — Label destinations with depth and nearby material/region information rather than generic numbering alone. **Effort: S · Risk: Very low · Impact: High**
16. **Portal destination preview** — Before interaction, show the exact destination and depth in the prompt. No surprise teleport or memorization required. **Effort: XS · Risk: Very low · Impact: High**
17. **Teleporter proximity hum** — Give nearby teleport anchors a positional hum that strengthens slightly with proximity. This supports exploration and fixes the feeling that useful devices are visually present but acoustically dead. **Effort: XS · Risk: Very low · Impact: High**
18. **Portal activation ceremony** — The first activation of a portal gets a short pulse, sound, and “new return route unlocked” message. Repeat use stays fast and quiet. **Effort: S · Risk: Very low · Impact: Medium-high**
19. **Cave-breach moment** — When the player first opens a wall into a cavity, trigger a brief air/dust pull, sound change, and small discovery label. Reward discovery without interrupting movement. **Effort: S · Risk: Low · Impact: High**
20. **Geode resonance** — Nearby geodes emit a subtle pulse or crystalline resonance that becomes clearer at close range. It should create curiosity, not act as a precise locator. **Effort: S · Risk: Very low · Impact: High**
21. **Material-transition forecast** — A few meters before a new depth/material band, briefly tease what is coming: “Dense strata below” or a small material silhouette. **Effort: S · Risk: Very low · Impact: High**
22. **First-discovery material card** — The first time a material is found, show a small skippable card with its name, value, and why it matters. Never repeat it for that save. **Effort: S · Risk: Very low · Impact: Medium-high**
23. **Undiscovered inventory silhouettes** — Show muted silhouettes for material types not yet discovered so the collection has visible future promises without revealing exact locations. **Effort: S · Risk: Very low · Impact: Medium**
24. **Sky-star pickup progress** — On pickup, immediately say which constellation progress changed, such as “Stone Star 4/5.” This is event feedback, separate from the persistent next-promise HUD. **Effort: XS · Risk: Very low · Impact: High**
25. **Relic purpose text** — A relic pickup should state the exact constellation, unlock, or collection it advances. Remove “mystery” caused only by missing information. **Effort: XS · Risk: Very low · Impact: High**
26. **Closest constellation auto-focus** — At the Star Pillar, initially focus the nearest incomplete constellation while preserving manual browsing. **Effort: XS · Risk: Very low · Impact: High**
27. **Nearest milestone highlight** — The milestone screen should softly highlight the closest unfinished milestone and show its exact remaining requirement. **Effort: XS · Risk: Very low · Impact: Medium-high**
28. **Seller direction hint** — While at the surface with valuable unsold cargo, show a subtle directional nudge toward the seller. Hide it once the player knows the route or has no cargo. **Effort: S · Risk: Very low · Impact: Medium**
29. **Ability-teacher breadcrumb** — When Quickslash or Thunder Strike is unlockable or newly affordable, give Bobo a restrained world-space indicator. It disappears permanently once no longer useful. **Effort: S · Risk: Very low · Impact: High**
30. **Three-step first-run contract** — Teach the economic loop with one compact chain: mine a small amount, sell it, then buy one upgrade. No permanent quest system is required. **Effort: M · Risk: Low · Impact: High**
31. **Affordable-upgrade NPC cue** — A merchant gets a small exclamation only when a meaningful upgrade is affordable. Its tooltip should state the exact blocker when it is not affordable. **Effort: S · Risk: Very low · Impact: High**
32. **Affordable upgrades first** — Within each existing shop category, sort immediately affordable upgrades above locked ones while preserving category structure and player choice. **Effort: XS · Risk: Very low · Impact: Medium**
33. **First-hit-after-upgrade payoff** — The first dig after buying a power upgrade gets a short “stronger!” treatment if the damage increase is observable. It demonstrates value instead of merely reporting a stat. **Effort: XS · Risk: Very low · Impact: Medium**
34. **Heavy Punch impact preview** — Before committing, lightly preview the extra rear tile or affected area so the ability feels tactical rather than unpredictable. **Effort: S · Risk: Low · Impact: High**
35. **Thunder Strike footprint preview** — While charging, show a restrained footprint of the tiles that will be hit. It makes the charge itself an anticipation moment. **Effort: S · Risk: Low · Impact: High**
36. **Quickslash route and GP preview** — Show the intended slash direction and GP cost for a fraction of a second around activation. Keep it fast enough that it does not slow expert play. **Effort: S · Risk: Low · Impact: High**
37. **One-action input buffer** — If an ability is pressed just before it becomes valid, remember that single press briefly and fire when valid. Never queue movement or multiple actions. **Effort: S · Risk: Low · Impact: High**
38. **Stable held-direction targeting** — While repeatedly digging the same face, resist one-frame target flicker caused by tiny direction changes. Release the latch immediately when the player clearly redirects. **Effort: S · Risk: Low · Impact: Medium-high**
39. **Overkill shatter treatment** — When damage greatly exceeds remaining durability, use more debris, a sharper crack, and a stronger but short impact. Do not add extra rewards. **Effort: XS · Risk: Very low · Impact: Medium**
40. **Material sound ladder** — Give stone, metal-rich blocks, crystals, and ancient blocks recognizable impact families with small pitch variation. Better audio variety raises perceived depth without new mechanics. **Effort: S · Risk: Very low · Impact: Medium-high**
41. **Lucky-drop identity** — When a bonus or lucky resource roll occurs, animate the extra item as a clearly separate pickup into the inventory. The player should know luck happened. **Effort: XS · Risk: Very low · Impact: Medium**
42. **Personal statistics journal** — Track tiles broken, resources sold, stars found, chests opened, highest combo, portals activated, and earthquakes survived. Use existing counters where available. **Effort: M · Risk: Very low · Impact: Medium-high**
43. **Save-card progress snapshot** — Save selection cards should show player level, current/best depth, wallet, stars, and last-played time so each save feels like a continuing journey. **Effort: S · Risk: Very low · Impact: High**
44. **Reactive NPC lines** — Let merchants comment once on major depth records, first rare materials, first chest, first star, and major milestones. Reuse existing dialogue presentation. **Effort: S · Risk: Very low · Impact: Medium-high**
45. **Discovery journal** — Record found cave/geode types and broad depth bands. Show completion by category, but do not provide a full navigational map. **Effort: M · Risk: Low · Impact: Medium**
46. **Trapped-state portal compass** — When the existing trapped/recovery logic activates, pulse toward the nearest reachable teleporter or safe return option. Never display during normal play. **Effort: S · Risk: Low · Impact: High**
47. **Earthquake passage highlight** — For a few seconds after an earthquake, softly mark newly opened passages visible on screen. This turns aftermath into an immediate exploration invitation. **Effort: S · Risk: Low · Impact: Medium-high**
48. **Earthquake recap** — After the danger passes, show a tiny recap of intensity, distance endured, and passages opened. Do not attach money or mandatory economy rewards. **Effort: S · Risk: Very low · Impact: Medium**
49. **Campfire expiration cue** — Give campfire buffs a clear ten-second warning and a final visual/audio fade so the loss of power never feels unexplained. **Effort: XS · Risk: Very low · Impact: Medium**
50. **Optional expedition objective** — At the surface, offer one session-only objective such as “collect 20 stone” or “reach 25m deeper” for a small money reward. It expires without punishment and never becomes a daily streak. **Effort: M · Risk: Low · Impact: High**

## Review decisions

**Approved:** 33
**Rejected:** 17

| Candidate | Decision | Required interpretation |
|---|---|---|
| 1 | Rejected | Do not add hollow-wall audio. |
| 2 | Rejected | Do not add ore-vein echo highlighting. |
| 3 | Approved | Add the final-hit cue. |
| 4 | Rejected | Do not add compact durability pips. |
| 5 | Approved | Add a distinct critical-hit identity. |
| 6 | Rejected | Do not add GP action-count pips. |
| 7 | Approved | Add hits-to-break comparisons in the shop. |
| 8 | Approved | Add upgrade breakpoint badges. |
| 9 | Approved | Add cargo sell-value preview. |
| 10 | Approved | Show the expedition summary when returning to town and allow the player to disable it. |
| 11 | Approved | Add a positive previous-haul comparison. |
| 12 | Approved | Add the welcome-back snapshot. |
| 13 | Approved | Add deepest-portal quick resume and include Level 2 portals in its selection logic. |
| 14 | Rejected | Do not remember or preselect the last portal choice. |
| 15 | Approved | Add meaningful portal labels. |
| 16 | Rejected | Do not add the separate portal destination prompt preview. |
| 17 | Rejected | Do not add a teleporter proximity hum. |
| 18 | Approved | Add a first-activation portal ceremony. |
| 19 | Rejected | Do not add the cave-breach moment. |
| 20 | Rejected | Do not add geode proximity resonance. |
| 21 | Rejected | Do not add material-transition forecasts. |
| 22 | Approved | Add first-discovery material cards and allow the player to disable them. |
| 23 | Approved | Add undiscovered inventory silhouettes. |
| 24 | Approved | Add immediate sky-star constellation progress feedback. |
| 25 | Approved with audit | Add exact relic-purpose feedback, but first audit and complete the relic implementation because it appears unfinished. |
| 26 | Rejected | Do not auto-focus the closest constellation. |
| 27 | Approved | Highlight the nearest unfinished milestone. |
| 28 | Rejected | Do not add a seller direction hint. |
| 29 | Rejected | Do not add an ability-teacher breadcrumb. |
| 30 | Approved | Add the compact three-step first-run contract. |
| 31 | Rejected | Do not add the affordable-upgrade NPC cue. |
| 32 | Rejected | Do not reorder shop upgrades by affordability. |
| 33 | Approved | Add the first-hit-after-upgrade payoff. |
| 34 | Approved | Add the Heavy Punch impact preview. |
| 35 | Approved | Add the Thunder Strike footprint preview. |
| 36 | Approved | Add the Quickslash route and GP preview. |
| 37 | Approved | Add a tightly bounded one-action ability input buffer. |
| 38 | Approved | Stabilize held-direction mining targets. |
| 39 | Approved | Add overkill shatter feedback without extra rewards. |
| 40 | Rejected | Do not add the proposed material sound ladder. |
| 41 | Approved | Add unmistakable lucky-drop feedback. |
| 42 | Approved | Add the personal statistics journal and surface it through the Milestone Pillar. |
| 43 | Approved | Add save-card progress snapshots. |
| 44 | Rejected | Do not add reactive NPC dialogue. |
| 45 | Approved | Add the discovery journal. |
| 46 | Approved | Add the trapped-state portal compass. |
| 47 | Approved | Briefly highlight passages opened by an earthquake. |
| 48 | Approved | Add the compact earthquake recap without economy rewards. |
| 49 | Approved | Add campfire expiration feedback. |
| 50 | Approved | Add one optional session-only expedition objective with no streak or failure punishment. |

## Best first-pass shortlist from the new 50

If the aim is the smallest safe implementation with the broadest immediate benefit, start review with:

1. Final-hit cue
2. Distinct critical-hit identity
3. Hits-to-break shop comparison
4. Upgrade breakpoint badge
5. Cargo sell-value preview
6. Expedition return summary
7. Welcome-back snapshot
8. Deepest-portal quick resume, including Level 2
9. First-discovery material card with its disable option
10. First-hit-after-upgrade payoff

These approved items improve moment-to-moment digging, clarify the value of progression, and shorten the return-to-fun path without adding a new economy or changing combo decay.

## Existing correctness checks before wiring

These are not part of the 50 feature candidates. Verify or repair them before retention features depend on them:

1. Confirm milestone choice rewards survive every later bonus recalculation.
2. Confirm level-gated shop upgrades read the real `PlayerLevelSystem` level.
3. Confirm XP requirements and rewards use one authoritative level configuration rather than a fallback formula.

## Implementation outcome

The approved scope is now wired through the existing persistent mine rather than a new game mode or parallel progression layer.

- Routine level-ups stay non-blocking; every fifth-level authored choice remains interactive and now persists through later bonus recalculation.
- Combo duration remains the original `6000ms`. Only the small GP checkpoints and subtle “next GP” HUD copy were added.
- The next-promise HUD prioritizes temporary chest power, the first-run loop, personal-depth-record chase, the optional session objective, quick resume, and the nearest depth milestone.
- Existing authored chest tiles now open once, persist as opened, pay money, have a deterministic occasional-star roll, and grant exactly `20000ms` of ultra critical-damage power.
- Rich, packed, and ancient blocks expose their deterministic rarity identity in mining feedback.
- Final-hit, crit, lucky-drop, overkill, Heavy Punch, Thunder Strike, Quickslash, buffered-input, and stable-target feedback are presentation/input affordances only; overkill does not grant extra rewards.
- Expedition summaries, positive previous-run comparisons, the welcome-back snapshot, cargo value, save-card snapshots, and first-discovery cards reuse existing save/economy state. The requested summaries and discovery cards have gameplay-setting toggles.
- Activated Level 1 and Level 2 portals participate in deepest-safe quick resume, meaningful labels, first-activation celebration, and trapped-state guidance.
- Stars and relics now report exact constellation progress. Relic caches are present in both levels, persist through the existing save payload, and gate the configured constellations.
- The Milestone Pillar now owns the nearest-milestone highlight plus Miner Statistics and Discovery Journal tabs.
- Earthquake aftermath records and highlights newly opened passages, shows a no-reward recap, and points to the nearest activated portal only during the existing trapped state.
- Campfire blessings warn at ten seconds and finish with a clear visual/audio fade.
- One session objective is offered without streaks, failure punishment, offline pressure, or another permanent currency.

Validation is anchored by `testing/2026-07-26-retention-systems-contract.mjs`, alongside the existing core-state and save/world contracts.

## Review workflow

- Use the decision table above as the implementation boundary.
- Convert only approved items into a small implementation order.
- Wire the lowest-risk presentation and feedback hooks before adding persistent state.
- Validate each feature in the real gameplay loop and keep tuning values configurable.
