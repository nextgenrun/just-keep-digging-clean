# Analysis and decision coverage register — 2026-08-20

This register covers the synthesized playtest analyses and the four 2026-08-02 planning documents. Raw observations remain separately traceable in the raw-feedback register.

## Source inventory

- `markdown/feedback/2026-07-30-fnab-first-five-minuten-playtestanalyse.md`
- `markdown/feedback/2026-08-01-borick-yongaerts-playtestfeedback-analyse.md`
- `markdown/feedback/2026-08-01-cross-playtester-dropoff-funnel-analyse.md`
- `markdown/feedback/2026-08-02-compleet-plan-historische-feedback-en-correcties.md`
- `markdown/feedback/2026-08-02-compleet-playtester-feedback-veranderplan.md`
- `markdown/feedback/2026-08-02-feedbackplan-normatieve-revisie-v2.md`
- `markdown/feedback/2026-08-02-playtester-feedback-implementatie-en-wereldinteractie.md`

The four directory/readme files were also read. They provide provenance/organization and introduce no additional gameplay obligations:

- `markdown/feedback/readme.md`
- `markdown/feedback/playtesters/readme.md`
- `markdown/feedback/playtesters/frank/readme.md`
- `markdown/feedback/solo-dev-self-feedback/readme.md`

## Fnab and Kimmo — first-five analysis

| ID | Analysis obligation | Plan disposition | Acceptance evidence |
|---|---|---|---|
| FN-01 | The first five minutes feel slow, unclear, and overloaded. | Phases 0/2: reduce time-to-action and stage the route. | Funnel timing plus 4/5 blind-player completion without tester rescue. |
| FN-02 | Player lacks a clear goal/player story. | Phase 2 persistent promise: descend, preserve a route, return, improve, descend farther. | Player can state current goal and next payoff in their own words. |
| FN-03 | Movement is the first contract; inputs are not obvious. | Phase 2 contextual movement/down-dig/Flight teaching under current `.clinerules`. | Unprompted input success and no stale no-jump instructions. |
| FN-04 | Dig input and what can be dug are unclear. | Phases 2/3: contextual F/S teaching, target highlight/contact, semantic blockers. | Player deliberately digs intended tile and explains a blocker. |
| FN-05 | Shift/Flight recovery is unknown. | Phase 2 teach local recovery before dangerous descent. | Player uses Flight to recover without tester instruction. |
| FN-06 | Return model is unclear. | Phase 2: portal/long return taught in-world with visible cost/consequence. | Player returns, sells, and resumes unaided. |
| FN-07 | Old free return was an exploit; 50% loss is punitive. | Phase 2 split local unstuck from expedition abandon; portal is normal long return. | Players cannot exploit universal free return and see exact loss before abandon. |
| FN-08 | Self-dug holes and bad routes can trap the player. | Phase 2 town trap prevention and local unstuck. | Adversarial route suite yields no unrecoverable state. |
| FN-09 | Unbreakables need semantic feedback rather than generic failure. | Phase 2 reason taxonomy. | Every intentional blocker exposes a stable reason and matching visual/audio response. |
| FN-10 | Shop and early town affordances are visually unclear. | Phase 2 in-world entrance/purpose/prompt cleanup. | Fresh player locates and uses correct merchant. |
| FN-11 | Too many merchants, menus, and systems arrive before the loop is proven. | Phases 2/8: progressive disclosure and breadth freeze. | First-return event log contains only approved staged reveals. |
| FN-12 | Show one current action and one next promise; avoid prompt spam. | Phase 2 onboarding policy. | UI audit finds at most the approved action/promise surfaces and suppression works. |
| FN-13 | Put the first target in camera. | Phase 2 authored start/ghost target. | All supported viewports show target and route without camera hunting. |
| FN-14 | Do not permit unsafe descent before return is trained. | Phase 2 route gating through world/readiness, not a modal wall. | Clean-save route cannot unknowingly cross the agreed danger point without visible recovery. |
| FN-15 | First upgrade must be meaningful. | Phases 2/4. | Affordable first choice changes next expedition measurably and is understood by player. |
| FN-16 | Pickaxes/upgrades must progress monotonically or explain real tradeoffs. | Phase 4 definition/effective-damage audit. | Material matrix has no accidental downgrade and UI explains deliberate specialization. |
| FN-17 | Start Casual Demo directly. | Phase 2. | One action begins intended route with clean deterministic state. |
| FN-18 | Darkness and Star pockets should create authored choices. | Phases 5/7. | Route choice test shows visible safety/value tradeoff; intact vs mined Star state is truthful. |
| FN-19 | Motherload, Dome Keeper, and Wall World are study references, not copy targets. | Product research input only. Extract principles: loop clarity, tension, return, escalation. | Any design packet cites the principle and demonstrates fit in this game. |
| FN-20 | “Works” means player enjoyment/comprehension, not merely technical operation. | Phase 8 dual acceptance. | Contracts plus browser feel review plus frozen blind test required. |
| FN-21 | Prove a small vertical slice before more systems. | Phases 0–2 breadth freeze. | Stability and core-loop gates pass before P2 breadth begins. |
| FN-22 | Kimmo’s early admiration/“wow” is evidence of a visual hook. | Preserve during simplification; Phases 5–7. | Comparative capture retains authored spectacle while reducing interface noise. |
| FN-23 | Blind tests need frozen build/script and observable milestones. | Phase 8. | Test protocol records build, seed, prompts, assists, timings, errors, and outcomes. |

