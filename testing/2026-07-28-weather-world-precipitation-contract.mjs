import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  GroundEffectsAtmosphere,
} from "../systems/environment/GroundEffectsAtmosphere.js";
import { WeatherDirector } from "../systems/environment/WeatherDirector.js";
import {
  WeatherImpactParticleController,
} from "../systems/environment/WeatherImpactParticleController.js";
import {
  WeatherImpactRainController,
} from "../systems/environment/WeatherImpactRainController.js";
import {
  WeatherOcclusionSampler,
} from "../systems/environment/WeatherOcclusionSampler.js";
import {
  WeatherSnowController,
} from "../systems/environment/WeatherSnowController.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";
import { WorldModel } from "../world/model/WorldModel.js";

const tileSize = 94;
const groundTileY = 65;
const groundWorldY = groundTileY * tileSize;
const camera = {
  width: 1280,
  height: 720,
  scrollX: 0,
  scrollY: 5500,
  worldView: { x: 0, y: 5500, width: 1280, height: 720 },
};
const createdSprites = [];

function makeSprite(textureKey) {
  const sprite = {
    textureKey,
    frame: null,
    x: 0,
    y: 0,
    alpha: 1,
    scrollFactor: null,
    visible: false,
  };
  const chain = {
    setTexture(key, frame) {
      sprite.textureKey = key;
      sprite.frame = frame;
      return chain;
    },
    setFrame(frame) {
      sprite.frame = frame;
      return chain;
    },
    setOrigin() { return chain; },
    setScrollFactor(value) {
      sprite.scrollFactor = value;
      return chain;
    },
    setDepth() { return chain; },
    setAlpha(value) {
      sprite.alpha = value;
      return chain;
    },
    setVisible(value) {
      sprite.visible = value;
      return chain;
    },
    setPosition(x, y) {
      sprite.x = x;
      sprite.y = y;
      return chain;
    },
    setDisplaySize(width, height) {
      sprite.width = width;
      sprite.height = height;
      return chain;
    },
    setRotation() { return chain; },
    setBlendMode(value) {
      sprite.blendMode = value;
      return chain;
    },
    destroy() {
      sprite.destroyed = true;
      return chain;
    },
    _state: sprite,
  };
  Object.defineProperties(chain, {
    x: {
      get: () => sprite.x,
      set: (value) => { sprite.x = value; },
    },
    y: {
      get: () => sprite.y,
      set: (value) => { sprite.y = value; },
    },
    alpha: {
      get: () => sprite.alpha,
      set: (value) => { sprite.alpha = value; },
    },
  });
  createdSprites.push(chain);
  return chain;
}

const scene = {
  cameras: { main: camera },
  worldModel: {
    isSolid(_tx, ty) {
      return ty === groundTileY;
    },
  },
  add: {
    image(_x, _y, textureKey, frame) {
      const sprite = makeSprite(textureKey);
      if (frame !== undefined) sprite.setFrame(frame);
      return sprite;
    },
  },
  dayNightCycle: {
    getSeason: () => "winter",
    getCurrentTemperature: () => -2,
  },
};
const config = {
  tileSize,
  topAirRows: groundTileY,
  worldDepthTiles: 2000,
  viewportWidth: camera.width,
  viewportHeight: camera.height,
};
const visualAssets = {
  textureKey: "weather-v11-particles-v2",
  frames: SKYLINE_WEATHER_VFX.particleFrames,
  presentation: SKYLINE_WEATHER_VFX.particlePresentation,
};

const sampler = new WeatherOcclusionSampler(scene, config, WEATHER_CONFIG);
const occlusion = sampler.update(0);
assert.ok(occlusion.openSamples.length > 0);
assert.equal(occlusion.worldView.y, 5500);
assert.equal(occlusion.worldPerScreenPixelY, 1);
assert.equal(occlusion.nearestImpactForWorldX(320).impactWorldY, groundWorldY);
assert.equal(occlusion.nearestImpactForWorldX(320).impactSource, "tile");
camera.scrollY = 120;
camera.worldView.y = 120;

const rain = new WeatherImpactRainController(
  scene,
  config,
  WEATHER_CONFIG,
  visualAssets,
);
const rainEvents = [];
for (let frame = 0; frame < 24; frame += 1) {
  rain.update(frame * 100, 100, {
    kind: "rain",
    intensity: 1,
    wind: 0,
    gust: 0,
    depth: { surfaceAmount: 1 },
    occlusion,
    lightningFlashAmount: 0,
  });
  rainEvents.push(...rain.drainImpactEvents());
}
assert.ok(rainEvents.length > 0, "rain must collide with world solids");
assert.ok(rainEvents.every((event) => event.worldY === groundWorldY));
assert.ok(rainEvents.every((event) => event.impactSource === "tile"));

