import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FIRE_LIGHT_CONFIG } from "../values/fireLightConfig.js";
import {
  FIRE_LIGHT_PRESENTATION_CONFIG,
  resolveFireLightPresentation,
} from "../values/fireLightPresentation.js";
import { FireLightSystem } from "../systems/lighting/FireLightSystem.js";

const root = resolve(import.meta.dirname, "..");
const tileSize = 94;
const cave = {
  surfaceLightInfluence: 0,
  undergroundDarknessInfluence: 1,
  nightAmount: 1,
  sunStrength: 0,
  weather: { rainAmount: 0, lightningFlashAmount: 0 },
};
const renderArguments = {
  time: 1000,
  deltaMs: 16,
  torchActive: true,
  source: { x: 200, y: 300, facingSign: 1, source: "contract" },
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
};

function makeActor() {
  const actor = { visible: false, alpha: 0 };
  for (const method of [
    "setBlendMode", "setDepth", "setDisplaySize", "setFlipX", "setFrame",
    "setOrigin", "setPosition", "setRotation", "setScrollFactor", "setTexture",
    "setTint",
  ]) actor[method] = function chain() { return this; };
  actor.setVisible = function setVisible(value) {
    this.visible = Boolean(value);
    return this;
  };
  actor.setAlpha = function setAlpha(value) {
    this.alpha = value;
    return this;
  };
  actor.destroy = function destroy() {};
  return actor;
}

function makeScene() {
  const addActor = () => makeActor();
  return {
    textures: { exists: () => true },
    add: { image: addActor, rectangle: addActor },
    cameras: { main: { width: 1280, height: 720 } },
    config: { viewportWidth: 1280, viewportHeight: 720 },
  };
}

const natural = FIRE_LIGHT_PRESENTATION_CONFIG.profiles.natural;
const material = FIRE_LIGHT_PRESENTATION_CONFIG.profiles.material;
const layered = FIRE_LIGHT_PRESENTATION_CONFIG.profiles.layered;
assert.equal(resolveFireLightPresentation("").id, material.id);
assert.equal(resolveFireLightPresentation("?fireLightStyle=material").id, material.id);
assert.equal(resolveFireLightPresentation("?fireLightStyle=natural").id, natural.id);
assert.equal(resolveFireLightPresentation("?fireLightStyle=layered").id, layered.id);
assert.equal(natural.authoredLayerTarget, 1);
assert.equal(natural.volumeAlphaScale, 0);
assert.equal(natural.atmosphereAlphaScale, 0);
assert.equal(natural.expandedIllumination, false);
assert.equal(natural.proceduralWorldGlow, true);
assert.ok(natural.proceduralShaderMix > 0.8);
assert.ok(natural.eyeAdaptationEffectScale < 0.5);
assert.equal(layered.authoredLayerTarget, 8);
assert.equal(layered.expandedIllumination, true);
assert.equal(layered.proceduralWorldGlow, false);

assert.equal(material.authoredLayerTarget, 3);
assert.ok(material.volumeAlphaScale > 0 && material.volumeAlphaScale < 0.7);
assert.ok(material.atmosphereAlphaScale > 0 && material.atmosphereAlphaScale < 0.5);
assert.equal(material.expandedIllumination, false);
assert.equal(material.proceduralWorldGlow, true);
assert.ok(material.proceduralShaderMix > 0.8);
assert.ok(material.eyeAdaptationEffectScale < 0.5);

const naturalSystem = new FireLightSystem(
  makeScene(),
  FIRE_LIGHT_CONFIG,
  "?fireLightStyle=natural"
);
naturalSystem.renderFrame(renderArguments);
let snapshot = naturalSystem.getSnapshot();
assert.equal(snapshot.presentationId, natural.id);
assert.equal(snapshot.illuminationRequested, false);
assert.equal(snapshot.renderer.visibleLayerCount, 1);
assert.equal(naturalSystem.renderer.volume, null);
assert.equal(naturalSystem.renderer.flame.visible, true);
assert.equal(naturalSystem.renderer.atmosphere, null);
assert.equal(snapshot.proceduralWorldGlow, true);
assert.equal(snapshot.proceduralShaderMix, natural.proceduralShaderMix);
assert.equal(snapshot.eyeAdaptation.effectScale, natural.eyeAdaptationEffectScale);
naturalSystem.destroy();

const materialSystem = new FireLightSystem(makeScene(), FIRE_LIGHT_CONFIG, "");
materialSystem.renderFrame(renderArguments);
snapshot = materialSystem.getSnapshot();
assert.equal(snapshot.presentationId, material.id);
assert.equal(snapshot.illuminationRequested, false);
assert.equal(snapshot.renderer.visibleLayerCount, 3);
assert.equal(materialSystem.renderer.volume.visible, true);
assert.equal(materialSystem.renderer.flame.visible, true);
assert.equal(materialSystem.renderer.atmosphere.visible, true);
assert.equal(snapshot.proceduralWorldGlow, true);
assert.equal(snapshot.proceduralShaderMix, material.proceduralShaderMix);
assert.equal(snapshot.eyeAdaptation.effectScale, material.eyeAdaptationEffectScale);
materialSystem.destroy();

const layeredSystem = new FireLightSystem(
  makeScene(),
  FIRE_LIGHT_CONFIG,
  "?fireLightStyle=layered"
);
layeredSystem.renderFrame(renderArguments);
snapshot = layeredSystem.getSnapshot();
assert.equal(snapshot.presentationId, layered.id);
assert.equal(snapshot.renderer.visibleLayerCount, 3);
assert.equal(snapshot.illumination.visibleLayerCount, 5);
assert.equal(snapshot.proceduralWorldGlow, false);
assert.equal(snapshot.proceduralShaderMix, 0.10);
assert.equal(snapshot.eyeAdaptation.effectScale, 1);
layeredSystem.destroy();

const legacySystem = new FireLightSystem(
  makeScene(),
  FIRE_LIGHT_CONFIG,
  "?fireLight=legacy"
);
assert.equal(legacySystem.enabled, false);
assert.equal(
  legacySystem.getSnapshot().presentationId,
  FIRE_LIGHT_PRESENTATION_CONFIG.legacyPresentationId
);

const lightSystemSource = readFileSync(
  resolve(root, "systems/lighting/LightSystem.js"),
  "utf8"
);
for (const needle of [
  "usesProceduralWorldGlow",
  "getProceduralWorldGlowScale",
  "proceduralGlowStrength",
]) assert.ok(lightSystemSource.includes(needle), `LightSystem missing ${needle}`);

for (const file of [
  "values/fireLightPresentation.js",
  "systems/lighting/FireLightSystem.js",
  "systems/lighting/FireLightRenderer.js",
]) {
  const lines = readFileSync(resolve(root, file), "utf8").split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} must remain at or below 300 lines`);
}

console.log(
  "material lighting passed: restrained three-layer default, exact natural and layered rollbacks"
);
