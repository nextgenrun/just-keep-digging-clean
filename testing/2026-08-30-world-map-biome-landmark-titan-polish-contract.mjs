import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { isGameplayLevelEnabled } from "../values/gameplayDevFlags.js";
import { LEVEL_ONE_BIOME_FIELD } from "../values/levelOneBiomeField.js";
import {
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../values/runtimeAssetLoading.js";
import { V11_SKY_ISLAND_LAYOUT } from "../values/v11SkyIslandLayout.js";
import { WORLD_MAP_CONFIG } from "../values/worldMapConfig.js";
import { WorldMapActivityRegistry } from "../systems/map/WorldMapActivityRegistry.js";
import { registerWorldMapCoreActivities } from
  "../systems/map/registerWorldMapCoreActivities.js";
import { getRuntimeFeatureAssetGroup } from
  "../world/rendering/runtimeFeatureAssetGroups.js";
import { resolveWorldMapBiomeLabels } from
  "../ui/overlays/world-map/resolveWorldMapAnnotations.js";

function pngDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const model = {
  widthTiles: 280,
  depthTiles: 5065,
  topAirRows: 65,
  tileSize: 94,
  config: { tileSize: 94, topAirRows: 65 },
  caveZones: [{
    id: "first-cave",
    mouthAnchor: { tx: 24, ty: 64 },
    entry: { tx: 24, ty: 64 },
    standaloneScene: true,
  }],
  isSolid: (_tx, ty) => ty >= 65,
  tileToWorld: (tx, ty) => ({ x: tx * 94 + 47, y: ty * 94 + 47 }),
  worldToTile: (x, y) => ({ tx: Math.floor(x / 94), ty: Math.floor(y / 94) }),
};

const titanZones = [
  {
    id: "mossback-wanderer", left: 23, top: 150, width: 18, height: 10,
    discovered: true, coverageProgress: 1, revealed: 180,
  },
  {
    id: "bellhorn-grazer", left: 74, top: 215, width: 17, height: 9,
    discovered: false, coverageProgress: 0, revealed: 0,
  },
  {
    id: "lantern-jaw", left: 147, top: 294, width: 22, height: 12,
    discovered: false, coverageProgress: 0.25, revealed: 24,
  },
];
const scene = {
  worldModel: model,
  worldRenderer: { getTitanDiscoverySnapshot: () => ({ zones: titanZones }) },
  retentionProgressSystem: { getDiscoveredTitans: () => ["mossback-wanderer"] },
  titanClueSystem: { getActiveClueId: () => "bellhorn-grazer" },
  specialTileSystem: {
    getActivatedPortals: () => [{
      key: "portal-300",
      tx: 72,
      ty: 365,
      depth: 300,
      label: "300m Return Portal",
    }],
  },
};

const registry = new WorldMapActivityRegistry();
registerWorldMapCoreActivities(registry);
assert.deepEqual(
  registry.getProviders().map(provider => provider.id),
  ["landmarks", "portals", "titans", "stars"],
);
assert.deepEqual(
  registry.getProviders().map(provider => provider.iconFrame),
  [
    WORLD_MAP_CONFIG.symbolAtlas.frames.landmark,
    WORLD_MAP_CONFIG.symbolAtlas.frames.portal,
    WORLD_MAP_CONFIG.symbolAtlas.frames.titan,
    WORLD_MAP_CONFIG.symbolAtlas.frames.star,
  ],
);

const context = { scene, worldModel: model };
const markers = registry.getMarkers(context, { includeHidden: true });
const landmarkMarkers = markers.filter(marker => marker.providerId === "landmarks");
const portalMarkers = markers.filter(marker => marker.providerId === "portals");
const titanMarkers = markers.filter(marker => marker.providerId === "titans");
assert.ok(landmarkMarkers.some(marker => marker.id === "town-square" && marker.alwaysVisible));
assert.ok(landmarkMarkers.some(marker => marker.id === "mine-entrance"));
for (const level of V11_SKY_ISLAND_LAYOUT.levels.filter(level => isGameplayLevelEnabled(level.levelId))) {
  assert.ok(landmarkMarkers.some(marker => marker.id === `sky-island-${level.levelId}`));
}
assert.equal(portalMarkers.length, 1);
assert.equal(portalMarkers[0].alwaysVisible, true);
assert.deepEqual(titanMarkers.map(marker => marker.state), ["discovered", "tracked", "resonance"]);
assert.deepEqual(titanMarkers.map(marker => marker.iconFrame), [
  WORLD_MAP_CONFIG.symbolAtlas.frames.titan,
  WORLD_MAP_CONFIG.symbolAtlas.frames.resonance,
  WORLD_MAP_CONFIG.symbolAtlas.frames.resonance,
]);
assert.ok(titanMarkers.every(marker => marker.alwaysVisible));

registry.setVisible("titans", false);
const hiddenSnapshot = registry.getMarkers(context, { includeHidden: true });
assert.ok(hiddenSnapshot.filter(marker => marker.providerId === "titans")
  .every(marker => marker.providerVisible === false));
assert.equal(registry.getMarkers(context).some(marker => marker.providerId === "titans"), false);

const layout = { x: 150, y: 59, width: 823, height: 599 };
const worldToScreen = (tx, ty) => ({
  x: layout.x + tx * 3,
  y: layout.y + (ty - LEVEL_ONE_BIOME_FIELD.bounds.topTile) * 2,
  pixelsPerTile: 2,
});
const biomeLabels = resolveWorldMapBiomeLabels({
  discoverySystem: {
    getDiscoveredCells: () => LEVEL_ONE_BIOME_FIELD.seeds.map(seed => ({
      cellX: Math.floor(seed.centerTileX / WORLD_MAP_CONFIG.discovery.cellSizeTiles),
      cellY: Math.floor(
        (LEVEL_ONE_BIOME_FIELD.bounds.topTile + seed.centerDepthM)
        / WORLD_MAP_CONFIG.discovery.cellSizeTiles,
      ),
    })),
  },
  layout,
  viewState: {},
  worldToScreen,
  enabled: true,
});
assert.ok(biomeLabels.length > 0);
assert.ok(biomeLabels.length <= WORLD_MAP_CONFIG.annotations.maxBiomeLabels);
assert.equal(new Set(biomeLabels.map(label => label.key)).size, biomeLabels.length);

const atlas = await readFile(new URL(
  `../${WORLD_MAP_CONFIG.symbolAtlas.path}`,
  import.meta.url,
));
assert.deepEqual(pngDimensions(atlas), { width: 384, height: 256 });
assert.equal(WORLD_MAP_CONFIG.symbolAtlas.frameWidth * 3, 384);
assert.equal(WORLD_MAP_CONFIG.symbolAtlas.frameHeight * 2, 256);
assert.equal(Object.keys(WORLD_MAP_CONFIG.symbolAtlas.frames).length, 7);
assert.equal(
  WORLD_MAP_CONFIG.symbolAtlas.frames.star,
  WORLD_MAP_CONFIG.symbolAtlas.frames.resonance,
  "The Star layer must reuse the approved golden signal glyph without adding residency.",
);

const featureGroup = getRuntimeFeatureAssetGroup(RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap);
assert.equal(featureGroup.assets.length, 2);
const symbolAsset = featureGroup.assets.find(asset => asset.key === ASSET_KEYS.ui.worldMapSymbols);
assert.equal(symbolAsset.type, "spritesheet");
assert.equal(symbolAsset.frameConfig.endFrame, WORLD_MAP_CONFIG.symbolAtlas.endFrame);

const setupSource = await readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8");
const rendererSource = await readFile(new URL(
  "../ui/overlays/world-map/WorldMapRenderer.js",
  import.meta.url,
), "utf8");
const viewSource = await readFile(new URL(
  "../ui/overlays/world-map/WorldMapOverlayView.js",
  import.meta.url,
), "utf8");
assert.match(setupSource, /registerWorldMapCoreActivities\(this\.worldMapActivityRegistry\)/);
assert.match(rendererSource, /resolveWorldMapBiomeLabels/);
assert.match(rendererSource, /drawWorldMapDepthGrid/);
assert.doesNotMatch(rendererSource, /fillTriangle/);
assert.match(viewSource, /WorldMapAnnotationView/);
assert.ok(WORLD_MAP_CONFIG.view.defaultZoom >= 16);

registry.destroy();
console.log(
  "World map polish contract passed: authored symbols, named biomes, core landmarks, activated portals, discovery-safe Titan states, counts, and runtime asset routing.",
);
