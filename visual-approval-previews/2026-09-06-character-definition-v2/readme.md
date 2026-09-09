Character definition V2: review-only native Blender iteration. The original model, skin weights, runtime sheets, camera and sampled walk poses are preserved. Stable-hue fabric shading preserves dark trims; hair and skin normal maps use Non-Color and skin is nonmetallic. Neutral path-traced light, UV-anchored surface grain, textured roughness and smoothly limited baked spring motion. No full cloth collision solver or runtime promotion. V1 remains intact. Textures above 4K are resized only in the unsaved render process; original texture files are untouched.

Build and review:
- Settings: `values/characterDefinitionPreviewV2.json`.
- Native renderer: `ai-tools/2026-09-06-render-character-definition-preview.py` with `CHARACTER_PREVIEW_CONFIG=values/characterDefinitionPreviewV2.json` and `CHARACTER_PREVIEW_FRAMES=all`.
- Material helper: `ai-tools/2026-09-06-character-definition-detail.py`.
- Pack and compare: `ai-tools/2026-09-06-build-character-definition-v2.py`.
- Serve through the repository's `serve.py`; open this directory's `index.html`.

Validation completed: 24 distinct, fully rendered walking frames; exact original and V1 reference copies; unchanged Blend and skin weights; positive alpha margins throughout; loop-boundary difference below the largest within-loop step. Maximum spring coefficients are 0.369 for the jacket and 0.593 for the backpack; the V1 vertical motions reached their hard limit of 1. Browser checks passed original/V1 switching, full/detail views, frame scrubbing to 24/24, half-speed playback and loop wrap.

The native Blend stores some normal maps as sRGB, but the existing export helper already corrects them to Non-Color. V2 retains that correction. The new material changes include nonmetallic skin, revised hair shading, fixed-colour cloth with dark trim preserved, textured roughness, neutral lighting and longer transparency paths for hair cards. Preserve-volume skinning was examined and is disabled in this accepted preview. This is a material and secondary-motion review, not a new body rig or a full cloth collision simulation.
