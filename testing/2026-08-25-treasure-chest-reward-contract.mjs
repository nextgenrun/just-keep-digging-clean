import assert from "node:assert/strict";
import { SpecialTileSystem } from "../systems/mining/SpecialTileSystem.js";
import { AnimatedCacheVisualSystem } from
  "../systems/visual/AnimatedCacheVisualSystem.js";
import { hash01 } from "../values/deterministicMath.js";
import {
  INTERACTIVE_WORLD_STATES,
  getInteractiveWorldStateFrameName,
} from "../values/interactiveWorldStates.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { TREASURE_CHEST_CONFIG } from "../values/treasureChestConfig.js";

const seed = 78421;
let chestTx = 4;
const chestTy = 90;
while (
  hash01(
    chestTx,
    chestTy,
    seed,
    TREASURE_CHEST_CONFIG.deterministicSalt.star,
  ) >= TREASURE_CHEST_CONFIG.star.chance
) {
  chestTx += 1;
}

const chestKey = `${chestTx},${chestTy}`;
const rejectedKey = `${chestTx + 1},${chestTy}`;
const tileTypes = new Map([
  [chestKey, TILE_TYPES.CHEST],
  [rejectedKey, TILE_TYPES.CHEST],
]);
let wallet = 0;
let saveRequests = 0;
let uiConfirmCalls = 0;
const statusMessages = [];
const floatingMessages = [];
const recordedChests = [];

const worldModel = {
  config: { topAirRows: 65, seed },
  getTileType(tx, ty) {
    return tileTypes.get(`${tx},${ty}`) ?? TILE_TYPES.AIR;
  },
  applyDugTileKeys(keys) {
    for (const key of keys) tileTypes.set(key, TILE_TYPES.AIR);
    return keys.length;
  },
  tileToWorld(tx, ty) {
    return { x: tx * 94 + 47, y: ty * 94 + 47 };
  },
};

const scene = {
  time: { now: 1200 },
  upgradeSystem: {
    getMoney: () => wallet,
    addMoney(amount) {
      wallet += amount;
      return wallet;
    },
  },
  retentionProgressSystem: {
    recordChest: reward => recordedChests.push(reward),
  },
  worldRenderer: { applyTileUpdate() {} },
  hudSystem: {
    flashStatus(message, color, duration) {
      statusMessages.push({ message, color, duration });
    },
  },
  screenFlashSystem: { flashReward() {} },
  soundSystem: { playUiConfirm: () => { uiConfirmCalls += 1; } },
  queueDugTilesSave: () => { saveRequests += 1; },
};
const floatingTextSystem = {
  grantCollectedStar: () => ({ awarded: true }),
  showFloatingText(...args) {
    floatingMessages.push(args);
    return true;
  },
};
const chestSystem = Object.assign(Object.create(SpecialTileSystem.prototype), {
  scene,
  worldModel,
  floatingTextSystem,
  openedChestKeys: new Set(),
  chestEventHandler: null,
  promptText: { setVisible() {} },
  promptTile: {
    tx: chestTx,
    ty: chestTy,
    key: chestKey,
    type: "chest",
  },
});

const reward = chestSystem.handleInteract();
assert.equal(reward.success, true);
assert.equal(reward.type, "chest");
assert.ok(reward.money > 0);
assert.equal(reward.star, true);
assert.equal(wallet, reward.money);
assert.equal(reward.walletAfter, wallet);
assert.equal(tileTypes.get(chestKey), TILE_TYPES.AIR);
assert.equal(chestSystem.openedChestKeys.has(chestKey), true);
assert.deepEqual(recordedChests, [{ money: reward.money, star: true }]);
assert.equal(saveRequests, 1);
assert.equal(uiConfirmCalls, 1);
assert.equal(floatingMessages.length, 1);
assert.equal(floatingMessages[0][6], "status");
assert.match(floatingMessages[0][2], new RegExp(`\\+${reward.money.toLocaleString()}`));
assert.match(floatingMessages[0][2], /\+1 STAR/);
assert.deepEqual(statusMessages[0], {
  message: floatingMessages[0][2],
  color: TREASURE_CHEST_CONFIG.feedback.starColor,
  duration: TREASURE_CHEST_CONFIG.feedback.statusDurationMs,
});

