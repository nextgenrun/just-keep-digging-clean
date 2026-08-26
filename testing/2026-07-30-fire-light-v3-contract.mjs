import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIRE_LIGHT_ASSETS,
  FIRE_LIGHT_CONFIG,
  resolveEyeAdaptationEnabled,
  resolveFireLightEnabled,
  resolveFireRaysEnabled,
  resolveReducedFireFlicker,
} from "../values/fireLightConfig.js";
import { FireLightSystem } from "../systems/lighting/FireLightSystem.js";
import { queueCapabilityFireAssets } from
  "../ui/scenes/BootCapabilityAssetPreloader.js";
import {
  advanceEyeAdaptation,
  computeEyeAdaptationTarget,
  traceFireRayToSolid,
} from "../systems/lighting/fireLightMath.js";
import { resolveFireLightAnchor } from "../systems/lighting/resolveFireLightAnchor.js";

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
  const actor = { visible: false, alpha: 0, destroyed: false };
  for (const method of [
    "setOrigin",
    "setDepth",
    "setBlendMode",
    "setPosition",
    "setDisplaySize",
    "setFrame",
    "setFlipX",
    "setTexture",
    "setScrollFactor",
    "setTint",
    "setRotation",
  ]) {
    actor[method] = function chain() { return this; };
  }
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
  const textureFrames = new Set();
  const addActor = () => {
    const actor = makeActor();
    actors.push(actor);
    return actor;
  };
  return {
    actors,
    textures: {
      exists: () => textureAvailable,
      get: () => ({
        has: frame => textureFrames.has(frame),
        add: frame => textureFrames.add(frame),
      }),
    },
    add: { image: addActor, rectangle: addActor },
    cameras: { main: { width: 1280, height: 720 } },
    config: { viewportWidth: 1280, viewportHeight: 720 },
  };
}

assert.equal(resolveFireLightEnabled(""), true);
assert.equal(resolveFireLightEnabled("?fireLight=legacy"), false);
assert.equal(resolveFireLightEnabled("?fireLight=0"), false);
assert.equal(resolveFireRaysEnabled(""), false);
assert.equal(resolveFireRaysEnabled("?fireRays=0"), false);
assert.equal(resolveFireRaysEnabled("?fireRays=1"), true);
assert.equal(resolveFireRaysEnabled("?fireLight=legacy"), false);
assert.equal(resolveEyeAdaptationEnabled("?eyeAdaptation=0"), false);
assert.equal(resolveReducedFireFlicker("?fireFlicker=reduced", false), true);
assert.equal(resolveReducedFireFlicker("", true), true);
assert.equal(resolveReducedFireFlicker("", false), false);

assert.equal(FIRE_LIGHT_ASSETS.length, 5);
assert.equal(FIRE_LIGHT_CONFIG.atlas.authoredComponentCount, 80);
assert.equal(manifest.authoredComponentCount, 160);
assert.equal(manifest.generationMode, "built-in-imagegen");
assert.equal(new Set(FIRE_LIGHT_ASSETS.map(asset => asset.key)).size, 5);
assert.equal(FIRE_LIGHT_CONFIG.rays.maxSources, FIRE_LIGHT_CONFIG.rays.anglesDegrees.length);
assert.equal(FIRE_LIGHT_CONFIG.rays.enabledByDefault, false);
assert.ok(FIRE_LIGHT_CONFIG.flame.displayWidthTiles <= 0.46);
assert.ok(FIRE_LIGHT_CONFIG.flame.displayHeightTiles <= 0.62);
assert.ok(FIRE_LIGHT_CONFIG.atmosphere.displayHeightTiles <= 1.65);

for (const asset of FIRE_LIGHT_ASSETS) {
  const path = resolve(root, asset.path);
  const recorded = manifest.assets.find(entry => entry.file === asset.path.split("/").at(-1));
  assert.ok(existsSync(path), `${asset.id} atlas must exist`);
  assert.deepEqual(pngGeometry(path), {
    width: manifest.sheet.width,
    height: manifest.sheet.height,
  });
  assert.equal(asset.frameConfig.frameWidth, manifest.sheet.frameWidth);
  assert.equal(asset.frameConfig.frameHeight, manifest.sheet.frameHeight);
  assert.equal(asset.frameCount, manifest.sheet.framesPerAtlas);
  assert.equal(sha256(path), recorded.sha256);
}

assert.ok(FIRE_LIGHT_CONFIG.renderDepth.lightVolume < 900);
assert.ok(FIRE_LIGHT_CONFIG.renderDepth.rays < 900);
assert.ok(FIRE_LIGHT_CONFIG.renderDepth.flame < 900);
assert.ok(FIRE_LIGHT_CONFIG.renderDepth.eyeDarkVeil > 901);
assert.ok(FIRE_LIGHT_CONFIG.renderDepth.eyeBloom < 1000);