const snow = new WeatherSnowController(scene, WEATHER_CONFIG, visualAssets);
const snowEvents = [];
for (let frame = 0; frame < 190; frame += 1) {
  snow.update(frame * 100, 100, {
    kind: "snow",
    intensity: 1,
    wind: 0,
    gust: 0,
    depth: { surfaceAmount: 1 },
    occlusion,
  });
  snowEvents.push(...snow.drainImpactEvents());
}
assert.ok(snowEvents.length > 0, "snow must spawn and collide with world solids");
assert.ok(snowEvents.every((event) => event.worldY === groundWorldY));
assert.ok(snowEvents.every((event) => event.impactSource === "tile"));

const impacts = new WeatherImpactParticleController(
  scene,
  WEATHER_CONFIG,
  visualAssets,
);
impacts.update(16, [rainEvents[0]]);
impacts._spawnActor("snowPowder", snowEvents[0]);
assert.ok(impacts.actors.length >= 1);
assert.ok(impacts.actors.some((actor) => actor.kind === "snowPowder"));
assert.ok(impacts.actors.every((actor) => (
  actor.sprite._state.y === groundWorldY
    - WEATHER_CONFIG.splashes.impactVfx.groundOffsetPx
)));

const groundAtmosphere = Object.create(GroundEffectsAtmosphere.prototype);
groundAtmosphere.scene = scene;
groundAtmosphere.visualAssets = visualAssets;
groundAtmosphere.windParticles = [];
groundAtmosphere._emitWindParticle(1);
assert.equal(groundAtmosphere.windParticles.length, 1);
assert.equal(
  groundAtmosphere.windParticles[0].sprite._state.textureKey,
  visualAssets.textureKey,
);
assert.ok(SKYLINE_WEATHER_VFX.particleFrames.smoke.includes(
  groundAtmosphere.windParticles[0].sprite._state.frame,
));
assert.equal(groundAtmosphere.windParticles[0].sprite._state.scrollFactor, 1);

const director = new WeatherDirector(scene, WEATHER_CONFIG);
const forcedSnow = director.force("snow", 0.75, 5000, 0);
assert.equal(forcedSnow.kind, "snow");
assert.equal(director.kind, "snow");
assert.ok(WEATHER_CONFIG.director.seasonWeights.winter.snow > 0);
assert.equal(WEATHER_CONFIG.director.seasonWeights.summer.snow, 0);
const realRandom = Math.random;
try {
  Math.random = () => 0.999999;
  assert.equal(director._chooseNextKind("clear"), "snow");
  scene.dayNightCycle.getSeason = () => "summer";
  scene.dayNightCycle.getCurrentTemperature = () => 28;
  assert.notEqual(director._chooseNextKind("clear"), "snow");
} finally {
  Math.random = realRandom;
}

assert.ok(createdSprites.length > 0);
assert.ok(createdSprites.every((sprite) => sprite._state.scrollFactor === 1));

