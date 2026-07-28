import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ARC_CORE_CONFIG } from "../values/arcCoreConfig.js";
import { ARC_CORE_VISUAL_PACK } from "../values/arcCoreVisualAssets.js";
import {
  ARC_CORE_VISUAL_CONFIG,
  getArcCoreVisualMode,
  resolveArcCoreVisualPhase,
  resolveArcCoreVisualsEnabled,
} from "../values/arcCoreVisualConfig.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import { resolveArcCoreDigFootprint } from "../systems/vehicles/arcCoreDigFootprint.js";
import { ArcCoreVehicleSystem } from "../systems/vehicles/ArcCoreVehicleSystem.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const exists = relativePath => fs.existsSync(path.join(ROOT, relativePath));
const digest = contents => crypto.createHash("sha256").update(contents).digest("hex");

const pack = JSON.parse(read(ARC_CORE_VISUAL_PACK.path));
const section = pack[ARC_CORE_VISUAL_PACK.assetSection];
const meta = pack[ARC_CORE_VISUAL_PACK.metaSection];
const sandbox = read("testing/animation-sandbox/tanktest-v1/sandbox.js");
const sandboxStage = read("testing/animation-sandbox/tanktest-v1/arcCorePiskelStage.js");
const renderer = read("systems/vehicles/arcCoreVisualRenderer.js");
const actionVisuals = read("systems/vehicles/arcCoreActionVisuals.js");
const cloudTransition = read("systems/vehicles/arcCoreCloudTransition.js");
const visualSystem = read("systems/vehicles/ArcCoreVisualSystem.js");
const vehicleSystem = read("systems/vehicles/ArcCoreVehicleSystem.js");
const boot = read("ui/scenes/BootScene.js");
const playUpdate = read("world/playScene/PlaySceneUpdate.js");
const keybinds = read("values/keybindActions.js");
const userSettings = read("systems/UserSettings.js");
const input = read("world/playScene/PlayerInputHandler.js");
const canaries = read("systems/health/runtimeCanaryChecks.js");
const builder = read("pipelines/piskel/2026-07-26-build-arc-core-piskel-package.py");

assert.equal(ARC_CORE_VISUAL_CONFIG.approved, true);
assert.equal(ARC_CORE_VISUAL_CONFIG.reviewOnly, false);
assert.equal(ARC_CORE_VISUAL_CONFIG.productionChanged, true);
assert.equal(ARC_CORE_VISUAL_PACK.revision, "20260727-arc-core-subdir-v1");
assert.deepEqual(ARC_CORE_VISUAL_CONFIG.controls, {
  digKey: "F",
  cloudKey: "B",
  smallArcKey: "1",
  omegaArcKey: "2",
});
assert.equal(resolveArcCoreVisualsEnabled(""), true);
assert.equal(resolveArcCoreVisualsEnabled("?arcCoreVisualsV3=0"), false);

const small = getArcCoreVisualMode(ARC_CORE_VISUAL_CONFIG.small.id);
const omega = getArcCoreVisualMode(ARC_CORE_VISUAL_CONFIG.omega.id);
assert.match(small.silhouette, /round/);
assert.notEqual(small.silhouette, omega.silhouette);
assert.notEqual(small.idleSignature, omega.idleSignature);
assert.notEqual(small.digSignature, omega.digSignature);
assert.ok(small.digDurationSeconds < omega.digDurationSeconds);
assert.ok(small.cloudDurationMs < omega.cloudDurationMs);
assert.notEqual(
  resolveArcCoreVisualPhase(small.id, 0.7),
  resolveArcCoreVisualPhase(omega.id, 0.7),
);
assert.equal(
  resolveArcCoreDigFootprint({ tx: 20, ty: 30 }, "RIGHT", ARC_CORE_CONFIG.dig).length,
  4,
);
assert.equal(
  resolveArcCoreDigFootprint({ tx: 20, ty: 30 }, "RIGHT", ARC_CORE_CONFIG.omega.dig).length,
  64,
);

