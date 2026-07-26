# Map systems

This directory owns map data that is independent from presentation.

- `WorldMapDiscoverySystem.js` stores sparse fog-of-war cells by absolute tile coordinate.
- `WorldMapActivityRegistry.js` accepts marker providers from current and future gameplay systems.

The discovery format does not encode world width or depth. Expanding the world preserves
existing discoveries. Bump `WORLD_MAP_CONFIG.worldRevision` only when old coordinates are
no longer meaningful.

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
