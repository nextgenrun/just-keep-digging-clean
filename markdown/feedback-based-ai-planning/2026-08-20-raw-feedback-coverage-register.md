# Raw feedback coverage register — 2026-08-20

Every row below is a required planning obligation. `Regression` means a previous implementation/audit exists but the later report reopens it. Priorities and phases refer to the master plan.

## Source inventory

- `markdown/feedback/playtesters/frank/feebback26-07-2026.md`
- `markdown/feedback/solo-dev-self-feedback/2026-06-2026.txt`
- `markdown/feedback/solo-dev-self-feedback/03-07-2026.txt`
- `markdown/feedback/solo-dev-self-feedback/06-07-2026.txt`
- `markdown/feedback/solo-dev-self-feedback/17-08-2026.txt`
- `markdown/feedback/solo-dev-self-feedback/20-08-2026.txt`

## Frank — 2026-07-26

| ID | Feedback obligation | Disposition and phase | Acceptance evidence |
|---|---|---|---|
| FR-01 | The upgrade system is a positive hook. | Preserve; Phases 2/4. Do not flatten it while reducing overload. | Blind players can explain and feel the first purchase; later upgrade choices remain meaningful. |
| FR-02 | Cave-ins are enjoyable. | Preserve and deepen; Phases 1/5. | Cave-in telegraph, spectacle, shield choice, and reward pass browser review without false damage. |
| FR-03 | Game gives too little or irrelevant feedback. | P1; Phases 2/6. Replace volume with contextual action/result feedback. | Player identifies current action, result, and next promise without asking or UI spam. |
| FR-04 | Climbing/recovery is unclear. | P1; Phase 2. Teach local Flight/recovery before unsafe descent. | Fresh player escapes the tutorial shaft without instruction from tester. |
| FR-05 | Shop on the left is unclear. | P1; Phase 2. Make entrance, merchant role, and interaction readable in-world. | Fresh player locates shop, sells, and buys unaided. |
| FR-06 | Random unbreakable blocks are confusing and ruin routes/dig spots. | P1; Phase 2. Fix accidental state/generation and give every intentional blocker a semantic reason. | Seed sweep finds no unexplained blockers; contact explains boundary/tool/protection state. |
| FR-07 | Player can trap themself in holes near the shop and needs Flight/precision. | P1; Phase 2. Town-zone trap prevention plus distinct local unstuck. | Adversarial town digging cannot create an unrecoverable state; no punitive expedition abandon required. |
| FR-08 | Starting resource prices/dirt do not become more valuable. | P1; Phase 4. Audit common-resource curve and sale relevance. | Value/minute and price tests show intended progression without making dirt the dominant exploit. |

## Solo developer — June 2026

| ID | Feedback obligation | Disposition and phase | Acceptance evidence |
|---|---|---|---|
| JUN-01 | Too little gold and silver at lower depths. | P1 economy; Phase 4. Rare early teasers, measured normalisation later. | Seed distribution report and blind runs produce visible early aspiration without breaking progression. |
| JUN-02 | Too few sell/gamble tiles. | P2; Phase 4. Tune occurrence, risk, and economic purpose. | Distribution and usage telemetry meet band targets; no dead or dominant tile. |
| JUN-03 | Gem Power tile should have five fixed depth-scaled restore variants, never full refill. | P1; Phase 4. | Five authored variants map deterministically to bounded restore amounts and pass save/render tests. |

## Solo developer — 2026-07-03

