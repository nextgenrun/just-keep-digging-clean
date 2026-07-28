import assert from "node:assert/strict";

import { LightSystem } from "../systems/lighting/LightSystem.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const tileSize = 94;
const starTile = Object.freeze({ tx: 8, ty: 5 });
const neighboringStarTile = Object.freeze({ tx: 7, ty: 5 });
const geodeTile = Object.freeze({ tx: 9, ty: 5 });
const playerTile = Object.freeze({ tx: 0, ty: 0 });
let includeNeighboringStar = false;
const worldModel = {
  width: 12,
  depth: 10,
  getTileType(tx, ty) {
    if (tx === starTile.tx && ty === starTile.ty) return TILE_TYPES.SKY_TILE;
    if (
      includeNeighboringStar
      && tx === neighboringStarTile.tx
      && ty === neighboringStarTile.ty
    ) {
      return TILE_TYPES.SKY_TILE;
    }
    if (tx === geodeTile.tx && ty === geodeTile.ty) return TILE_TYPES.GEODE_INTERIOR;
    return TILE_TYPES.AIR;
  },
};
const camera = {
  scrollX: 0,
  scrollY: 0,
  zoomX: 1,
  zoomY: 1,
  worldView: {
    x: 0,
    y: 0,
    width: worldModel.width * tileSize,
    height: worldModel.depth * tileSize,
  },
  matrix: {
    transformPoint(x, y, output) {
      output.x = x;
      output.y = y;
    },
  },
};
const eraser = {
  width: 0,
  height: 0,
  alpha: 0,
  setDisplaySize(width, height) {
    this.width = width;
    this.height = height;
    return this;
  },
  setAlpha(alpha) {
    this.alpha = alpha;
    return this;
  },
};
const eraseCalls = [];
const pulseRenderCalls = [];
const darkness = {
  erase(image, x, y) {
    eraseCalls.push({
      x,
      y,
      alpha: image.alpha,
      width: image.width,
      height: image.height,
    });
  },
};
const beaconPulseRenderer = {
  draw(payload) {
    pulseRenderCalls.push(payload);
    return true;
  },
};
const lightSystem = Object.create(LightSystem.prototype);
lightSystem.config = LIGHT_CONFIG;
lightSystem.scene = {
  config: { tileSize },
  worldModel,
};
lightSystem._crystalEraser = eraser;
lightSystem._crystalScreenPoint = { x: 0, y: 0 };
lightSystem._skyBeaconPulseRenderer = beaconPulseRenderer;

assert.equal(
  LIGHT_CONFIG.skyTileLights.persistThroughDarkness,
  true,
  "Star Blocks must be independent light sources rather than extensions of player vision"
);
assert.equal(
  LIGHT_CONFIG.skyTileLights.beaconPulse.enabled,
  true,
  "Star Blocks must retain their occasional long-range beacon pulse"
);
assert.ok(
  LIGHT_CONFIG.skyTileLights.beaconPulse.durationMs >= 5000,
  "the beacon wave must travel slowly enough for a distant player to notice it"
);
assert.ok(
  LIGHT_CONFIG.skyTileLights.beaconPulse.windowMs >= 40000,
  "beacon windows must leave long quiet gaps"
);
assert.ok(
  LIGHT_CONFIG.skyTileLights.beaconPulse.chancePerWindow <= 0.2,
  "only a small random share of beacon windows may emit"
);
assert.equal(
  LIGHT_CONFIG.skyTileLights.beaconPulse.maxConcurrentPulses,
  1,
  "multiple Star Block pulses must never stack on-screen"
);
assert.ok(
  LIGHT_CONFIG.skyTileLights.beaconPulse.radiusBoostTiles >= 5.5,
  "the beacon wave must travel far beyond the permanent core glow"
);
assert.equal(
  LIGHT_CONFIG.skyTileLights.beaconPulse.visuals.enabled,
  true,
  "the darkness reveal must retain a visible traveling ring"
);
assert.ok(
  LIGHT_CONFIG.skyTileLights.beaconPulse.revealAlpha <= 0.1,
  "the expanding darkness reveal must remain restrained"
);
assert.ok(
  LIGHT_CONFIG.skyTileLights.beaconPulse.visuals.ringOpacity <= 0.2,
  "the visible ring must remain faint rather than dominating the scene"
);
assert.ok(
  LIGHT_CONFIG.skyTileLights.beaconPulse.durationMs >= 8000,
  "the beacon wave must travel slowly enough for its long-distance fade to read"
);
assert.equal(
  LIGHT_CONFIG.skyTileLights.beaconPulse.visuals.artSource,
  "ImageGen",
  "the visible pulse must use approved ImageGen artwork rather than procedural geometry"
);
assert.equal(
  LIGHT_CONFIG.skyTileLights.beaconPulse.visuals.rarityAssets.length,
  6,
  "every production Star Block colour must own an ImageGen pulse sprite"
);
assert.equal(
  Object.keys(LIGHT_CONFIG.skyTileLights.beaconPulse.visuals)
    .some((key) => key.startsWith("flare")),
  false,
  "Northstar cross-flare configuration must be removed entirely"
);

