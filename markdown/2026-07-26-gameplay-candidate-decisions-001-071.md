# Gameplay Candidate Decisions 001–071

**Recorded:** 2026-07-26  
**Status:** Design review in progress; no runtime wiring from this decision pass  
**Numbering source:** The recovered original 200-item gameplay/retention candidate list. This is not the later visual-only renumbering.

## Non-negotiable quality direction

- Prefer moving, world-anchored, material-aware visuals over more persistent HUD.
- No placeholder art, developer-tool boxes, generic HTML/CSS-looking panels, or always-visible explanatory clutter.
- New feedback must match the existing obsidian, gunmetal, weathered-gold, cyan, and violet visual language.
- Subtle effects should earn their screen time, communicate one thing, and clear quickly.
- Preserve existing controls. Any numeric ability shortcuts are secondary aliases, never replacements.
- Review the ability bar and final-hit treatment as still images before any production wiring.

## Rollback contract for later implementation

The two PNGs produced during this pass are review assets only. They do not modify gameplay or production UI.

Before any approved item is wired:

1. Record the current Git commit, active branch, dirty-file state, and hashes of every file the slice will touch.
2. Make a scoped pre-playtest checkpoint without staging unrelated user work. Never use `git add -A`, a hard reset, or a broad checkout.
3. Implement in small independent slices:
   - mining impact and rewards;
   - camera and movement;
   - ability feedback and ability bar;
   - shop feedback;
   - audio coverage.
4. Give risky presentation systems a central config gate in `/values/` so they can be disabled immediately after a playtest without deleting code.
5. Keep one focused commit per slice. A rejected slice must be removable with a normal Git revert, without reverting approved slices.
6. Save the validation evidence and the exact files changed beside each slice before it is considered playtest-ready.
7. After approval, make a separate promotion commit. Until that point, mockups remain `reviewOnly: true` and `productionChanged: false`.

## Decisions

