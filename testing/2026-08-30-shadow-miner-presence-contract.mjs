import assert from "node:assert/strict";

import { SHADOW_MINER_CONFIG } from "../values/shadowMiner.js";
import {
  ShadowMinerPhantomDigView,
  resolveShadowMinerDigStage,
  resolveShadowMinerDigTargetOffset,
} from "../world/playScene/ShadowMinerPhantomDigView.js";
import { playShadowMinerArrivalAwareness } from
  "../world/playScene/shadowMinerArrivalAwareness.js";
import { stageShadowMinerReplayChamber } from "./JkdE2EShadowMinerPreview.js";

class FakeImage {
  constructor(x, y, key, frame = null) {
    this.x = x;
    this.y = y;
    this.texture = typeof key === "object" ? key : { key };
    this.frame = { name: frame };
    this.scaleX = 1;
    this.scaleY = 1;
    this.alpha = 1;
    this.active = true;
  }

  setOrigin() { return this; }
  setDepth() { return this; }
  setTint() { return this; }
  setTintFill() { return this; }
  setBlendMode() { return this; }
  setRotation(value) { this.rotation = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setTexture(key, frame = null) {
    this.texture.key = key;
    this.frame.name = frame;
    return this;
  }
  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }
  destroy() { this.active = false; }
}

function makeScene() {
  const images = [];
  const mutations = { damage: 0, save: 0 };
  return {
    images,
    mutations,
    time: { now: 1_000 },
    config: { tileSize: 64 },
    textures: { exists: () => true },
    add: {
      image(x, y, key, frame) {
        const image = new FakeImage(x, y, key, frame);
        images.push(image);
        return image;
      },
    },
    worldModel: { damageTile() { mutations.damage += 1; } },
    queueDugTilesSave() { mutations.save += 1; },
  };
}

const recorded = resolveShadowMinerDigTargetOffset({
  actionTargetOffsetX: -1,
  actionTargetOffsetY: 1,
});
assert.deepEqual(recorded, { x: -1, y: 1, source: "recorded-target" });
assert.deepEqual(
  resolveShadowMinerDigTargetOffset({ animationKey: "player-dig-down", flipX: false }),
  { x: 0, y: 1, source: "animation" },
);
assert.deepEqual(
  resolveShadowMinerDigTargetOffset({ animationKey: "player-dig-side", flipX: true }),
  { x: -1, y: 0, source: "facing" },
);
assert.equal(resolveShadowMinerDigStage(0, SHADOW_MINER_CONFIG.visual.phantomDig), 0);
assert.equal(resolveShadowMinerDigStage(110, SHADOW_MINER_CONFIG.visual.phantomDig), 1);
assert.equal(resolveShadowMinerDigStage(9_000, SHADOW_MINER_CONFIG.visual.phantomDig), 4);

const scene = makeScene();
const view = new ShadowMinerPhantomDigView(scene, SHADOW_MINER_CONFIG);
const digPose = {
  action: true,
  animationKey: "player-dig-down",
  actionTargetOffsetX: 0,
  actionTargetOffsetY: 1,
  x: 100,
  y: 512,
  tileX: 1,
  tileY: 8,
};
assert.equal(view.applyPose(digPose, 1_000), true);
let snapshot = view.getSnapshot();
assert.equal(snapshot.activeBlock, true);
assert.equal(snapshot.targetSource, "recorded-target");
assert.equal(snapshot.blockArtSource, "dedicated-project-art");
assert.equal(
  snapshot.textureKey,
  SHADOW_MINER_CONFIG.visual.phantomDig
    .stageTextureKeysByTileType[snapshot.lastAttemptTileType],
);
assert.deepEqual(snapshot.target, { x: 100, y: 544 });
assert.equal(scene.images[0].displayWidth, 64 * SHADOW_MINER_CONFIG.visual.phantomDig.displayTiles);
const initialRenderIndex = snapshot.renderIndex;
view.update(1_120);
snapshot = view.getSnapshot();
assert.equal(snapshot.stageIndex, 1);
assert.notEqual(
  snapshot.renderIndex,
  initialRenderIndex,
  "the dedicated authored crack overlay advances",
);
view.update(1_600);
snapshot = view.getSnapshot();
assert.equal(snapshot.activeBlock, false);
assert.equal(snapshot.breakCount, 1);
assert.ok(
  scene.images.some(image => image.texture.key
    === SHADOW_MINER_CONFIG.visual.phantomDig.breakCoreTextureKey),
  "the authored tile-break core is used",
);
assert.ok(
  scene.images.some(image => image.texture.key
    === SHADOW_MINER_CONFIG.visual.phantomDig.breakShardTextureKey),
  "the authored tile-break shards are used",
);
assert.equal(view.applyPose(digPose, 1_700), false, "one block is owned per action beat");
view.applyPose({ ...digPose, action: false }, 1_750);
assert.equal(view.applyPose(digPose, 1_800), true, "a later dig action owns a fresh block");
assert.deepEqual(scene.mutations, { damage: 0, save: 0 });
view.destroy();

