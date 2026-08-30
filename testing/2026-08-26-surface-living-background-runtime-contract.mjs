import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORLD_VISUAL_SURFACE_PACKS,
  getWorldVisualSurfacePackPreloadAssets,
  resolveWorldVisualSurfaceMotion,
  resolveWorldVisualSurfacePack,
} from "../values/worldVisualSurfacePacks.js";
import {
  WORLD_VISUAL_RUNTIME,
  getWorldVisualPreloadAssets,
} from "../values/worldVisualRuntime.js";
import {
  WorldVisualSurfaceMotionView,
} from "../world/rendering/scenic-world/WorldVisualSurfaceMotionView.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const hash = relative => crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(root, relative)))
  .digest("hex");

const pack = resolveWorldVisualSurfacePack(WORLD_VISUAL_SURFACE_PACKS, "");
assert.equal(pack.id, "town-benchmark-v1");
assert.equal(pack.motion.groundIncluded, false);
assert.equal(resolveWorldVisualSurfaceMotion(pack, "")?.id, "town-air");
for (const [query, expected] of [
  ["?surfaceMotion=1", "soft-canopy"],
  ["?surfaceMotion=soft-canopy", "soft-canopy"],
  ["?surfaceMotion=2", "town-air"],
  ["?surfaceMotion=mini", "town-air"],
  ["?surfaceMotion=3", "layered-night"],
  ["?surfaceMotion=layered-night", "layered-night"],
  ["?surfaceMotion=4", "natural-canopy"],
  ["?surfaceMotion=natural", "natural-canopy"],
  ["?surfaceMotion=5", "depth-breeze"],
  ["?surfaceMotion=depth", "depth-breeze"],
  ["?surfaceMotion=6", "quiet-stars"],
  ["?surfaceMotion=stars", "quiet-stars"],
]) {
  assert.equal(resolveWorldVisualSurfaceMotion(pack, query)?.id, expected, query);
}
for (const value of ["0", "off", "false", "static", "none"]) {
  assert.equal(resolveWorldVisualSurfaceMotion(pack, `?surfaceMotion=${value}`), null);
}

function selectedVideos(search) {
  return getWorldVisualSurfacePackPreloadAssets(
    WORLD_VISUAL_SURFACE_PACKS,
    search,
  ).filter(asset => asset.type === "video");
}

assert.deepEqual(selectedVideos("").map(asset => asset.key), [
  resolveWorldVisualSurfaceMotion(pack, "").asset.key,
]);
for (const variant of pack.motion.variants) {
  assert.deepEqual(
    selectedVideos(`?surfaceMotion=${variant.id}`).map(asset => asset.key),
    [variant.asset.key],
    `only ${variant.id} may preload`,
  );
}
assert.equal(selectedVideos("?surfaceMotion=0").length, 0);
assert.equal(
  getWorldVisualSurfacePackPreloadAssets(
    WORLD_VISUAL_SURFACE_PACKS,
    "?surfaceMotion=0",
  ).length,
  3,
);
assert.equal(
  getWorldVisualSurfacePackPreloadAssets(
    WORLD_VISUAL_SURFACE_PACKS,
    "?surfaceRelief=1",
  ).length,
  3,
  "the static relief review must not inherit production motion",
);
assert.equal(
  getWorldVisualSurfacePackPreloadAssets(
    WORLD_VISUAL_SURFACE_PACKS,
    "?surfacePack=current-v2",
  ).length,
  0,
);
assert.equal(
  getWorldVisualPreloadAssets(WORLD_VISUAL_RUNTIME, "")
    .filter(asset => asset.type === "video").length,
  1,
  "Boot may preload only the selected living surface loop",
);