| ID | Feedback obligation | Disposition and phase | Acceptance evidence |
|---|---|---|---|
| J03-01 | Copper can become randomly indestructible. | P1 bug; Phase 2. | Copper HP/material/state sweep proves breakability unless an explicit, messaged gate owns it. |
| J03-02 | Sky/Star Pillar UI and visuals are weak. | P2; Phases 5/6. | Authored responsive review, readable status, visible assets, clear interaction and talent entry. |
| J03-03 | Hidden caves lack an authored shell and appear random. | P2; Phase 5. | Cave entrance/interior silhouettes and structure read consistently across seeds. |
| J03-04 | Hidden cave loot is not better than normal digging. | P1 reward; Phases 4/5. | Risk-adjusted expected cave value exceeds ambient band without guaranteed jackpot. |
| J03-05 | Cave darkness should read as lack of torch; tune cave visuals. | P2; Phases 5/7. | Torch on/off comparison is legible, accessible, and thematically coherent. |
| J03-06 | Chests have no interaction or loot. | P1/P2; Phase 5. | Prompt, open animation, reward, persistence, and duplicate-claim contracts plus browser proof. |
| J03-07 | Underground background is black; compare/restore older backups. | P2; Phase 5. | Side-by-side approved art review across depth bands; no featureless black in normal visibility. |
| J03-08 | Gold/silver should tease earlier and become normal around 1000m+. | P1 economy; Phase 4, with telemetry deciding exact thresholds. | Seed histogram and value/minute curves satisfy approved depth bands. |
| J03-09 | Combo counter stops at 100. | P1 UI; Phase 6. Damage cap and visible count are separated. | Counter continues beyond 100 while configured damage cap remains unchanged. |
| J03-10 | Geode and sky tiles need visible light. | Split; Phases 5/6. Geodes retire; retained sky/special tiles get authored illumination. | No active geodes; retained special tiles readable without revealing the entire dark map. |
| J03-11 | Thunder Strike is weaker than normal damage. | P1 ability; Phase 4. | Scenario matrix proves a distinct, worthwhile role and description/effect parity. |
| J03-12 | World past 1000m needs visual overhaul, frequent metals, tough distinct dirt. | P2; Phases 4/7. | Authored depth-band review plus distribution/HP/value telemetry and performance proof. |
| J03-13 | Darkness focus sits at feet instead of torso/head. | P2; Phase 7. | Focus tracks approved upper-body anchor at all states/aspect ratios without exposing excess map. |

## Solo developer — 2026-07-06

| ID | Feedback obligation | Disposition and phase | Acceptance evidence |
|---|---|---|---|
| J06-01 | Quickslash should not start at level 1; unlock through Bobo. | Product authority check; Phase 4. Default plan is Bobo unlock. | Clean-save unlock timing, prompt, action-bar visibility, save/reload, and migration pass. |
| J06-02 | Sprites randomly face the wrong direction. | P1 regression; Phase 3. | Direction matrix passes idle/run/dig/ability/cancel for both facings. |
| J06-03 | Q Quickslash attacks the wrong direction. | P1; Phases 3/4. | Q target, facing, clip, hitbox, and damage agree for both directions while stationary/moving. |
| J06-04 | Earthquake trap needs tooltip/voice explanation. | P1; Phases 1/2/5. Contextual caption first; optional voice reinforcement. | First eligible encounter teaches response without a modal and works muted. |
| J06-05 | New digging sounds should be removed/reworked. | P2; Phase 6. Keep rejected SFX out pending human audition. | Material/event audio set passes A/B review, mix limits, and muted accessibility. |
| J06-06 | Underground needs particle variants, none inside buildings. | P3; Phases 6/7. | Biome particles vary by band and are deterministically suppressed in buildings. |
| J06-07 | Portal needs sound, hum, and animation. | P2; Phases 5/6. | Start/loop/arrival mix and animation pass visibility, cleanup, pause, and residency checks. |
| J06-08 | Money Monster awards wrong resources; new resources belong to red-area vendor. | P1 economy ownership; Phase 5. | Reward/vendor tables, UI, save, and migration agree on resource ownership. |
| J06-09 | Flight needs startup cost so it cannot be spammed. | P1 tuning; Phases 2/4, gated by playtest. | Input-spam test charges once per activation and normal recovery stays usable. |
| J06-10 | GP regeneration upgrade price should be 250. | Preserve current invariant; Phase 4. | Definition/shop/display/save all show 250 unless an approved rebalance packet supersedes it. |
| J06-11 | GP tiles need fixed variants. | Same obligation as JUN-03; Phase 4. | Coverage closed with JUN-03 evidence. |
| J06-12 | Star Pillar upgrades need more sky/unique effects. | P2; Phases 4/5. | Each retained pillar path changes a visible mechanic and has before/after evidence. |
| J06-13 | Random XP should be multiplied by 20. | Balance hypothesis, not blind literal; Phase 4. | XP pacing simulation tests 20x and alternatives; owner approves curve without trivialising progression. |
| J06-14 | Dig-up-side animation flips 180 degrees. | P1; Phase 3. | Up/side boundary and both facings pass frame/video matrix with stable target. |
| J06-15 | Dig-down needs left/right variants. | P1; Phase 3. | Two-direction down clips select deterministically and hit the same authoritative down target. |
| J06-16 | Wall lean creates a gap and black line. | P1 visual; Phase 3. | Pixel/video review at both facings and supported scales shows no seam or body drift. |

