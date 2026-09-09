import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { HardcoreStatusHud } from "../systems/visual/HardcoreStatusHud.js";
import { acquireUiInputPriority } from "../systems/UiInputPriorityRegistry.js";
import { ScreenFlashSystem } from "../systems/visual/ScreenFlashSystem.js";
import { HardcoreModeSystem } from "../systems/hardcore/HardcoreModeSystem.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { GAMEFEEL_CONFIG } from "../values/gamefeel.js";
import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { HUD_LAYOUT } from "../values/hudLayout.js";
import { SHADER_CONFIG } from "../values/shaderConfig.js";
import { getHardcoreModeOnlyPreloadAssets } from
  "../values/hardcoreModeAssetPacks.js";
import {
  HARDCORE_PANIC_PRESENTATION,
  resolveHardcorePanicView,
} from "../values/hardcorePanicPresentation.js";
import {
  HARDCORE_PANIC_BOUNDARY,
  resolveHardcorePanicBoundary,
} from "../values/hardcorePanicBoundary.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from
  "../values/uiNotificationCarousel.js";
import { readRgbaPng } from "./titanCreatureFootprintFixture.mjs";

class FakeObject {
  constructor(x = 0, y = 0, key = null, text = "") {
    this.x = x;
    this.y = y;
    this.key = key;
    this.text = text;
    this.visible = true;
    this.alpha = 1;
    this.scale = 1;
    this.children = [];
  }
  setOrigin() { return this; }
  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }
  setScrollFactor() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setVisible(value) { this.visible = value; return this; }
  setDisplaySize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    return this;
  }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setScale(value) { this.scale = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setFillStyle(value) { this.fillColor = value; return this; }
  setTexture(key) { this.key = key; return this; }
  setText(value) { this.text = value; return this; }
  setColor(value) { this.color = value; return this; }
  setFontSize(value) { this.fontSize = value; return this; }
  add(children) { this.children.push(...children); return this; }
  destroy() { this.destroyed = true; }
}

function createScene(missingKeys = []) {
  const missing = new Set(missingKeys);
  let panicFlashCalls = 0;
  return {
    scale: { width: 1280, height: 720 },
    config: { topAirRows: 65, tileSize: 94 },
    cameras: {
      main: {
        zoom: 1,
        scrollX: 0,
        worldView: { width: 1280, centerX: 640 },
      },
    },
    textures: { exists: key => !missing.has(key) },
    screenFlashSystem: {
      flashPanic() { panicFlashCalls += 1; },
    },
    getPanicFlashCalls: () => panicFlashCalls,
    add: {
      container: (x, y) => new FakeObject(x, y),
      image: (x, y, key) => new FakeObject(x, y, key),
      text: (x, y, text) => new FakeObject(x, y, null, text),
    },
  };
}

function hardcoreSnapshot(overrides = {}) {
  const snapshot = {
    isHardcore: true,
    armed: true,
    exhausted: false,
    livesRemaining: 1,
    freeReviveAvailable: false,
    stress: 20,
    stressBand: "calm",
    stressGpDrainPerSecond: 0,
    panicStartDepth: 42,
    panicResistanceMeters: 20,
    insideConsumedStarScar: false,
    consumedStarStressMultiplier: 1,
    ...overrides,
  };
  const maximum = HARDCORE_MODE_CONFIG.stress.maximum;
  return {
    ...snapshot,
    stressRatio: snapshot.stress / maximum,
    sanity: maximum - snapshot.stress,
    sanityRatio: 1 - snapshot.stress / maximum,
  };
}

const assets = HARDCORE_MODE_CONFIG.assets;
const overlayLayout = HARDCORE_PANIC_PRESENTATION.overlay;
const riskThresholds = {
  nearDeathGpThreshold: HARDCORE_MODE_CONFIG.stress.nearDeathGpThreshold,
  lastBreathGpThreshold: HARDCORE_MODE_CONFIG.checkpoint.lowGpImmediateThreshold,
  panicStartDepth: HARDCORE_MODE_CONFIG.stress.panicStartDepthTiles,
};
const flashConfig = GAMEFEEL_CONFIG.flash;
assert.equal(flashConfig.panicColor, 0xff1f2d);
assert.ok(flashConfig.panicAlpha >= 0.25 && flashConfig.panicAlpha <= 0.5);
assert.ok(flashConfig.panicDuration >= 150 && flashConfig.panicDuration <= 400);

