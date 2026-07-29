import assert from "node:assert/strict";

import {
  WeatherImpactParticleController,
} from "../systems/environment/WeatherImpactParticleController.js";
import {
  WeatherImpactRainController,
} from "../systems/environment/WeatherImpactRainController.js";
import {
  WeatherSnowController,
} from "../systems/environment/WeatherSnowController.js";
import {
  WeatherWorldCollision,
} from "../systems/environment/WeatherWorldCollision.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";

const tileSize = 94;
const surfaceTileY = 5;
const deepFloorTileY = 7;
const gapTileX = 4;
const gapCenterX = (gapTileX + 0.5) * tileSize;
const gapRightX = (gapTileX + 1) * tileSize;
const surfaceWorldY = surfaceTileY * tileSize;
const deepFloorWorldY = deepFloorTileY * tileSize;
const sprites = [];

function makeSprite(textureKey = null) {
  const state = {
    textureKey,
    frame: null,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    alpha: 0,
    visible: false,
  };
  const sprite = {
    setTexture(key, frame) {
      state.textureKey = key;
      state.frame = frame;
      return sprite;
    },
    setFrame(frame) {
      state.frame = frame;
      return sprite;
    },
    setOrigin() { return sprite; },
    setScrollFactor() { return sprite; },
    setDepth() { return sprite; },
    setAlpha(alpha) {
      state.alpha = alpha;
      return sprite;
    },
    setVisible(visible) {
      state.visible = visible;
      return sprite;
    },
    setPosition(x, y) {
      state.x = x;
      state.y = y;
      return sprite;
    },
    setDisplaySize(width, height) {
      state.width = width;
      state.height = height;
      return sprite;
    },
    setRotation(rotation) {
      state.rotation = rotation;
      return sprite;
    },
    destroy() {
      state.destroyed = true;
      return sprite;
    },
    _state: state,
  };
  sprites.push(sprite);
  return sprite;
}

const worldModel = {
  isSolid(tileX, tileY) {
    if (tileY === surfaceTileY) return tileX !== gapTileX;
    return tileY === deepFloorTileY;
  },
};
const scene = {
  worldModel,
  add: {
    image(_x, _y, textureKey) {
      return makeSprite(textureKey);
    },
  },
};
const config = {
  tileSize,
  topAirRows: surfaceTileY,
  worldDepthTiles: 20,
  spawnTileX: gapTileX,
};
const collision = new WeatherWorldCollision(scene, config, WEATHER_CONFIG);
const raycastWorldSegment = collision.raycastSegment.bind(collision);
const occlusion = {
  supportsWorldRaycast: true,
  raycastWorldSegment,
  nearestImpactForWorldX: () => ({
    impactWorldY: surfaceWorldY,
    impactSource: "coarse-sample",
  }),
  worldView: {
    x: 0,
    y: 0,
    width: tileSize * 10,
    height: tileSize * 10,
  },
};
const visualAssets = {
  textureKey: "weather-v11-particles-v2",
  frames: SKYLINE_WEATHER_VFX.particleFrames,
  presentation: SKYLINE_WEATHER_VFX.particlePresentation,
};

const solidHit = raycastWorldSegment(
  (gapTileX - 0.5) * tileSize,
  (surfaceTileY - 1) * tileSize,
  (gapTileX - 0.5) * tileSize,
  (surfaceTileY + 1) * tileSize,
);
assert.equal(solidHit.tileY, surfaceTileY);
assert.equal(solidHit.worldY, surfaceWorldY);
assert.equal(solidHit.normalY, -1);

const gapHit = raycastWorldSegment(
  gapCenterX,
  (surfaceTileY - 1) * tileSize,
  gapCenterX,
  (deepFloorTileY + 1) * tileSize,
);
assert.equal(gapHit.tileX, gapTileX);
assert.equal(gapHit.tileY, deepFloorTileY);
assert.equal(gapHit.worldY, deepFloorWorldY);
assert.ok(gapHit.worldY > surfaceWorldY, "AIR shaft must stay traversable");

const diagonalHit = raycastWorldSegment(
  gapCenterX,
  (surfaceTileY - 0.75) * tileSize,
  (gapTileX + 1.25) * tileSize,
  (surfaceTileY + 0.5) * tileSize,
);
assert.equal(diagonalHit.tileX, gapTileX + 1);
assert.equal(diagonalHit.tileY, surfaceTileY);
assert.equal(worldModel.isSolid(diagonalHit.tileX, diagonalHit.tileY), true);

const maskCollision = new WeatherWorldCollision(
  { worldModel: { isSolid: () => false } },
  config,
  {
    ...WEATHER_CONFIG,
    visualCovers: [],
    surfaceLandingMask: {
      enabled: true,
      tileHeight: 6,
      maxSurfaceTileY: 6,
      snapDownMaxTiles: 0,
      offsetZones: [],
      landingYByColumn: [null, 3],
    },
  },
);
const maskBlocker = maskCollision.findFirstBlocker(
  tileSize * 1.5,
  0,
  tileSize * 6,
);
assert.equal(maskBlocker.source, "surfaceMask");
assert.equal(maskBlocker.worldY, tileSize * 3);
const blockedMask = maskCollision.findFirstBlocker(
  tileSize * 0.5,
  tileSize,
  tileSize * 6,
);
assert.equal(blockedMask.source, "surfaceMaskBlocked");
assert.equal(blockedMask.worldY, tileSize);
const maskRayHit = maskCollision.raycastSegment(
  tileSize * 1.5,
  0,
  tileSize * 1.5,
  tileSize * 6,
);
assert.equal(maskRayHit.source, "surfaceMask");
assert.equal(maskRayHit.worldY, tileSize * 3);

