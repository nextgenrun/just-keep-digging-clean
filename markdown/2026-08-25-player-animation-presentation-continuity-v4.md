# Player Animation Presentation Continuity V4

## Outcome

The unified Survival character now keeps its authored scale through mining,
falling, landing, crouching, and action recovery. This pass does not replace a
sheet, change an animation frame, alter the 101 px runtime size, move the
collider, or change action/contact timing.

## Corrections

- The unified runtime is the sole owner of character squash, stretch, and
  impact silhouette. The older procedural `PlayerBodyLanguageSystem` no longer
  scales unified frames after playback. Legacy profiles retain that layer, and
  it now restores its exact base scale once a deformation reaches neutral.
- A completed main-world action chooses one recovery path. A successful
  phase-locked Jog resume or authored two-frame settle clears the older timed
  combat-idle recovery instead of arming both systems. The legacy recovery
  remains available when no authored recovery can start.
- Main-world and compact-cave crouching use the same pure enter/hold/exit
  selector. The cave runtime no longer snaps directly between standing and the
  crouch loop.
- Restart metadata is honored only when it belongs to the animation actually
  selected for playback. Crouch overrides and deferred fallbacks therefore
  cannot inherit a stale locomotion restart request and replay frame zero every
  update.

## Preserved authority

- unified Survival V1 sheets, frame order, materials, lighting, and origins;
- 101 px presentation size and pose-aware collider profiles;
- movement acceleration, release, reversal, Flight, and ledge behavior;
- mining cooldowns, combo order, action contacts, damage, hitboxes, and tile
  reach;
- phase-locked moving-dig Jog resume and all V2/V3 rollback boundaries.

## Rollback

Add `?presentationContinuity=0` to restore procedural body-language scaling and
the former legacy post-action recovery preference. Existing narrow rollbacks
such as `?transitionCohesion=0`, `?colliderV2=0`, and `?unifiedAnimation=0`
remain independent.

## Validation

- `testing/2026-08-25-player-animation-presentation-continuity-v4-contract.mjs`
  executes unified scale ownership, legacy neutral restoration, all six crouch
  transition states, authored-versus-legacy recovery policy, main/cave sharing,
  restart ownership, and rollback resolution.
- V3 transition cohesion, V2 collider contact, unified runtime, deferred asset,
  action-contact, moving-complex-dig, and visual-system contracts are rerun as
  focused regression gates.
- A real 1280x720 WebGL boot reached PlayScene with Ultra backing. Unified core
  plus resident crouch, Flight, landing, and transition sheets returned HTTP
  200 and the browser error log was empty. Existing Memory Reliquary safe-anchor
  warnings remained unrelated.
