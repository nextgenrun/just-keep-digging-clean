# Robot Sphere V2

Single-robot, real 3D-rendered animation source for `testing/animation-sandbox/tanktest-v1`.

The source Blender scene uses articulated armor panels, a gimballed face, rolling shell, plasma thruster, and deployable drill. Runtime strips cover idle, roll, fly, side dig, up dig, and down dig. The animation is rendered motion, not pose swapping or procedural scaling in Phaser.

Build from the project root:

```powershell
python ai-tools/2026-07-15-build-robot-sphere-v2.py
```

Generated files:

- `blender/robot-sphere-v2.blend`
- `runtime/robot-sphere-v2-*-sheet.png`
- `previews/robot-sphere-v2-motion-contact-sheet.png`
- `manifest.json`
