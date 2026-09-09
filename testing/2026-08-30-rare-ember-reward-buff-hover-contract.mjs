import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { CAVE_GAMEPLAY_CONFIG } from "../values/caveGameplay.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { GAMEPLAY_PROFILE_IDS, createGameplayCapabilities } from
  "../values/gameplayCapabilities.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { applyRareEmberFinds } from "../world/model/RareEmberFindPlanner.js";
import { finalizeCaveGameplay } from "../world/model/CaveGameplayPlanner.js";
import { applySecondWorldArea } from "../world/secondWorld/SecondWorldGenerator.js";
import { WorldModel } from "../world/model/WorldModel.js";

function makeWorld(seed = 133742) {
  const width = 280;
  const depthTiles = 5065;
  const size = width * depthTiles;
  const world = {
    width,
    widthTiles: width,
    depthTiles,
    topAirRows: 65,
    tileType: new Uint8Array(size),
    skyTileOriginalType: new Uint8Array(size),
    skyTileRarity: new Uint8Array(size),
    skyTileIdentity: new Uint8Array(size),
    authoredTileMask: new Uint8Array(size),
    caveZones: [],
    caveResourceSeams: [],
    config: { seed, resourceEconomyEnabled: true },
    index: (x, y) => y * width + x,
    inBounds: (x, y) => x >= 0 && x < width && y >= 0 && y < depthTiles,
    getTileMaxHp: () => 100,
  };
  world.setTile = (x, y, type) => { world.tileType[world.index(x, y)] = type; };
  world.getTileType = (x, y) => world.tileType[world.index(x, y)];
  world.isSolid = (x, y) => world.getTileType(x, y) !== TILE_TYPES.AIR;
  return world;
}

const allSecondWorldGenerationEntries = [
  ...SECOND_WORLD_CONFIG.generation.baseTiles,
  ...SECOND_WORLD_CONFIG.generation.nodeTiles,
  ...SECOND_WORLD_CONFIG.generation.nodeTilesDeep,
  ...SECOND_WORLD_CONFIG.generation.resourceCurve,
];
assert.equal(
  allSecondWorldGenerationEntries.some(entry => entry.type === TILE_TYPES.EMBER_ORE),
  false,
  "Ember must not remain ordinary base terrain, resource curve, or node paint",
);
assert.equal(
  CAVE_GAMEPLAY_CONFIG.resourceSeams.depthPools
    .flatMap(pool => pool.entries)
    .some(entry => entry.tileTypeKey === "EMBER_ORE"),
  false,
  "ordinary cave seam rolls must not produce Ember",
);

const world = makeWorld();
applySecondWorldArea(
  world,
  { enabled: true },
  SECOND_WORLD_CONFIG,
  createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.FULL_REVIEW),
);
finalizeCaveGameplay(world, CAVE_GAMEPLAY_CONFIG);
const emberCells = [];
for (let ty = 68; ty < world.depthTiles; ty += 1) {
  for (let tx = SECOND_WORLD_CONFIG.runtimeArea.leftTile + 1;
    tx <= SECOND_WORLD_CONFIG.runtimeArea.rightTile; tx += 1) {
    if (world.getTileType(tx, ty) === TILE_TYPES.EMBER_ORE) {
      emberCells.push(`${tx},${ty}`);
    }
  }
}
const indexedRareCells = new Set(world.rareEmberFinds.map(find => `${find.tx},${find.ty}`));
assert.equal(emberCells.length, 8, "the 5,000m Level Two route contains eight rare Embers");
assert.deepEqual(new Set(emberCells), indexedRareCells);
assert.equal(world.rareEmberFinds[0].depth, 627);
assert.ok(emberCells.length / 698000 < 0.00002, "Ember remains below 0.002% of solid terrain");