const flashCalls = [];
const statusCalls = [];
const awareness = playShadowMinerArrivalAwareness({
  time: { now: 2_000 },
  player: { x: 300 },
  screenFlashSystem: { flashCustom: (...args) => flashCalls.push(args) },
  hudSystem: { flashStatus: (...args) => statusCalls.push(args) },
}, SHADOW_MINER_CONFIG, { x: 100 }, 1.2);
assert.equal(awareness.direction, "left");
assert.ok(awareness.flashAlpha >= SHADOW_MINER_CONFIG.visual.awareness.flashAlpha);
assert.ok(awareness.flashAlpha <= SHADOW_MINER_CONFIG.visual.awareness.flashMaximumAlpha);
assert.equal(flashCalls.length, 1);
assert.equal(statusCalls.length, 1);
assert.match(statusCalls[0][0], /^◀/);
assert.match(statusCalls[0][0], /SHADOW MINER NEARBY/);

const labels = [];
const labelTweens = [];
const labelTimers = [];
const screenAwareness = playShadowMinerArrivalAwareness({
  scale: { width: 1_920 },
  time: {
    now: 2_100,
    delayedCall: (delay, callback) => labelTimers.push({ delay, callback }),
  },
  player: { x: 100 },
  screenFlashSystem: { flashCustom() {} },
  add: {
    text(x, y, text, style) {
      const label = {
        active: true,
        x,
        y,
        text,
        style,
        setOrigin() { return this; },
        setScrollFactor() { return this; },
        setDepth() { return this; },
        setAlpha() { return this; },
        setScale() { return this; },
        setLetterSpacing() { return this; },
        destroy() { this.active = false; },
      };
      labels.push(label);
      return label;
    },
  },
  tweens: { add: config => labelTweens.push(config) },
}, SHADOW_MINER_CONFIG, { x: 400 }, 1);
assert.equal(screenAwareness.direction, "right");
assert.equal(screenAwareness.labelCreated, true);
assert.equal(labels.length, 1);
assert.match(labels[0].text, /SHADOW MINER NEARBY.*▶$/);
assert.equal(labelTweens.length, 1);
assert.equal(labelTimers.length, 1);

const previewTiles = new Map();
const previewWorld = {
  depthTiles: 20,
  dugTiles: new Map([["2,8", { tileX: 2, tileY: 8, dugAt: 123 }]]),
  rubbleTiles: new Map([["2,8", { tx: 2, ty: 8, type: 11, hp: 3 }]]),
  dugTileSource: new Map([["2,8", "contract-source"]]),
  inBounds: (tx, ty) => tx >= 0 && tx < 20 && ty >= 0 && ty < 20,
  getTileType: (tx, ty) => previewTiles.get(`${tx},${ty}`)?.type ?? 9,
  getTileHp: (tx, ty) => previewTiles.get(`${tx},${ty}`)?.hp ?? 7,
  getTileMaxHp: () => 15,
  setTile(tx, ty, type, hp) {
    const key = `${tx},${ty}`;
    previewTiles.set(key, { type, hp });
    this.rubbleTiles.delete(key);
    if (type !== 0) this.dugTiles.delete(key);
  },
};
const originalFloor = { type: 21, hp: 4 };
previewTiles.set("2,8", originalFloor);
const previewRendererUpdates = [];
const chamber = stageShadowMinerReplayChamber({
  config: { topAirRows: 2 },
  worldRenderer: {
    applyTileUpdate: (tx, ty) => previewRendererUpdates.push(`${tx},${ty}`),
    invalidate() {},
  },
}, previewWorld, {
  preview: {
    depthOffsetTiles: 5,
    anchorTileX: 3,
    trailDistanceTiles: 2,
    chamberPaddingTiles: 1,
    chamberAirRows: 2,
  },
});
assert.notDeepEqual(previewTiles.get("2,8"), originalFloor);
assert.equal(previewWorld.rubbleTiles.has("2,8"), false);
chamber.restore();
assert.deepEqual(previewTiles.get("2,8"), originalFloor);
assert.deepEqual(previewWorld.dugTiles.get("2,8"), { tileX: 2, tileY: 8, dugAt: 123 });
assert.deepEqual(previewWorld.rubbleTiles.get("2,8"), { tx: 2, ty: 8, type: 11, hp: 3 });
assert.equal(previewWorld.dugTileSource.get("2,8"), "contract-source");
assert.ok(previewRendererUpdates.length > 0);

console.log(
  "shadow miner presence contract: recorded dig targets, authored purple crack/break art, one block per action, hard visual-only authority, one-shot directional awareness, and preview tile restoration passed",
);
