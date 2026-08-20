import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerSurfaceDropController } from "../player/PlayerSurfaceDropController.js";
import { FirstFiveMinutesTutorialBridge } from "../systems/onboarding/FirstFiveMinutesTutorialBridge.js";
import { TutorialMovementDistanceTracker } from
  "../systems/onboarding/TutorialMovementDistanceTracker.js";
import {
  getTownTutorialDigSite,
  isRequiredTownTutorialDigTarget,
  prepareTownTutorialDigSite,
} from "../systems/onboarding/TownSquareTutorialDigSite.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import {
  FIRST_FIVE_MINUTES_CONFIG,
  resolveFirstFiveMinutesEnabled,
} from "../values/firstFiveMinutes.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import {
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { TUTORIAL_NARRATION_CONFIG } from "../values/tutorialNarration.js";
import { WorldVisualRuntime } from
  "../world/rendering/scenic-world/WorldVisualRuntime.js";

assert.equal(resolveFirstFiveMinutesEnabled(FIRST_FIVE_MINUTES_CONFIG, ""), true);
for (const value of ["0", "off", "false", "legacy"]) {
  assert.equal(
    resolveFirstFiveMinutesEnabled(FIRST_FIVE_MINUTES_CONFIG, `?firstFive=${value}`),
    false,
  );
}
assert.equal(
  resolveFirstFiveMinutesEnabled(FIRST_FIVE_MINUTES_CONFIG, "?firstFive=1"),
  true,
);

const movementDistance = new TutorialMovementDistanceTracker();
movementDistance.reset(0);
assert.equal(movementDistance.update(GAME_CONFIG.tileSize * 1.8), GAME_CONFIG.tileSize * 1.8);
assert.ok(
  Math.abs(
    movementDistance.update(GAME_CONFIG.tileSize) - GAME_CONFIG.tileSize * 2.6,
  ) < 0.001,
  "turning around must keep earned tutorial walking distance",
);

function makeWorld() {
  return {
    dugTiles: new Set(),
    writes: [],
    getTileMaxHp() {
      return 45;
    },
    getTileType() {
      return null;
    },
    isSolid() {
      return false;
    },
    setTile(tx, ty, type, hp) {
      this.writes.push({ tx, ty, type, hp });
    },
  };
}

function makeDigSiteScene() {
  const worldModel = makeWorld();
  return {
    config: {
      tileSize: GAME_CONFIG.tileSize,
      topAirRows: GAME_CONFIG.topAirRows,
    },
    worldModel,
    worldRenderer: {
      updates: [],
      tutorialVisuals: [],
      tutorialVisualClears: 0,
      applyTileUpdate(tx, ty) {
        this.updates.push({ tx, ty });
      },
      setTutorialTileVisual(tx, ty, type, visible) {
        this.tutorialVisuals.push({ tx, ty, type, visible });
      },
      clearTutorialTileVisual() { this.tutorialVisualClears += 1; },
    },
  };
}

const guidedScene = makeDigSiteScene();
const guidedSite = prepareTownTutorialDigSite(guidedScene, "");
assert.deepEqual(guidedSite, {
  tx: FIRST_FIVE_MINUTES_CONFIG.digSite.tileX,
  ty: GAME_CONFIG.topAirRows,
});
assert.equal(guidedScene.worldModel.writes[0].hp, 45);
assert.equal(guidedScene.worldRenderer.tutorialVisuals.length, 0);
assert.equal(guidedScene.worldRenderer.tutorialVisualClears, 1);
assert.ok(
  (guidedSite.tx + 1) * GAME_CONFIG.tileSize <= GAME_CONFIG.viewportWidth,
  "first marked block must fit inside the default opening viewport",
);

let tutorialVisualDepth = null;
const tutorialRenderer = new WorldVisualRuntime(
  {
    config: GAME_CONFIG,
    textures: { exists: () => true },
    add: {
      image: () => ({
        setOrigin() { return this; },
        setDepth(depth) { tutorialVisualDepth = depth; return this; },
        setPosition() { return this; },
        setDisplaySize() { return this; },
        setVisible() { return this; },
      }),
    },
  },
  makeWorld(),
  GAME_CONFIG,
);
tutorialRenderer.created = true;
assert.equal(
  tutorialRenderer.setTutorialTileVisual(
    guidedSite.tx,
    guidedSite.ty,
    TILE_TYPES.DIRT,
  ),
  true,
);
assert.equal(
  tutorialVisualDepth,
  WORLD_VISUAL_RUNTIME.render.physicalEffectDepth + 0.01,
  "tutorial visuals must read scenic render depth from WORLD_VISUAL_RUNTIME",
);

