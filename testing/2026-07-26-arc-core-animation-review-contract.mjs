import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARC_CORE_ANIMATION_REVIEW,
  getArcCoreAnimationReviewMode,
  resolveArcCoreAnimationReviewPhase,
} from "../values/arcCoreAnimationReview.js";
import { ARC_CORE_CONFIG } from "../values/arcCoreConfig.js";
import { ANIMATION_SANDBOX_HITBOX_CONFIG } from "../values/animationSandboxHitboxConfig.js";
import { resolveArcCoreDigFootprint } from "../systems/vehicles/arcCoreDigFootprint.js";
import { ArcCoreVehicleSystem } from "../systems/vehicles/ArcCoreVehicleSystem.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const sandboxSource = read("testing/animation-sandbox/tanktest-v1/sandbox.js");
const rendererSource = read("testing/animation-sandbox/tanktest-v1/arcCoreReviewRenderer.js");
const damageRendererSource = read("testing/animation-sandbox/tanktest-v1/arcCoreReviewDamageRenderer.js");
const readmeSource = read("testing/animation-sandbox/tanktest-v1/readme.md");
const keybindSource = read("values/keybindActions.js");
const inputSource = read("world/playScene/PlayerInputHandler.js");
const vehicleSource = read("systems/vehicles/ArcCoreVehicleSystem.js");

assert.equal(ARC_CORE_ANIMATION_REVIEW.reviewOnly, true);
assert.equal(ARC_CORE_ANIMATION_REVIEW.productionChanged, false);
assert.equal(ARC_CORE_ANIMATION_REVIEW.controls.digKey, "F");

const small = getArcCoreAnimationReviewMode(ARC_CORE_ANIMATION_REVIEW.small.id);
const omega = getArcCoreAnimationReviewMode(ARC_CORE_ANIMATION_REVIEW.omega.id);
assert.ok(small);
assert.ok(omega);
assert.notEqual(small.silhouette, omega.silhouette);
assert.notEqual(small.idleSignature, omega.idleSignature);
assert.notEqual(small.digSignature, omega.digSignature);
assert.ok(small.digDurationSeconds < omega.digDurationSeconds);
assert.notEqual(small.breakProgress, omega.breakProgress);
assert.notEqual(
  resolveArcCoreAnimationReviewPhase(small.id, 0.2),
  resolveArcCoreAnimationReviewPhase(omega.id, 0.2),
);

assert.equal(
  resolveArcCoreDigFootprint({ tx: 20, ty: 30 }, "RIGHT", ARC_CORE_CONFIG.dig).length,
  4,
  "small Arc review must retain the production 2x2 footprint",
);
assert.equal(
  resolveArcCoreDigFootprint({ tx: 20, ty: 30 }, "RIGHT", ARC_CORE_CONFIG.omega.dig).length,
  64,
  "Omega review must retain the production 8x8 footprint",
);
assert.equal(ANIMATION_SANDBOX_HITBOX_CONFIG.arcCoreSmall.width, 44);
assert.equal(ANIMATION_SANDBOX_HITBOX_CONFIG.arcCoreOmega.width, 62);
assert.ok(
  ANIMATION_SANDBOX_HITBOX_CONFIG.arcCoreOmega.width < omega.bodyRadiusPx * 2,
  "Omega visual overhang must not inflate its pilot collision hull",
);

assert.match(sandboxSource, /Small Arc — Needle/);
assert.match(sandboxSource, /Omega — Array/);
assert.match(sandboxSource, /makeOmegaReviewWorld/);
assert.match(sandboxSource, /drawArcCoreAnimationReview/);
assert.match(sandboxSource, /drawArcCoreAnimationReviewDamage/);
assert.match(sandboxSource, /KeyCodes\.F/);
assert.doesNotMatch(sandboxSource, /keyE\b/);
assert.match(rendererSource, /drawSmallCore/);
assert.match(rendererSource, /drawOmegaCore/);
assert.match(rendererSource, /drawSmallBore/);
assert.match(rendererSource, /drawOmegaBore/);
assert.match(damageRendererSource, /drawArcCoreAnimationReviewDamage/);
assert.match(readmeSource, /productionChanged: false/);

assert.match(keybindSource, /id: "interact"[\s\S]*defaultKey: "E"/);
assert.match(keybindSource, /id: "arcCoreVehicle"[\s\S]*defaultKey: "B"/);
assert.match(inputSource, /addBoundKey\("arcCoreVehicle"\)/);
assert.match(vehicleSource, /keys\?\.arcCoreVehicle/);
assert.match(vehicleSource, /getKeyLabel\("arcCoreVehicle"\)/);
assert.doesNotMatch(vehicleSource, /keys\?\.interact/);

globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown: key => key?.justDown === true,
    },
  },
};
const visual = () => ({
  x: 0,
  y: 0,
  text: "",
  setDisplaySize() { return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
  setText(text) { this.text = text; return this; },
  setTint() { return this; },
  setVisible() { return this; },
});
const vehicleScene = {
  config: { tileSize: 64 },
  upgradeSystem: {
    godModeActive: false,
    getUpgradeLevel: upgradeId => upgradeId === ARC_CORE_CONFIG.upgradeId ? 1 : 0,
  },
  player: { setVisible() {} },
  playerBodyLanguage: { setEnabled() {} },
  hudSystem: { flashStatus() {} },
};
const vehicle = new ArcCoreVehicleSystem(vehicleScene);
vehicle.sprite = visual();
vehicle.prompt = visual();
const parking = { tx: ARC_CORE_CONFIG.parking.tileX, ty: ARC_CORE_CONFIG.parking.tileY };
assert.equal(
  vehicle.update(parking, { interact: { justDown: true } }),
  false,
  "E interact must not board the Arc Core",
);
assert.equal(
  vehicle.update(parking, { arcCoreVehicle: { justDown: true } }),
  true,
  "the dedicated vehicle action must board the Arc Core",
);
assert.equal(vehicle.isActive(), true);
assert.match(vehicle.prompt.text, /\[B\] Pilot Arc Core/);

console.log("Arc Core animation review contract: PASS");
