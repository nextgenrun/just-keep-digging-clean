# Underground Foreground Cohesion v1

Ten approved 1536x1024 transparent WebPs provide one additional foreground
variation for every existing terrain region:

- Weathered Roots;
- Shallow Blue;
- Amber Depths;
- Silver Core;
- Core Magma;
- Slagworks;
- Obsidian Catacombs;
- Pressure Foundry;
- Blackglass Abyss;
- Starfire Rift.

Each card retains its authored 80 px alpha feather. Runtime gives its complete
1536x1024 frame one dedicated 0.88 source-density world placement in the
matching biome, above the retained opaque material/backdrop stack and outside
the five-card `terrain-variation-v4` selection pool. It is never enlarged or
aspect-distorted. Each biome uses a different reachable horizontal anchor;
the five Level 2 paintings sit wholly inside the Level 2 corridor. It is tinted
and clipped by the authoritative solid-terrain mask, so it cannot paint dug
air, collision, resources, or saves and cannot be selected as a complete
transparent background.

Use `?undergroundForegroundCohesion=0` to remove only these ten placements
without disabling or changing any other underground library.