## Borick Yongaerts analysis

| ID | Analysis obligation | Plan disposition | Acceptance evidence |
|---|---|---|---|
| BY-01 | End goal and onboarding remain unclear. | Same core promise as FN-02; Phase 2. | Blind explanation and funnel completion gate. |
| BY-02 | Invasive UI destroys flow and combo. | Phases 1/6: top-layer ownership, no forced modals, combo pause for blocking UI. | Interruption-time telemetry and all UI-stack combo contracts pass. |
| BY-03 | World interactions are basic despite many systems. | Phase 5: deepen a few in-world interactions before adding breadth. | At least one retained interaction changes observation/position/timing/consequence, not only damage. |
| BY-04 | Abilities/special blocks may not change the dominant verb. | Phase 4 role/overlap instrument and decision packet. | Each retained ability/block has a distinct scenario and measured use/value. |
| BY-05 | Ascending is waiting rather than play. | Phase 5: active route, portal, Flight recovery, and return decisions. | Return-time playtest shows meaningful input/choice and lower dead-time ratio. |
| BY-06 | Star Chart/Titans require reload or fail to update. | P1 regression route; Phases 1/4/6. | Unlock/purchase/event surfaces update live and after save/reload without manual refresh. |
| BY-07 | Scope is too broad; consider smaller vertical slice. | Adopt slice discipline, not automatic deletion; Phases 0–2. | Core slice passes before new workstreams open. |
| BY-08 | Smaller game/other engine is a strategic option, not an authorized rewrite. | Product gate outside this plan. | If considered, separate cost/risk/prototype decision is approved first. |
| BY-09 | Warframe mining illustrates a distinct observation/timing action. | Translate principle, not literal QTE; Phase 5. | World-space interaction remains in the mining route and has no separate minigame screen. |
| BY-10 | Main Menu throws a `TypeError`. | P0; Phase 1. | Boot/death/Escape/save-selector routes have zero console errors. |
| BY-11 | First session lacks a climax/payoff. | Phase 2 authored first portal/return/upgrade/resume payoff. | Blind players identify a memorable first-session achievement and choose to resume. |
| BY-12 | First return unlock bundle is too large. | Phase 2 one-at-a-time system introduction. | Event log proves staged reveals and no multi-panel dump. |
| BY-13 | Geode blocker can appear before Heavy Punch. | Retire geodes; Phase 5. No new tutorial or reorder for a removed system. | No geode generation/collision/render/guide references remain active; legacy saves migrate. |
| BY-14 | Abilities at roughly 500m arrive too late to shape early play. | Phase 4 unlock timing/role review. | First retained active ability arrives at a tested teachable moment and affects next route. |
| BY-15 | Return should become active rather than a free teleport or long wait. | Phase 5 portal/route design. | Return telemetry shows choices and no dominant exploit. |
| BY-16 | Build one mechanistically different world-space interaction. | Phase 5 prototype after core gate. | Frozen A/B test shows improved agency without worsening comprehension. |

## Cross-playtester drop-off funnel

