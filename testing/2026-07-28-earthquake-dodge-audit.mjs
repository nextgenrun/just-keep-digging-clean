import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import {
  expandFallZoneCandidate,
  rockSweptAabbCrossesBody,
} from "../systems/environment/earthquakeFallZoneMath.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../values/earthquakeFeedback.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TILE_SIZE = 94;
const PLAYER_BODY = Object.freeze({ width: 31, height: 75 });
const BASE_MOVE_SPEED = 200;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function solveFallSeconds(distancePx) {
  const falling = EARTHQUAKE_CONFIG.fallingRock;
  return (
    -falling.initialVelocityPxPerSecond
    + Math.sqrt(
      falling.initialVelocityPxPerSecond ** 2
      + 2 * falling.gravityPxPerSecondSq * distancePx,
    )
  ) / falling.gravityPxPerSecondSq;
}

function makeBareSystem(scene, config = EARTHQUAKE_CONFIG) {
  const system = Object.create(EarthquakeSystem.prototype);
  system.scene = scene;
  system.config = config;
  system.fallingRocks = [];
  system.caveIns = [];
  system.impactCooldown = 0;
  system._restoreQueue = [];
  system._trapGuidanceShown = false;
  system._log = () => {};
  system._emitDust = () => {};
  return system;
}

const falling = EARTHQUAKE_CONFIG.fallingRock;
const dangerHalfWidth =
  PLAYER_BODY.width / 2 + TILE_SIZE * falling.hitboxWidthTiles / 2;
const baseEscapeMs = (dangerHalfWidth / BASE_MOVE_SPEED) * 1000;
const minimumFallMs = solveFallSeconds(
  EARTHQUAKE_CONFIG.worldSpawn.minAirDropTiles * TILE_SIZE,
) * 1000;
const maximumFallMs = solveFallSeconds(
  EARTHQUAKE_CONFIG.worldSpawn.maxAirDropTiles * TILE_SIZE,
) * 1000;

assert.equal(EARTHQUAKE_CONFIG.caveInWarningMs, 1800);
assert.ok(baseEscapeMs < minimumFallMs);
assert.ok(minimumFallMs > 430 && minimumFallMs < 450);
assert.ok(maximumFallMs > 930 && maximumFallMs < 945);
assert.ok(
  EARTHQUAKE_CONFIG.caveInWarningMs + minimumFallMs > baseEscapeMs * 8,
  "The shortest valid fall zone must leave ample current-speed dodge time",
);

const coverage = Object.entries(EARTHQUAKE_CONFIG.intensities).map(
  ([intensity, config]) => {
    const collapseWidth = EARTHQUAKE_CONFIG.collapseWidths[intensity];
    const maximumDamagingRocks = config.caveIns[1] * collapseWidth;
    return {
      intensity,
      collapseWidth,
      maximumDamagingRocks,
      mechanicCapacity: EARTHQUAKE_CONFIG.maxConcurrentFallZones,
      visualCapacity: EARTHQUAKE_FEEDBACK_CONFIG.hazards.maxFallZones,
      fullyCovered:
        maximumDamagingRocks <= EARTHQUAKE_CONFIG.maxConcurrentFallZones
        && maximumDamagingRocks
          <= EARTHQUAKE_FEEDBACK_CONFIG.hazards.maxFallZones,
    };
  },
);
assert.equal(coverage.every(entry => entry.fullyCovered), true);
assert.equal(
  coverage.find(entry => entry.intensity === "cataclysmic")
    .maximumDamagingRocks,
  21,
);

const gridModel = {
  getTileType(tx, ty) {
    if (ty === 5 && tx >= 10 && tx <= 12) return TILE_TYPES.STONE;
    if (ty === 6 && tx >= 10 && tx <= 12) return TILE_TYPES.AIR;
    if (ty === 7 && tx >= 10 && tx <= 11) return TILE_TYPES.AIR;
    return TILE_TYPES.DIRT;
  },
  getTileHp() {
    return 10;
  },
};
const expandedZones = expandFallZoneCandidate({
  candidate: { tx: 10, ty: 5 },
  intensity: "cataclysmic",
  widths: EARTHQUAKE_CONFIG.collapseWidths,
  worldModel: gridModel,
  airType: TILE_TYPES.AIR,
  minimumAirTiles: EARTHQUAKE_CONFIG.worldSpawn.minAirDropTiles,
  maximumAirTiles: EARTHQUAKE_CONFIG.worldSpawn.maxAirDropTiles,
  isMutableType: type => type === TILE_TYPES.STONE,
});
assert.deepEqual(
  expandedZones.map(zone => [zone.tx, zone.landingTy]),
  [[10, 8], [11, 8]],
  "Every wide-collapse column must independently earn a valid landing",
);

const body = {
  x: 500 - PLAYER_BODY.width / 2,
  y: 450,
  w: PLAYER_BODY.width,
  h: PLAYER_BODY.height,
};
const centeredRock = {
  x: 500,
  previousY: 430,
  y: 470,
};
assert.equal(
  rockSweptAabbCrossesBody({
    rock: centeredRock,
    body,
    hitboxWidth: TILE_SIZE * falling.hitboxWidthTiles,
    hitboxHeight: TILE_SIZE * falling.hitboxHeightTiles,
  }),
  true,
);
assert.equal(
  rockSweptAabbCrossesBody({
    rock: { ...centeredRock, x: 500 + dangerHalfWidth + 1 },
    body,
    hitboxWidth: TILE_SIZE * falling.hitboxWidthTiles,
    hitboxHeight: TILE_SIZE * falling.hitboxHeightTiles,
  }),
  false,
);

