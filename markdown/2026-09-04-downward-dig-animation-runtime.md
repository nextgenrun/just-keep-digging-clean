# Downward Dig Animation Runtime — 2026-09-04

> Updated 2026-09-06: the turning leg-sweep step is rejected. Runtime now uses two stages and preserves the cooldown pose while aiming down. See [the current fix](2026-09-06-downward-mining-pose-hold.md). The original implementation record follows.

## Outcome

The default Survivor no longer repeats one animation for every downward hit.
Exact DOWN and DOWN-SIDE mining now use the existing resettable combo selector
and rotate through three visually distinct, contact-synchronised stages:

| Stage | Runtime action | Frames | Contact | Contact owner |
|---|---|---:|---:|---|
| 1 | Retained UAL ground strike | existing production sample | existing authored contact | hands |
| 2 | Reviewed low body punch | 2–18 | texture 12 / sequence 10 | hands |
| 3 | Reviewed leg sweep | 2–23 | texture 16 / sequence 14 | feet |

Direction changes, target changes, or a pause beyond the existing combo window
return the selector to stage one. The gameplay cooldown, committed target,
31x75 collider, GP rules, and one authoritative tile contact per action are
unchanged. All three actions retain the validated 750 ms maximum visible-action
envelope; the remaining mining cadence belongs to recovery.

Moving DOWN-SIDE attacks map the two new planted clips to the existing
phase-matched down presentation. This preserves leg cadence and avoids sliding
a stationary strike while the body is moving.

## Assets and ownership

`values/downwardDigAnimations.js` is the single source for sequence order,
frame ranges, contacts, origins, scale, provenance, hashes, and rollback. The
review sheets remain under the Mixamo punch-sequence sandbox. Identical PNGs
were promoted to the mixed Survival runtime and converted losslessly to the
unified WebP runtime:

| Clip | Review/source SHA-256 | Unified WebP SHA-256 |
|---|---|---|
| Low body punch | `074163aa5a55440748c93334f8dff931534f454b121fb49585e04350739c8e51` | `d4dfa5aef3c4c3e6f7240e17b8e13078654530ed33a8b8b3a05c281a080e17db` |
| Leg sweep | `f2cf0598c6c98875d111e20a24b187aab592e8bfe4c65c87d0eaf743dedb5471` | `3613596aa33627cca1f7b04d456a201f79747bd78cc1b100c62345816c1edc6c` |

The lossless WebP conversion was decoded and compared against each PNG as
RGBA pixels. Both comparisons were exact.

## Loading and rollback

The new sheets share the deferred `complex-down-mining` pack. The first normal
DOWN request prewarms the pack in both the main world and compact caves; the
pack uses the existing 60-second anti-thrash release delay.

Use `?downDigCombo=0` to remove both additions and restore the prior single
ground-strike DOWN/DOWN-SIDE family. This rollback is independent of
`?complexDig=0`, which continues to own the SIDE/UP complex families.

## Validation

Focused contracts passed for the exact three-stage sequence, contacts,
animation registration, file dimensions and hashes, unified paths, deferred
pack ownership, prewarm hooks, recovery, moving-diagonal mapping, cooldown
rhythm, traversal input, and impact polish. The primary result is:

```text
DOWNWARD_DIG_ANIMATION_RUNTIME_CONTRACT_OK {
  stages: 3,
  newClips: 2,
  contacts: [ 12, 16 ],
  deferredPack: 'complex-down-mining',
  rollback: '?downDigCombo=0'
}
```

The canonical local game was also opened with
`?gameplayProfile=full-review`. Real DOWN aim plus Dig input reached the mining
loop, broke the targeted tile, and raised XP from 150 to 180; the browser
reported no console errors or warnings. The focused contract separately pins
the exact order and registered frame lists so a later profile edit cannot
silently collapse the family back to one clip.
