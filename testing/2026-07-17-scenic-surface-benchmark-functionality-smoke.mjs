import assert from "node:assert/strict";
import {
  WORLD_VISUAL_SURFACE_PACKS,
  resolveWorldVisualSurfacePack,
} from "../values/worldVisualSurfacePacks.js";
import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
} from "../values/worldVisualRuntime.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";
import { WeatherSystem } from "../systems/environment/WeatherSystem.js";
import { WorldVisualLightingBridge } from "../world/rendering/scenic-world/WorldVisualLightingBridge.js";
import { WorldVisualMaterialField } from "../world/rendering/scenic-world/WorldVisualMaterialField.js";
import { WorldVisualRuntime } from "../world/rendering/scenic-world/WorldVisualRuntime.js";
import {
  resolveSurfacePackBeautyGeometry,
  resolveSurfacePackBeautyVisibility,
  WorldVisualSurfacePackView,
} from "../world/rendering/scenic-world/WorldVisualSurfacePackView.js";
import {
  resolveTownFloorGeometry,
} from "../world/rendering/scenic-world/WorldVisualTownFloorView.js";

class ImageStub {
  constructor(x, y, key, frame) {
    this.x = x;
    this.y = y;
    this.key = key;
    this.frame = frame;
    this.alpha = 1;
    this.clearMaskCalls = [];
    this.destroyed = false;
  }

