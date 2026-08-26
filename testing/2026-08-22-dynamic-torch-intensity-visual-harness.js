import { HUDSystem } from "../systems/visual/HUDSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { FIRE_LIGHT_CONFIG } from "../values/fireLightConfig.js";
import { LIGHT_CONFIG } from "../values/lightConfig.js";

class DynamicTorchIntensityVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("DynamicTorchIntensityVisualHarnessScene");
  }

  preload() {
    for (const [id, path] of Object.entries(APPROVED_HUD_SKIN.paths)) {
      this.load.image(ASSET_KEYS.ui.approvedHud[id], `../${path}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(0x05090d);
    this.upgradeSystem = { ownedPickaxe: null };
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

    this.levels = LIGHT_CONFIG.torchIntensity.levels;
    this.levelIndex = LIGHT_CONFIG.torchIntensity.defaultLevelIndex;
    const sync = () => {
      const intensity = this.levels[this.levelIndex];
      this.hudSystem.setTorchState(
        true,
        LIGHT_CONFIG.torchDrainGpPerSecond * intensity,
        intensity,
      );
    };
    this.lightSystem = {
      cycleTorchIntensity: () => {
        this.levelIndex = (this.levelIndex + 1) % this.levels.length;
        sync();
        return true;
      },
      adjustTorchIntensity: direction => {
        const nextIndex = Math.max(
          0,
          Math.min(
            this.levels.length - 1,
            this.levelIndex + (direction > 0 ? 1 : -1),
          ),
        );
        if (nextIndex === this.levelIndex) return false;
        this.levelIndex = nextIndex;
        sync();
        return true;
      },
    };
    sync();

    window.__torchIntensityHarness = {
      snapshot: () => ({
        ...this.hudSystem.getTorchIntensitySnapshot(),
        levelIndex: this.levelIndex,
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
        * this.levels[this.levelIndex]
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
