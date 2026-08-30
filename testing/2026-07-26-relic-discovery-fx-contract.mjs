import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { DigSystem } from "../systems/mining/DigSystem.js";
import { AncientRelicSystem } from "../systems/progression/AncientRelicSystem.js";
import { RelicDiscoveryFxSystem } from "../systems/visual/RelicDiscoveryFxSystem.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  GAMEPLAY_PROFILE_IDS,
  createGameplayCapabilities,
} from "../values/gameplayCapabilities.js";
import { RELIC_DISCOVERY_FX_CONFIG } from "../values/relicDiscoveryFxConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { queueCapabilityUiAssets } from
  "../ui/scenes/BootCapabilityAssetPreloader.js";

function createDisplayObject(type, values = {}) {
  return {
    type,
    active: true,
    visible: true,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    destroyed: false,
    ...values,
    setAlpha(value) { this.alpha = value; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    setDepth(value) { this.depth = value; return this; },
    setDisplaySize(width, height) {
      this.displayWidth = width;
      this.displayHeight = height;
      return this;
    },
    setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setScrollFactor(value) { this.scrollFactor = value; return this; },
    setStrokeStyle(width, color, alpha) {
      this.stroke = { width, color, alpha };
      return this;
    },
    destroy() { this.destroyed = true; this.active = false; },
  };
}

function createScene() {
  const objects = [];
  const tweens = [];
  const add = (type, values) => {
    const object = createDisplayObject(type, values);
    objects.push(object);
    return object;
  };
  return {
    objects,
    tweenConfigs: tweens,
    scale: { width: 1280, height: 720 },
    cameras: {
      main: {
        scrollX: 10,
        scrollY: 20,
        zoom: 2,
        x: 3,
        y: 4,
        worldView: { x: 0, y: 0, width: 640, height: 360 },
      },
    },
    add: {
      circle: (x, y, radius, color, alpha) => add(
        "circle",
        { x, y, radius, color, alpha },
      ),
      rectangle: (x, y, width, height, color, alpha) => add(
        "rectangle",
        { x, y, width, height, color, alpha },
      ),
      ellipse: (x, y, width, height, color, alpha) => add(
        "ellipse",
        { x, y, width, height, color, alpha },
      ),
      image: (x, y, key, frame) => add("image", { x, y, key, frame }),
      text: (x, y, text, style) => add("text", { x, y, text, style }),
    },
    tweens: {
      add(config) {
        const tween = {
          config,
          stopped: false,
          removed: false,
          stop() { this.stopped = true; },
          remove() { this.removed = true; },
        };
        tweens.push(config);
        return tween;
      },
    },
  };
}

const fullScene = createScene();
const collector = { x: 170, y: 140 };
const fullSystem = new RelicDiscoveryFxSystem(fullScene, {
  reducedMotion: false,
  targetProvider: () => collector,
});
const anchor = { x: 50, y: 80, space: "world" };
const relicState = { count: 3 };

assert.equal(
  fullSystem.playDiscovery({
    anchor,
    iconAsset: { key: "ancient-relic-icon", frame: 7 },
    relicCount: relicState.count,
  }),
  true,
  "a valid discovery must start synchronously",
);
assert.equal(relicState.count, 3, "presentation must not mutate authoritative relic state");
assert.equal(fullSystem.getActiveSequenceCount(), 1);

const fullMode = RELIC_DISCOVERY_FX_CONFIG.modes.full;
const initialCircles = fullScene.objects.filter((object) => object.type === "circle");
const initialRectangles = fullScene.objects.filter((object) => object.type === "rectangle");
const floorMark = fullScene.objects.find((object) => object.type === "ellipse");
const token = fullScene.objects.find((object) => object.type === "image");
assert.equal(
  initialCircles.length,
  fullMode.ringCount + fullMode.particleCount,
  "full discovery must include its bounded rings and particles",
);
assert.equal(
  initialRectangles.length,
  1 + fullMode.rayCount,
  "full discovery must include one flash and its bounded ray fan",
);
assert.ok(floorMark, "a visible relic wake must leave a bounded world-space floor mark");
assert.equal(floorMark.scrollFactor, 1);
assert.deepEqual(
  {
    x: token.x,
    y: token.y,
    key: token.key,
    frame: token.frame,
    scrollFactor: token.scrollFactor,
  },
  {
    x: 50,
    y: 80,
    key: "ancient-relic-icon",
    frame: 7,
    scrollFactor: 1,
  },
  "the visible world anchor and atlas frame must create a world-space token",
);

const popTween = fullScene.tweenConfigs.find(
  (tween) => tween.targets === token && typeof tween.onComplete === "function",
);
popTween.onComplete();
const flightTween = fullScene.tweenConfigs.find(
  (tween) => tween.targets?.progress === 0 && typeof tween.onUpdate === "function",
);
assert.ok(flightTween, "full discovery must schedule a token flight");
collector.x = 205;
collector.y = 155;
flightTween.targets.progress = 1;
flightTween.onUpdate();
assert.ok(
  Math.abs(token.x - collector.x) < 0.000001
    && Math.abs(token.y - collector.y) < 0.000001,
  "the orbiting token must finish at the live player collector position",
);
flightTween.onComplete();
assert.equal(token.destroyed, true, "world token must be released on player arrival");

const countLabel = fullScene.objects.find((object) => object.type === "text");
assert.match(countLabel.text, /ANCIENT RELIC/);
assert.match(countLabel.text, /RELICS\s+3/);
assert.equal(countLabel.scrollFactor, 1);
assert.equal(countLabel.x, collector.x);
const revealTween = fullScene.tweenConfigs.find(
  (tween) => tween.targets === countLabel && tween.alpha === 1,
);
revealTween.onComplete();
const fadeTween = fullScene.tweenConfigs.find(
  (tween) => tween.targets === countLabel && tween.alpha === 0,
);
fadeTween.onComplete();
assert.equal(fullSystem.getActiveSequenceCount(), 0);
assert.ok(
  fullScene.objects.every((object) => object.destroyed),
  "natural completion must release every transient display object",
);

const lowScene = createScene();
const lowCollector = { x: 300, y: 120 };
const lowSystem = new RelicDiscoveryFxSystem(lowScene, {
  lowFx: true,
  reducedMotion: false,
});
assert.equal(lowSystem.playDiscovery({
  anchor: { x: 200, y: 160, space: "screen" },
  iconAsset: "ancient-relic-icon",
  collectorTarget: lowCollector,
  relicCount: 4,
}), true);
const lowToken = lowScene.objects.find((object) => object.type === "image");
assert.deepEqual(
  { x: lowToken.x, y: lowToken.y },
  { x: 108.5, y: 98 },
  "explicit screen anchors must be converted back into the camera's world space",
);
assert.equal(
  lowScene.objects.filter((object) => object.type === "rectangle").length,
  1,
  "low-FX mode must keep the flash but omit the ray fan",
);
assert.equal(
  lowScene.objects.filter((object) => object.type === "circle").length,
  RELIC_DISCOVERY_FX_CONFIG.modes.lowFx.ringCount
    + RELIC_DISCOVERY_FX_CONFIG.modes.lowFx.particleCount,
  "low-FX mode must retain only its small bounded local accent",
);
assert.equal(
  lowScene.tweenConfigs.some((tween) => tween.targets?.progress === 0),
  false,
  "token flight begins only after its pop completes",
);
lowScene.tweenConfigs.find(
  (tween) => tween.targets?.type === "image" && tween.onComplete,
).onComplete();
assert.ok(
  lowScene.tweenConfigs.some(
    (tween) => tween.targets?.progress === 0
      && tween.duration === RELIC_DISCOVERY_FX_CONFIG.flight.lowFxDurationMs,
  ),
  "low-FX mode must preserve the shorter token-to-player flight",
);
lowSystem.destroy();
assert.equal(lowSystem.getActiveSequenceCount(), 0);
assert.ok(lowScene.objects.every((object) => object.destroyed));

const reducedScene = createScene();
const reducedSystem = new RelicDiscoveryFxSystem(reducedScene, {
  reducedMotion: true,
});
assert.equal(reducedSystem.playDiscovery({
  anchor,
  iconAsset: "ancient-relic-icon",
  collectorTarget: collector,
  relicCount: 5,
}), true);
assert.equal(
  reducedScene.objects.filter((object) => object.type === "rectangle").length,
  1,
  "reduced motion must omit moving rays",
);
assert.equal(
  reducedScene.objects.filter((object) => object.type === "circle").length,
  RELIC_DISCOVERY_FX_CONFIG.modes.reducedMotion.ringCount + 1,
  "reduced motion must keep only its static source ring and player arrival ring",
);
assert.equal(
  reducedScene.tweenConfigs.some((tween) => tween.targets?.progress === 0),
  false,
  "reduced motion must replace travel with a direct player token reveal",
);
const reducedToken = reducedScene.objects.find((object) => object.type === "image");
assert.deepEqual({ x: reducedToken.x, y: reducedToken.y }, collector);
const reducedLabel = reducedScene.objects.find((object) => object.type === "text");
assert.equal(reducedLabel.alpha, 1);
const reducedFade = reducedScene.tweenConfigs.find(
  (tween) => tween.targets === reducedLabel && tween.alpha === 0,
);
reducedFade.onComplete();
assert.equal(reducedSystem.getActiveSequenceCount(), 0);

const hiddenScene = createScene();
const hiddenSystem = new RelicDiscoveryFxSystem(hiddenScene, {
  reducedMotion: true,
});
assert.equal(hiddenSystem.playDiscovery({
  anchor: { x: 5000, y: 5000 },
  iconAsset: "ancient-relic-icon",
  collectorTarget: collector,
  relicCount: 6,
}), false);
assert.equal(
  hiddenScene.objects.length,
  0,
  "the pedestal wake must not begin until its world anchor is visible",
);

const boundedScene = createScene();
const boundedSystem = new RelicDiscoveryFxSystem(boundedScene, {
  reducedMotion: true,
});
for (let count = 1; count <= RELIC_DISCOVERY_FX_CONFIG.maxConcurrentSequences + 1; count += 1) {
  boundedSystem.playDiscovery({
    anchor,
    iconAsset: "ancient-relic-icon",
    collectorTarget: collector,
    relicCount: count,
  });
}
assert.equal(
  boundedSystem.getActiveSequenceCount(),
  RELIC_DISCOVERY_FX_CONFIG.maxConcurrentSequences,
  "bursty discoveries must evict the oldest presentation sequence",
);
assert.ok(
  boundedScene.objects.some((object) => object.destroyed),
  "eviction must clean the oldest transient objects",
);
boundedSystem.destroy();
assert.ok(boundedScene.objects.every((object) => object.destroyed));
assert.equal(
  boundedSystem.playDiscovery({
    anchor,
    iconAsset: "ancient-relic-icon",
    collectorTarget: collector,
    relicCount: 9,
  }),
  false,
  "destroyed systems must reject future presentation work",
);

function createAwardHarness(initialCount, discoveryFxSystem) {
  const hudStatuses = [];
  const digSystem = new DigSystem(
    {},
    {
      scene: {
        hudSystem: {
          flashStatus(...args) {
            hudStatuses.push(args);
          },
        },
      },
    },
    { tileSize: 94, topAirRows: 65, seed: 133742 },
  );
  const ancientRelicSystem = new AncientRelicSystem(initialCount);
  digSystem.setAncientRelicSystem(ancientRelicSystem);
  digSystem.setRelicDiscoveryFxSystem(discoveryFxSystem);
  digSystem.setFloatingTextSystem({
    showFloatingText() {},
    tryUnlockEligibleConstellations() {},
    getRelicPurposeSummary: (count) => `${count} ready`,
  });
  return { digSystem, ancientRelicSystem, hudStatuses };
}

const discoveryCalls = [];
const awardHarness = createAwardHarness(2, {
  playDiscovery(payload) {
    discoveryCalls.push(payload);
  },
});
assert.equal(
  awardHarness.digSystem._awardAncientRelics(TILE_TYPES.ANCIENT_RELIC_CACHE, 6, 8),
  1,
  "authoritative cache award must still report the awarded relic",
);
assert.equal(awardHarness.ancientRelicSystem.getCount(), 3);
assert.deepEqual(discoveryCalls, [{
  anchor: { x: 611, y: 799 },
  iconAsset: ASSET_KEYS.ui.heavenblocks.ancientRelicToken,
  relicCount: 3,
}]);
assert.equal(
  discoveryCalls[0].iconAsset,
  "heavenblocks-ancient-relic-token-v1",
  "award hook must use the preloaded shared relic token",
);
assert.match(awardHarness.hudStatuses[0][0], /3 ready/);

const demoUiAssets = [];
queueCapabilityUiAssets({
  load: {
    image(key, path) {
      demoUiAssets.push({ key, path });
    },
  },
}, ASSET_KEYS, createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.DEMO));
assert.deepEqual(demoUiAssets, [
  {
    key: ASSET_KEYS.ui.heavenblocks.ancientRelicToken,
    path: "sprites/UI/heavenblocks-v1/ancient-relic-token-v1.png",
  },
  {
    key: ASSET_KEYS.ui.heavenblocks.ancientRelicIcon,
    path: "sprites/UI/heavenblocks-v1/ancient-relic-icon-v1.png",
  },
], "demo Boot must queue Relic art even while Heavenblocks gameplay is gated");

