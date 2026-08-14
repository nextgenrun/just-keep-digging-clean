# Survival Player Animation, Mesh, and Transition Audit

Date: 2026-08-14  
Scope: default `survivalUal` player only  
Boundary: review-only; no runtime, Piskel, Blender, gameplay, collision, or save changes

## Outcome

The character does not need a simple polygon-count increase. The production
mesh is already dense. The visible quality problems are best addressed as a
combined Blender deformation/retarget pass followed by a constrained Piskel
alignment and cleanup pass.

The main confirmed risks are excessive skin-weight fan-out, unapplied rig
object scale, linear-volume loss at joints, phase-composite pelvis offsets, and
an approval/QA inventory that is older than the active runtime profile.

## Audited Production Surface

- Default character: `survivalUal`.
- Active profile version: `survival-blender-v2-promoted-animation-polish-v4-20260803`.
- Required sheet authorities: 23.
- Piskel animation-polish definitions: 37.
- Locomotion/action transition keys: 42.
- Dig/action keys: 31.
- Active UAL/Piskel manifest actions found through loaded sheet filenames: 29.
- Central Piskel sources: 28-frame run, 133-frame transitions, 120-frame
  diagonal dig, 132-frame phase handoff, and two 22-frame moving side-dig
  clips.
- Blender-v2 Piskel-polished upward action: 24 frames.

## Confirmed Technical Findings

| Area | Evidence | Assessment |
|---|---|---|
| Mesh density | 83,188 vertices; 119,304 polygons | Already high quality; subdivision alone is not justified |
| Rig | 160 deform bones with complete index, middle, ring, pinky, thumb, hand, pelvis, and thigh chains | Finger distortion is not caused by missing finger bones |
| Skin weights | Zero unweighted vertices; average 2.371 influences; 16,019 vertices over four influences; maximum eight | High-priority cleanup candidate around hands, wrists, pelvis, thighs, clothing, and backpack |
| Object transforms | Mesh scale `1,1,1`; armature scale `0.01,0.01,0.01` | Retarget/export fragility; test applied transforms in a duplicate review blend |
| Skinning | Armature modifier preserve-volume disabled | Likely contributor to elbow, wrist, hip, and crotch collapse in extreme poses; requires A/B testing |
| Animated bone scale | Maximum sampled deviation from unit scale: about `0.000008` | No evidence that keyed bone scaling causes the stretching |
| Runtime resolution | 256x256 frames, displayed around 101-123 px; Blender source renders at 1024x1024 | Low-looking output is mainly small on-screen presentation and downsampling, not a low-poly mesh |
| Ground line | Active manifest alpha-bound bottoms remain locked where metadata is present | Existing baseline normalizer is working and must be preserved |
| Pelvis motion | Moving composites and polished run reach about 7.98 packed pixels between adjacent marker frames; airborne reaches 14.87; teleport 22.85 | Teleport/airborne movement can be intentional, but the repeated 7.98 px composite shift matches the reported hip instability and needs phase-aware smoothing |
| Piskel authoring | Central active files are 256x256, single-layer projects | Safe for anchor and silhouette cleanup, but poor for repairing 3D anatomy; anatomy must be corrected in Blender first |
| Profile metadata | `displaySizePxByAnimation` currently contains an `undefined` key | Confirmed cleanup defect; fix only with a focused contract |
| Review inventory | Browser inventory says generated 2026-07-24 while the active profile is 2026-08-03 and Piskel sources were updated 2026-08-11 | Must be rebuilt before final visual sign-off |

## Visual Findings

1. The current model reads clearly at inspection scale, but facial, glove, and
   clothing detail collapses at the real 101-123 px display size.
2. The run and moving-strike composites keep a stable ground line but show
   visible torso/pelvis phase offsets. The body shifts while the feet appear
   planted, which creates the unnatural hip-slide impression.
3. Hands are often rendered as compact dark glove masses. At action extremes,
   the combination of retargeted finger curl, wrist bend, and linear skinning
   can read as stretched or fused fingers.
4. The two-frame jog/idle bridges are functional but too short to hide every
   source-family change. They need pose-matched entry/exit selection and a
   three-to-five-frame visual settle where it does not change gameplay timing.
5. Piskel already fixes baseline and crop drift. It should not be used to paint
   over broken joint anatomy frame by frame because that would hide, rather
   than repair, the Blender source defect.

## Proposed Approval-First Polish Pass

### A. Blender deformation and motion review clone

1. Duplicate the production `.blend`; preserve the current master and runtime
   sheets byte-for-byte.
2. Apply a controlled transform normalization in the clone and verify retarget
   parity before any action edits.
3. Normalize and clean weights, then compare four- and six-influence limits.
   Smooth only wrists, palms, finger bases, elbows, shoulders, pelvis, crotch,
   thighs, jacket hem, and backpack straps.
4. A/B test preserve-volume skinning. Keep it only where it improves joint
   volume without inflating clothing.
5. Add finger-pose guards: natural fist curl order, thumb opposition, wrist
   alignment, and limits that prevent hyperextension.
6. Correct pelvis/spine continuity, knee tracking, foot locks, and root-motion
   removal per action. Preserve all gameplay contact frames.
7. Render at high source resolution and downsample once with consistent alpha
   handling. Do not enlarge collision, display size, or gameplay reach.

### B. Full active Piskel polish

Polish the 481 currently relevant Piskel-owned frames: run, transitions,
diagonal dig, phase handoff, moving jab/cross, and Blender-v2 upward dig.

- Keep one animation-wide scale; forbid per-frame rescaling.
- Lock the ground baseline and phase-aware pelvis target.
- Remove alpha ghosts, edge chatter, double silhouettes, and crop noise.
- Smooth torso-to-pelvis offsets without freezing legitimate run bob.
- Rebuild handoff frames from corrected Blender renders where anatomy changes.
- Preserve frame order, FPS, contacts, gameplay timing, and source rollback.

### C. Transition polish

- Idle to move: anticipation through a planted foot, then run phase match.
- Move to idle: select the closest plant phase, then a restrained settle.
- Moving dig: keep lower-body phase continuity and reduce pelvis offset across
  upper/lower compositing seams.
- Landing: preserve soft/hard distinction and contact frame; remove rebound
  pops.
- Flight: align enter, loop, travel, and exit body scale and shoulder/hip line.
- Wall brace: prevent wrist compression and keep hip weight against the wall.
- Action recovery: end on the nearest compatible idle/run pose rather than a
  generic snap.

## Acceptance Gates

- Review-only Blender clone and synchronized before/after player.
- No runtime promotion without explicit approval.
- Zero unweighted vertices; no accidental weight loss on clothing or backpack.
- No one-frame finger, wrist, pelvis, or knee discontinuity at 0.25x playback.
- Stable foot contacts and ground line at 30, 60, and 120 Hz presentation.
- Contact markers, mining reach, collision, damage, cooldowns, saves, and
  progression unchanged.
- Exact rollback files retained.
- Rebuilt current animation inventory, focused contracts, PNG/WebP validation,
  browser playback, and in-game QA before any production claim.

## Mockup

The approval board is stored at:

`visual-approval-previews/2026-08-14-animation-mesh-polish-v1/01-before-after-mesh-motion-mockup.png`

The left side is the exact current production preview. The right side is a
high-fidelity art-direction target for corrected fingers, wrists, kinetic
chain, pelvis balance, joint volume, material clarity, and downsampling. It is
not a generated runtime frame and is not game-loaded.
