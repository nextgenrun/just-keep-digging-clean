import { CelestialActionBarSystem } from "../systems/visual/CelestialActionBarSystem.js";
import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import { HudQuickControls } from "../systems/visual/HudQuickControls.js";
import { XPProgressBar } from "../ui/hud/XPProgressBar.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  CAMPFIRE_CONFIG,
  getCampfireTierAsset,
} from "../values/campfireConfig.js";
import {
  CELESTIAL_ACTION_BAR_EAGER_ASSETS,
  CELESTIAL_ACTION_BAR_ENTRY_IDS,
} from "../values/celestialActionBar.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../values/celestialTalentTreeUi.js";
import { HUD_QUICK_CONTROLS } from "../values/hudQuickControls.js";

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
    for (const [assetName, path] of Object.entries(APPROVED_HUD_SKIN.paths)) {
      const key = ASSET_KEYS.ui.approvedHud[assetName];
      if (key) this.load.image(key, `../${path}`);
    }
    for (const asset of CELESTIAL_ACTION_BAR_EAGER_ASSETS) {
      this.load.image(asset.key, `../${asset.path}`);
    }
    this.load.image(
      CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.key,
      `../${CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.path}`,
    );
    this.load.image(
      CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.key,
      `../${CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.path}`,
    );
    const campfire = getCampfireTierAsset(1);
    this.load.image(campfire.key, "../" + campfire.path);
    for (const [key, filename] of engineAssets) {
      this.load.image(key, `../sprites/UI/starlight-talent-tree-v4/${filename}`);
    }
  }

  create() {
    this.digSystem = { getResourceTotals: () => ({ dirt: 18, stone: 7, emberOre: 3 }) };
    this.xpProgressBar = new XPProgressBar(this);
    this.xpProgressBar.update(7, 420, 1000);
    this.quickControls = new HudQuickControls(this, {
      depth: HUD_QUICK_CONTROLS.depth,
      onInventory: () => false,
      onPause: () => false,
      onMap: () => false,
    });
    this.campfireSystem = new CampfireSystem(
      this,
      { tileSize: 94, topAirRows: 65 },
      {},
      {},
      1,
      { level: 1, charges: 1, refillCapacity: 1, selectedBuffType: "warmth" },
    );
    this.actionbar = new CelestialActionBarSystem(this, {
      getAbilityState: entryId => entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE
        ? this.campfireSystem.getActionBarState()
        : { unlocked: false },
      getMetrics: () => ({ gpCurrent: 0, gpMax: 100, miningDamage: 1 }),
      onActivate() {},
      onLoadoutChange() {},
    });
    const snapshot = () => {
      const actionbarBounds = this.actionbar.placement.bounds;
      const xpFrame = this.xpProgressBar.frame;
      const xpBounds = {
        left: xpFrame.x,
        top: xpFrame.y,
        right: xpFrame.x + xpFrame.displayWidth,
        bottom: xpFrame.y + xpFrame.displayHeight,
      };
      const inventoryHitWidth = this.quickControls.inventoryHit.input.hitArea.width;
      const inventoryHitHeight = this.quickControls.inventoryHit.input.hitArea.height;
      const inventoryBounds = {
        left: this.quickControls.inventoryContainer.x - inventoryHitWidth / 2,
        top: this.quickControls.inventoryContainer.y - inventoryHitHeight / 2,
        right: this.quickControls.inventoryContainer.x + inventoryHitWidth / 2,
        bottom: this.quickControls.inventoryContainer.y + inventoryHitHeight / 2,
      };
      const hollowSun = this.actionbar.slotsById.get(
        CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
      );
      const campfire = this.actionbar.slotsById.get(
        CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE,
      );
      return {
        health: this.actionbar.getHealthSnapshot(),
        visibleIconCount: [...this.actionbar.slotsById.values()]
          .filter(slot => slot.icon.visible).length,
        lockObjectCount: [...this.actionbar.slotsById.values()]
          .filter(slot => "lockImage" in slot).length,
        campfire: (() => {
          const slot = this.actionbar.slotsById.get(CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE);
          return {
            iconVisible: slot?.icon?.visible === true,
            quantityVisible: slot?.quantityText?.visible === true,
            quantity: slot?.quantityText?.text,
            iconWidth: slot?.icon?.displayWidth,
            iconHeight: slot?.icon?.displayHeight,
          };
        })(),
        layout: {
          scale: this.actionbar.uiScale,
          actionbar: actionbarBounds,
          xp: xpBounds,
          inventory: inventoryBounds,
          xpGap: actionbarBounds.left - xpBounds.right,
          inventoryGap: inventoryBounds.left - actionbarBounds.right,
          hollowSunCenter: { x: hollowSun.basePosition.x, y: hollowSun.basePosition.y },
          campfireCenter: { x: campfire.basePosition.x, y: campfire.basePosition.y },
        },
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
          bodyText: this.actionbar.tooltip.body.text,
        },
      };
    };
    globalThis.__celestialActionBarReview = Object.freeze({ snapshot });
    const publishSnapshot = () => {
      document.body.dataset.celestialActionBarSnapshot = JSON.stringify(snapshot());
    };
    this.events.on("postupdate", publishSnapshot);
    publishSnapshot();
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
