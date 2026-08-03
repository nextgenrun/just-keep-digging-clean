import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ANIMATION_SMOOTHNESS_CONFIG } from "../values/animationSmoothness.js";
import {
  frameRateIndependentResponse,
  frameRateIndependentStepCount,
} from "../values/mathUtils.js";
import BiomeSystem from "../systems/environment/BiomeSystem.js";
import { GroundEffectsAtmosphere } from "../systems/environment/GroundEffectsAtmosphere.js";
import { LootPickupFxSystem } from "../systems/visual/LootPickupFxSystem.js";
import { PostFxSystem } from "../systems/visual/PostFxSystem.js";

const timing = ANIMATION_SMOOTHNESS_CONFIG;
const approximatelyEqual = (left, right, epsilon = 1e-9) => (
  Math.abs(left - right) <= epsilon
);

function simulateResponse(fps, responsePerFrame) {
  const deltaMs = 1000 / fps;
  let value = 0;
  for (let frame = 0; frame < fps; frame += 1) {
    value += (1 - value) * frameRateIndependentResponse(
      responsePerFrame,
      deltaMs,
      timing.referenceFrameMs,
      timing.maxCatchUpSteps,
    );
  }
  return value;
}

const response30 = simulateResponse(30, timing.biome.blendResponsePerReferenceFrame);
const response60 = simulateResponse(60, timing.biome.blendResponsePerReferenceFrame);
const response120 = simulateResponse(120, timing.biome.blendResponsePerReferenceFrame);
assert.ok(approximatelyEqual(response30, response60));
assert.ok(approximatelyEqual(response60, response120));
assert.equal(
  frameRateIndependentStepCount(
    1000,
    timing.referenceFrameMs,
    timing.maxCatchUpSteps,
  ),
  timing.maxCatchUpSteps,
  "large frame gaps must stay bounded",
);

function createOverlay() {
  return {
    active: true,
    alpha: 0,
    fillAlpha: 0,
    setScrollFactor() { return this; },
    setDepth() { return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setFillStyle(color, alpha) {
      this.fillColor = color;
      this.fillAlpha = alpha;
      return this;
    },
    destroy() { this.active = false; },
  };
}

function simulateBiome(fps) {
  const scene = {
    cameras: { main: { width: 1280, height: 720 } },
    game: { loop: { delta: 1000 / fps } },
    add: { rectangle: () => createOverlay() },
  };
  const system = new BiomeSystem(scene, {}, null);
  for (let frame = 0; frame < fps; frame += 1) {
    system.update(600);
  }
  return system._currentAlpha;
}

const biome30 = simulateBiome(30);
const biome60 = simulateBiome(60);
const biome120 = simulateBiome(120);
assert.ok(approximatelyEqual(biome30, biome60));
assert.ok(approximatelyEqual(biome60, biome120));

function createParticleSprite(x = 0, alpha = 0) {
  return {
    x,
    y: 0,
    alpha,
    setAlpha(value) { this.alpha = value; return this; },
    setPosition(nextX, nextY) {
      this.x = nextX;
      this.y = nextY;
      return this;
    },
    destroy() {},
  };
}

function simulateGroundMist(fps) {
  const system = Object.create(GroundEffectsAtmosphere.prototype);
  const sprite = createParticleSprite();
  system.config = { tileSize: 94, topAirRows: 65 };
  system._elapsedMs = 0;
  system._windTimer = 0;
  system.mistParticles = [{
    sprite,
    speed: 12,
    alpha: 0,
    targetAlpha: 0,
    maxAlpha: 1,
  }];
  system.fireflies = [];
  system.windParticles = [];
  for (let frame = 0; frame < fps; frame += 1) {
    system.update(1000 / fps, "dawn", 0, 0);
  }
  return { alpha: system.mistParticles[0].alpha, x: sprite.x };
}

const mist30 = simulateGroundMist(30);
const mist60 = simulateGroundMist(60);
const mist120 = simulateGroundMist(120);
assert.ok(approximatelyEqual(mist30.alpha, mist60.alpha));
assert.ok(approximatelyEqual(mist60.alpha, mist120.alpha));
assert.ok(approximatelyEqual(mist30.x, mist60.x));
assert.ok(approximatelyEqual(mist60.x, mist120.x));

function simulateLootRotation(sampleCount) {
  let tweenConfig = null;
  const scene = {
    tweens: {
      add(config) {
        tweenConfig = config;
        return config;
      },
    },
  };
  const system = new LootPickupFxSystem(scene);
  const sprite = {
    active: true,
    x: 10,
    y: 20,
    alpha: 1,
    rotation: 0.2,
    setScale(value) { this.scale = value; return this; },
  };
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    system._flyToTarget(sprite, { x: 180, y: 90 }, "stone", false, false);
  } finally {
    Math.random = originalRandom;
  }
  assert.ok(tweenConfig, "loot flight tween should be created");
  for (let sample = 0; sample <= sampleCount; sample += 1) {
    tweenConfig.targets.t = sample / sampleCount;
    tweenConfig.onUpdate();
  }
  return sprite.rotation;
}

const lootRotationLowSamples = simulateLootRotation(8);
const lootRotationHighSamples = simulateLootRotation(120);
assert.ok(approximatelyEqual(lootRotationLowSamples, lootRotationHighSamples));

function createPostFxSystem() {
  const scene = {
    config: { tileSize: 1, topAirRows: 0 },
    player: { y: 10 },
    game: { loop: { actualFps: 60 } },
  };
  const config = {
    enabled: true,
    updateIntervalMs: 200,
    lerpFactor: 0.12,
    disableBelowFps: 0,
    lowFpsChecksToDisable: 4,
    depth: { startMeters: 0, fullMeters: 10 },
    vignette: { enabled: false },
    grading: { enabled: false },
  };
  const system = new PostFxSystem(scene, config);
  system.available = true;
  system._lastUpdateAt = 100;
  system._apply = () => {};
  return system;
}

const regularPostFx = createPostFxSystem();
regularPostFx._tick(300);
regularPostFx._tick(500);
regularPostFx._tick(700);
const delayedPostFx = createPostFxSystem();
delayedPostFx._tick(700);
assert.ok(approximatelyEqual(regularPostFx._depthBlend, delayedPostFx._depthBlend));
const initialPostFx = createPostFxSystem();
initialPostFx._lastUpdateAt = 0;
initialPostFx._tick(16);
assert.equal(initialPostFx._depthBlend, 0, "first PostFX interval must retain its delay");
initialPostFx._tick(200);
assert.ok(initialPostFx._depthBlend > 0);

const [groundSource, lootSource, floatingTextSource] = await Promise.all([
  readFile(new URL("../systems/environment/GroundEffectsAtmosphere.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/LootPickupFxSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/FloatingTextSystem.js", import.meta.url), "utf8"),
]);
assert.doesNotMatch(groundSource, /Date\.now\(\)/);
assert.doesNotMatch(lootSource, /sprite\.rotation\s*\+=/);
assert.doesNotMatch(floatingTextSource, /star\.angle\s*\+=/);

console.log(JSON.stringify({
  result: "ANIMATION_FRAME_PACING_CONTRACT_OK",
  comparedFps: [30, 60, 120],
  boundedCatchUpSteps: timing.maxCatchUpSteps,
  lootRotationRadians: Number(lootRotationLowSamples.toFixed(6)),
  postFxDepthBlend: Number(regularPostFx._depthBlend.toFixed(6)),
}, null, 2));
