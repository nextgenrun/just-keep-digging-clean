import assert from "node:assert/strict";
import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";
import { TILE_TYPES } from "../values/tileTypes.js";

function withRandom(values, callback) {
  const original = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)] ?? 0;
  try {
    return callback();
  } finally {
    Math.random = original;
  }
}

function randomForInt(target, min, max) {
  return (target - min + 0.1) / (max - min + 1);
}

function makeBareSystem(overrides = {}) {
  const system = Object.create(EarthquakeSystem.prototype);
  system.config = {
    ...EARTHQUAKE_CONFIG,
    worldSpawn: { ...EARTHQUAKE_CONFIG.worldSpawn },
    playerFeedback: { ...EARTHQUAKE_CONFIG.playerFeedback },
    ...overrides,
  };
  return system;
}

{
  const system = makeBareSystem({
    worldSpawn: {
      ...EARTHQUAKE_CONFIG.worldSpawn,
      horizontalMarginTiles: 0,
      bottomMarginTiles: 1,
      randomCandidateAttempts: 1,
      cavitySearchAttempts: 0,
    },
  });
  const player = { tx: 4, ty: 12 };
  system.scene = {
    config: { topAirRows: 10 },
    playerController: { getPlayerTile: () => player },
    worldModel: {
      widthTiles: 100,
      depthTiles: 100,
      topAirRows: 10,
      inBounds: (tx, ty) => tx >= 0 && tx < 100 && ty >= 0 && ty < 100,
      getTileType: (tx, ty) => (
        tx === 70 && (ty === 60 || ty === 61) ? TILE_TYPES.AIR : TILE_TYPES.DIRT
      ),
    },
  };

  const epicenter = withRandom([
    randomForInt(70, 0, 99),
    randomForInt(60, 10, 98),
  ], () => system._selectWorldEpicenter());

  assert.deepEqual(epicenter, { tx: 70, ty: 60, depth: 51 });
  assert.notDeepEqual(
    { tx: epicenter.tx, ty: epicenter.ty },
    player,
    "world epicenter must be selected without using the player tile"
  );
}

{
  const damaged = [];
  let rewardCount = 0;
  const system = makeBareSystem({
    radiusTiles: 0,
    worldSpawn: { ...EARTHQUAKE_CONFIG.worldSpawn, mutationSampleAttempts: 1 },
    intensities: { minor: { mutationsPerPulse: 1 } },
  });
  system.epicenter = { tx: 70, ty: 60, depth: 51 };
  system.intensity = "minor";
  system._hasAdjacentAir = () => true;
  system._isUnstable = () => false;
  system._emitDust = () => {};
  system.scene = {
    config: { topAirRows: 10, seed: 1 },
    playerController: { getPlayerTile: () => ({ tx: 4, ty: 12 }) },
    worldModel: {
      getTileType: () => TILE_TYPES.DIRT,
      getTileHp: () => 10,
      damageTile: (tx, ty) => {
        damaged.push({ tx, ty });
        return { destroyed: true, hp: 0, typeBeforeDamage: TILE_TYPES.DIRT, wasRubble: false };
      },
    },
    worldRenderer: { applyTileUpdate() {} },
    digSystem: { processDestroyedTile: () => { rewardCount += 1; } },
  };

  withRandom([0.5], () => system._mutateNearbyTiles());
  assert.deepEqual(damaged, [{ tx: 70, ty: 60 }], "mutations must radiate from the world epicenter");
  assert.equal(rewardCount, 0, "remote world damage must not grant player mining rewards");
}

{
  const system = makeBareSystem();
  system.epicenter = { tx: 70, ty: 60, depth: 51 };
  system._getPlayerOccupiedTileKeys = () => new Set();
  system.scene = {
    playerController: { getPlayerTile: () => ({ tx: 4, ty: 12 }) },
    worldModel: {
      getDugTileKeys: () => ["70,60", "74,60", "4,12"],
      inBounds: () => true,
      getTileType: () => TILE_TYPES.AIR,
      getDugTileSource: (tx, ty) => ({ tx, ty, type: TILE_TYPES.DIRT, maxHp: 10 }),
    },
  };

  const candidates = withRandom([0], () => system._findDugRubbleCandidates(10, 5));
  assert.deepEqual(
    candidates.map(({ tx, ty }) => `${tx},${ty}`),
    ["70,60", "74,60"],
    "aftermath rubble must be selected around the epicenter, not the player"
  );
}

{
  const system = makeBareSystem({
    worldSpawn: {
      ...EARTHQUAKE_CONFIG.worldSpawn,
      ceilingSearchHalfWidthTiles: 0,
      ceilingSearchAboveTiles: 0,
      ceilingSearchBelowTiles: 0,
      maxAirDropTiles: 2,
      caveInSpacingTiles: 1,
    },
  });
  system.epicenter = { tx: 70, ty: 60, depth: 51 };
  system._isUnstable = () => false;
  system.scene = {
    playerController: { getPlayerTile: () => ({ tx: 4, ty: 12 }) },
    worldModel: {
      getTileType: (tx, ty) => {
        if (tx === 70 && (ty === 60 || ty === 61)) return TILE_TYPES.AIR;
        if (tx === 70 && ty === 59) return TILE_TYPES.DIRT;
        return TILE_TYPES.BEDROCK;
      },
    },
  };

  const candidates = withRandom([0], () => system._findCeilingCandidates(1));
  assert.deepEqual(
    candidates.map(({ tx, ty }) => ({ tx, ty })),
    [{ tx: 70, ty: 59 }],
    "cave-ins must be discovered above the world epicenter"
  );
}

{
  const shakes = [];
  const system = makeBareSystem();
  system.state = "earthquake";
  system.epicenter = { tx: 80, ty: 80, depth: 71 };
  system.intensity = "medium";
  system.scene = {
    playerController: { getPlayerTile: () => ({ tx: 4, ty: 12 }) },
    shakeSystem: { _active: false, shake: (...args) => shakes.push(args) },
  };

  assert.equal(system.isPlayerAware(), false, "far-away quakes should not activate player HUD feedback");
  system._quakeFx(0);
  assert.equal(shakes.length, 0, "far-away quakes should not shake the camera");

  system.epicenter = { tx: 8, ty: 12, depth: 3 };
  assert.equal(system.isPlayerAware(), true, "nearby world quakes should remain player-readable");
  system._quakeFx(0);
  assert.equal(shakes[0][0], "earthquake.moderate");
  assert.ok(shakes[0][1] > 0 && shakes[0][1] <= 1);
}

{
  let guidanceCount = 0;
  const system = makeBareSystem();
  system._emitDust = () => {};
  system._showTrapGuidance = () => { guidanceCount += 1; };
  system._restoreQueue = [{
    tx: 70, ty: 60, type: TILE_TYPES.DIRT, hp: 2, maxHp: 10,
    delayMs: 0, scheduledAt: 0, source: "dug",
  }];
  system.scene = {
    playerController: { getPlayerTile: () => ({ tx: 4, ty: 12 }) },
    worldModel: {
      getTileType: () => TILE_TYPES.AIR,
      setRubbleTile: () => true,
    },
    worldRenderer: { applyTileUpdate() {} },
    earthquakeHazardOverlay: { markRestoredRubble() {} },
    queueDugTilesSave() {},
  };
  system._isPlayerOccupiedTile = () => false;

  system._updateRubbleRestoration(16);
  assert.equal(guidanceCount, 0, "remote rubble must not claim that the player is trapped");
}

console.log("earthquake world epicenter smoke test passed");
