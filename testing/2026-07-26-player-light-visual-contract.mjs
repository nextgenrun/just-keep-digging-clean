import assert from "node:assert/strict";

import { LightSystem } from "../systems/lighting/LightSystem.js";
import { resolvePlayerLightWorldCenter } from "../systems/lighting/PlayerLightAnchor.js";
import { resolvePlayerLightLayerDepth } from "../systems/lighting/PlayerLightShaderBridge.js";
import { ShaderSystem } from "../systems/lighting/ShaderSystem.js";
import { DARKNESS_LIGHT_FRAGMENT } from "../systems/lighting/darknessLightShader.js";
import { createCommonShaderUniforms } from "../systems/lighting/shaderUniforms.js";
import {
  LIGHT_CONFIG,
  resolvePlayerLightVisualMode,
} from "../values/lightConfig.js";
import { SHADER_CONFIG } from "../values/shaderConfig.js";

const approx = (actual, expected, epsilon = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
};

assert.equal(resolvePlayerLightVisualMode(LIGHT_CONFIG, ""), "natural");
assert.equal(resolvePlayerLightVisualMode(LIGHT_CONFIG, "?playerLight=centered"), "natural");
assert.equal(resolvePlayerLightVisualMode(LIGHT_CONFIG, "?playerLight=legacy"), "legacy");
assert.equal(resolvePlayerLightVisualMode(LIGHT_CONFIG, "?playerLight=feet"), "legacy");

const bottomAnchoredPlayer = {
  x: 200,
  y: 300,
  displayWidth: 109,
  displayHeight: 109,
  originX: 0.5,
  originY: 0.96,
  rotation: 0,
};
const resolvedCenter = resolvePlayerLightWorldCenter(bottomAnchoredPlayer);
approx(resolvedCenter.x, 200);
approx(resolvedCenter.y, 300 - 109 * 0.96 + 109 * 0.5);
assert.ok(
  resolvedCenter.y < bottomAnchoredPlayer.y - 40,
  "bottom-anchored characters must light from their visible body, not their feet"
);

const getCenterPlayer = {
  getCenter(output, includeParent) {
    assert.equal(includeParent, true);
    output.x = 81;
    output.y = 42;
    return output;
  },
};
assert.deepEqual(
  resolvePlayerLightWorldCenter(getCenterPlayer, null, { x: 0, y: 0 }),
  { x: 81, y: 42 }
);

