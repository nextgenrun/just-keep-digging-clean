import {
  SYSTEM_INTRODUCTION_CONFIG,
  resolveSystemIntroductionEnabled,
} from "../../values/systemIntroduction.js";
import {
  FIRST_FIVE_STARTER_UPGRADE_ID,
  UPGRADES,
} from "../../values/upgradeDefinitions.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";

const ACTIVE_TUTORIAL_STAGES = new Set(RETENTION_CONFIG.tutorial.activeStages);
const COMPLETE_TUTORIAL_STAGES = new Set([
  TOWN_TUTORIAL_STAGES.COMPLETE,
  TOWN_TUTORIAL_STAGES.SKIPPED,
]);

function number(value) {
  return Math.max(0, Number(value) || 0);
}

function replaceKeys(text) {
  const labels = {
    interact: USER_SETTINGS.getKeyLabel("interact"),
  };
  return String(text || "").replace(
    /\{(\w+)\}/g,
    (_, key) => labels[key] || key,
  );
}

export class SystemIntroductionSystem {
  constructor(scene, retention, options = {}) {
    this.scene = scene;
    this.retention = retention;
    this.config = options.config || SYSTEM_INTRODUCTION_CONFIG;
    this.enabled = options.enabled
      ?? resolveSystemIntroductionEnabled(this.config, options.search);
    this.lastSnapshot = null;
    this._lastAvailabilitySignature = "";
  }

  update() {
    return this.refresh();
  }

  refresh({ announce = true } = {}) {
    const snapshot = this.getProgressSnapshot();
    const previous = this.lastSnapshot;
    this.lastSnapshot = snapshot;
    if (announce && previous) this._announceFirstNewSystem(previous, snapshot);
    this._applyRuntimeVisibility(snapshot);
    return snapshot;
  }

  getProgressSnapshot() {
    const journal = this.retention?.getJournalSnapshot?.() || {};
    const stats = journal.stats || {};
    const tutorial = this.retention?.getTutorialState?.() || {};
    const bestDepth = number(stats.bestDepth);
    const legacySave = tutorial.choice === TOWN_TUTORIAL_CHOICES.LEGACY;
    const tutorialComplete = legacySave || COMPLETE_TUTORIAL_STAGES.has(tutorial.stage);
    const flightReady = tutorial.completionRewardGranted === true
      || this.scene.upgradeSystem?.isGemPowerUnlocked?.() === true;
    const firstReturn = number(stats.expeditionsCompleted) >= 1
      || Boolean(journal.lastExpedition)
      || (legacySave && bestDepth >= RETENTION_CONFIG.depth.expeditionStartMeters);
    const thresholds = this.config.thresholds;
    const snapshot = {
      bestDepth,
      legacySave,
      tutorialComplete,
      flightReady,
      firstReturn,
      coreLoopComplete: tutorialComplete
        && number(stats.totalTilesBroken) > 0
        && number(stats.resourcesSold) > 0
        && number(stats.upgradesPurchased) > 0,
      gearRun: firstReturn && bestDepth >= thresholds.gearDepth,
      portalRun: bestDepth >= thresholds.portalDepth
        || number(stats.portalsActivated) > 0
        || number(stats.chestsOpened) > 0,
      constellationRun: bestDepth >= thresholds.constellationDepth
        || number(stats.starsCollected) > 0,
      caveRun: bestDepth >= thresholds.caveDepth,
      hazardRun: bestDepth >= thresholds.hazardDepth
        || number(stats.earthquakesSurvived) > 0,
      relicRun: bestDepth >= thresholds.relicDepth
        || number(stats.relicsFound) > 0,
      titanRun: bestDepth >= thresholds.titanDepth
        || (journal.discoveries?.titans?.length || 0) > 0,
      abilityRun: bestDepth >= thresholds.abilityDepth
        || this.scene.upgradeSystem?.getUpgradeLevel?.("quickslashAbility") > 0
        || this.scene.upgradeSystem?.getUpgradeLevel?.("thunderStrikeAbility") > 0,
      lateRun: bestDepth >= thresholds.lateDepth
        || this.scene.upgradeSystem?.getUpgradeLevel?.("worldTwoTunnelAccess") > 0,
      stats: { ...stats },
      tutorial,
    };
    return snapshot;
  }

  isFeatureAvailable(feature, snapshot = this.lastSnapshot || this.getProgressSnapshot()) {
    if (!this.enabled) return true;
    if (snapshot.legacySave === true) return true;
    if (Object.hasOwn(snapshot, feature)) return Boolean(snapshot[feature]);
    const unlock = this.config.featureUnlocks[feature];
    if (!unlock || unlock === "always") return true;
    return Boolean(snapshot[unlock]);
  }

  isMerchantAvailable(merchantId) {
    const feature = this.config.merchantUnlocks[merchantId];
    return !feature || this.isFeatureAvailable(feature);
  }

  getAvailableMerchantIds() {
    return Object.keys(this.config.merchantUnlocks)
      .filter(merchantId => this.isMerchantAvailable(merchantId));
  }

