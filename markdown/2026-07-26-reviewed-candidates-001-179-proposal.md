# Reviewed Candidates 001–179 — Consolidated Proposal

**Created:** 2026-07-26  
**Status:** Proposal only; no implementation, runtime wiring, or new visual generation  
**Scope:** Every reviewed decision from 1 through 179  
**New-list boundary:** Candidates 180–200 remain unreviewed. Candidates 201–300 now have a separate reviewed direction ledger and remain outside this 1–179 implementation proposal.

## Executive proposal

Implement the **130 approved or conditionally approved** candidates as seven independently reversible workstreams. Keep all **43 rejected** candidates out of runtime and hold all **6 unresolved** candidates until the user answers them. Do not attempt a single giant visual patch.

The recommended order is:

1. lock the pre-playtest Git and screenshot baseline;
2. approve the required static in-game art studies;
3. establish one shared quiet-frame/intensity authority;
4. build one complete mining vertical slice;
5. add movement/camera polish;
6. add ability and contextual UI art;
7. add underground atmosphere;
8. add surface/weather/lighting;
9. add discoveries, portals, pillars, and Level 2 identity;
10. add shop-only clarity;
11. validate, playtest, then promote or revert each slice independently.

This sequence gives the player visible improvement early while preventing 130 approved ideas from appearing simultaneously.

## Authoritative numbering

The review currently combines two sources:

- **1–71:** the recovered gameplay/retention candidate decision ledger in `markdown/2026-07-26-gameplay-candidate-decisions-001-071.md`.
- **72–179:** the AAA visual-polish decision ledger in `markdown/2026-07-26-aaa-visual-candidate-decisions-072-179.md`.

This hybrid mapping is intentional and must remain the source of truth for this proposal. The additional visual-only list at `markdown/2026-07-26-aaa-visual-only-candidates-201-300.md` now has a separate direction-review ledger at `markdown/2026-07-26-aaa-visual-only-decisions-201-300.md`; neither file expands this 1–179 implementation proposal or grants runtime wiring authority.

## Complete decision coverage

| Disposition | Count | Meaning |
|---|---:|---|
| Approved or conditionally approved | 130 | Eligible for the workstreams below, subject to stated art, clutter, and validation gates |
| Rejected | 43 | Explicitly excluded; do not wire |
| Unresolved | 6 | Hold until clarified |
| **Total** | **179** | Complete reviewed range |

### Approved or conditionally approved

`2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15, 17, 18, 19, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 37, 41, 43, 52, 53, 54, 56, 57, 58, 59, 61, 62, 63, 64, 65, 67, 72, 76, 79, 80, 81, 82, 83, 84, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 98, 99, 100, 101, 102, 103, 104, 105, 108, 109, 110, 111, 112, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 134, 135, 136, 137, 138, 139, 140, 141, 143, 144, 145, 146, 148, 151, 152, 153, 154, 155, 156, 158, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179`

### Rejected and excluded

`9, 10, 11, 16, 20, 21, 22, 23, 24, 28, 36, 38, 39, 40, 42, 44, 45, 46, 47, 48, 49, 50, 51, 55, 60, 68, 69, 70, 73, 74, 75, 77, 78, 85, 97, 106, 107, 113, 133, 142, 147, 157, 159`

Important exclusions:

- no jump system or jump-specific visual work;
- no inventory-bar assumption;
- no dangerous-fall vignette;
- no additional persistent counters, prompts, readiness pulses, or failure-message stack;
- no Thunder zoom;
- no discovery camera pan;
- no stall-cloth, sign-chain, rooftop-dust, or campfire-bounce candidates;
- no rejected Quickslash preview clutter;
- no unapproved shop persistence behavior.

### Unresolved and blocked from wiring

| # | Candidate | Required answer |
|---:|---|---|
| 1 | First-contact target snap | Yes or no |
| 66 | Current-versus-next stat row | Confirm whether this meant the shop stat row or the low-quality final-hit visual |
| 71 | Quantity shortcuts | Yes or no |
| 114 | Cloud-layer speed separation | Confirm separate generated clouds only; baked scenic-plate clouds remain static |
| 149 | Shake source falloff | Explain “MP” |
| 150 | Frequency-specific shake | Explain “MP” |

