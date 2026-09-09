# Contact-local dig impact polish

The approved presentation keeps the character over the tile's front artwork.
`playerSolidOcclusion=1` restores the optional limb mask; body collision and
the moving-dig stand-off are unchanged.

## Contact and timing authority

`values/digImpactContacts.generated.js` records 129 contact points across 20
current unified character sheets, including every running phase and both hits
of the double-strike combos. Coordinates come from the actual lossless runtime
pixels, not the rejected legacy rig manifest. Each sheet has a source hash.
The audit selects a connected opaque tip, avoiding a centroid between separate
hand/boot silhouettes. Running composites retain their 192 px source geometry
and existing 117 px display size.

The unified-only contact correction moves Roundhouse 8 to 9, Spinning Back
Kick 16 to 12, Uppercut 17 to 10, and Elbow-Uppercut 11/22 to 8/16. Moving
down-diagonal contacts move from sequence 6 to the visibly extended sequence 4.
All other contact times, clip frames, playback rates, combo lengths, costs,
damage, movement and reach remain unchanged. The old character pipeline keeps
its original mappings.

The normal mining callback passes its successful action/contact identity to
`DigImpactFxSystem`. It flushes at the same frame's `postupdate`, after movement
has resolved. Each contact uses the real animation's playback-frame address,
including phased-atlas offsets, current facing, scale and origin. The impact
stays at the fist/foot inside the tile's front plane; only an out-of-cell point
is bounded to the tile. Missing metadata falls back to the contacted face and
cannot veto gameplay. Failed mining, duplicate callbacks and remote projectile
targets do not produce additional ordinary-hit effects.

## Existing artwork and bounded feedback

The small material-matched flash and foreground chips reuse the promoted
`tile-destruction-core-v3` and `tile-destruction-shards-v3` atlases. No new raster
art or procedural particle shapes are introduced. Strike-specific intensity,
the limb's incoming sweep, mirrored orientation and modest variation shape the
burst. Breaking a whole tile retains the existing destruction presentation.

There is one scene-owned system in the main world and compact caves, a 48-object
cap, reduced-motion settings, duplicate-contact protection and complete tween /
event teardown. Speed Block's yellow impact sparks receive the same point;
its +50% buff and duration are unchanged. No new camera-shake owner, hitstop,
actor translation or actor scaling is added.

`?digImpact=0` rolls back the added bursts and unified contact-marker corrections.
`?playerSolidOcclusion=1` independently restores limb masking.

## Reproducible review

Use canonical `serve.py` with local
`?jkd_e2e=1&collisionReview=1&cinematics=0`. In gameplay:

- F1 stages the save-disabled high-HP wall and ceiling.
- Shift+F8 catches the next real contact, including its point/frame caption.
- F8 resumes; F7 compares the limb mask without changing the pose.
- `impactFacing=left` mirrors the fixture; `impactMaterial=copper`, `dirt`, or
  `glow_crystal` selects another real material.

`testing/2026-09-03-dig-impact-polish-contract.mjs` checks source hashes, contact
coverage, timing corrections, 192 px projection, mirroring, same-frame movement,
duplicate/multi-hit behavior, particle limits, reduced motion, rollback and
main/cave ownership. Also run the existing jump/flight, authored-contact,
level-one rhythm/speed, collision-rollback and limb-occlusion contracts.

For asset re-audits, pipe `testing/2026-09-03-dig-impact-descriptors.mjs` into
`testing/2026-09-03-dig-impact-asset-audit.py --contacts`. It prints the measured
records and creates diagnostic contact sheets under `testing/`; it never edits
character or FX artwork. Review the point overlays before promoting any new
coordinates or source hashes.

## Focused verification on 2026-09-03

All 11 selected regression files passed: the 14 new impact checks plus authored
contact timing, complex clips, level-one rhythm/running scale, upward/wall
pipeline, Speed Block balance, jump/flight input, collision rollback, pose
colliders, limb occlusion/review, and tile destruction. The impact checks also
exercise the real main-world feedback queue with both contacts in one skipped
frame, natural tween expiry, absent atlases, and teardown before presentation.

Real-input browser review used the canonical local source and save-disabled
level-one fixture. Reviewed contacts included Cross 10, Roundhouse 9,
Jab-Elbow 9/20 with different points, upward Jab 11, Uppercut 10, and a
left-facing copper Jab 9. F7 preserved the same frozen pose while masking only
the limb. With `digImpact=0`, the roundhouse returned to frame 8 and the added
contact particles disappeared. Reviewed sessions reported no browser errors;
the save chooser retained its original 8 tiles dug after reloads.

Running-phase projection and main/cave wiring have automated coverage; this
was not a complete manual moving-dig or cave playthrough. The separate
`2026-08-29-camera-shake-gamefeel-contract.mjs` failed at its `mining.crit`
expectation because the current shake configuration has no such preset.
Camera-shake source/configuration was not changed by this work. These focused
checks are not a claim that the full repository suite is green.
