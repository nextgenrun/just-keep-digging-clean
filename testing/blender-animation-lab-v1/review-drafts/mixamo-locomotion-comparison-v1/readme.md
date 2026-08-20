# Mixamo locomotive comparison v1

Review-only locomotion extension for comparing the exact active Dig Game player
motions with matched Mixamo candidates on the approved Survival V4 character.
It adds neutral walk, run, crouch-walk, jump and falling carriers to the existing
accepted Mixamo transition library.

Nothing in this directory is preloaded or referenced by runtime. The full jump
is an animation-quality reference only: Dig Game still has no player jump
mechanic. Any promotion requires a separate explicit decision after the
side-by-side review.

All candidates are downloaded at 30 FPS without skin, retargeted to the
production 160-bone rig, rendered at 1024 px with the approved full-resolution
PBR/full-glove treatment, and downsampled once to 256 px.

`continuity-report.json` measures the lowest-discontinuity startup, walk, run
and slowdown frame pairings after applying active runtime scale and anchor
projection. It is audit evidence, not automatic promotion authority.
