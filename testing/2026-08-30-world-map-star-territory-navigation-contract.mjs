import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WorldMapStarTerritorySystem } from
  "../systems/map/WorldMapStarTerritorySystem.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_MAP_CONFIG } from "../values/worldMapConfig.js";
import { drawWorldMapStarNavigation } from
  "../ui/overlays/world-map/drawWorldMapStarNavigation.js";
import { renderWorldMapDiscoveredTerrain } from
  "../ui/overlays/world-map/renderWorldMapDiscoveredTerrain.js";

const widthTiles = 40;
const depthTiles = 80;
const topAirRows = 10;
const types = new Uint8Array(widthTiles * depthTiles);
const originalTypes = new Uint8Array(widthTiles * depthTiles);
const identities = new Uint8Array(widthTiles * depthTiles);
const rarities = new Uint8Array(widthTiles * depthTiles);
const dugTileSource = new Map();
const indexOf = (tx, ty) => ty * widthTiles + tx;
const addStar = (tx, ty, identityIndex, rarityIndex, consumed = false) => {
  const index = indexOf(tx, ty);
  originalTypes[index] = TILE_TYPES.DIRT;
  identities[index] = identityIndex;
  rarities[index] = rarityIndex;
  types[index] = consumed ? TILE_TYPES.AIR : TILE_TYPES.SKY_TILE;
  if (consumed) dugTileSource.set(`${tx},${ty}`, { tx, ty, type: TILE_TYPES.SKY_TILE });
};

addStar(5, 20, 0, 0);
addStar(30, 20, 1, 1);
addStar(6, 60, 2, 2, true);

const model = {
  widthTiles,
  depthTiles,
  topAirRows,
  tileSize: 1,
  skyTileOriginalType: originalTypes,
  dugTileSource,
  getTileType: (tx, ty) => types[indexOf(tx, ty)],
  getSkyTileIdentity: (tx, ty) => identities[indexOf(tx, ty)],
  getSkyTileRarity: (tx, ty) => rarities[indexOf(tx, ty)],
  worldToTile: (x, y) => ({ tx: Math.floor(x), ty: Math.floor(y) }),
  tileToWorld: (tx, ty) => ({ x: tx + 0.5, y: ty + 0.5 }),
  getDugTileSource: (tx, ty) => dugTileSource.get(`${tx},${ty}`) || null,
  dugTiles: new Map(),
};

const discoveredCells = [
  { cellX: 0, cellY: 1 },
  { cellX: 3, cellY: 5 },
  { cellX: 4, cellY: 5 },
  { cellX: 7, cellY: 5 },
  { cellX: 1, cellY: 15 },
];
const discoveredKeys = new Set(discoveredCells.map(cell => `${cell.cellX},${cell.cellY}`));
const discovery = {
  getRevision: () => 1,
  getDiscoveredCells: () => discoveredCells,
  isTileDiscovered: (tx, ty) => discoveredKeys.has(
    `${Math.floor(tx / WORLD_MAP_CONFIG.discovery.cellSizeTiles)},`
      + `${Math.floor(ty / WORLD_MAP_CONFIG.discovery.cellSizeTiles)}`,
  ),
};

const system = new WorldMapStarTerritorySystem(model);
const snapshot = system.resolveMap(discovery, { tx: 14, ty: 22 });
assert.equal(snapshot.cells.length, 4, "Only underground discovered cells receive Star ownership.");
assert.equal(snapshot.cellByKey.get("3,5").siteKey, "5,20");
assert.equal(snapshot.cellByKey.get("4,5").siteKey, "30,20");
assert.equal(snapshot.cellByKey.get("1,15").state, "consumed");
assert.equal(snapshot.currentTerritory.key, "5,20");
assert.equal(snapshot.currentTerritory.discovered, false);
assert.equal(snapshot.currentTerritory.direction, "W");
assert.equal(snapshot.currentTerritory.distanceTiles, 9);
assert.equal(snapshot.knownConsumedCount, 1);

