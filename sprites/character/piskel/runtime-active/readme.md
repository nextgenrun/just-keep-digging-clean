# Runtime-active Piskel sources

This folder contains editable `.piskel` sources and generated review artifacts
for animations that can be exported into the live runtime.

The manifest owns frame size, count, FPS, anchoring, and output paths. Do not
hand-edit generated metadata, previews, contact sheets, or drift reports.

`player-animation-polish-run.piskel` contains the 28-frame production Jog after
uniform rig-root centering and baseline locking; its source poses, scale, cadence,
and sequence-13/27 footfalls remain unchanged.
`player-animation-polish-transitions.piskel` contains the planted Jog/idle
bridges, stationary action settles, authored soft/hard landings, and wall-brace
entry/loop/release clips. `player-animation-polish-diagonal-dig.piskel` contains
the eight phase-selected UP-SIDE/DOWN-SIDE mining variants. Rebuild all three through
`pipelines/piskel/2026-07-28-build-player-animation-polish-piskel-package.py`;
the generated review board is
`contact-sheets/player-animation-polish-runtime-review.png`.