const flashRect = new FakeObject();
let flashTweenConfig = null;
const flashSystem = new ScreenFlashSystem({
  scale: { width: 1280, height: 720 },
  add: { rectangle: () => flashRect },
  tweens: {
    add(config) {
      flashTweenConfig = config;
      return { stop() {} };
    },
  },
}, flashConfig);
flashSystem.flashPanic();
assert.equal(flashRect.fillColor, flashConfig.panicColor);
assert.equal(flashRect.alpha, flashConfig.panicAlpha);
assert.equal(flashTweenConfig.duration, flashConfig.panicDuration);
flashSystem.destroy();

assert.ok(
  overlayLayout.edgeDepth < HUD_LAYOUT.hudDepth,
  "the full-screen frame must remain behind persistent HUD controls",
);
assert.ok(
  overlayLayout.edgeDepth > SHADER_CONFIG.layers.lightningFlash.depth,
  "the full-screen frame must remain visible above darkness and weather",
);
assert.ok(
  HARDCORE_PANIC_BOUNDARY.renderDepth > SHADER_CONFIG.layers.lightningFlash.depth
    && HARDCORE_PANIC_BOUNDARY.renderDepth < overlayLayout.edgeDepth,
  "the panic line must stay above world lighting but below the panic overlay",
);
assert.ok(
  overlayLayout.bannerDepth > UI_NOTIFICATION_CAROUSEL_CONFIG.depth,
  "HIGH PANIC must outrank transient notification cards",
);
assert.ok(
  overlayLayout.bannerDepth < HARDCORE_MODE_CONFIG.ui.depth,
  "Hardcore confirmation and death modals must outrank HIGH PANIC",
);
const modePack = getHardcoreModeOnlyPreloadAssets();
assert.deepEqual(
  modePack.map(asset => asset.key),
  [
    assets.crest.key,
    assets.panicWarning.key,
    assets.panicCritical.key,
    assets.panicEdgeFrame.key,
  ],
  "the managed Hardcore pack must admit every panic presentation asset",
);
for (const asset of modePack) {
  assert.ok(
    existsSync(fileURLToPath(new URL(`../${asset.path}`, import.meta.url))),
    `missing panic presentation asset: ${asset.path}`,
  );
}

const warningPng = readRgbaPng(new URL(
  `../${assets.panicWarning.path}`,
  import.meta.url,
));
const criticalPng = readRgbaPng(new URL(
  `../${assets.panicCritical.path}`,
  import.meta.url,
));
for (const icon of [warningPng, criticalPng]) {
  assert.equal(icon.width, 1254);
  assert.equal(icon.height, 1254);
  const alphaAt = (x, y) => icon.rgba[(y * icon.width + x) * 4 + 3];
  assert.ok(alphaAt(0, 0) <= 1);
  assert.ok(alphaAt(icon.width - 1, 0) <= 1);
  assert.ok(alphaAt(0, icon.height - 1) <= 1);
  assert.ok(alphaAt(icon.width - 1, icon.height - 1) <= 1);
  assert.ok(alphaAt(Math.floor(icon.width / 2), Math.floor(icon.height / 2)) > 240);
}

const edgePng = readRgbaPng(new URL(
  `../${assets.panicEdgeFrame.path}`,
  import.meta.url,
));
assert.equal(edgePng.width, 1672);
assert.equal(edgePng.height, 941);
let centralMaxAlpha = 0;
for (let y = Math.floor(edgePng.height * 0.18); y < edgePng.height * 0.82; y += 4) {
  for (let x = Math.floor(edgePng.width * 0.18); x < edgePng.width * 0.82; x += 4) {
    centralMaxAlpha = Math.max(
      centralMaxAlpha,
      edgePng.rgba[(y * edgePng.width + x) * 4 + 3],
    );
  }
}
assert.ok(centralMaxAlpha <= 8, "the high-panic frame must leave gameplay clear");

