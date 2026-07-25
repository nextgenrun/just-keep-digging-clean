# UAL walk review v1

Additive, review-only chooser for five native UAL locomotion loops. It compares
the previous `Walk_Loop` baseline with Formal, Jog, Sprint, and Carry candidates
using the production 94px tile size, 31x75 collider, 200px/s walk speed, and
shared stride-matching function. This selection-era page keeps its direct 109px
source comparison; the promoted game and tuning lab apply the current 123px
locomotion compensation against the 109px idle/action base.

The default **Live game matched** mode shows each source as a direct replacement
for the current walk contract. **Native 30 FPS** exposes the untouched authored
cadence. Facing, collider guides, speed, shared time, pause, and step controls
make foot sliding and torso instability easy to inspect. The 2x camera option
enlarges the character and 94px tiles together, preserving their exact ratio.

`review.js` owns controls and selection while `reviewStageRenderer.js` owns the
fixed-scale canvas stages. The selection is stored locally and mirrored into the `?candidate=` query string.
Option C was promoted after review. The page itself remains read-only and keeps
the other four sheets only for comparison; production now maps normal walking
to `Jog_Fwd_Loop` through `values/ualNativePlayerAssetProfile.js`.
The footer now links directly to `ual-animation-tuning-lab-v2`, where production
transitions, contacts, collisions, cadence, and all 21 review actions can be
tuned. Only 18 sheets / 867 frames are game-loaded; Hook, the authored kick,
and `Sword_Regular_C` up strike remain rejected review assets.

Run from the project root:

```bash
python serve.py 8093
```

Open:

`http://127.0.0.1:8093/testing/animation-sandbox/ual-walk-review-v1/`