const pulseConfig = LIGHT_CONFIG.skyTileLights.beaconPulse;
const sampledWindowCount = 160;
const activeWindowIndices = [];
const neighboringActiveWindowIndices = [];
const quietTime = 0;
let peakPulse = null;
let expandingPulse = null;
let nearTravelPulse = null;
let farTravelPulse = null;
for (let cycle = 0; cycle < sampledWindowCount; cycle += 1) {
  let activeInWindow = false;
  let neighboringActiveInWindow = false;
  for (let offset = 0; offset < pulseConfig.windowMs; offset += 50) {
    const time = cycle * pulseConfig.windowMs + offset;
    const pulse = lightSystem._resolveTileBeaconPulse(
      time,
      starTile.tx,
      starTile.ty,
      pulseConfig
    );
    const neighboringPulse = lightSystem._resolveTileBeaconPulse(
      time,
      neighboringStarTile.tx,
      neighboringStarTile.ty,
      pulseConfig
    );
    if (pulse) {
      activeInWindow = true;
      if (!peakPulse || pulse.waveStrength > peakPulse.pulse.waveStrength) {
        peakPulse = { time, pulse };
      }
      if (
        !expandingPulse
        || Math.abs(pulse.progress - 0.55)
          < Math.abs(expandingPulse.pulse.progress - 0.55)
      ) {
        expandingPulse = { time, pulse };
      }
      if (
        !nearTravelPulse
        || Math.abs(pulse.progress - 0.25)
          < Math.abs(nearTravelPulse.pulse.progress - 0.25)
      ) {
        nearTravelPulse = { time, pulse };
      }
      if (
        !farTravelPulse
        || Math.abs(pulse.progress - 0.75)
          < Math.abs(farTravelPulse.pulse.progress - 0.75)
      ) {
        farTravelPulse = { time, pulse };
      }
    }
    if (neighboringPulse) neighboringActiveInWindow = true;
  }
  if (activeInWindow) activeWindowIndices.push(cycle);
  if (neighboringActiveInWindow) neighboringActiveWindowIndices.push(cycle);
}

assert.equal(
  lightSystem._resolveTileBeaconPulse(
    quietTime,
    starTile.tx,
    starTile.ty,
    pulseConfig
  ),
  null,
  "every beacon window must begin with a quiet interval"
);
assert.ok(activeWindowIndices.length > 0, "the rare pulse must still occur sometimes");
assert.ok(
  activeWindowIndices.length < sampledWindowCount * 0.25,
  "the deterministic random schedule must leave most windows completely quiet"
);
assert.notDeepEqual(
  activeWindowIndices,
  neighboringActiveWindowIndices,
  "nearby Star Blocks must use different random emission windows"
);
assert.ok(
  peakPulse?.pulse.waveStrength > 0.85,
  "the fading travel envelope must still become readable near the Star Block"
);
assert.ok(
  expandingPulse?.pulse.progress > 0.5 && expandingPulse.pulse.progress < 0.6,
  "the pulse contract must expose a useful expanding-wave phase"
);
assert.ok(
  nearTravelPulse?.pulse.waveStrength > farTravelPulse?.pulse.waveStrength,
  "the wave must fade as it travels farther from its Star Block"
);
assert.equal(
  Object.hasOwn(peakPulse.pulse, "flareStrength"),
  false,
  "resolved pulses must not expose the removed cross-flare animation"
);

lightSystem._eraseTileTypeLightSources({
  time: quietTime,
  lighting: { undergroundDarknessInfluence: 1 },
  camera,
  darkness,
  playerTile,
  playerVisionRadiusTiles: LIGHT_CONFIG.minVisibilityRadiusTiles,
  cfg: LIGHT_CONFIG.skyTileLights,
  tileTypes: new Set([TILE_TYPES.SKY_TILE]),
});

