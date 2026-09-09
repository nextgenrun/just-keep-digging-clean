# Original run motion, now walking

This animation-only GLB contains Mixamo Standard Walk from the exact source
`mixamo-standard-walk-123500901.fbx`. That motion occupied the running state
at the beginning of this task, before the retained Quaternius jog replaced it.

The walking clip uses the existing 160-bone public Survival mesh and its current
materials. The 24 reviewed poses are generated through the same production
Mixamo retarget helper, with the first pose repeated at one second for the loop.
The source FBX, Blender lab, and runtime jog mesh are unchanged.

Rebuild with `ai-tools/2026-09-06-export-original-run-as-walk.py` in Blender,
then `ai-tools/2026-09-06-pack-standard-walk.mjs`. The packer retains only bone
animation data and verifies that every track has a target in the shared mesh.
No character sprite sheet or duplicate mesh is generated for walking.
