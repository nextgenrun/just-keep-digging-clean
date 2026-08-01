# Sky Atmosphere Foundation V2

`sky-atmosphere-foundation-v2.webp` is the retained, horizontally exact
atmosphere beneath the ordered sky features. It fills upper-world gaps and
missing/streaming cards with a coherent cobalt palette. Runtime also creates a
solid cobalt rectangle one depth step behind it immediately, so no network,
decode, or upload delay can expose black clear color.

The foundation renders at depth `-10.2`, behind the original
`moonlit-mountain-forest-v1.png` plate at `-10`. The older plate therefore keeps
its baked trees, mountains, and horizon across the surface and Titan promenade;
the foundation owns only atmosphere that the forest plate or feature cards do
not cover.

The deterministic builder derives a robust vertical palette profile from the
safe frames of all twenty approved sky paintings, smooths it, and adds only
low-amplitude periodic atmosphere variation. The first and last source columns
are byte-identical. The texture contains no sun, moon, portal, landmark,
horizon silhouette, gameplay geometry, or collision.

`ai-tools/2026-07-30-build-sky-atmosphere-foundation-v2.py` owns reproducible
generation and writes exact source hashes plus the horizontal-seam contract.