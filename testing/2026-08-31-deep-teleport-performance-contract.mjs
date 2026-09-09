import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { StarSanctuarySystem } from
  "../systems/environment/StarSanctuarySystem.js";
import { WorldVisualRuntime } from
  "../world/rendering/scenic-world/WorldVisualRuntime.js";
import { WorldVisualFeedbackLayer } from
  "../world/rendering/scenic-world/WorldVisualFeedbackLayer.js";
import { TeleportTransitionController } from
  "../world/playScene/TeleportTransitionController.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const source = async path => readFile(new URL(path, import.meta.url), "utf8");

function createTransitionFixture({
  rendererReadyAfterCalls = 2,
  animationPromise = Promise.resolve({ ready: true }),
  gameState = "playing",
  config = {},
} = {}) {
  const events = [];
  let playerTile = { tx: 5, ty: 70 };
  let renderCalls = 0;
  const overlay = {
    refresh: () => events.push("overlay:refresh"),
    complete: callback => {
      events.push("overlay:complete");
      callback?.();
    },
    destroy: () => events.push("overlay:destroy"),
  };
  const scene = {
    gameState,
    time: { now: 0 },
    player: { x: 320, y: 640 },
    playerAssetProfile: { teleportInAnim: "teleport-in" },
    playerDeferredAnimationAssetController: {
      ensureForAnimation: () => {
        events.push("animation:request");
        return animationPromise;
      },
    },
    playerController: {
      getPlayerTile: () => playerTile,
      setControlsEnabled: enabled => events.push(`controls:${enabled}`),
    },
    worldRenderer: {
      updateRenderWindow: target => {
        renderCalls += 1;
        events.push(`renderer:${target.tx},${target.ty}`);
      },
      getTransitionPreparationSnapshot: () => {
        const ready = renderCalls >= rendererReadyAfterCalls;
        return {
          totalAssets: 1,
          loadedAssets: ready ? 1 : 0,
          pendingAssets: ready ? 0 : 1,
          ready,
        };
      },
    },
    setSceneBasePhase: phase => {
      events.push(`phase:${phase}`);
      scene.gameState = phase === "active" ? "playing" : phase;
    },
    cameras: {
      main: { centerOn: (x, y) => events.push(`camera:${x},${y}`) },
    },
    queueDugTilesSave: reason => events.push(`save:${reason}`),
  };
  const controller = new TeleportTransitionController(
    scene,
    () => {
      events.push("overlay:create");
      return overlay;
    },
    {
      enabled: true,
      queryParam: "teleportLoading",
      queryEnableValues: ["1"],
      queryDisableValues: ["0"],
      minimumDistanceTiles: 48,
      minimumVisibleMs: 10,
      maximumPreparationMs: 100,
      settleFrames: 1,
      diagnosticsGlobalKey: "__jkdTeleportTransitionContract",
      ...config,
    },
    "",
  );
  return {
    controller,
    events,
    scene,
    setPlayerTile: tile => { playerTile = tile; },
  };
}

{
  const fixture = createTransitionFixture();
  const target = { tx: 110, ty: 820 };
  let commits = 0;
  let afterCommits = 0;
  assert.equal(fixture.controller.begin({
    target,
    label: "DEEP GATE",
    commit: () => {
      commits += 1;
      fixture.events.push("commit");
      fixture.setPlayerTile(target);
    },
    afterCommit: () => {
      afterCommits += 1;
      fixture.events.push("after-commit");
    },
  }), true);
  assert.equal(fixture.controller.begin({ target, commit: () => {} }), false);
  assert.deepEqual(fixture.events.slice(0, 3), [
    "overlay:create",
    "controls:false",
    "phase:transitioning",
  ]);
  assert.equal(fixture.events.includes("renderer:110,820"), false);

  await Promise.resolve();
  fixture.controller.update(1);
  assert.equal(commits, 0);
  assert.equal(
    fixture.events.includes("renderer:110,820"),
    false,
    "The first controller update must be reserved for a covered render",
  );
  fixture.controller.update(2);
  assert.ok(
    fixture.events.indexOf("overlay:create")
      < fixture.events.indexOf("renderer:110,820"),
    "The overlay must exist for a rendered frame before destination staging",
  );
  fixture.controller.update(11);
  assert.equal(commits, 1);
  assert.equal(afterCommits, 1);
  assert.ok(fixture.events.includes("save:portal-teleport-arrival"));
  fixture.controller.update(12);
  assert.equal(fixture.controller.isActive(), false);
  assert.equal(fixture.events.at(-1), "controls:true");
}

