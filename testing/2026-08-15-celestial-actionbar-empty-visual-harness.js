import { CelestialActionBarSystem } from "../systems/visual/CelestialActionBarSystem.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { CELESTIAL_ACTION_BAR_EAGER_ASSETS } from "../values/celestialActionBar.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../values/celestialTalentTreeUi.js";

const engineAssets = Object.freeze([
  [ASSET_KEYS.celestialEngines.waywardStar, "wayward-star-ui-v2.png"],
  [ASSET_KEYS.celestialEngines.hollowSun, "hollow-sun-ui-v2.png"],
  [ASSET_KEYS.celestialEngines.cometEngine, "comet-engine-ui-v2.png"],
]);

class EmptyActionBarScene extends Phaser.Scene {
  constructor() {
    super("EmptyActionBarScene");
  }

  preload() {
    for (const asset of CELESTIAL_ACTION_BAR_EAGER_ASSETS) {
      this.load.image(asset.key, `../${asset.path}`);
    }
    this.load.image(
      CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.key,
      `../${CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.path}`,
    );
    for (const [key, filename] of engineAssets) {
      this.load.image(key, `../sprites/UI/starlight-talent-tree-v4/${filename}`);
    }
  }

  create() {
    this.actionbar = new CelestialActionBarSystem(this, {
      getAbilityState: () => ({ unlocked: false }),
      getMetrics: () => ({ gpCurrent: 0, gpMax: 100, miningDamage: 1 }),
      onActivate() {},
      onLoadoutChange() {},
    });
    const snapshot = () => ({
      health: this.actionbar.getHealthSnapshot(),
      visibleIconCount: [...this.actionbar.slotsById.values()]
        .filter(slot => slot.icon.visible).length,
      lockObjectCount: [...this.actionbar.slotsById.values()]
        .filter(slot => "lockImage" in slot).length,
      tooltip: {
        visible: this.actionbar.tooltipVisible,
        textureKey: this.actionbar.tooltip.frame.texture.key,
        width: this.actionbar.tooltip.frame.displayWidth,
        height: this.actionbar.tooltip.frame.displayHeight,
        titleY: this.actionbar.tooltip.title.y,
        bodyY: this.actionbar.tooltip.body.y,
        bodyBottom: this.actionbar.tooltip.body.y
          + this.actionbar.tooltip.body.height / 2,
        titleFontSize: this.actionbar.tooltip.title.style.fontSize,
        bodyFontSize: this.actionbar.tooltip.body.style.fontSize,
      },
    });
    globalThis.__celestialActionBarReview = Object.freeze({ snapshot });
    document.body.dataset.celestialActionBarReady = "true";
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  backgroundColor: 0x071018,
  parent: document.body,
  scene: [EmptyActionBarScene],
});
