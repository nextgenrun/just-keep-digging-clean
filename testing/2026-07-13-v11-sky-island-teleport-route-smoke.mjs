import assert from "node:assert/strict";

import { SpecialTileSystem } from "../systems/mining/SpecialTileSystem.js";
import { WorldModel } from "../world/model/WorldModel.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { HEAVENBLOCKS_WORLD_CONFIG } from "../values/heavenblocksWorldConfig.js";
import { SECOND_WORLD_CONFIG } from "../values/secondWorldConfig.js";

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

function createHarness(worldModel = new WorldModel(), initialUnlocked = []) {
  const groundPortalStates = new Map();
  const activePortalSlots = new Map();
  const lockedFeedback = [];
  const teleports = [];
  const unlocked = new Set(initialUnlocked);
  let playerTile = { tx: 0, ty: 0 };
  const promptText = createPromptText();

  const progression = {
    getRegionAccessState(regionId) {
      if (unlocked.has(regionId)) return { allowed: true, regionId };
      return regionId === "cloud-reef"
        ? { allowed: false, reason: "relics", have: 0, required: 3, regionId }
        : {
            allowed: false,
            reason: "heart",
            requiredRegionId: regionId === "halo-bastion" ? "cloud-reef" : "halo-bastion",
            regionId,
          };
    },
    getLevelAccessState(levelId) {
      const regionId = Number(levelId) === 1 ? "cloud-reef" : "eclipse-scar";
      return this.getRegionAccessState(regionId);
    },
  };
  const artifactSystem = {
    setGroundPortalUnlocked(levelId, routeUnlocked) {
      groundPortalStates.set(Number(levelId), routeUnlocked === true);
    },
    setSkyPortalSlotActive(slotId, active) {
      activePortalSlots.set(String(slotId), active === true);
      return true;
    },
    playLockedPortalFeedback(regionId, access) {
      lockedFeedback.push({ regionId, access });
    },
  };
  const scene = {
    add: { text: () => promptText },
    heavenblocksProgressionSystem: progression,
    heavenblocksArtifactSystem: artifactSystem,
    earthquakeFeedbackUI: { clearEscapeObjective() {} },
    earthquakeHazardOverlay: { clear() {} },
    uiNotifications: { info() {} },
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
  system._celebratePortalActivation = () => {};

  return {
    system,
    scene,
    worldModel,
    groundPortalStates,
    activePortalSlots,
    lockedFeedback,
    teleports,
    unlock(regionId) { unlocked.add(regionId); },
    setPlayerTile(tx, ty) { playerTile = { tx, ty }; },
  };
}

function activateDepthTile(harness, tx, ty) {
  harness.system.promptTile = { tx, ty, type: "teleport", key: `${tx},${ty}` };
  return harness.system.handleInteract();
}

const world = new WorldModel();
const harness = createHarness(world);
const level1 = HEAVENBLOCKS_WORLD_CONFIG.levels.find((level) => level.levelId === 1);
const level2 = HEAVENBLOCKS_WORLD_CONFIG.levels.find((level) => level.levelId === 2);

assert.equal(harness.system.skyPortalSlots.length, 8, "four native portal sockets per level");
assert.equal(harness.system._findUnlockedGroundPortalAt(93, 64), null);

const level1Activation = activateDepthTile(harness, 77, 95);
assert.equal(level1Activation.success, true);
assert.equal(level1Activation.type, "teleportRouteAttunedLocked");
assert.equal(level1Activation.pairData.levelId, 1);
assert.equal(level1Activation.pairData.regionId, "cloud-reef");
assert.equal(harness.teleports.length, 0, "a route can attune without bypassing the relic seal");
assert.equal(harness.groundPortalStates.get(1), true);
assert.equal(harness.groundPortalStates.get(2), false);
assert.equal(harness.activePortalSlots.get(level1Activation.pairData.gateSlotId), true);

harness.setPlayerTile(level1.groundPortal.leftTile - 1, 64);
harness.system.update();
assert.equal(harness.system.promptTile?.type, "teleportGroundLocked");
assert.match(harness.system.promptText.text, /0\/3 Ancient Relics/);
assert.equal(harness.system.handleInteract().type, "heavenblocksPortalLocked");
assert.equal(
  harness.lockedFeedback.length,
  2,
  "both the sealed depth route and the sealed ground portal explain the lock"
);

harness.unlock("cloud-reef");
harness.system.update();
assert.equal(harness.system.promptTile?.type, "teleportGroundToSky");
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
assert.equal(level2Activation.type, "teleportRouteAttunedLocked");
assert.equal(level2Activation.pairData.levelId, 2);
assert.equal(level2Activation.pairData.regionId, "eclipse-scar");
assert.equal(harness.groundPortalStates.get(2), true);

harness.setPlayerTile(level2.groundPortal.leftTile - 1, 64);
harness.system.update();
assert.equal(harness.system.promptTile?.type, "teleportGroundLocked");
harness.unlock("eclipse-scar");
harness.system.update();
assert.equal(harness.system.promptTile?.type, "teleportGroundToSky");
assert.equal(harness.system.handleInteract().success, true);
assert.deepEqual(harness.teleports.at(-1), level2.groundPortal.skyArrivalTile);

for (const depth of [180, 260, 340, 420]) activateDepthTile(harness, 76, depth);
const level1Pairs = Array.from(harness.system.pairedTeleporters.values())
  .filter((pair) => pair.levelId === 1);
assert.equal(level1Pairs.length, 4);
assert.deepEqual(
  level1Pairs.map((pair) => pair.dungeonTy).sort((a, b) => a - b),
  [180, 260, 340, 420],
  "the shallowest Level 1 route is replaced so the deepest four remain"
);

const saveData = harness.system.getSaveData();
const restored = createHarness(world, ["cloud-reef", "eclipse-scar"]);
restored.system.loadSaveData(saveData);
assert.equal(restored.groundPortalStates.get(1), true);
assert.equal(restored.groundPortalStates.get(2), true);
assert.equal(restored.system.pairedTeleporters.size, saveData.pairedTeleporters.length);
restored.system.destroy();
assert.equal(restored.groundPortalStates.get(1), false);
assert.equal(restored.groundPortalStates.get(2), false);

for (const anchor of SECOND_WORLD_CONFIG.generation.teleportAnchors) {
  assert.equal(world.getTileType(anchor.tx, anchor.ty), TILE_TYPES.TELEPORT_TILE);
  assert.equal(
    [
      [anchor.tx - 1, anchor.ty],
      [anchor.tx + 1, anchor.ty],
      [anchor.tx, anchor.ty - 1],
      [anchor.tx, anchor.ty + 1],
    ].some(([tx, ty]) => !world.isSolid(tx, ty)),
    true,
    `Level 2 teleport anchor ${anchor.tx},${anchor.ty} borders a discoverable cave`
  );
}

for (const level of HEAVENBLOCKS_WORLD_CONFIG.levels) {
  for (const tile of level.groundPortal.interactionTiles) {
    assert.equal(world.getTileType(tile.tx, tile.ty), TILE_TYPES.AIR);
    assert.notEqual(world.getTileType(tile.tx, tile.ty + 1), TILE_TYPES.AIR);
  }
  const arrival = level.groundPortal.skyArrivalTile;
  assert.equal(world.getTileType(arrival.tx, arrival.ty), TILE_TYPES.AIR);
  assert.notEqual(world.getTileType(arrival.tx, arrival.ty + 1), TILE_TYPES.AIR);
}

console.log("native Heavenblocks teleport route smoke passed");
