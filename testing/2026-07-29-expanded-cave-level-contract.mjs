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
      mineableOnly: grid.mineableOnly,
      safeFloorTileXs: CAVE_SCENE_CONFIG.grid.safeFloorTileXs,
      floorResourceKeys: grid.floorResourceKeys,
      floorMaterialRunTiles: grid.floorMaterialRunTiles,
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
for (let tx = 0; tx < grid.widthTiles; tx += 1) {
  assert.equal(model.isDiggable(tx, grid.floorRow), true, `floor ${tx} must be mineable`);
  const routeType = model.getTileType(tx, grid.floorRow - 1);
  assert.ok(
    routeType === TILE_TYPES.AIR || model.isDiggable(tx, grid.floorRow - 1),
    `main route ${tx} must be open or mineable without jumping`,
  );
}
for (let ty = 0; ty < grid.heightTiles; ty += 1) {
  for (let tx = 0; tx < grid.widthTiles; tx += 1) {
    assert.notEqual(
      model.getTileType(tx, ty),
      TILE_TYPES.CAVE_WALL,
      `expanded cave cannot contain an unbreakable cave tile at ${tx},${ty}`,
    );
  }
}
for (const node of CAVE_LEVEL_CONFIG.rewards.nodeLayout) {
  assert.equal(node.ty, grid.floorRow, `reward ${node.tx},${node.ty} must sit in the floor`);
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
  assert.equal(size.width / size.height, 3, `${archetypeId} interior must remain native 3:1`);
  assert.ok(size.width >= 2000, `${archetypeId} interior must retain authored source density`);
}
assert.equal(uniquePacks.size, 3, "expanded caves must retain three distinct authored interiors");
const materialRow = grid.floorRow + 1;
let materialTransitions = 0;
for (let tx = 1; tx < grid.widthTiles; tx += 1) {
  if (model.getTileType(tx, materialRow) !== model.getTileType(tx - 1, materialRow)) {
    materialTransitions += 1;
  }
}
assert.ok(
  materialTransitions <= Math.ceil(grid.widthTiles / grid.floorMaterialRunTiles),
  "mineable ground must form broad material runs instead of a checkerboard",
);

const caveSceneSource = await readFile(new URL("../ui/scenes/CaveScene.js", import.meta.url), "utf8");
const presentationSource = await readFile(
  new URL("../systems/visual/CaveLevelPresentationSystem.js", import.meta.url),
  "utf8",
);
assert.match(caveSceneSource, /camera\.startFollow\(/, "expanded caves need camera travel");
assert.match(caveSceneSource, /resolveExpandedCaveLevelEnabled/, "expanded cave rollback must stay wired");
assert.match(presentationSource, /setDisplaySize\(width, height\)/, "one interior must span the full cave");
assert.match(presentationSource, /cave-level-continuous-interior/, "continuous interior identity must stay explicit");
assert.match(
  presentationSource,
  /CAVE_SCENE_CONFIG\.overworldEntrance\.scenic\.textureKey/,
  "the approved left entrance must remain unchanged",
);
assert.doesNotMatch(presentationSource, /CaveLevelBackdropView|cave-level-meshy-shell/, "repeated cards and giant Meshy props cannot return");
assert.doesNotMatch(caveSceneSource, /meshyShell|cave-level-meshy/, "CaveScene cannot preload the rejected Meshy interior art");
assert.doesNotMatch(presentationSource, /TILE_TYPES\.CAVE_WALL/, "presentation cannot hide collision tiles");
assert.doesNotMatch(caveSceneSource, /stablePaintedFloor/, "painted unbreakable floor cannot return");
assert.doesNotMatch(presentationSource, /add\.(rectangle|circle|graphics)\(/i, "no primitive cave placeholders");
assert.doesNotMatch(caveSceneSource, /document\.|createElement|innerHTML/i, "CaveScene must stay Phaser-native");

console.log("expanded cave level contract passed");
