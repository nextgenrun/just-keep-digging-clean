import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  StarScarResourceCollapseFxSystem,
  resolveStarScarCollapseDelayMs,
  selectStarScarCollapseCells,
} from "../systems/visual/StarScarResourceCollapseFxSystem.js";
import { StarScarResourcePresentationSystem } from
  "../systems/visual/StarScarResourcePresentationSystem.js";
import { STAR_SANCTUARY_CONFIG } from "../values/starSanctuary.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldVisualSemanticAssetLayer } from
  "../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js";

const presentationConfig = STAR_SANCTUARY_CONFIG.scar.resourceDepletion.presentation;
assert.equal(STAR_SANCTUARY_CONFIG.scar.visual.groundAlpha, 1);
assert.ok(presentationConfig.maxAnimatedCells > 0);
assert.ok(
  presentationConfig.reducedMotionMaxAnimatedCells
    < presentationConfig.maxAnimatedCells,
);

const spreadConfig = STAR_SANCTUARY_CONFIG.scar.spread;
assert.equal(
  resolveStarScarCollapseDelayMs(spreadConfig.postBreakStartRadiusTiles, spreadConfig),
  0,
);
const middleDelay = resolveStarScarCollapseDelayMs(
  (spreadConfig.postBreakStartRadiusTiles + spreadConfig.postBreakEndRadiusTiles) / 2,
  spreadConfig,
);
assert.ok(middleDelay > 0 && middleDelay < spreadConfig.postBreakDurationMs);
assert.equal(
  resolveStarScarCollapseDelayMs(spreadConfig.postBreakEndRadiusTiles + 20, spreadConfig),
  spreadConfig.postBreakDurationMs,
);

const manyCells = Array.from({ length: 100 }, (_, index) => ({
  tx: index,
  ty: 0,
  distanceTiles: index,
}));
const boundedCells = selectStarScarCollapseCells(
  manyCells,
  presentationConfig.maxAnimatedCells,
);
assert.equal(boundedCells.length, presentationConfig.maxAnimatedCells);
assert.equal(boundedCells[0].tx, 0);
assert.equal(boundedCells.at(-1).tx, 99);

const semanticWorld = {
  topAirRows: 0,
  getTileType() { return TILE_TYPES.COPPER; },
};
const semanticLayer = new WorldVisualSemanticAssetLayer(
  { config: { tileSize: 94, topAirRows: 65 } },
  semanticWorld,
  null,
);
semanticLayer.bedrockLayer = { sync() {}, setLighting() {} };
const shownResources = [];
semanticLayer._showResource = (_index, tx, ty) => shownResources.push(`${tx},${ty}`);
semanticLayer.setResourceDepletionProvider(({ tileX }) => tileX === 0);
semanticLayer.sync(
  { left: 0, top: 0, right: 3, bottom: 1 },
  { terrainTint: 0xffffff },
  false,
);
assert.deepEqual(shownResources, ["1,0", "2,0"]);

const owner = {
  invalidations: 0,
  resourceDepletionProvider: null,
  setResourceDepletionProvider(provider) {
    this.resourceDepletionProvider = provider;
  },
  invalidateResourcePresentation() {
    this.invalidations += 1;
  },
};
const playedCells = [];
const worldModel = {
  tileSize: 10,
  widthTiles: 6,
  depthTiles: 6,
  getTileType() { return TILE_TYPES.COPPER; },
};
const site = { key: "2,2", tx: 2, ty: 2 };
const territorySystem = { getNearestSite() { return site; } };
const scene = {
  worldRenderer: owner,
  cameras: { main: { worldView: { x: 0, y: 0, width: 60, height: 60 } } },
  time: { now: 1000, delayedCall() { throw new Error("nearby collapse cells must play immediately"); } },
  tileDestructionFxSystem: {
    play(payload) {
      playedCells.push(payload);
      return true;
    },
  },
  _starSanctuaryRuntime: null,
};
const presentationSystem = new StarScarResourcePresentationSystem(
  scene,
  worldModel,
  territorySystem,
);
assert.equal(presentationSystem.create(), true);
assert.equal(owner.resourceDepletionProvider({ tileX: 1, tileY: 1 }), false);
scene._starSanctuaryRuntime = {
  system: { enabled: true },
  view: {
    activeSpread: { siteKey: site.key, tx: site.tx, ty: site.ty, startedAtMs: 1000 },
    isResourceCollapsedAt(tileX) { return tileX <= 2; },
  },
};
presentationSystem.update(1000);
assert.equal(owner.resourceDepletionProvider({ tileX: 1, tileY: 1 }), true);
assert.equal(owner.resourceDepletionProvider({ tileX: 5, tileY: 1 }), false);
assert.equal(playedCells.length, 36);
assert.equal(presentationSystem.getSnapshot().scheduledCount, 36);
assert.equal(presentationSystem.getSnapshot().playedCount, 36);
const invalidationsDuringSpread = owner.invalidations;
scene._starSanctuaryRuntime.view.activeSpread = null;
presentationSystem.update(3700);
assert.ok(owner.invalidations > invalidationsDuringSpread);
presentationSystem.destroy();
assert.equal(owner.resourceDepletionProvider, null);

assert.equal(
  new StarScarResourceCollapseFxSystem(
    scene,
    worldModel,
    territorySystem,
  ).getSnapshot().scheduledCount,
  0,
);

const sources = Object.fromEntries(await Promise.all([
  "../systems/visual/StarlessScarView.js",
  "../world/rendering/scenic-world/WorldVisualFeedbackLayer.js",
  "../world/rendering/LevelOneGroundFacadeChunkView.js",
  "../world/rendering/WorldScenicFacadeSystem.js",
  "../world/playScene/PlaySceneSetup.js",
  "../world/playScene/PlaySceneUpdate.js",
  "../world/playScene/PlaySceneLifecycle.js",
  "../testing/2026-08-30-star-consumption-confirmation-harness.js",
].map(async path => [path, await readFile(new URL(path, import.meta.url), "utf8")])));
assert.match(sources["../systems/visual/StarlessScarView.js"], /isResourceCollapsedAt/);
assert.match(sources["../world/rendering/scenic-world/WorldVisualFeedbackLayer.js"], /!resourceDepleted.*maxHp/s);
assert.match(sources["../world/rendering/LevelOneGroundFacadeChunkView.js"], /resourceDepleted \? null/);
assert.match(sources["../world/rendering/WorldScenicFacadeSystem.js"], /!resourceDepleted.*_showCrack/s);
assert.match(sources["../world/playScene/PlaySceneSetup.js"], /StarScarResourcePresentationSystem/);
assert.match(sources["../world/playScene/PlaySceneUpdate.js"], /starScarResourcePresentationSystem\?\.update/);
assert.match(sources["../world/playScene/PlaySceneLifecycle.js"], /starScarResourcePresentationSystem/);
assert.match(
  sources["../testing/2026-08-30-star-consumption-confirmation-harness.js"],
  /resourceBreakSpritePeak/,
);

console.log("star scar resource collapse contract: ok");
