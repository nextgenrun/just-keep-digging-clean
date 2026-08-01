import assert from "node:assert/strict";

import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../values/starIdentityLibrary.js";
import { getStarIdentity } from "../values/starIdentityLibraryMath.js";
import {
  playSkyStarReleaseIdentityLight,
} from "../systems/visual/playSkyStarReleaseIdentityLight.js";
import { STAR_CONSTELLATION_CONFIG } from "../values/starConstellations.js";

globalThis.Phaser = { BlendModes: { ADD: "ADD" } };

const identity = getStarIdentity(244);
const releaseFx = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx;
const visual = STAR_IDENTITY_LIBRARY_CONFIG.visual;
const tweens = [];
let destroyed = false;
let created = null;
const scene = {
  tweens: {
    add(config) {
      tweens.push(config);
      return config;
    },
  },
};
const createImage = (
  x,
  y,
  textureKey,
  depth,
  displaySize,
  alpha,
  blendMode,
  textureFrame,
) => {
  created = {
    x,
    y,
    textureKey,
    textureFrame,
    depth,
    displaySize,
    alpha,
    blendMode,
    scaleX: 1,
    scaleY: 1,
    setScale(scaleX, scaleY) {
      this.scaleX = scaleX;
      this.scaleY = scaleY;
      return this;
    },
  };
  return created;
};
const motion = {
  entry: {
    lightTextureKey: identity.lightAtlasKey,
    lightTextureFrame: identity.lightFrameName,
    displaySize: releaseFx.tileDisplaySizePx,
  },
  startWorldX: 470,
  startWorldY: 940,
  riseDistance: 420,
  lateralDrift: 20,
  rotation: 4,
  swayAmplitude: 18,
  swayCycles: 0.6,
  duration: releaseFx.durationMs,
};
const light = playSkyStarReleaseIdentityLight({
  scene,
  motion,
  releaseFx,
  createImage,
  destroyImage: image => {
    assert.equal(image, created);
    destroyed = true;
  },
});

assert.equal(light, created);
assert.equal(created.textureKey, identity.lightAtlasKey);
assert.equal(created.textureFrame, identity.lightFrameName);
assert.notEqual(created.textureKey, identity.atlasKey);
assert.equal(created.blendMode, Phaser.BlendModes.ADD);
assert.equal(
  created.displaySize,
  releaseFx.tileDisplaySizePx * visual.releaseLightDisplayScale,
);
assert.equal(tweens.length, 3);
assert.ok(tweens.every(tween => tween.repeat !== -1 && tween.loop !== true));

const motionTween = tweens.find(tween => Number.isFinite(tween.y));
const enterTween = tweens.find(tween => tween.alpha === visual.releaseLightAlpha);
const exitTween = tweens.find(tween => tween.alpha === 0);
assert.ok(motionTween);
assert.ok(enterTween);
assert.ok(exitTween);
assert.equal(motionTween.delay, releaseFx.liftDelayMs);
assert.equal(motionTween.duration, releaseFx.durationMs);
assert.equal(motionTween.y, motion.startWorldY - motion.riseDistance);
assert.equal(typeof motionTween.onUpdate, "function");
assert.equal(enterTween.duration, releaseFx.flashInMs);
assert.equal(
  exitTween.delay + exitTween.duration,
  releaseFx.liftDelayMs + releaseFx.durationMs,
);
assert.equal(Object.hasOwn(created, "tint"), false);
exitTween.onComplete();
assert.equal(destroyed, true);

console.log(
  "star identity release light smoke: PASS "
  + "(exact frame follows core with bounded three-tween lifecycle)",
);
