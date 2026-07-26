# NPC v9 planted idles

Superseded by `npc-v10-piskel-idles/`. This immutable pack remains available
for comparison and rollback evidence.

Production pack with eight fixed-anchor visual states for each of the six
merchants:

`quiet`, `work`, `rare`, `player`, `inspect`, `habit`, `signature`, and
`showcase`.

The first four states are rebuilt from the approved v3 boards using the same
clean panel detector as the four new v5 states. All 48 outputs use a 512 x 512
alpha canvas, a shared per-merchant main-body scale, and one locked baseline.
No runtime locomotion data exists in this pack.

Regenerate with:

```powershell
python ai-tools/2026-07-26-build-npc-planted-idles-v9.py
```

`manifest.json` records source-board hashes, detected panel bounds, alpha
bounds, main-body bounds, coverage, edge-pixel checks, and the checkerboard QA
sheet. Use `?npcActivities=0` to restore the v6/static baseline.
