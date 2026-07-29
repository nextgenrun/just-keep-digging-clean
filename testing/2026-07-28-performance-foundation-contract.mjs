import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PERFORMANCE_TELEMETRY_CONFIG } from "../values/performanceTelemetryConfig.js";
import { WORLD_BACKGROUND_MASTER_TEST } from "../values/worldBackgroundMasterTest.js";
import { WORLD_RENDER_PERFORMANCE } from "../values/worldRenderPerformance.js";
import {
  WORLD_VISUAL_RUNTIME,
  resolveScenicAssetSchedulerEnabled,
  resolveScenicDemandAssetStreamingEnabled,
  resolveScenicStableWindowSchedulerEnabled,
} from "../values/worldVisualRuntime.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualDepthBackdropRegions,
} from "../values/worldVisualDepthBackdrops.js";
import { PerformanceTelemetrySystem } from "../systems/health/PerformanceTelemetrySystem.js";
import { shouldSamplePerformancePhases } from
  "../systems/health/performanceTelemetryBridge.js";
import { WorldBackgroundMasterSystem } from "../world/rendering/WorldBackgroundMasterSystem.js";
import { WorldRenderWindowBuffer } from "../world/rendering/WorldRenderWindowBuffer.js";
import { WorldRenderWindowScheduler } from "../world/rendering/WorldRenderWindowScheduler.js";
import { WorldVisualPerformanceTracker } from
  "../world/rendering/scenic-world/WorldVisualPerformanceTracker.js";
import { WorldVisualAssetCache } from
  "../world/rendering/scenic-world/WorldVisualAssetCache.js";
import { WorldVisualDepthBackdropRegionView } from
  "../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js";
import { WorldVisualRuntime } from "../world/rendering/scenic-world/WorldVisualRuntime.js";
import {
  setAlphaIfChanged,
  setDisplaySizeIfChanged,
  setPositionIfChanged,
  setTintIfChanged,
} from "../world/rendering/scenic-world/worldVisualRenderState.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const stateCalls = { tint: 0, alpha: 0, position: 0, size: 0 };
const renderStateTarget = {
  tintFill: false,
  tintTopLeft: 0xffffff,
  tintTopRight: 0xffffff,
  tintBottomLeft: 0xffffff,
  tintBottomRight: 0xffffff,
  alpha: 1,
  x: 0,
  y: 0,
  displayWidth: 10,
  displayHeight: 10,
  setTint(value) {
    stateCalls.tint += 1;
    this.tintTopLeft = value;
    this.tintTopRight = value;
    this.tintBottomLeft = value;
    this.tintBottomRight = value;
    return this;
  },
  setAlpha(value) {
    stateCalls.alpha += 1;
    this.alpha = value;
    return this;
  },
  setPosition(x, y) {
    stateCalls.position += 1;
    this.x = x;
    this.y = y;
    return this;
  },
  setDisplaySize(width, height) {
    stateCalls.size += 1;
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  },
};
setTintIfChanged(renderStateTarget, 0xaabbcc);
setTintIfChanged(renderStateTarget, 0xaabbcc);
setAlphaIfChanged(renderStateTarget, 0.75);
setAlphaIfChanged(renderStateTarget, 0.75);
setPositionIfChanged(renderStateTarget, 8, 12);
setPositionIfChanged(renderStateTarget, 8, 12);
setDisplaySizeIfChanged(renderStateTarget, 20, 30);
setDisplaySizeIfChanged(renderStateTarget, 20, 30);
assert.deepEqual(stateCalls, { tint: 1, alpha: 1, position: 1, size: 1 });

class Emitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    const listeners = this.listeners.get(event) || new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    this.on(event, wrapper);
  }

  emit(event) {
    for (const listener of this.listeners.get(event) || []) listener();
  }
}

let nowMs = 0;
const emitter = new Emitter();
const globalRef = {};
const playScene = {
  sys: { settings: { key: PERFORMANCE_TELEMETRY_CONFIG.sceneKeys.play } },
  worldBackgroundMasterSystem: {
    getPerformanceSnapshot: () => ({ schedulerEnabled: true, candidateChecks: 12 }),
  },
  worldRenderer: {
    getPerformanceSnapshot: () => ({ stagedStreamingEnabled: true, batches: 4 }),
  },
};
const telemetry = new PerformanceTelemetrySystem({
  globalRef,
  now: () => nowMs,
}).install();
telemetry.attachGame({
  events: emitter,
  scene: { getScenes: () => [playScene] },
});

