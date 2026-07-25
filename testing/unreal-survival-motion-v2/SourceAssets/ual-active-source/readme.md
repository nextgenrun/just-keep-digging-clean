# UAL Active Source

This folder stores the generated FBX source used by the isolated
UAL-to-Survival Unreal IK Retargeter proof.

- Motion and timing authority: the approved active UAL clips.
- Deformation and appearance target: `SK_SurvivalCharacter_Fab_v1`.
- Rejected kick and sword-based up attack clips are intentionally excluded.
- Generated FBX files are proof inputs, not gametime assets.

Regenerate `UAL_Active_Source.fbx` with
`ai-tools/2026-07-17-export-ual-unreal-source.py` before running the Unreal UAL
retarget build.
