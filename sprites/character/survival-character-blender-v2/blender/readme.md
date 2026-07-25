# Blender Authoring Master

`survival-character-blender-v2.blend` is created from the already-imported Survivor rig by running `ai-tools/2026-07-15-setup-survival-blender-polish-v2.py` through the local Blender MCP bridge.

The production scene contract uses `SurvivalPolishRig`, `SurvivalPolishBody`, a fixed `CTRL_RenderAnchor`, and `SurvivalPolishCamera`. Optional procedural gear and pickaxe construction remain available in the setup script but are disabled by default. `MINER_*` actions are normalized copies of the genuine retargeted UE clips, so Phaser owns world movement while the full-body animation stays in frame.
