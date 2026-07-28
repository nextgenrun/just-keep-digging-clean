import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { LIGHT_CONFIG } from "../values/lightConfig.js";
import {
  resolvePlayerLightAnchor,
  resolvePlayerLightEnvironment,
  resolvePlayerLightProfile,
} from "../systems/lighting/playerLightProfile.js";

const root = resolve(import.meta.dirname, "..");
const v2 = LIGHT_CONFIG.playerLightV2;
const clear = Object.freeze({
  rainAmount: 0,
  stormAmount: 0,
  lightningFlashAmount: 0,
});

function lighting(overrides = {}) {
  return {
    surfaceLightInfluence: 1,
    undergroundDarknessInfluence: 0,
    nightAmount: 0,
    sunStrength: 1,
    weather: clear,
    ...overrides,
  };
}

function pngGeometry(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

assert.equal(resolvePlayerLightProfile(LIGHT_CONFIG, ""), "v2");
assert.equal(resolvePlayerLightProfile(LIGHT_CONFIG, "?playerLight=legacy"), "legacy");
assert.equal(resolvePlayerLightProfile(LIGHT_CONFIG, "?playerLight=v2"), "v2");

const player = { x: 200, y: 300 };
const controller = { physicsBody: { x: 184, y: 225, w: 32, h: 75 } };
const anchor = resolvePlayerLightAnchor(player, controller, v2, 94, "v2");
assert.deepEqual(anchor, {
  x: 200,
  y: 262.5,
  source: "physics-visible-center",
});
assert.deepEqual(
  resolvePlayerLightAnchor(
    { x: 207, y: 296 },
    controller,
    v2,
    94,
    "v2"
  ),
  { x: 207, y: 258.5, source: "physics-visible-center" }
);
assert.deepEqual(
  resolvePlayerLightAnchor(player, controller, v2, 94, "legacy"),
  { x: 200, y: 300, source: "legacy-player-origin" }
);

const day = resolvePlayerLightEnvironment(lighting(), v2, "v2");
const night = resolvePlayerLightEnvironment(
  lighting({ nightAmount: 1, sunStrength: 0 }),
  v2,
  "v2"
);
const rainyNight = resolvePlayerLightEnvironment(
  lighting({
    nightAmount: 1,
    sunStrength: 0,
    weather: { ...clear, rainAmount: 1 },
  }),
  v2,
  "v2"
);
const stormNight = resolvePlayerLightEnvironment(
  lighting({
    nightAmount: 1,
    sunStrength: 0,
    weather: { ...clear, rainAmount: 1, stormAmount: 1 },
  }),
  v2,
  "v2"
);
const caveClear = resolvePlayerLightEnvironment(
  lighting({
    surfaceLightInfluence: 0,
    undergroundDarknessInfluence: 1,
    nightAmount: 1,
    sunStrength: 0,
  }),
  v2,
  "v2"
);
const caveStorm = resolvePlayerLightEnvironment(
  lighting({
    surfaceLightInfluence: 0,
    undergroundDarknessInfluence: 1,
    nightAmount: 1,
    sunStrength: 0,
    weather: { ...clear, rainAmount: 1, stormAmount: 1 },
  }),
  v2,
  "v2"
);

assert.ok(night.intensity > day.intensity);
assert.ok(night.radiusScale > day.radiusScale);
assert.ok(rainyNight.warmth < night.warmth);
assert.ok(stormNight.coolEdge > rainyNight.coolEdge);
assert.ok(stormNight.flickerScale > rainyNight.flickerScale);
assert.ok(stormNight.radiusScale < night.radiusScale);
assert.equal(day.positionFlutterScale, 0);
assert.deepEqual(caveStorm, caveClear);

const offFrame = resolve(root, "sprites/UI/hud-approved-v1/player-core-torch-off.png");
const onFrame = resolve(root, "sprites/UI/hud-approved-v1/player-core.png");
const source = resolve(root, "ai-tools/2026-07-26-hud-torch-off-source-v2.png");
assert.ok(existsSync(offFrame));
assert.ok(existsSync(source));
assert.deepEqual(pngGeometry(offFrame), pngGeometry(onFrame));
assert.equal(pngGeometry(offFrame).colorType, 6);

const skinSource = readFileSync(resolve(root, "systems/visual/ApprovedHudSkin.js"), "utf8");
const assetSource = readFileSync(resolve(root, "values/approvedHudSkin.js"), "utf8");
const lightSource = readFileSync(resolve(root, "systems/lighting/LightSystem.js"), "utf8");
const shaderSource = readFileSync(resolve(root, "systems/lighting/darknessLightShader.js"), "utf8");
assert.ok(skinSource.includes("playerCoreTorchOff"));
assert.ok(skinSource.includes("torchStatusText?.setVisible(false)"));
assert.ok(!skinSource.includes("\"●\""));
assert.ok(!skinSource.includes("\"○\""));
assert.ok(assetSource.includes("player-core-torch-off.png"));
assert.ok(lightSource.includes("resolvePlayerLightAnchor"));
assert.ok(lightSource.includes("physics-visible-center") || readFileSync(
  resolve(root, "systems/lighting/playerLightProfile.js"),
  "utf8"
).includes("physics-visible-center"));
assert.ok(shaderSource.includes("uPlayerLightV2 < 0.5"));
assert.ok(shaderSource.includes("uTorchFalloffPower"));

console.log("player-light v2 and torch UI contract passed");
