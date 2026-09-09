import { XPProgressBar } from "../ui/hud/XPProgressBar.js";
import { LootPickupFxSystem } from "../systems/visual/LootPickupFxSystem.js";
import { RewardFlightMotionSystem } from "../systems/visual/RewardFlightMotionSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { REWARD_FLIGHT_CHANNELS } from "../values/rewardFlightMotions.js";
import { XP_GATHERING_CONFIG } from "../values/xpGathering.js";
import { LOOT_PICKUP_PRESENTATION } from "../values/lootPickupPresentation.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";

const XP_TRIGGER_VARIATIONS = Object.freeze({
  routine: "routine",
  cluster: "cluster",
  surge: "surge",
  star: "star",
  special: "special",
  legend: "legend",
  levelUp: "levelUp",
});

const LOOT_TRIGGER_IDS = new Set(["bagDirt", "bagGold", "bagMagma"]);
const TELEMETRY_SETTLE_BUFFER_MS = 48;

class XPGatheringHarnessScene extends Phaser.Scene {
  constructor() {
    super("xp-gathering-harness");
    this.level = 1;
    this.currentXP = 840;
    this.requiredXP = 2417;
    this.telemetryReady = false;
    this.lastTriggerId = null;
    this.lastTelemetry = null;
    this.telemetryTimer = null;
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
    const soil = LOOT_PICKUP_PRESENTATION.assets.soilMinis;
    const resources = WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas;
    this.load.image(soil.key, `../${soil.path.split("?")[0]}`);
    this.load.image(resources.key, `../${resources.path.split("?")[0]}`);
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
    this.titleText = this.add.text(this.scale.width / 2, this.scale.height * 0.32, "XP FLOATING ICON LIBRARY V2", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: "#b9c8d3",
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0.72);
    const iconCount = Object.keys(XP_GATHERING_CONFIG.assetPaths).length;
    const variationCount = Object.keys(XP_GATHERING_CONFIG.pickup.variations).length;
    this.subtitleText = this.add.text(this.scale.width / 2, this.scale.height * 0.37, `${iconCount} authored icons • ${variationCount} semantic families • deterministic polished flights`, {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: "#718697",
    }).setOrigin(0.5);

    this.motionText = this.add.text(this.scale.width / 2, this.scale.height * 0.43, "TRIGGER: —\nVARIATION: — • ICONS: —\nMOTION: —", {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: "#d0aa55",
      align: "center",
      lineSpacing: 3,
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
    this.snapshotProvider = () => this._snapshot();
    this.triggerProvider = id => this._trigger(String(id || ""));
    window.__xpHarnessSnapshot = this.snapshotProvider;
    window.__xpHarnessTrigger = this.triggerProvider;
    this.events.once("shutdown", () => {
      this.telemetryTimer?.remove?.();
      this.telemetryTimer = null;
      this.xpProgressBar.destroy();
      this.lootPickupFxSystem.destroy();
      this.rewardFlightMotionSystem.destroy();
      if (window.__xpHarnessSnapshot === this.snapshotProvider) delete window.__xpHarnessSnapshot;
      if (window.__xpHarnessTrigger === this.triggerProvider) delete window.__xpHarnessTrigger;
    });
  }

  _trigger(id) {
    const variationId = XP_TRIGGER_VARIATIONS[id] || null;
    if (!variationId && !LOOT_TRIGGER_IDS.has(id)) return false;
    this._beginTelemetry(id);
    if (id === "levelUp") {
      this.showXpGatheringFeedback({ xpGained: 260, resourceType: "gold", levelUp: true }, { tx: 8, ty: 5 });
      this.level += 1;
      this.currentXP = 72;
      this.requiredXP = 3200;
      this.xpProgressBar.update(this.level, this.currentXP, this.requiredXP);
      this._queueTelemetry(variationId);
      return true;
    }
    if (id === "bagDirt") { this._loot("dirt", 1); this._queueTelemetry(); return true; }
    if (id === "bagGold") { this._loot("gold", 5); this._queueTelemetry(); return true; }
    if (id === "bagMagma") { this._loot("magmaCrystal", 20); this._queueTelemetry(); return true; }
    if (id === "surge") {
      this._gain({ xpGained: 760, resourceType: "gold" }, { tx: 8, ty: 5 });
      this._queueTelemetry(variationId);
      return true;
    }
    if (id === "legend") {
      this._gain({ xpGained: 420, specialBlockEffect: "legendLevelProgress" }, { tx: 10, ty: 5 });
      this._queueTelemetry(variationId);
      return true;
    }
    if (id === "special") {
      this._gain({ xpGained: 242, specialBlockEffect: "levelProgress" }, { tx: 10, ty: 5 });
      this._queueTelemetry(variationId);
      return true;
    }
    if (id === "star") {
      this._gain({ xpGained: 48, resourceType: "silver", skyTileRarity: 4 }, { tx: 9, ty: 5 });
      this._queueTelemetry(variationId);
      return true;
    }
    if (id === "cluster") {
      this._gain({ xpGained: 18, resourceType: "copper" }, { tx: 7, ty: 5 }, false);
      this._gain({ xpGained: 32, resourceType: "gold" }, { tx: 8, ty: 5 });
      this._queueTelemetry(variationId);
      return true;
    }
    this._gain({ xpGained: 18, resourceType: "copper" }, { tx: 7, ty: 5 });
    this._queueTelemetry(variationId);
    return true;
  }

  _gain(reward, tile, updateBar = true) {
    this.showXpGatheringFeedback(reward, tile);
    this.currentXP = Math.min(this.requiredXP - 1, this.currentXP + reward.xpGained);
    if (updateBar) this.xpProgressBar.update(this.level, this.currentXP, this.requiredXP);
  }

  _loot(resourceType, amount) {
    this.lootPickupFxSystem.showResourcePickup({
      worldX: this.scale.width * 0.44,
      worldY: this.scale.height * 0.58,
      resourceType,
      amount,
      tileX: 17,
      tileY: resourceType === "gold" ? 43 : 29,
    });
  }

  _beginTelemetry(id) {
    this.telemetryTimer?.remove?.();
    this.telemetryTimer = null;
    this.telemetryReady = false;
    this.lastTriggerId = id;
    this.lastTelemetry = null;
    this.lastCue = null;
    this.motionText.setText(`TRIGGER: ${id.toUpperCase()}\nSELECTING ALL STAGGERED PLANS…\nMOTION: —`);
  }

  _queueTelemetry(variationId = null) {
    const profile = variationId
      ? XP_GATHERING_CONFIG.pickup.variations[variationId]
      : null;
    const pickupCount = Math.max(1, Number(profile?.pickupCount) || 1);
    const delay = variationId
      ? XP_GATHERING_CONFIG.pickup.coalesceWindowMs
        + XP_GATHERING_CONFIG.pickup.popDurationMs
        + XP_GATHERING_CONFIG.pickup.staggerMs * (pickupCount - 1)
        + TELEMETRY_SETTLE_BUFFER_MS
      : 180;
    this.telemetryTimer = this.time.delayedCall(delay, () => {
      this.telemetryTimer = null;
      this._collectTelemetry(variationId ? REWARD_FLIGHT_CHANNELS.xp : REWARD_FLIGHT_CHANNELS.loot);
    });
  }

  _collectTelemetry(channel) {
    const gathering = this.xpProgressBar.gatheringFx;
    const xpSelection = this.rewardFlightMotionSystem.getLastSelection(REWARD_FLIGHT_CHANNELS.xp);
    const lootSelection = this.rewardFlightMotionSystem.getLastSelection(REWARD_FLIGHT_CHANNELS.loot);
    const isXp = channel === REWARD_FLIGHT_CHANNELS.xp;
    const variationId = isXp ? gathering.lastVariationId || null : null;
    const selectedIconIds = isXp ? [...(gathering.lastIconIds || [])] : [];
    const motionProfileId = isXp
      ? gathering.lastMotionProfileId || xpSelection?.profileId || null
      : lootSelection?.profileId || null;
    this.lastTelemetry = Object.freeze({
      channel,
      variationId,
      selectedIconIds: Object.freeze(selectedIconIds),
      motionProfileId,
      xpMotionProfileId: xpSelection?.profileId || null,
      lootMotionProfileId: lootSelection?.profileId || null,
    });
    this.telemetryReady = true;
    this.motionText.setText([
      `TRIGGER: ${this.lastTriggerId?.toUpperCase() || "—"} • CHANNEL: ${channel.toUpperCase()}`,
      `VARIATION: ${variationId || "—"} • ICONS: ${selectedIconIds.join(", ") || "—"}`,
      `MOTION: ${motionProfileId || "—"}`,
    ].join("\n"));
  }

  _snapshot() {
    const gathering = this.xpProgressBar?.gatheringFx;
    const telemetry = this.lastTelemetry;
    return {
      ready: Boolean(this.xpProgressBar && this.rewardFlightMotionSystem),
      telemetryReady: this.telemetryReady,
      triggerId: this.lastTriggerId,
      channel: telemetry?.channel || null,
      variationId: telemetry?.variationId || null,
      selectedIconIds: [...(telemetry?.selectedIconIds || [])],
      motionProfileId: telemetry?.motionProfileId || null,
      xpMotionProfileId: telemetry?.xpMotionProfileId || null,
      lootMotionProfileId: telemetry?.lootMotionProfileId || null,
      activeXpSprites: gathering?.activeSprites?.length || 0,
      activeXpLabels: gathering?.activeLabels?.length || 0,
      activeLootSprites: this.lootPickupFxSystem?.activeSprites?.length || 0,
      level: this.level,
      currentXP: this.currentXP,
      requiredXP: this.requiredXP,
      lastCue: this.lastCue ? { ...this.lastCue } : null,
    };
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
    this.titleText.setPosition(this.scale.width / 2, this.scale.height * 0.32);
    this.subtitleText.setPosition(this.scale.width / 2, this.scale.height * 0.37);
    this.motionText.setPosition(this.scale.width / 2, this.scale.height * 0.43);
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
