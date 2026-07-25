import assert from "node:assert/strict";
import { FloatingTextSystem } from "../systems/visual/FloatingTextSystem.js";
import { STAR_CONSTELLATION_CONFIG } from "../values/starConstellations.js";

const storedValues = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storedValues.has(key) ? storedValues.get(key) : null;
  },
  setItem(key, value) {
    storedValues.set(key, String(value));
  },
};

globalThis.Phaser = {
  Math: {
    FloatBetween(min, max) {
      return (min + max) / 2;
    },
  },
};

function createSceneHarness() {
  const images = [];
  const tweens = [];

  const scene = {
    config: {},
    textures: { exists: () => true },
    add: {
      image(x, y, textureKey) {
        const image = {
          active: true,
          x,
          y,
          angle: 0,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          textureKey,
          setDepth() { return this; },
          setDisplaySize() { return this; },
          setAlpha(alpha) { this.alpha = alpha; return this; },
          setScale(scaleX, scaleY = scaleX) {
            this.scaleX = scaleX;
            this.scaleY = scaleY;
            return this;
          },
          destroy() { this.active = false; },
        };
        images.push(image);
        return image;
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

  return { scene, images, tweens };
}

const { scene, images, tweens } = createSceneHarness();
const system = new FloatingTextSystem(scene, 1);
system.releaseCollectedSkyStar(0, 500, 700, "dirt");

assert.deepEqual(
  JSON.parse(storedValues.get("dig-game-star-counts-slot-1")),
  { dirt: 1 },
  "collection progress should reach the UI immediately"
);
assert.equal(
  JSON.parse(storedValues.get("dig-game-star-rarity-counts-slot-1"))[0],
  1,
  "rarity badge progress should update immediately"
);
assert.equal(system._townStars.length, 0, "a collected star must not enter the persistent world pool");
assert.equal(images.length, 1, "the kill should create only one transient release visual");
assert.equal(system.activeFloatingTexts.length, 1);

const motionTween = tweens.find((config) => Number.isFinite(config.y));
const fadeInTween = tweens.find((config) => config.alpha === 1);
assert.ok(motionTween);
assert.ok(fadeInTween);
assert.equal(motionTween.duration, STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.durationMs);
assert.ok(motionTween.y < 700, "the release visual should flow upward");
assert.equal(motionTween.ease, "Sine.out");

fadeInTween.onComplete();
const fadeOutTween = tweens.find((config) => config.alpha === 0);
assert.ok(fadeOutTween);
assert.equal(fadeOutTween.ease, "Sine.in");
fadeOutTween.onComplete();
assert.equal(images[0].active, false, "the release visual should be destroyed after fading");
assert.equal(system.activeFloatingTexts.length, 0);

const imageCountBeforeUnlock = images.length;
let unlockedResource = null;
system.setConstellationUnlockedCallback((resourceType) => { unlockedResource = resourceType; });
system._unlockConstellation("dirt");
assert.equal(unlockedResource, "dirt", "the unlock should still notify the UI");
assert.equal(images.length, imageCountBeforeUnlock, "an unlock must not conjure world-space stars");
assert.equal(system._townStars.length, 0);

const restoredHarness = createSceneHarness();
const restoredSystem = new FloatingTextSystem(restoredHarness.scene, 1);
restoredSystem.ensureConstellationsLoaded();
assert.equal(restoredHarness.images.length, 0, "loading saved progress must remain UI-only");

console.log("sky star release smoke: PASS");