## Non-negotiable presentation contract

1. **World motion first.** Prefer character, tool, tile, particles, light, fog, camera, and prop response over another HUD component.
2. **One hero effect.** During Quickslash, Thunder, portal travel, discoveries, chest openings, and earthquakes, quiet lower-priority ambience.
3. **No placeholder art.** If approved image-generated art is unavailable, keep the feature disabled or review-only.
4. **No primitive visible UI.** HTML/DOM may provide invisible interaction plumbing only. Final visible UI belongs in Phaser and uses approved art plus approved typography.
5. **No false mechanics.** Visuals may not imply jump, fall damage, hidden resources, undiscovered relics, or unearned rewards.
6. **No visual locator leakage.** Crystal, relic, geode, and star effects begin only when the object is already visible or collected.
7. **No permanent screen accumulation.** Roll-ups, receipts, hints, and contextual explanations clear quickly.
8. **Reduced-motion coherence.** Optional camera travel and secondary motion reduce cleanly without removing essential contact readability.
9. **Existing controls remain.** Numeric ability shortcuts are aliases; current inputs remain authoritative.
10. **Gameplay authority remains untouched.** Collision, HP, rewards, GP timing, combo decay, saves, portal landings, and chest contents do not change unless separately specified.

## Art approval queue before runtime work

Create these visual studies in this order. They remain isolated screenshots until approved:

| Review board | Contents | Current state |
|---|---|---|
| A. Compact ability interaction | Half-size primary bar, mouse hover, 1–8-only secondary strip | v2 exists; awaiting approval |
| B. Tutorial art | Flight Gem plaque replacing cyan/primitive stack | v1 exists; awaiting approval |
| C. Mining contact language | Aim treatment, blocked/miss separation, crit core, final-hit inhale, debris hierarchy | Aim/final-hit concept exists; remaining sequence not generated |
| D. Weather replacement | Clean rain atlas, collision splash using earlier water assets, snow look in the real scene | Not generated |
| E. Shop clarity | Wallet preview, value total, receipt, callout, remaining money, exact lock state in one uncluttered composition | Not generated |
| F. Discovery choreography | Chest, star, relic, portal, pillar, titan, and Celestial Engine priority examples | Not generated |
| G. Lighting adaptation | Surface-to-darkness, cave exit, lightning recovery, and material response | Not generated; PostFX foundation currently disabled |

Do not create all boards simultaneously. Approve or reject each board before preparing the next one.

## Thin shared foundation

Avoid building 130 independent visual managers. Extend existing authorities and add only one small shared coordination contract:

### Shared visual intensity states

| State | Allowed emphasis |
|---|---|
| Ambient | Backdrops, dust, fog, prop idle motion |
| Contact | Mining hit, landing, climb contact, local light kick |
| Hero | Crit, jackpot, ability contact, chest star, relic, portal activation |
| Transition | Cave entry/exit, teleport, town return, weather clear-out |

Only the highest active state receives full intensity. Lower states remain alive but reduce alpha, spawn rate, or amplitude smoothly. Candidate **99 Quiet-frame governor** is the approved basis.

### Existing owners to extend

- `PlayerMotionPolishSystem`, `PlayerBodyLanguageSystem`, and existing animation timelines own player presentation.
- `WorldVisualFeedbackLayer`, `WorldVisualDamagePainter`, and `WorldVisualMaterialField` own contact, damage, debris, and material response.
- `AmbientParticleSystem`, `CaveAtmosphereSystem`, and `AtmosphereSystem` own dust, fog, rays, and quiet-frame suppression.
- `WorldVisualLightingBridge`, `LightSystem`, and the repaired `PostFxSystem` own light and exposure.
- `WeatherSystem`, `WeatherParticleController`, `WeatherImpactRainController`, and `SkylineWeatherVfxSystem` own weather visuals.
- Existing chest, loot, relic, portal, pillar, titan, and engine controllers own their presentation timelines.
- Existing HUD/overlay owners consume approved image-generated frames; no second visible DOM UI is introduced.

All numeric curves, caps, durations, colors, feature flags, and quality tiers live in `/values/`.

## Workstream 1 — Mining responsiveness and reward readability