const snow = new WeatherSnowController(scene, WEATHER_CONFIG, visualAssets);
const snowSize = WEATHER_CONFIG.snow.sizePx[1];
const snowRadius = snowSize * WEATHER_CONFIG.snow.collisionRadiusScale;
const snowStartY = surfaceWorldY
  - snowRadius
  - WEATHER_CONFIG.snow.hardStopPaddingPx
  - 10;
snow.flakes.push({
  worldX: gapCenterX,
  worldY: snowStartY,
  speedX: 0,
  speedY: 2200,
  driftAmplitude: 0,
  driftPeriodMs: 1,
  driftPhase: 0,
  rotation: 0,
  rotationSpeed: 0,
  size: snowSize,
  alpha: 1,
  impactWorldY: surfaceWorldY,
  impactSource: "coarse-sample",
  sprite: makeSprite(visualAssets.textureKey),
});
snow._updateFlakes(0, 0.1, { occlusion });
const gapSnowEvents = snow.drainImpactEvents();
assert.equal(gapSnowEvents.length, 1);
assert.equal(gapSnowEvents[0].tileX, gapTileX);
assert.equal(gapSnowEvents[0].tileY, deepFloorTileY);
assert.equal(gapSnowEvents[0].worldY, deepFloorWorldY);

snow.flakes.push({
  worldX: gapRightX - snowRadius * 0.5,
  worldY: snowStartY,
  speedX: 0,
  speedY: 220,
  driftAmplitude: 0,
  driftPeriodMs: 1,
  driftPhase: 0,
  rotation: 0,
  rotationSpeed: 0,
  size: snowSize,
  alpha: 1,
  impactWorldY: deepFloorWorldY,
  impactSource: "coarse-sample",
  sprite: makeSprite(visualAssets.textureKey),
});
snow._updateFlakes(0, 0.1, { occlusion });
const edgeSnowEvents = snow.drainImpactEvents();
assert.equal(edgeSnowEvents.length, 1);
assert.equal(edgeSnowEvents[0].tileX, gapTileX + 1);
assert.equal(edgeSnowEvents[0].tileY, surfaceTileY);
assert.equal(edgeSnowEvents[0].worldY, surfaceWorldY);

const sideWallCollision = new WeatherWorldCollision(
  {
    worldModel: {
      isSolid(tileX, tileY) {
        return (tileX === gapTileX + 1 && tileY === surfaceTileY - 1)
          || tileY === deepFloorTileY;
      },
    },
  },
  config,
  WEATHER_CONFIG,
);
const sideWallHit = snow._findSweptImpact(
  { size: snowSize },
  gapRightX - snowRadius - 2,
  surfaceWorldY - 5,
  gapRightX - snowRadius + 2,
  surfaceWorldY - 3,
  {
    raycastWorldSegment: sideWallCollision.raycastSegment.bind(sideWallCollision),
  },
);
assert.equal(sideWallHit.tileX, gapTileX + 1);
assert.equal(sideWallHit.tileY, surfaceTileY - 1);
assert.equal(sideWallHit.normalX, -1);

const rain = new WeatherImpactRainController(
  scene,
  config,
  WEATHER_CONFIG,
  visualAssets,
);
rain.drops.push({
  x: gapRightX - 2,
  y: surfaceWorldY - 12,
  previousX: gapRightX - 2,
  previousY: surfaceWorldY - 12,
  speedX: 0,
  speedY: 220,
  alpha: 1,
  layer: "foreground",
  impactWorldY: deepFloorWorldY,
  impactSource: "coarse-sample",
  sprite: makeSprite(visualAssets.textureKey),
});
rain._updateDrops(0.1, { occlusion });
const rainEvents = rain.drainImpactEvents();
assert.equal(rainEvents.length, 1);
assert.equal(rainEvents[0].tileX, gapTileX + 1);
assert.equal(rainEvents[0].tileY, surfaceTileY);
assert.equal(rainEvents[0].worldY, surfaceWorldY);

const impacts = new WeatherImpactParticleController(
  scene,
  WEATHER_CONFIG,
  visualAssets,
);
impacts._spawnEvent({
  kind: "rain",
  worldX: gapRightX,
  worldY: surfaceWorldY,
  impactSource: "tile",
  normalX: -1,
  normalY: 0,
  alpha: 1,
});
assert.equal(impacts.actors.length, 1, "wall hits must not spawn a flat ground ripple");
assert.equal(
  impacts.actors[0].sprite._state.x,
  gapRightX - WEATHER_CONFIG.splashes.impactVfx.groundOffsetPx,
);
assert.notEqual(impacts.actors[0].sprite._state.rotation, 0);

assert.ok(sprites.length > 0);
snow.destroy();
rain.destroy();
impacts.destroy();

console.log(
  "Weather swept collision contract passed: AIR gaps, tile edges, fast rays, and wall impacts are exact",
);