const sanitySystem = new HardcoreModeSystem({
  ...HARDCORE_MODE_CONFIG.defaultData,
  mode: HARDCORE_MODE_CONFIG.modes.hardcore,
  armed: true,
  livesRemaining: 1,
  freeReviveAvailable: false,
  stress: 84,
  peakStress: 84,
}, HARDCORE_MODE_CONFIG);
const sanitySnapshot = sanitySystem.getSnapshot();
assert.equal(sanitySnapshot.sanity, 16);
assert.ok(Math.abs(sanitySnapshot.sanityRatio - 0.16) < Number.EPSILON);

const stableView = resolveHardcorePanicView(
  hardcoreSnapshot({ stress: 20, stressBand: "calm" }),
  50,
  riskThresholds,
);
const uneaseView = resolveHardcorePanicView(
  hardcoreSnapshot({ stress: 32, stressBand: "calm" }),
  50,
  riskThresholds,
);
const frayingView = resolveHardcorePanicView(
  hardcoreSnapshot({ stress: 48, stressBand: "calm" }),
  50,
  riskThresholds,
);
const severeView = resolveHardcorePanicView(
  hardcoreSnapshot({ stress: 74, stressBand: "warning" }),
  50,
  riskThresholds,
);
assert.equal(stableView.severity, "stable");
assert.equal(stableView.edgeVisible, false);
assert.equal(stableView.detail, "PANIC STARTS 42M  •  LEVEL PROTECTION +20M");
const panicBoundary = resolveHardcorePanicBoundary(
  hardcoreSnapshot(),
  { topAirRows: 65, tileSize: 94 },
  {
    gameplayActive: true,
    basePanicStartDepth: HARDCORE_MODE_CONFIG.stress.panicStartDepthTiles,
  },
);
assert.equal(panicBoundary.visible, true);
assert.equal(panicBoundary.panicStartDepth, 42);
assert.equal(panicBoundary.firstPanicTileY, 106);
assert.equal(panicBoundary.worldY, 9964);
assert.equal(panicBoundary.title, "PANIC STARTS HERE  •  42M");
assert.equal(
  panicBoundary.detail,
  "DARKNESS BUILDS PANIC BELOW  •  TORCHLIGHT HOLDS IT BACK",
);
assert.equal(
  resolveHardcorePanicBoundary(
    hardcoreSnapshot({ armed: false }),
    { topAirRows: 65, tileSize: 94 },
    { gameplayActive: true, basePanicStartDepth: 22 },
  ).visible,
  false,
  "the world line must remain hidden before Hardcore arms",
);
assert.equal(
  resolveHardcorePanicBoundary(
    hardcoreSnapshot({ isHardcore: false }),
    { topAirRows: 65, tileSize: 94 },
    { gameplayActive: true, basePanicStartDepth: 22 },
  ).visible,
  false,
  "the world line must never appear in Casual",
);
const deadzoneView = resolveHardcorePanicView(
  hardcoreSnapshot({
    insideConsumedStarScar: true,
    consumedStarStressMultiplier: 4,
  }),
  50,
  riskThresholds,
);
assert.equal(deadzoneView.detail, "SCAR PANIC 4X  •  USE YOUR TORCH OR LEAVE");
assert.equal(uneaseView.severity, "uneasy");
assert.match(uneaseView.title, /^UNEASE RISING/);
assert.equal(uneaseView.overlayVisible, false);
assert.ok(uneaseView.peripheralIntensity > stableView.peripheralIntensity);
assert.equal(frayingView.severity, "fraying");
assert.match(frayingView.title, /^THOUGHTS FRAYING/);
assert.equal(frayingView.iconRole, "warning");
assert.ok(frayingView.echoIntensity > uneaseView.echoIntensity);
assert.equal(severeView.severity, "severe");
assert.match(severeView.title, /^MIND STRAINING/);
assert.ok(severeView.statusCueIntensity > frayingView.statusCueIntensity);
assert.ok(severeView.peripheralIntensity > frayingView.peripheralIntensity);

const warningView = resolveHardcorePanicView(
  hardcoreSnapshot({ stress: 61, stressBand: "warning" }),
  50,
  riskThresholds,
);
assert.equal(warningView.iconRole, "warning");
assert.equal(warningView.severity, "fracturing");
assert.match(warningView.title, /^SANITY FRACTURING/);
assert.match(warningView.title, /SANITY 39%/);
assert.equal(
  warningView.detail,
  "LIGHT STABILISES SANITY  •  SLOW YOUR DESCENT",
);
assert.equal(warningView.critical, false);
assert.equal(warningView.edgeVisible, true);
assert.equal(warningView.overlayVisible, false);
assert.ok(warningView.echoIntensity > 0);

