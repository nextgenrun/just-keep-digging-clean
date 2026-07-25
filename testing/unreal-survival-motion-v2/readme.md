# Survival Motion V2

Unreal Engine 5.8 retarget project for the approved Fab Survival character.
The current production-alternative path is:

- source character: `sprites/character/survival-character-fab-v1/source/survival_character.fbx`
- source motion carrier: `SourceAssets/ual-active-source/UAL_Active_Source.fbx`
- source rig: `/Game/SurvivalMotion/Retarget/IK_UAL_Active_Source`
- target rig: `/Game/SurvivalMotion/Retarget/IK_SurvivalCharacter_Fab_v1`
- transfer: `/Game/SurvivalMotion/Retarget/RTG_UAL_To_SurvivalCharacter_v1`
- outputs: 20 unique retargeted UAL clips under `/Game/SurvivalMotion/UALAnimations`

This project does not reuse the rejected Legacy Miner character, model, walk,
or rendered assets. It also excludes the rejected authored kick and
`Sword_Regular_C` up strike. SIDE, UP, and UP-SIDE remain punch-only; the fifth
side hit reuses Power Cross. The direct Blender skin-transfer experiment is not
part of this path.

The Phaser alternative renders 20 sheets / 911 frames from these 20 clips
because `Jog_Fwd_Loop` supplies distinct walk and run sheets. It inherits the
native UAL gameplay interface: 109px idle/action base, 123px locomotion display,
31x75 collider, action-start mining cooldown, visual-contact tile damage, and
diagnostic-only projected rig-marker validation.

## Build

Generate `UAL_Active_Source.fbx` with
`ai-tools/2026-07-17-export-ual-unreal-source.py`, then run
`Scripts/run-ual-retarget.ps1`. The commandlet writes
`SourceAssets/ual-survival-retarget-report.json` and the 17 retargeted assets.

Run `Scripts/run-ual-export.ps1` after a successful retarget to write the 17 FBX
animation carriers and `SourceAssets/ual-survival-export-report.json`. Render
the 512px source frames and manifests with
`ai-tools/2026-07-17-render-survival-ual-player.py`, then use the shared UAL
packer with the Survival asset prefix/pipeline id to produce the 18 WebP sheets.
Unreal remains the deformation/motion-transfer authority.

`Scripts/run-build.ps1` and `Scripts/run-export.ps1` retain the older Manny
eight-clip proof for comparison only; they do not build the UAL-driven runtime.

The Survival output is an alternative character choice, not a different mining
ruleset: it shares the same combo, contacts, cooldown, collider, and tile
throughput as native UAL.
