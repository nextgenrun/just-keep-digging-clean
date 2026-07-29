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
  resolveArcCoreReviewCapture,
  resolveArcCoreVisualPhase,
  resolveArcCoreVisualsEnabled,
} from "../values/arcCoreVisualConfig.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import { resolveArcCoreDigFootprint } from "../systems/vehicles/arcCoreDigFootprint.js";
import {
  applyArcCoreLayer,
  hideArcCoreLayers,
} from "../systems/vehicles/arcCoreLayerPlacement.js";
import { preloadArcCoreVisualAssets } from "../systems/vehicles/arcCoreVisualRenderer.js";
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
assert.equal(
  ARC_CORE_VISUAL_PACK.revision,
  "20260728-arc-core-dig-repair-v4",
);
assert.deepEqual(ARC_CORE_VISUAL_CONFIG.controls, {
  digKey: "F",
  cloudKey: "B",
  smallArcKey: "1",
  omegaArcKey: "2",
  refillMineKey: "R",
});
assert.equal(resolveArcCoreVisualsEnabled(""), true);
assert.equal(resolveArcCoreVisualsEnabled("?arcCoreVisualsV3=0"), false);
assert.deepEqual(
  resolveArcCoreReviewCapture("?arcMode=omega&arcAction=dig&arcProgress=0.62"),
  {
    mode: "arcCoreOmega",
    action: "dig",
    progress: 0.62,
    showHitbox: false,
  },
);
assert.equal(
  resolveArcCoreReviewCapture(
    "?arcMode=small&arcAction=idle&arcHitbox=1",
  ).showHitbox,
  true,
);
assert.equal(resolveArcCoreReviewCapture("?arcMode=small"), null);

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

assert.equal(meta.schemaVersion, 4);
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