const events = PERFORMANCE_TELEMETRY_CONFIG.events;
emitter.emit(events.preStep);
let frameStartMs = nowMs;
for (const frameDurationMs of [16, 17, 20, 55]) {
  nowMs = frameStartMs + 4;
  emitter.emit(events.postStep);
  nowMs = frameStartMs + 5;
  emitter.emit(events.preRender);
  nowMs = frameStartMs + 10;
  emitter.emit(events.postRender);
  nowMs = frameStartMs + frameDurationMs;
  emitter.emit(events.preStep);
  frameStartMs = nowMs;
}
telemetry.recordSpan("contract-span", 3.5, { phase: "test" });

let snapshot = telemetry.snapshot();
assert.equal(snapshot.frameMs.sampleCount, 4);
assert.equal(snapshot.frameMs.max, 55);
assert.equal(snapshot.frameMs.p99, 55);
assert.equal(snapshot.longFramesInWindow, 1);
assert.equal(snapshot.totalLongFrames, 1);
assert.equal(snapshot.spans["contract-span"].last, 3.5);
assert.equal(snapshot.streaming.backgrounds.candidateChecks, 12);
assert.equal(snapshot.streaming.tileWindow.batches, 4);
assert.equal(snapshot.streaming.worldRenderer.batches, 4);
assert.equal(globalRef[PERFORMANCE_TELEMETRY_CONFIG.globals.monitor], telemetry);
telemetry.destroy();
assert.equal(globalRef[PERFORMANCE_TELEMETRY_CONFIG.globals.monitor], undefined);

const phaseMonitorKey = PERFORMANCE_TELEMETRY_CONFIG.globals.monitor;
const previousGlobalPhaseMonitor = globalThis[phaseMonitorKey];
globalThis[phaseMonitorKey] = { recordSpan() {} };
const phaseOwner = {};
for (
  let sampleIndex = 1;
  sampleIndex < PERFORMANCE_TELEMETRY_CONFIG.samples.phaseEveryFrames;
  sampleIndex += 1
) {
  assert.equal(shouldSamplePerformancePhases(phaseOwner), false);
}
assert.equal(shouldSamplePerformancePhases(phaseOwner), true);
assert.equal(shouldSamplePerformancePhases(phaseOwner), false);
if (previousGlobalPhaseMonitor === undefined) {
  delete globalThis[phaseMonitorKey];
} else {
  globalThis[phaseMonitorKey] = previousGlobalPhaseMonitor;
}

const scenicSchedulerConfig = WORLD_VISUAL_RUNTIME.streaming.stableWindowScheduler;
assert.equal(resolveScenicStableWindowSchedulerEnabled(scenicSchedulerConfig, ""), true);
assert.equal(
  resolveScenicStableWindowSchedulerEnabled(
    scenicSchedulerConfig,
    `?${scenicSchedulerConfig.queryParam}=0`,
  ),
  false,
);
const scenicAssetSchedulerConfig = WORLD_VISUAL_RUNTIME.streaming.assetLoadScheduler;
assert.equal(resolveScenicAssetSchedulerEnabled(scenicAssetSchedulerConfig, ""), true);
assert.equal(
  resolveScenicAssetSchedulerEnabled(
    scenicAssetSchedulerConfig,
    `?${scenicAssetSchedulerConfig.queryParam}=0`,
  ),
  false,
);
const scenicDemandStreamingConfig = WORLD_VISUAL_RUNTIME.streaming.demandAssetStreaming;
assert.equal(
  resolveScenicDemandAssetStreamingEnabled(scenicDemandStreamingConfig, ""),
  true,
);
assert.equal(
  resolveScenicDemandAssetStreamingEnabled(
    scenicDemandStreamingConfig,
    `?${scenicDemandStreamingConfig.queryParam}=0`,
  ),
  false,
);

class QueueLoader extends Emitter {
  constructor() {
    super();
    this.loading = false;
    this.queued = [];
  }

  isLoading() {
    return this.loading;
  }

  image(key, assetPath) {
    this.queued.push({ key, path: assetPath });
  }

  start() {
    this.loading = true;
  }
}

