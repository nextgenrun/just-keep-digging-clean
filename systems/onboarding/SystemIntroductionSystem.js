import {
  SYSTEM_INTRODUCTION_CONFIG,
  resolveSystemIntroductionEnabled,
} from "../../values/systemIntroduction.js";
import { UPGRADES } from "../../values/upgradeDefinitions.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { isDemoShowcaseSystemFeature } from "../../values/gameplayDevFlags.js";

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
    this.demoShowcase = options.demoShowcase !== false;
    this.lastSnapshot = null;
    this._lastAvailabilitySignature = "";
    this._upgradeAvailabilityProvider = (upgradeId, upgrade) => (
      this.getUpgradeAvailability(upgradeId, upgrade)
    );
    this.scene.upgradeSystem?.setUpgradeAvailabilityProvider?.(
      this._upgradeAvailabilityProvider,
    );
  }

  update() {
    return this.refresh();
  }

  refresh() {
    const snapshot = this.getProgressSnapshot();
    this.lastSnapshot = snapshot;
    this._applyRuntimeVisibility(snapshot);
    return snapshot;
  }

  getProgressSnapshot() {
    const journal = this.retention?.getJournalSnapshot?.() || {};
    const stats = journal.stats || {};
    const tutorial = this.retention?.getTutorialState?.() || {};
    const playerLevel = Math.max(1, number(this.scene.playerLevelSystem?.level) || 1);
    const bestDepth = number(stats.bestDepth);
    const legacySave = tutorial.choice === TOWN_TUTORIAL_CHOICES.LEGACY;
    const tutorialComplete = legacySave || COMPLETE_TUTORIAL_STAGES.has(tutorial.stage);
    const flightReady = tutorial.flightTrainingGranted === true
      || this.scene.upgradeSystem?.isGemPowerUnlocked?.() === true;
    const firstReturn = number(stats.expeditionsCompleted) >= 1
      || Boolean(journal.lastExpedition)
      || (legacySave && bestDepth >= RETENTION_CONFIG.depth.expeditionStartMeters);
    const thresholds = this.config.thresholds;
    const snapshot = {
      bestDepth,
      playerLevel,
      legacySave,
      tutorialComplete,
      flightReady,
      firstReturn,
      coreLoopComplete: tutorialComplete
        && number(stats.totalTilesBroken) > 0
        && number(stats.resourcesSold) > 0
        && number(stats.portalsActivated) > 0,
      gearRun: firstReturn && bestDepth >= thresholds.gearDepth,
      portalRun: bestDepth >= thresholds.portalDepth
        || number(stats.portalsActivated) > 0
        || number(stats.chestsOpened) > 0,
      talentRun: playerLevel >= thresholds.talentLevel,
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

  isFeatureAvailable(feature, snapshot = null) {
    if (this.demoShowcase && isDemoShowcaseSystemFeature(feature)) return true;
    if (!this.enabled) return true;
    const progress = snapshot || this.lastSnapshot || this.getProgressSnapshot();
    if (progress.legacySave === true) return true;
    if (Object.hasOwn(progress, feature)) return Boolean(progress[feature]);
    const unlock = this.config.featureUnlocks[feature];
    if (!unlock || unlock === "always") return true;
    return Boolean(progress[unlock]);
  }

  isMerchantUnlocked(merchantId) {
    if (!Object.hasOwn(this.config.merchantUnlocks, merchantId)) return false;
    const feature = this.config.merchantUnlocks[merchantId];
    return this.isFeatureAvailable(feature);
  }

  isMerchantAvailable(merchantId) {
    if (!Object.hasOwn(this.config.merchantUnlocks, merchantId)) return false;
    if (this.config.shopPresentation?.alwaysVisibleMerchantIds?.includes(merchantId)) return true;
    return this.isMerchantUnlocked(merchantId);
  }

  getAvailableMerchantIds() {
    return Object.keys(this.config.merchantUnlocks)
      .filter(merchantId => this.isMerchantAvailable(merchantId));
  }

  getUpgradeAvailability(upgradeId, upgrade = UPGRADES[upgradeId]) {
    if (!upgrade) {
      return {
        available: false,
        reason: "invalid_upgrade",
        feature: null,
        short: "UNAVAILABLE",
        detail: "The upgrade definition is unavailable.",
      };
    }
    if (!this.enabled || this.scene.upgradeSystem?.getUpgradeLevel?.(upgradeId) > 0) {
      return { available: true, reason: null, feature: "core", short: "AVAILABLE NOW", detail: "" };
    }
    const feature = this.config.upgradeUnlocks[upgradeId]
      || this.config.merchantUnlocks[upgrade.merchant]
      || "core";
    const available = this.isFeatureAvailable(feature);
    const copy = this.config.unlockCopy?.[feature] || {
      short: "PROGRESSION LOCK",
      detail: "Continue progressing to unlock this upgrade.",
    };
    return {
      available,
      reason: available ? null : "progression_locked",
      feature,
      short: copy.short,
      detail: copy.detail,
    };
  }

  isUpgradeAvailable(upgradeId, upgrade = UPGRADES[upgradeId]) {
    return this.getUpgradeAvailability(upgradeId, upgrade).available;
  }

  getNextPromiseOverride() {
    if (!this.enabled) return null;
    const snapshot = this.lastSnapshot || this.getProgressSnapshot();
    const state = snapshot.tutorial;
    if (!state || ACTIVE_TUTORIAL_STAGES.has(state.stage)) return null;
    if (!snapshot.tutorialComplete) return null;

    const priority = this._getPromiseUpgradePriority();
    const priorityIndex = new Map(priority.map((upgradeId, index) => [upgradeId, index]));
    const affordableUpgrades = Object.entries(UPGRADES).filter(([upgradeId, upgrade]) => (
      !upgrade.comingSoon
      && !upgrade.hiddenFromShop
      && this.scene.upgradeSystem?.canPurchaseUpgrade?.(upgradeId)?.canPurchase === true
    )).sort(([leftId], [rightId]) => (
      (priorityIndex.get(leftId) ?? Number.MAX_SAFE_INTEGER)
        - (priorityIndex.get(rightId) ?? Number.MAX_SAFE_INTEGER)
    ));
    const candidates = affordableUpgrades.slice(0, 2).map(([, upgrade]) => ({
        promise: `UPGRADE AVAILABLE  •  ${upgrade.name.toUpperCase()}`,
        detail: "SPEND EARNED MONEY NOW  •  OR KEEP SAVING FOR YOUR ROUTE",
      }));
    if (snapshot.playerLevel < this.config.thresholds.talentLevel) {
      candidates.push({
        promise: "NEXT MASTERY PATH  •  REACH LEVEL 20",
        detail: "THE STAR PILLAR UNLOCKS YOUR FIRST CELESTIAL ABILITY",
      });
    }

    const next = this.config.promiseOrder.find(item => (
      !this.isFeatureAvailable(item.feature, snapshot)
    ));
    if (next) {
      candidates.push({ promise: next.promise, detail: replaceKeys(next.detail) });
    }
    if (!candidates.length) return null;
    const rotationMs = Math.max(1000, Number(this.config.promiseRotationMs) || 18000);
    const time = Math.max(0, Number(this.scene.time?.now) || 0);
    return candidates[Math.floor(time / rotationMs) % candidates.length];
  }

  _getPromiseUpgradePriority() {
    const defaultPriority = this.config.promiseUpgradePriority || [];
    const hardcore = this.scene._hardcoreModeRuntime?.system?.getSnapshot?.();
    if (hardcore?.armed !== true) return defaultPriority;
    const survival = this.config.hardcoreSurvivalUpgradePriority || [];
    return [...new Set([...survival, ...defaultPriority])];
  }

  getHealthSnapshot() {
    const merchantIds = Object.keys(this.config.merchantUnlocks);
    const lockedUpgradeIds = Object.keys(UPGRADES).filter(
      upgradeId => !this.isUpgradeAvailable(upgradeId),
    );
    return {
      enabled: this.enabled,
      featureCount: Object.keys(this.config.featureUnlocks).length,
      availableMerchants: this.getAvailableMerchantIds(),
      unlockedMerchants: merchantIds.filter(merchantId => this.isMerchantUnlocked(merchantId)),
      lockedUpgradeIds,
      snapshot: this.lastSnapshot || this.getProgressSnapshot(),
    };
  }

  _applyRuntimeVisibility(snapshot) {
    const visibility = {
      clock: this.isFeatureAvailable("clock", snapshot),
      weather: false,
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

  destroy() {
    this.scene?.upgradeSystem?.setUpgradeAvailabilityProvider?.(null);
    this.scene = null;
    this.retention = null;
    this.lastSnapshot = null;
    this._upgradeAvailabilityProvider = null;
  }
}