assert.equal(meta.schemaVersion, 3);
assert.equal(meta.packageId, ARC_CORE_VISUAL_CONFIG.health.packageId);
assert.equal(meta.pipeline, ARC_CORE_VISUAL_CONFIG.health.pipeline);
assert.equal(meta.approved, true);
assert.equal(meta.reviewOnly, false);
assert.equal(meta.productionChanged, true);
assert.deepEqual(meta.anchorPx, [256, 256]);
assert.equal(section.files.length, ARC_CORE_VISUAL_CONFIG.health.productionRoleCount);
assert.equal(new Set(section.files.map(file => file.role)).size, section.files.length);
assert.equal(new Set(section.files.map(file => file.key)).size, section.files.length);
assert.equal(section.path, "sprites/vehicles/arc-core-v3/runtime/");
assert.equal(
  section.path.startsWith("/"),
  false,
  "production pack paths must remain relative to the deployed game subdirectory",
);
assert.equal(meta.reviewStage.role, "stage.background");
assert.equal(section.files.some(file => file.role === meta.reviewStage.role), false);
assert.equal(Object.values(meta.renderTuning).every(Number.isFinite), true);
assert.ok(
  meta.modes.arcCoreSmall.bodyDisplaySizePx
    < meta.modes.arcCoreOmega.bodyDisplaySizePx,
);

const piskelRoles = new Set();
assert.equal(meta.piskelSources.length, 2);
for (const sourcePath of meta.piskelSources) {
  const project = JSON.parse(read(sourcePath));
  assert.equal(project.modelVersion, 2);
  assert.equal(project.jkdAlignment.policy, "fixed-canvas-zero-drift");
  assert.equal(project.jkdAlignment.driftTolerancePx, 0);
  assert.deepEqual(project.jkdAlignment.anchorPx, [
    project.piskel.width / 2,
    project.piskel.height / 2,
  ]);
  for (const role of project.jkdAlignment.roles) {
    assert.match(role.pixelSha256, /^[a-f0-9]{64}$/);
    piskelRoles.add(role.role);
  }
}
assert.deepEqual(
  [...piskelRoles].sort(),
  [...section.files.map(file => file.role), meta.reviewStage.role].sort(),
);
assert.match(builder, /Piskel round-trip pixel mismatch/);
assert.doesNotMatch(builder, /stage-tiles|review-hud|ui\.hud/);

const runtimeRoot = path.join(ROOT, section.path.replace(/^[/\\]+/, ""));
for (const asset of section.files) {
  const contents = fs.readFileSync(path.join(runtimeRoot, asset.url));
  assert.ok(contents.length > 50_000, `${asset.role} must contain final artwork`);
  assert.equal(contents.readUInt32BE(16), 512);
  assert.equal(contents.readUInt32BE(20), 512);
  assert.equal(digest(contents), asset.sha256, `${asset.role} hash mismatch`);
}
const background = fs.readFileSync(path.join(runtimeRoot, meta.reviewStage.url));
assert.equal(background.readUInt32BE(16), 1280);
assert.equal(background.readUInt32BE(20), 720);
assert.equal(digest(background), meta.reviewStage.sha256);

for (const rejected of [
  "runtime/arc-stage-dirt-v3.png",
  "runtime/arc-stage-stone-v3.png",
  "runtime/arc-stage-floor-v3.png",
  "runtime/arc-stage-bedrock-v3.png",
  "piskel/arc-core-stage-tiles-v3.piskel",
]) {
  assert.equal(exists(`sprites/vehicles/arc-core-v3/${rejected}`), false);
}
for (const rejectedActivePath of [
  "visual-approval-previews/arc-core-layered-sprite-v2",
  "tools/build_arc_core_review_contact_sheet.py",
]) {
  assert.equal(
    exists(rejectedActivePath),
    false,
    `${rejectedActivePath} must remain outside active review/build paths`,
  );
}
for (const archived of [
  "attachments/rejected-ornamental-hud.png",
  "attachments/rejected-stage-tile-atlas.png",
  "piskel/arc-core-stage-tiles-v3.piskel",
  "runtime/arc-stage-dirt-v3.png",
  "runtime/arc-stage-stone-v3.png",
  "runtime/arc-stage-floor-v3.png",
  "runtime/arc-stage-bedrock-v3.png",
  "preview/legacy-layered-html-v2/2026-07-26-arc-core-layered-sprite-v2-contact-sheet.png",
  "tools/2026-07-26-build-legacy-arc-review-contact-sheet.py",
]) {
  assert.equal(
    exists(`archive/2026-07-26-rejected-arc-review-random-art/${archived}`),
    true,
    `${archived} must remain recoverable`,
  );
}

