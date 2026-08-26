# Runtime Sheets

Production-authoritative v2 animation sheets and `manifest.json` live here. The selectable `survivalUal` profile game-loads idle, idle-talk, walk, the 36-frame `superman-flight-prone-v3` sheet, and `survival-character-blender-v2-dig-up-piskel-polished-sheet.png`. The polished upward action keeps all 24 authored frames at 27 fps while its manifest locks the lower-body anchor to x=128 and the visible ground line to y=248. The original `dig-up-sheet.png` remains protected input.

The approved 2026-08-14 quality-v1 promotion replaces the pixels of the active
walk, Piskel-polished upward mining, and exact prone-v3 flight sheets from
1024 px renders downsampled once into the existing 256 px cells. It retains
their frame order, FPS, animation keys, anchors, contacts, and motion sources.
The promotion adds the reviewed four-light/normal-map material response,
targeted deformation cleanup, corrective shapes, eye/cornea repair, and subtle
jacket/backpack secondary motion. See
`archive/2026-08-14-survival-quality-runtime-promotion-v1/` for byte-exact
rollback files and per-frame evidence.

Run remains the selected UAL `Jog_Fwd_Loop`; SIDE and DOWN keep their compatible UAL actions. The former `survival-character-blender-v2-superman-flight-sheet.png`, older `survival-character-blender-v2-fly-sheet.png`, and Blender run sheet remain source/rollback evidence. Regenerate prone v3 with `ai-tools/2026-07-26-render-superman-flight-prone-v3-runtime.py`; its production evidence lives under `testing/blender-animation-lab-v1/production-builds/superman-flight-prone-v3/`.

The accepted 2026-08-19 Mixamo runtime pass adds nine V4-rendered sheets for
walk start/stop, prone flight, idle fidget, crouch entry/hold/exit, Thunder
Strike and hard landing. All use the production 160-bone Survival rig, natural
fixed finger pose, full glove coverage, 1024 px source renders and exactly one
downsample to 256 px. Runtime presentation uses one 101 px scale with measured
per-sheet anchors. Current walk/run loops, mining families, flight handoffs,
wall, reactions and death remain unchanged. Hashes and gates are recorded in
`mixamo-accepted-runtime-v1-manifest.json`.

The approved 2026-08-20 complex-dig promotion adds eleven byte-exact sheets
from the green-free V4 combat sandbox: ten ordered SIDE stages and one
Uppercut-only UP action. They keep full glove coverage, 1024 px source renders,
one downsample into 256 px cells, measured origins, and a uniform 101 px runtime
size. Each visible action maps to one existing mining contact. The prior clips
remain loaded as rollback and can be restored immediately with `?complexDig=0`,
Ctrl+Alt+9, or the runtime global. Hashes and crop/contact provenance live in
`mixamo-complex-dig-runtime-v1-manifest.json`.

The 2026-08-21 ledge-assist addition uses the exact 35-frame Mixamo `Braced
Hang To Crouch` retarget: frame 0 is held while hanging and the full authored
clip plays during the body-authoritative pull-up. Its V4 sheet and promotion
evidence are recorded in `mixamo-ledge-assist-runtime-v1-manifest.json`.
`?ledgeAssist=0` omits the sheet and animations and restores the earlier
jump/Flight traversal without deleting the isolated source or proof assets.
