# Heavenblocks v1 Runtime Art

**Date:** 2026-07-26
**Status:** Runtime progression integration
**Gameplay systems changed:** Access, protected collision, rewards, and crafting

This folder contains the production visual split derived from the three
approved upward-progression mockups:

- `lower-sky-backdrop-v1.png` and `lower-sky-facade-v1.png`
- `angel-heavenblock-backdrop-v1.png` and
  `angel-heavenblock-facade-v1.png`
- `devil-eclipse-backdrop-v1.png` and `devil-eclipse-facade-v1.png`

Each biome has an opaque painterly backdrop and a transparent façade. The
façade contains the readable island, structures, chains, crystals, and other
foreground silhouettes without the mockup HUD or player.

All six runtime images are 1672 by 941 pixels. Each matched backdrop/façade
pair is rendered together at 1920 by 1080 so a full game camera cannot expose
a hard card edge. The backdrop alone receives 12 percent centered overscan;
the transparent façade stays at the exact 1920 by 1080 composition size.
`values/heavenblocksVisualConfig.js` owns those presentation values and each
region position.

The images remain presentation-only, while `values/heavenblocksAccessConfig.js`
owns the aligned protected floors, altars, arrivals, and interaction anchors.
`HeavenblocksProgressionSystem` owns permanent unlock and component state.
Relics are cumulative and never consumed. Use `?heavenblocksVisuals=0` for an
art comparison or `?heavenblocksGameplay=0` to disable the gameplay layer.

The `sources/` folder retains the chroma-key façade intermediates used to
produce the transparent PNGs.
