import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { ARC_CORE_CONFIG } from "../values/arcCoreConfig.js";
import { CAVE_SCENE_CONFIG } from "../values/caveSceneConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { CaveWorldModel, makeCaveTileSaveKey } from "../world/model/CaveWorldModel.js";

function makeModel(collectedTileKeys = []) {
  const grid = CAVE_SCENE_CONFIG.grid;
  return new CaveWorldModel({
    ...GAME_CONFIG,
    seed: 12345,
    worldWidthTiles: grid.widthTiles,
    worldDepthTiles: grid.heightTiles,
    worldWidthPx: grid.widthTiles * GAME_CONFIG.tileSize,
    worldDepthPx: grid.heightTiles * GAME_CONFIG.tileSize,
    topAirRows: -400,
    caveRuntime: {
      caveId: "cave-smoke",
      floorRow: grid.floorRow,
      boundaryThicknessTiles: grid.boundaryThicknessTiles,
      safeFloorTileXs: grid.safeFloorTileXs,
      floorResourceKeys: grid.floorResourceKeys,
      resourcePool: ["silver", "gold"],
      nodeLayout: CAVE_SCENE_CONFIG.rewards.nodeLayout,
      collectedTileKeys,
    },
  });
}

function getConfiguredRewardPool(depthTiles) {
  return [...CAVE_SCENE_CONFIG.rewards.depthPools]
    .reverse()
    .find(pool => depthTiles >= pool.minDepthTiles);
}

for (const pool of CAVE_SCENE_CONFIG.rewards.depthPools) {
  for (const resourceKey of pool.resources) {
    const minimumDepth = CAVE_SCENE_CONFIG.rewards.minDepthByResource[resourceKey] || 0;
    assert.ok(
      pool.minDepthTiles >= minimumDepth,
      `${resourceKey} must not enter the cave pool before ${minimumDepth}m`
    );
  }
}
assert.equal(getConfiguredRewardPool(799).resources.includes("silver"), false, "silver must not spawn in caves before 800m");
assert.equal(getConfiguredRewardPool(800).resources.includes("silver"), true, "silver must unlock in caves at 800m");
assert.equal(getConfiguredRewardPool(1199).resources.includes("gold"), false, "gold must not spawn in caves before 1200m");
assert.equal(getConfiguredRewardPool(1200).resources.includes("gold"), true, "gold must unlock in caves at 1200m");

const model = makeModel();
for (const node of CAVE_SCENE_CONFIG.rewards.nodeLayout) {
  assert.equal(model.isDiggable(node.tx, node.ty), true, `reward ${node.tx},${node.ty} must be a diggable tile`);
  assert.ok(model.getTileHp(node.tx, node.ty) > 0, `reward ${node.tx},${node.ty} must use normal tile HP`);
}
assert.equal(model.getTileType(CAVE_SCENE_CONFIG.grid.safeFloorTileXs[0], CAVE_SCENE_CONFIG.grid.floorRow), TILE_TYPES.CAVE_WALL);

const target = CAVE_SCENE_CONFIG.rewards.nodeLayout[0];
const destroyed = model.damageTile(target.tx, target.ty, Number.MAX_SAFE_INTEGER);
assert.equal(destroyed.destroyed, true, "normal WorldModel damage must destroy cave rewards");
assert.equal(model.getTileType(target.tx, target.ty), TILE_TYPES.AIR);

const savedKey = makeCaveTileSaveKey("cave-smoke", target.tx, target.ty);
const restored = makeModel([savedKey]);
assert.equal(restored.getTileType(target.tx, target.ty), TILE_TYPES.AIR, "dug cave tiles must stay dug after re-entry");