let packCompleteEvent = null;
let packCompleteHandler = null;
let packJsonRequest = null;
const queuedImages = [];
preloadArcCoreVisualAssets({
  load: {
    once(event, handler) {
      packCompleteEvent = event;
      packCompleteHandler = handler;
    },
    json(key, url) {
      packJsonRequest = { key, url };
    },
    image(key, url) {
      queuedImages.push({ key, url });
    },
  },
}, "../../../");
assert.match(packCompleteEvent, /^filecomplete-json-/);
assert.match(packJsonRequest.url, /^\.\.\/\.\.\/\.\.\/values\//);
packCompleteHandler(packJsonRequest.key, "json", pack);
const roleImageRequests = queuedImages.filter(
  request => request.key !== "arc-core-v3-stage-background",
);
assert.equal(roleImageRequests.length, section.files.length);
assert.ok(roleImageRequests.every(
  request => request.url.startsWith(
    "../../../sprites/vehicles/arc-core-v3/runtime/",
  ),
));
assert.equal(meta.reviewStage.role, "stage.background");
assert.equal(section.files.some(file => file.role === meta.reviewStage.role), false);
assert.equal(Object.values(meta.renderTuning).every(Number.isFinite), true);
assert.ok(
  meta.modes.arcCoreSmall.bodyDisplaySizePx
    < meta.modes.arcCoreOmega.bodyDisplaySizePx,
);
assert.deepEqual(meta.modes.arcCoreSmall.collision, {
  kind: "circle",
  label: "Small Arc round shell",
  diameterPx: 104,
  centerPx: [256, 256],
});
assert.deepEqual(meta.modes.arcCoreOmega.collision, {
  kind: "circle",
  label: "Omega Arc round array hull",
  diameterPx: 416,
  centerPx: [256, 256],
});
assert.equal(
  meta.modes.arcCoreOmega.collision.diameterPx
    / meta.modes.arcCoreSmall.collision.diameterPx,
  4,
);
const smallProfile = meta.modes.arcCoreSmall;
const omegaProfile = meta.modes.arcCoreOmega;
assert.equal(
  section.files.find(file => file.role === "small.impact").url,
  "small-arc-impact-v4.png",
);
assert.equal(
  section.files.find(file => file.role === "omega.impact").url,
  "omega-arc-impact-v4.png",
);
assert.match(meta.piskelSources[0], /arc-core-body-and-fx-v4\.piskel$/);
for (const [profile, mode] of [
  [smallProfile, small],
  [omegaProfile, omega],
]) {
  assert.ok(profile.dig.bodyMotion.bracePullbackPx > 0);
  assert.ok(profile.dig.bodyMotion.contactDrivePx > 0);
  assert.ok(profile.dig.bodyMotion.breakScaleRatio > 0);
  assert.ok(profile.dig.impactStartScale < 1);
  assert.ok(profile.dig.impactEndScale >= 1);
  assert.ok(
    Math.abs(profile.dig.timeline.impactPeak - mode.breakProgress) <= 0.02,
    `${mode.label} impact must peak on the real tile-break frame`,
  );
}
assert.notDeepEqual(smallProfile.dig.bodyMotion, omegaProfile.dig.bodyMotion);
for (const texture of Object.values(
  ARC_CORE_VISUAL_CONFIG.reviewStage.targetTextures,
)) {
  assert.equal(exists(texture.path), true, `${texture.path} must exist`);
}

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
assert.match(builder, /COLLISION_PROFILES/);
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
assert.match(renderer, /bodyMotion/);
assert.match(renderer, /alongScale/);
assert.match(actionVisuals, /const reach =/);
assert.match(actionVisuals, /impactScale/);
assert.match(sandboxStage, /reviewStage/);
assert.match(sandboxStage, /targetTextures/);
assert.match(sandboxStage, /\.setTexture\(style\.texture\.key\)/);
assert.doesNotMatch(sandboxStage, /roleByTileType|ensureTilePool|stageRoles/);
assert.match(
  sandbox,
  /capture\.progress >= mode\.breakProgress[\s\S]*TILE\.AIR/,
);
assert.match(sandbox, /KeyCodes\.F/);
assert.match(sandbox, /KeyCodes\.B/);
assert.doesNotMatch(sandbox, /keyE\b/);
assert.match(boot, /ASSET_KEYS\.vehicles\.arcCore\.pack/);
assert.match(boot, /ARC_CORE_VISUAL_PACK\.path/);
assert.match(boot, /ARC_CORE_VISUAL_PACK\.revision/);
assert.match(renderer, /ARC_CORE_VISUAL_PACK\.revision/);
assert.match(vehicleSystem, /new ArcCoreVisualSystem/);
assert.match(vehicleSystem, /playDigAnimation/);
assert.match(vehicleSystem, /applyActiveCollisionProfile/);
assert.match(playUpdate, /arcCoreVehicleSystem\.playDigAnimation/);
assert.doesNotMatch(`${vehicleSystem}\n${playUpdate}`, /playDigPulse/);
assert.match(keybinds, /id: "interact"[\s\S]*defaultKey: "E"/);
assert.match(keybinds, /id: "arcCoreVehicle"[\s\S]*defaultKey: "B"/);
assert.match(userSettings, /action\.id === "arcCoreVehicle"[\s\S]*savedInteractKey/);
assert.match(input, /addBoundKey\("arcCoreVehicle"\)/);
assert.match(visualSystem, /getHealthSnapshot/);
assert.match(canaries, /arcCoreVisualFindings/);

const layerCalls = [];
const cachedLayer = {
  visible: false,
  setVisible(value) {
    this.visible = value;
    layerCalls.push(["visible", value]);
    return this;
  },
  setTexture(value) { layerCalls.push(["texture", value]); return this; },
  setOrigin(x, y) { layerCalls.push(["origin", x, y]); return this; },
  setDepth(value) { layerCalls.push(["depth", value]); return this; },
  setTint(value) { layerCalls.push(["tint", value]); return this; },
  setPosition(x, y) { layerCalls.push(["position", x, y]); return this; },
  setDisplaySize(w, h) { layerCalls.push(["size", w, h]); return this; },
  setAngle(value) { layerCalls.push(["angle", value]); return this; },
  setAlpha(value) { layerCalls.push(["alpha", value]); return this; },
};
const layerOptions = {
  texture: "arc-core-v3-small-body",
  x: 100,
  y: 200,
  width: 114,
  height: 114,
  depth: 20,
  alpha: 1,
  visibleAlphaThreshold: 0.001,
};
applyArcCoreLayer(cachedLayer, layerOptions);
assert.equal(cachedLayer.visible, true);
hideArcCoreLayers({ body: cachedLayer }, ["body"]);
assert.equal(cachedLayer.visible, false);
applyArcCoreLayer(cachedLayer, layerOptions);
assert.equal(
  cachedLayer.visible,
  true,
  "a hidden cached layer must become visible when its animation resumes",
);
assert.equal(
  layerCalls.filter(call => call[0] === "texture").length,
  1,
  "static texture assignment should stay cached across animation frames",
);

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
  getCollisionProfile() {
    return {
      kind: "circle",
      label: "Small Arc round shell",
      diameterPx: 104,
      radiusPx: 52,
    };
  },
  startDig(...args) { digRequest = args; return true; },
  destroy() {},
};
const fakeBody = {
  x: 100,
  y: 200,
  w: 32,
  h: 48,
  collisionKind: "rect",
  collisionRadiusPx: null,
  resetVelocity() {},
};
const vehicle = new ArcCoreVehicleSystem({
  config: { tileSize: 64 },
  time: { now: 200 },
  upgradeSystem: {
    godModeActive: false,
    getUpgradeLevel: id => id === ARC_CORE_CONFIG.upgradeId ? 1 : 0,
  },
  player: chainedVisual(),
  playerController: {
    physicsBody: fakeBody,
    _syncSpriteWithPhysics() {},
  },
  tileCollisionSystem: { resolveBodyOverlap: () => true },
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
assert.deepEqual(
  {
    x: fakeBody.x,
    y: fakeBody.y,
    w: fakeBody.w,
    h: fakeBody.h,
    kind: fakeBody.collisionKind,
    radius: fakeBody.collisionRadiusPx,
  },
  { x: 64, y: 144, w: 104, h: 104, kind: "circle", radius: 52 },
);
assert.equal(vehicle.playDigAnimation([{ tx: 1, ty: 2 }], "RIGHT", 200), true);
assert.deepEqual(digRequest, [[{ tx: 1, ty: 2 }], "RIGHT", 200]);
assert.equal(vehicle.update(parking, { arcCoreVehicle: { justDown: true } }), true);
assert.equal(vehicle.isActive(), false);
assert.deepEqual(
  {
    x: fakeBody.x,
    y: fakeBody.y,
    w: fakeBody.w,
    h: fakeBody.h,
    kind: fakeBody.collisionKind,
  },
  { x: 100, y: 200, w: 32, h: 48, kind: "rect" },
);

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