  setOrigin(...value) { this.origin = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setBlendMode(value) { this.blendMode = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setMask(value) { this.mask = value; return this; }
  createBitmapMask() {
    const mask = {
      source: this,
      destroyed: false,
      destroy() { this.destroyed = true; },
    };
    this.createdBitmapMask = mask;
    return mask;
  }
  clearMask(destroyMask = false) {
    this.clearMaskCalls.push(destroyMask);
    this.mask = null;
    return this;
  }
  setTint(value) { this.tint = value; return this; }
  clearTint() { this.tint = null; return this; }
  destroy() { this.destroyed = true; return this; }
}

function textureStub(width, height) {
  const frames = new Map();
  return {
    frames,
    getSourceImage: () => ({ width, height }),
    has: name => frames.has(name),
    add(name, sourceIndex, x, y, frameWidth, frameHeight) {
      frames.set(name, { sourceIndex, x, y, width: frameWidth, height: frameHeight });
    },
  };
}

const TEST_EPSILON = 1e-6;

const verticalReveal = {
  topFeatherTiles: 0.75,
  fullAlphaEdgeViewportFraction: 0.12,
  zeroAlphaEdgeViewportFraction: 0.52,
};
assert.equal(
  resolveSurfacePackBeautyVisibility(40, 720, verticalReveal),
  1,
  "the approved plate stays opaque when its top edge is safely above the view",
);
assert.equal(
  resolveSurfacePackBeautyVisibility(408, 720, verticalReveal),
  0,
  "a high-flight view must not expose the benchmark plate as a second sky card",
);
assert.ok(
  resolveSurfacePackBeautyVisibility(220, 720, verticalReveal) > 0,
  "the sky handoff must crossfade rather than pop",
);

function assertNear(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) <= TEST_EPSILON,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

function laneAtDepth(images, key, depth) {
  return images
    .filter(image => image.key === key && Math.abs(image.depth - depth) <= TEST_EPSILON)
    .sort((left, right) => left.x - right.x);
}

function assertTransitionLane(lane, geometry, label) {
  assert.equal(
    lane.length,
    geometry.strips + 1,
    `${label} must contain one opaque core plus every configured transition strip`,
  );
  const [core, ...transition] = lane;
  assertNear(core.x, geometry.left, `${label} core left`);
  assertNear(
    core.x + core.displayWidth,
    geometry.transitionStart,
    `${label} core must stop before the fade tile`,
  );
  assert.equal(core.alpha, 1, `${label} core must preserve the approved benchmark opacity`);
  for (let index = 0; index < transition.length; index += 1) {
    const strip = transition[index];
    const previousRight = index === 0
      ? geometry.transitionStart
      : transition[index - 1].x + transition[index - 1].displayWidth;
    assertNear(strip.x, previousRight, `${label} transition strip ${index} continuity`);
    assert.ok(strip.displayWidth > 0, `${label} transition strip ${index} needs positive width`);
    assert.ok(
      strip.alpha >= 0 && strip.alpha < (index === 0 ? core.alpha : transition[index - 1].alpha),
      `${label} transition alpha must strictly descend at strip ${index}`,
    );
  }
  assertNear(
    transition.at(-1).x + transition.at(-1).displayWidth,
    geometry.right,
    `${label} transition must end exactly at the registered pack edge`,
  );
  assert.ok(
    transition.at(-1).alpha <= 1 / geometry.strips,
    `${label} final strip must be near-transparent so the fallback cannot meet a hard edge`,
  );
  return { core, transition };
}

function assertSourceFrameLane(texture, lane, expected, label) {
  const frames = lane.map(image => {
    const frame = texture.frames.get(image.frame);
    assert.ok(frame, `${label} image must reference an installed source frame`);
    return frame;
  });
  assert.equal(frames[0].x, 0, `${label} core source begins at zero`);
  assert.equal(frames[0].y, 0, `${label} core source y begins at zero`);
  assert.equal(frames[0].width, expected.coreWidth, `${label} core source width`);
  assert.equal(frames[0].height, expected.height, `${label} core source height`);
  for (let index = 1; index < frames.length; index += 1) {
    assert.equal(
      frames[index].x,
      frames[index - 1].x + frames[index - 1].width,
      `${label} source frame ${index} must be contiguous`,
    );
    assert.equal(frames[index].y, 0, `${label} source frame ${index} y`);
    assert.ok(frames[index].width > 0, `${label} source frame ${index} needs positive width`);
    assert.equal(frames[index].height, expected.height, `${label} source frame ${index} height`);
  }
  assert.equal(
    frames.at(-1).x + frames.at(-1).width,
    expected.width,
    `${label} source frames must consume the registered source exactly once`,
  );
  return frames;
}

function assertEffectLane(effectLane, baseLane, factor, label) {
  assert.equal(effectLane.length, baseLane.length, `${label} geometry pass count`);
  for (let index = 0; index < baseLane.length; index += 1) {
    assertNear(effectLane[index].x, baseLane[index].x, `${label} x ${index}`);
    assertNear(effectLane[index].displayWidth, baseLane[index].displayWidth, `${label} width ${index}`);
    assert.equal(effectLane[index].frame, baseLane[index].frame, `${label} frame ${index}`);
    assertNear(
      effectLane[index].alpha,
      baseLane[index].alpha * factor,
      `${label} must multiply rather than replace fade alpha at ${index}`,
    );
  }
}

const originalPhaser = Object.getOwnPropertyDescriptor(globalThis, "Phaser");
Object.defineProperty(globalThis, "Phaser", {
  configurable: true,
  value: { BlendModes: { SCREEN: "screen" } },
});

try {
  const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
  const beautyTexture = textureStub(
    pack.beauty.expectedSource.width,
    pack.beauty.expectedSource.height,
  );
  const groundTexture = textureStub(
    pack.ground.columns * pack.ground.sourceCellPx,
    pack.ground.rows * pack.ground.sourceCellPx,
  );
  const floorTexture = textureStub(
    pack.floor.expectedSource.width,
    pack.floor.expectedSource.height,
  );
  const images = [];
  const createdTextures = new Map();
  const featherObjects = [];
  const scene = {
    config: { tileSize: 94, topAirRows: 65 },
    textures: {
      exists(key) { return createdTextures.has(key); },
      createCanvas(key, width, height) {
        const gradient = { stops: [], addColorStop(offset, value) { this.stops.push([offset, value]); } };
        const canvasTexture = {
          width,
          height,
          context: {
            fillStyle: null,
            createLinearGradient: () => gradient,
            fillRect() {},
          },
          gradient,
          refreshCalls: 0,
          refresh() { this.refreshCalls += 1; },
        };
        createdTextures.set(key, canvasTexture);
        return canvasTexture;
      },
      get(key) {
        if (key === pack.beauty.asset.key) return beautyTexture;
        if (key === pack.floor.asset.key) return floorTexture;
        if (key === pack.ground.asset.key) return groundTexture;
        throw new Error(`Unexpected texture: ${key}`);
      },
    },
    add: {
      image(x, y, key, frame) {
        const image = new ImageStub(x, y, key, frame);
        images.push(image);
        return image;
      },
    },
    make: {
      image({ x, y, key }) {
        const image = new ImageStub(x, y, key);
        featherObjects.push(image);
        return image;
      },
    },
  };

  const view = new WorldVisualSurfacePackView(scene, pack);
  assert.equal(view.create(), true);
  const authoritativeTerrainMask = {
    id: "material-field-geometry-mask",
    destroyCalls: 0,
    destroy() { this.destroyCalls += 1; },
  };
  assert.equal(view.bindTerrainMask(authoritativeTerrainMask), true);
  assert.equal(view.bindTerrainMask({ id: "replacement-mask" }), false);
  const tileSize = scene.config.tileSize;
  const beautyGeometry = resolveSurfacePackBeautyGeometry(pack, tileSize);
  const floorGeometry = resolveTownFloorGeometry(
    pack,
    beautyGeometry,
    tileSize,
    scene.config.topAirRows,
  );
  const packLeft = pack.worldAnchor.leftTile * tileSize;
  const beautyRight = packLeft + beautyGeometry.width;
  const beautyFadeWorldWidth = pack.transition.beautyFadeSourceWidthPx
    / beautyGeometry.sourcePixelsPerWorldPixel;
  const beautyTransitionGeometry = {
    left: packLeft,
    right: beautyRight,
    transitionStart: beautyRight - beautyFadeWorldWidth,
    strips: pack.transition.strips,
  };
  const groundRight = packLeft + pack.ground.columns * tileSize;
  const groundTransitionGeometry = {
    left: packLeft,
    right: groundRight,
    transitionStart: groundRight - pack.transition.fadeTiles * tileSize,
    strips: pack.transition.strips,
  };
  const beautyLane = laneAtDepth(images, pack.beauty.asset.key, pack.beauty.depth);
  const beautyLightningLane = laneAtDepth(
    images,
    pack.beauty.asset.key,
    pack.beauty.depth + 0.01,
  );
  const groundLane = laneAtDepth(images, pack.ground.asset.key, pack.ground.depth);
  const groundWetLane = laneAtDepth(
    images,
    pack.ground.asset.key,
    pack.ground.depth + 0.01,
  );
  const groundLightningLane = laneAtDepth(
    images,
    pack.ground.asset.key,
    pack.ground.depth + 0.02,
  );
  const floorLane = laneAtDepth(images, pack.floor.asset.key, pack.floor.depth);
  const floorWetLane = laneAtDepth(
    images,
    pack.floor.asset.key,
    pack.floor.depth + pack.floor.effectDepthStep,
  );
  const floorLightningLane = laneAtDepth(
    images,
    pack.floor.asset.key,
    pack.floor.depth + pack.floor.effectDepthStep * 2,
  );
  assert.equal(
    images.length,
    (pack.transition.strips + 1) * 5 + 3,
    "benchmark lanes plus the three-pass approved floor must all be present",
  );
  assertTransitionLane(beautyLane, beautyTransitionGeometry, "beauty");
  assertTransitionLane(groundLane, groundTransitionGeometry, "ground");
  assertNear(
    beautyLane[0].displayHeight,
    beautyGeometry.height,
    "beauty height must use the physical door calibration",
  );
  assert.equal(floorLane.length, 1);
  assert.equal(floorWetLane.length, 1);
  assert.equal(floorLightningLane.length, 1);
  assertNear(floorLane[0].displayWidth, beautyGeometry.width, "floor/village width alignment");
  assertNear(floorLane[0].displayHeight, floorGeometry.height, "floor aspect ratio");
  assertNear(
    floorLane[0].y,
    floorGeometry.y,
    "floor alpha top must align to the authoritative walking surface",
  );
  for (const image of [
    ...groundLane,
    ...groundWetLane,
    ...groundLightningLane,
    ...floorLane,
    ...floorWetLane,
    ...floorLightningLane,
  ]) {
    assert.equal(
      image.mask,
      authoritativeTerrainMask,
      "every ground core and transition strip must reuse the authoritative geometry mask",
    );
  }
  assert.ok(view.beautyFeatherMask, "the upper plate needs a dedicated sky-edge feather mask");
  assert.ok(
    [...beautyLane, ...beautyLightningLane]
      .every(image => image.mask === view.beautyFeatherMask),
    "every beauty pass must share the non-terrain vertical feather mask",
  );

  const beautyCoreSourceWidth = pack.beauty.expectedSource.width
    - pack.transition.beautyFadeSourceWidthPx;
  assertSourceFrameLane(beautyTexture, beautyLane, {
    coreWidth: beautyCoreSourceWidth,
    height: pack.beauty.sourceGroundY,
    width: pack.beauty.expectedSource.width,
  }, "beauty");
  assertSourceFrameLane(groundTexture, groundLane, {
    coreWidth: (pack.ground.columns - pack.transition.fadeTiles)
      * pack.ground.sourceCellPx,
    height: pack.ground.rows * pack.ground.sourceCellPx,
    width: pack.ground.columns * pack.ground.sourceCellPx,
  }, "ground");
  assert.deepEqual(
    floorTexture.frames.get(pack.floor.frameName),
    {
      sourceIndex: 0,
      x: pack.floor.sourceRect.x,
      y: pack.floor.sourceRect.y,
      width: pack.floor.sourceRect.width,
      height: pack.floor.sourceRect.height,
    },
  );

  const weatherLighting = { wet: 0.8, lightning: 0.5 };
  view.update(weatherLighting);
  assertEffectLane(
    beautyLightningLane,
    beautyLane,
    weatherLighting.lightning * pack.effects.lightningBeautyAlpha,
    "beauty lightning",
  );
  assertEffectLane(
    groundWetLane,
    groundLane,
    weatherLighting.wet * pack.effects.wetGroundAlpha,
    "wet ground",
  );
  assertEffectLane(
    groundLightningLane,
    groundLane,
    weatherLighting.lightning * pack.effects.lightningGroundAlpha,
    "ground lightning",
  );
  assertEffectLane(
    floorWetLane,
    floorLane,
    weatherLighting.wet * pack.effects.wetGroundAlpha,
    "wet approved floor",
  );
  assertEffectLane(
    floorLightningLane,
    floorLane,
    weatherLighting.lightning * pack.effects.lightningGroundAlpha,
    "approved floor lightning",
  );
  assert.ok(
    groundWetLane.every(image => image.tint === pack.effects.wetGroundTint),
    "wet tint must cover the core and every transition strip",
  );
  view.update({ wet: 0, lightning: 0 });
  assert.ok(
    [
      ...beautyLightningLane,
      ...groundWetLane,
      ...groundLightningLane,
      ...floorWetLane,
      ...floorLightningLane,
    ]
      .every(image => image.alpha === 0),
    "cleared weather must reset every transition overlay without touching base fade opacity",
  );
  assertTransitionLane(beautyLane, beautyTransitionGeometry, "beauty after weather reset");
  assertTransitionLane(groundLane, groundTransitionGeometry, "ground after weather reset");
  const maskedGroundPasses = [
    ...groundLane,
    ...groundWetLane,
    ...groundLightningLane,
    ...floorLane,
    ...floorWetLane,
    ...floorLightningLane,
  ];
  const maskedBeautyPasses = [...beautyLane, ...beautyLightningLane];
  const beautyFeatherMask = view.beautyFeatherMask;
  view.destroy();
  assert.ok(images.every(image => image.destroyed), "destroy must release every pack pass");
  assert.ok(
    maskedGroundPasses.every(image => (
      image.mask === null
      && image.clearMaskCalls.length === 1
      && image.clearMaskCalls[0] === false
    )),
    "destroy must clearMask(false) on every masked ground core and transition strip",
  );
  assert.ok(
    maskedBeautyPasses.every(image => (
      image.mask === null
      && image.clearMaskCalls.length === 1
      && image.clearMaskCalls[0] === false
    )),
    "destroy must release every borrowed beauty feather without double-destroying it",
  );
  assert.equal(beautyFeatherMask.destroyed, true);
  assert.ok(featherObjects.every(image => image.destroyed));
  assert.equal(
    authoritativeTerrainMask.destroyCalls,
    0,
    "the surface pack borrows the material field mask and must never destroy it",
  );
  assert.equal(view.beauty, null);
  assert.equal(view.beautyLightning, null);
  assert.equal(view.ground, null);
  assert.equal(view.groundWet, null);
  assert.equal(view.groundLightning, null);
  assert.equal(view.townFloorView, null);
  assert.equal(view.terrainMask, null);
  assert.doesNotThrow(() => view.destroy(), "destroy must remain idempotent after all strips are released");
} finally {
  if (originalPhaser) Object.defineProperty(globalThis, "Phaser", originalPhaser);
  else delete globalThis.Phaser;
}

const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "?surfacePack=approved");
assert.equal(pack?.id, WORLD_VISUAL_SURFACE_PACKS.defaultPackId);
assert.equal(
  resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "?surfacePack=current-v2"),
  null,
  "the explicit current-v2 query must roll back the benchmark pack",
);
const benchmarkPreloads = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, "");
const rollbackPreloads = getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, "?surfacePack=current-v2");
assert.ok(benchmarkPreloads.some(asset => asset.key === pack.beauty.asset.key));
assert.ok(benchmarkPreloads.some(asset => asset.key === pack.floor.asset.key));
assert.ok(benchmarkPreloads.some(asset => asset.key === pack.ground.asset.key));
assert.ok(!benchmarkPreloads.some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.town.key));
assert.ok(rollbackPreloads.some(asset => asset.key === WORLD_VISUAL_RUNTIME.assets.town.key));
assert.ok(!rollbackPreloads.some(asset => asset.key === pack.beauty.asset.key));
assert.ok(!rollbackPreloads.some(asset => asset.key === pack.floor.asset.key));

