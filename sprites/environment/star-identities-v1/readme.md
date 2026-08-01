# Star Identities V1

Production ImageGen library for fifty Star Block colour identities.

Six transparent runtime atlases use 320 by 320 frames:

| Rarity | Grid | Frames |
|---|---:|---:|
| Common | 4 by 3 | 12 |
| Uncommon | 5 by 2 | 10 |
| Rare | 5 by 2 | 10 |
| Epic | 4 by 2 | 8 |
| Mythic | 3 by 2 | 6 |
| Astral | 2 by 2 | 4 |

`star-identities-v1.manifest.json` pins source/output hashes, frame counts,
dimensions, and alpha coverage. `values/starIdentityLibrary.js` owns the exact
frame-to-identity mapping. Runtime code must select the authored frame and must
not tint a generic texture.

This V1 package is retained as rollback history. Its original runtime shared one
frame across the scenic Star tile, hard-darkness light, mined release, discovery
popup, and I-key Star Atlas. The current schema separates crisp star artwork
from the dedicated light-only frames in `star-identity-lights-v1`.

Rebuild with:

```powershell
python tools/2026-07-30-build-star-identity-assets.py
```

Generation prompt provenance is in `source/readme.md`.