{
  const neverSettles = new Promise(() => {});
  const fixture = createTransitionFixture({
    rendererReadyAfterCalls: Number.POSITIVE_INFINITY,
    animationPromise: neverSettles,
    config: { minimumVisibleMs: 0, maximumPreparationMs: 5 },
  });
  let commits = 0;
  assert.equal(fixture.controller.begin({
    target: { tx: 120, ty: 900 },
    commit: () => { commits += 1; },
  }), true);
  fixture.controller.update(1);
  fixture.controller.update(2);
  fixture.controller.update(8);
  assert.equal(commits, 1, "Preparation timeout must fail open exactly once");
  fixture.controller.update(8);
  assert.equal(fixture.controller.isActive(), false);
}

{
  const fixture = createTransitionFixture({ gameState: "paused" });
  const target = { tx: 100, ty: 820 };
  assert.equal(fixture.controller.begin({ target, commit: () => {} }), false);
  assert.equal(fixture.controller.begin({
    target,
    allowFromPaused: true,
    commit: () => {},
  }), true, "Quick Resume must be able to stage while the pause menu is open");
  fixture.controller.destroy();
}

{
  const fixture = createTransitionFixture({
    rendererReadyAfterCalls: 1,
    animationPromise: Promise.resolve({ ready: false }),
    config: { minimumVisibleMs: 0, maximumPreparationMs: 100 },
  });
  let commits = 0;
  assert.equal(fixture.controller.begin({
    target: { tx: 110, ty: 820 },
    commit: () => { commits += 1; },
  }), true);
  await Promise.resolve();
  fixture.controller.update(1);
  fixture.controller.update(2);
  fixture.controller.update(3);
  assert.equal(commits, 1, "A settled optional animation failure must not wait for timeout");
  assert.equal(fixture.controller.snapshot.timedOut, false);
  fixture.controller.update(4);
}

{
  const fixture = createTransitionFixture();
  assert.equal(fixture.controller.begin({
    target: { tx: 8, ty: 75 },
    commit: () => assert.fail("Short travel must stay synchronous at the caller"),
  }), false);
}

{
  const calls = {
    feedback: 0,
    material: 0,
    terrain: 0,
    semantic: 0,
    gameplay: 0,
    titan: 0,
    invalidations: 0,
    damageCell: 0,
    destroyedCell: 0,
  };
  const runtime = {
    created: true,
    lastBounds: { left: 0, right: 20, top: 0, bottom: 20 },
    lastReduced: false,
    _syncTutorialTileVisual: () => {},
    performanceTracker: {
      recordTileInvalidation: () => { calls.invalidations += 1; },
    },
    lightingBridge: { sample: () => ({}) },
    materialField: {
      sync: () => { calls.material += 1; },
      invalidateCell: () => { calls.material += 1; },
    },
    terrainVariationLayer: {
      sync: () => { calls.terrain += 1; },
      invalidateCell: () => { calls.terrain += 1; },
    },
    semanticAssetLayer: {
      invalidateResourcePresentation: () => { calls.semantic += 1; },
      invalidateCell: () => { calls.semantic += 1; },
    },
    feedbackLayer: {
      updateDamageTile: () => { calls.damageCell += 1; return true; },
      updateDestroyedTile: () => { calls.destroyedCell += 1; return true; },
      sync: () => { calls.feedback += 1; },
    },
    gameplayEffectLayer: {
      sync: () => { calls.gameplay += 1; },
      invalidateCell: () => { calls.gameplay += 1; },
    },
    titanDiscoverySystem: {
      invalidateTile: () => { calls.titan += 1; },
    },
  };
  WorldVisualRuntime.prototype.applyTileDamageUpdate.call(runtime, 4, 5);
  assert.equal(calls.damageCell, 1);
  assert.equal(calls.feedback, 0, "HP-only damage must not rescan feedback bounds");
  assert.equal(calls.material, 0, "HP-only damage must not rebuild material masks");

  WorldVisualRuntime.prototype.applyTileUpdate.call(runtime, 4, 5, {
    destroyed: true,
    typeBeforeDamage: TILE_TYPES.DIRT,
  });
  assert.equal(calls.destroyedCell, 1);
  assert.equal(calls.feedback, 0,
    "Ordinary destruction must remove its crack without rescanning feedback bounds");

  calls.material = 0;
  calls.terrain = 0;
  calls.semantic = 0;
  calls.gameplay = 0;
  calls.titan = 0;
  calls.invalidations = 0;

  calls.feedback = 0;
  WorldVisualRuntime.prototype.applyTileUpdates.call(runtime, [
    { tx: 4, ty: 5 },
    { tx: 5, ty: 5 },
    { tx: 6, ty: 5 },
  ]);
  assert.deepEqual({
    material: calls.material,
    terrain: calls.terrain,
    semantic: calls.semantic,
    feedback: calls.feedback,
    gameplay: calls.gameplay,
  }, {
    material: 1,
    terrain: 1,
    semantic: 1,
    feedback: 1,
    gameplay: 1,
  });
  assert.equal(calls.titan, 3);

  runtime.feedbackLayer.updateDestroyedTile = () => {
    calls.destroyedCell += 1;
    return false;
  };
  calls.feedback = 0;
  WorldVisualRuntime.prototype.applyTileUpdate.call(runtime, 4, 5, {
    destroyed: true,
    typeBeforeDamage: TILE_TYPES.COPPER,
  });
  assert.equal(calls.feedback, 1,
    "Resource destruction must keep the exact full feedback refresh");
}