const lighting = new WorldVisualLightingBridge({
  dayNightCycle: { getNightAmount: () => 0.4 },
  weatherSystem: {
    getLightingSnapshot: () => ({
      kind: "storm",
      intensity: 0.75,
      surfaceWetness: 0.6,
      fogAmount: 0.25,
      lightningFlashAmount: 0.4,
      wind: 11,
      sunExposure: 0.55,
    }),
  },
}).sample();
assert.equal(lighting.night, 0.4);
assert.equal(lighting.daylight, 0.6);
assert.equal(lighting.wet, 0.6);
assert.equal(lighting.fog, 0.25);
assert.equal(lighting.snow, 0);
assert.equal(lighting.lightning, 0.4);
assert.equal(lighting.wind, 11);
assert.equal(lighting.exposure, 0.55);
assert.equal(Object.isFrozen(lighting), true);

const fallbackLighting = new WorldVisualLightingBridge({
  weatherSystem: {
    kind: "rain",
    intensity: 0.9,
    wind: -4,
    getLightingSnapshot: () => ({ worldWetnessAmount: 0.33 }),
  },
}).sample();
assert.equal(fallbackLighting.wet, 0.33, "world wetness must remain a supported weather fallback");
assert.equal(fallbackLighting.wind, -4);

function sampleClearNightWeatherTint(worldVisualRuntimeMode) {
  const overlay = {
    visible: null,
    color: null,
    alpha: null,
    setVisible(value) { this.visible = value; return this; },
    setFillStyle(color, alpha) { this.color = color; this.alpha = alpha; return this; },
  };
  WeatherSystem.prototype._updateTintOverlay.call({
    scene: {
      worldVisualRuntimeMode,
      dayNightCycle: { getNightAmount: () => 1 },
    },
    weatherConfig: WEATHER_CONFIG,
    intensity: 0,
    kind: "clear",
    gameplayController: { getSnapshot: () => ({ visibilityPenalty: 0 }) },
    _tintOverlay: overlay,
  }, {
    surfaceAmount: 1,
    undergroundAmount: 0,
    undergroundSignal: 0,
  });
  return overlay;
}

