import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIRE_ILLUMINATION_ASSETS,
  FIRE_ILLUMINATION_CONFIG,
  resolveFireIlluminationEnabled,
} from "../values/fireIlluminationConfig.js";
import { FIRE_LIGHT_CONFIG } from "../values/fireLightConfig.js";
import { FireIlluminationRenderer } from
  "../systems/lighting/FireIlluminationRenderer.js";
import { FireLightSystem } from "../systems/lighting/FireLightSystem.js";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(
  resolve(root, "sprites/environment/fire-light-v3/manifest.json"),
  "utf8"
));

function pngGeometry(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function makeActor() {
  const actor = {
    alpha: 0,
    destroyed: false,
    frame: 0,
    visible: false,
  };
  for (const method of [
    "setBlendMode",
    "setDepth",
    "setDisplaySize",
    "setFlipX",
    "setOrigin",
    "setPosition",
    "setRotation",
    "setScrollFactor",
    "setTexture",
    "setTint",
  ]) {
    actor[method] = function chain() { return this; };
  }
  actor.setFrame = function setFrame(frame) {
    this.frame = frame;
    return this;
  };
  actor.setVisible = function setVisible(value) {
    this.visible = Boolean(value);
    return this;
  };
  actor.setAlpha = function setAlpha(value) {
    this.alpha = value;
    return this;
  };
  actor.destroy = function destroy() {
    this.destroyed = true;
  };
  return actor;
}

function makeScene(textureAvailable = true) {
  const actors = [];
  const addActor = () => {
    const actor = makeActor();
    actors.push(actor);
    return actor;
  };
  const exists = key => (
    typeof textureAvailable === "function"
      ? textureAvailable(key)
      : textureAvailable
  );
  return {
    actors,
    textures: { exists },
    add: { image: addActor, rectangle: addActor },
    cameras: { main: { width: 1280, height: 720 } },
    config: { viewportWidth: 1280, viewportHeight: 720 },
  };
}

const cave = {
  surfaceLightInfluence: 0,
  undergroundDarknessInfluence: 1,
  nightAmount: 1,
  sunStrength: 0,
  weather: { rainAmount: 0, lightningFlashAmount: 0 },
};
const source = { x: 200, y: 300, facingSign: 1, source: "contract" };
const tileSize = 94;
const renderArguments = {
  time: 1000,
  active: true,
  source,
  tileSize,
  radiusWorld: tileSize * 6,
  strength: 1,
  fuelRatio: 0.8,
  lighting: cave,
  fireState: "steady",
  reducedFlicker: false,
};

assert.equal(resolveFireIlluminationEnabled("", true), true);
assert.equal(resolveFireIlluminationEnabled("?fireLightTextures=0", true), false);
assert.equal(resolveFireIlluminationEnabled("", false), false);
assert.equal(FIRE_ILLUMINATION_ASSETS.length, 5);
assert.equal(FIRE_ILLUMINATION_CONFIG.atlas.authoredComponentCount, 80);
assert.equal(FIRE_ILLUMINATION_CONFIG.atlas.totalAuthoredLightFrameCount, 96);
assert.equal(manifest.authoredComponentCount, 160);
assert.equal(manifest.authoredLightFrameCount, 96);
assert.equal(manifest.newIlluminationFrameCount, 80);
assert.deepEqual(FIRE_ILLUMINATION_CONFIG.layerOrder, [
  "penumbra",
  "bounce",
  "hotCore",
  "breakup",
]);
assert.deepEqual(
  FIRE_ILLUMINATION_CONFIG.layers.environment.stateRows,
  { wind: 0, rain: 1, lowFuel: 2, rekindle: 3 }
);

for (const asset of FIRE_ILLUMINATION_ASSETS) {
  const path = resolve(root, asset.path);
  const recorded = manifest.assets.find(
    entry => entry.file === asset.path.split("/").at(-1)
  );
  assert.ok(existsSync(path), `${asset.id} atlas must exist`);
  assert.ok(recorded, `${asset.id} atlas must be recorded`);
  assert.deepEqual(pngGeometry(path), {
    width: manifest.sheet.width,
    height: manifest.sheet.height,
  });
  assert.equal(asset.frameConfig.frameWidth, manifest.sheet.frameWidth);
  assert.equal(asset.frameConfig.frameHeight, manifest.sheet.frameHeight);
  assert.equal(asset.frameCount, manifest.sheet.framesPerAtlas);
  assert.equal(sha256(path), recorded.sha256);
}

for (const depth of Object.values(FIRE_ILLUMINATION_CONFIG.renderDepth)) {
  assert.ok(depth < FIRE_LIGHT_CONFIG.renderDepth.rays);
}
assert.ok(
  FIRE_ILLUMINATION_CONFIG.integration.proceduralShaderMix
  < FIRE_LIGHT_CONFIG.shader.authoredPresentationProceduralMix
);

const scene = makeScene(true);
const renderer = new FireIlluminationRenderer(
  scene,
  FIRE_ILLUMINATION_CONFIG,
  true
);
assert.equal(renderer.available, true);
renderer.render(renderArguments);
let snapshot = renderer.getSnapshot();
assert.equal(snapshot.active, true);
assert.equal(snapshot.visibleLayerCount, 4);
assert.equal(snapshot.frames.environment, null);
assert.equal(new Set(Object.values(snapshot.frames).filter(Number.isFinite)).size, 4);

renderer.render({
  ...renderArguments,
  time: 1400,
  fireState: "rain",
  lighting: { ...cave, weather: { ...cave.weather, rainAmount: 1 } },
});
snapshot = renderer.getSnapshot();
assert.equal(snapshot.visibleLayerCount, 5);
assert.ok(snapshot.frames.environment >= 4 && snapshot.frames.environment <= 7);

renderer.render({
  ...renderArguments,
  time: 1800,
  fireState: "lowFuel",
  fuelRatio: 0.1,
});
snapshot = renderer.getSnapshot();
assert.ok(snapshot.frames.environment >= 8 && snapshot.frames.environment <= 11);

renderer.render({
  ...renderArguments,
  time: 2200,
  fireState: "rekindle",
});
snapshot = renderer.getSnapshot();
assert.ok(snapshot.frames.environment >= 12 && snapshot.frames.environment <= 15);
renderer.hide();
assert.equal(renderer.getSnapshot().visibleLayerCount, 0);
renderer.destroy();
assert.ok(scene.actors.every(actor => actor.destroyed));

const fullScene = makeScene(true);
const fullSystem = new FireLightSystem(
  fullScene,
  FIRE_LIGHT_CONFIG,
  "?fireLightStyle=layered"
);
fullSystem.renderFrame({
  time: 1000,
  deltaMs: 16,
  torchActive: true,
  source,
  tileSize,
  radiusWorld: tileSize * 6,
  glowStrength: 1,
  fuelRatio: 0.8,
  lighting: cave,
  worldModel: {
    worldToTile: (x, y) => ({
      tx: Math.floor(x / tileSize),
      ty: Math.floor(y / tileSize),
    }),
    inBounds: () => true,
    isSolid: () => false,
  },
});
const fullSnapshot = fullSystem.getSnapshot();
assert.equal(fullSnapshot.illuminationRequested, true);
assert.equal(fullSnapshot.illumination.available, true);
assert.equal(fullSnapshot.illumination.visibleLayerCount, 5);
assert.equal(fullSnapshot.renderer.volumeAlphaScale, 0.56);
assert.equal(fullSnapshot.proceduralShaderMix, 0.10);
assert.equal(fullSnapshot.authoredLightFrameCount, 96);
fullSystem.destroy();

const narrowScene = makeScene(true);
const narrowSystem = new FireLightSystem(
  narrowScene,
  FIRE_LIGHT_CONFIG,
  "?fireLightStyle=layered&fireLightTextures=0"
);
assert.equal(narrowSystem.enabled, true);
assert.equal(narrowSystem.illuminationRequested, false);
assert.equal(narrowSystem.getProceduralShaderMix(), 0.18);
narrowSystem.destroy();

const partialScene = makeScene(
  key => key !== FIRE_ILLUMINATION_CONFIG.assetKeys.hotCore
);
const partialSystem = new FireLightSystem(
  partialScene,
  FIRE_LIGHT_CONFIG,
  "?fireLightStyle=layered"
);
assert.equal(partialSystem.enabled, true);
assert.equal(partialSystem.illuminationRenderer.available, false);
assert.equal(partialSystem.getProceduralShaderMix(), 0.18);
partialSystem.destroy();

const bootSource = readFileSync(resolve(root, "ui/scenes/BootScene.js"), "utf8");
assert.ok(bootSource.includes("getFireIlluminationPreloadAssets"));
assert.ok(bootSource.includes("load.spritesheet"));
const rendererSource = readFileSync(
  resolve(root, "systems/lighting/FireIlluminationRenderer.js"),
  "utf8"
);
for (const forbidden of [
  "SkySteadyLightRenderer",
  "SkyBeaconPulseRenderer",
  "LightRayAtmosphere",
  "scene.add.graphics",
  "setTint(",
]) {
  assert.ok(!rendererSource.includes(forbidden));
}
for (const file of [
  "values/fireIlluminationConfig.js",
  "systems/lighting/fireIlluminationMath.js",
  "systems/lighting/FireIlluminationRenderer.js",
  "systems/lighting/FireLightSystem.js",
]) {
  const lines = readFileSync(resolve(root, file), "utf8").split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} must remain at or below 300 lines`);
}

console.log(
  "fire illumination textures passed: 80 new frames, 96 light frames, layered states, and rollback"
);