**Candidates:** `2–8, 12–15, 17–19` excluding rejected numbers  
**Count:** 14

### Player-facing result

- break motion follows through instead of stopping at contact;
- misses, blocked hits, normal hits, crits, jackpots, and environmental breaks look distinct;
- rapid gains roll up instead of flooding the screen;
- pickup movement scales with reward without adding another persistent counter;
- aim presentation looks authored rather than like a developer tool;
- rubble, high-tier resources, and rapid mining receive coherent visual/audio identity;
- particle count stays bounded.

### Proposed slices

1. **Contact language:** 2, 4, 5, 13–15, 17.
2. **Reward motion:** 3, 6–8, 12.
3. **Impact coverage and budget:** 18–19.

### Approval evidence

- one normal tile, rubble, environmental tile, rich resource, ancient resource, blocked bedrock, crit, and jackpot;
- rapid-mining stress capture with overlapping gains;
- before/after screenshot plus 10-second recording at native and legacy density.

### Rollback flags

- `visualMiningContact`
- `visualMiningRewards`
- `visualMiningMaterialIdentity`

## Workstream 2 — Locomotion, Flight, camera, and transitions

**Candidates:** `25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 37, 141, 143, 144, 145, 146, 148, 151, 152, 153, 154, 155, 156, 158, 160`  
**Count:** 25

### Player-facing result

- landings gain dust, squash, and a predicted shadow without implying danger;
- climb particles respect movement and direction;
- GP depletion, low-GP Flight, and sky boundaries communicate subtly;
- the camera anticipates sustained movement, recenters gracefully, and stays still during precise mining;
- crit, Quickslash, earthquake, portal, cave, and town-return camera motion feel different but restrained;
- optional camera flourishes cancel immediately on player input;
- darkness/light transitions gain subtle eye adaptation.

### Required audits before wiring

- Candidate 141 is not currently live: config values exist, but the camera updater applies shake only.
- `PostFxSystem` is disabled because of a sprite-visibility regression. Repair and validate it before candidate 155.
- Camera zoom stays unchanged; the rejected Thunder zoom candidate remains excluded.
- No jump-specific code, prompt, animation, or camera path is introduced.

### Proposed slices

1. **Landing and climb:** 25–27, 32–33.
2. **Flight and sky feedback:** 34–35, 37.
3. **Camera follow:** 29–31, 141, 143–146.
4. **Layered transitions:** 148, 151–156.
5. **Control and accessibility:** 158, 160.

### Rollback flags

- `visualLandingClimb`
- `visualFlightFeedback`
- `visualCameraFollow`
- `visualTransitionMotion`
- `visualEyeAdaptation`

## Workstream 3 — Ability interaction and contextual learning

**Candidates:** `41, 43, 52, 53, 54, 56, 57, 58, 59`  
**Count:** 9

### Player-facing result

- one compact approved ability bar with mouse hover;
- existing controls remain, with 1–8 as secondary ability aliases;
- invalid-target feedback appears at the target, then clears;
- one-time practice and first-success acknowledgement fade quickly;
- the pause menu carries persistent reference information;
- damage, power source, temporary power, and chest-buff ending are visually legible without another live HUD stack.

### Required art

- approve ability-bar v2;
- approve a shared hover-tooltip frame family;
- approve ability icon optical sizing at final runtime scale;
- approve the one-time practice card and pause-reference composition before wiring.

### Input contract

- no numeric alias may replace F, Q, C, Shift, T, E, B, X, or I;
- hold actions retain hold semantics;
- one-shot actions remain one-shot;
- Inventory remains on its existing binding and receives no numeric shortcut in the proposed 1–8 strip.

### Rollback flags

- `visualAbilityBar`
- `visualAbilityContext`
- `visualAbilityLearning`

## Workstream 4 — Shop-only decision clarity

**Candidates:** `61, 62, 63, 64, 65, 67`  
**Count:** 6

### Player-facing result

- wallet previews show the actual before/after total;
- resource stacks show total value compactly;
- Sell All produces one high-quality quick-fade receipt;
- the selected affordable upgrade receives a shop-only callout;
- purchase actions show remaining wallet;
- locked upgrades show the exact real requirement.

### Clutter rule

