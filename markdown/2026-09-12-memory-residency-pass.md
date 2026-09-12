# Memory residency optimization — 2026-09-12

This local pass reduces decoded texture residency without changing artwork resolution or gameplay tuning.

## Changes

- Boot retains six talent assets shared with the action bar, tooltips and Codex. The existing feature loader now owns the other 17 talent-screen textures (85.34 MiB). Opening Talents admits this bounded pack even above the global memory watermark; closing it releases the textures after the existing five-second warm period. `?runtimeFeatureAssets=0` keeps the complete original eager pack.
- The optional looking-around idle animation (29.92 MiB) uses the existing deferred animation controller. Normal idle and traversal remain available. The optional sheet stays warm for 60 seconds after use and is released when unused; active sprite consumers prevent eviction.

## Browser measurements

The local no-save fixture uses the production scenes, a temporary world and the same 800 m room as the earlier audit. Values estimate decoded texture memory from source dimensions; they are not operating-system process RAM or measured GPU allocations.

| Situation | Earlier local audit | This pass | Reduction |
| --- | ---: | ---: | ---: |
| Surface | 1,588.58 MiB | 1,473.32 MiB | 115.26 MiB |
| 800 m | 1,843.15 MiB | 1,727.89 MiB | 115.26 MiB |

At 800 m, opening Talents raised residency to 1,813.23 MiB. Both close/reopen cycles returned to 1,727.89 MiB, with all 17 optional textures gone, all six shared assets present, and no missing textures in the talent view. First opening took approximately 2.07 seconds to become ready; reopening after eviction took approximately 0.63 seconds locally (recorded `openMs` includes an additional 600 ms settling interval). Network and hardware affect these times; the existing authored loading presentation covers the wait.

The optional animation loaded successfully and added 29.92 MiB. After 65 seconds unused, its pack returned to idle, its texture was absent, and the controller reported one eviction. Total residency then measured 1,733.89 MiB: other world textures had added roughly 6 MiB during that interval. The fixture completed with no captured runtime errors. Raw lifecycle evidence is in `testing/2026-09-12-memory-residency-result.json`.

## Validation

Passed: new memory residency contract (load under pressure, release, reopen, partial-load cancellation and shared texture preservation), runtime feature residency, pause feature loading, celestial talent UI, player deferred animations, and all 33 traversal input regression cases.

Browser fixture: `testing/2026-09-12-memory-residency-entry.html?jkd_e2e=1&cinematics=0`, served with `python serve.py 8080`. It avoids save writes and reports memory, missing textures, feature ownership and animation pack residency in its DOM output.

## Remaining cost

This removes about 7.3% of surface texture residency while the optional assets are unused. The game still exceeds its 704 MiB texture target considerably. Boot artwork and core player animation sheets remain the dominant permanent pools; materially larger reductions require more granular artwork loading or carefully validated asset-resolution/atlas changes. This pass does not establish an FPS improvement or deploy to production.