## Solo developer — 2026-08-17

| ID | Feedback obligation | Disposition and phase | Acceptance evidence |
|---|---|---|---|
| A17-01 | Tutorial ghost mirrors the player instead of showing the logical next step. | Regression; Phase 2. | Ghost target/state is ahead of progress and never copies player frame/action blindly. |
| A17-02 | Teach S/down and F/dig more clearly without UI spam. | P1; Phase 2. | Context prompts appear only at need, dismiss after proof, and pass muted blind test. |
| A17-03 | Inventory UI, resource art, and Special Block I need polish/audit. | P2; Phase 6. | Authored art matches actual resources/rules; responsive, focus, and click tests pass. |
| A17-04 | Animations feel old, skate, and transition harshly; audit/repair with Blender if needed. | Regression/P1; Phase 3. | Full motion matrix plus frame/video review and reversible repaired asset profile. |
| A17-05 | Escape exits fullscreen instead of closing active UI. | Regression/P0 UI; Phase 1. | Every UI stack path closes top layer first; fullscreen changes only through explicit command. |
| A17-06 | UI interruptions should pause combo. | Preserve/revalidate; Phases 1/6. | Remaining combo time survives every blocking UI open/close route. |
| A17-07 | Weather HUD is redundant. | Preserve removal; Phase 6. | No weather HUD DOM/canvas surface; world weather may remain; regression contract passes. |
| A17-08 | Tutorial free 30-second Flight persists and confuses. | Regression; Phase 2. | Free-flight flag/time clears exactly at teaching completion and across save/reload. |
| A17-09 | Start UI needs polish. | P2; Phase 6. | Authored responsive/focus review and clean-save navigation smoke pass. |
| A17-10 | Stationary and running side dig skate. | P1; Phase 3. | Planted and locomotion variants have bounded root/foot drift and stable body authority. |
| A17-11 | High stress needs clearer visual and sound language. | P1 Hardcore; Phases 6/7. | Warning/critical states are noticed in blind test without seismic confusion or spam. |
| A17-12 | Add falling-debris hazard and hold-Q GP shield. | Preserve/revalidate; Phases 1/5. | Deterministic hazard proves telegraph, Q hold, GP drain, damage prevention, cancel, and cleanup. |
| A17-13 | Floating numbers randomly disable or become unavailable. | Regression; Phase 6. | Saved explicit modes survive reload/device/resolution and never silently change. |
| A17-14 | Merchant prompts are too high. | P1 UI; Phases 2/6. | Prompt anchors stay near merchant, in safe area, and do not cover focal interaction. |
| A17-15 | Reward and level-up/UI sounds need improvement. | P2; Phase 6. | Distinct authored cues pass audition, priority/ducking, cooldown, and muted subtitle review. |
| A17-16 | Audit every upgrade. | P1/P2; Phase 4. | Machine-readable report covers all definitions, effects, costs, caps, descriptions, ownership, saves. |
| A17-17 | Next Unlock sticks to cheapest item; rotate relevant hints. | P1; Phase 4. | Hint policy rotates among relevant attainable goals with anti-repeat and survival priority tests. |
| A17-18 | Intact Stars relieve stress; mined Stars must not. | Preserve/revalidate; Phase 7. | Proximity/state test removes relief on mine and updates visuals/audio immediately. |
| A17-19 | Dirt footsteps are missing. | P2; Phase 6. | Surface-aware footsteps play/stop correctly and respect mix/accessibility settings. |
| A17-20 | Map M needs polish, visibility, and bottom-right clickability. | Regression; Phase 6. | M and button share one action; authored button is visible/clickable at all viewports. |
| A17-21 | Assets on top of Sky Pillar are invisible. | P2; Phase 5. | Asset preload/depth/camera/residency tests plus browser screenshots across approaches. |
| A17-22 | Talent tree visibility/usability is weak. | P1/P2; Phases 4/6. | Branch focus mode, readable minimums, prerequisites, focus and click targets pass. |
| A17-23 | WoW ability bar disappeared after a talent. | P0/P1 regression; Phases 1/4/6. | Purchase/unlock/save/reload/resolution matrix keeps correct abilities visible and usable. |
| A17-24 | Torch/drain depth locks and Hardcore upgrades need rebalance; player level should reduce stress. | Revalidate; Phase 4. | Survival tools precede danger; curves and level resistance pass simulations and live runs. |
| A17-25 | Sleeping Jackpot/chests need animation, art, and alignment. | P2; Phases 5/6. | Authored interaction/reward sequence, persistence, alignment, and click tests pass. |
| A17-26 | Hardcore teleports should be free. | Preserve/revalidate; Phases 1/4. | Every teleport route costs zero and save/UI agree. |
| A17-27 | Hardcore death UI needs alignment/clickability; first death can freeze/stick. | Regression/P0; Phase 1. | Transactional death matrix and responsive recap tests pass 100 cycles. |
| A17-28 | Add near-death sounds. | P1; Phase 6. Dedicated cue, not earthquake reuse. | Threshold/hysteresis/cooldown/mix and recovery tests pass. |