  isUpgradeAvailable(upgradeId, upgrade = UPGRADES[upgradeId]) {
    if (!this.enabled) return true;
    if (!upgrade) return false;
    if (this.scene.upgradeSystem?.getUpgradeLevel?.(upgradeId) > 0) return true;
    if (upgradeId === FIRST_FIVE_STARTER_UPGRADE_ID) return true;
    const feature = this.config.upgradeUnlocks[upgradeId]
      || this.config.merchantUnlocks[upgrade.merchant]
      || "core";
    return this.isFeatureAvailable(feature);
  }

  getNextPromiseOverride() {
    if (!this.enabled) return null;
    const snapshot = this.lastSnapshot || this.getProgressSnapshot();
    const state = snapshot.tutorial;
    if (!state || ACTIVE_TUTORIAL_STAGES.has(state.stage)) return null;
    if (!snapshot.tutorialComplete) return null;

    const stats = snapshot.stats;
    if (number(stats.totalResources) > 0 && number(stats.resourcesSold) <= 0) {
      return {
        promise: "CORE LOOP  •  RETURN AND SELL",
        detail: "BRING YOUR CARGO HOME  •  PRESS {interact} AT THE MONEY MONSTER",
      };
    }
    if (number(stats.upgradesPurchased) <= 0) {
      return {
        promise: "CORE LOOP  •  BUY ONE UPGRADE",
        detail: "VISIT UPGRADES  •  CHOOSE THE NEXT CLEAR IMPROVEMENT",
      };
    }

    const next = this.config.promiseOrder.find(item => (
      !this.isFeatureAvailable(item.feature, snapshot)
    ));
    return next
      ? { promise: next.promise, detail: replaceKeys(next.detail) }
      : null;
  }

  getHealthSnapshot() {
    return {
      enabled: this.enabled,
      featureCount: Object.keys(this.config.featureUnlocks).length,
      availableMerchants: this.getAvailableMerchantIds(),
      snapshot: this.lastSnapshot || this.getProgressSnapshot(),
    };
  }

  _applyRuntimeVisibility(snapshot) {
    const visibility = {
      clock: this.isFeatureAvailable("clock", snapshot),
      weather: this.isFeatureAvailable("weather", snapshot),
      torch: this.isFeatureAvailable("caveRun", snapshot),
      combo: this.isFeatureAvailable("comboHud", snapshot),
      buff: this.isFeatureAvailable("campfire", snapshot),
    };
    const signature = JSON.stringify({
      merchants: this.getAvailableMerchantIds(),
      visibility,
      gemPower: this.isFeatureAvailable("gemPower", snapshot),
      specialTiles: this.isFeatureAvailable("specialTiles", snapshot),
      constellations: this.isFeatureAvailable("constellations", snapshot),
      hazards: this.isFeatureAvailable("hazards", snapshot),
      relics: this.isFeatureAvailable("relics", snapshot),
      titans: this.isFeatureAvailable("titans", snapshot),
      abilities: this.isFeatureAvailable("abilities", snapshot),
      milestones: this.isFeatureAvailable("milestones", snapshot),
    });
    if (signature === this._lastAvailabilitySignature) return;
    this._lastAvailabilitySignature = signature;

    this.scene.npcManager?.setMerchantAvailability?.(this.getAvailableMerchantIds());
    this.scene.hudSystem?.setSystemVisibility?.(visibility);
    const gemPowerVisible = this.isFeatureAvailable("gemPower", snapshot);
    this.scene.setGemPowerHudVisible?.(gemPowerVisible);
    this.scene._gemPowerWarningGfx?.setVisible(gemPowerVisible);
    this.scene._gemPowerWarningText?.setVisible(gemPowerVisible);
    this.scene._skyIslandLabel?.setVisible(
      this.isFeatureAvailable("specialTiles", snapshot),
    );
    this.scene.campfireSystem?.setAvailable?.(
      this.isFeatureAvailable("campfire", snapshot),
    );
    this.scene.specialTileSystem?.setAvailability?.(
      this.isFeatureAvailable("specialTiles", snapshot),
    );
    this.scene.starPillarSystem?.setAvailability?.(
      this.isFeatureAvailable("constellations", snapshot),
    );
    this.scene.milestoneBoardSystem?.setAvailable?.(
      this.isFeatureAvailable("milestones", snapshot),
    );
    this.scene.earthquakeSystem?.setPaused?.(
      !this.isFeatureAvailable("hazards", snapshot),
    );
  }

  _announceFirstNewSystem(previous, next) {
    const item = this.config.promiseOrder.find(entry => (
      !this.isFeatureAvailable(entry.feature, previous)
      && this.isFeatureAvailable(entry.feature, next)
      && entry.feature !== "firstReturn"
    ));
    if (!item) return;
    this.scene.uiNotifications?.success?.(
      `${item.promise}  •  NOW AVAILABLE`,
      { key: `system-introduction-${item.feature}`, priority: 1 },
    );
  }

  destroy() {
    this.scene = null;
    this.retention = null;
    this.lastSnapshot = null;
  }
}