const eraseCalls = [];
const glowCalls = [];
let shaderValues = null;
const darkness = {
  active: true,
  clear() {
    return this;
  },
  fill() {
    return this;
  },
  erase(image, x, y) {
    eraseCalls.push({ image, x, y });
    return this;
  },
  setAlpha() {
    return this;
  },
  setVisible() {
    return this;
  },
};
const lightSystem = Object.create(LightSystem.prototype);
lightSystem.config = LIGHT_CONFIG;
lightSystem._playerLightVisualMode = LIGHT_CONFIG.playerLightVisual.naturalMode;
lightSystem._torchActive = true;
lightSystem._darknessTexture = darkness;
lightSystem._darknessRenderActive = true;
lightSystem._darknessRenderAlpha = 1;
lightSystem._darknessHasSolidFill = false;
lightSystem._screenPoint = { x: 0, y: 0 };
lightSystem._playerLightWorldPoint = { x: 0, y: 0 };
lightSystem._currentFacingOffsetWorld = 4;
lightSystem._currentGlowStrength = 1;
lightSystem._eraser = {
  setDisplaySize() {
    return this;
  },
};
lightSystem._torchHalo = { id: "halo" };
lightSystem._torchCoreGlow = { id: "core" };
lightSystem._torchFlameGlow = { id: "flame" };
lightSystem.playerController = {
  getPlayerTile: () => ({ tx: 1, ty: 1 }),
};
lightSystem.scene = {
  config: { tileSize: 94 },
  player: {
    x: 100,
    y: 200,
    getCenter(output) {
      output.x = 100;
      output.y = 150;
      return output;
    },
  },
  cameras: {
    main: {
      width: 1280,
      height: 720,
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
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
  screenOffsetX: 2,
  screenOffsetY: -1,
  worldOffsetX: 2,
  worldOffsetY: -1,
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
lightSystem._setGlowState = (image, x, y, diameter, alpha) => {
  glowCalls.push({ image, x, y, diameter, alpha });
};
lightSystem._setShaderSnapshot = (_lighting, values) => {
  shaderValues = values;
};
lightSystem._eraseCrystalLights = () => {};
lightSystem._eraseSkyAndGeodeLights = () => {};
lightSystem._computeDarknessAlpha = () => 1;

const lighting = {
  nightAmount: 0,
  surfaceLightInfluence: 0,
  undergroundDarknessInfluence: 1,
};
lightSystem._redraw(1000, 5, lighting);

const expectedTorchX = 100 + 4 + 2;
const expectedTorchY = 150
  + LIGHT_CONFIG.playerLightVisual.natural.verticalOffsetTiles * 94
  - 1;
approx(eraseCalls[0].x, expectedTorchX);
approx(eraseCalls[0].y, expectedTorchY);
approx(glowCalls[0].x, expectedTorchX);
approx(glowCalls[0].y, expectedTorchY);
approx(shaderValues.torchScreenPosition.x, expectedTorchX);
approx(shaderValues.torchScreenPosition.y, expectedTorchY);
assert.deepEqual(shaderValues.playerLightWorldCenter, { x: 100, y: 150 });
assert.ok(
  glowCalls[0].diameter > glowCalls[1].diameter,
  "natural light must keep a broad halo around its tighter core"
);

eraseCalls.length = 0;
glowCalls.length = 0;
lightSystem._torchActive = false;
lightSystem._redraw(1016, 5, lighting);
approx(eraseCalls[0].x, 100);
approx(eraseCalls[0].y, 150);
approx(shaderValues.torchScreenPosition.x, 100);
approx(shaderValues.torchScreenPosition.y, 150);

eraseCalls.length = 0;
glowCalls.length = 0;
lightSystem._torchActive = true;
lightSystem._playerLightVisualMode = LIGHT_CONFIG.playerLightVisual.legacyMode;
lightSystem._redraw(1032, 5, lighting);
approx(eraseCalls[0].x, 102);
approx(eraseCalls[0].y, 199);
approx(glowCalls[0].x, 106);
approx(
  glowCalls[0].y,
  200 + LIGHT_CONFIG.glowVerticalOffsetTiles * 94 - 1
);

const shaderSystem = Object.create(ShaderSystem.prototype);
shaderSystem.config = SHADER_CONFIG;
shaderSystem.scene = {
  lightSystem: {
    config: LIGHT_CONFIG,
    getShaderSnapshot: () => ({ playerLightVisualUpgrade: true }),
  },
};
assert.equal(
  resolvePlayerLightLayerDepth(
    shaderSystem.scene,
    "darknessLight",
    SHADER_CONFIG.layers.darknessLight
  ),
  LIGHT_CONFIG.playerLightVisual.natural.shaderRenderDepth
);
shaderSystem.scene.lightSystem.getShaderSnapshot = () => ({
  playerLightVisualUpgrade: false,
});
assert.equal(
  resolvePlayerLightLayerDepth(
    shaderSystem.scene,
    "darknessLight",
    SHADER_CONFIG.layers.darknessLight
  ),
  SHADER_CONFIG.layers.darknessLight.depth
);

const uniformValues = new Map();
const shader = {
  setUniform(path, value) {
    uniformValues.set(path, value);
    return this;
  },
};
const weather = shaderSystem._fallbackWeatherSnapshot();
const dayNight = {
  nightAmount: 0,
  sunAlpha: 1,
  moonAlpha: 0,
  sunScreenPosition: { x: 640, y: 120 },
  moonScreenPosition: { x: 640, y: 120 },
  skyColor: 0x5a7a9a,
  horizonColor: 0xb0c0d0,
};
const baseLight = {
  ...shaderSystem._fallbackLightSnapshot(1280, 720),
  torchActive: true,
  torchRadiusPx: 360,
  torchGlowStrength: 1,
};

shaderSystem._applyUniforms(shader, {
  width: 1280,
  height: 720,
  time: 1000,
  weather,
  dayNight,
  light: { ...baseLight, playerLightVisualUpgrade: true },
});
approx(uniformValues.get("uTorchRadius.value"), 360 * 0.72 / 720);
assert.equal(uniformValues.get("uPlayerLightVisualUpgrade.value"), 1);
assert.equal(
  uniformValues.get("uTorchFalloffPower.value"),
  SHADER_CONFIG.layers.darknessLight.torchFalloffPower
);

shaderSystem._applyUniforms(shader, {
  width: 1280,
  height: 720,
  time: 1016,
  weather,
  dayNight,
  light: { ...baseLight, playerLightVisualUpgrade: false },
});
approx(uniformValues.get("uTorchRadius.value"), 360 / 1280);
assert.equal(uniformValues.get("uPlayerLightVisualUpgrade.value"), 0);

const commonUniforms = createCommonShaderUniforms();
assert.ok(commonUniforms.uPlayerLightVisualUpgrade);
assert.ok(commonUniforms.uTorchBounceStrength);
assert.match(DARKNESS_LIGHT_FRAGMENT, /naturalSpill/);
assert.match(DARKNESS_LIGHT_FRAGMENT, /naturalBounce/);
assert.match(DARKNESS_LIGHT_FRAGMENT, /mix\(legacyColor, naturalColor, visualUpgrade\)/);

console.log(
  "player light visual contract: body-centered mask/glow/shader alignment, natural falloff, and legacy rollback verified"
);
