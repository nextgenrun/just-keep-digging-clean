# Interactive World States V1

## Outcome

This review library adds 1,000 high-resolution tangible object-state sprites
without overlapping the parallel FX/UI/hazard library:

- 10 current underground biomes;
- 10 solid interactable families per biome;
- 10 coherent physical states per family;
- 100 ImageGen source sheets;
- 100 transparent runtime-ready WebP atlases;
- 1,000 individually addressable atlas frames.

## Why this is separate

The companion 1,000-asset task owns particles, mining and ability feedback,
weather, hazards, ambience, lighting companions, and UI/HUD states. This
library owns only solid physical objects that can occupy and cover multiple
tiles. It also avoids the existing generic background-enhancer, underground
foreground, and loose overlay-prop libraries.

## Object families

Every biome receives a distinct cache, transit aperture, depth gate, extraction
rig, memory reliquary, repair station, refining machine, checkpoint beacon,
freight lift, and choice apparatus. Names, construction materials, and
silhouettes are biome-specific rather than recolors.

## State grammar

Each family supplies dormant, proximity-ready, three activation poses, two
active-loop poses, resolved success, depleted/spent, and damaged/broken. The
state art communicates physical change without free-floating particles,
lighting-only effects, text, or UI.

## Resolution and packaging

ImageGen masters use a strict 5-by-2 layout at a minimum 1,400-by-800 source
resolution. The current native output is approximately 1,776-by-888, giving
each state roughly 355-by-444 source pixels before transparent extraction.
Frames are normalized into grounded 448-by-448 cells and packed as
2,240-by-896 transparent WebP atlases.

## Safety

The library remains review-only and is not imported, preloaded, selected, or
placed by production code. Runtime promotion should happen only after visual
review, with sparse deterministic selection and a no-object outcome so the
world does not become visually saturated.
