import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  OLD_SCHOOL_LAMP_LIGHT_ASSETS,
  OLD_SCHOOL_LAMP_LIGHT_CONFIG,
  getOldSchoolLampLightPreloadAssets,
  resolveOldSchoolLampLightReviewEnabled,
  resolveOldSchoolLampRaysEnabled,
} from "../values/oldSchoolLampLightConfig.js";
import { OldSchoolLampLightSystem } from
  "../systems/lighting/OldSchoolLampLightSystem.js";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(
  resolve(root, "sprites/environment/old-school-lamp-light-v1/manifest.json"),
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
  const addActor = () => {
    const actor = makeActor();
    actors.push(actor);
    return actor;
  };
  return {
    actors,
    textures: { exists: () => textureAvailable },
    add: { image: addActor, rectangle: addActor },
    cameras: { main: { width: 1280, height: 720 } },
    config: { viewportWidth: 1280, viewportHeight: 720 },
  };
}

assert.equal(resolveOldSchoolLampLightReviewEnabled(""), false);
assert.equal(
  resolveOldSchoolLampLightReviewEnabled("?carriedLightStyle=lamp-review"),
  true
);
assert.equal(
  resolveOldSchoolLampLightReviewEnabled("?carriedLightStyle=torch"),
  false
);
assert.equal(
  resolveOldSchoolLampRaysEnabled("?carriedLightStyle=lamp-review"),
  false
);
assert.equal(
  resolveOldSchoolLampRaysEnabled("?carriedLightStyle=lamp-review&fireRays=1"),
  true
);
assert.equal(getOldSchoolLampLightPreloadAssets("").length, 0);
assert.equal(
  getOldSchoolLampLightPreloadAssets("?carriedLightStyle=lamp-review").length,
  7
);

assert.equal(OLD_SCHOOL_LAMP_LIGHT_ASSETS.length, 7);
assert.equal(OLD_SCHOOL_LAMP_LIGHT_CONFIG.atlas.authoredComponentCount, 112);
assert.equal(OLD_SCHOOL_LAMP_LIGHT_CONFIG.atlas.authoredLightFrameCount, 96);
assert.equal(manifest.reviewOnly, true);
assert.equal(manifest.defaultUnchanged, "fire-light-v3");
assert.equal(manifest.selectionQuery, "?carriedLightStyle=lamp-review");
assert.equal(manifest.authoredComponentCount, 112);
assert.equal(OLD_SCHOOL_LAMP_LIGHT_CONFIG.rays.enabledByDefault, false);
assert.equal(new Set(OLD_SCHOOL_LAMP_LIGHT_ASSETS.map(asset => asset.key)).size, 7);

for (const asset of OLD_SCHOOL_LAMP_LIGHT_ASSETS) {
  const path = resolve(root, asset.path);
  const recorded = manifest.assets.find(
    entry => entry.file === asset.path.split("/").at(-1)
  );
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

const cave = {
  surfaceLightInfluence: 0,
  undergroundDarknessInfluence: 1,
  nightAmount: 1,
  sunStrength: 0,
  weather: { rainAmount: 0, lightningFlashAmount: 0 },
};
const tileSize = 94;
const hiddenRayScene = makeScene(true);
const hiddenRaySystem = new OldSchoolLampLightSystem(
  hiddenRayScene,
  OLD_SCHOOL_LAMP_LIGHT_CONFIG,
  "?carriedLightStyle=lamp-review"
);
assert.equal(hiddenRaySystem.enabled, true);
assert.equal(hiddenRaySystem.raysRequested, false);
assert.equal(hiddenRaySystem.rayRenderer.available, false);
hiddenRaySystem.destroy();

const scene = makeScene(true);
const system = new OldSchoolLampLightSystem(
  scene,
  OLD_SCHOOL_LAMP_LIGHT_CONFIG,
  "?carriedLightStyle=lamp-review&fireRays=1"
);
assert.equal(system.enabled, true);
assert.equal(system.raysRequested, true);
system.renderFrame({
  time: 1400,
  deltaMs: 16,
  torchActive: true,
  source: { x: 200, y: 300, facingSign: 1, source: "contract" },
  tileSize,
  radiusWorld: tileSize * 6,
  glowStrength: 1,
  fuelRatio: 0.75,
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
const snapshot = system.getSnapshot();
assert.equal(snapshot.id, "old-school-lamp-light-v1");
assert.equal(snapshot.style, "old-school-lamp");
assert.equal(snapshot.reviewOnly, true);
assert.equal(snapshot.active, true);
assert.equal(Object.keys(snapshot.renderer.frames).length, 6);
assert.equal(snapshot.rays.visibleRayCount, 3);
assert.equal(snapshot.eyeAdaptation.available, true);
assert.equal(snapshot.proceduralShaderMix, 0.12);
system.destroy();

const defaultScene = makeScene(true);
const defaultSystem = new OldSchoolLampLightSystem(
  defaultScene,
  OLD_SCHOOL_LAMP_LIGHT_CONFIG,
  ""
);
assert.equal(defaultSystem.enabled, false);
assert.equal(defaultScene.actors.length, 0);

const missingScene = makeScene(false);
const missingSystem = new OldSchoolLampLightSystem(
  missingScene,
  OLD_SCHOOL_LAMP_LIGHT_CONFIG,
  "?carriedLightStyle=lamp-review"
);
assert.equal(missingSystem.enabled, false);
assert.equal(missingSystem.disabledReason, "missing-authored-assets");
assert.equal(missingScene.actors.length, 0);

const sourceChecks = new Map([
  ["ui/scenes/BootScene.js", [
    "getOldSchoolLampLightPreloadAssets",
    "load.spritesheet",
  ]],
  ["systems/lighting/LightSystem.js", [
    "resolveOldSchoolLampLightReviewEnabled",
    "new OldSchoolLampLightSystem",
    "new FireLightSystem",
    "resolveFireLightAnchor",
  ]],
]);
for (const [file, needles] of sourceChecks) {
  const source = readFileSync(resolve(root, file), "utf8");
  for (const needle of needles) {
    assert.ok(source.includes(needle), `${file} must include ${needle}`);
  }
}
for (const file of [
  "values/oldSchoolLampLightConfig.js",
  "systems/lighting/OldSchoolLampLightRenderer.js",
  "systems/lighting/OldSchoolLampRayRenderer.js",
  "systems/lighting/OldSchoolLampLightSystem.js",
]) {
  const lines = readFileSync(resolve(root, file), "utf8").split(/\r?\n/).length;
  assert.ok(lines <= 300, `${file} must remain at or below 300 lines`);
}

console.log(
  "old-school lamp passed: 7 atlases, hidden rays, opt-in tracing, exposure, fallback"
);
