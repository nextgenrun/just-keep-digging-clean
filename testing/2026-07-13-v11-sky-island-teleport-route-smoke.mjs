import assert from "node:assert/strict";

import { SpecialTileSystem } from "../systems/mining/SpecialTileSystem.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { V11_SKY_ISLAND_LAYOUT } from "../values/v11SkyIslandLayout.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";
import { TOWN_SQUARE_CONFIG } from "../values/townSquareConfig.js";

function createPromptText() {
  return {
    visible: false,
    text: "",
    setDepth() { return this; },
    setVisible(value) { this.visible = value; return this; },
    setPosition() { return this; },
    setColor() { return this; },
    setBackgroundColor() { return this; },
    setText(value) { this.text = value; return this; },
    destroy() {},
  };
}

function createDisplayObject() {
  return {
    destroyed: false,
    setStrokeStyle() { return this; },
    setDepth() { return this; },
    destroy() { this.destroyed = true; },
  };
}

function createHarness(worldModelOverride = null) {
  const groundPortalStates = new Map();
  const teleports = [];
  let playerTile = { tx: 0, ty: 0 };
  const promptText = createPromptText();

  const fallbackWorldModel = {
    config: { tileSize: 94, topAirRows: 65 },
    inBounds(tx, ty) {
      return tx >= 0 && tx < 280 && ty >= 0 && ty < 2000;
    },
    isSolid(tx, ty) {
      if (ty !== 18) return false;
      return (tx >= 80 && tx <= 95) || (tx >= 142 && tx <= 157);
    },
    getTileType() { return 0; },
    applyDugTileKeys() { return []; },
    tileToWorld(tx, ty) { return { x: tx * 94, y: ty * 94 }; },
  };
  const worldModel = worldModelOverride || fallbackWorldModel;

  const scene = {
    add: {
      text: () => promptText,
      circle: () => createDisplayObject(),
    },
    tweens: {
      add(config) {
        config?.onComplete?.();
        return { stop() {} };
      },
    },
    v11SkyIslandVisualSystem: {
      setGroundPortalUnlocked(levelId, unlocked) {
        groundPortalStates.set(levelId, unlocked);
      },
    },
    earthquakeFeedbackUI: { clearEscapeObjective() {} },
    earthquakeHazardOverlay: { clear() {} },
    soundSystem: null,
  };

  const playerController = {
    getPlayerTile() { return playerTile; },
    teleportToTile(tx, ty) {
      playerTile = { tx, ty };
      teleports.push({ tx, ty });
    },
  };

  const system = new SpecialTileSystem(scene, worldModel, playerController, null);
  system._spawnSkyPortalGlow = () => null;

  return {
    system,
    scene,
    worldModel,
    groundPortalStates,
    teleports,
    setPlayerTile(tx, ty) { playerTile = { tx, ty }; },
  };
}

function activateDepthTile(harness, tx, ty) {
  harness.system.promptTile = { tx, ty, type: "teleport", key: `${tx},${ty}` };
  return harness.system.handleInteract();
}

const harness = createHarness();
const level1 = V11_SKY_ISLAND_LAYOUT.levels.find((level) => level.levelId === 1);
const level2 = V11_SKY_ISLAND_LAYOUT.levels.find((level) => level.levelId === 2);

assert.equal(harness.system.skyPortalSlots.length, 8, "v11 should expose four authored gate slots per level");
assert.equal(level1.groundPortal.leftTile, 0, "Level 1 surface portal should sit at the town's far-left edge");
assert.ok(
  level1.groundPortal.leftTile + level1.groundPortal.widthTiles
    <= TOWN_SQUARE_CONFIG.milestonePillar.tileX,
  "Level 1 surface portal must remain fully left of the Milestone Pillar"
);
assert.equal(
  harness.system._findUnlockedGroundPortalAt(level1.groundPortal.leftTile, 64),
  null,
  "surface portal must start locked"
);

const level1Activation = activateDepthTile(harness, 77, 95);
assert.equal(level1Activation.success, true);
assert.equal(level1Activation.pairData.levelId, 1);
assert.equal(harness.groundPortalStates.get(1), true, "first Level 1 depth tile should unlock its surface portal");
assert.equal(harness.groundPortalStates.get(2), false, "Level 2 surface portal should remain locked");

harness.setPlayerTile(level1.groundPortal.leftTile + level1.groundPortal.widthTiles, 64);
harness.system.update();
assert.equal(harness.system.promptTile?.type, "teleportGroundToSky");
assert.equal(harness.system.getInteractionDistance(), 1);
const level1Ascent = harness.system.handleInteract();
assert.deepEqual(level1Ascent, {
  success: true,
  type: "teleport",
  target: "skyIslandGroundPortal",
  levelId: 1,
});
assert.deepEqual(harness.teleports.at(-1), level1.groundPortal.skyArrivalTile);

