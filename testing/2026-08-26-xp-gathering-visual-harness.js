import { XPProgressBar } from "../ui/hud/XPProgressBar.js";
import { LootPickupFxSystem } from "../systems/visual/LootPickupFxSystem.js";
import { RewardFlightMotionSystem } from "../systems/visual/RewardFlightMotionSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { REWARD_FLIGHT_CHANNELS } from "../values/rewardFlightMotions.js";
import { XP_GATHERING_CONFIG } from "../values/xpGathering.js";

class XPGatheringHarnessScene extends Phaser.Scene {
  constructor() {
    super("xp-gathering-harness");
    this.level = 1;
    this.currentXP = 840;
    this.requiredXP = 2417;
  }

  preload() {
    for (const [id, key] of Object.entries(ASSET_KEYS.ui.approvedHud)) {
      this.load.image(key, `../${APPROVED_HUD_SKIN.paths[id]}`);
    }
    for (const [id, key] of Object.entries(ASSET_KEYS.ui.xpGathering)) {
      this.load.image(key, `../${XP_GATHERING_CONFIG.assetPaths[id]}`);
    }
    this.load.image(ASSET_KEYS.ui.lootPickups.dirt, "../sprites/UI/loot-pickups/dirt.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.gold, "../sprites/UI/loot-pickups/gold.png");
    this.load.image(ASSET_KEYS.ui.lootPickups.silver, "../sprites/UI/loot-pickups/silver.png");
  }

  create() {
    this.config = {
      tileSize: 64,
      lootVisuals: true,
      featureFlags: {},
      skyTileRarities: [
        { palette: { glowColor: 0x87ceeb } },
        { palette: { glowColor: 0xcc44ff } },
        { palette: { glowColor: 0xffd700 } },
        { palette: { glowColor: 0xff4422 } },
        { palette: { glowColor: 0x00ffee } },
        { palette: { glowColor: 0x9900ff } },
      ],
    };
    this.cameras.main.setBackgroundColor(0x061019);
    this.titleText = this.add.text(this.scale.width / 2, this.scale.height * 0.34, "SHARED 20-ARC REWARD FLIGHTS", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: "#b9c8d3",
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0.72);
    this.subtitleText = this.add.text(this.scale.width / 2, this.scale.height * 0.39, "Resource + payout weight the arc • recent paths cannot immediately repeat", {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: "#718697",
    }).setOrigin(0.5);

    this.motionText = this.add.text(this.scale.width / 2, this.scale.height * 0.44, "XP: —   I-BAG: —", {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: "#d0aa55",
    }).setOrigin(0.5).setAlpha(0.82);
    this.rewardFlightMotionSystem = new RewardFlightMotionSystem();
    this.soundSystem = { playXpGather: cue => { this.lastCue = cue; } };
    this.xpProgressBar = new XPProgressBar(this);
    this.xpProgressBar.update(this.level, this.currentXP, this.requiredXP);
    this.inventoryBag = this.add.image(
      this.scale.width - 62,
      this.scale.height - 66,
      ASSET_KEYS.ui.approvedHud.inventory,
    ).setScrollFactor(0).setDepth(70).setDisplaySize(82, 82).setAlpha(0.92);
    this.inventoryBagBaseScale = Object.freeze({
      x: this.inventoryBag.scaleX,
      y: this.inventoryBag.scaleY,
    });
    this.lootPickupFxSystem = new LootPickupFxSystem(this, {
      getLootPickupTarget: () => ({ x: this.inventoryBag.x, y: this.inventoryBag.y }),
      pulseLootTarget: (_resourceType, strong) => this._pulseBag(strong),
    }, this.rewardFlightMotionSystem);
    this.scale.on("resize", () => this._resize());
    document.querySelectorAll("[data-fx]").forEach(button => {
      button.addEventListener("click", () => this._trigger(button.dataset.fx));
    });
    this.events.once("shutdown", () => {
      this.xpProgressBar.destroy();
      this.lootPickupFxSystem.destroy();
      this.rewardFlightMotionSystem.destroy();
    });
  }

  _trigger(id) {
    if (id === "levelUp") {
      this.showXpGatheringFeedback({ xpGained: 260, resourceType: "gold", levelUp: true }, { tx: 8, ty: 5 });
      this.level += 1;
      this.currentXP = 72;
      this.requiredXP = 3200;
      this.xpProgressBar.update(this.level, this.currentXP, this.requiredXP);
      this._queueMotionLabel();
      return;
    }
    if (id === "bagDirt") { this._loot("dirt", 1); return; }
    if (id === "bagGold") { this._loot("gold", 5); return; }
    if (id === "bagMagma") { this._loot("magmaCrystal", 20); return; }
    if (id === "bagStar") { this._loot("silver", 20, true); return; }
    if (id === "special") {
      this._gain({ xpGained: 242, specialBlockEffect: "levelProgress" }, { tx: 10, ty: 5 });
      return;
    }
    if (id === "star") {
      this._gain({ xpGained: 48, resourceType: "silver", skyTileRarity: 4 }, { tx: 9, ty: 5 });
      return;
    }
    if (id === "cluster") {
      this._gain({ xpGained: 18, resourceType: "copper" }, { tx: 7, ty: 5 }, false);
      this._gain({ xpGained: 32, resourceType: "gold" }, { tx: 8, ty: 5 });
      return;
    }
    this._gain({ xpGained: 18, resourceType: "copper" }, { tx: 7, ty: 5 });
  }

  _gain(reward, tile, updateBar = true) {
    this.showXpGatheringFeedback(reward, tile);
    this.currentXP = Math.min(this.requiredXP - 1, this.currentXP + reward.xpGained);
    if (updateBar) this.xpProgressBar.update(this.level, this.currentXP, this.requiredXP);
    this._queueMotionLabel();
  }

  _loot(resourceType, amount, isStarResource = false) {
    this.lootPickupFxSystem.showResourcePickup({
      worldX: this.scale.width * 0.44,
      worldY: this.scale.height * 0.58,
      resourceType,
      amount,
      isSkyTileBonus: isStarResource,
      isStarResource,
    });
    this._queueMotionLabel();
  }

  _queueMotionLabel() {
    this.time.delayedCall(180, () => {
      const xp = this.rewardFlightMotionSystem.getLastSelection(REWARD_FLIGHT_CHANNELS.xp);
      const loot = this.rewardFlightMotionSystem.getLastSelection(REWARD_FLIGHT_CHANNELS.loot);
      this.motionText.setText(`XP: ${xp?.profileId || "—"}   I-BAG: ${loot?.profileId || "—"}`);
    });
  }

  _pulseBag(strong) {
    this.tweens.killTweensOf(this.inventoryBag);
    const base = this.inventoryBagBaseScale;
    this.inventoryBag.setScale(base.x, base.y).setAlpha(0.92);
    this.tweens.add({
      targets: this.inventoryBag,
      scaleX: base.x * (strong ? 1.08 : 1.04),
      scaleY: base.y * (strong ? 1.08 : 1.04),
      alpha: 1,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  _resize() {
    this.titleText.setPosition(this.scale.width / 2, this.scale.height * 0.34);
    this.subtitleText.setPosition(this.scale.width / 2, this.scale.height * 0.39);
    this.motionText.setPosition(this.scale.width / 2, this.scale.height * 0.44);
    this.inventoryBag.setPosition(this.scale.width - 62, this.scale.height - 66);
    this.xpProgressBar.resize();
  }
}

window.__xpHarnessGame = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  backgroundColor: "#061019",
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  render: { antialias: true, pixelArt: false, roundPixels: true },
  scene: [XPGatheringHarnessScene],
});
