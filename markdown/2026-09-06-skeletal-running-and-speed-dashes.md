# Skeletal running and soft speed dashes

Running now uses a live skinned Survival Character mesh driven by the retained
Quaternius Jog_Fwd_Loop. The previous run-state draw showed Mixamo Standard Walk.
Normal movement still uses the existing controller and animation-selection timing;
the run presenter replaces the selected running draw with the animated mesh.

## Speed and presentation

Ctrl running is 2.1 times current walking speed, increased from 1.5 times.
The baseline is 336 px/s instead of 240 px/s: exactly 40% faster.
Upgrades and wet-ground effects continue through the existing speed resolver.
The same run GP drain, collision owner, jump and Flight controls remain in use.

The retained 160-bone skeleton is animated continuously by Three.js r180.
A fixed orthographic camera renders one current mesh pose into a Phaser texture.
There is no generated character sprite sheet for this run. The original
Blender and FBX source files are unchanged; the GLB uses four normalized
bone influences per vertex and compact PBR texture derivatives.
The main scene and compact cave scene share the same presenter and lifecycle.

The custom dash is an unmodified transparent ImageGen PNG. A bounded,
distance-driven trail fades and stretches behind the moving player.
Dashes stop emitting when movement, running, or grounded state ends.
Reduced-motion preferences suppress the trail. Footstep sounds follow the
skeletal stride rather than the old walk frame cadence.

## Files and reproduction

- values/playerRunning.js: speed and existing run GP cost.
- values/playerSkeletalRun.js: asset, camera, scale, lighting and stride.
- player/PlayerSkeletalRunPresentation.js: the Phaser draw bridge and lifecycle.
- player/SkeletalRunMeshRenderer.js: skeletal animation and rendering.
- values/playerRunDashFx.js and systems/visual/PlayerRunDashFxSystem.js: dash configuration and playback.
- sprites/character/survival-skeletal-run-v1/manifest.json: public mesh and source provenance.
- sprites/fx/player-run-dashes-v1/speed-dash.png: original built-in ImageGen output.
- sprites/fx/player-run-dashes-v1/prompt.txt: full generation prompt.

Rebuild the GLB with Blender 5.1:
`blender --background --factory-startup --python-exit-code 1 --python ai-tools/2026-09-06-export-skeletal-run.py`,
then run `node ai-tools/2026-09-06-pack-skeletal-run.mjs`.

Local visual rollback flags: `?skeletalRun=0` and `?runDashes=0`.
These affect presentation only; the new running speed remains configured separately.

## Verification

Focused contracts cover the 40% multiplier, real skinned mesh/bone animation data,
normal/torch run selection, action/airborne/stop exclusion, bounded mirrored dashes,
reduced motion and teardown. The existing Ctrl/GP running and jump/Flight contracts
also pass. Browser proof uses the repository's canonical serve.py on port 8080,
an isolated save-disabled context and real keyboard movement.
Screenshots, the short running recording and measured results are in
testing/2026-09-06-running-proof/. Any compact-cave coverage is an explicitly
staged existing-zone fixture, separate from the natural surface movement check.

Final browser checks passed: right/left at 336 px/s, walk at 160 px/s, stop, jump, reduced-motion suppression, empty-GP fallback, existing-zone compact-cave run, and cave teardown. No JavaScript errors were recorded.

The older 2026-08-03-ground-footstep-fx-contract.mjs still fails at its palette-count assertion (33 actual versus 32 expected). A read-only module-load baseline with the new skeletal guard removed reproduces the identical failure; the evidence is in footstep-baseline.log. This check is separate from the passing new run/dash, existing Ctrl/GP, and jump/Flight contracts.

## Walking correction

Ordinary walking now uses **Mixamo Standard Walk**, the motion that occupied the
run state at the beginning of this task. Ctrl running continues to use the
retained Quaternius jog. They are separate AnimationMixer actions on the same
public Survival mesh; walking is not the legacy jog.

`sprites/character/survival-skeletal-walk-v1/standard-walk.glb` contains only the
original Standard Walk's 480 bone tracks. Its 24 reviewed poses come from the
existing production retarget pipeline and the same Mixamo FBX. The first pose
closes the loop at exactly one second. The original mesh, rig, FBX and Blender
sources remain intact. No walking sprite sheet was generated.

The renderer switches between the two clips with a 120 ms blend and scales each
cycle to its ground stride. Baseline walk speed remains 160 px/s; Ctrl running
remains 336 px/s. The existing skeletal stride owns footsteps in both modes;
speed dashes remain exclusive to running.

`testing/2026-09-06-skeletal-walk-live-smoke.mjs` verifies the actual distinct
clip names in main-world and compact-cave gameplay, both directions, walk/run
transitions, stopping, running-only dashes, and jump exclusion. Final captures
and measured results are in `testing/2026-09-06-skeletal-walking-proof/`.
The shared gait, Ctrl-running and required jump/Flight contracts pass.
