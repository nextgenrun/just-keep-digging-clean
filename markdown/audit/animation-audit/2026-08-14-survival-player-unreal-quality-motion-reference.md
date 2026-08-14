# Survival Player Unreal-Quality Motion Reference

Date: 2026-08-14  
Scope: default `survivalUal` player  
Boundary: review-only; production unchanged

## Decision

The character should not receive blanket subdivision. It already contains
83,188 vertices, 119,304 polygons, 160 deform bones, and 4K–8K PBR textures.
The moving comparisons show that the same mesh reads much better when motion,
lighting, materials, and deformation are handled coherently.

The best fit for this Phaser project is a baked Unreal-quality 2D pipeline:
repair the Blender master in a review clone, use the strongest approved
retargeted motions, render at a higher source resolution, and downsample once
into the existing sprite contract. A true realtime-Unreal appearance at only
101–123 on-screen pixels is not physically achievable without increasing the
character's screen presence or changing the renderer.

## Confirmed Quality Blockers

| Priority | Finding | Visible effect | Corrective direction |
|---|---|---|---|
| P0 | Seven lights from two simultaneous rigs | Pale, flat materials and weak body form | Keep one authored key/fill/rim/ground rig |
| P0 | Body and hair normal maps interpreted as sRGB | Incorrect surface normals and softened detail | Set data textures to Non-Color and audit every PBR socket |
| P0 | Eye base-color image unresolved | Dead or inconsistent eye read | Relink the correct eye texture and pack/validate dependencies |
| P0 | 16,019 vertices exceed four influences; maximum eight | Wrist, finger, hip, thigh, cloth, and strap instability | Normalize and prune weights locally; do not globally decimate |
| P0 | Preserve-volume skinning disabled | Joint collapse at wrists, elbows, hips, and crotch | A/B per mesh region and add corrective shapes where required |
| P1 | Retargeted finger and wrist extremes lack pose guards | Stretched/fused fingers and broken silhouettes | Add finger curl order, thumb opposition, wrist limits, and hand correctives |
| P1 | Pelvis/root phase discontinuity across composite families | Unnatural hip shifting and planted-foot sliding | Match source phases, lock contacts, and smooth the pelvis/spine kinetic chain |
| P1 | Small final presentation at roughly 101–123 px | 4K texture and facial detail disappear | Render high, downsample once, sharpen selectively, and review at true size |

## Proposed Upgrade Pass

1. Create a protected Blender review clone and make its render deterministic:
   one four-light rig, correct color management, all normal/ORM maps Non-Color,
   relinked eyes, and packed dependencies.
2. Repair deformation only where evidence demands it: palms, finger bases,
   wrists, elbows, shoulders, pelvis, crotch, thighs, jacket hem, and backpack
   straps. Use cleaned weights plus corrective shape keys instead of adding
   polygons everywhere.
3. Add animation safeguards: foot and pelvis locks, knee tracking, hand-pose
   limits, root-motion normalization, and pose-matched transition entry/exit.
4. Select or author higher-quality Unreal-style motion, then retarget onto the
   corrected rig. The existing isolated GASP comparison demonstrates that
   motion quality changes the read without changing the mesh.
5. Render at 1024 or 2048 source resolution with stable alpha, then perform one
   controlled downsample to the existing 256 px frames. Preserve the runtime
   ground line, contacts, timing, collision, reach, and rollback files.
6. Judge every deliverable in motion at both inspection scale and true 123 px
   scale. Still screenshots are not an animation acceptance gate.

## Approval Evidence

- `visual-approval-previews/2026-08-14-animation-mesh-polish-v2-motion/01-locomotion-current-vs-blender-vs-gasp.mp4`
- `visual-approval-previews/2026-08-14-animation-mesh-polish-v2-motion/02-action-deformation-current-vs-blender-vs-gasp.mp4`
- `visual-approval-previews/2026-08-14-animation-mesh-polish-v2-motion/03-blender-lighting-material-motion-ab.mp4`

These videos are synchronized review artifacts. Nothing in this package is
preloaded or registered by the game.

## Promotion Gate

After visual approval, implement one isolated Blender/material/deformation pass
and render a complete replacement candidate without wiring it. Promotion must
remain a separate explicit decision after side-by-side browser and in-game QA.