chestSystem.promptTile = {
  tx: chestTx + 1,
  ty: chestTy,
  key: rejectedKey,
  type: "chest",
};
scene.upgradeSystem.addMoney = () => wallet;
const rejected = chestSystem.handleInteract();
assert.deepEqual(rejected, {
  success: false,
  reason: "chest-reward-rejected",
});
assert.equal(tileTypes.get(rejectedKey), TILE_TYPES.CHEST);
assert.equal(chestSystem.openedChestKeys.has(rejectedKey), false);
assert.equal(saveRequests, 1);

function imageStub() {
  return {
    frame: null,
    setOrigin() { return this; },
    setDepth() { return this; },
    setDisplaySize() { return this; },
    setAlpha() { return this; },
    setFrame(frame) { this.frame = frame; return this; },
    destroy() { this.destroyed = true; },
  };
}

let cacheType = TILE_TYPES.CHEST;
let cacheReady = false;
const cacheOpened = new Set();
const cacheImages = [];
const cacheWorld = {
  tileSize: 94,
  widthTiles: 30,
  depthTiles: 180,
  getTileType: (tx, ty) => (
    tx === 10 && ty === 80 ? cacheType : TILE_TYPES.AIR
  ),
};
const cacheScene = {
  specialTileSystem: { openedChestKeys: cacheOpened },
  cameras: {
    main: { worldView: { x: 600, y: 6800, width: 760, height: 760 } },
  },
  add: {
    image() {
      const image = imageStub();
      cacheImages.push(image);
      return image;
    },
  },
};
const cacheBank = {
  ensure: () => cacheReady,
  release: () => true,
};
const cacheSystem = new AnimatedCacheVisualSystem(
  cacheScene,
  cacheWorld,
  cacheBank,
);
const cachePlayer = { tx: 10, ty: 79 };

cacheSystem.update(0, cachePlayer);
cacheOpened.add("10,80");
cacheType = TILE_TYPES.AIR;
cacheSystem.update(10, cachePlayer);
cacheSystem.update(5000, cachePlayer);
assert.equal(cacheImages.length, 0);
assert.equal(cacheSystem.getSnapshot().animatingCaches, 1);

cacheReady = true;
const animationStartedAt = 6000;
cacheSystem.update(animationStartedAt, cachePlayer);
assert.equal(cacheImages.length, 1);
assert.equal(
  cacheImages[0].frame,
  getInteractiveWorldStateFrameName(
    INTERACTIVE_WORLD_STATES.states.activation[0].index,
  ),
);

const animationFinishedAt = animationStartedAt
  + INTERACTIVE_WORLD_STATES.states.activation.length
    * INTERACTIVE_WORLD_STATES.animatedCaches.activationFrameMs
  + INTERACTIVE_WORLD_STATES.animatedCaches.activeLoopDurationMs
  + INTERACTIVE_WORLD_STATES.animatedCaches.resolvedHoldMs
  + 1;
cacheSystem.update(animationFinishedAt, cachePlayer);
const resolvedFrame = getInteractiveWorldStateFrameName(
  INTERACTIVE_WORLD_STATES.states.resolved.index,
);
assert.equal(cacheImages[0].frame, resolvedFrame);
assert.equal(cacheSystem.getSnapshot().animatingCaches, 0);
cacheSystem.update(animationFinishedAt + 10000, cachePlayer);
assert.equal(cacheImages[0].frame, resolvedFrame);

console.log(JSON.stringify({
  pass: true,
  reward: {
    money: reward.money,
    star: reward.star,
    walletAfter: reward.walletAfter,
  },
  animation: "stream-ready activation -> persistent open resolved frame",
  rejectedPayoutPreservedChest: true,
}));