## Solo developer — 2026-08-20

| ID | Feedback obligation | Disposition and phase | Acceptance evidence |
|---|---|---|---|
| A20-01 | Permadeath UI is broken. | P0 regression; Phase 1. | Final-life route is aligned, interactive, save-safe, and reaches Save Vault without console errors. |
| A20-02 | Star UI is unclear, misaligned, and unreadable. | P1; Phases 4/6. | Responsive branch focus, font/target floors, hierarchy, status, and safe-area review pass. |
| A20-03 | Death crashes and lives are not lost. | P0 release blocker; Phase 1. | Idempotent save transaction and readback prove exactly one decrement; no crash/softlock. |
| A20-04 | Low GP needs clearer visual and audio stress cues. | P1; Phases 6/7. | Players notice warning before failure; dedicated cues have hysteresis/cooldown and accessibility. |
| A20-05 | New animation sets are broken/misaligned and need heavy polish using existing work. | P1 regression; Phase 3. | Approved existing/repaired set passes complete contact/motion video matrix with rollback. |
| A20-06 | Old side dig was removed; wire it between existing side-dig animations. | P1; Phase 3. | Valued old clip is restored as a compatible stage, not random, and passes clearance/contact. |
| A20-07 | Dig-up needs two alternating/contextual variants. | P1; Phase 3. | Two approved up clips select by contact/clearance and preserve one authoritative hit. |
| A20-08 | Kicks/digs must match tile/hitbox/contact rather than random; limbs cannot cross tiles. | P1 core feel; Phase 3. | Clearance resolver filters incompatible clips; intrusion/contact/body-authority matrix passes. |
| A20-09 | Moving side dig needs substantial polish. | P1; Phase 3. | Dedicated moving variants have no skate, foot slip, seam, target drift, or harsh transition. |
| A20-10 | Abilities need overhaul; perhaps remove one; talents should be more impactful. | Product gate; Phase 4. Instrument, define roles, then keep/merge/rework/remove packet. | Approved decision backed by usage/overlap data; retained abilities/nodes create perceptible mechanics. |
| A20-11 | Digging down is still not rewarding enough; add danger/risk and higher reward. | P1; Phases 4/5. | Net value/minute after travel, GP, HP, hazard, and failure rises by approved depth/risk bands. |
| A20-12 | Earthquake and Wurm appear nonfunctional. | P0/P1; Phase 1. Distinguish gate from defect. | Deterministic and natural runs show exact admission reason, telegraph, active effect, resolution, cleanup. |

## Raw-feedback closure rule

A duplicate row can share implementation evidence, but it remains listed so the original observation is never lost. No row is accepted from static code inspection; attach its contract, browser/runtime proof, and—where the criterion is comprehension or feel—blind-player result.