const throwingHarness = createAwardHarness(3, {
  playDiscovery() {
    throw new Error("synthetic presentation failure");
  },
});
const previousHealthMonitor = globalThis.__jkdHealth;
const presentationFindings = [];
globalThis.__jkdHealth = {
  captureSystemFinding(finding) {
    presentationFindings.push(finding);
  },
};
assert.doesNotThrow(
  () => throwingHarness.digSystem._awardAncientRelics(
    TILE_TYPES.ANCIENT_RELIC_CACHE,
    1,
    2,
  ),
  "presentation failures must never escape into the mining transaction",
);
assert.equal(
  throwingHarness.ancientRelicSystem.getCount(),
  4,
  "presentation failure must not roll back or alter the authoritative award",
);
assert.equal(throwingHarness.hudStatuses.length, 1);
assert.equal(presentationFindings.length, 1);
assert.equal(
  presentationFindings[0].code,
  RELIC_DISCOVERY_FX_CONFIG.health.presentationFailureCode,
  "a swallowed presentation failure must remain visible to production health",
);
globalThis.__jkdHealth = previousHealthMonitor;

const systemSource = await readFile(
  new URL("../systems/visual/RelicDiscoveryFxSystem.js", import.meta.url),
  "utf8",
);
const burstSource = await readFile(
  new URL("../systems/visual/relicDiscoveryFxBurst.js", import.meta.url),
  "utf8",
);
const configSource = await readFile(
  new URL("../values/relicDiscoveryFxConfig.js", import.meta.url),
  "utf8",
);
const setupSource = await readFile(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  systemSource,
  /DigSystem|BootScene|assetKeys|semantic-atlas|PlayScene|localStorage/,
  "presentation module must remain independent from gameplay, preload, scene, and save wiring",
);
assert.doesNotMatch(
  systemSource + configSource,
  /hudTarget|hudTargetXRatio|hudTargetYRatio/,
  "relic discovery must not target a HUD element that the game does not own",
);
assert.match(burstSource, /spawnFloorMark/);
assert.match(burstSource, /setScrollFactor\?\.\(1\)/);
assert.match(systemSource, /orbitRadiusPx/);
assert.match(setupSource, /targetProvider:[\s\S]*this\.player\?\.getCenter/);
assert.ok(
  systemSource.split("\n").filter((line) => line.trim()).length <= 320,
  "relic discovery presentation must stay within the visual-system line budget",
);
assert.ok(
  burstSource.split("\n").filter((line) => line.trim()).length <= 220,
  "relic discovery burst primitives must stay within their helper line budget",
);

console.log(
  "relic discovery FX contract: world wake, player orbit, award isolation, bounded runs, and cleanup passed",
);