const scenicClearNightTint = sampleClearNightWeatherTint("scenic-v2");
const legacyClearNightTint = sampleClearNightWeatherTint("legacy");
assert.equal(
  scenicClearNightTint.alpha,
  0,
  "scenic weather must not add a second night-darkening pass over the authored moonlit benchmark",
);
assert.equal(scenicClearNightTint.visible, false);
assert.equal(
  legacyClearNightTint.alpha,
  WEATHER_CONFIG.lighting.nightAlpha,
  "legacy mode must preserve its existing weather-owned night tint",
);
assert.equal(legacyClearNightTint.visible, true);

const materialSyncCalls = [];
const materialField = Object.create(WorldVisualMaterialField.prototype);
materialField.activeBounds = { left: 2, right: 8, top: 65, bottom: 72 };
materialField.sync = (...args) => materialSyncCalls.push(args);
const tileLighting = { terrainTint: 0x9ab6d0 };
materialField.invalidateCell(4, 67, tileLighting);
assert.deepEqual(
  materialSyncCalls,
  [[materialField.activeBounds, tileLighting, false]],
  "a visible tile mutation must rebuild the existing material/mask field from gameplay state",
);
materialField.invalidateCell(20, 67, tileLighting);
assert.equal(materialSyncCalls.length, 1, "an off-window mutation must not rebuild the visible mask");

