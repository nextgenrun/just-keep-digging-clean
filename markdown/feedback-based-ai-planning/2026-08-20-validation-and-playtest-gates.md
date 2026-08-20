# Validation and playtest gates — 2026-08-20

## Principle

Validation must answer two different questions:

1. **Did the implementation preserve its technical contracts?** Use direct Node contracts, deterministic fixtures, save round trips, and browser/runtime assertions.
2. **Did it solve the player's complaint?** Use the real Phaser loop, video/screenshots/audio review, telemetry, and frozen blind playtests.

A technical pass cannot substitute for a player-facing pass. A self-play cannot substitute for a blind-player comprehension gate.

## Gate order

| Gate | Required proof | Blocks |
|---|---|---|
| G0 — ownership | Dirty-worktree inventory, exact owned paths, rollback, save fixture | Any implementation edit |
| G1 — focused contract | Changed unit/config/system contracts and lint/syntax | Local browser review |
| G2 — deterministic runtime | Developer repro route, structured state snapshot, zero runtime errors | Natural-loop review |
| G3 — real loop | Browser play, input, video/screenshots/audio, save/reload, supported viewport | Blind test |
| G4 — frozen blind test | Uncoached players, fixed build/seed/protocol, telemetry and observer notes | Feedback-row closure |
| G5 — regression/release | Cross-feature suite, performance, migration, rollback, no P0 | Release candidate |

## Required deterministic routes

Each route must be callable in development without editing production values and must clearly indicate when it is a forced test route.

| Route | State matrix |
|---|---|
| First five | clean Casual, tutorial yes/no, keyboard variants, direct Demo, supported viewport |
| First return | portal found/missed, local Flight recovery, sell, upgrade, resume, staged introductions |
| Traps/blockers | self-dug Town hole, tight shaft, permanent boundary, tool gate, protected structure, accidental state |
| Dig contact | side/up/down, both facings, stationary/moving, open/tight, adjacent solids, cancel/chain, low FPS |
| Hardcore death | free revive, life remaining, final life, repeated callback, double input, save failure, timeout, reload mid-transaction, exhausted save |
| Stress/GP | warning crossings up/down, critical, near death, recovery, mute, reduced motion, rapid oscillation |
| Earthquake | eligible forced, natural schedule, no epicenter, no ceiling, shield held/released, UI pause, offscreen |
| Wurm | wrong mode, too shallow, missing unlock, low noise, cooldown, eligible forced, natural eligible, missing asset |
| Star/talent | locked, first free root, prerequisite unmet, affordable, purchase, max/insufficient, save/reload, compact viewport |
| World rewards | cave, chest, Sleeping Jackpot, special tile, first-time depth reward, legacy geode save |

## Technical contract suites

### Save and death

- A death transaction ID is unique and persisted.
- Replaying any transaction stage is idempotent.
- One accepted death causes exactly one life decrement.
- Continue remains unavailable until commit and readback agree.
- Save error/timeout leaves recoverable authored actions and does not consume an extra life.
- Final-life state, memorial/tombstone, and Save Vault destination survive reload.
- Scene shutdown cannot strand a pending delay or leave input locked.

### Animation and mining authority

- The gameplay target is selected before presentation and never changed by clip choice/alignment.
- Exactly one damage/contact event occurs per mining action.
- Physics body/collider remain unchanged by visual alignment.
- Visual offset stays within approved bounds and resets on finish/cancel/pause/scene shutdown.
- Clip metadata has striking limb, target family, motion class, contact frame/marker, reach/clearance envelope, and fallback.
- An incompatible kick/punch/up clip is rejected when its limb envelope intersects a non-target solid.
- Both directions use matching facing, input, target, contact, and ability damage.

### UI ownership

- Exactly one top layer owns Escape, Enter, pointer, keyboard navigation, and pause state.
- Escape closes the top layer before any fullscreen behavior.
- Opening a blocking layer pauses gameplay/combo once; closing any route resumes once with remaining time intact.
- Map keyboard/button, action bar, Star tree, recap, shops, and Start menu retain visible focus and matching hit areas.
- Floating-number mode is explicit, saved, migrated, and cannot silently become unavailable.

### Economy and progression

- Seed histograms validate material/tile distribution by depth band.
- Effective pickaxe damage is monotonic unless an explicitly displayed specialization owns the exception.
- Definition, description, displayed price/effect, runtime effect, cap, merchant, and save data agree for every upgrade.
- GP restore variants are exactly the approved five and bounded; none performs a full refill.
- Ability unlock, bar visibility, cost, cooldown, direction, hit, damage, and save/reload are tested together.
- Legacy geode state migrates without active generation/render/collision/guide references.

### Hazards and world interactions

- Admission diagnostics give one exact reason rather than a generic inactive state.
- Forced tests and natural scheduling share the same activation/effect/cleanup code after admission.
- Candidate search reports starvation and seed/location context.
- Telegraph precedes damaging state; pause/reload/offscreen cleanup cannot leave invisible damage.
- Chest/Jackpot rewards are atomic, persisted, and impossible to claim twice.

## Runtime and presentation review

### Browser matrix

- Clean and mature saves; Casual and Hardcore where relevant.
- At least one compact and one wide supported viewport; fullscreen and windowed transitions.
- Keyboard baseline plus any officially supported pointer/gamepad path.
- Normal and throttled frame rate for contact timing and input ownership.
- Reload during/after unlock, death, hazard, chest, and UI-state transitions.

