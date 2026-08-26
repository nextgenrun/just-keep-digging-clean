import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { SpecialTileSystem } from "../systems/mining/SpecialTileSystem.js";
import { TownSquareTutorialSystem } from
  "../systems/onboarding/TownSquareTutorialSystem.js";
import { FirstFiveMinutesTutorialBridge } from
  "../systems/onboarding/FirstFiveMinutesTutorialBridge.js";
import { TutorialSurfaceSafetySystem } from
  "../systems/onboarding/TutorialSurfaceSafetySystem.js";
import { TutorialPortalGhostGuide } from
  "../systems/onboarding/TutorialPortalGhostGuide.js";
import { TownSquareTutorialView } from
  "../systems/onboarding/TownSquareTutorialView.js";
import {
  TUTORIAL_FREE_TELEPORT_PASSES,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../values/retentionConfig.js";

const tutorialAuthority = Object.create(TownSquareTutorialSystem.prototype);
let tutorialStage = TOWN_TUTORIAL_STAGES.PORTAL;
let recordedLabel = null;
let barrierSyncs = 0;
let barrierStageAtSync = null;
let saves = 0;
tutorialAuthority.retention = {
  getTutorialState: () => ({
    choice: TOWN_TUTORIAL_CHOICES.YES,
    stage: tutorialStage,
  }),
  recordPortalActivated: label => {
    recordedLabel = label;
    tutorialStage = TOWN_TUTORIAL_STAGES.SELL;
  },
};
tutorialAuthority.scene = {
  firstSessionPortalSystem: {
    getPortalTile: () => ({ tx: 12, ty: 80 }),
  },
  queueDugTilesSave: () => { saves += 1; },
};
tutorialAuthority.firstFive = {
  townExitBarrier: {
    sync: () => {
      barrierSyncs += 1;
      barrierStageAtSync = tutorialStage;
    },
  },
};
assert.equal(tutorialAuthority.isFirstPortalPending({ tx: 12, ty: 80 }), true);
assert.equal(tutorialAuthority.isFirstPortalPending({ tx: 13, ty: 80 }), false);
assert.equal(
  tutorialAuthority.recordFirstPortalActivated("Starter Return Gate", { tx: 12, ty: 80 }),
  true,
);
assert.equal(recordedLabel, "Starter Return Gate");
assert.equal(barrierSyncs, 1);
assert.equal(
  barrierStageAtSync,
  TOWN_TUTORIAL_STAGES.SELL,
  "barrier restoration must run immediately after successful first teleport",
);
assert.equal(saves, 1);
assert.equal(tutorialAuthority.isFirstPortalPending({ tx: 12, ty: 80 }), false);

let paymentAttempts = 0;
const special = Object.create(SpecialTileSystem.prototype);
special.promptTile = { tx: 12, ty: 80, type: "teleport", key: "12,80" };
special.pairedTeleporters = new Map();
special.worldModel = {
  config: { topAirRows: 65 },
};
special.scene = {
  townSquareTutorialSystem: {
    isFirstPortalPending: tile => tile?.tx === 12 && tile?.ty === 80,
  },
  tryPayHardcoreTeleport: () => {
    paymentAttempts += 1;
    return { success: false, cost: 105 };
  },
};
const slot = { id: "tutorial-slot", levelId: 1 };
special._reserveGateSlotForNewPortal = () => slot;
special._createPairData = tile => ({
  dungeonTx: tile.tx,
  dungeonTy: tile.ty,
  levelId: 1,
});
special._spawnSkyPortalGlow = () => null;
special._addSkyPortal = () => {};
special._teleportToSky = (_pair, firstActivation, options) => ({
  success: true,
  type: "teleport",
  firstActivation,
  cost: options.cost,
});
const tutorialTeleport = special._activateTeleport();
assert.equal(tutorialTeleport.success, true);
assert.equal(tutorialTeleport.firstActivation, true);
assert.equal(tutorialTeleport.cost, 0);
assert.equal(paymentAttempts, 0, "mandatory tutorial portal must not charge Hardcore money");

special.promptTile = { tx: 13, ty: 80, type: "teleport", key: "13,80" };
const paidTeleport = special._activateTeleport();
assert.deepEqual(paidTeleport, {
  success: false,
  reason: "hardcore-teleport-cost",
  cost: 105,
});
assert.equal(paymentAttempts, 1);

let destroyed = false;
const tweenConfigs = [];
const restartCallbacks = [];
let firstSolidTy = 66;
const sourceSprite = {
  texture: { key: "approved-player-sheet" },
  frame: { name: 4 },
  originX: 0.5,
  originY: 0.88,
  flipX: false,
  displayWidth: 84,
  displayHeight: 126,
};
const ghostSprite = {
  active: true,
  visible: true,
  texture: { key: "approved-player-sheet" },
  frame: { name: 4 },
  setOrigin() { return this; },
  setDepth() { return this; },
  setAlpha() { return this; },
  setTint() { return this; },
  setBlendMode() { return this; },
  setFlipX() { return this; },
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  },
  play() { return this; },
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  },
  setTexture(key, frame) {
    this.texture.key = key;
    this.frame.name = frame;
    return this;
  },
  destroy() {
    destroyed = true;
    this.active = false;
  },
};
const ghostScene = {
  config: { tileSize: 94, topAirRows: 65 },
  worldModel: {
    inBounds: () => true,
    isSolid: (_tx, ty) => ty >= firstSolidTy,
  },
  playerController: { sprite: sourceSprite },
  firstSessionPortalSystem: {
    getPortalTile: () => ({ tx: 12, ty: 80 }),
  },
  add: {
    sprite(x, y) {
      ghostSprite.x = x;
      ghostSprite.y = y;
      return ghostSprite;
    },
  },
  tweens: {
    add(config) {
      tweenConfigs.push(config);
      return { remove() {} };
    },
    killTweensOf() {},
  },
  time: {
    delayedCall(_delay, callback) {
      restartCallbacks.push(callback);
      return { remove() {} };
    },
  },
};
const ghostGuide = new TutorialPortalGhostGuide(ghostScene);
assert.equal(ghostGuide.sync(TOWN_TUTORIAL_STAGES.FLIGHT), true);
assert.equal(ghostGuide.getHealthSnapshot().textureKey, "approved-player-sheet");
assert.equal(ghostSprite.x, (12.5 - 2.25) * 94);
assert.equal(ghostSprite.y, 65 * 94, "ghost starts standing on the Town surface");
assert.equal(tweenConfigs.at(-1).x, 12.5 * 94);
assert.equal(
  ghostGuide.getHealthSnapshot().demonstration,
  "approach",
  "ghost must visibly lead toward the starter shaft",
);
assert.equal(ghostGuide.getHealthSnapshot().reachableTy, 65);
assert.equal(ghostGuide.getHealthSnapshot().blockedByTy, 66);