const levelOneWorld = {
  config: { seed: 133742 },
  topAirRows: 65,
  rareEmberFinds: [],
  caveZones: [500, 1100, 1700].map((depth, index) => ({
    id: `level-one-${index + 1}`,
    source: "authored-gap",
    cx: 20 + index,
    cy: depth + 65,
    resourceSeams: [{ tx: 20 + index, ty: depth + 65, tileType: TILE_TYPES.GOLD }],
  })),
  getTileMaxHp: () => 100,
  setTile(tx, ty, tileType) { this.lastTiles ||= []; this.lastTiles.push({ tx, ty, tileType }); },
};
applyRareEmberFinds(levelOneWorld, CAVE_GAMEPLAY_CONFIG);
assert.equal(levelOneWorld.rareEmberFinds.length, 3);
assert.deepEqual(levelOneWorld.rareEmberFinds.map(find => find.rangeId), [
  "level-one", "level-one", "level-one",
]);

const originalLog = console.log;
const originalInfo = console.info;
let productionWorld;
try {
  console.log = () => {};
  console.info = () => {};
  productionWorld = new WorldModel(GAME_CONFIG);
} finally {
  console.log = originalLog;
  console.info = originalInfo;
}
assert.deepEqual(
  productionWorld.rareEmberFinds.map(find => find.depth),
  [711, 1129, 1975],
  "the current Level One seed exposes three deliberately spaced rare finds",
);
for (const find of productionWorld.rareEmberFinds) {
  assert.ok(find.tx < GAME_CONFIG.levelTwoLeftTile, "Level One Ember remains accessible");
  assert.equal(productionWorld.getTileType(find.tx, find.ty), TILE_TYPES.EMBER_ORE);
}

const eventCalls = [];
const scene = {
  emberDiscoveryEventSystem: { play: detail => eventCalls.push(detail) },
  hudSystem: { flashStatus() {} },
  celestialActionBarSystem: { sync() {} },
  contextualMechanicTutorialSystem: { notifyEmberDiscovery() {} },
  queueDugTilesSave() {},
};
const campfire = new CampfireSystem(
  scene,
  { tileSize: 94 },
  {},
  {},
  1,
  { level: 1, charges: 1, refillCapacity: 1, selectedBuffType: "warmth" },
);
const discovery = campfire.collectEmberCharge(1, { tile: { tx: 20, ty: 965 } });
assert.equal(discovery.refillUpgraded, true);
assert.equal(eventCalls.length, 1);
assert.deepEqual(eventCalls[0].tile, { tx: 20, ty: 965 });
assert.equal(campfire.consumeSelectedBuff().ok, true);
assert.deepEqual(
  {
    icon: campfire.getActiveBuff().icon,
    bonusPercent: campfire.getActiveBuff().bonusPercent,
    effectText: campfire.getActiveBuff().effectText,
  },
  { icon: "torch", bonusPercent: 5, effectText: "+5% mining speed" },
);

assert.equal(APPROVED_HUD_SKIN.layout.buffs.iconSize, 16);
assert.ok(APPROVED_HUD_SKIN.layout.buffs.hitHeight >= 44);
assert.ok(APPROVED_HUD_SKIN.layout.buffs.tooltip.bodyWidth >= 260);

const [
  hudSource,
  eventSource,
  setupSource,
  digSource,
  contextualTutorialSource,
  nextPromiseSource,
] = await Promise.all([
  readFile(new URL("../systems/visual/HUDSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/EmberDiscoveryEventSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/mining/DigSystem.js", import.meta.url), "utf8"),
  readFile(
    new URL("../systems/onboarding/ContextualMechanicTutorialSystem.js", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../systems/visual/NextPromiseHudSystem.js", import.meta.url), "utf8"),
]);
assert.match(hudSource, /CAMPFIRE — \$\{buff\.name\.toUpperCase\(\)\}/);
assert.match(hudSource, /buff\.effectText/);
assert.match(eventSource, /CLICK \/ SPACE \/ E TO CONTINUE|continueHint/);
assert.match(setupSource, /new EmberDiscoveryEventSystem\(\s*this,\s*undefined,\s*new EmberDiscoveryEvolutionView\(this\),?\s*\)/);
assert.match(digSource, /collectEmberCharge\?\.\(1, \{ tile \}\)/);
assert.match(contextualTutorialSource, /emberDiscoveryEventSystem\?\.active === true/);
assert.match(nextPromiseSource, /emberDiscoveryEventSystem\?\.active === true/);

console.log("PASS rare Ember: 8 Level Two finds, 3 Level One bands, reward event, compact icon, and exact hover copy");
