# World Visual Prop Library V3 Generated Values

These files are generated runtime data for the 200-object surface and sky prop
library. Ten category modules each own one atlas, twenty asset definitions, and
twenty extraction-time candidate placements. `index.js` is the stable asset
import boundary used by `assetKeys.js`, the scenic surface expansion, and the
V11 sky prop system.

Production does not import the generated candidate placements. The deliberately
sparse runtime layouts live in `values/worldVisualSurfacePropCompositionV3.js`
and `values/worldVisualSkyPropCompositionV3.js`.

Do not hand-edit `*.generated.js`. Rebuild them with:

```powershell
python ai-tools/2026-07-29-build-surface-sky-props-v3.py
```

The builder validates candidate landmark exclusions before writing these
modules; production repeats validation against the authored compositions.