const calls = [];
const runtime = new WorldVisualRuntime({}, {}, { tileSize: 94 });
runtime.created = true;
runtime.lastBounds = { left: 2, right: 8, top: 65, bottom: 72 };
runtime.lightingBridge = { sample: () => tileLighting };
runtime.materialField = { invalidateCell: (...args) => calls.push(["material", ...args]) };
runtime.semanticAssetLayer = { invalidateCell: (...args) => calls.push(["semantic", ...args]) };
runtime.feedbackLayer = { sync: (...args) => calls.push(["feedback", ...args]) };
runtime.gameplayEffectLayer = { invalidateCell: (...args) => calls.push(["effect", ...args]) };
runtime.surfaceStage = { applyTileUpdate: (...args) => calls.push(["surface-pack", ...args]) };
runtime.applyTileUpdate(4, 67);
assert.deepEqual(calls, [
  ["material", 4, 67, tileLighting],
  ["semantic", 4, 67],
  ["feedback", runtime.lastBounds, false],
  ["effect", 4, 67],
]);
assert.ok(
  !calls.some(([owner]) => owner === "surface-pack"),
  "the benchmark pack must not become a second gameplay or digging authority",
);

const detachedCameraRuntime = new WorldVisualRuntime(
  { cameras: {}, scale: {} },
  { width: 100, depth: 100 },
  { tileSize: 94 },
);
detachedCameraRuntime.created = true;
let detachedSyncCalls = 0;
detachedCameraRuntime._sync = () => {
  detachedSyncCalls += 1;
  throw new Error("resize must not sync without an active camera");
};
assert.equal(detachedCameraRuntime._getVisibleBounds(), null);
assert.equal(detachedCameraRuntime.resize(), false);
assert.equal(detachedSyncCalls, 0);

