# Blender Animation Lab v1

Native Blender 5.1 review and authoring lab for the Dig Game player animation
set. The lab edits duplicated actions and imported review objects only. It does
not write production sprites, manifests, player profiles, hitboxes, or source
character files.

## Package

- `addon/dig_game_animation_lab/` is the installable Blender add-on.
- `review-drafts/<session>/` is the only supported save/render/export target.
- Runtime values and manifests are read as review input; exported JSON remains
  a draft until a separate, backed-up promotion step is explicitly approved.

## Start

From the repository root, the normal entry point is:

```powershell
& .\ai-tools\2026-07-17-launch-blender-animation-lab.ps1
```

Use `-Rebuild` to recreate the master from its read-only sources, or
`-BuildOnly` to build and validate without opening Blender. The launcher adds
`addon/` to Blender's script path, imports `dig_game_animation_lab`, calls
`register()`, and exposes **Easy Animation Lab** in the 3D View header.

The normal bootstrap may initialize `Scene.dgal` paths and create a session.
The add-on also works without the bootstrap and derives repository-local
defaults from its installed package location.

## Easy Animation Lab (default)

The normal opening view is intentionally small: it focuses the character and
shows a single **Easy Animation Lab** button in the 3D View header. Click it
once to open the simple controls. You do not need the Outliner, Properties,
Dope Sheet, FBX files, or the advanced panels for normal tuning.

1. Choose one animation from the browser, then Play or Restart that animation
   by itself before changing it.
2. Choose the Start, Impact, or End pose point for the current animation.
3. Pick a named major bone, such as Hips, Chest, Head, Left Hand, or Right
   Hand. The selected bone is the only edit target; use Blender's rotate gizmo
   in the viewport to place it.
4. Press Save Current Pose. Blender smooths the in-between frames.
5. To move a complete arm, choose Left or Right Arm, enter its Start and End
   frames, edit and save both endpoint poses, then press **Generate in-between
   frames**. Only shoulder-to-hand channels are replaced, and every frame in
   that range is keyed for review/export.
6. Adjust the one visible player hitbox, then compare Survival and Meshy or
   toggle the optional pickaxe/gear preview.
7. Press Save Review Copy when you want a safe review bundle.

The lab starts on Idle and uses the fixed review camera. It shows readable,
named major bones rather than the complete helper rig. The many thin sticks,
dots, and controls are animation helpers, not extra layers of the character or
evidence that its mesh is out of sync; they are hidden in the beginner view.
**Show Advanced Tools** exposes that raw helper rig and the technical panels
only when needed. **Focus / Restore View** returns the usual Blender layout.

## Reproducible master

`values/blenderAnimationLab.json` is the complete build contract. The bootstrap
opens the approved Survival source blend, copies the actions from 17 unique
Unreal-IK-retargeted FBX carriers onto its canonical `root` armature, removes
the temporary imported carrier objects, and saves only
`blender-animation-lab-v1.blend`. Jog is shared by walk and run, so the 17
master actions cover all 18 production action ids.

The master also persists the fixed production-framing orthographic camera,
three-light review stage, the 18-action catalog, the 31x75 body draft, and the
side/vertical/diagonal contact drafts. Blender 5.1 Action Slots are assigned
explicitly so every consolidated curve evaluates when an action is selected.

## Authoring flow

Select an action, choose selected bones or the complete rig, set the current
pose as Start/Anticipation/Contact/Recovery/End, then apply Bezier, Linear, or
Constant interpolation. Blender evaluates every in-between frame immediately;
**Bake evaluated tween** converts the result to ordinary per-frame pose keys.
The first pose edit creates a `DGAL_EDIT_*` copy and leaves the 17 protected
master actions unchanged.

Hitbox guides use the exact 512px render -> 448px crop -> 256px packed frame ->
109px display mapping. Gear and the fitted two-grip pickaxe are review-only
collections and never change the stable movement body.

The Mesh Fit panel defaults to the approved Meshy Warrior lab copy. It excludes
the demo pedestal, aligns the weighted body against the complete Survival
silhouette, preserves all native weights, and bakes 22 rest-space mapped bones
into a normal editable Meshy action. This is a comparison/cleanup starting
point, not automatic production approval.

The source blend and every carrier are SHA-256 checked before and after the
build. `build-report.json` records the hashes, action ranges, Blender version,
and `productionChanged: false` result.

## Validation

```powershell
python testing\2026-07-17-blender-animation-lab-contract.py --require-build
```

The contract checks the 17-carrier/18-action mapping, exact 94px tile and 31x75
body starting geometry, five-pose interpolation contract, primary Meshy review
candidate, master action inventory, and source preservation.

The deeper Blender smoke/proof is:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background `
  testing\blender-animation-lab-v1\blender-animation-lab-v1.blend `
  --python ai-tools\2026-07-17-validate-blender-animation-lab.py
```

It proves a 42-degree endpoint tween has a real 21-degree midpoint, keeps the
baseline unchanged, builds the hitbox/tile/gear/pickaxe guides, audits and bakes
the Meshy rig, renders matched Punch Jab frames, and saves an isolated proof at
`review-drafts/meshy-fit-endpoint-proof-v1/`.

## Safety contract

- Session objects live in `DGAL_*` collections.
- Protected `DGAL_*` master actions are copied to `DGAL_EDIT_*` before pose edits.
- Every mutating operator participates in Blender undo.
- Review bundles declare `productionChanged: false`.
- Save and render operators reject destinations outside this lab's
  `review-drafts/` directory.
