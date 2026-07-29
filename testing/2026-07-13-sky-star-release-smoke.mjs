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
          setDisplaySize(width, height) {
            this.displayWidth = width;
            this.displayHeight = height;
            return this;
          },
          setAlpha(alpha) { this.alpha = alpha; return this; },
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
      circle() {
        throw new Error("Star Block release must not create Phaser circles");
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
assert.equal(
  images.length,
  3 + STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx.echoCount,
  "the release should use one core, one authored fracture, one authored pulse, and bounded image echoes"
);
assert.equal(system.activeFloatingTexts.length, 1);

const releaseFx = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx;
const releasedStar = images[0];
const sourceFracture = images[1];
const sourcePulse = images[2];
const echoes = images.slice(3);
assert.equal(releaseFx.artSource, "ImageGen");
assert.equal(releasedStar.textureKey, releaseFx.coreAssets[0].key);
assert.equal(releaseFx.startScale, 0.9);
assert.equal(releaseFx.flashScale, 1);
assert.equal(releasedStar.displayWidth, releaseFx.tileDisplaySizePx);
assert.equal(releasedStar.displayHeight, releaseFx.tileDisplaySizePx);
assert.equal(releasedStar.scaleX, releaseFx.startScale);
assert.equal(releasedStar.scaleY, releaseFx.startScale);
assert.equal(
  releaseFx.coreDisplaySizesPx[0],
  releaseFx.tileDisplaySizePx,
  "the release should derive from the same tile-calibrated source envelope"
);
assert.equal(sourceFracture.textureKey, releaseFx.fractureAssets[0].key);
assert.equal(sourcePulse.textureKey, "star-block-pulse-cyan-v1");
assert.ok(echoes.every(image => image.textureKey === releaseFx.coreAssets[0].key));
assert.ok(images.every(image => !Object.hasOwn(image, "tint")));

const motionTween = tweens.find((config) =>
  config.targets === releasedStar && Number.isFinite(config.y)
);
const flashInTween = tweens.find((config) =>
  config.targets === releasedStar && config.alpha === 1
);
const fractureTween = tweens.find((config) => config.targets === sourceFracture);
const pulseTween = tweens.find((config) => config.targets === sourcePulse);
assert.ok(motionTween);
assert.ok(flashInTween);
assert.equal(flashInTween.scaleX, 1);
assert.equal(flashInTween.scaleY, 1);
assert.ok(fractureTween);
assert.ok(pulseTween);
assert.ok(releaseFx.durationMs >= 10_500, "the selected release should levitate more slowly");
assert.ok(
  releaseFx.peakScale >= 1.4 && releaseFx.peakScale <= 1.5,
  "the selected release should grow while staying visually restrained"
);
assert.ok(releaseFx.echoCount >= 6, "the selected release should carry a heavy echo trail");
assert.equal(motionTween.duration, releaseFx.durationMs);
assert.equal(motionTween.delay, releaseFx.liftDelayMs);
assert.ok(
  motionTween.y <= 700 - releaseFx.riseMinPx,
  "the release visual should travel clearly and slowly upward"
);
assert.equal(motionTween.ease, "Sine.inOut");
assert.equal(typeof motionTween.onUpdate, "function", "the ascent should carry a gentle lateral sway");
assert.equal(
  fractureTween.duration,
  releaseFx.sourceFractureDurationMs
);
assert.ok(
  fractureTween.scaleX > sourceFracture.scaleX,
  "the authored fracture bloom should expand out of the mined block"
);
assert.equal(pulseTween.duration, releaseFx.sourcePulseDurationMs);
assert.ok(
  pulseTween.scaleX > sourcePulse.scaleX,
  "the authored pulse should expand smoothly behind the release"
);

const echoMotionTweens = echoes.map(echo =>
  tweens.find(config => config.targets === echo && Number.isFinite(config.y))
);
assert.equal(
  echoMotionTweens.filter(Boolean).length,
  releaseFx.echoCount
);
assert.ok(
  echoMotionTweens.every((config, index) =>
    config.delay
      === releaseFx.liftDelayMs
        + releaseFx.echoLeadDelayMs
        + index * releaseFx.echoStepDelayMs
  ),
  "authored star echoes should follow in a paced upward sequence"
);
assert.ok(
  echoMotionTweens.every((config, index) =>
    config.delay + config.duration === releaseFx.liftDelayMs + releaseFx.durationMs
  ),
  "all delayed echoes should resolve with the primary ascent"
);

flashInTween.onComplete();
const growthTween = tweens.find((config) =>
  config.targets === releasedStar
    && config.scaleX === releaseFx.peakScale
    && config.scaleY === releaseFx.peakScale
);
assert.ok(growthTween, "the tile-matched star should grow only after it begins lifting free");
assert.equal(growthTween.delay, releaseFx.growthDelayMs);
assert.equal(growthTween.duration, releaseFx.settleMs);
const fadeOutTween = tweens.find((config) =>
  config.targets === releasedStar && config.alpha === 0
);
assert.ok(fadeOutTween);
assert.equal(fadeOutTween.ease, "Sine.in");
fadeOutTween.onComplete();
assert.ok(images.every(image => image.active === false), "all release images should be destroyed after fading");
assert.equal(system.activeFloatingTexts.length, 0);
assert.equal(system._activeSkyStarReleaseViews.size, 0);

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