| ID | Funnel obligation | Plan disposition | Acceptance evidence |
|---|---|---|---|
| XP-01 | Shared failure is comprehension before mastery. | Phase 2 prioritizes mental model over more content. | Main-input/help requests fall below gate in blind tests. |
| XP-02 | Funnel milestones must be observable: move, dig, recover/return, sell, upgrade, resume. | Phases 0/2 telemetry and route. | Each milestone has timestamp, assist count, abandon reason, and completion state. |
| XP-03 | Diagnose where and why players stop, not only completion. | Phase 8 reason-coded observation. | Reports distinguish confusion, boredom, trap, UI interruption, failure, and lack of payoff. |
| XP-04 | Changes must be evaluated as a complete first-session route. | Phase 8 frozen end-to-end run after focused contracts. | No slice accepted solely because its local test passes. |
| XP-05 | Preserve different positive signals while fixing the common funnel. | Upgrades, cave-ins, and visual wow remain explicit constraints. | Comparative playtest measures both completion and hook ratings. |

## Historical decision compatibility register — 2026-08-02 plans

| ID | Historical decision | Current disposition | Required reconciliation/evidence |
|---|---|---|---|
| HD-01 | Remove geodes; do not explain or reinvent them. | Binding until explicitly reversed; Phase 5. | Full active-reference inventory, save migration, world seed proof, and guide cleanup. |
| HD-02 | Portal is normal long return; Flight is local recovery. | Retain; Phases 2/5. | Both routes have distinct purpose/cost and no universal exploit. |
| HD-03 | Do not alter combo duration. | Retain; Phase 6. | Count/UI/pause fixes leave configured duration unchanged. |
| HD-04 | Remove forced modals/notification spam. | Retain; Phases 1/2/6. | UI ownership and interruption telemetry pass. |
| HD-05 | Do not add broad systems until core loop is proven. | Retain; phase gate after Phase 2. | Owner signs blind-test evidence before Phase 5 prototypes expand. |
| HD-06 | Level-up popup is removed or nonblocking. | Retain; Phase 6. | Level event never steals movement/dig input or expires combo time. |
| HD-07 | Depth Gates remain a typed progression interaction. | Current authority, despite older conflicting world-space proposal. | Revalidate modal ownership/readability; change only via explicit product reversal. |
| HD-08 | Star discovery popup is removed; Stars are unique progression, not a money popup. | Retain; Phases 4/6. | Discovery is in-world/nonblocking and currency purpose is clear. |
| HD-09 | Starter tutorial upgrade was removed; first portal is guaranteed. | Conflict with current seven-step route and active `agility` tutorial definition. | Phase 2 frozen A/B decides six-step vs seven-step; update docs/tests/config together. |
| HD-10 | Tutorial voice is optional; captions and muted operation are mandatory. | Retain. Recordings are not assumed ready. | Muted blind test passes; captions match actions; audio can be layered later. |
| HD-11 | No mining QTE/minigame. | Retain; Phase 5. | Interaction remains world-space and does not interrupt the core loop. |
| HD-12 | First portal is currently intended around 15m. | Treat as a value to verify, not eternal truth. | Current config/world seed and blind-test timing confirm or justify a single-source change. |
| HD-13 | Direct Casual route and explicit tutorial choice should be deterministic. | Retain; Phase 2. | Clean saves take the selected route with no stale tutorial flags. |
| HD-14 | One next system at a time after return. | Retain; Phase 2. Current `systemIntroduction` bundle must be split. | Event order and UI captures prove progressive disclosure. |
| HD-15 | Player-facing acceptance needs live/browser evidence. | Retain; Phase 8. | Contract-only completion is prohibited in closure templates. |
| HD-16 | Existing telemetry and frozen blind tests decide funnel changes. | Retain; Phases 0/8. | Comparison uses identical build/seed/script except the tested variant. |

## Conflict policy

When documents disagree, use this order:

1. Current explicit owner instruction and `.clinerules`.
2. Later raw player report for whether a symptom is still open.
3. Explicit normative product decision for scope/disposition.
4. Current runtime evidence for implementation truth.
5. Older implementation note as a lead, never as automatic acceptance.

Any decision that changes this order must be written as a dated owner-approved revision rather than silently embedded in code.
