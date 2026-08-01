# Biome backdrop enhancers V7

This folder contains 100 transparent 1536 x 1024 WebP background enhancers:
ten for each retained underground biome.

`values/worldVisualBackdropEnhancers.js` is the content and selection source of
truth. `WorldVisualBackdropEnhancerLayer` demand-streams only selected visible
and neighbor cards, reuses the retained backdrop card grid, and renders above
the matching backdrop but below authoritative terrain.

Selection is deterministic, optional, and motif-aware:

- ravines/canyons prefer crowns, arches, ribs, curtains, and reflection ribbons;
- sanctums/engines prefer halos, apertures, hanging structures, and constellations;
- cities/industrial cards prefer silhouettes, arches, networks, and curtains;
- water/haze cards prefer ribbons, curtains, motes, networks, and crowns;
- quiet cards prefer sparse constellations, networks, halos, and reflections.

No-overlay cards are deliberate and create no Phaser image or texture request.
Use `?undergroundBackdropEnhancers=0` to disable this library only.