Never display all six simultaneously. Use the existing selection hierarchy:

1. current action detail;
2. one before/after preview;
3. one transient result receipt;
4. exact lock reason only when locked.

### Rollback flag

- `visualShopDecisionClarity`

Candidate 66 remains outside this workstream until clarified.

## Workstream 5 — Underground materials, atmosphere, and Level 2 motion

**Candidates:** `72, 76, 79, 80–84, 86–96, 98–100`  
**Count:** 22

### Player-facing result

- premium pebble, geode, quake-settling, material-transition, dust, fog, ray, backdrop, and route-age motion;
- old and fresh routes feel visually distinct without becoming a new progression layer;
- Level 2 receives its own motion cadence;
- rare stillness pockets and the quiet-frame governor prevent constant noise.

### Central clutter limits

- fixed ambient particle cap;
- no more than three visible depth layers;
- one backdrop motion motif per region;
- old routes reduce motion instead of adding a new overlay;
- Level 2 changes cadence and direction, not HUD;
- candidate 99 suppresses ambient motion during hero events.

### Proposed slices

1. **Material and quake response:** 72, 76, 79–80.
2. **Dust interaction:** 81–84.
3. **Fog, rays, and parallax:** 86–94.
4. **Route history and Level 2:** 95–96, 98, 100.
5. **Shared governor:** 99 first in code, promoted only after comparison.

### Rollback flags

- `visualMaterialAtmosphere`
- `visualDustInteraction`
- `visualFogRays`
- `visualLevelTwoMotion`
- `visualQuietFrame`

## Workstream 6 — Surface, NPC, weather, light, and exposure

**Candidates:** `101–105, 108–112, 115–140` excluding rejected and unresolved numbers  
**Count:** 35

### Player-facing result

- campfire, lantern, merchants, footsteps, scuffs, distant silhouettes, sky islands, surface parallax, night lights, dawn, rain, lightning, torch, material light, crystal response, darkness edge, grading, earthquake dust, and storm endings feel authored and connected;
- no stall-cloth, sign-chain, rooftop-dust, or campfire-bounce work;
- candidate 114 stays held until approved.

### Weather-art prerequisite

1. Keep the current generated rain atlas disabled because of matte contamination.
2. Generate and approve a clean transparent rain family at real gameplay scale.
3. Reuse earlier approved water splash/ripple/spray assets for collision impacts.
4. Review earlier snow art in the real scene before enabling a snow visual path.
5. Preserve `WeatherImpactRainController` and real surface sampling.

### Sky-island prerequisite

Candidate 116 moves render presentation only. Teleport collision, destinations, caps, and safe landing remain fixed. It requires an in-game visual review before wiring.

### Proposed slices

1. **Campfire and lantern:** 101–105.
2. **NPC and town contact:** 108–112.
3. **Surface and sky islands:** 115–120.
4. **Rain art and collision:** 121–125.
5. **Lightning hierarchy:** 126–129.
6. **Local light/material response:** 130–140 excluding 133.

### Rollback flags

- `visualCampfireLantern`
- `visualNpcTown`
- `visualSurfaceParallax`
- `visualSkyIslandMotion`
- `visualWeatherArt`
- `visualLightning`
- `visualMaterialLighting`

## Workstream 7 — Chests, stars, relics, portals, pillars, titans, and engines

**Candidates:** `161–179`  
**Count:** 19

### Player-facing result

- chests open with weight and disciplined reward arcs;
- stars visually dominate chest openings when present;
- star collection spirals upward and lights nearby exposed edges;
- visible relics wake, orbit, and leave a faint temporary floor mark;
- portals gain internal depth, activation waves, suction, silhouette stretch, and Level 2 motion identity;
- the Milestone Pillar receives ambient and completion motion;
- titans reveal scale without banners;
- the Celestial Engine aura gains layered depth.

### Hero-effect rule

Only one of these discovery families may own full additive brightness at a time. If a star appears in a chest:

1. chest money brightness lowers;
2. the star owns the center;
3. nearby ambience quiets;
4. collection completes immediately;
5. the scene returns smoothly to ambient intensity.

### Proposed slices

1. **Chest:** 161–164.
2. **Star:** 165–167.
3. **Relic:** 168–170.
4. **Portal and Level 2 portal:** 171–175.
5. **Pillar, titan, and engine:** 176–179.

