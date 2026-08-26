import { CelestialCurrencyHudSystem } from
  "../systems/visual/CelestialCurrencyHudSystem.js";
import { NextPromiseHudSystem } from
  "../systems/visual/NextPromiseHudSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS } from
  "../values/celestialCurrencyHud.js";
import { UI_ICON_ATLAS } from "../values/uiIcons.js";

class ActiveHudAlignmentHarnessScene extends Phaser.Scene {
  constructor() {
    super("ActiveHudAlignmentHarnessScene");
  }

  preload() {
    this.load.image(
      ASSET_KEYS.ui.approvedHud.tutorialCurrentAction,
      `../${APPROVED_HUD_SKIN.paths.tutorialCurrentAction}`,
    );
    for (const asset of CELESTIAL_CURRENCY_HUD_PRELOAD_ASSETS) {
      this.load.image(asset.key, `../${asset.path}`);
    }
    this.load.spritesheet(UI_ICON_ATLAS.key, `../${UI_ICON_ATLAS.path}`, {
      frameWidth: UI_ICON_ATLAS.frameWidth,
      frameHeight: UI_ICON_ATLAS.frameHeight,
    });
  }

  create() {
    this.gameState = "playing";
    this.config = { topAirRows: 65 };
    this.playerController = { getPlayerTile: () => ({ tx: 12, ty: 65 }) };
    this.retentionProgressSystem = {
      getChestCritBuffRemaining: () => 0,
      getObjective: () => ({ complete: true, label: "RETURN", progress: 1, target: 1 }),
      getBestDepth: () => 80,
    };
    this.specialTileSystem = { getDeepestPortal: () => null };
    this.digSystem = { getResourceTotals: () => ({ dirt: 18, stone: 7 }) };
    this.upgradeSystem = { getUpgradeEffects: () => ({}) };
    this.systemIntroductionSystem = {
      getNextPromiseOverride: () => ({
        promise: "NEXT MASTERY PATH  •  REACH LEVEL 3",
        detail: "THE STAR PILLAR UNLOCKS YOUR FIRST CELESTIAL ABILITY",
      }),
    };

    this.currency = new CelestialCurrencyHudSystem(this, {
      getMoney: () => 0,
      getStars: () => 0,
    });
    this.promise = new NextPromiseHudSystem(this);
    this.promise.update(1000);

    const promiseBounds = {
      left: this.promise.root.x,
      top: this.promise.root.y,
      right: this.promise.root.x + this.promise.background.displayWidth,
      bottom: this.promise.root.y + this.promise.background.displayHeight,
    };
    const currencyBounds = {
      left: this.currency.root.x,
      top: this.currency.root.y - this.currency.foundation.displayHeight / 2,
      right: this.currency.root.x + this.currency.foundation.displayWidth,
      bottom: this.currency.root.y + this.currency.foundation.displayHeight / 2,
    };
    const snapshot = {
      ready: true,
      promise: this.promise.getHealthSnapshot(),
      promiseBounds,
      currencyBounds,
      leftDelta: promiseBounds.left - currencyBounds.left,
      verticalGap: currencyBounds.top - promiseBounds.bottom,
      badgeCenter: {
        x: this.promise.root.x + this.promise.badgeKicker.x,
        y: this.promise.root.y
          + (this.promise.badgeKicker.y + this.promise.badgeValue.y) / 2,
      },
    };
    document.body.dataset.activeHudReady = "true";
    document.body.dataset.activeHudSnapshot = JSON.stringify(snapshot);
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  backgroundColor: 0x05090d,
  parent: document.body,
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [ActiveHudAlignmentHarnessScene],
});