const destroyOrder = [];
const borrowedMask = {
  destroyed: false,
  destroy() {
    this.destroyed = true;
    destroyOrder.push("material-mask");
  },
};
const destroyRuntime = new WorldVisualRuntime({
  scale: { off() { destroyOrder.push("resize-listener"); } },
}, {}, { tileSize: 94 });
destroyRuntime.created = true;
destroyRuntime.gameplayEffectLayer = { destroy() { destroyOrder.push("gameplay-effect"); } };
destroyRuntime.feedbackLayer = { destroy() { destroyOrder.push("feedback"); } };
destroyRuntime.semanticAssetLayer = { destroy() { destroyOrder.push("semantic"); } };
destroyRuntime.surfaceStage = {
  destroy() {
    assert.equal(
      borrowedMask.destroyed,
      false,
      "surface mask consumers must be released while the borrowed geometry mask is still valid",
    );
    destroyOrder.push("surface-stage");
  },
};
destroyRuntime.materialField = {
  geometryMask: borrowedMask,
  destroy() {
    borrowedMask.destroy();
    destroyOrder.push("material-field");
  },
};
destroyRuntime.depthBackdropStage = { destroy() { destroyOrder.push("depth-backdrop"); } };
destroyRuntime.landmarkLayer = { destroy() { destroyOrder.push("landmark"); } };
destroyRuntime.destroy();
assert.ok(
  destroyOrder.indexOf("surface-stage") < destroyOrder.indexOf("material-mask"),
  "surfaceStage must be destroyed before materialField destroys their shared geometry mask",
);
assert.equal(borrowedMask.destroyed, true);

console.log(
  "Scenic benchmark functionality smoke passed: mask lifecycle, teardown order, night tint ownership, tile invalidation, rollback assets, and weather fields are intact",
);