### Rollback flags

- `visualChest`
- `visualStar`
- `visualRelic`
- `visualPortal`
- `visualMilestonePillar`
- `visualTitanEngine`

## Implementation sequence

| Gate | Deliverable | Promotion requirement |
|---|---|---|
| 0 | Scoped Git baseline, dirty-file manifest, fixed screenshots, runtime metrics | Baseline pushed without staging unrelated work |
| 1 | Required art-review boards | Explicit visual approval |
| 2 | Quiet-frame/intensity foundation | No visible regression with all feature slices disabled |
| 3 | Mining vertical slice | Normal/crit/blocked/jackpot/rapid-mining captures approved |
| 4 | Movement and camera slice | Precise mining stable; reduced motion verified |
| 5 | Ability/tutorial slice | Compact scale, mouse hover, keyboard aliases, no overlap |
| 6 | Underground atmosphere slice | No clutter or hidden-resource leakage |
| 7 | Surface/weather/lighting slice | Approved rain art, stable FPS, correct collision splashes |
| 8 | Discoveries/portal slice | One hero effect at a time |
| 9 | Shop slice | No simultaneous receipt/preview/lock clutter |
| 10 | Full playtest | Each slice independently accepted, disabled, or reverted |
| 11 | Promotion commit | Only approved slices enabled by default |

## Rollback-ready Git contract

Before implementation begins:

1. capture current branch, commit, upstream, and dirty-file inventory;
2. create a scoped pre-implementation checkpoint and push it;
3. never use `git add -A`, hard reset, or broad checkout in this dirty worktree;
4. record exact pre-change hashes for each touched file;
5. keep one focused commit per visual slice;
6. push after every accepted slice;
7. use a normal `git revert` for a rejected playtest slice;
8. retain old art beside new versioned art until promotion;
9. expose a query/config rollback for every workstream;
10. make the final default-enable change a separate promotion commit.

Example commit sequence:

1. `chore: checkpoint before AAA visual proposal`
2. `feat: add mining visual polish behind gate`
3. `feat: add camera and movement polish behind gate`
4. `feat: add approved ability UI art behind gate`
5. `feat: add underground atmosphere polish behind gate`
6. `feat: add weather and lighting polish behind gate`
7. `feat: add discovery choreography behind gate`
8. `feat: add shop clarity behind gate`
9. `chore: promote playtest-approved visual slices`

## Validation contract

Every slice must pass:

- JavaScript syntax and import checks;
- runtime canary with no new error or lifecycle warning;
- save/load and portal round-trip smoke test;
- fixed-view screenshots at native and legacy render density;
- 10–20 second recording of the changed sequence;
- reduced-motion comparison;
- UI overlap check at the project’s supported viewport sizes;
- low-FPS stress check without disabling essential contact readability;
- particle, tween, and additive-object budget inspection;
- no hidden resource, relic, geode, or destination information revealed;
- no gameplay value, collision, reward, GP, combo, or timing change;
- query-flag disable comparison proving clean rollback.

## Recommended first playable slice

Do not start with all 130 approved candidates. Start with:

- 15 — improved aim presentation;
- 19 — rapid-mining debris budget;
- 41 — compact ability interaction, after visual approval;
- 80 — material-band crossfade;
- 81 — three-depth dust field;
- 99 — quiet-frame governor;
- 121–123 — only after clean rain and splash art approval;
- 141 — bounded acceleration look-ahead;
- 145 — crit directional punch;
- 155 — only after PostFX regression repair;
- 161–167 — one complete chest-to-star sequence;
- 171–177 — one portal-to-pillar sequence.

This first slice exercises mining, atmosphere, weather, camera, UI art, rewards, and portal presentation while remaining small enough to judge and revert.

## Decision required before implementation

1. Approve or revise the existing ability-bar v2 and Flight Gem tooltip v1.
2. Answer candidates 1, 66, 71, 114, 149, and 150.
3. Review candidates 180–200.
4. Review the additional visual-only candidates 201–300.
5. Select the first playable slice or approve the recommendation above.

Until those decisions are made, this remains a proposal and no production visual is promoted.