const queueLoader = new QueueLoader();
const queueTextureKeys = new Set();
const queueCache = new WorldVisualAssetCache({
  load: queueLoader,
  textures: {
    exists: key => queueTextureKeys.has(key),
    remove: key => queueTextureKeys.delete(key),
  },
});
const queuedAssets = ["one", "two", "three"].map(key => ({
  key,
  path: `${key}.webp`,
}));
queuedAssets.forEach(asset => queueCache.ensure(asset));
assert.deepEqual(queueLoader.queued.map(asset => asset.key), ["one"]);
assert.equal(queueCache.getPerformanceSnapshot().activeAssets, 1);
assert.equal(queueCache.getPerformanceSnapshot().waitingAssets, 2);
assert.equal(queueCache.release("three"), true);
assert.equal(queueCache.getPerformanceSnapshot().waitingAssets, 1);
assert.equal(queueCache.getPerformanceSnapshot().cancelledLoads, 1);
queueTextureKeys.add("one");
queueLoader.emit("filecomplete-image-one");
queueLoader.loading = false;
queueLoader.emit(scenicAssetSchedulerConfig.loaderCompleteEvent);
assert.deepEqual(queueLoader.queued.map(asset => asset.key), ["one", "two"]);
assert.equal(queueCache.getPerformanceSnapshot().waitingAssets, 0);
queueCache.destroy();

const depthRegion = resolveWorldVisualDepthBackdropRegions(
  WORLD_VISUAL_DEPTH_BACKDROPS.regions[0].topTile,
  WORLD_VISUAL_DEPTH_BACKDROPS.regions[0].topTile + 20,
)[0];
const depthAssets = resolveWorldVisualDepthBackdropRegionAssets(
  depthRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  "",
);
const depthDemandView = new WorldVisualDepthBackdropRegionView(
  { config: { tileSize: 94 } },
  depthRegion,
  WORLD_VISUAL_DEPTH_BACKDROPS,
  depthAssets,
  true,
);
const demandedDepthAssets = depthDemandView.resolveRequiredAssets({
  left: depthRegion.leftTile,
  right: depthRegion.leftTile + 18,
  top: depthRegion.topTile,
  bottom: depthRegion.topTile + 12,
}, scenicDemandStreamingConfig.neighborSegments);
assert.ok(demandedDepthAssets.length > 0);
assert.ok(
  demandedDepthAssets.length < depthAssets.length,
  "visible-card demand streaming must not queue the complete biome library",
);

let scenicNowMs = 10;
const recordedScenicSpans = [];
const scenicTracker = new WorldVisualPerformanceTracker(WORLD_VISUAL_RUNTIME, {
  now: () => scenicNowMs,
  spanRecorder: (...args) => recordedScenicSpans.push(args),
});
const scenicStartedAtMs = scenicTracker.beginSync();
scenicNowMs = 17.25;
scenicTracker.recordSync(scenicStartedAtMs, {
  bounds: { left: 2, right: 12, top: 20, bottom: 28 },
  signature: "2:12:20:28",
  reduced: false,
  force: true,
});
scenicTracker.recordSkip("2:12:20:28", false);
scenicTracker.recordTileInvalidation();
snapshot = scenicTracker.snapshot({
  materialAssets: { pendingAssets: 1, loadedAssets: 2 },
  backdropAssets: { pendingAssets: 2, loadedAssets: 3 },
});
assert.equal(snapshot.syncs, 1);
assert.equal(snapshot.skippedSyncs, 1);
assert.equal(snapshot.forcedSyncs, 1);
assert.equal(snapshot.tileInvalidations, 1);
assert.equal(snapshot.lastCellCount, 80);
assert.equal(snapshot.lastSyncMs, 7.25);
assert.equal(snapshot.assetsPending, 3);
assert.equal(snapshot.assetsResident, 5);
assert.equal(snapshot.assetsCancelled, 0);
assert.equal(recordedScenicSpans[0][0], scenicSchedulerConfig.syncMetricName);
const fullCacheSnapshot = scenicTracker.snapshot({
  materialAssets: { pendingAssets: 1, loadedAssets: 2, cancelledLoads: 1 },
  backdropAssets: { pendingAssets: 2, retainedAssets: 1, cancelledLoads: 2 },
  terrainAssets: { pendingAssets: 3, loadedAssets: 4, cancelledLoads: 3 },
  groundStructureAssets: { pendingAssets: 0, loadedAssets: 1 },
  skyAssets: { pendingAssets: 1, retainedAssets: 2 },
  demandStreamingEnabled: true,
  demandedAssetCounts: { backdrop: 4, terrain: 2, groundStructures: 1 },
});
assert.equal(fullCacheSnapshot.assetsPending, 7);
assert.equal(fullCacheSnapshot.assetsResident, 10);
assert.equal(fullCacheSnapshot.assetsCancelled, 6);
assert.equal(fullCacheSnapshot.demandedAssets, 7);
assert.equal(fullCacheSnapshot.demandStreamingEnabled, true);
assert.ok(
  WORLD_VISUAL_RUNTIME.streaming.recoverReducedAboveFps
    > WORLD_VISUAL_RUNTIME.streaming.reduceBelowFps,
  "scenic reduced mode needs an exit threshold above its entry threshold",
);

