import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";

globalThis.Phaser = {
  Math: {
    Linear: (start, end, amount) => start + (end - start) * amount,
  },
};

const { LightSystem } = await import("../systems/lighting/LightSystem.js");
const { ApprovedHudSkin } = await import("../systems/visual/ApprovedHudSkin.js");
const root = resolve(import.meta.dirname, "..");
const hudStates = [];
const light = Object.create(LightSystem.prototype);
light.config = LIGHT_CONFIG;
light._playerLightProfileId = "v2";
light._torchIntensityLevels = LIGHT_CONFIG.torchIntensity.levels;
light._torchIntensityIndex = LIGHT_CONFIG.torchIntensity.defaultLevelIndex;
light._torchActive = true;
light._latestDepth = 1000;
light._currentTorchDrainGpPerSecond = LIGHT_CONFIG.torchDrainGpPerSecond;
light.scene = {
  gameState: "playing",
  hudSystem: {
    setTorchState: (...state) => hudStates.push(state),
  },
  upgradeSystem: {
    godModeActive: false,
    getUpgradeEffects: () => ({}),
  },
  shopOverlay: { isVisible: false },
  _pillarViewActive: false,
  campfireSystem: { isSelecting: () => false },
};

const lighting = {
  depth: 1000,
  surfaceLightInfluence: 0,
  undergroundDarknessInfluence: 1,
  nightAmount: 0,
  torchBonusRadius: 0,
  noTorchMinVisibilityRadius: 0,
  playerLight: { intensity: 1 },
  weather: { stormAmount: 0, undergroundSignal: 0 },
};

assert.deepEqual(LIGHT_CONFIG.torchIntensity.levels, [0.2, 0.4, 0.6, 0.8, 1]);
assert.equal(light.getTorchIntensity(), 1);
const brightRadius = light._computeVisibilityRadius(lighting);
const brightGlow = light._computeTargetGlow(lighting);
const brightDrain = light._getTorchDrainPerSecond(1000);

assert.equal(light.setTorchIntensityIndex(0), true);
assert.equal(light.getTorchIntensity(), 0.2);
const lowRadius = light._computeVisibilityRadius(lighting);
const lowGlow = light._computeTargetGlow(lighting);
const lowDrain = light._getTorchDrainPerSecond(1000);
assert.ok(lowRadius < brightRadius, "low flame must reveal less terrain");
assert.ok(lowRadius > LIGHT_CONFIG.minVisibilityRadiusTiles, "low flame remains useful");
assert.ok(lowGlow < brightGlow, "low flame must be visibly dimmer");
assert.ok(lowDrain < brightDrain, "low flame must consume less GP");
assert.ok(Math.abs(lowGlow - 0.2) < 0.000001);
assert.ok(Math.abs(lowDrain - brightDrain * 0.2) < 0.000001);
assert.deepEqual(hudStates.at(-1), [true, lowDrain, 0.2]);

assert.equal(light.adjustTorchIntensity(1), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 40);
assert.equal(light.adjustTorchIntensity(-1), true);
assert.equal(light.adjustTorchIntensity(-1), false, "wheel adjustment must clamp at 20%");
assert.equal(light.cycleTorchIntensity(), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 40);

light.setTorchIntensityIndex(LIGHT_CONFIG.torchIntensity.levels.length - 1);
assert.equal(light.cycleTorchIntensity(), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 20, "click cycle must wrap");

const burnFrame = {
  alpha: 0,
  visible: false,
  setAlpha(value) { this.alpha = value; return this; },
  setVisible(value) { this.visible = value; return this; },
};
const playerFrame = {
  textureKey: null,
  setTexture(value) { this.textureKey = value; return this; },
};
const skin = Object.assign(Object.create(ApprovedHudSkin.prototype), {
  active: true,
  hud: { torchStatusText: { setVisible: () => {} } },
  playerFrame,
  torchBurnFrame: burnFrame,
  torchActive: false,
  torchIntensity: 1,
  torchBurnAlpha: 0,
});
skin.setTorchState(true, 0.2);
assert.equal(playerFrame.textureKey, ASSET_KEYS.ui.approvedHud.playerCoreTorchOff);
assert.equal(burnFrame.visible, true);
assert.equal(burnFrame.alpha, 0.2);
skin.setTorchBurn(0.17);
assert.equal(skin.getTorchBurnSnapshot().alpha, 0.17);
skin.setTorchState(false, 1);
assert.equal(burnFrame.visible, false);
assert.equal(burnFrame.alpha, 0);
assert.deepEqual(
  APPROVED_HUD_SKIN.layout.torchBurn.sourceCrop,
  { x: 347, y: 13, width: 59, height: 73 },
);

const controlSource = readFileSync(
  resolve(root, "systems/visual/TorchIntensityControl.js"),
  "utf8",
);
const hudSource = readFileSync(resolve(root, "systems/visual/HUDSystem.js"), "utf8");
const skinSource = readFileSync(resolve(root, "systems/visual/ApprovedHudSkin.js"), "utf8");
const lightSource = readFileSync(resolve(root, "systems/lighting/LightSystem.js"), "utf8");
const fireSource = readFileSync(resolve(root, "systems/lighting/FireLightRenderer.js"), "utf8");
assert.ok(controlSource.includes('.on("pointerdown"'));
assert.ok(controlSource.includes('.on("wheel"'));
assert.ok(controlSource.includes("event?.stopPropagation?.()"));
assert.ok(controlSource.includes("ASSET_KEYS.ui.approvedHud.buffChip"));
assert.ok(hudSource.includes("cycleTorchIntensity"));
assert.ok(hudSource.includes("adjustTorchIntensity"));
assert.ok(hudSource.includes("approvedSkinActive || this._systemVisibility.torch"));
assert.ok(hudSource.includes("setTorchBurn"));
assert.ok(skinSource.includes("torchBurnFrame"));
assert.ok(lightSource.includes("hudSystem?.setTorchBurn?.("));
assert.ok(fireSource.includes("flameAlpha: clampFireLight01(flameAlpha)"));

console.log("dynamic torch intensity contract passed: five levels, radius/glow/drain scaling, click, wheel, and authored HUD burn sync");