const activeVisualSources = [
  renderer,
  actionVisuals,
  cloudTransition,
  visualSystem,
].join("\n");
assert.doesNotMatch(
  activeVisualSources,
  /\.fillStyle|\.lineStyle|\.fillCircle|\.strokeCircle|\.lineBetween|add\.graphics/,
  "production Arc presentation must use authored image layers",
);
assert.match(renderer, /meta\.pipeline !== "piskel-roundtrip"/);
assert.match(renderer, /drawArcCoreActionVisuals/);
assert.match(sandboxStage, /reviewStage/);
assert.doesNotMatch(sandboxStage, /roleByTileType|ensureTilePool|stageRoles/);
assert.match(sandbox, /KeyCodes\.F/);
assert.match(sandbox, /KeyCodes\.B/);
assert.doesNotMatch(sandbox, /keyE\b/);
assert.match(boot, /ASSET_KEYS\.vehicles\.arcCore\.pack/);
assert.match(boot, /ARC_CORE_VISUAL_PACK\.path/);
assert.match(boot, /ARC_CORE_VISUAL_PACK\.revision/);
assert.match(renderer, /ARC_CORE_VISUAL_PACK\.revision/);
assert.match(vehicleSystem, /new ArcCoreVisualSystem/);
assert.match(vehicleSystem, /playDigAnimation/);
assert.match(playUpdate, /arcCoreVehicleSystem\.playDigAnimation/);
assert.doesNotMatch(`${vehicleSystem}\n${playUpdate}`, /playDigPulse/);
assert.match(keybinds, /id: "interact"[\s\S]*defaultKey: "E"/);
assert.match(keybinds, /id: "arcCoreVehicle"[\s\S]*defaultKey: "B"/);
assert.match(userSettings, /action\.id === "arcCoreVehicle"[\s\S]*savedInteractKey/);
assert.match(input, /addBoundKey\("arcCoreVehicle"\)/);
assert.match(visualSystem, /getHealthSnapshot/);
assert.match(canaries, /arcCoreVisualFindings/);

globalThis.Phaser = {
  Input: { Keyboard: { JustDown: key => key?.justDown === true } },
};
const chainedVisual = () => ({
  text: "",
  setPosition() { return this; },
  setText(value) { this.text = value; return this; },
  setVisible() { return this; },
  setAlpha() { return this; },
  destroy() {},
});
let digRequest = null;
const fakeVisuals = {
  legacySprite: chainedVisual(),
  create() { return this; },
  setAnchor() { return this; },
  setDirection() { return this; },
  setProfile() { return this; },
  update() { return { transitionActive: false, playerAlpha: 1 }; },
  isTransitioning() { return false; },
  beginTransition() { return false; },
  getDisplaySizePx() { return 128; },
  startDig(...args) { digRequest = args; return true; },
  destroy() {},
};
const vehicle = new ArcCoreVehicleSystem({
  config: { tileSize: 64 },
  time: { now: 200 },
  upgradeSystem: {
    godModeActive: false,
    getUpgradeLevel: id => id === ARC_CORE_CONFIG.upgradeId ? 1 : 0,
  },
  player: chainedVisual(),
  playerBodyLanguage: { setEnabled() {} },
  hudSystem: { flashStatus() {} },
}, { visualSystem: fakeVisuals });
vehicle.sprite = fakeVisuals.legacySprite;
vehicle.prompt = chainedVisual();
const parking = {
  tx: ARC_CORE_CONFIG.parking.tileX,
  ty: ARC_CORE_CONFIG.parking.tileY,
};
assert.equal(vehicle.update(parking, { interact: { justDown: true } }), false);
assert.equal(vehicle.update(parking, { arcCoreVehicle: { justDown: true } }), true);
assert.equal(vehicle.isActive(), true);
assert.equal(vehicle.playDigAnimation([{ tx: 1, ty: 2 }], "RIGHT", 200), true);
assert.deepEqual(digRequest, [[{ tx: 1, ty: 2 }], "RIGHT", 200]);

const activeSinceByScene = new Map([["PlayScene", 0]]);
const unhealthyScene = {
  sys: { settings: { key: "PlayScene" }, isActive: () => true },
  arcCoreVehicleSystem: {
    visuals: {
      getHealthSnapshot: () => ({
        enabled: true,
        ready: false,
        packageId: meta.packageId,
        pipeline: meta.pipeline,
        fixedCenter: true,
        productionRoleCount: 10,
        missingTextures: ["arc-core-v3-small-body"],
      }),
    },
  },
};
const canary = evaluateRuntimeCanaries({
  canvas: { isConnected: true },
  loop: { frame: 1, actualFps: 60, running: true, inFocus: true },
  scene: { getScenes: () => [unhealthyScene] },
}, {
  noActiveSinceMs: null,
  lastFrame: 0,
  lastFrameChangedAtMs: 0,
  activeSinceByScene,
}, RUNTIME_CANARY_CONFIG.scenes.PlayScene.settleMs + 1);
assert.ok(canary.findings.some(
  finding => finding.code === RUNTIME_CANARY_CONFIG.events.arcCoreVisualInvariant,
));

console.log("Arc Core production visual contract: PASS");