const legacyScene = makeDigSiteScene();
assert.equal(getTownTutorialDigSite(legacyScene, "?firstFive=0").tx, 12);
prepareTownTutorialDigSite(legacyScene, "?firstFive=0");
assert.equal(legacyScene.worldModel.writes[0].hp, 1);

let allowDrop = false;
let blockedCount = 0;
let collisionCount = 0;
const surfaceDrop = new PlayerSurfaceDropController(
  { consumeSurfaceDropInput: () => true },
  {
    tryBeginSurfaceDropThrough() {
      collisionCount += 1;
      return true;
    },
  },
  {},
  GAME_CONFIG.topAirRows,
);
surfaceDrop.setAccessPolicy(
  () => allowDrop,
  () => {
    blockedCount += 1;
  },
);
assert.equal(surfaceDrop.update(), false);
assert.equal(blockedCount, 1);
assert.equal(collisionCount, 0);
allowDrop = true;
assert.equal(surfaceDrop.update(), true);
assert.equal(collisionCount, 1);

function interpolateCopy(copy, replacements = {}) {
  const labels = {
    left: "A",
    right: "D",
    mine: "F",
    interact: "E",
    fly: "SHIFT",
    ...replacements,
  };
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [
      key,
      String(value).replace(/\{(\w+)\}/g, (_, token) => labels[token] ?? token),
    ]),
  );
}

const retention = new RetentionProgressSystem({ firstFiveEnabled: true });
assert.equal(retention.configureTutorialChoice(TOWN_TUTORIAL_CHOICES.YES), true);
const worldModel = makeWorld();
let flightActive = false;
let canDropThrough = null;
let onDropBlocked = null;
let saveCount = 0;
const view = {
  marker: null,
  completion: null,
  closeGuideNotification() {},
  clearMarker() {
    this.marker = null;
  },
  pointAt(x, y) {
    this.marker = { x, y };
  },
  showCompletion(copy) {
    this.completion = copy;
  },
};
const scene = {
  retentionProgressSystem: retention,
  config: {
    tileSize: GAME_CONFIG.tileSize,
    topAirRows: GAME_CONFIG.topAirRows,
    playerSpawnTileX: GAME_CONFIG.playerSpawnTileX,
  },
  time: { now: 0 },
  worldModel,
  worldRenderer: { applyTileUpdate() {} },
  playerController: {
    physicsBody: {
      x: GAME_CONFIG.playerSpawnTileX * GAME_CONFIG.tileSize,
      y: GAME_CONFIG.topAirRows * GAME_CONFIG.tileSize - 48,
      w: 48,
      h: 48,
    },
    teleports: [],
    teleportToTile(tx, ty) {
      this.teleports.push({ tx, ty });
      this.physicsBody.x = tx * GAME_CONFIG.tileSize;
      this.physicsBody.y = (ty + 1) * GAME_CONFIG.tileSize - this.physicsBody.h;
    },
    surfaceDrop: {
      setAccessPolicy(canDrop, onBlocked) {
        canDropThrough = canDrop;
        onDropBlocked = onBlocked;
      },
    },
    abilities: {
      isFlying: () => flightActive,
    },
    getPlayerTile() {
      return {
        tx: Math.floor(
          (this.physicsBody.x + this.physicsBody.w / 2) / GAME_CONFIG.tileSize,
        ),
        ty: Math.floor(
          (this.physicsBody.y + this.physicsBody.h / 2) / GAME_CONFIG.tileSize,
        ),
      };
    },
    getAimTargetTile: () => null,
  },
  firstSessionPortalSystem: {
    getPortalTile: () => ({
      tx: FIRST_FIVE_MINUTES_CONFIG.firstPortal.tileX,
      ty: GAME_CONFIG.topAirRows
        + FIRST_FIVE_MINUTES_CONFIG.firstPortal.depthMeters,
    }),
  },
  upgradeSystem: {
    getUpgradeLevel: () => 0,
  },
  queueDugTilesSave() {
    saveCount += 1;
  },
};
const bridge = new FirstFiveMinutesTutorialBridge(
  scene,
  retention,
  view,
  interpolateCopy,
  { enabled: true },
);
bridge.create();
assert.equal(bridge.hasPersistentGuide(), true);
assert.match(bridge.getNextPromiseOverride().promise, /STEP 1/);
assert.equal(bridge.isUpgradeAvailable("agility"), true);
assert.equal(canDropThrough(), false);
onDropBlocked();
assert.match(bridge.getNextPromiseOverride().detail, /MARKED STARTER ROUTE/);
scene.playerController.physicsBody.y = GAME_CONFIG.topAirRows * GAME_CONFIG.tileSize + 18;
assert.equal(bridge.enforceSurfaceSafety(), true);
assert.deepEqual(scene.playerController.teleports.at(-1), {
  tx: GAME_CONFIG.playerSpawnTileX,
  ty: GAME_CONFIG.topAirRows - 1,
});
assert.equal(bridge.isDescentBlocked(), true);

