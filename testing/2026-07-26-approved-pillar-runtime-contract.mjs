import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  PILLAR_VISUAL_CONFIG,
  resolvePillarStageIndex,
  resolveStarSocketProgress,
} from "../values/pillarVisuals.js";
import { StarPillarWorldVisual } from "../systems/visual/StarPillarWorldVisual.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const ASSET_ROOT = path.join(ROOT, PILLAR_VISUAL_CONFIG.assetBasePath);
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(ASSET_ROOT, "manifest.json"), "utf8"),
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function inspectPng(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25],
    sha256: crypto.createHash("sha256").update(data).digest("hex"),
  };
}

assert.equal(MANIFEST.productionChanged, true);
for (const pillarName of ["milestone", "star"]) {
  const pillar = MANIFEST.pillars[pillarName];
  assert.equal(pillar.approvalPixelMatchVerified, true);
  assert.match(pillar.approvedPixelSha256, /^[a-f0-9]{64}$/);
  assert.equal(pillar.stages.length, 5);
  let previousHeight = 0;
  for (const stage of pillar.stages) {
    const info = inspectPng(path.join(ASSET_ROOT, stage.file));
    assert.equal(info.colorType, 6, `${stage.file} must retain RGBA transparency`);
    assert.deepEqual([info.width, info.height], [stage.width, stage.height]);
    assert.equal(info.sha256, stage.sha256);
    assert.ok(stage.height > previousHeight, `${pillarName} must grow every stage`);
    previousHeight = stage.height;
  }
}

assert.equal(ASSET_KEYS.environment.pillars.milestoneStages.length, 5);
assert.equal(ASSET_KEYS.environment.pillars.starStages.length, 5);
assert.deepEqual(PILLAR_VISUAL_CONFIG.milestone.stageDepths, [0, 500, 1000, 1500, 2000]);
assert.deepEqual(PILLAR_VISUAL_CONFIG.star.stageUnlockThresholds, [0, 1, 3, 5, 7]);
assert.ok(PILLAR_VISUAL_CONFIG.milestone.promptFontSizePx >= 14);
assert.ok(PILLAR_VISUAL_CONFIG.star.promptFontSizePx >= 16);
assert.ok(
  PILLAR_VISUAL_CONFIG.star.maxHeightPx <= 260,
  "the fully awakened Sky Island pillar must fit below the top HUD at the clamped sky camera",
);

assert.equal(resolvePillarStageIndex(0, PILLAR_VISUAL_CONFIG.milestone.stageDepths), 0);
assert.equal(resolvePillarStageIndex(499, PILLAR_VISUAL_CONFIG.milestone.stageDepths), 0);
assert.equal(resolvePillarStageIndex(500, PILLAR_VISUAL_CONFIG.milestone.stageDepths), 1);
assert.equal(resolvePillarStageIndex(2000, PILLAR_VISUAL_CONFIG.milestone.stageDepths), 4);

const expectedSockets = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
expectedSockets.forEach((filledSockets, unlockedCount) => {
  assert.equal(resolveStarSocketProgress(unlockedCount).filledSockets, filledSockets);
});
assert.deepEqual(
  PILLAR_VISUAL_CONFIG.star.socketStages.map((anchors) => anchors.length),
  [1, 1, 3, 3, 5],
);
for (const anchors of PILLAR_VISUAL_CONFIG.star.socketStages) {
  for (const anchor of anchors) {
    assert.ok(anchor.x > 0 && anchor.x < 1);
    assert.ok(anchor.y > 0 && anchor.y < 1);
    assert.ok(anchor.diameter > 0 && anchor.diameter < 0.3);
  }
}

const bootSource = read("ui/scenes/BootScene.js");
assert.match(bootSource, /preloadPillarSprites\(\)/);
assert.match(bootSource, /ASSET_KEYS\.environment\.pillars/);
assert.match(bootSource, /PILLAR_VISUAL_CONFIG\.assetBasePath/);

const milestoneSource = read("systems/visual/MilestoneBoardSystem.js");
assert.match(milestoneSource, /ProgressivePillarSprite/);
assert.match(milestoneSource, /environment\.pillars\.milestoneStages/);
assert.match(milestoneSource, /retentionProgressSystem\?\.getBestDepth/);
assert.doesNotMatch(milestoneSource, /fillRoundedRect|fillRect|_boardGfx/);

const starSystemSource = read("systems/visual/StarPillarSystem.js");
const worldVisualSource = read("systems/visual/StarPillarWorldVisual.js");
const e2eHarnessSource = read("testing/JkdE2EHarness.js");
assert.match(starSystemSource, /StarPillarWorldVisual/);
assert.match(starSystemSource, /environment\.pillars\.starStages/);
assert.match(worldVisualSource, /starCoreTextureKey|starHaloTextureKey|resolveStarSocketProgress/);
assert.match(worldVisualSource, /BlendModes\?\.(?:ADD|SCREEN)/);
assert.match(worldVisualSource, /repeat:\s*-1/);
assert.doesNotMatch(worldVisualSource, /localStorage|releaseCollectedSkyStar|_townStars/);
assert.match(starSystemSource, /previewWorldProgress\(unlockedCount\)/);
assert.match(e2eHarnessSource, /STAR_PILLAR_PREVIEW_COUNTS/);
assert.match(e2eHarnessSource, /previewWorldProgress/);

