# Mixamo Ledge Assist V1

Runtime-authorized Survival V4 retarget of Mixamo `Braced Hang To Crouch`.

- `source-fbx/mixamo-braced-hang-to-crouch.fbx` is the animation-only FBX
  downloaded from the signed-in Mixamo library at 30 FPS.
- `renders/raw-1024/` is produced by the dated Blender renderer.
- `renders/candidate-runtime/` is produced by the dated one-downsample packer.
- The first authored pose supplies the held ledge hang; the complete 35-frame
  clip supplies the pull-up to crouch.
- Gameplay collision and the final standing position remain code-authoritative;
  the animation never decides whether a ledge is reachable.