const collisionScene = {
  config: { tileSize: TILE_SIZE },
  gameState: "playing",
  playerController: {
    physicsBody: body,
    drainAllGemPower(options) {
      assert.deepEqual(options, { source: "fallingRock", hazard: true });
      this.drainCalls = (this.drainCalls || 0) + 1;
      return 84;
    },
    applyExternalKnockback(x, y) {
      this.knockback = { x, y };
    },
  },
  shakeSystem: { shake() {} },
};
const collisionSystem = makeBareSystem(collisionScene);
collisionSystem.fallingRocks.push({
  id: 1,
  tx: 5,
  ty: 4,
  landingTy: 7,
  type: TILE_TYPES.STONE,
  x: 500,
  y: 440,
  previousY: 430,
  endY: 600,
  vy: 200,
  angle: 0,
  hit: false,
});
collisionSystem._updateFallingRocks(100);
assert.equal(collisionScene.playerController.drainCalls, 1);
assert.deepEqual(collisionScene.playerController.knockback, {
  x: falling.knockbackX,
  y: falling.knockbackY,
});

let setRubbleCalls = 0;
const occupiedScene = {
  config: { tileSize: TILE_SIZE },
  worldModel: {
    getTileType() {
      return TILE_TYPES.AIR;
    },
    setRubbleTile() {
      setRubbleCalls += 1;
      return true;
    },
  },
  worldRenderer: { applyTileUpdate() {} },
};
const occupiedSystem = makeBareSystem(occupiedScene);
occupiedSystem._isPlayerOccupiedTile = () => true;
occupiedSystem._restoreQueue.push({
  tx: 8,
  ty: 12,
  type: TILE_TYPES.STONE,
  hp: 1,
  maxHp: 4,
  delayMs: 0,
  scheduledAt: performance.now() - 1000,
  source: "cave-in",
});
occupiedSystem._updateRubbleRestoration(16);
assert.equal(setRubbleCalls, 0);
assert.equal(
  occupiedSystem._restoreQueue.length,
  1,
  "Occupied rubble must remain queued for a bounded retry",
);
assert.equal(
  occupiedSystem._restoreQueue[0].delayMs,
  EARTHQUAKE_CONFIG.rubbleOccupiedRetryMs,
);

const systemSource = read("systems/environment/EarthquakeSystem.js");
const overlaySource = read("systems/visual/EarthquakeFallZoneView.js");
const impactSource = read("systems/visual/EarthquakeRockImpactView.js");
const updateSource = read("world/playScene/PlaySceneUpdate.js");
const collapseSource = systemSource.slice(
  systemSource.indexOf("  _collapse(caveIn)"),
  systemSource.indexOf(
    "  _recordOpenedPassage",
    systemSource.indexOf("  _collapse(caveIn)"),
  ),
);

assert.ok(
  updateSource.indexOf("this.playerController.update(delta)")
    < updateSource.indexOf("this.earthquakeSystem?.update(delta)"),
  "Current-frame movement must resolve before falling-rock collision",
);
assert.ok(systemSource.includes("_queueCaveInGroup(candidate"));
assert.ok(systemSource.includes("expandFallZoneCandidate({"));
assert.doesNotMatch(collapseSource, /caveIn\.tx \+ offset/);
assert.ok(systemSource.includes("endY: landingTy * ts"));
assert.ok(systemSource.includes("earthquakeTileFeedbackSystem?.showCaveInFracture"));
assert.ok(overlaySource.includes("assets.landingFootprint.key"));
assert.ok(overlaySource.includes("assets.fallingBoulder.key"));
assert.ok(impactSource.includes("assets.impactDebris.key"));
assert.ok(!overlaySource.includes("add.graphics"));
assert.ok(!impactSource.includes("add.graphics"));
assert.ok(!overlaySource.includes("lineBetween"));
assert.ok(!systemSource.includes("add.rectangle"));

console.log(JSON.stringify({
  verdict: {
    collision: "leading-edge swept AABB",
    dodge: "current-frame movement resolves first",
    coverage: "one authored footprint per validated damaging column",
    rubble: "occupied restoration retries instead of disappearing",
  },
  geometry: {
    dangerWidthPx: Number((dangerHalfWidth * 2).toFixed(2)),
    baseEscapeMs: Number(baseEscapeMs.toFixed(1)),
    fallWindowMs: [
      Number(minimumFallMs.toFixed(1)),
      Number(maximumFallMs.toFixed(1)),
    ],
    localWarningToImpactMs: [
      Number((EARTHQUAKE_CONFIG.caveInWarningMs + minimumFallMs).toFixed(1)),
      Number((EARTHQUAKE_CONFIG.caveInWarningMs + maximumFallMs).toFixed(1)),
    ],
  },
  coverage,
}, null, 2));
console.log("Earthquake dodge audit passed.");