const reducedTracker = new WorldVisualPerformanceTracker(WORLD_VISUAL_RUNTIME);
const reducedScene = { game: { loop: { actualFps: 60 } } };
assert.equal(reducedTracker.isReduced(reducedScene), false);
reducedScene.game.loop.actualFps = 43;
assert.equal(reducedTracker.isReduced(reducedScene), true, "low FPS should enter reduced mode");
reducedScene.game.loop.actualFps = 47;
assert.equal(
  reducedTracker.isReduced(reducedScene),
  true,
  "FPS near the entry threshold must not flip reduced mode off",
);
reducedScene.game.loop.actualFps = 50;
assert.equal(reducedTracker.isReduced(reducedScene), false, "recovery threshold should exit reduced mode");
reducedScene.game.loop.actualFps = 45;
assert.equal(
  reducedTracker.isReduced(reducedScene),
  false,
  "FPS near the entry threshold must not flip reduced mode back on",
);

const scenicCamera = {
  zoom: 1,
  width: 1280,
  height: 720,
  scrollX: 0,
  scrollY: 0,
  worldView: { x: 0, y: 0, width: 1280, height: 720 },
};
const scenicScene = {
  cameras: { main: scenicCamera },
  game: { loop: { actualFps: 60 } },
  time: { now: 100 },
};
const scenicRuntime = new WorldVisualRuntime(
  scenicScene,
  { width: 200, depth: 5065 },
  { tileSize: 94 },
);
scenicRuntime.created = true;
scenicRuntime.lightingBridge = { sample: () => ({ terrainTint: 0xffffff }) };
const scenicLightingCalls = [];
scenicRuntime.surfaceStage = { update: () => {} };
scenicRuntime.surfacePropLayer = { update: () => {} };
scenicRuntime.depthBackdropStage = { update: () => {} };
scenicRuntime.semanticAssetLayer = {
  update: () => {},
  setLighting: () => scenicLightingCalls.push("semantic"),
};
scenicRuntime.materialField = {
  setLighting: () => scenicLightingCalls.push("material"),
};
const stableBounds = scenicRuntime._getVisibleBounds({ tx: 5, ty: 5 });
scenicRuntime.lastSignature = scenicRuntime._boundsSignature(stableBounds);
scenicRuntime.lastReduced = false;
let scenicSyncCalls = 0;
scenicRuntime._sync = () => {
  scenicSyncCalls += 1;
  return true;
};
scenicRuntime.update(100, 16, { playerTile: { tx: 5, ty: 5 } });
assert.equal(scenicSyncCalls, 0);
assert.deepEqual(scenicLightingCalls, ["material", "semantic"]);
assert.equal(scenicRuntime.getPerformanceSnapshot().skippedSyncs, 1);
scenicRuntime.performanceTracker.schedulerEnabled = false;
scenicRuntime.update(200, 16, { playerTile: { tx: 5, ty: 5 } });
assert.equal(scenicSyncCalls, 1);

const streamConfig = WORLD_RENDER_PERFORMANCE.streamWindow;
const scheduler = new WorldRenderWindowScheduler(streamConfig, 5065);
let totalRows = 0;
let batchCount = 0;
let plan;
do {
  plan = scheduler.next({ ty: 208 }, 0);
  assert.ok(plan);
  assert.equal(plan.targetTop, streamConfig.stepTiles);
  assert.equal(plan.immediate, false);
  totalRows += plan.rowCount;
  batchCount += 1;
} while (!plan.complete);
assert.equal(totalRows, streamConfig.heightTiles);
assert.equal(batchCount, Math.ceil(streamConfig.heightTiles / streamConfig.rowsPerFrame));
assert.equal(plan.rowCount, streamConfig.heightTiles % streamConfig.rowsPerFrame);
assert.equal(scheduler.next({ ty: 208 }, streamConfig.stepTiles), null);

plan = scheduler.next({ ty: 1000 }, streamConfig.stepTiles);
assert.equal(plan.immediate, true);
assert.equal(plan.complete, true);
assert.equal(plan.rowCount, streamConfig.heightTiles);