assert.equal(
  eraseCalls.length,
  1,
  "an in-view Star Block must still erase darkness far beyond the player's abyss vision radius"
);
assert.deepEqual(
  { x: eraseCalls[0].x, y: eraseCalls[0].y },
  {
    x: (starTile.tx + 0.5) * tileSize,
    y: (starTile.ty + 0.5) * tileSize,
  },
  "the persistent light must stay centered on the authoritative Star Block cell"
);
assert.ok(
  eraseCalls[0].alpha >= 0.65,
  "the Star Block core must remain clearly readable against hard-black underground darkness"
);
assert.ok(
  eraseCalls[0].height < eraseCalls[0].width,
  "the light pool should use a restrained vertical scale instead of a flat circular spotlight"
);

eraseCalls.length = 0;
lightSystem._eraseTileTypeLightSources({
  time: expandingPulse.time,
  lighting: { undergroundDarknessInfluence: 1 },
  camera,
  darkness,
  playerTile,
  playerVisionRadiusTiles: LIGHT_CONFIG.minVisibilityRadiusTiles,
  cfg: LIGHT_CONFIG.skyTileLights,
  tileTypes: new Set([TILE_TYPES.SKY_TILE]),
});
assert.equal(
  eraseCalls.length,
  2,
  "an active Star Block beacon must add a second expanding halo over its steady core"
);
assert.ok(
  eraseCalls[1].width > eraseCalls[0].width * 2.3,
  "the beacon halo must expand far enough to identify the Star Block from a distance"
);
assert.ok(
  eraseCalls[1].alpha >= 0.025 && eraseCalls[1].alpha <= 0.07,
  "the distant beacon halo must fade while remaining deliberately readable"
);
const renderedPulse = pulseRenderCalls[0];
assert.ok(renderedPulse, "an active beacon must request a visible constellation ring");
assert.ok(
  renderedPulse.pulseRadiusTiles * tileSize * 2 > tileSize * 10,
  "the visible ring must already span more than ten tiles midway through its slow journey"
);
assert.equal(
  renderedPulse.rarity,
  0,
  "the traveling wave must receive the source Star Block rarity colour"
);
assert.equal(
  Object.hasOwn(renderedPulse, "flareStrength"),
  false,
  "the traveling pulse render request must never carry a cross-flare path"
);

let overlappingPulseTime = null;
for (let cycle = 0; cycle < 1600 && overlappingPulseTime === null; cycle += 1) {
  for (let offset = 0; offset < pulseConfig.windowMs; offset += 100) {
    const time = cycle * pulseConfig.windowMs + offset;
    const pulse = lightSystem._resolveTileBeaconPulse(
      time,
      starTile.tx,
      starTile.ty,
      pulseConfig
    );
    const neighboringPulse = lightSystem._resolveTileBeaconPulse(
      time,
      neighboringStarTile.tx,
      neighboringStarTile.ty,
      pulseConfig
    );
    if (pulse?.waveStrength > 0.5 && neighboringPulse?.waveStrength > 0.5) {
      overlappingPulseTime = time;
      break;
    }
  }
}
assert.notEqual(
  overlappingPulseTime,
  null,
  "the test schedule must contain a deterministic overlapping-pulse opportunity"
);

includeNeighboringStar = true;
eraseCalls.length = 0;
pulseRenderCalls.length = 0;
lightSystem._eraseTileTypeLightSources({
  time: overlappingPulseTime,
  lighting: { undergroundDarknessInfluence: 1 },
  camera,
  darkness,
  playerTile,
  playerVisionRadiusTiles: LIGHT_CONFIG.minVisibilityRadiusTiles,
  cfg: LIGHT_CONFIG.skyTileLights,
  tileTypes: new Set([TILE_TYPES.SKY_TILE]),
});
assert.equal(
  eraseCalls.length,
  3,
  "two steady cores may render, but only one expanding darkness halo may be active"
);
assert.equal(
  pulseRenderCalls.length,
  1,
  "only one textured ring may render even when two schedules overlap"
);
includeNeighboringStar = false;

eraseCalls.length = 0;
lightSystem._eraseTileTypeLightSources({
  time: quietTime,
  lighting: { undergroundDarknessInfluence: 1 },
  camera,
  darkness,
  playerTile,
  playerVisionRadiusTiles: LIGHT_CONFIG.minVisibilityRadiusTiles,
  cfg: LIGHT_CONFIG.geodeTileLights,
  tileTypes: new Set([TILE_TYPES.GEODE_INTERIOR]),
});
assert.equal(
  eraseCalls.length,
  0,
  "the Star Block exception must not make every geological light source reveal the whole viewport"
);

console.log("Star Block light persistence contract passed: steady hard-darkness light plus rare non-stacking outward-fading ImageGen pulses");
