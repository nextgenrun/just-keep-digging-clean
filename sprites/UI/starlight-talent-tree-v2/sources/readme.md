# Starlight Talent Tree V2 Sources

Retained full-resolution built-in ImageGen sources:

- `tree-panel-imagegen-source-v2.png`
- `detail-panel-imagegen-source-v2.png`
- `engine-page-imagegen-source-v2.png`
- `component-sheet-imagegen-source-v2.png`
- `connector-sheet-imagegen-source-v2.png`
- `engine-medallion-sheet-imagegen-source-v2.png`
- `modal-shell-imagegen-source-v2.png`
- `modal-glyphs-green-imagegen-source-v2.png`
- `quickslash-frame-green-imagegen-source-v2.png`
- `quickslash-connector-green-imagegen-source-v2.png`

The component and connector sheets use flat `#ff00ff` chroma. The engine
medallion sheet was generated from the four V1 celestial-core references while
preserving their identities and replacing their square black UI backgrounds.
The two Quick Slash overrides use flat `#00ff00` chroma so violet crystal
details survive the alpha pass without magenta-key color collision.
The modal glyph sheet uses the same green-key workflow for the generated
constellation crest and celestial close rune.

Run `ai-tools/2026-07-28-build-starlight-talent-tree-v2.py` to rebuild the
alpha-clean runtime pack.
