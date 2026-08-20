# Injured locomotion and earthquake animation plan

Date: 2026-08-20  
Status: plan only — not implemented, registered, or wired

## Goal

Add a readable strained/injured locomotive family when Gem Power is low and a
small, event-driven reaction family during earthquakes. The change is visual
only: it must not alter speed, acceleration, jump, Flight, collision, mining
contacts, GP economy, earthquake damage, knockback, or save data.

## Existing authority to preserve

- `PlayerAbilities` already exposes exact GP, maximum GP, percentage, and one
  change callback through `PlayerController`; a future presentation selector
  should consume that signal rather than poll HUD text.
- `EarthquakeSystem` already owns `idle → warning → earthquake → aftermath`
  and falling-rock impacts. A rock impact already applies authoritative
  knockback and queues the existing `earthquakeReactAnim` through
  `PlayerMotionPolishSystem`.
- `PlayerMotionPolishSystem` already arbitrates action locks, impact reactions,
  action recovery, wall brace, and idle fidgets. The new family should extend
  this owner instead of creating a competing animation controller.
- The fixed Space jump, powered Flight, movement envelopes, 31x75 body, tile
  contact rules, and current accepted combat animations remain unchanged.

## Mixamo discovery queue

These motions were found in the captured 740-motion library scan. They are
research leads only until an FBX is exported, retargeted to the Survival rig,
rendered with the V4 material treatment, and added to the proof audit.

| Game role | Mixamo lead | Captured motion id | Intended use |
|---|---|---:|---|
| Low-GP idle | Injured Idle | 125300901 | strained stationary loop |
| Low-GP walk | Injured Walk | export pending | grounded walk replacement |
| Low-GP run | Injured Run | 125240901 | faster strained locomotion |
| Low-GP turn | Injured Turn Left | 125330901 | optional turn continuity |
| Low-GP turn | Injured Turn Right | 125320901 | optional turn continuity |
| Quake stumble | Stumbling | 135740901 | brief active-tremor reaction |
| Quake retreat | Stumble Backwards | 137180901 | directional loss of balance |
| Quake fall | Falling From Losing Balance | 111530901 | severe direct-impact candidate |
| Direct impact | Knocked Down | 135610901 | only when gameplay already knocks down |
| Recovery | Getting Up | 126660901 | paired only with approved knockdown |
| Hard fall | Fall Over | 135600901 | severe-impact alternative |
| Warning brace | Body Block | 110530901 | compact defensive silhouette candidate |
| Warning duck | Ducking | 136280901 | warning beat without a new mechanic |
| Rock impact | Shoulder Hit And Fall | 136510901 | compare against current hit reaction |

## Proposed presentation states

1. `normal`: current locomotive and action library.
2. `low-gp-strained`: injured idle/walk/run/turn selected by the existing
   grounded motion state. It does not apply while crouching, airborne, flying,
   mining, attacking, wall-bracing, landing, or in a one-shot reaction.
3. `quake-brace`: optional warning pose, used sparingly and cancelled by input
   or an action lock. A warning must not immobilize the player.
4. `quake-stumble`: short one-shot selected from an explicit nearby-earthquake
   presentation event. It must not invent knockback, stun, damage, or immunity.
5. `impact`: current authoritative falling-rock impact path remains highest
   priority; a new clip may replace its visual only after approval.

Proposed priority, highest first:

`death → authoritative impact/knockdown → locked ability or mining action → landing/action recovery → quake one-shot → low-GP locomotion → normal locomotion → idle fidget`

## Low-GP entry and exit

- Reuse the existing low-GP warning as the initial entry signal; do not add a
  second contradictory threshold in code.
- Add a separate exit hysteresis value in `values/` only during implementation,
  after feel testing. A proposed starting point is warning threshold +10 GP.
- Keep the strained family active while GP regenerates through the entry point,
  then exit only above the hysteresis point. This avoids idle/walk flicker.
- Re-evaluate absolute GP versus percentage after testing upgraded GP tanks.
  This is an approval decision, not something this plan silently fixes.
- God Mode should remain normal locomotion even if a transient low value is
  observed during restore/startup.

## Earthquake event contract

Add presentation-only notifications at the existing state transitions, rather
than reading camera shake:

- warning start: intensity, proximity, epicenter distance, remaining time;
- quake start/pulse: intensity and player proximity;
- aftermath/finish: cancel brace/stumble selection;
- falling-rock impact: reuse the existing impact queue after knockback is
  applied by `EarthquakeSystem`.

Only nearby warning/quake events may animate the player. Active tremor should
use a cooldown and weighted chance so a five-to-twenty-second quake does not
loop-lock the character. Direct hazards remain the only source of knockback or
GP loss.

## Retarget and proof gates

Every candidate must pass before it can enter an approval row:

- production 160-bone Survival armature and current corrected skin weights;
- V4 materials, full-glove/fingertip correction, matched lighting and scale;
- 1024–2048 px render, downsampled exactly once to the review/runtime cell;
- zero green fingertip pixels and no eye-texture loss;
- baseline drift at or below the strict grounded threshold;
- loop seam, foot locking, knee tracking, pelvis continuity, wrist/finger and
  jacket collision inspection;
- mirrored-facing check and 101–123 px game-scale review;
- current runtime beside candidate with infinite replay.

## Approval sequence

1. Restore Mixamo access and export the discovery queue FBXs without skin.
2. Retarget all leads to the Survival rig and reject gate failures before UI.
3. Add only matched V4 proofs to the V3 audit; generic Mixamo previews remain
   discovery metadata, never acceptance evidence.
4. Approve one complete low-GP family and at most one warning, one stumble, one
   impact, and one recovery clip.
5. Build a review-only state-machine sandbox with forced GP and quake phases.
6. After explicit approval, implement through the existing motion-polish owner
   and central `values/` configuration, then run gameplay and browser QA.

## Explicit non-goals

- No implementation in this pass.
- No new injury health mechanic, movement penalty, stun, or jump change.
- No polling visual shake as gameplay state.
- No generic Mixamo character used for animation approval.
- No runtime asset registration until the retargeted family is accepted.