{
  const hpByTile = new Map([
    ["4,5", 8],
    ["6,5", 6],
  ]);
  let clears = 0;
  const draws = [];
  const layer = Object.assign(Object.create(WorldVisualFeedbackLayer.prototype), {
    activeBounds: { left: 0, right: 10, top: 0, bottom: 10 },
    activeDamageCells: new Map([
      ["4,5", { tx: 4, ty: 5, damage: 0.2, size: 94, tileType: 1 }],
      ["6,5", { tx: 6, ty: 5, damage: 0.4, size: 94, tileType: 1 }],
    ]),
    scene: { config: { tileSize: 94 } },
    config: { streaming: { maxVisibleDamageCells: 2 } },
    worldModel: {
      getTileType: () => 1,
      getTileHp: (tx, ty) => hpByTile.get(`${tx},${ty}`) ?? 10,
      getTileMaxHp: () => 10,
    },
    resourceDepletionProvider: null,
    semanticAssetsEnabled: true,
    damagePainter: {
      clear: () => { clears += 1; },
      draw: (tx, ty, damage) => draws.push({ tx, ty, damage }),
    },
  });

  hpByTile.set("4,5", 5);
  layer.updateDamageTile(4, 5, false);
  assert.equal(clears, 1);
  assert.equal(draws.length, 2, "Advancing one crack must preserve other visible cracks");
  assert.equal(layer.activeDamageCells.get("4,5").damage, 0.5);

  draws.length = 0;
  hpByTile.set("4,5", 10);
  layer.updateDamageTile(4, 5, false);
  assert.equal(layer.activeDamageCells.has("4,5"), false);
  assert.deepEqual(draws.map(({ tx, ty }) => `${tx},${ty}`), ["6,5"]);

  const clearsBeforeOffscreen = clears;
  layer.updateDamageTile(20, 20, false);
  assert.equal(clears, clearsBeforeOffscreen, "Offscreen damage updates must no-op");

  hpByTile.set("7,5", 5);
  const clearsBeforeReducedCap = clears;
  assert.equal(layer.updateDamageTile(7, 5, true), false,
    "A saturated damage cache must request an exact row-major fallback scan");
  assert.equal(layer.activeDamageCells.has("7,5"), false);
  assert.equal(clears, clearsBeforeReducedCap, "Reduced damage cap must remain bounded");

  hpByTile.set("6,5", 10);
  assert.equal(layer.updateDestroyedTile(6, 5, TILE_TYPES.DIRT, false), true);
  assert.equal(layer.activeDamageCells.has("6,5"), false,
    "Ordinary destruction must remove its targeted crack");
  layer.semanticAssetsEnabled = false;
  assert.equal(layer.updateDestroyedTile(6, 5, TILE_TYPES.COPPER, false), false,
    "Resource destruction must request the marker/decal-preserving full sync");
}