const criticalView = resolveHardcorePanicView(
  hardcoreSnapshot({
    stress: 84,
    stressBand: "critical",
    stressGpDrainPerSecond: 8.75,
  }),
  50,
  riskThresholds,
);
assert.equal(criticalView.iconRole, "critical");
assert.equal(criticalView.sanityPercent, 16);
assert.equal(criticalView.overlayTitle, "MIND UNRAVELLING  •  SANITY 16%");
assert.equal(
  criticalView.overlayDetail,
  "LOSING 8.8 GP/S  •  FIND LIGHT OR LOSE A LIFE",
);
assert.equal(criticalView.critical, true);
assert.equal(criticalView.overlayVisible, true);
assert.ok(criticalView.realitySlipIntensity > 0);
assert.ok(criticalView.bannerIntensity > 0);

const scene = createScene();
const hud = new HardcoreStatusHud(scene);
assert.equal(hud.isReady(), true);
hud.update(hardcoreSnapshot(), 0, 50, { gameplayActive: true });
assert.equal(hud.crest.key, ASSET_KEYS.ui.hardcore.oathCrest);
assert.equal(hud.getDebugSnapshot().highPanicVisible, false);
assert.equal(hud.panicBoundary.root.visible, true);
assert.equal(hud.panicBoundary.root.y, 9964);
assert.equal(hud.panicBoundary.line.crop.height, 112);
assert.equal(hud.panicBoundary.line.displayWidth, 1280);
assert.equal(hud.panicBoundary.title.text, "PANIC STARTS HERE  •  42M");
assert.ok(
  hud.panicBoundary.line.alpha >= HARDCORE_PANIC_BOUNDARY.line.alphaMinimum,
);
assert.equal(scene.getPanicFlashCalls(), 0);

hud.update(
  hardcoreSnapshot({ stress: 61, stressBand: "warning" }),
  250,
  50,
  { gameplayActive: true },
);
assert.equal(hud.crest.key, ASSET_KEYS.ui.hardcore.panicWarning);
assert.match(hud.label.text, /^SANITY FRACTURING/);
assert.equal(hud.root.visible, true);
assert.equal(hud.panicOverlay.edge.visible, true);
assert.equal(hud.panicOverlay.bannerRoot.visible, false);
assert.ok(hud.panicOverlay.edge.alpha > 0);
const warningEntry = hud.getDebugSnapshot();
hud.update(
  hardcoreSnapshot({ stress: 61, stressBand: "warning" }),
  300,
  50,
  { gameplayActive: true },
);
assert.ok(
  hud.getDebugSnapshot().peripheralIntensity > warningEntry.peripheralIntensity,
  "the peripheral layer must ease toward a new sanity level instead of jumping",
);

hud.update(
  hardcoreSnapshot({
    stress: 84,
    stressBand: "critical",
    stressGpDrainPerSecond: 8.75,
  }),
  550,
  50,
  { gameplayActive: true },
);
assert.equal(hud.root.visible, false);
assert.equal(hud.panicOverlay.icon.key, ASSET_KEYS.ui.hardcore.panicCritical);
assert.equal(hud.panicOverlay.edge.visible, true);
assert.equal(hud.panicOverlay.edgeSlip.visible, true);
assert.equal(hud.panicOverlay.bannerRoot.visible, true);
assert.match(hud.panicOverlay.title.text, /^MIND UNRAVELLING/);
assert.ok(hud.panicOverlay.edge.alpha > 0);
assert.ok(
  hud.panicOverlay.edge.alpha <= HARDCORE_PANIC_PRESENTATION.overlay.edgeAlphaMaximum,
);
assert.equal(hud.getDebugSnapshot().statusSuppressedForOverlay, true);
assert.equal(scene.getPanicFlashCalls(), 1);

