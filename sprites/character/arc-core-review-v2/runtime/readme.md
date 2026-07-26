# Arc Core Review V2 Runtime Sprites

Normalized 512 x 512 transparent sprites from the superseded v2 review. They
are not consumed by the current game; v3 lives under
`sprites/vehicles/arc-core-v3`.

Do not hand-edit these files. Rebuild them from the approved alpha masters:

```powershell
python tools/build_arc_core_sprite_package.py `
  --source-dir sprites/character/arc-core-review-v2/source `
  --output-dir sprites/character/arc-core-review-v2/runtime
```
