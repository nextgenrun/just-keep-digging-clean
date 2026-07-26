# UAL Pose and Hitbox Editor v3

Production-asset animation review and non-destructive patch editor for the native UAL player. The stable v2 URL is retained so existing bookmarks keep working; the page now exposes the v3 editor. It never writes to the production manifest, sheets, player profile, contact config, or gameplay runtime.

The lab exposes the full UAL review library, including rejected Hook,
authored-kick, `Sword_Regular_C`, and `TreeChopping_Loop` evidence. Gameplay
loads only the 19 approved sheets / 882 frames: SIDE is
Jab/Cross/Jab/Cross, DOWN is the `OverhandThrow` ground strike,
and UP plus UP-SIDE use `Melee_Hook`. Production comparison uses the 109px
idle/action base and 123px walk/run presentation. Rig/contact validation is
diagnostic only; the live game admits cooldown at action start and mutates the
tile at the authored visual contact. The locomotion lane now uses the live
run-slot Jog at every speed, the landing lane uses the sampled impact recovery,
and UP previews include the neutral-return playback sequence. The raw library
still reports the original 15-frame uppercut source truth.

## Run

From the repository root:

```powershell
python serve.py 8093
```

Open:

`http://127.0.0.1:8093/testing/animation-sandbox/ual-animation-tuning-lab-v2/`

Query parameters remain bookmarkable:

- `scenario=locomotion|ladder|air|flight|mining|library`
- `action=<production manifest action id>`
- `aim=RIGHT|LEFT|UP|DOWN|UP-RIGHT|UP-LEFT|DOWN-RIGHT|DOWN-LEFT`

## Direct editing

- **Body** moves and resizes the global physics-body draft in game pixels.
- **Contact** moves a diagnostic volume in aim-local forward/normal pixels and resizes its width/height independently. Scope can be the current sequence occurrence or whole action; exported marker/contact edits do not become a gameplay hit gate.
- **Limb marker** shifts either hand or foot metadata in packed 256px source-frame coordinates. Screen-space dragging is converted through zoom, pose rotation/scale, and horizontal flip.
- **Frame pose** moves or scales the whole prerendered frame around the feet pivot. Rotation and per-frame hold multiplier are available numerically.
- Drag handles resize; dragging inside a box moves it. Arrow keys nudge 1px, Shift+Arrow nudges 5px, Delete resets the current scope, and Ctrl+Z / Ctrl+Shift+Z undo and redo.
- Current edits can be copied to a frame range. Undo/redo coalesces a whole pointer drag into one history entry.
- Production ghost and bypass controls compare the edited draft with production truth.

Frame overrides are keyed by clip, sequence index, and source frame. Reused source frames in reversed recovery sequences can therefore be tuned independently. Weighted frame holds affect real sandbox playback duration and exact frame stepping. Timeline rebuilds retain the current occurrence whenever possible.

## Limb-pose truth

Marker dragging changes logical rig/contact metadata only. It cannot deform the limb pixels inside the prerendered WebP frame. Individual limb visual correction requires a selective Blender source-rig rerender and repack. Exports therefore keep `visualHandPixelsChanged: false` for schema compatibility and set `requiresSourceRigRerender` after marker edits.

Missing marker frames stay unavailable; the editor does not invent production coverage. Current production coverage is shown as complete, partial, or missing on the stage.

## Patch import and export

`Export draft JSON` includes the normal tuning evidence plus a deterministic `editorPatch`:

- global body geometry;
- action/frame contact overrides;
- action/frame logical marker overrides;
- action/frame whole-raster pose and hold overrides;
- units, truth flags, promotion targets, and source-rig rerender status.

Logical hand and foot edits also export `sourceRigPoseRequests` with packed-frame base,
delta, and goal coordinates for a later selective Blender rerender. Occurrence-
specific requests explicitly flag that a unique runtime frame may be required.

Paste either the patch object or the full lab export into the import field. Import validates schema, actions, source-frame ranges, markers, supported fields, finite values, and configured bounds before replacing the current patch. Invalid input is atomic and leaves the current draft unchanged.

## Modules

- `labEditorPatch.js` and `labEditorModel.js` — patch resolution, scope precedence, history, range copy, reset, and undo/redo.
- `labEditorPatchIo.js` — deterministic export and atomic import validation.
- `labDirectManipulation.js` — pointer capture, CSS-to-canvas conversion, dragging, resizing, keyboard nudging, and flip-aware hand math.
- `labEditorUi.js` and `labEditorOverlay.js` — contextual inspector, toolbar, warnings, and manipulation handles.
- `labFrameTiming.js` — weighted holds and exact sequence-frame stepping.
- `labStageGeometry.js` and `labRenderer.js` — pose transforms, marker projection, body/contact geometry, production ghost, and interaction evidence.
- Existing scenario, asset, telemetry, playback, and base UI modules retain their original responsibilities.

## Validation

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-16-ual-animation-tuning-lab-v2-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-16-ual-animation-editor-v3-contract.mjs
```

The browser exposes both `window.__UAL_ANIMATION_TUNING_LAB_V2__` and `window.__UAL_ANIMATION_TUNING_LAB_V3__` for smoke checks.
