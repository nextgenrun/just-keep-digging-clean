import { HUDSystem } from "../systems/visual/HUDSystem.js";
import { LightSystem } from "../systems/lighting/LightSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS, getPickaxeIconPreloadAssets } from "../values/assetKeys.js";
import { FIRE_LIGHT_CONFIG } from "../values/fireLightConfig.js";
import { HUD_LAYOUT } from "../values/hudLayout.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";
import { UI_ICON_ATLAS } from "../values/uiIcons.js";

class DynamicTorchIntensityVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("DynamicTorchIntensityVisualHarnessScene");
  }

  preload() {
    for (const [id, path] of Object.entries(APPROVED_HUD_SKIN.paths)) {
      this.load.image(ASSET_KEYS.ui.approvedHud[id], `../${path}`);
    }
    this.load.spritesheet(UI_ICON_ATLAS.key, `../${UI_ICON_ATLAS.path}`, {
      frameWidth: UI_ICON_ATLAS.frameWidth,
      frameHeight: UI_ICON_ATLAS.frameHeight,
    });
    for (const asset of getPickaxeIconPreloadAssets()) {
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(0x05090d);
    this.upgradeSystem = {
      ownedPickaxe: "bronzePickaxe",
      godModeActive: false,
      getUpgradeEffects: () => ({}),
    };
    this.gameState = "playing";
    this.shopOverlay = { isVisible: false };
    this._pillarViewActive = false;
    this.campfireSystem = { isSelecting: () => false };

    this.hudSystem = new HUDSystem(this, 279);
    this.hudSystem.setSystemVisibility({
      clock: false,
      torch: true,
      combo: false,
      buff: true,
    });
    const gp = this.hudSystem.getGemPowerLayout();
    this.gpBg = this.add.graphics().setScrollFactor(0);
    this.gpFill = this.add.graphics().setScrollFactor(0);
    this.gpLabel = this.add.text(0, 0, "GP  110 / 110", {}).setScrollFactor(0);
    this.hudSystem.bindGemPowerObjects(this.gpBg, this.gpFill, this.gpLabel);
    this.gpBg.fillStyle(HUD_LAYOUT.barBgColor, HUD_LAYOUT.barBgAlpha);
    this.gpBg.fillRoundedRect(gp.x, gp.y, gp.width, gp.height, gp.radius);
    this.gpFill.fillStyle(HUD_LAYOUT.gpColorHigh, 1);
    this.gpFill.fillRoundedRect(gp.x, gp.y, gp.width, gp.height, gp.radius);

    this.lightSystem = Object.assign(Object.create(LightSystem.prototype), {
      scene: this,
      config: LIGHT_CONFIG,
      _torchActive: true,
      _torchIntensityPercent: LIGHT_CONFIG.torchIntensity.defaultPercent,
      _latestDepth: 0,
      _currentTorchDrainGpPerSecond: LIGHT_CONFIG.torchDrainGpPerSecond,
    });
    this.lightSystem._syncTorchHud();

    window.__torchIntensityHarness = {
      snapshot: () => ({
        ...this.hudSystem.getTorchIntensitySnapshot(),
        light: this.lightSystem.getTorchIntensitySnapshot(),
      }),
    };
  }

  update(time) {
    const flicker = FIRE_LIGHT_CONFIG.flicker;
    const phase = time * flicker.radiansPerMs;
    const secondary = Math.sin(
      phase * flicker.secondaryFrequency + flicker.secondaryPhase,
    );
    const pulse = Math.sin(phase) * (1 - flicker.verticalFlutterRatio)
      + secondary * flicker.verticalFlutterRatio;
    this.hudSystem?.setTorchBurn(
      FIRE_LIGHT_CONFIG.flame.alpha
        * this.lightSystem.getTorchIntensity()
        * (1 + pulse * flicker.alphaAmount),
    );
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  backgroundColor: "#05090d",
  parent: document.body,
  scene: DynamicTorchIntensityVisualHarnessScene,
  render: { antialias: true, pixelArt: false },
});
