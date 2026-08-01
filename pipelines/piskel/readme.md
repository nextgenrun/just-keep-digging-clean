# Piskel Pipelines

Repository-owned builders that convert editable `.piskel` sources into
runtime sprite assets.

The Fire Light V3 package is driven by
`ai-tools/2026-07-30-build-fire-light-piskel-polish-v1.py`. It round-trips ten
independent 16-frame projects, preserves the shared 313x313 grid, uses
integer-only source-root/luminous-core/state-row registration, enforces
true-black additive borders and energy retention, and emits hash-linked
candidate plus byte-exact rollback atlases. Runtime apply/rollback remains an
explicit separate command.

The Arc Core production builder round-trips ten gameplay images and one
sandbox background through two Piskel documents, checks zero-drift
fixed-center anchors and role order, then writes hashed runtime PNGs and
`values/arcCoreVisuals.sprite.json`. It rejects the archived random tile/HUD
roles by omission. Presentation remains in-engine image art; this pipeline
does not generate or ship visible HTML/HUD framing.

`2026-07-28-update-arc-core-dig-impact-piskel.py` preserves the eight approved
body/energy/cloud/beam roles, replaces only the two rejected device-like impact
frames, recenters both replacements on the 512 x 512 anchor, and writes the
active V4 Piskel source before the normal production builder exports it.

`2026-07-26-build-npc-idle-piskel-package.py` round-trips all 48 merchant
states through six editable Piskel documents, applies one uniform scale,
locks the lower-body root and foot baseline, writes v10 runtime WebPs, and
generates per-merchant alignment overlays and drift reports.

The 2026-07-28 NPC polish pair builds the active v13 release. The baseline
builder removes large chroma remnants, zeros hidden RGB beneath transparency,
preserves calm-loop timing, and establishes content-safe silhouette targets.
The activity builder matches all 42 accepted frames to those targets with one
fixed scale per merchant, uses each real baseline root/foot anchor, round-trips
the final frames through Piskel, and rejects clipping, matte leakage, or green
components.

`moving_side_dig_compositor.py` is the shared review/production compositor for
the Survival moving side-dig. It keeps Jog in charge of the pelvis and legs,
aligns the Jab/Cross upper body to the rig pelvis at the stable 109/123 source
ratio, and applies the approved contact-only backoff.
`2026-07-28-build-moving-side-dig-piskel-package.py`
round-trips the two base clips plus six phase variants through editable Piskel
sources, packs the variants into one 132-frame runtime atlas, enforces
anchor/baseline drift limits, and derives one shared contact marker from the
widest visible silhouette. `moving_side_dig_phase_handoff.py` owns the compact
entry family and planted-pivot maps; `moving_side_dig_runtime_module.py`
generates the frozen JavaScript runtime contract from
`values/movingSideDigProduction.json`. This keeps the apparent Jab/Cross size
matched to the surrounding Jog while retaining a compact contact envelope.
Each normal strike exposes 22 upper-body poses while Jog
advances its original 14 phases; seven-frame ease-in/ease-out envelopes remove
the compressed recovery snap without accelerating the feet or moving the
contact beat. Moving Quickslash samples 16 frames from the same Piskel-owned
phase variants so its original sequence-4 contact and fast cadence remain
unchanged without introducing another sprite sheet.
The same authored package now emits the 18 px solid-face body stand-off into
the generated runtime module and manifest; the Piskel silhouettes and their
validated 194 px contact envelope remain unchanged.

`2026-07-28-build-player-animation-polish-piskel-package.py` is the centralized
builder for the broader player handoff pass. It regenerates editable transition
and moving-diagonal Piskel sources, runtime WebP atlases, contact sheets,
alignment overlays, drift reports, rig-manifest actions, and the frozen runtime
module from `values/playerAnimationPolishProduction.json`.
`player_animation_polish_compositor.py` owns the planted Jog/idle, action-settle,
landing, and wall-brace clips. `player_animation_diagonal_compositor.py` keeps
Jog in charge of the lower body while UP-SIDE and DOWN-SIDE actions own the
torso. Both compositors share the same 256 px canvas, bottom anchor, and drift
validation before any generated sheet can be promoted.