const facingRight = resolveFireLightAnchor({
  player: { x: 120, y: 280 },
  playerController: {
    physicsBody: { x: 100, y: 200, w: 40, h: 80 },
    isFacingRight: () => true,
  },
  playerAssetProfile: { characterId: "survivalUal" },
  tileSize: 94,
  config: FIRE_LIGHT_CONFIG,
});
const facingLeft = resolveFireLightAnchor({
  player: { x: 120, y: 280 },
  playerController: {
    physicsBody: { x: 100, y: 200, w: 40, h: 80 },
    isFacingRight: () => false,
  },
  playerAssetProfile: { characterId: "survivalUal" },
  tileSize: 94,
  config: FIRE_LIGHT_CONFIG,
});
assert.ok(facingRight.x > 120);
assert.ok(facingLeft.x < 120);
assert.equal(facingRight.y, facingLeft.y);
assert.match(facingRight.source, /^fire-socket:/);
assert.equal(facingRight.obstructed, false);
const diggingAnchor = resolveFireLightAnchor({
  player: { x: 120, y: 280, depth: 5, anims: { currentFrame: { index: 7 } } },
  playerController: {
    physicsBody: { x: 100, y: 200, w: 40, h: 80 },
    isFacingRight: () => true,
  },
  playerAssetProfile: { characterId: "survivalUal" },
  tileSize: 94,
  config: FIRE_LIGHT_CONFIG,
  digging: true,
});
assert.equal(diggingAnchor.obstructed, true);
assert.equal(diggingAnchor.animationFrame, 7);
assert.equal(diggingAnchor.playerDepth, 5);

const tileSize = 94;
const solidAtX = 4;
const rayLength = traceFireRayToSolid({
  worldModel: {
    worldToTile: (x, y) => ({ tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) }),
    inBounds: () => true,
    isSolid: tx => tx >= solidAtX,
  },
  sourceX: tileSize * 1.5,
  sourceY: tileSize * 2.5,
  angleRadians: 0,
  tileSize,
  ...FIRE_LIGHT_CONFIG.rays,
});
assert.ok(rayLength < FIRE_LIGHT_CONFIG.rays.maxLengthTiles * tileSize);
assert.ok(rayLength <= (solidAtX - 1.5) * tileSize);
assert.ok(rayLength >= FIRE_LIGHT_CONFIG.rays.minimumLengthTiles * tileSize);

const cave = {
  surfaceLightInfluence: 0,
  undergroundDarknessInfluence: 1,
  nightAmount: 1,
  sunStrength: 0,
  weather: { rainAmount: 0, lightningFlashAmount: 0 },
};
const day = {
  ...cave,
  surfaceLightInfluence: 1,
  undergroundDarknessInfluence: 0,
  nightAmount: 0,
  sunStrength: 1,
};
const eye = FIRE_LIGHT_CONFIG.eyeAdaptation;
const caveTarget = computeEyeAdaptationTarget(cave, { active: false, strength: 0 }, eye);
const torchTarget = computeEyeAdaptationTarget(cave, { active: true, strength: 1 }, eye);
const dayTarget = computeEyeAdaptationTarget(day, { active: false, strength: 0 }, eye);
assert.ok(torchTarget > caveTarget);
assert.ok(dayTarget > torchTarget);
const darkStep = advanceEyeAdaptation(
  { targetLuminance: 0.9, perceivedLuminance: 0.9 },
  caveTarget,
  100,
  eye
);
const lightStep = advanceEyeAdaptation(
  { targetLuminance: 0.1, perceivedLuminance: 0.1 },
  dayTarget,
  100,
  eye
);
assert.ok(darkStep.darkVeilAlpha > 0);
assert.equal(darkStep.bloomAlpha, 0);
assert.ok(lightStep.bloomAlpha > 0);
assert.equal(lightStep.darkVeilAlpha, 0);

const defaultScene = makeScene(true);
const defaultSystem = new FireLightSystem(defaultScene, FIRE_LIGHT_CONFIG, "");
assert.equal(defaultSystem.enabled, true);
assert.equal(defaultSystem.raysRequested, false);
assert.equal(defaultSystem.rayRenderer.available, false);
assert.equal(defaultSystem.presentation.id, "natural-fire-v1");
assert.equal(defaultSystem.illuminationRequested, false);
assert.equal(defaultSystem.usesProceduralWorldGlow(), true);
assert.equal(defaultSystem.getProceduralShaderMix(), 0.96);
defaultSystem.destroy();