const manifestUrl = new URL(
  "../sprites/environment/v11-skyline-weather-vfx-v1/weather-particles-v2.manifest.json",
  import.meta.url,
);
const sheetUrl = new URL(
  "../sprites/environment/v11-skyline-weather-vfx-v1/weather-particles-v2.png",
  import.meta.url,
);
const manifest = JSON.parse(fs.readFileSync(
  manifestUrl,
  "utf8",
));
const sheetBuffer = fs.readFileSync(sheetUrl);
assert.equal(manifest.columns * manifest.rows, 32);
assert.equal(Object.keys(manifest.frames).length, 32);
assert.ok(manifest.visibleAlphaPixels > 0);
assert.equal(manifest.residualChromaGreenPixels, 0);
assert.equal(manifest.groups.snowFlakes.length, 8);
assert.equal(manifest.frameWidth, SKYLINE_WEATHER_VFX.particleSheet.frameWidth);
assert.equal(manifest.frameHeight, SKYLINE_WEATHER_VFX.particleSheet.frameHeight);
assert.equal(
  manifest.contentSafeAreaPx,
  SKYLINE_WEATHER_VFX.particleSheet.contentSafeAreaPx,
);
assert.equal(sheetBuffer.readUInt32BE(16), manifest.width);
assert.equal(sheetBuffer.readUInt32BE(20), manifest.height);
assert.equal(manifest.width, manifest.columns * manifest.frameWidth);
assert.equal(manifest.height, manifest.rows * manifest.frameHeight);
const safeBorderPx = (manifest.frameWidth - manifest.contentSafeAreaPx) * 0.5;
Object.values(manifest.frameMetrics).forEach((metric) => {
  assert.ok(metric.visibleAlphaPixels > 0);
  assert.ok(metric.visibleBounds.width <= manifest.contentSafeAreaPx);
  assert.ok(metric.visibleBounds.height <= manifest.contentSafeAreaPx);
  assert.ok(metric.clearBorderPx >= safeBorderPx);
});
assert.ok(
  manifest.contentSafeAreaPx / WEATHER_CONFIG.snow.sizePx[1] >= 8,
  "largest snowflake must retain at least 8 source pixels per display pixel",
);
assert.ok(
  manifest.contentSafeAreaPx
    / Math.max(
      WEATHER_CONFIG.splashes.impactVfx.rippleWidthPx,
      WEATHER_CONFIG.splashes.impactVfx.snowPowderWidthPx,
      WEATHER_CONFIG.splashes.impactVfx.splashWidthPx,
    )
    >= 2.5,
  "largest weather impact must retain at least 2.5 source pixels per display pixel",
);
assert.equal(
  crypto.createHash("sha256").update(sheetBuffer).digest("hex"),
  manifest.outputSha256,
);

camera.scrollY = 5500;
camera.worldView.y = 5500;
const samplerWithRoof = new WeatherOcclusionSampler(
  scene,
  config,
  {
    ...WEATHER_CONFIG,
    visualCovers: [{
      kind: "testRoof",
      xTile: 2,
      yTile: 60,
      widthTiles: 2,
      heightTiles: 1,
    }],
  },
);
const roofOcclusion = samplerWithRoof.update(0);
const roofImpact = roofOcclusion.nearestImpactForWorldX(220);
assert.equal(roofImpact.impactWorldY, 60 * tileSize);
assert.equal(roofImpact.impactSource, "testRoof");

const productionWorld = new WorldModel(GAME_CONFIG);
const productionCameraY = (GAME_CONFIG.topAirRows - 5) * GAME_CONFIG.tileSize;
const productionScene = {
  cameras: {
    main: {
      width: 1280,
      height: 720,
      scrollX: GAME_CONFIG.tileSize,
      scrollY: productionCameraY,
      worldView: {
        x: GAME_CONFIG.tileSize,
        y: productionCameraY,
        width: 1280,
        height: 720,
      },
    },
  },
  worldModel: productionWorld,
};
const productionSampler = new WeatherOcclusionSampler(
  productionScene,
  GAME_CONFIG,
  WEATHER_CONFIG,
);
const productionOcclusion = productionSampler.update(0);
const productionImpacts = productionOcclusion.samples.filter((sample) => (
  sample.impactSource === "tile"
  && sample.worldX >= 0
  && sample.worldX < productionWorld.widthPx
));
assert.ok(productionImpacts.length > 0);
productionImpacts.forEach((sample) => {
  const tx = Math.floor(sample.worldX / GAME_CONFIG.tileSize);
  const ty = Math.round(sample.impactWorldY / GAME_CONFIG.tileSize);
  assert.equal(productionWorld.isSolid(tx, ty), true);
  if (ty > 0) assert.equal(productionWorld.isSolid(tx, ty - 1), false);
  const sweptHit = productionOcclusion.raycastWorldSegment(
    sample.worldX,
    Math.max(
      0,
      productionOcclusion.worldView.y
        - WEATHER_CONFIG.occlusion.scanAboveViewportPx,
    ),
    sample.worldX,
    sample.impactWorldY + GAME_CONFIG.tileSize,
  );
  assert.equal(sweptHit.tileX, tx);
  assert.equal(sweptHit.tileY, ty);
  assert.equal(sweptHit.worldY, sample.impactWorldY);
});

rain.destroy();
snow.destroy();
impacts.destroy();
sampler.destroy();
samplerWithRoof.destroy();
productionSampler.destroy();

console.log(
  "Weather world precipitation contract passed: high-resolution ImageGen rain/snow and exact world-space impacts are wired",
);
