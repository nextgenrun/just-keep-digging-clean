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
The same authored package emits the 21 px solid-face body stand-off into the
generated runtime module and manifest. Rebuilding against the centered Jog
recomputes the matching 199 px source-space contact envelope while preserving
the same two-pixel clearance and collision-owned reach.

`2026-07-28-build-player-animation-polish-piskel-package.py` is the centralized
builder for the broader player handoff pass. It regenerates the editable Jog,
transition, and moving-diagonal Piskel sources, runtime WebP atlases, contact
sheets, alignment overlays, drift reports, rig-manifest actions, and frozen
runtime module from `values/playerAnimationPolishProduction.json`.
`player_animation_run_polish.py` verifies the immutable source hash, applies one
uniform rig-pelvis root correction, locks the packed-frame ground baseline, and
moves every foot/hand/head marker by the identical transform without rescaling
or retiming any pose. `player_animation_polish_compositor.py` owns the planted
Jog/idle, action-settle, landing, and wall-brace clips.
`player_animation_diagonal_compositor.py` keeps that polished Jog in charge of
the lower body while UP-SIDE and DOWN-SIDE actions own the torso. All three
outputs share the same 256 px canvas and validation gates. Saved WebPs must
round-trip every RGBA byte with zero hidden color beneath transparency,
preventing linear-filter color bleed in Phaser.

`2026-08-21-build-complex-dig-piskel-package.py` creates eleven editable
Piskel documents for the approved Survival V4 SIDE/UP combat family and proves
that every runtime frame round-trips pixel-exactly. One family-wide,
highlight-preserving gamma curve matches the brighter Mixamo render to the
existing idle/walk luminance while preserving V4 hues. The fixed 103 px scale
matches visible height without per-frame resize or a second downsample, and the
pipeline gates measured entry/exit residuals to 0.51 game pixels while leaving
intentional kick/uppercut lift untouched.

`2026-08-21-build-moving-complex-dig-piskel-package.py` extends that approved
SIDE family onto the existing phase-locked Jog lower body without changing any
stationary sheet. It emits eight entry phases for each of ten attacks, preserves
the two native double contacts in uncompressed 44-frame sequences, keeps every
run-phase step at zero or one, locks the foot baseline to zero drift, and
removes suspicious green spill before pixel-exact Piskel and lossless WebP
round trips. The 528-frame atlas is consumed only while resolved motion points
toward the target; stationary and collision-blocked attacks retain the original
complex clips.
