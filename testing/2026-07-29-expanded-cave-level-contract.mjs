import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  CAVE_LEVEL_CONFIG,
  getCaveLevelVisualPack,
  resolveExpandedCaveLevelEnabled,
} from "../values/caveLevelConfig.js";
import { CAVE_SCENE_CONFIG } from "../values/caveSceneConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { CaveWorldModel, makeCaveTileSaveKey } from "../world/model/CaveWorldModel.js";

function makeModel(collectedTileKeys = []) {
  const grid = CAVE_LEVEL_CONFIG.grid;
  return new CaveWorldModel({
    ...GAME_CONFIG,
    seed: 20260729,
    worldWidthTiles: grid.widthTiles,
    worldDepthTiles: grid.heightTiles,
    worldWidthPx: grid.widthTiles * GAME_CONFIG.tileSize,
    worldDepthPx: grid.heightTiles * GAME_CONFIG.tileSize,
    topAirRows: -900,
    caveRuntime: {
      caveId: "expanded-cave-contract",
      floorRow: grid.floorRow,
      floorThicknessTiles: grid.floorThicknessTiles,
      boundaryThicknessTiles: grid.boundaryThicknessTiles,
      stablePaintedFloor: true,
      safeFloorTileXs: CAVE_SCENE_CONFIG.grid.safeFloorTileXs,
      floorResourceKeys: CAVE_SCENE_CONFIG.grid.floorResourceKeys,
      resourcePool: ["iron", "silver", "gold"],
      nodeLayout: CAVE_LEVEL_CONFIG.rewards.nodeLayout,
      signatureNode: grid.signatureNode,
      signatureTileTypeKey: "COMBO_BLOCK",
      legacyNodeLayout: CAVE_SCENE_CONFIG.rewards.nodeLayout,
      legacySignatureNode: CAVE_SCENE_CONFIG.grid.signatureNode,
      collectedTileKeys,
    },
  });
}

function readPngSize(bytes) {
  assert.equal(bytes.toString("ascii", 1, 4), "PNG", "cave art must be a PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

assert.equal(resolveExpandedCaveLevelEnabled(CAVE_LEVEL_CONFIG, ""), true);
assert.equal(resolveExpandedCaveLevelEnabled(CAVE_LEVEL_CONFIG, "?caveLevel=legacy"), false);
assert.ok(CAVE_LEVEL_CONFIG.grid.widthTiles >= CAVE_SCENE_CONFIG.grid.widthTiles * 3);
assert.ok(CAVE_LEVEL_CONFIG.grid.heightTiles >= CAVE_SCENE_CONFIG.grid.heightTiles * 2);
assert.ok(CAVE_LEVEL_CONFIG.rewards.nodeLayout.length > CAVE_SCENE_CONFIG.rewards.nodeLayout.length);

const model = makeModel();
const grid = CAVE_LEVEL_CONFIG.grid;
assert.equal(model.getTileType(grid.spawnTileX, grid.spawnTileY), TILE_TYPES.AIR);
for (let tx = 1; tx < grid.widthTiles - 1; tx += 1) {
  assert.equal(model.getTileType(tx, grid.floorRow), TILE_TYPES.CAVE_WALL, `floor gap at ${tx}`);
  const routeType = model.getTileType(tx, grid.floorRow - 1);
  assert.ok(
    routeType === TILE_TYPES.AIR || model.isDiggable(tx, grid.floorRow - 1),
    `main route ${tx} must be open or mineable without jumping`,
  );
}
for (const node of CAVE_LEVEL_CONFIG.rewards.nodeLayout) {
  assert.equal(model.isDiggable(node.tx, node.ty), true, `reward ${node.tx},${node.ty} must be diggable`);
}
assert.equal(model.getTileType(grid.signatureNode.tx, grid.signatureNode.ty), TILE_TYPES.COMBO_BLOCK);

const legacyReward = CAVE_SCENE_CONFIG.rewards.nodeLayout[0];
const legacySignature = CAVE_SCENE_CONFIG.grid.signatureNode;
const restored = makeModel([
  makeCaveTileSaveKey("expanded-cave-contract", legacyReward.tx, legacyReward.ty),
  makeCaveTileSaveKey("expanded-cave-contract", legacySignature.tx, legacySignature.ty),
]);
const migratedReward = CAVE_LEVEL_CONFIG.rewards.nodeLayout[0];
assert.equal(restored.getTileType(migratedReward.tx, migratedReward.ty), TILE_TYPES.AIR);
assert.equal(restored.getTileType(grid.signatureNode.tx, grid.signatureNode.ty), TILE_TYPES.AIR);

const archetypeIds = Object.keys(CAVE_LEVEL_CONFIG.archetypeVisualPack);
assert.equal(archetypeIds.length, 6, "all six cave identities need an authored visual route");
const uniquePacks = new Set();
for (const archetypeId of archetypeIds) {
  const pack = getCaveLevelVisualPack(archetypeId);
  uniquePacks.add(pack.textureKey);
  const assetUrl = new URL(`../${pack.assetPath}`, import.meta.url);
  await access(assetUrl);
  const size = readPngSize(await readFile(assetUrl));
  assert.equal(size.width / size.height, 3, `${archetypeId} panorama must remain native 3:1`);
  assert.ok(size.width >= 2000, `${archetypeId} panorama must retain production source density`);
}
assert.equal(uniquePacks.size, 3, "expanded caves must expose three visually distinct authored families");

const caveSceneSource = await readFile(new URL("../ui/scenes/CaveScene.js", import.meta.url), "utf8");
const presentationSource = await readFile(
  new URL("../systems/visual/CaveLevelPresentationSystem.js", import.meta.url),
  "utf8",
);
assert.match(caveSceneSource, /camera\.startFollow\(/, "expanded caves need camera travel");
assert.match(caveSceneSource, /resolveExpandedCaveLevelEnabled/, "expanded cave rollback must stay wired");
assert.match(presentationSource, /setDisplaySize\(width, height\)/, "authored panorama must span the level");
assert.match(presentationSource, /TILE_TYPES\.CAVE_WALL/, "painted terrain must hide structural tiles only");
assert.doesNotMatch(presentationSource, /add\.(rectangle|circle|graphics)\(/i, "no primitive cave placeholders");
assert.doesNotMatch(caveSceneSource, /document\.|createElement|innerHTML/i, "CaveScene must stay Phaser-native");

console.log("expanded cave level contract passed");
