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
  BlendModes: {
    ADD: "ADD",
    SCREEN: "SCREEN",
  },
  Math: {
    FloatBetween(min, max) {
      return (min + max) / 2;
    },
  },
};

function createSceneHarness() {
  const images = [];
  const circles = [];
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
          setTint(tint) { this.tint = tint; return this; },
          setBlendMode(blendMode) { this.blendMode = blendMode; return this; },
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
      circle(x, y, radius, color, alpha) {
        const circle = {
          active: true,
          x,
          y,
          radius,
          color,
          alpha,
          scaleX: 1,
          scaleY: 1,
          setDepth() { return this; },
          setStrokeStyle(width, strokeColor, strokeAlpha) {
            this.strokeWidth = width;
            this.strokeColor = strokeColor;
            this.strokeAlpha = strokeAlpha;
            return this;
          },
          setBlendMode(blendMode) { this.blendMode = blendMode; return this; },
          destroy() { this.active = false; },
        };
        circles.push(circle);
        return circle;
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

  return { scene, images, circles, tweens };
}

const { scene, images, circles, tweens } = createSceneHarness();
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
assert.equal(images.length, 2, "the release should pair its collected star with one transient impact flash");
assert.equal(
  circles.length,
  1 + STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.trailCount,
  "the release should add one impact ring plus a bounded trail-mote sequence"
);
assert.equal(system.activeFloatingTexts.length, 1);

const releasedStar = images[0];
const impactFlash = images[1];
const motionTween = tweens.find((config) =>
  config.targets === releasedStar && Number.isFinite(config.y)
);
const flashInTween = tweens.find((config) =>
  config.targets === releasedStar && config.alpha === 1
);
const impactFlashTween = tweens.find((config) => config.targets === impactFlash);
const impactRingTween = tweens.find((config) => config.targets === circles[0]);
assert.ok(motionTween);
assert.ok(flashInTween);
assert.ok(impactFlashTween);
assert.ok(impactRingTween);
assert.equal(motionTween.duration, STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.durationMs);
assert.equal(
  motionTween.delay,
  STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.liftDelayMs
);
assert.ok(
  motionTween.y <= 700 - STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.riseMinPx,
  "the release visual should travel clearly and slowly upward"
);
assert.equal(motionTween.ease, "Sine.inOut");
assert.equal(typeof motionTween.onUpdate, "function", "the ascent should carry a gentle lateral sway");
assert.equal(
  impactFlashTween.duration,
  STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.impactFlashDurationMs
);
assert.ok(
  impactFlashTween.scaleX
    > releasedStar.scaleX,
  "the mined block should flash outward before the collected star rises"
);
assert.equal(
  impactRingTween.duration,
  STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.impactRingDurationMs
);
assert.ok(
  impactRingTween.scaleX >= STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.impactRingEndScale
);
const trailTweens = tweens.filter((config) => circles.slice(1).includes(config.targets));
assert.equal(
  trailTweens.length,
  STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.trailCount
);
assert.ok(
  trailTweens.every((config, index) =>
    config.delay
      === STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.liftDelayMs
        + index * STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.trailStepDelayMs
  ),
  "trail motes should release in a paced upward sequence"
);

flashInTween.onComplete();
const fadeOutTween = tweens.find((config) =>
  config.targets === releasedStar && config.alpha === 0
);
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
