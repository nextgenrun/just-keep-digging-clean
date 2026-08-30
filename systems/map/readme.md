# Map systems

This directory owns map data that is independent from presentation.

- `WorldMapDiscoverySystem.js` stores sparse fog-of-war cells by absolute tile coordinate.
- `WorldMapActivityRegistry.js` accepts marker providers from current and future gameplay systems.
- `WorldMapStarTerritorySystem.js` assigns every discovered underground cell
  to its nearest original Star coordinate. It keeps consumed Stars as severed
  owners so permanent damage cannot disappear through territory reassignment.
- `registerWorldMapCoreActivities.js` registers discovery-safe landmarks,
  activated portals, and discovered/tracked/resonating Titan zones.
- `resolveWorldMapPlayerTile.js` keeps discovery, recentering, and the player marker on the same collision-body tile.

The discovery format does not encode world width or depth. Expanding the world preserves
existing discoveries. Bump `WORLD_MAP_CONFIG.worldRevision` only when old coordinates are
no longer meaningful.

Visual biome identity is not persisted here. The M map resolves it live from
`values/levelOneBiomeField.js` inside Level 1 X0-131 and 0-2000 m, matching
all twenty scenic background/foreground regions without affecting Level 2.

Star territory identity is also derived live. An explored territory may reveal
one unidentified Star signal and route through fog, but the Star's authored
identity remains hidden until its own map cell is discovered. No Star network
state is saved separately.

Activity provider contract:

```js
const unregister = scene.worldMapActivityRegistry.register("quests", {
  label: "QUESTS",
  color: 0xf0c765,
  enabledByDefault: true,
  getMarkers: ({ scene }) => [
    { id: "quest-1", worldX: 1000, worldY: 2000, label: "Quest", alwaysVisible: false },
  ],
});
```

Providers own their gameplay data. The map only requests markers and applies discovery
visibility and user filter state.
