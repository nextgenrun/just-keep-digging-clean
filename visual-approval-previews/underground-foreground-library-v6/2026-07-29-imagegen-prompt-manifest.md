# Underground Foreground Library V6 ImageGen Prompts

Date: 2026-07-29

Each of the twenty built-in ImageGen calls used this shared literal contract:

> Production-ready 2D Phaser underground sprite atlas, stylized-concept finish,
> exactly five columns by four rows and exactly one isolated asset in each
> cell. Uniform pure #00ff00 chroma background. Wide transparent-looking gutter
> around every item; no touching, overlap, borders, grid lines, labels, text,
> UI, characters, gameplay objects, landscape, or watermark. Consistent
> side-view game readability, crisp natural silhouette, rich painterly
> material, and no false playable platform.

The foreground-texture calls appended:

> Twenty distinct organic material islands for terrain-surface blending, each
> irregular and self-contained, with no rectangular plate edge.

The overlay-prop calls appended:

> Twenty distinct decorative, non-colliding underground cutouts with
> floor-, wall-, corner-, arch-, and ceiling-friendly silhouettes.

Per-call subject directions:

| Biome | Foreground texture material direction | Overlay prop direction |
|---|---|---|
| Weathered Roots | rain-compacted loam, peat, roots, mycelium, orchard pebbles, fossil leaves | roots, fungi, timber remnants, rope, cairns |
| Blue Caverns | cobalt shale, glacial slate, sapphire calcite, fossil ripples | stalactites, crystal fans, geodes, fossils, arches |
| Amber Depths | resin, ochre, honeyglass, fossil soil, bronze mineral | resin drips, shelves, honeycomb, petrified bark, arches |
| Silver Core | mercury slate, magnetic needles, moon metal, black iron | needle fans, blade stalactites, mineral arches and corners |
| Core Magma | basalt, scoria, obsidian, lava breccia, ember cracks | lava buttresses, ribs, arches, tubes, volcanic cairns |
| Slagworks | clinker, refractory brick, soot, copper salt, rail breccia | industrial-geology braces, arches, pipes, gears, vents |
| Obsidian Catacombs | blackglass, violet ash, crypt stone, prism dust | catacomb arches, shards, columns, ribs; no bones or graves |
| Pressure Foundry | boiler scale, cyan crust, riveted slag, carbon shear | pipes, turbines, valves, gauges and trusses; no text |
| Blackglass Abyss | prism shale, eclipse stone, voidglass, spectral dust | mirror shards, rings, cairns, crescent ribs, prism arches |
| Starfire Rift | nebula soil, star metal, cosmic ash, cometglass | cosmic crystals, rings, arches and aurora ribs; no collectible stars |

All calls used no image reference and generated one `1536x1024` source. Chroma
extraction produced the adjacent alpha masters; the runtime builder then split,
trimmed, normalized, validated, and packed the 400 individual frames.