const markers = system.getMarkers(discovery, { tx: 14, ty: 22 });
const signal = markers.find(marker => marker.id === "star-5-20");
const refuge = markers.find(marker => marker.id === "star-30-20");
const scar = markers.find(marker => marker.id === "star-6-60");
assert.equal(signal.label, WORLD_MAP_CONFIG.copy.unidentifiedStar);
assert.equal(signal.forceLabel, true);
assert.equal(signal.alwaysVisible, true);
assert.match(refuge.detail, /LIGHT.*GP.*PANIC/);
assert.equal(scar.state, "consumed");
assert.equal(scar.iconTint, WORLD_MAP_CONFIG.starTerritories.consumedMarkerTint);

const retainedOwner = snapshot.cellByKey.get("4,5").siteKey;
types[indexOf(30, 20)] = TILE_TYPES.AIR;
dugTileSource.set("30,20", { tx: 30, ty: 20, type: TILE_TYPES.SKY_TILE });
const afterConsumption = system.resolveMap(discovery, { tx: 20, ty: 22 });
assert.equal(afterConsumption.cellByKey.get("4,5").siteKey, retainedOwner);
assert.equal(afterConsumption.cellByKey.get("4,5").state, "consumed");
assert.equal(afterConsumption.knownConsumedCount, 2);

const graphicsCalls = [];
const graphics = {
  fillStyle: (...args) => graphicsCalls.push(["fillStyle", ...args]),
  fillRect: (...args) => graphicsCalls.push(["fillRect", ...args]),
  lineStyle: (...args) => graphicsCalls.push(["lineStyle", ...args]),
  strokeRect: (...args) => graphicsCalls.push(["strokeRect", ...args]),
  lineBetween: (...args) => graphicsCalls.push(["lineBetween", ...args]),
  strokeCircle: (...args) => graphicsCalls.push(["strokeCircle", ...args]),
  fillCircle: (...args) => graphicsCalls.push(["fillCircle", ...args]),
};
const layout = { x: 0, y: 0, width: 320, height: 640 };
const worldToScreen = (tx, ty) => ({ x: tx * 4, y: ty * 4, pixelsPerTile: 4 });
renderWorldMapDiscoveredTerrain({
  graphics,
  layout,
  model,
  discoverySystem: discovery,
  worldToScreen,
  biomeFieldEnabled: false,
  territorySnapshot: afterConsumption,
});
assert.ok(graphicsCalls.some(call => (
  call[0] === "fillStyle"
  && call[1] === WORLD_MAP_CONFIG.starTerritories.consumedCellColor
)));
assert.ok(graphicsCalls.some(call => call[0] === "lineBetween"));

const routeDrawn = drawWorldMapStarNavigation({
  graphics,
  layout,
  playerTile: { tx: 20, ty: 22 },
  currentTerritory: afterConsumption.currentTerritory,
  worldToScreen,
});
assert.equal(routeDrawn, true);
assert.ok(graphicsCalls.some(call => call[0] === "strokeCircle"));

const setupSource = await readFile(new URL(
  "../world/playScene/PlaySceneSetup.js",
  import.meta.url,
), "utf8");
const rendererSource = await readFile(new URL(
  "../ui/overlays/world-map/WorldMapRenderer.js",
  import.meta.url,
), "utf8");
const viewSource = await readFile(new URL(
  "../ui/overlays/world-map/WorldMapOverlayView.js",
  import.meta.url,
), "utf8");
const statusSource = await readFile(new URL(
  "../ui/overlays/world-map/formatWorldMapStatus.js",
  import.meta.url,
), "utf8");
assert.match(setupSource, /WorldMapStarTerritorySystem/);
assert.match(rendererSource, /renderWorldMapDiscoveredTerrain/);
assert.match(rendererSource, /drawWorldMapStarNavigation/);
assert.match(viewSource, /formatWorldMapStatus/);
assert.match(statusSource, /currentStarTerritory/);

system.destroy();
console.log(
  "World map Star-territory contract passed: every known underground cell has one permanent Star owner, hidden signals navigate, and consumed territories remain visibly severed.",
);