const runtimeManifestPath = (
  "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/"
  + "surface-living-background-v1.manifest.json"
);
const runtimeManifest = JSON.parse(read(runtimeManifestPath));
const sourceManifest = JSON.parse(read(runtimeManifest.sourceManifest));
const layeredManifest = JSON.parse(read(
  "sprites/backgrounds/start-zone-scenic-v1/living-background-v2/"
  + "surface-living-background-v2.manifest.json",
));
assert.equal(runtimeManifest.playback, "forward-only seamless cycle");
assert.equal(runtimeManifest.staticFallback, pack.beauty.asset.path);
assert.equal(runtimeManifest.groundIncluded, false);
assert.equal(runtimeManifest.results.length, 3);
assert.equal(layeredManifest.results.length, 3);
assert.equal(layeredManifest.runtimeDecoderCount, 1);
assert.equal(layeredManifest.groundIncluded, false);
assert.equal(layeredManifest.audioIncluded, false);
assert.equal(sourceManifest.strategy.includes("no reverse, no ping-pong"), true);
const sourceByOutput = new Map(sourceManifest.results.map(item => [item.output, item]));
const runtimeByFilename = new Map(runtimeManifest.results.map(item => [
  path.basename(item.output),
  item,
]));
const originalVariants = pack.motion.variants.slice(0, 3);
const layeredVariants = pack.motion.variants.slice(3);
for (const variant of originalVariants) {
  const filename = path.basename(variant.asset.path);
  const promoted = runtimeByFilename.get(filename);
  assert.ok(promoted, filename);
  assert.equal(fs.existsSync(path.join(root, variant.asset.path)), true);
  assert.equal(hash(variant.asset.path), promoted.outputSha256);
  assert.equal(promoted.width, pack.motion.expectedSource.width);
  assert.equal(promoted.height, pack.motion.expectedSource.height);
  assert.equal(promoted.fps, 24);
  assert.equal(promoted.frames, 432);
  assert.equal(promoted.durationSeconds, 18);
  assert.equal(promoted.groundIncluded, false);
  assert.equal(promoted.audioIncluded, false);
  const closure = sourceByOutput.get(promoted.source);
  assert.ok(closure, `${filename} closure source`);
  assert.ok(closure.peakMotionFromStartMae > 4, `${filename} needs real movement`);
  assert.ok(closure.maxSceneAnchorShiftPx <= sourceManifest.cameraLockGatePx);
  assert.ok(
    closure.loopSeamMae <= closure.maxFrameStepMae,
    `${filename} seam must remain within an existing frame-step peak`,
  );
}
const layeredById = new Map(layeredManifest.results.map(item => [item.id, item]));
for (const variant of layeredVariants) {
  const promoted = layeredById.get(variant.id);
  assert.ok(promoted, variant.id);
  assert.equal(fs.existsSync(path.join(root, variant.asset.path)), true);
  assert.equal(hash(variant.asset.path), promoted.sha256);
  assert.equal(promoted.width, pack.motion.expectedSource.width);
  assert.equal(promoted.height, pack.motion.expectedSource.height);
  assert.equal(promoted.fps, 24);
  assert.equal(promoted.frames, 432);
  assert.equal(promoted.durationSeconds, 18);
  assert.equal(promoted.groundIncluded, false);
  assert.equal(promoted.audioIncluded, false);
  assert.ok(promoted.metrics.peakMotionFromStartMae > 3.5);
  assert.ok(
    promoted.metrics.meanCanopyMotionCorrelation
      < layeredManifest.baselineTownAirMetrics.meanCanopyMotionCorrelation * 0.75,
    `${variant.id} must break the synchronized canopy field`,
  );
  assert.ok(
    promoted.metrics.lowerStructureMeanStepMae
      < layeredManifest.baselineTownAirMetrics.lowerStructureMeanStepMae * 0.25,
    `${variant.id} must anchor the town and lower trunks`,
  );
  assert.ok(
    promoted.metrics.loopSeamMae <= promoted.metrics.maxUpperFrameStepMae,
    `${variant.id} seam must stay within an existing frame-step peak`,
  );
}