retention.recordTutorialMovement(2);
const requiredDigSite = getTownTutorialDigSite(scene);
assert.equal(isRequiredTownTutorialDigTarget(scene, requiredDigSite), true);
assert.equal(isRequiredTownTutorialDigTarget(scene, {
  tx: requiredDigSite.tx + 1,
  ty: requiredDigSite.ty,
}), false);
assert.equal(isRequiredTownTutorialDigTarget(scene, {
  tx: requiredDigSite.tx,
  ty: requiredDigSite.ty + 1,
}), false);
retention.recordMiningResult({ success: true, destroyed: true, resourceAmount: 1 });
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.FLIGHT);
assert.equal(retention.claimTutorialFlightTraining().freeFlightMs, 30000);
const fullFlightSave = retention.getSaveData();
bridge.update();
assert.match(bridge.getNextPromiseOverride().promise, /STEP 3/);
assert.equal(canDropThrough(), false);

const resumed = new RetentionProgressSystem({ firstFiveEnabled: true });
resumed.loadSaveData(fullFlightSave);
const resumedBridge = new FirstFiveMinutesTutorialBridge(
  { time: { now: 0 } },
  resumed,
  view,
  interpolateCopy,
  { enabled: true },
);
assert.match(resumedBridge.getNextPromiseOverride().detail, /SHIFT/);

flightActive = true;
retention.consumeTutorialFreeFlight(16);
assert.equal(retention.recordTutorialFlight(), true);
bridge.update();
assert.equal(canDropThrough(), false, "PORTAL stage stays closed outside x12 route");
scene.playerController.physicsBody.x = (
  FIRST_FIVE_MINUTES_CONFIG.firstPortal.tileX * GAME_CONFIG.tileSize
);
assert.equal(canDropThrough(), true, "surface drop opens only above starter route");
assert.match(bridge.getNextPromiseOverride().promise, /STEP 4/);
retention.recordPortalActivated("Starter Return Gate");
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.SELL);
assert.match(bridge.getNextPromiseOverride().promise, /STEP 5/);
retention.recordSale(1, 1);
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.UPGRADE);
assert.match(bridge.getNextPromiseOverride().promise, /STEP 6/);
retention.recordUpgrade("Agility Training", { upgradeId: "agility" });
assert.equal(retention.getTutorialState().stage, TOWN_TUTORIAL_STAGES.RESUME);
assert.match(bridge.getNextPromiseOverride().promise, /STEP 7/);
assert.equal(retention.recordTutorialPortalResume(), true);
assert.equal(bridge.hasPersistentGuide(), false);

const townSource = await readFile(
  new URL("../systems/onboarding/TownSquareTutorialSystem.js", import.meta.url),
  "utf8",
);
const promiseSource = await readFile(
  new URL("../systems/visual/NextPromiseHudSystem.js", import.meta.url),
  "utf8",
);
const updateSource = await readFile(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
assert.match(townSource, /fly: USER_SETTINGS\.getKeyLabel\("fly"\)/);
assert.match(townSource, /firstFive\.create\(\)/);
assert.match(townSource, /getNextPromiseOverride/);
assert.match(promiseSource, /tutorialPromise \|\| eventPromise/);
assert.match(updateSource, /enforceSurfaceSafety/);
assert.match(updateSource, /tutorialDownwardMineBlocked/);
assert.ok(TUTORIAL_NARRATION_CONFIG.cues.dig.caption.detail.includes("{mine}"));
assert.ok(TUTORIAL_NARRATION_CONFIG.cues.flight.caption.detail.includes("{fly}"));

const rollbackBridge = new FirstFiveMinutesTutorialBridge(
  scene,
  retention,
  view,
  interpolateCopy,
  { enabled: false },
);
assert.equal(rollbackBridge.hasPersistentGuide(), false);
assert.equal(rollbackBridge.isSurfaceDropBlocked(), false);

console.log("First-five onboarding contract passed.");
