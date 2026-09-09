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
import {
  resolveWorldMapBiomeLabels,
  resolveWorldMapMarkerAnnotations,
} from
  "../ui/overlays/world-map/resolveWorldMapAnnotations.js";
import {
  isWorldMapTerrainDetailActive,
  resolveWorldMapMirrorTransform,
  resolveWorldMapTerrainWindow,
  shouldMirrorWorldMapObject,
} from "../ui/overlays/world-map/WorldMapTerrainTextureView.js";

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
assert.equal(isWorldMapTerrainDetailActive(layout, 2), false);
assert.equal(isWorldMapTerrainDetailActive(layout, 30), false);
assert.equal(isWorldMapTerrainDetailActive(layout, 60), true);
const terrainWindow = resolveWorldMapTerrainWindow(
  layout,
  { centerTileX: 140, centerTileY: 75 },
  model,
  60,
);
assert.ok(terrainWindow.tileCount < WORLD_MAP_CONFIG.terrainDetail.maximumVisibleTiles);
assert.ok(terrainWindow.left < 140 && terrainWindow.right > 140);
assert.ok(terrainWindow.top < 75 && terrainWindow.bottom > 75);

const mirrorTransform = resolveWorldMapMirrorTransform(
  layout,
  { centerTileX: 140, centerTileY: 75 },
  model,
  60,
);
assert.equal(mirrorTransform.zoom, 60 / model.tileSize);
assert.equal(
  mirrorTransform.scrollX,
  (140 - layout.width / 120) * model.tileSize,
);
assert.equal(
  mirrorTransform.scrollY,
  (75 - layout.height / 120) * model.tileSize,
);
assert.equal(shouldMirrorWorldMapObject({
  active: true, visible: true, alpha: 1, depth: 2.41,
  scrollFactorX: 1, scrollFactorY: 1,
}), true);
assert.equal(shouldMirrorWorldMapObject({
  active: true, visible: true, alpha: 1, depth: 2000,
  scrollFactorX: 0, scrollFactorY: 0,
}), false);

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

const edgeMarker = resolveWorldMapMarkerAnnotations({
  markers: [{
    id: "edge-star", providerId: "stars", alwaysVisible: true,
    worldX: 4, worldY: 4, label: "Edge Star", priority: 100,
  }],
  model,
  discoverySystem: { isWorldPositionDiscovered: () => true },
  layout,
  viewState: {},
  worldToScreen: () => ({
    x: layout.x + 20,
    y: layout.y + layout.height - 10,
    pixelsPerTile: 2,
  }),
})[0];
assert.equal(edgeMarker.labelOriginY, 1);
assert.ok(edgeMarker.labelY < edgeMarker.y);
assert.ok(edgeMarker.labelX > edgeMarker.x);

const atlas = await readFile(new URL(
  `../${WORLD_MAP_CONFIG.symbolAtlas.path}`,
  import.meta.url,
));
assert.deepEqual(pngDimensions(atlas), { width: 384, height: 384 });
assert.equal(WORLD_MAP_CONFIG.symbolAtlas.frameWidth * 3, 384);
assert.equal(WORLD_MAP_CONFIG.symbolAtlas.frameHeight * 3, 384);
assert.equal(Object.keys(WORLD_MAP_CONFIG.symbolAtlas.frames).length, 7);
assert.notEqual(
  WORLD_MAP_CONFIG.symbolAtlas.frames.star,
  WORLD_MAP_CONFIG.symbolAtlas.frames.resonance,
  "Star territories need a distinct authored glyph instead of the Titan-resonance symbol.",
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
const terrainSource = await readFile(new URL(
  "../ui/overlays/world-map/WorldMapTerrainTextureView.js",
  import.meta.url,
), "utf8");
assert.match(setupSource, /registerWorldMapCoreActivities\(this\.worldMapActivityRegistry\)/);
assert.match(rendererSource, /resolveWorldMapBiomeLabels/);
assert.match(rendererSource, /drawWorldMapDepthGrid/);
assert.doesNotMatch(rendererSource, /fillTriangle/);
assert.match(viewSource, /WorldMapAnnotationView/);
assert.match(viewSource, /WorldMapTerrainTextureView/);
assert.doesNotMatch(terrainSource, /getTileTextureLayerKeys|dynamicSoil/);
assert.match(terrainSource, /discoverySystem\.isTileDiscovered/);
assert.match(terrainSource, /renderTexture\.clear\(\)\.draw\(this\.renderGroup\)/);
assert.match(terrainSource, /renderTexture\.erase\(this\.discoveryEraseGraphics\)/);
assert.match(terrainSource, /this\.scene\.children/);
assert.doesNotMatch(terrainSource, /load\.image/);
assert.match(viewSource, /starTerritoryIcon/);
assert.ok(WORLD_MAP_CONFIG.view.defaultZoom >= 16);
assert.ok(WORLD_MAP_CONFIG.view.maxZoom >= 256);

registry.destroy();
console.log(
  "World map polish contract passed: close zoom mirrors the composed gameplay world with discovery erasure, distinct Star symbol, biome identity color, landmarks, portals, Titans, counts, and runtime asset routing.",
);
