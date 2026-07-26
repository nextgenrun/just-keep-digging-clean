import assert from "node:assert/strict";

import { LightSystem } from "../systems/lighting/LightSystem.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const tileSize = 94;
const starTile = Object.freeze({ tx: 8, ty: 5 });
const geodeTile = Object.freeze({ tx: 9, ty: 5 });
const playerTile = Object.freeze({ tx: 0, ty: 0 });
const worldModel = {
  width: 12,
  depth: 10,
  getTileType(tx, ty) {
    if (tx === starTile.tx && ty === starTile.ty) return TILE_TYPES.SKY_TILE;
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
const graphicsCalls = [];
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
const beaconGraphics = {
  lineStyle(width, color, alpha) {
    graphicsCalls.push({ type: "lineStyle", width, color, alpha });
    return this;
  },
  strokeEllipse(x, y, width, height) {
    graphicsCalls.push({ type: "strokeEllipse", x, y, width, height });
    return this;
  },
  fillStyle(color, alpha) {
    graphicsCalls.push({ type: "fillStyle", color, alpha });
    return this;
  },
  fillCircle(x, y, radius) {
    graphicsCalls.push({ type: "fillCircle", x, y, radius });
    return this;
  },
  beginPath() {
    graphicsCalls.push({ type: "beginPath" });
    return this;
  },
  moveTo(x, y) {
    graphicsCalls.push({ type: "moveTo", x, y });
    return this;
  },
  lineTo(x, y) {
    graphicsCalls.push({ type: "lineTo", x, y });
    return this;
  },
  strokePath() {
    graphicsCalls.push({ type: "strokePath" });
    return this;
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
lightSystem._skyBeaconGraphics = beaconGraphics;

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
  LIGHT_CONFIG.skyTileLights.beaconPulse.radiusBoostTiles >= 5.5,
  "the beacon wave must travel far beyond the permanent core glow"
);
assert.equal(
  LIGHT_CONFIG.skyTileLights.beaconPulse.visuals.enabled,
  true,
  "the darkness reveal must be paired with a visible constellation ring and source flare"
);

const pulseConfig = LIGHT_CONFIG.skyTileLights.beaconPulse;
const pulseSearchEnd = pulseConfig.windowMs * 2;
let quietTime = null;
let peakPulse = null;
let expandingPulse = null;
let flarePulse = null;
for (let time = 0; time <= pulseSearchEnd; time += 10) {
  const pulse = lightSystem._resolveTileBeaconPulse(
    time,
    starTile.tx,
    starTile.ty,
    pulseConfig
  );
  if (!pulse && quietTime === null) quietTime = time;
  if (pulse && (!peakPulse || pulse.strength > peakPulse.pulse.strength)) {
    peakPulse = { time, pulse };
  }
  if (pulse && (!expandingPulse || Math.abs(pulse.progress - 0.55) < Math.abs(expandingPulse.pulse.progress - 0.55))) {
    expandingPulse = { time, pulse };
  }
  if (
    pulse
    && (
      !flarePulse
      || Math.abs(pulse.progress - pulseConfig.flarePeakProgress)
        < Math.abs(flarePulse.pulse.progress - pulseConfig.flarePeakProgress)
    )
  ) {
    flarePulse = { time, pulse };
  }
}

assert.notEqual(quietTime, null, "the beacon must retain a quiet interval between pulses");
assert.ok(peakPulse?.pulse.strength > 0.98, "the beacon pulse must reach a clear visual peak");
assert.ok(
  expandingPulse?.pulse.progress > 0.5 && expandingPulse.pulse.progress < 0.6,
  "the pulse contract must expose a useful expanding-wave phase"
);
assert.ok(
  flarePulse?.pulse.flareStrength > 0.98,
  "the Northstar source flare must reach a clear peak before the ring travels outward"
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
  eraseCalls[1].alpha >= 0.12,
  "the distant beacon halo must remain readable while it expands"
);
const ringStroke = graphicsCalls.find((call) => call.type === "strokeEllipse");
assert.ok(ringStroke, "an active beacon must draw a visible constellation ring");
assert.ok(
  ringStroke.width > tileSize * 10,
  "the visible ring must already span more than ten tiles midway through its slow journey"
);
assert.ok(
  graphicsCalls.filter((call) => call.type === "fillCircle").length
    >= pulseConfig.visuals.sparkCount,
  "the traveling ring must carry its configured constellation spark points"
);

eraseCalls.length = 0;
graphicsCalls.length = 0;
lightSystem._eraseTileTypeLightSources({
  time: flarePulse.time,
  lighting: { undergroundDarknessInfluence: 1 },
  camera,
  darkness,
  playerTile,
  playerVisionRadiusTiles: LIGHT_CONFIG.minVisibilityRadiusTiles,
  cfg: LIGHT_CONFIG.skyTileLights,
  tileTypes: new Set([TILE_TYPES.SKY_TILE]),
});
assert.ok(
  graphicsCalls.filter((call) => call.type === "strokePath").length >= 2,
  "the pulse opening must draw soft and crisp Northstar flare rays at the real source"
);

const neighboringPulseTimes = [];
for (let time = 0; time <= pulseConfig.windowMs; time += 10) {
  const pulse = lightSystem._resolveTileBeaconPulse(
    time,
    starTile.tx + 1,
    starTile.ty,
    pulseConfig
  );
  if (pulse && pulse.strength > 0.98) neighboringPulseTimes.push(time);
}
assert.ok(
  neighboringPulseTimes.length > 0
    && Math.abs(neighboringPulseTimes[0] - peakPulse.time) > 250,
  "coordinate-seeded pulse timing must keep nearby Star Blocks from flashing in sync"
);

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

console.log("Star Block light persistence contract passed: steady hard-darkness light plus staggered long-range beacon pulses");