const scene = makeScene(true);
const system = new FireLightSystem(scene, FIRE_LIGHT_CONFIG, "?fireRays=1");
assert.equal(system.enabled, true);
assert.equal(system.raysRequested, true);
system.renderFrame({
  time: 1000,
  deltaMs: 16,
  torchActive: true,
  source: { x: 200, y: 300, facingSign: 1, source: "contract" },
  tileSize,
  radiusWorld: tileSize * 6,
  glowStrength: 1,
  fuelRatio: 0.5,
  lighting: cave,
  worldModel: {
    worldToTile: (x, y) => ({ tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) }),
    inBounds: () => true,
    isSolid: () => false,
  },
});
const snapshot = system.getSnapshot();
assert.equal(snapshot.active, true);
assert.equal(snapshot.renderer.state, "rekindle");
assert.equal(snapshot.renderer.visibleLayerCount, 1);
assert.equal(snapshot.heldTorch.available, true);
assert.equal(snapshot.heldTorch.visible, true);
assert.equal(snapshot.rays.visibleRayCount, FIRE_LIGHT_CONFIG.rays.maxSources);
assert.ok(snapshot.eyeAdaptation.available);
assert.equal(snapshot.eyeAdaptation.effectScale, 0.24);
system.renderFrame({
  time: 1016,
  deltaMs: 16,
  torchActive: true,
  source: { x: 200, y: 300, facingSign: 1, source: "contract", obstructed: true },
  tileSize,
  radiusWorld: tileSize * 6,
  glowStrength: 1,
  fuelRatio: 0.5,
  lighting: cave,
  worldModel: { worldToTile: () => ({ tx: 0, ty: 0 }), inBounds: () => true, isSolid: () => false },
});
assert.equal(system.getSnapshot().heldTorch.visible, false);
assert.equal(system.getSnapshot().renderer.visibleLayerCount, 0);
system.destroy();

const legacyScene = makeScene(true);
const legacySystem = new FireLightSystem(
  legacyScene,
  FIRE_LIGHT_CONFIG,
  "?fireLight=legacy"
);
assert.equal(legacySystem.enabled, false);
assert.equal(legacySystem.getSnapshot().presentationId, "legacy-procedural-v2");
assert.equal(legacyScene.actors.length, 0);

const missingAssetScene = makeScene(false);
const missingAssetSystem = new FireLightSystem(
  missingAssetScene,
  FIRE_LIGHT_CONFIG,
  ""
);
assert.equal(missingAssetSystem.enabled, false);
assert.equal(missingAssetSystem.disabledReason, "missing-authored-assets");
assert.equal(missingAssetScene.actors.length, 0);

const queuedFireSheets = [];
queueCapabilityFireAssets({
  textures: { exists: () => false },
  load: { spritesheet: key => queuedFireSheets.push(key) },
}, "");
const activeLayerIds = new Set([
  "steadyFlame", "stateFlame",
]);
if (resolveFireRaysEnabled("")) activeLayerIds.add("rays");
assert.deepEqual(
  queuedFireSheets,
  FIRE_LIGHT_ASSETS.filter(asset => activeLayerIds.has(asset.id))
    .map(asset => asset.key),
);

const sourceChecks = new Map([
  ["systems/lighting/LightSystem.js", ["new FireLightSystem", "resolveFireLightAnchor", "ownsTorchPresentation", "usesProceduralWorldGlow"]],
  ["systems/lighting/ShaderSystem.js", ["uFireLightProceduralMix"]],
  ["systems/lighting/darknessLightShader.js", ["uFireLightProceduralMix"]],
]);
for (const [file, needles] of sourceChecks) {
  const source = readFileSync(resolve(root, file), "utf8");
  for (const needle of needles) assert.ok(source.includes(needle), `${file} must include ${needle}`);
}
const fireSource = readFileSync(resolve(root, "systems/lighting/FireLightSystem.js"), "utf8");
assert.ok(!fireSource.includes("LightRayAtmosphere"));
assert.ok(!fireSource.includes("SkySteadyLightRenderer"));
assert.ok(!fireSource.includes("SkyBeaconPulseRenderer"));

for (const file of [
  "systems/lighting/FireLightSystem.js",
  "systems/lighting/FireLightRenderer.js",
  "systems/lighting/HeldTorchRenderer.js",
  "systems/lighting/FireLightRayRenderer.js",
  "systems/lighting/EyeAdaptationSystem.js",
  "systems/lighting/fireLightMath.js",
  "systems/lighting/resolveFireLightAnchor.js",
]) {
  const lines = readFileSync(resolve(root, file), "utf8").split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} must remain at or below 300 lines`);
}

console.log("fire light passed: natural default, hidden rays, material review, layered rollback");