{
  let tileReads = 0;
  const fake = {
    worldModel: {
      dugTiles: new Map(),
      inBounds: () => true,
      getTileType: () => { tileReads += 1; return 0; },
      getDugTileSource: () => null,
    },
    config: {
      scar: { territoryBound: true, radiusTiles: 1 },
      refuge: { maximumRadiusTiles: 1 },
    },
    territorySystem: { getNearestSite: () => null, stateRevision: 0 },
    getScarSiteAt: () => null,
    getProfileAt: () => ({ radiusTiles: 1 }),
    _nearbySiteCacheKey: "",
    _nearbySiteCache: null,
  };
  const find = tile => StarSanctuarySystem.prototype._findNearbySites.call(fake, tile);
  find({ tx: 20, ty: 700 });
  const firstReads = tileReads;
  find({ tx: 20, ty: 700 });
  assert.equal(tileReads, firstReads, "Same-tile sanctuary lookup should be cached");
  fake.worldModel.dugTiles.set("20,700", { type: 1 });
  find({ tx: 20, ty: 700 });
  assert.ok(tileReads > firstReads, "A world mutation must invalidate the cache");
}

{
  const [special, dig, earthquake, scar, update, titan, teleportOverlay] = await Promise.all([
    source("../systems/mining/SpecialTileSystem.js"),
    source("../systems/mining/DigSystem.js"),
    source("../systems/environment/EarthquakeSystem.js"),
    source("../systems/visual/StarlessScarView.js"),
    source("../world/playScene/PlaySceneUpdate.js"),
    source("../systems/visual/TitanDiscoverySystem.js"),
    source("../ui/components/TeleportLoadingOverlay.js"),
  ]);
  assert.equal(
    (special.match(/const pending = this\._commitPortalTravel\(target/g) || []).length,
    3,
    "Only the three portal-network moves should use the staged transition",
  );
  assert.match(dig, /applyTileDamageUpdate/);
  assert.match(earthquake, /applyTileUpdates\(restoredTiles\)/);
  assert.doesNotMatch(
    earthquake.slice(
      earthquake.indexOf("_findDugRubbleCandidates"),
      earthquake.indexOf("_findCeilingCandidates"),
    ),
    /getDugTileKeys/,
  );
  const rubbleRestoreUpdate = earthquake.slice(
    earthquake.indexOf("_updateRubbleRestoration"),
    earthquake.indexOf("_showTrapGuidance"),
  );
  assert.match(rubbleRestoreUpdate, /if \(!this\._restoreQueue\.length\)/);
  assert.match(rubbleRestoreUpdate, /restoreDueAt/);
  assert.match(rubbleRestoreUpdate, /processedThisFrame < restoresPerFrame/);
  assert.match(rubbleRestoreUpdate, /processedThisFrame \+= 1/);
  assert.doesNotMatch(rubbleRestoreUpdate, /for \(let i = this\._restoreQueue\.length/);
  assert.match(scar, /signature === this\.lastStaticSignature/);
  assert.match(scar, /skippedRenderCount \+= 1/);
  assert.match(special, /allowFromPaused: options\.kind === "quickResume"/);
  assert.match(teleportOverlay, /createMenuLoadingScreen/);
  assert.match(teleportOverlay, /WORLD_LOAD_COPY/);
  assert.doesNotMatch(teleportOverlay, /createPauseFeatureLoadingView/);
  assert.doesNotMatch(teleportOverlay, /PAUSE_FEATURE_LOADING_CONFIG/);
  assert.doesNotMatch(teleportOverlay, /loadingView\?\.complete/);
  assert.match(teleportOverlay, /targets: this\.root/);
  assert.doesNotMatch(
    titan,
    /dugTiles\?*\.size|dugTiles\.size/,
    "Unrelated mining must not force a full Titan-zone progress rescan",
  );
  assert.match(titan, /invalidateTile\(tx, ty\)/);
  assert.ok(
    update.indexOf("const comboShouldPause")
      < update.indexOf("if (this.teleportTransitionController?.isActive?.())"),
    "Teleport transitions must freeze combo time before returning from the frame",
  );
}

console.log("DEEP_TELEPORT_PERFORMANCE_CONTRACT_OK");