| # | Candidate | Decision | Required interpretation |
|---:|---|---|---|
| 1 | First-contact target snap | **Unresolved** | No yes/no answer was supplied. Do not wire. |
| 2 | Break follow-through trail | **Approved** | Keep brief, material-aware, and world-anchored. |
| 3 | Ability multi-break badge | **Approved** | Avoid a permanent HUD element; show only on the relevant action. |
| 4 | Blocked-hit reason label | **Approved** | Use concise contextual feedback that disappears quickly. |
| 5 | Miss and blocked-hit separation | **Approved** | Make miss and blocked contact visually distinct without adding a panel. |
| 6 | Rapid-yield roll-up | **Approved with quality gate** | Must look like premium native game feedback, never placeholder or low-quality HTML. |
| 7 | Jackpot count-up | **Approved** | Use strong motion and timing, then clear the screen quickly. |
| 8 | Yield-scaled pickup arc | **Approved** | Scale arc energy with yield while preserving readability. |
| 9 | Changed-resource HUD pulse | **Rejected / legacy cleanup** | There is no inventory bar. Audit and remove stale inventory-bar assumptions rather than creating one. |
| 10 | Rarity aim tag | **Rejected** | Do not wire. |
| 11 | Damage-change micro label | **Rejected** | Do not wire. |
| 12 | Critical multiplier roll-up | **Approved** | Keep it action-local and short-lived. |
| 13 | Rubble identity | **Approved** | Improve material identity through debris, motion, and sound rather than labels. |
| 14 | Environmental-break identity | **Approved with quality gate** | Must be subtle and high quality. |
| 15 | Adaptive aim-outline contrast | **Approved, redesign required** | Improve the aim treatment as a whole; it must be more visually appealing than the current debug-like indicator. |
| 16 | Screen-edge text clamping | **Rejected** | Do not wire as a new system. |
| 17 | Density descriptor after first hit | **Approved** | Keep contextual and transient; avoid UI accumulation. |
| 18 | Existing-impact variation | **Approved for audit and repair** | First confirm what already exists. Some higher-tier resources currently lack sound; repair that coverage rather than duplicating working effects. |
| 19 | Fast-mining debris budget | **Approved** | Preserve satisfying movement while controlling particle saturation and performance. |
| 20 | Visible-resource tally | **Rejected** | Do not add another counter. |
| 21 | Jump input buffer | **Rejected / invalid premise** | The game has no jump action. Treat any jump-specific hooks or notes as legacy assumptions. |
| 22 | Coyote-time authority audit | **Rejected** | No jump system; do not pursue. |
| 23 | Portal-arrival input buffer | **Rejected** | Do not wire. |
| 24 | Resume key-release guard | **Rejected** | Do not wire from this list. |
| 25 | Fall-speed landing dust | **Approved** | Visual polish only; do not imply fall damage. |
| 26 | Fall-speed landing squash | **Approved** | Keep restrained and responsive. |
| 27 | Predicted landing shadow | **Approved** | Use a grounded, high-quality world-space treatment. |
| 28 | Dangerous-fall vignette | **Rejected / invalid premise** | Falling is not dangerous; do not communicate false danger. |
| 29 | Downward camera look | **Approved** | Tune for digging visibility without creating camera sickness. |
| 30 | Horizontal look-ahead | **Approved** | Smooth and speed-aware. |
| 31 | Camera recenter grace | **Approved** | Avoid abrupt correction after manual or contextual look. |
| 32 | Moving-only climb dust | **Approved** | No idle particle emission. |
| 33 | Climb direction-flip smoothing | **Approved** | Preserve input precision while removing visual snapping. |
| 34 | Low-GP flight edge cue | **Approved with quality gate** | Subtle, premium, and non-cluttering. |
| 35 | GP-depleted descent explanation | **Approved** | Explain the state once, at the point of failure, then fade. |
| 36 | Flight-ready pulse | **Rejected** | Do not wire. |
| 37 | Sky-boundary feedback | **Approved** | Prefer world/camera motion feedback over a modal message. |
| 38 | One-tile step assist | **Rejected** | Do not wire. |
| 39 | Stationary-stuck prompt | **Rejected** | Do not wire. |
| 40 | Live input-glyph refresh | **Rejected** | Do not wire from this batch. |
| 41 | Ability-ready frame flash | **Expanded; mockup approval required** | Replace the narrow idea with a premium WoW-inspired 9-slot ability bar. Slots 1–9 later act as secondary triggers while all current inputs remain valid. Do not wire until the mockup is approved. |
| 42 | Exact GP shortfall | **Rejected** | Do not wire. |
| 43 | Invalid-target reason at reticle | **Approved** | Communicate at the world-space target and clear rapidly. |
| 44 | No-target no-spend contract | **Rejected** | Do not add new presentation from this candidate. Existing correctness rules remain untouched. |
| 45 | Heavy Punch rear-value label | **Rejected** | Do not wire. |
| 46 | Thunder solid-count forecast | **Rejected** | Do not wire. |
| 47 | Quickslash landing safety tint | **Rejected** | Do not wire. |
| 48 | Validity-driven preview opacity | **Rejected** | Do not wire. |
| 49 | Buffered-input acknowledgement | **Rejected** | Do not wire. |
| 50 | Buffered-input cancel cue | **Rejected** | Do not wire. |
| 51 | Repeated-failure coalescing | **Rejected** | Do not wire as a new feature. |
| 52 | One-time ability practice card | **Approved with presentation gate** | It must match the rest of the UI and fade away; no persistent tutorial card. |
| 53 | First-success acknowledgement | **Approved** | Brief, satisfying, and non-modal. |
| 54 | Pause-menu ability reference | **Approved** | Put reference information in the pause surface instead of cluttering live play. |
| 55 | Contextual key-and-cost prompt | **Rejected** | Do not wire. |
| 56 | Ability damage summary | **Approved** | Prefer the pause/detail surface or a compact contextual reveal. |
| 57 | Power-source breakdown | **Approved** | Make temporary and permanent power sources legible without a permanent extra panel. |
| 58 | Temporary-power color separation | **Approved** | Use the established palette consistently. |
| 59 | Chest-buff final-three pulse | **Approved** | A short final-three-seconds treatment; avoid continuous noise. |
| 60 | Ability-readiness hint toggle | **Rejected** | Do not wire. |
| 61 | Post-sale wallet preview | **Approved with clutter gate** | Show only inside the relevant sale decision and remove immediately afterward. |
| 62 | Per-resource total value | **Approved with clutter gate** | Keep the shop hierarchy clean; do not add another persistent column unless it earns the space. |
| 63 | Sale composition receipt | **Approved with clutter gate** | High-quality, fast fade, and no retained receipt panel. |
| 64 | After-sale purchase callout | **Approved** | Shop-only and contextual. |
| 65 | Remaining-wallet purchase preview | **Approved** | Integrate into the existing purchase action rather than adding a panel. |
| 66 | Current-versus-next stat row | **Hold for clarification and mockup review** | The supplied note refers to the current “last-hit” visual being low quality, while candidate 66 in the recovered list is a shop stat row. A final-hit visual mockup has been prepared, but neither interpretation may be wired until confirmed. |
| 67 | Exact locked requirement | **Approved** | State the real missing requirement clearly in the existing locked state. |
| 68 | Compact maxed-card mode | **Rejected** | Do not wire. |
| 69 | Selection survives redraw | **Rejected** | Do not implement from this batch. |
| 70 | Session-only shop tab memory | **Rejected** | Do not wire. |
| 71 | Quantity shortcuts | **Unresolved** | No yes/no answer was supplied. Do not wire. |