hud.update(
  hardcoreSnapshot({ stress: 96, stressBand: "critical" }),
  600,
  25,
  { gameplayActive: true },
);
const extremeReview = hud.getDebugSnapshot();
assert.equal(extremeReview.sanityPercent, 4);
assert.match(extremeReview.overlayTitle, /^YOU ARE LOSING YOUR MIND/);
assert.ok(extremeReview.echoAlpha > 0);
assert.ok(extremeReview.slipAlpha > 0);
assert.ok(extremeReview.targetPanicIntensity > criticalView.panicIntensity);

const imminentView = resolveHardcorePanicView(
  hardcoreSnapshot({ stress: 96, stressBand: "critical" }),
  1,
  riskThresholds,
);
assert.match(imminentView.overlayTitle, /^DEATH IS IMMINENT/);
assert.match(imminentView.overlayDetail, /^1 GP LEFT  •  0 GP TAKES A LIFE/);

scene.scale.width = 960;
scene.scale.height = 540;
scene.cameras.main.worldView.width = 960;
scene.cameras.main.worldView.centerX = 480;
hud.update(
  hardcoreSnapshot({ stress: 96, stressBand: "critical" }),
  750,
  25,
  { gameplayActive: true },
);
assert.equal(hud.panicOverlay.edge.displayWidth, 960);
assert.equal(hud.panicOverlay.edge.displayHeight, 540);
assert.equal(hud.panicOverlay.bannerRoot.x, 480);
assert.equal(hud.panicBoundary.line.displayWidth, 960);
assert.equal(
  scene.getPanicFlashCalls(),
  1,
  "remaining in high panic must not strobe the screen every frame",
);

const recoverySnapshot = hardcoreSnapshot({
  stress: 61,
  stressBand: "warning",
});
hud.update(recoverySnapshot, 850, 25, { gameplayActive: true });
assert.equal(hud.panicOverlay.bannerRoot.visible, true);
assert.equal(hud.root.visible, false);
for (let step = 1; step <= 30; step += 1) {
  hud.update(recoverySnapshot, 850 + step * 100, 25, { gameplayActive: true });
}
assert.equal(hud.panicOverlay.bannerRoot.visible, false);
assert.equal(hud.root.visible, true);
assert.equal(
  hud.getDebugSnapshot().statusSuppressedForOverlay,
  false,
  "the compact card may return only after the critical banner finishes fading",
);

hud.update(
  hardcoreSnapshot({ stress: 96, stressBand: "critical" }),
  4000,
  25,
  { gameplayActive: false },
);
assert.equal(hud.getDebugSnapshot().highPanicVisible, false);
assert.equal(hud.panicOverlay.edge.visible, false);
assert.equal(hud.panicBoundary.root.visible, false);
assert.equal(hud.root.visible, false, "paused play must hide the compact status too");
const pendingSnapshot = hardcoreSnapshot({ armed: false });
hud.update(pendingSnapshot, 4100, 25, { gameplayActive: true });
assert.equal(hud.root.visible, true, "resuming restores the pending status");
const releaseMenu = acquireUiInputPriority(scene);
hud.update(pendingSnapshot, 4200, 25, { gameplayActive: true });
assert.equal(hud.root.visible, false, "a modal hides pending Hardcore guidance");
hud.update(hardcoreSnapshot({ stress: 96, stressBand: "critical" }), 4300, 25);
assert.equal(hud.panicOverlay.bannerRoot.visible, false);
assert.equal(hud.panicOverlay.edge.visible, false);
releaseMenu();
hud.update(pendingSnapshot, 4400, 25, { gameplayActive: true });
assert.equal(hud.root.visible, true, "closing the modal restores the status");
hud.destroy();
assert.equal(hud.root, null);

const fallbackScene = createScene([
  assets.panicWarning.key,
  assets.panicCritical.key,
  assets.panicEdgeFrame.key,
]);
const fallbackHud = new HardcoreStatusHud(fallbackScene);
assert.equal(fallbackHud.isReady(), false);
fallbackHud.update(
  hardcoreSnapshot({ stress: 61, stressBand: "warning" }),
  0,
  50,
);
assert.equal(
  fallbackHud.crest.key,
  assets.crest.key,
  "missing new art must retain the prior crest instead of crashing",
);
fallbackHud.destroy();

console.log("Hardcore panic feedback contract passed.");
