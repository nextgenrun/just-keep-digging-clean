# Legacy Miner Unreal Walk Sandbox

Walk-only Unreal Engine 5.8 integration proof. The project imports the already-rigged Meshy Legacy Miner, retargets Epic's standard unarmed Manny/Quinn forward walk with Unreal's native IK Rig stack, then ports Unreal's result into the existing 51-frame 2D review contract.

## Unreal animation source and retarget

- Source mesh: `/Game/Characters/Mannequins/Meshes/SKM_Quinn_Simple`
- Source clip: `/Game/Characters/Mannequins/Anims/Unarmed/Walk/MF_Unarmed_Walk_Fwd`
- Source IK Rig: `/Game/LegacyMinerWalk/Retarget/IK_Manny_Unarmed_Source2`
- Target IK Rig: `/Game/LegacyMinerWalk/Retarget/IK_LegacyMiner_Meshy_v5`
- Five-operation IK Retargeter: `/Game/LegacyMinerWalk/Retarget/RTG_MannyUnarmedWalk_To_LegacyMiner_v2`
- Unreal output: `/Game/LegacyMinerWalk/Animations/LegacyMiner_Unreal_Unarmed_Walk`

Both skeletons receive Unreal auto-retarget definitions and the output animation is generated inside Unreal. `SourceAssets/unreal-walk-build-report.json` records the exact assets and retarget state.

The Animation Locomotion Library and IK Rig plugins are enabled. The former supplies runtime distance-matching/play-rate nodes; it is not the skeletal retargeter and is deliberately not misrepresented as having authored this offline bake. Native IK Rig/IK Retargeter performs the actual character transfer. No locomotion runtime or gameplay controller is added in this walk-only experiment.

## Blender presentation boundary

Unreal exports the completed retarget as `SourceAssets/legacy-miner-unreal-walk-retargeted.fbx`. Blender only reapplies the Legacy Miner texture, renders transparency, tracks the root, and locks a 120-degree right-facing side/three-quarter camera matching the old sprite. It does not author or replace the animation. The editable presentation scene is `SourceAssets/legacy-miner-unreal-walk-render.blend`.

## Review outputs

- `Renders/legacy-miner-unreal-walk-sheet.webp`: lossless 5456x1364 sheet, 16x4 cells, 341x341 each, 51 used frames
- `Renders/legacy-miner-unreal-walk-preview.webp`: 51-frame animated preview at 14 fps
- `Renders/legacy-miner-unreal-walk-contact-sheet.png`: sampled contact sheet
- `../animation-sandbox/legacy-miner-unreal-walk-poc/index.html`: synchronized old/new review harness

This project does not wire the candidate into Phaser gameplay and must not add idle, digging, combat, effects, or other animations. Generated Unreal caches stay ignored; authored `.uproject`, `Config`, scripts, source assets, and final review outputs are the durable files.
