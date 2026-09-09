import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  createHardcoreModeData,
  HARDCORE_MODE_CONFIG,
} from "../values/hardcoreMode.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";

globalThis.Phaser = {
  Math: {
    Clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
    Linear: (start, end, amount) => start + (end - start) * amount,
  },
};

const { LightSystem } = await import("../systems/lighting/LightSystem.js");
const { HardcoreModeSystem } = await import("../systems/hardcore/HardcoreModeSystem.js");
const { PlayerLevelSystem } = await import("../systems/progression/PlayerLevelSystem.js");
const { UpgradeSystem } = await import("../systems/progression/UpgradeSystem.js");
const { ApprovedHudSkin } = await import("../systems/visual/ApprovedHudSkin.js");
const root = resolve(import.meta.dirname, "..");
const hudStates = [];
const playerLevelSystem = new PlayerLevelSystem();
const upgradeSystem = new UpgradeSystem(null, playerLevelSystem);
const light = Object.create(LightSystem.prototype);
light.config = LIGHT_CONFIG;
light._playerLightProfileId = "v2";
light._torchIntensityPercent = LIGHT_CONFIG.torchIntensity.defaultPercent;
light._torchActive = true;
light._latestDepth = 1000;
light._currentTorchDrainGpPerSecond = LIGHT_CONFIG.torchDrainGpPerSecond;
light.scene = {
  gameState: "playing",
  hudSystem: {
    setTorchState: (...state) => hudStates.push(state),
  },
  upgradeSystem,
  playerLevelSystem,
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

assert.equal(LIGHT_CONFIG.torchIntensity.minimumPercent, 1);
assert.equal(LIGHT_CONFIG.torchIntensity.maximumPercent, 200);
assert.equal(LIGHT_CONFIG.torchIntensity.clickStepPercent, 10);
assert.equal(LIGHT_CONFIG.torchIntensity.scrollStepPercent, 1);
assert.equal(light.getTorchIntensity(), 1);
const brightRadius = light._computeVisibilityRadius(lighting);
const brightGlow = light._computeTargetGlow(lighting);
const brightDrain = light._getTorchDrainPerSecond(1000);

assert.equal(light.setTorchIntensityPercent(1), true);
assert.equal(light.getTorchIntensity(), 0.01);
const lowRadius = light._computeVisibilityRadius(lighting);
const lowGlow = light._computeTargetGlow(lighting);
const lowDrain = light._getTorchDrainPerSecond(1000);
assert.ok(lowRadius < brightRadius, "low flame must reveal less terrain");
assert.ok(lowRadius >= LIGHT_CONFIG.minVisibilityRadiusTiles, "low flame keeps the visibility floor");
assert.ok(lowGlow < brightGlow, "low flame must be visibly dimmer");
assert.ok(lowDrain < brightDrain, "low flame must consume less GP");
assert.ok(Math.abs(lowGlow - 0.01) < 0.000001);
assert.ok(Math.abs(lowDrain - brightDrain * 0.01) < 0.000001);
assert.deepEqual(hudStates.at(-1), [true, lowDrain, 0.01]);

assert.equal(light.adjustTorchIntensity(1), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 2);
assert.equal(light.adjustTorchIntensity(-1), true);
assert.equal(light.adjustTorchIntensity(-1), false, "wheel adjustment must clamp at 1%");
assert.equal(light.cycleTorchIntensity(), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 11);
assert.equal(light.setTorchIntensityPercent(95), true);
assert.equal(light.cycleTorchIntensity(), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 105);
assert.equal(light.cycleTorchIntensity(), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 115);

light.setTorchIntensityPercent(200);
const overdriveRadius = light._computeVisibilityRadius(lighting);
const overdriveDrain = light._getTorchDrainPerSecond(1000);
assert.ok(overdriveRadius > brightRadius * 2, "200% must provide immense reveal reach");
assert.equal(
  light._getTorchIntensityScale("radius"),
  LIGHT_CONFIG.torchIntensity.overdrive.radiusMaximumMultiplier,
);
assert.equal(
  overdriveDrain,
  brightDrain * LIGHT_CONFIG.torchIntensity.overdrive.drainMaximumMultiplier,
);
assert.equal(
  light._getTorchDrainPerSecond(0),
  LIGHT_CONFIG.torchDrainGpPerSecond
    * LIGHT_CONFIG.torchIntensity.overdrive.drainMaximumMultiplier,
);
assert.equal(
  light._getTorchDrainPerSecond(2000),
  LIGHT_CONFIG.torchDrainGpPerSecond
    * LIGHT_CONFIG.torchDrainDepthMaxMultiplier
    * LIGHT_CONFIG.torchIntensity.overdrive.drainMaximumMultiplier,
);
assert.equal(light.getTorchIntensitySnapshot().overdriveActive, true);
assert.equal(light.cycleTorchIntensity(), true);
assert.equal(light.getTorchIntensitySnapshot().percent, 1, "click cycle must wrap");

upgradeSystem.setUpgradeLevels({ torchDrainEfficiency: 10, torchRange: 10 });
const torchUpgradeEffects = upgradeSystem.getUpgradeEffects();
assert.equal(torchUpgradeEffects.torchDrainReduction, 5);
assert.equal(torchUpgradeEffects.torchBonusRadius, 1.2);
light.setTorchIntensityPercent(100);
const upgradedLighting = {
  ...lighting,
  torchBonusRadius: light._getTorchBonusRadius(),
};
const upgradedBrightRadius = light._computeVisibilityRadius(upgradedLighting);
const upgradedBrightDrain = light._getTorchDrainPerSecond(1000);
assert.ok(Math.abs(upgradedBrightRadius - brightRadius - 1.2) < 0.000001);
assert.equal(brightDrain - upgradedBrightDrain, 5);
light.setTorchIntensityPercent(200);
const upgradedOverdriveRadius = light._computeVisibilityRadius(upgradedLighting);
const upgradedOverdriveDrain = light._getTorchDrainPerSecond(1000);
assert.ok(Math.abs(
  upgradedOverdriveRadius - overdriveRadius
    - 1.2 * LIGHT_CONFIG.torchIntensity.overdrive.radiusMaximumMultiplier,
) < 0.000001);
assert.equal(
  overdriveDrain - upgradedOverdriveDrain,
  5 * LIGHT_CONFIG.torchIntensity.overdrive.drainMaximumMultiplier,
);

const levelOneLighting = light._resolveLightingState(1000);
playerLevelSystem.level = 2;
const levelTwoLighting = light._resolveLightingState(1000);
assert.equal(playerLevelSystem.getPanicResistanceMeters(), 20);
assert.equal("darknessResistanceMeters" in levelTwoLighting, false);
assert.equal(levelTwoLighting.visibilityDepth, 1000);
assert.equal(levelTwoLighting.torchBonusRadius, torchUpgradeEffects.torchBonusRadius);
assert.equal(levelTwoLighting.torchDrainPerSecond, upgradedOverdriveDrain);
assert.equal(
  light._computeVisibilityRadius(levelTwoLighting),
  light._computeVisibilityRadius(levelOneLighting),
  "leveling must leave visual darkness unchanged",
);

const sanityIntensities = [0.01, 0.5, 1, 1.5, 2];
const sanityByTorchLevel = sanityIntensities.map(torchIntensity => {
  const system = new HardcoreModeSystem({
    ...createHardcoreModeData("hardcore", 1),
    armed: true,
    armedAt: 2,
    stress: 50,
    peakStress: 50,
  });
  return system.update(100, {
    gameplayActive: true,
    depth: 100,
    darknessAlpha: 1,
    torchActive: true,
    torchIntensity,
    nearIntactStarLight: false,
    playerLevel: 1,
    descentTilesPerSecond: 0,
  });
});
for (let index = 1; index < sanityByTorchLevel.length; index += 1) {
  assert.ok(
    sanityByTorchLevel[index].stress < sanityByTorchLevel[index - 1].stress,
    "every brighter torch level must produce less stress",
  );
}
assert.ok(sanityByTorchLevel[0].stress > 50, "1% torch must increase deep-dark stress");
assert.ok(sanityByTorchLevel[2].stress < 50, "100% torch must recover stress");
assert.ok(
  sanityByTorchLevel.at(-1).stress < sanityByTorchLevel[2].stress,
  "200% overdrive must recover panic faster than 100%",
);
assert.equal(
  sanityByTorchLevel.at(-1).stressRecoveryPerSecond,
  sanityByTorchLevel[2].stressRecoveryPerSecond
    * HARDCORE_MODE_CONFIG.stress.torchOverdriveRecoveryMaximumMultiplier,
);
assert.ok(
  sanityByTorchLevel[0].torchDarknessExposure
    > sanityByTorchLevel.at(-1).torchDarknessExposure,
  "brighter flames must block more darkness exposure",
);
assert.ok(sanityByTorchLevel.at(-1).stressSources.includes("torch-light"));

const overdriveByPanicResistance = [0, 20].map(panicResistanceMeters => {
  const system = new HardcoreModeSystem({
    ...createHardcoreModeData("hardcore", 1),
    armed: true,
    armedAt: 2,
    stress: 50,
    peakStress: 50,
  });
  return system.update(100, {
    gameplayActive: true,
    depth: 1800,
    darknessAlpha: 1,
    torchActive: true,
    torchIntensity: 2,
    nearIntactStarLight: false,
    panicResistanceMeters,
    descentTilesPerSecond: 0,
  });
});
assert.equal(overdriveByPanicResistance[0].panicStartDepth, 22);
assert.equal(overdriveByPanicResistance[1].panicStartDepth, 42);
assert.equal(overdriveByPanicResistance[1].effectivePanicDepth, 1780);
assert.ok(
  overdriveByPanicResistance[1].stressGainPerSecond
    < overdriveByPanicResistance[0].stressGainPerSecond,
);
assert.equal(
  overdriveByPanicResistance[1].stressRecoveryPerSecond,
  overdriveByPanicResistance[0].stressRecoveryPerSecond,
);
assert.ok(
  overdriveByPanicResistance[1].stress
    < overdriveByPanicResistance[0].stress,
);

const burnFrame = {
  alpha: 0,
  visible: false,
  setAlpha(value) { this.alpha = value; return this; },
  setVisible(value) { this.visible = value; return this; },
};
const playerFrame = {
  textureKey: ASSET_KEYS.ui.approvedHud.playerCoreShell,
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
assert.equal(playerFrame.textureKey, ASSET_KEYS.ui.approvedHud.playerCoreShell);
assert.equal(burnFrame.visible, true);
assert.equal(burnFrame.alpha, 0.2);
skin.setTorchBurn(0.17);
assert.equal(skin.getTorchBurnSnapshot().alpha, 0.17);
skin.setTorchState(false, 1);
assert.equal(burnFrame.visible, false);
assert.equal(burnFrame.alpha, 0);
assert.equal(APPROVED_HUD_SKIN.layout.torchArtwork.icon, "torch");
assert.ok(APPROVED_HUD_SKIN.layout.torchArtwork.size > 0);

const controlSource = readFileSync(
  resolve(root, "systems/visual/TorchIntensityControl.js"),
  "utf8",
);
const hudSource = readFileSync(resolve(root, "systems/visual/HUDSystem.js"), "utf8");
const skinSource = readFileSync(resolve(root, "systems/visual/ApprovedHudSkin.js"), "utf8");
const lightSource = readFileSync(resolve(root, "systems/lighting/LightSystem.js"), "utf8");
const fireSource = readFileSync(resolve(root, "systems/lighting/FireLightRenderer.js"), "utf8");
const bridgeSource = readFileSync(
  resolve(root, "world/playScene/HardcoreModeBridge.js"),
  "utf8",
);
assert.ok(controlSource.includes('.on("pointerdown"'));
assert.ok(controlSource.includes('this.scene.input?.on?.("wheel"'));
assert.ok(controlSource.includes('this.scene?.input?.off?.("wheel"'));
assert.ok(!controlSource.includes('this.hit.on("wheel"'));
assert.ok(controlSource.includes("event?.stopPropagation?.()"));
const playerCoreLayout = APPROVED_HUD_SKIN.layout.playerCore;
const torchControlLayout = APPROVED_HUD_SKIN.layout.torchIntensity;
assert.ok(APPROVED_HUD_SKIN.layout.buffs.y >= playerCoreLayout.y + playerCoreLayout.height);
assert.ok(torchControlLayout.hitX >= playerCoreLayout.x);
assert.ok(torchControlLayout.hitX + torchControlLayout.hitWidth <= playerCoreLayout.x + playerCoreLayout.width);
assert.ok(torchControlLayout.hitY + torchControlLayout.hitHeight <= playerCoreLayout.y + playerCoreLayout.height);
assert.ok(torchControlLayout.textX >= torchControlLayout.hitX);
assert.ok(torchControlLayout.textX <= torchControlLayout.hitX + torchControlLayout.hitWidth);
assert.ok(!controlSource.includes("scene.add.image("));
assert.ok(controlSource.includes("integratedIntoPlayerCore"));
assert.ok(controlSource.includes("this.status?.setText(this.active"));
assert.ok(controlSource.includes("HUD_LAYOUT.torchIntensityOverdriveLabel"));
assert.ok(controlSource.includes("HUD_LAYOUT.torchIntensityOverdriveColor"));
assert.ok(hudSource.includes("cycleTorchIntensity"));
assert.ok(hudSource.includes("adjustTorchIntensity"));
assert.ok(hudSource.includes("approvedSkinActive || this._systemVisibility.torch"));
assert.ok(hudSource.includes("setTorchBurn"));
assert.ok(skinSource.includes("torchBurnFrame"));
assert.ok(lightSource.includes("hudSystem?.setTorchBurn?.("));
assert.ok(fireSource.includes("flameAlpha: clampFireLight01(flameAlpha)"));
assert.ok(bridgeSource.includes("torchIntensity: light.torchIntensity"));
assert.ok(bridgeSource.includes("scene.playerLevelSystem?.getPanicResistanceMeters?.() || 0"));

console.log("dynamic torch intensity contract passed: 1-200%, upgrades, fixed darkness, level panic resistance, overdrive, and authored HUD sync");
