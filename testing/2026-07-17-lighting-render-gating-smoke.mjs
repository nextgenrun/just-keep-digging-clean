import assert from "node:assert/strict";

import { LightSystem } from "../systems/lighting/LightSystem.js";
import { ShaderSystem } from "../systems/lighting/ShaderSystem.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { SHADER_CONFIG } from "../values/shaderConfig.js";

function createLayerEntry(config) {
  const shader = {
    visible: true,
    uniformWrites: 0,
    setVisible(value) {
      this.visible = Boolean(value);
      return this;
    },
    setUniform() {
      this.uniformWrites += 1;
      return this;
    },
  };
  const image = {
    visible: true,
    setVisible(value) {
      this.visible = Boolean(value);
      return this;
    },
  };
  return { shader, image, config, lastAlpha: 0 };
}

let weatherSnapshot;
const shaderSystem = Object.create(ShaderSystem.prototype);
shaderSystem.config = SHADER_CONFIG;
shaderSystem.enabled = true;
shaderSystem.available = true;
shaderSystem.disabledReason = "";
shaderSystem.layers = new Map(
  Object.entries(SHADER_CONFIG.layers).map(([name, config]) => [name, createLayerEntry(config)])
);
shaderSystem.scene = {
  cameras: { main: { width: 1280, height: 720 } },
  config: { viewportWidth: 1280, viewportHeight: 720 },
  time: { now: 0 },
  weatherSystem: { getLightingSnapshot: () => weatherSnapshot },
  lightSystem: {
    getShaderSnapshot: () => shaderSystem._fallbackLightSnapshot(1280, 720),
  },
  dayNightCycle: {
    getCurrentPhaseName: () => "day",
    getNightAmount: () => 0,
    getSkyColor: () => 0x5a7a9a,
    getHorizonGlowColor: () => 0xb0c0d0,
    getSunAlpha: () => 1,
    getMoonAlpha: () => 0,
    getSunScreenPosition: () => ({ x: 640, y: 120 }),
    getMoonScreenPosition: () => ({ x: 640, y: 120 }),
  },
};

weatherSnapshot = shaderSystem._fallbackWeatherSnapshot();
shaderSystem.update(1000, 16);
for (const entry of shaderSystem.layers.values()) {
  assert.equal(entry.shader.visible, false, "inactive render-to-texture shader must be hidden");
  assert.equal(entry.image.visible, false, "inactive sampled layer image must be hidden");
  assert.equal(entry.shader.uniformWrites, 0, "inactive layers must skip redundant uniform updates");
}

weatherSnapshot = {
  ...weatherSnapshot,
  intensity: 1,
  rainAmount: 1,
  stormAmount: 1,
};
shaderSystem.update(1016, 16);
assert.equal(shaderSystem.layers.get("weatherAtmosphere").shader.visible, true);
assert.equal(shaderSystem.layers.get("weatherAtmosphere").image.visible, true);
assert.ok(shaderSystem.layers.get("weatherAtmosphere").shader.uniformWrites > 0);
assert.equal(shaderSystem.layers.get("materialResponse").shader.visible, true);
assert.equal(shaderSystem.layers.get("materialResponse").image.visible, true);
assert.ok(shaderSystem.layers.get("materialResponse").shader.uniformWrites > 0);
assert.equal(shaderSystem.layers.get("darknessLight").shader.visible, false);
assert.equal(shaderSystem.layers.get("lightningFlash").shader.visible, false);

weatherSnapshot = { ...weatherSnapshot, lightningFlashAmount: 1 };
shaderSystem.update(1032, 16);
assert.equal(shaderSystem.layers.get("lightningFlash").shader.visible, true);
assert.equal(shaderSystem.layers.get("lightningFlash").image.visible, true);

shaderSystem.setEnabled(false);
for (const entry of shaderSystem.layers.values()) {
  assert.equal(entry.shader.visible, false);
  assert.equal(entry.image.visible, false);
}

const darknessCalls = {
  clear: 0,
  fill: 0,
  erase: 0,
  crystal: 0,
  semantic: 0,
  visible: null,
};
const darkness = {
  active: true,
  clear() {
    darknessCalls.clear += 1;
    return this;
  },
  fill() {
    darknessCalls.fill += 1;
    return this;
  },
  erase() {
    darknessCalls.erase += 1;
    return this;
  },
  setAlpha(value) {
    this.alpha = value;
    return this;
  },
  setVisible(value) {
    darknessCalls.visible = Boolean(value);
    return this;
  },
};
const lightSystem = Object.create(LightSystem.prototype);
lightSystem.config = LIGHT_CONFIG;
lightSystem._darknessTexture = darkness;
lightSystem._darknessRenderActive = true;
lightSystem._screenPoint = { x: 0, y: 0 };
lightSystem._currentFacingOffsetWorld = 0;
lightSystem._currentGlowStrength = 0;
lightSystem._eraser = { setDisplaySize: () => lightSystem._eraser };
lightSystem._torchHalo = {};
lightSystem._torchCoreGlow = {};
lightSystem._torchFlameGlow = {};
lightSystem.playerController = {
  getPlayerTile: () => ({ tx: 0, ty: 0 }),
};
lightSystem.scene = {
  config: { tileSize: 94 },
  player: { x: 30, y: 40 },
  cameras: {
    main: {
      width: 1280,
      height: 720,
      scrollX: 0,
      scrollY: 0,
      zoomX: 1,
      zoomY: 1,
      matrix: {
        transformPoint(x, y, output) {
          output.x = x;
          output.y = y;
        },
      },
    },
  },
};
lightSystem._getFireMotion = () => ({
  radiusScale: 1,
  screenOffsetX: 0,
  screenOffsetY: 0,
  worldOffsetX: 0,
  worldOffsetY: 0,
  haloScale: 1,
  haloAlpha: 1,
  haloTint: 0xffffff,
  coreScale: 1,
  coreAlpha: 1,
  coreTint: 0xffffff,
  flameScale: 1,
  flameAlpha: 1,
  flameTint: 0xffffff,
});
lightSystem._setGlowState = () => {};
lightSystem._setShaderSnapshot = () => {};
lightSystem._eraseCrystalLights = () => {
  darknessCalls.crystal += 1;
};
lightSystem._eraseSkyAndGeodeLights = () => {
  darknessCalls.semantic += 1;
};

const lighting = {
  nightAmount: 0,
  surfaceLightInfluence: 1,
  undergroundDarknessInfluence: 0,
};
lightSystem._computeDarknessAlpha = () => LIGHT_CONFIG.renderOptimization.inactiveDarknessAlphaThreshold;
lightSystem._redraw(0, 5, lighting);
assert.equal(darknessCalls.visible, false);
assert.equal(darknessCalls.clear, 0);
assert.equal(darknessCalls.fill, 0);
assert.equal(darknessCalls.erase, 0);
assert.equal(darknessCalls.crystal, 0);
assert.equal(darknessCalls.semantic, 0);

lightSystem._computeDarknessAlpha = () => 0.2;
lightSystem._redraw(16, 5, lighting);
assert.equal(darknessCalls.visible, true);
assert.equal(darknessCalls.clear, 1);
assert.equal(darknessCalls.fill, 1);
assert.equal(darknessCalls.erase, 1);
assert.equal(darknessCalls.crystal, 1);
assert.equal(darknessCalls.semantic, 1);
assert.equal(darkness.alpha, 0.2);

console.log("lighting render gating smoke: inactive full-screen passes skip GPU work and reactivate without changing active-frame math");