## Ability-bar visual review gate

**Current preview:** `visual-approval-previews/2026-07-26-aaa-ability-bar-review-v2.png`  
**Superseded size study:** `visual-approval-previews/2026-07-26-aaa-ability-bar-review-v1.png`  
**State:** `reviewOnly: true`, `productionChanged: false`

The revised concept is roughly half the footprint of v1, demonstrates a premium mouse-hover tooltip, and adds a subordinate ability-only strip with numeric shortcuts **1–8**. The primary row preserves the nine currently exposed actions:

| Number | Action | Existing binding retained |
|---:|---|---|
| 1 | Dig | F |
| 2 | Quickslash | Q |
| 3 | Thunderstrike | C |
| 4 | Fly | Shift |
| 5 | Torch | T |
| 6 | Interact | E |
| 7 | Arc Core | B |
| 8 | Celestial Engine | X |
| 9 | Inventory | I |

If approved, keys **1–8** become secondary aliases for the ability-only strip; the ninth Inventory action remains on its existing binding and has no numeric alias. Hold semantics for Dig and Fly and one-shot semantics for the other actions must remain consistent with their existing controls.

## Final-hit / aim visual review gate

**Preview:** `visual-approval-previews/2026-07-26-aaa-final-hit-review-v1.png`  
**State as of 2026-07-28:** aim treatment promoted; final-hit treatment rejected
as redundant

The production aim treatment replaces the full yellow debug-like target square
with the approved short-corner direction, backed by the generated transparent
asset under `sprites/UI/mining-target-v1/`. The separate final-hit square,
label, fracture pulse, dust draw-in, and break-ready state are not wired.

The aim-only runtime can be compared with `?miningTargetVisuals=0`. Candidate
66's final-hit interpretation is closed as rejected; the unrelated shop-row
interpretation remains a separate decision.

## Still needed from review

- Decision for candidate **1**.
- Confirmation whether candidate **66** means:
  - the recovered shop candidate, “Current-versus-next stat row”; or
  - the current low-quality final-hit/aim visual shown in the second mockup.
- Decision for candidate **71**.
- Decisions for candidates **72–200** when ready.