ghostSprite.x = tweenConfigs.at(-1).x;
tweenConfigs.at(-1).onComplete();
assert.equal(tweenConfigs.at(-1).y, 66 * 94);
ghostSprite.y = tweenConfigs.at(-1).y;
tweenConfigs.at(-1).onComplete();
assert.equal(restartCallbacks.length, 1, "ghost pauses briefly at the obstacle");

firstSolidTy = 68;
ghostGuide.update(TOWN_TUTORIAL_STAGES.PORTAL);
restartCallbacks.at(-1)();
ghostSprite.x = tweenConfigs.at(-1).x;
tweenConfigs.at(-1).onComplete();
assert.equal(tweenConfigs.at(-1).y, 68 * 94);
assert.equal(ghostGuide.getHealthSnapshot().reachableTy, 67);
assert.equal(ghostGuide.getHealthSnapshot().blockedByTy, 68);
assert.equal(
  tweenConfigs.at(-1).y <= firstSolidTy * 94,
  true,
  "ghost must stop with its feet on the first solid tile, never inside it",
);
assert.equal(ghostSprite.displayWidth, 84 * 0.82);
assert.equal(ghostGuide.sync(TOWN_TUTORIAL_STAGES.SELL), false);
assert.equal(destroyed, true);

const tutorialImages = [];
function tutorialImage(x, y) {
  return {
    x,
    y,
    visible: true,
    displayWidth: 0,
    displayHeight: 0,
    setOrigin() { return this; },
    setDepth() { return this; },
    setScrollFactor() { return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setPosition(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
      return this;
    },
    setRotation(rotation) {
      this.rotation = rotation;
      return this;
    },
    setVisible(visible) {
      this.visible = visible;
      return this;
    },
    destroy() {},
  };
}
const tutorialCamera = {
  x: 0,
  y: 0,
  width: 1000,
  height: 600,
  zoom: 1,
  worldView: { x: 0, y: 0 },
};
const tutorialView = new TownSquareTutorialView({
  cameras: { main: tutorialCamera },
  add: {
    image(x, y) {
      const image = tutorialImage(x, y);
      tutorialImages.push(image);
      return image;
    },
    text(x, y) {
      return {
        x,
        y,
        setOrigin() { return this; },
        setDepth() { return this; },
        setText() { return this; },
        setPosition() { return this; },
        setVisible() { return this; },
        destroy() {},
      };
    },
  },
  tweens: { add() {}, killTweensOf() {} },
});
tutorialView.pointAt(1500, 300);
assert.equal(tutorialImages.length, 2, "off-screen target creates a second pointer");
assert.equal(tutorialImages[1].visible, true);
assert.equal(tutorialImages[1].x, 946, "pointer remains inside the screen edge");
tutorialCamera.worldView.x = 1000;
tutorialView.update();
assert.equal(
  tutorialImages[1].visible,
  false,
  "edge pointer hides once the real world arrow is fully visible",
);
tutorialView.destroy();

let containmentStage = TOWN_TUTORIAL_STAGES.PORTAL;
let playerTile = { tx: 20, ty: 70 };
const consumedTeleportPasses = new Set();
const containment = Object.create(FirstFiveMinutesTutorialBridge.prototype);
containment.enabled = true;
containment.config = {
  firstPortal: {
    levelId: 1,
  },
  townExitBarrier: {
    starterRoute: {
      halfWidthTiles: 2,
      floorDepthMeters: 17,
    },
  },
};
containment.retention = {
  getTutorialState: () => ({
    choice: TOWN_TUTORIAL_CHOICES.YES,
    stage: containmentStage,
  }),
  hasTutorialFreeTeleportPass: passId => !consumedTeleportPasses.has(passId),
  consumeTutorialFreeTeleportPass: passId => {
    if (consumedTeleportPasses.has(passId)) return false;
    consumedTeleportPasses.add(passId);
    return true;
  },
};
containment.scene = {
  config: { topAirRows: 65 },
  playerController: { getPlayerTile: () => playerTile },
  firstSessionPortalSystem: {
    getPortalTile: () => ({ tx: 12, ty: 80 }),
  },
};

assert.equal(containment.isSurfaceDropBlocked(), true);
assert.equal(containment.isSurfaceSafetyBlocked(), true);
assert.equal(containment.shouldBlockDownwardMine({ tx: 20, ty: 65 }), true);
assert.equal(containment.shouldBlockDownwardMine({ tx: 14, ty: 70 }), true);
assert.equal(containment.shouldBlockDownwardMine({ tx: 12, ty: 82 }), true);

playerTile = { tx: 12, ty: 64 };
assert.equal(containment.isSurfaceDropBlocked(), false);
assert.equal(containment.isSurfaceSafetyBlocked(), false);
assert.equal(containment.shouldBlockDownwardMine({ tx: 12, ty: 65 }), false);
assert.equal(containment.shouldBlockDownwardMine({ tx: 13, ty: 81 }), false);

playerTile = { tx: 12, ty: 70 };
assert.equal(containment.isSurfaceSafetyBlocked(), false);
playerTile = { tx: 14, ty: 70 };
assert.equal(containment.isSurfaceSafetyBlocked(), true);

let recoveredTo = null;
const safetyScene = {
  config: { tileSize: 94, topAirRows: 65 },
  playerController: {
    physicsBody: {
      x: 20 * 94,
      y: 70 * 94,
      w: 31,
      h: 75,
    },
    teleportToTile: (tx, ty) => { recoveredTo = { tx, ty }; },
  },
};
const routeSafety = new TutorialSurfaceSafetySystem(safetyScene);
routeSafety.safeTile = { tx: 4, ty: 64 };
routeSafety.setPolicy(() => containment.isSurfaceSafetyBlocked(), () => {});
assert.equal(routeSafety.enforce(), true);
assert.deepEqual(recoveredTo, { tx: 4, ty: 64 });

playerTile = { tx: 12, ty: 70 };
recoveredTo = null;
assert.equal(routeSafety.enforce(), false);
assert.equal(recoveredTo, null, "protected starter shaft must remain traversable");

containmentStage = TOWN_TUTORIAL_STAGES.SELL;
assert.equal(containment.isSurfaceDropBlocked(), false);
assert.equal(containment.isSurfaceSafetyBlocked(), false);
assert.equal(containment.shouldBlockDownwardMine({ tx: 20, ty: 70 }), false);

const tutorialPair = {
  levelId: 1,
  dungeonTx: 12,
  dungeonTy: 80,
};
containmentStage = TOWN_TUTORIAL_STAGES.PORTAL;
assert.equal(containment.isTutorialTeleportFree({
  tile: { tx: 12, ty: 80 },
  kind: "undergroundToSky",
}), true, "the first 15m activation is inherently one-time and free");

containmentStage = TOWN_TUTORIAL_STAGES.SELL;
assert.equal(containment.isTutorialTeleportFree({
  pairData: tutorialPair,
  kind: "skyToDungeon",
}), true);
assert.equal(containment.isTutorialTeleportFree({
  levelId: 1,
  kind: "groundToSky",
}), false, "the required ground ascent pass opens at RESUME, not earlier");
assert.equal(containment.isTutorialTeleportFree({
  pairData: { ...tutorialPair, dungeonTx: 13 },
  kind: "skyToDungeon",
}), false);
assert.equal(containment.isTutorialTeleportFree({
  levelId: 2,
  kind: "groundToSky",
}), false);

let returnPaymentAttempts = 0;
let returnTarget = null;
const returnTravel = Object.create(SpecialTileSystem.prototype);
returnTravel.worldModel = { config: { topAirRows: 65 } };
returnTravel.playerController = {
  teleportToTile: (tx, ty) => { returnTarget = { tx, ty }; },
};
returnTravel.scene = {
  townSquareTutorialSystem: {
    isTutorialTeleportFree: context => containment.isTutorialTeleportFree(context),
    consumeTutorialTeleportFreePass: context => (
      containment.consumeTutorialTeleportFreePass(context)
    ),
  },
  tryPayHardcoreTeleport: () => {
    returnPaymentAttempts += 1;
    return { success: false, cost: 120 };
  },
  getHardcoreTeleportCost: () => 120,
  retentionProgressSystem: {
    recordTutorialPortalResume: () => false,
  },
};
returnTravel._findSafeReturnTile = () => ({ tx: 12, ty: 79 });
returnTravel._playSound = () => {};

containmentStage = TOWN_TUTORIAL_STAGES.SELL;
assert.equal(
  returnTravel._hardcoreCostSuffix(15, "skyToDungeon", {
    pairData: tutorialPair,
  }),
  "",
  "an unused tutorial pass must not advertise a Hardcore cost",
);
const freeReturn = returnTravel._teleportToDungeonPair(tutorialPair, {
  kind: "skyToDungeon",
});
assert.equal(freeReturn.success, true);
assert.deepEqual(returnTarget, { tx: 12, ty: 79 });
assert.equal(returnPaymentAttempts, 0, "first paired return must be free during tutorial");
assert.equal(consumedTeleportPasses.has(
  TUTORIAL_FREE_TELEPORT_PASSES.EARLY_SKY_RETURN,
), true);
assert.match(
  returnTravel._hardcoreCostSuffix(15, "skyToDungeon", {
    pairData: tutorialPair,
  }),
  /HARDCORE COST 120 M/,
  "the cost prompt must return after the one-time pass is consumed",
);
assert.equal(returnTravel._teleportToDungeonPair(tutorialPair, {
  kind: "skyToDungeon",
}).success, false, "the early return pass cannot be reused");
assert.equal(returnPaymentAttempts, 1);

returnTravel.promptTile = { levelId: 1 };
returnTravel._hasUnlockedPortalForLevel = () => true;
returnTravel._findSafeStandingTile = () => ({ tx: 4, ty: 44 });
returnTarget = null;
containmentStage = TOWN_TUTORIAL_STAGES.RESUME;
const freeTownAscent = returnTravel._activateGroundTeleport();
assert.equal(freeTownAscent.success, true);
assert.deepEqual(returnTarget, { tx: 4, ty: 44 });
assert.equal(
  returnPaymentAttempts,
  1,
  "the first required Level-1 Town ascent must be free",
);
assert.equal(consumedTeleportPasses.has(
  TUTORIAL_FREE_TELEPORT_PASSES.GROUND_ASCENT,
), true);
assert.equal(returnTravel._activateGroundTeleport().success, false);
assert.equal(returnPaymentAttempts, 2, "the Town ascent pass cannot be reused");

returnTarget = null;
const freeResumeReturn = returnTravel._teleportToDungeonPair(tutorialPair, {
  kind: "skyToDungeon",
});
assert.equal(freeResumeReturn.success, true);
assert.deepEqual(returnTarget, { tx: 12, ty: 79 });
assert.equal(returnPaymentAttempts, 2);
assert.equal(consumedTeleportPasses.has(
  TUTORIAL_FREE_TELEPORT_PASSES.RESUME_RETURN,
), true, "the final required return has its own one-time pass");
assert.equal(returnTravel._teleportToDungeonPair(tutorialPair, {
  kind: "skyToDungeon",
}).success, false);
assert.equal(returnPaymentAttempts, 3, "the final return pass cannot be reused");

containmentStage = TOWN_TUTORIAL_STAGES.COMPLETE;
assert.equal(containment.isTutorialTeleportFree({
  pairData: tutorialPair,
  kind: "skyToDungeon",
}), false);
assert.match(
  returnTravel._hardcoreCostSuffix(15, "skyToDungeon", {
    pairData: tutorialPair,
  }),
  /HARDCORE COST 120 M/,
);
const paidAfterTutorial = returnTravel._teleportToDungeonPair(tutorialPair, {
  kind: "skyToDungeon",
});
assert.deepEqual(paidAfterTutorial, {
  success: false,
  reason: "hardcore-teleport-cost",
  cost: 120,
});
assert.equal(returnPaymentAttempts, 4);

const inputSource = await readFile(
  new URL("../world/playScene/PlayerInputHandler.js", import.meta.url),
  "utf8",
);
const updateSource = await readFile(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
assert.match(inputSource, /specialTileInteractBufferedUntilMs/);
assert.match(inputSource, /specialTileInteractBufferMs/);
assert.match(inputSource, /key\.on\("down", this\.interactBufferHandler\)/);
assert.match(updateSource, /consumeSpecialTileInteractInput\(\)/);
assert.match(updateSource, /shouldBlockDownwardMine\(targetTile\)/);
assert.doesNotMatch(
  updateSource,
  /JustDown\(keys\.interact\).*SPECIAL TILE/s,
);

console.log("Tutorial portal containment, ghost guide, and free E activation contract passed.");