const level1Pair = level1Activation.pairData;
harness.setPlayerTile(level1Pair.skyTx, level1Pair.skyTy + 1);
harness.system.update();
assert.equal(harness.system.promptTile?.type, "teleportSkyReturn");
const level1Return = harness.system.handleInteract();
assert.equal(level1Return.success, true);
assert.equal(level1Return.target, "dungeon");
assert.equal(harness.teleports.at(-1).tx, 77);

const level2Activation = activateDepthTile(harness, 140, 110);
assert.equal(level2Activation.success, true);
assert.equal(level2Activation.pairData.levelId, 2);
assert.equal(harness.groundPortalStates.get(2), true, "first Level 2 depth tile should unlock its surface portal");

harness.setPlayerTile(level2.groundPortal.leftTile - 1, 64);
harness.system.update();
assert.equal(harness.system.promptTile?.levelId, 2);
assert.equal(harness.system.handleInteract().success, true);
assert.deepEqual(harness.teleports.at(-1), level2.groundPortal.skyArrivalTile);

for (const depth of [180, 260, 340, 420]) activateDepthTile(harness, 76, depth);
const level1Pairs = Array.from(harness.system.pairedTeleporters.values())
  .filter((pair) => pair.levelId === 1);
assert.equal(level1Pairs.length, 4, "Level 1 should retain exactly four depth routes");
assert.deepEqual(
  level1Pairs.map((pair) => pair.dungeonTy).sort((a, b) => a - b),
  [180, 260, 340, 420],
  "the shallowest Level 1 route should be replaced so the deepest four remain"
);

const saveData = harness.system.getSaveData();
const restored = createHarness();
restored.system.loadSaveData(saveData);
assert.equal(restored.groundPortalStates.get(1), true, "Level 1 surface portal should restore from save data");
assert.equal(restored.groundPortalStates.get(2), true, "Level 2 surface portal should restore from save data");
assert.equal(restored.system.pairedTeleporters.size, saveData.pairedTeleporters.length);

restored.system.destroy();
assert.equal(restored.groundPortalStates.get(1), false);
assert.equal(restored.groundPortalStates.get(2), false);

const authoredWorld = new WorldModel();
for (const anchor of SECOND_WORLD_CONFIG.generation.teleportAnchors) {
  assert.equal(
    authoredWorld.getTileType(anchor.tx, anchor.ty),
    TILE_TYPES.TELEPORT_TILE,
    `Level 2 teleport anchor ${anchor.tx},${anchor.ty} must survive world generation`
  );
  assert.equal(
    [
      [anchor.tx - 1, anchor.ty],
      [anchor.tx + 1, anchor.ty],
      [anchor.tx, anchor.ty - 1],
      [anchor.tx, anchor.ty + 1],
    ].some(([tx, ty]) => !authoredWorld.isSolid(tx, ty)),
    true,
    `Level 2 teleport anchor ${anchor.tx},${anchor.ty} must border a discoverable cave cell`
  );
}

const generatedLevelTwoHarness = createHarness(authoredWorld);
const generatedLevelTwoAnchor = SECOND_WORLD_CONFIG.generation.teleportAnchors[0];
const generatedLevelTwoActivation = activateDepthTile(
  generatedLevelTwoHarness,
  generatedLevelTwoAnchor.tx,
  generatedLevelTwoAnchor.ty
);
assert.equal(generatedLevelTwoActivation.success, true);
assert.equal(generatedLevelTwoActivation.pairData.levelId, 2);
assert.equal(
  generatedLevelTwoHarness.groundPortalStates.get(2),
  true,
  "an actual generated Level 2 teleport must unlock the Level 2 surface ascent"
);
for (const level of V11_SKY_ISLAND_LAYOUT.levels) {
  for (const tile of level.groundPortal.interactionTiles) {
    assert.equal(authoredWorld.getTileType(tile.tx, tile.ty), TILE_TYPES.AIR);
    assert.notEqual(authoredWorld.getTileType(tile.tx, tile.ty + 1), TILE_TYPES.AIR);
  }
  const arrival = level.groundPortal.skyArrivalTile;
  assert.equal(authoredWorld.getTileType(arrival.tx, arrival.ty), TILE_TYPES.AIR);
  assert.notEqual(
    authoredWorld.getTileType(arrival.tx, arrival.ty + 1),
    TILE_TYPES.AIR,
    `Level ${level.levelId} sky-island arrival must have authored collision beneath it`
  );
}

console.log("v11 sky-island teleport route smoke passed");