function fakeLayer(name) {
  return {
    name,
    y: 0,
    visible: true,
    depth: 0,
    destroyed: false,
    setY(value) { this.y = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setDepth(value) { this.depth = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

const activeLayer = fakeLayer("active-world");
const activeRootLayer = fakeLayer("active-root");
const bufferedLayer = fakeLayer("buffer-world");
const bufferedRootLayer = fakeLayer("buffer-root");
const paintedBatches = [];
const fakeRenderer = {
  config: { tileSize: 94 },
  layer: activeLayer,
  rootOverlayLayer: activeRootLayer,
  _streamTopTile: 0,
  paintWorldRows: (...args) => paintedBatches.push(args),
};
const buffer = new WorldRenderWindowBuffer(fakeRenderer, streamConfig, 5065)
  .attach(bufferedLayer, bufferedRootLayer);
let committed = false;
while (!committed) committed = buffer.update({ ty: 208 }, fakeRenderer._streamTopTile);
assert.equal(fakeRenderer.layer, bufferedLayer);
assert.equal(fakeRenderer.rootOverlayLayer, bufferedRootLayer);
assert.equal(fakeRenderer._streamTopTile, streamConfig.stepTiles);
assert.equal(activeLayer.visible, false);
assert.equal(bufferedLayer.visible, true);
assert.equal(paintedBatches.length, batchCount);
assert.equal(
  paintedBatches.reduce((sum, args) => sum + args[4], 0),
  streamConfig.heightTiles,
);
assert.equal(buffer.snapshot(fakeRenderer._streamTopTile).commits, 1);

const tileSize = 94;
const camera = {
  zoom: 1,
  width: 1280,
  height: 720,
  scrollX: 50 * tileSize,
  scrollY: 350 * tileSize,
  worldView: {
    x: 50 * tileSize,
    y: 350 * tileSize,
    width: 1280,
    height: 720,
  },
};
const scene = {
  cameras: { main: camera },
  textures: { exists: () => false },
  load: {
    isLoading: () => false,
    image: () => {},
    once: () => {},
    start: () => {},
  },
};
const background = new WorldBackgroundMasterSystem(scene);
background.enabled = true;
background.activeObjects = background.objects.filter(({ entry }) => entry.active !== false);
background.visibility.rebuild(background.activeObjects);
const loadBounds = background.getCameraBounds(
  WORLD_BACKGROUND_MASTER_TEST.preloadMarginTilesX,
  WORLD_BACKGROUND_MASTER_TEST.preloadMarginTilesY,
);
const candidates = background.getStreamingCandidates(loadBounds);
const indexedNeeded = candidates
  .filter(item => background.intersectsItem(item, loadBounds))
  .map(item => item.runtimeId)
  .sort();
const bruteForceNeeded = background.activeObjects
  .filter(item => background.intersects(item.entry, loadBounds))
  .map(item => item.runtimeId)
  .sort();
assert.deepEqual(indexedNeeded, bruteForceNeeded);
assert.ok(candidates.length < background.activeObjects.length);

background.syncLoadedObjects = () => {};
background.queueMissingTextures = () => {};
background.unloadDistantObjects = () => {};
background.update();
background.update();
snapshot = background.getPerformanceSnapshot();
assert.equal(snapshot.updates, 1);
assert.equal(snapshot.skippedUpdates, 1);
camera.worldView.y += (
  WORLD_BACKGROUND_MASTER_TEST.streamScheduler.cameraStrideTilesY + 1
) * tileSize;
background.update();
assert.equal(background.getPerformanceSnapshot().updates, 2);

const originalPhaser = globalThis.Phaser;
globalThis.Phaser = { Loader: { Events: { COMPLETE: "complete" } } };
const queuedTextureKeys = [];
background.scene.load.image = key => queuedTextureKeys.push(key);
background.queueMissingTextures = WorldBackgroundMasterSystem.prototype.queueMissingTextures;
background.textureStream.pendingTextures.clear();
background.textureStream.loadBatchActive = false;
background.queueMissingTextures(indexedNeeded.slice(0, 3).map(
  runtimeId => background.visibility.getByRuntimeId(runtimeId)
));
assert.equal(queuedTextureKeys.length, 1);
if (originalPhaser === undefined) delete globalThis.Phaser;
else globalThis.Phaser = originalPhaser;

const rendererSource = readFileSync(
  path.join(ROOT, "world/rendering/WorldRenderer.js"),
  "utf8",
);
for (const token of [
  "WorldRenderWindowBuffer",
  "world-buffer",
  "root-overlays-buffer",
  "paintWorldRows",
  "_streamBuffer.update",
  "tileStreamStaging",
]) {
  assert.ok(
    rendererSource.includes(token)
      || readFileSync(path.join(ROOT, "values/worldRenderPerformance.js"), "utf8").includes(token),
    `performance renderer foundation missing ${token}`,
  );
}

console.log("performance foundation contract: ok");