class VideoStub {
  constructor() {
    this.listeners = new Map();
    this.alpha = 1;
    this.isTinted = false;
    this.visible = true;
  }
  setOrigin(...value) { this.origin = value; return this; }
  setDepth(value) { this.depth = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setMute(value) { this.muted = value; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  setMask(value) { this.mask = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setPaused(value) { this.paused = value; this.pauseCalls = [...(this.pauseCalls || []), value]; return this; }
  clearTint() { this.isTinted = false; return this; }
  once(event, listener) { this.listeners.set(event, listener); return this; }
  emit(event, ...args) { this.listeners.get(event)?.(this, ...args); }
  play(loop) { this.loop = loop; return this; }
  stop(value) { this.stopValue = value; return this; }
  clearMask(value) { this.clearMaskValue = value; this.mask = null; return this; }
  getCurrentTime() { return 6.5; }
  getDuration() { return 18; }
  destroy() { this.destroyed = true; }
}

class FeatherStub {
  setOrigin(...value) { this.origin = value; return this; }
  setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; }
  createBitmapMask() {
    this.mask = { destroyed: false, destroy() { this.destroyed = true; } };
    return this.mask;
  }
  destroy() { this.destroyed = true; }
}

function makeScene(hasVideo) {
  const video = new VideoStub();
  const feather = new FeatherStub();
  const textures = new Map();
  return {
    video,
    feather,
    cache: { video: { exists: () => hasVideo } },
    add: { video: () => video },
    make: { image: () => feather },
    textures: {
      exists: key => textures.has(key),
      createCanvas(key, width, height) {
        const gradients = [];
        const context = {
          fillStyle: null,
          globalCompositeOperation: "source-over",
          createLinearGradient() {
            const gradient = {
              stops: [],
              addColorStop(offset, value) { this.stops.push([offset, value]); },
            };
            gradients.push(gradient);
            return gradient;
          },
          fillRect() {},
        };
        const texture = {
          width,
          height,
          context,
          gradients,
          refresh() { this.refreshed = true; },
        };
        textures.set(key, texture);
        return texture;
      },
    },
  };
}

const variant = resolveWorldVisualSurfaceMotion(pack, "");
const layout = {
  x: 0,
  y: 6110,
  width: 1801,
  height: 534,
  depth: -4.195,
  maskKey: "surface-motion-test-feather",
  topFadeFraction: 0.13,
  rightFadeFraction: 129 / 1801,
};
const unavailable = new WorldVisualSurfaceMotionView(makeScene(false), pack.motion, variant, layout);
assert.equal(unavailable.create(), false);
assert.equal(unavailable.update(1), false, "a missing video must retain the static plate");

const scene = makeScene(true);
const view = new WorldVisualSurfaceMotionView(scene, pack.motion, variant, layout);
assert.equal(view.create(), true);
assert.equal(scene.video.loop, true);
assert.equal(scene.video.visible, false, "static fallback stays visible until decode succeeds");
scene.video.emit("created", 1800, 534);
assert.equal(view.ready, true);
assert.equal(scene.video.visible, true);
assert.deepEqual(scene.video.origin, [0, 1]);
assert.equal(scene.video.displayWidth, 1801);
assert.equal(scene.video.displayHeight, 534);
assert.equal(scene.video.mask, view.featherMask);
assert.equal(scene.feather.displayWidth, 1801);
assert.equal(scene.feather.displayHeight, 534);
assert.equal(view.update(0.6), true);
assert.equal(scene.video.alpha, 0.6);
view.update(0);
view.update(0.8);
assert.deepEqual(scene.video.pauseCalls, [true, false]);
assert.deepEqual(view.getSnapshot(), {
  variantId: "town-air",
  ready: true,
  failed: false,
  paused: false,
  currentTime: 6.5,
  duration: 18,
  displayWidth: 1801,
  displayHeight: 534,
});
const borrowedMask = view.featherMask;
view.destroy();
assert.equal(scene.video.stopValue, false);
assert.equal(scene.video.clearMaskValue, false);
assert.equal(scene.video.destroyed, true);
assert.equal(scene.feather.destroyed, true);
assert.equal(borrowedMask.destroyed, true);

const bootSource = read("ui/scenes/BootScene.js");
const stageSource = read("world/rendering/scenic-world/WorldVisualSurfaceStage.js");
const packViewSource = read("world/rendering/scenic-world/WorldVisualSurfacePackView.js");
const motionSource = read("world/rendering/scenic-world/WorldVisualSurfaceMotionView.js");
assert.match(bootSource, /queueVideo\(asset\.key, asset\.path/);
assert.match(bootSource, /this\.load\.video\(key, path, true\)/);
assert.match(stageSource, /if \(asset\.type === "video"\) continue/);
assert.match(packViewSource, /motionActive \? 0 : beautyVisibility/);
assert.match(packViewSource, /rightFadeFraction/);
assert.doesNotMatch(motionSource, /setTile|setHp|damageTile|saveState|collision/);
for (const entryFile of [
  "index.html",
  "main.js",
  "ui/scenes/BootScene.js",
  "ui/scenes/PlayScene.js",
  "values/worldVisualRuntime.js",
  "world/PlayScene.js",
  "world/playScene/PlaySceneSetup.js",
  "world/rendering/WorldRenderFactory.js",
  "world/rendering/scenic-world/WorldVisualRuntime.js",
  "world/rendering/scenic-world/WorldVisualSurfaceStage.js",
]) {
  assert.match(read(entryFile), /20260826-surface-motion-v2/, `${entryFile} cache chain`);
}

console.log(
  "surface living background runtime contract: six isolated 18 s forward loops, "
  + "three asynchronous canopy/star experiments, "
  + "single-variant preload, static fallback, camera lock, top/right feather, pause, "
  + "cleanup, and gameplay-authority isolation passed",
);
