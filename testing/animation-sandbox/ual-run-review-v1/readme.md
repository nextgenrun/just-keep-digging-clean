# UAL run review v1

Review-only in-game comparison for five real current-character locomotion
renders already available in this checkout. The stage uses the production
Survival display size, 31x75 gameplay body, 94px tile grid, and the same
stride-matched playback function used by the live player renderer.

The cards compare the current Blender v2 run, the Unreal retarget proof run,
the Survival UAL retarget jog, and two planted walk-source stress tests. They
all use the current Survival character skin; no native-placeholder character
or mockup art is used, and no candidate is promoted by this page.

The Unreal proof project remains the deformation authority. This page shows
actual runtime-rendered candidate sheets from the current character pipeline,
including the UE5 IK-retargeted sources, rather than inventing a new 3D clip or
presenting a static mockup.

Run from the project root:

```bash
python serve.py 8093
```

Open:

`http://127.0.0.1:8093/testing/animation-sandbox/ual-run-review-v1/`