const caveSceneSource = await readFile(new URL("../ui/scenes/CaveScene.js", import.meta.url), "utf8");
const controllerSource = await readFile(new URL("../world/playScene/CaveGameplayController.js", import.meta.url), "utf8");
const caveEntrySource = await readFile(new URL("../world/playScene/CaveEntryController.js", import.meta.url), "utf8");
assert.match(caveSceneSource, /new CaveWorldModel\(/, "CaveScene must use a real tile model");
assert.match(caveSceneSource, /new CaveGameplayController\(/, "CaveScene must use the shared gameplay adapter");
assert.doesNotMatch(caveSceneSource, /_tryCollectReward|add\.circle\([\s\S]*nodeRadius/, "collectible-circle cave rewards must not return");
assert.match(controllerSource, /new PlayerController\(/, "caves must use the normal player controller");
assert.match(controllerSource, /new DigSystem\(/, "caves must use the normal dig system");
assert.match(controllerSource, /playerController\.update\(delta\)/, "flight and movement flags must run through the normal update");
assert.match(controllerSource, /isQuickslashActive\(\)/, "Quickslash must use PlayerAbilities inside caves");
assert.match(controllerSource, /getThunderStrikeInput\(\)/, "Thunder Strike must use PlayerAbilities inside caves");
assert.match(caveEntrySource, /resolveScenicCaveMouthsEnabled/, "standalone caves must render the scenic mouth by default");
assert.doesNotMatch(caveEntrySource, /ASSET_KEYS\.tiles\.caveWall/, "scenic mouths must not be coupled to the legacy opaque tile");
assert.match(caveEntrySource, /_createEntranceSprites\(\)/, "cave entrance sprites must be created with the controller");

let justDownCalls = 0;
globalThis.Phaser = {
  Scene: class {},
  Input: { Keyboard: { JustDown: () => { justDownCalls += 1; return true; } } },
};
await import("../world/playScene/CaveGameplayController.js");
await import("../ui/scenes/CaveScene.js");
const { ArcCoreVehicleSystem } = await import("../systems/vehicles/ArcCoreVehicleSystem.js");
const { CaveEntryController } = await import("../world/playScene/CaveEntryController.js");

const positionStub = {
  x: 0,
  y: 0,
  setDisplaySize() { return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
  setVisible() { return this; },
  setText() { return this; },
  setTint() { return this; },
};
const arcCore = new ArcCoreVehicleSystem({
  config: { tileSize: GAME_CONFIG.tileSize },
  upgradeSystem: {},
  player: { setVisible() {} },
  playerBodyLanguage: { setEnabled() {} },
  hudSystem: { flashStatus() {} },
});
arcCore.sprite = { ...positionStub };
arcCore.prompt = { ...positionStub };
const farTile = {
  tx: ARC_CORE_CONFIG.parking.tileX + ARC_CORE_CONFIG.interactRangeTiles + 10,
  ty: ARC_CORE_CONFIG.parking.tileY,
};
assert.equal(arcCore.update(farTile, { arcCoreVehicle: {} }), false, "distant Arc Core must not consume B");
assert.equal(justDownCalls, 0, "distant Arc Core must not read JustDown before shops or caves");
const parkedTile = { tx: ARC_CORE_CONFIG.parking.tileX, ty: ARC_CORE_CONFIG.parking.tileY };
assert.equal(arcCore.update(parkedTile, { arcCoreVehicle: {} }), true, "nearby Arc Core may consume B");
assert.equal(justDownCalls, 1, "nearby Arc Core must read B exactly once");

let caveLaunch = null;
const entranceImage = {
  textureKey: null,
  displayWidth: 0,
  displayHeight: 0,
  setOrigin() { return this; },
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
  setDepth() { return this; },
  setAlpha() { return this; },
  setTint() { return this; },
  destroy() {},
};
const promptStub = {
  setDepth() { return this; },
  setOrigin() { return this; },
  setVisible() { return this; },
  setPosition() { return this; },
  setText() { return this; },
  destroy() {},
};
const entranceZone = {
  id: "cave-entry-smoke",
  standaloneScene: true,
  entry: { tx: 7, ty: 40 },
  mouthAnchor: { tx: 6.5, ty: 40 },
  backgroundPresetKey: "caveAmber",
  cy: 40,
};
const caveEntry = new CaveEntryController({
  config: { tileSize: GAME_CONFIG.tileSize, topAirRows: GAME_CONFIG.topAirRows },
  worldModel: { caveZones: [entranceZone] },
  textures: { exists: () => true },
  add: {
    text: () => promptStub,
    image: (x, y, textureKey) => {
      entranceImage.x = x;
      entranceImage.y = y;
      entranceImage.textureKey = textureKey;
      return entranceImage;
    },
  },
  playerController: { setControlsEnabled() {} },
  scene: {
    launch: (key, data) => { caveLaunch = { key, data }; },
    pause() {},
  },
});
caveEntry.create();
assert.equal(caveEntry.entranceSprites.length, 1, "standalone cave must create one visible mouth sprite");
assert.equal(entranceImage.textureKey, CAVE_SCENE_CONFIG.overworldEntrance.scenic.textureKey, "cave mouth must use the approved scenic entrance art");
assert.ok(entranceImage.displayWidth > GAME_CONFIG.tileSize, "cave mouth sprite must span the two-tile opening");
assert.equal(caveEntry.update(entranceZone.entry, { interact: {} }), true, "E near a cave must be consumed by CaveEntryController");
assert.equal(caveLaunch?.key, CAVE_SCENE_CONFIG.sceneKey, "E near a cave must launch CaveScene");
delete globalThis.Phaser;

console.log("cave gameplay parity smoke test passed");