globalThis.Phaser = {
  BlendModes: { ADD: "ADD", SCREEN: "SCREEN" },
  Math: {
    Clamp(value, minimum, maximum) {
      return Math.min(maximum, Math.max(minimum, value));
    },
  },
};

const stageDimensions = new Map();
ASSET_KEYS.environment.pillars.starStages.forEach((key, index) => {
  const stage = MANIFEST.pillars.star.stages[index];
  stageDimensions.set(key, { width: stage.width, height: stage.height });
});
stageDimensions.set(ASSET_KEYS.celestialEngines.starHeart, { width: 512, height: 512 });
stageDimensions.set(ASSET_KEYS.celestialEngines.waywardStar, { width: 512, height: 512 });

function makeDisplayObject(x, y, width = 1, height = 1) {
  return {
    active: true,
    x,
    y,
    width,
    height,
    displayWidth: width,
    displayHeight: height,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    setOrigin() { return this; },
    setDepth() { return this; },
    setBlendMode(mode) { this.blendMode = mode; return this; },
    setAlpha(alpha) { this.alpha = alpha; return this; },
    setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
    setScale(scaleX, scaleY = scaleX) {
      this.scaleX = scaleX;
      this.scaleY = scaleY;
      this.displayWidth = this.width * scaleX;
      this.displayHeight = this.height * scaleY;
      return this;
    },
    setDisplaySize(nextWidth, nextHeight) {
      this.displayWidth = nextWidth;
      this.displayHeight = nextHeight;
      this.scaleX = nextWidth / this.width;
      this.scaleY = nextHeight / this.height;
      return this;
    },
    setTexture(key) {
      this.textureKey = key;
      const size = stageDimensions.get(key);
      this.width = size.width;
      this.height = size.height;
      return this;
    },
    destroy() { this.active = false; },
  };
}

const created = [];
const tweens = [];
const scene = {
  textures: {
    get(key) {
      const size = stageDimensions.get(key);
      return { getSourceImage: () => size };
    },
  },
  add: {
    image(x, y, key) {
      const size = stageDimensions.get(key);
      const object = makeDisplayObject(x, y, size.width, size.height);
      object.textureKey = key;
      created.push(object);
      return object;
    },
    ellipse(x, y, width, height) {
      const object = makeDisplayObject(x, y, width, height);
      created.push(object);
      return object;
    },
    rectangle(x, y, width, height) {
      const object = makeDisplayObject(x, y, width, height);
      created.push(object);
      return object;
    },
  },
  tweens: {
    add(config) {
      tweens.push(config);
      return { stop() {} };
    },
    killTweensOf() {},
  },
};

const visual = new StarPillarWorldVisual(
  scene,
  1000,
  2000,
  ASSET_KEYS.environment.pillars.starStages,
  ASSET_KEYS.celestialEngines.waywardStar,
  ASSET_KEYS.celestialEngines.starHeart,
  PILLAR_VISUAL_CONFIG.star,
).create(0);
assert.equal(visual.pillar.stageIndex, 0);
assert.equal(visual.socketStars.length, 0);

for (const [unlockedCount, expectedStage, expectedFilled] of [
  [1, 1, 1],
  [3, 2, 2],
  [5, 3, 3],
  [7, 4, 4],
  [9, 4, 5],
  [10, 4, 5],
]) {
  visual.syncUnlocked(unlockedCount, true);
  assert.equal(visual.pillar.stageIndex, expectedStage);
  assert.equal(visual.socketStars.length, expectedFilled);
}
assert.equal(visual.socketStars.at(-1).strength, 2);
assert.ok(visual.socketStars.every((socket) => socket.core.blendMode === "SCREEN"));
assert.ok(visual.socketStars.every((socket) => socket.halo.blendMode === "ADD"));
assert.ok(
  visual.socketStars.every(
    (socket) => socket.core.textureKey === ASSET_KEYS.celestialEngines.waywardStar,
  ),
);
assert.ok(
  visual.socketStars.every(
    (socket) => socket.halo.textureKey === ASSET_KEYS.celestialEngines.starHeart,
  ),
);
assert.ok(tweens.some((tween) => tween.repeat === -1), "socket stars must pulse");
assert.ok(
  tweens.some((tween) => tween.targets?.height === PILLAR_VISUAL_CONFIG.star.unlockBeamHeightPx),
  "new constellation progress must emit an unlock beam",
);

visual.destroy();
assert.ok(visual.socketStars.length === 0);

console.log(
  "approved pillar runtime contract: PASS "
  + "(10 exact RGBA stages, depth growth, socket mapping, glow pulse, no world-star persistence)",
);