Every route records:

- runtime revision, seed, mode, fixture and flags;
- console errors/warnings and rejected asset/audio loads;
- structured feature snapshot before/action/after;
- screenshot or short video at the decisive state;
- expected versus observed result and coverage IDs.

### Visual review criteria

- No missing/blank frames, unexpected old profile, foot skate, wall seam, black line, limb-through-solid, facing jump, or harsh unblended transition.
- Authored UI remains inside safe areas with readable font floors, visible focus, correct contrast, and hit targets matching the visible control.
- World light identifies retained special tiles without destroying darkness; focus follows the approved torso/head anchor.
- Deep biomes, caves, Pillar, portal, chest/Jackpot, death, Inventory, Map, and Star tree look like coherent authored families.

### Audio review criteria

- Material hit, tile break, valuable reward, portal, low GP, stress, near death, level/reward, and seismic hazard are semantically distinct.
- Stress and near-death never reuse earthquake/seismic warnings.
- Cooldown/hysteresis prevents threshold chatter; priority and ducking preserve urgent cues.
- Muted play remains fully understandable; captions describe actionable events rather than decorative sound.
- Approved playback is free of clipping, excessive repetition, building/particle leakage, and stale loop handles.

## Telemetry dictionary

Telemetry remains local/development or follows the project's approved privacy route.

| Event | Minimum fields | Question answered |
|---|---|---|
| `onboarding_stage` | stage, entered, completed, elapsed, assists, abandon reason | Where does comprehension fail? |
| `dig_action` | direction, motion, target material, clip, compatibility/fallback, contact validity, hit | Are animations and mining authority aligned? |
| `return_action` | method, depth, resources before/after, travel time, reason | Is return active, clear, and non-exploitable? |
| `ui_interruption` | surface, duration, combo paused, close method, input owner | Is UI stealing flow? |
| `hazard_admission` | hazard, eligible, gate reason, candidate result, depth/mode/unlocks | Broken or merely ineligible? |
| `death_transaction` | transaction ID, stage, lives before/after, save/readback, retry, destination | Where do life/crash failures occur? |
| `expedition_economy` | depth band, active time, gross/net value, HP/GP, return cost, failure | Does deeper risk pay? |
| `upgrade_decision` | options seen, chosen, affordability, next-use impact, hint shown | Are upgrades meaningful and hints relevant? |
| `ability_use` | ability, unlock, direction, target/hit, cost, damage/value, cooldown | Does each ability own a role? |
| `world_interaction` | kind, discovered, used, reward, failure/confusion | Do caves/chests/specials change play? |

## Frozen blind-playtest protocol

### Cohort and controls

- Minimum five fresh players for the first-five gate; use more for balance conclusions.
- Do not coach. Record any rescue as an assist and the exact trigger.
- Freeze build, seed family, start mode, tutorial choice, viewport, and observer script during a comparison.
- The observer may ask retrospective questions only after the route or a declared stop.

### First-five milestones

1. Identifies movement and moves intentionally.
2. Digs the intended tile and understands a blocker response.
3. Understands the expedition promise.
4. Recovers locally or uses the intended portal/return.
5. Finds the shop, sells, and makes one understood upgrade choice.
6. Resumes digging with a stated next goal.

### Required gates

| Area | Gate |
|---|---|
| First five | At least 4/5 complete all milestones without direct instruction; no player becomes unrecoverably trapped. |
| Goal | At least 4/5 can explain current action, next promise, and how to return. |
| First upgrade | At least 4/5 can state what changed and demonstrate it on the next expedition. |
| Animation contact | Expert frame review finds zero authority mismatch or non-target-solid intrusion in the matrix; ordinary players rate contact as intentional, not random. |
| Death | Zero crash/softlock/data mismatch across automated cycles and browser branches. |
| Hazards | Eligible players notice telegraph and can state response; diagnostics account for every ineligible run. |
| UI | No critical control is unreadable/unreachable; no active layer unexpectedly changes fullscreen or loses action bar. |
| Economy | Approved depth bands show increasing risk-adjusted net opportunity without a dominant farm/exploit. |
| Audio | Urgent states are distinguishable and non-spamming; muted route remains playable. |

## Stop and reassess rules

- If a P0 reproduces after two attempted fixes, stop polishing adjacent surfaces and audit state ownership/transaction boundaries.
- If first-five comprehension misses the gate twice, remove/resequence prompts and reveals before adding content.
- If animation contact still drifts after the clearance/alignment model, revisit asset markers, clip suitability, and presentation authority; do not add more random smoothing.
- If deeper reward only improves through raw multipliers, revisit travel, escape, hazard, and pocket design together.
- If an ability has no distinct measured role after one focused rework, advance it to the explicit merge/remove owner decision.

## Closure packet for each feedback ID

Attach:

- feedback ID and exact implementation slice;
- changed paths and values authority;
- focused contract result;
- deterministic route snapshot;
- browser evidence and console state;
- blind-player or expert-review result as applicable;
- save migration/rollback result;
- final disposition: `accepted`, `partially accepted`, `rejected by owner`, or `reopened regression`.

Without this packet, the row remains open even if code has shipped locally.
