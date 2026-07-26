import {
  RETENTION_CONFIG,
  RETENTION_EVENT_TYPES,
} from "../../values/retentionConfig.js";
import { TITAN_DEFINITIONS } from "../../values/titanDiscoveries.js";
import { TREASURE_CHEST_CONFIG } from "../../values/treasureChestConfig.js";
import { RESOURCE_PRICES_CONFIG } from "../../values/resourcePrices.js";
import {
  createRetentionExpedition,
  createRetentionObjective,
  finiteRetentionInt,
  sanitizeRetentionExpedition,
  sanitizeRetentionProgressData,
} from "./retentionProgressState.js";

const TUTORIAL_STAGES = RETENTION_CONFIG.tutorial.stages;
const TITAN_IDS = new Set(TITAN_DEFINITIONS.map(definition => definition.id));

export class RetentionProgressSystem {
  constructor(options = {}) {
    this.saveSlot = finiteRetentionInt(options.saveSlot, 1, 999) || 1;
    this.data = sanitizeRetentionProgressData(null);
    this.expedition = createRetentionExpedition();
    this.events = [];
    this.pendingUpgradePayoff = null;
    this.chestCritBuffUntil = 0;
    this._lastDepth = 0;
    this._lastBestToastDepth = 0;
    this._sessionBestTarget = 0;
    this._sessionRecordAnnounced = false;
    this._objective = createRetentionObjective(this.saveSlot);
  }

  loadSaveData(value) {
    this.data = sanitizeRetentionProgressData(value);
    this._sessionBestTarget = this.data.stats.bestDepth;
    this._sessionRecordAnnounced = false;
    this._lastBestToastDepth = Math.floor(
      this.data.stats.bestDepth / RETENTION_CONFIG.depth.personalBestToastStepMeters
    ) * RETENTION_CONFIG.depth.personalBestToastStepMeters;
  }

  getSaveData() {
    return sanitizeRetentionProgressData(this.data);
  }

  seedLegacyProgress({
    dugTileKeys = [],
    resources = {},
    level = 1,
    relics = 0,
    stars = 0,
    portals = [],
    topAirRows = 65,
  } = {}) {
    if (this.data.stats.bestDepth <= 0 && Array.isArray(dugTileKeys)) {
      this.data.stats.bestDepth = dugTileKeys.reduce((max, key) => {
        const ty = Number.parseInt(String(key).split(",")[1], 10);
        return Number.isInteger(ty) ? Math.max(max, ty - topAirRows) : max;
      }, 0);
    }
    if (this._sessionBestTarget <= 0 && this.data.stats.bestDepth > 0) {
      this._sessionBestTarget = this.data.stats.bestDepth;
    }
    Object.entries(resources || {}).forEach(([key, amount]) => {
      if (Number(amount) > 0) this._discover("materials", key, null, false);
    });
    if (finiteRetentionInt(level, 1) > 1 && this.data.tutorialStage === "mine") {
      this.data.tutorialStage = "complete";
    }
    if (finiteRetentionInt(relics) > 0) this._discover("journal", "ancient-relic", null, false);
    if (this.data.stats.starsCollected <= 0) {
      this.data.stats.starsCollected = finiteRetentionInt(stars, 0, 1000000);
    }
    (Array.isArray(portals) ? portals : []).forEach(label => {
      this._discover("portals", String(label), null, false);
    });
  }

  updateDepth(depth, { isTown = false } = {}) {
    const nextDepth = finiteRetentionInt(depth, 0, 100000);
    this.data.stats.currentDepth = nextDepth;
    const previousBest = this.data.stats.bestDepth;
    if (nextDepth > previousBest) {
      this.data.stats.bestDepth = nextDepth;
      const crossedSessionBest = this._sessionBestTarget >= RETENTION_CONFIG.depth.expeditionStartMeters
        && previousBest <= this._sessionBestTarget
        && nextDepth > this._sessionBestTarget
        && !this._sessionRecordAnnounced;
      if (crossedSessionBest) {
        this._sessionRecordAnnounced = true;
        this.events.push({
          type: RETENTION_EVENT_TYPES.PERSONAL_BEST,
          depth: nextDepth,
          previousBest: this._sessionBestTarget,
        });
      }
      const step = RETENTION_CONFIG.depth.personalBestToastStepMeters;
      const toastDepth = Math.floor(nextDepth / step) * step;
      if (toastDepth > this._lastBestToastDepth && !crossedSessionBest) {
        this._lastBestToastDepth = toastDepth;
        this.events.push({ type: RETENTION_EVENT_TYPES.PERSONAL_BEST, depth: nextDepth });
      }
    }
    RETENTION_CONFIG.depth.journalBands.forEach(band => {
      if (nextDepth >= band.depth) {
        this._discover("journal", `depth:${band.depth}`, `Depth Band: ${band.label}`, false);
      }
    });

    if (nextDepth >= RETENTION_CONFIG.depth.expeditionStartMeters) {
      this.expedition.active = true;
      this.expedition.maxDepth = Math.max(this.expedition.maxDepth, nextDepth);
    }
    if (!this._objective.complete && this._objective.event === "depthGain") {
      if (!Number.isFinite(this._objective.startDepth)) this._objective.startDepth = nextDepth;
      this._objective.progress = Math.max(
        this._objective.progress,
        Math.max(0, nextDepth - this._objective.startDepth)
      );
      if (this._objective.progress >= this._objective.target) {
        this._objective.progress = this._objective.target;
        this._objective.complete = true;
        this.events.push({
          type: RETENTION_EVENT_TYPES.OBJECTIVE_COMPLETE,
          objective: { ...this._objective },
        });
      }
    }

    if (isTown && this.expedition.active) {
      const summary = sanitizeRetentionExpedition(this.expedition);
      const previous = this.data.lastExpedition;
      this.data.lastExpedition = summary;
      this.data.stats.expeditionsCompleted += 1;
      this.events.push({
        type: RETENTION_EVENT_TYPES.EXPEDITION_SUMMARY,
        summary,
        previous,
      });
      this.expedition = createRetentionExpedition();
    }
    this._lastDepth = nextDepth;
  }

  recordMiningResult(result = {}) {
    if (!result?.success) return;
    if (result.isCriticalHit) {
      this.data.stats.criticalHits += 1;
      this._advanceObjective("criticalHit", 1);
    }
    if (result.isLuckyDrop) this.data.stats.luckyDrops += 1;
    if (finiteRetentionInt(result.overkillDamage) > 0) this.data.stats.overkills += 1;
    if (!result.destroyed) return;

    this.data.stats.totalTilesBroken += 1;
    this.expedition.tilesBroken += 1;
    this.onFirstTileBroken();
    this._advanceObjective("tileBreak", 1);
    const units = finiteRetentionInt(result.resourceAmount);
    if (units > 0) {
      this.data.stats.totalResources += units;
      this.expedition.resourceUnits += units;
      this._advanceObjective("resource", units);
    }
    if (result.resourceType) {
      this._discover("materials", result.resourceType, result.resourceLabel || result.resourceType, true);
      const prices = RESOURCE_PRICES_CONFIG.basePrices;
      const previousBest = this.expedition.bestMaterial;
      if (!previousBest || (prices[result.resourceType] || 0) > (prices[previousBest] || 0)) {
        this.expedition.bestMaterial = result.resourceType;
      }
    }
    if (finiteRetentionInt(result.ancientRelics) > 0) this.recordRelic(result.ancientRelics);
  }

  recordSale(money, units = 0) {
    const earned = this.recordMoneyEarned(money);
    this.data.stats.resourcesSold += finiteRetentionInt(units, 0, 1000000000);
    if (this.data.tutorialStage === "sell") this._setTutorialStage("upgrade");
    return { money: earned, units: finiteRetentionInt(units) };
  }

  recordMoneyEarned(money) {
    const earned = finiteRetentionInt(money, 0, 1000000000000);
    this.data.stats.moneyEarned += earned;
    this.expedition.moneyEarned += earned;
    return earned;
  }

  recordUpgrade(upgradeName, preview = null) {
    this.data.stats.upgradesPurchased += 1;
    if (this.data.tutorialStage === "upgrade") this._setTutorialStage("complete");
    this.pendingUpgradePayoff = {
      upgradeName: String(upgradeName || "Upgrade"),
      beforeHits: finiteRetentionInt(preview?.beforeHits),
      afterHits: finiteRetentionInt(preview?.afterHits),
      beforeDamage: finiteRetentionInt(preview?.beforeDamage),
      afterDamage: finiteRetentionInt(preview?.afterDamage),
    };
  }

  consumeUpgradePayoff() {
    if (!this.pendingUpgradePayoff) return null;
    const payoff = this.pendingUpgradePayoff;
    this.pendingUpgradePayoff = null;
    return payoff;
  }

  recordPortalActivated(label) {
    this.data.stats.portalsActivated += 1;
    this._discover("portals", label, label, false);
    this._discover("journal", `portal:${label}`, `Portal: ${label}`, false);
  }

  recordChest({ money = 0, star = false } = {}) {
    this.data.stats.chestsOpened += 1;
    this.expedition.chests += 1;
    this.recordMoneyEarned(money);
    this._discover("journal", "treasure-chest", "Authored Treasure Chest", false);
  }

  recordStar(amount = 1) {
    const count = finiteRetentionInt(amount, 0, 1000);
    this.data.stats.starsCollected += count;
    this.expedition.stars += count;
    if (count > 0) this._discover("journal", "sky-star", "Constellation Star", false);
  }

  recordRelic(amount = 1) {
    const count = finiteRetentionInt(amount, 0, 1000);
    this.data.stats.relicsFound += count;
    this.expedition.relics += count;
    if (count > 0) this._discover("journal", "ancient-relic", "Ancient Relic", false);
  }

  recordEarthquake({ passagesOpened = 0, intensity = "unknown", distanceEndured = 0 } = {}) {
    const opened = finiteRetentionInt(passagesOpened, 0, 10000);
    this.data.stats.earthquakesSurvived += 1;
    this.data.stats.passagesOpened += opened;
    this._discover("journal", "earthquake", "Earthquake", false);
    this.events.push({
      type: RETENTION_EVENT_TYPES.EARTHQUAKE_RECAP,
      passagesOpened: opened,
      intensity: String(intensity || "unknown"),
      distanceEndured: finiteRetentionInt(distanceEndured, 0, 100000),
    });
  }

  recordComboCount(comboCount) {
    this.data.stats.highestCombo = Math.max(
      this.data.stats.highestCombo,
      finiteRetentionInt(comboCount, 0, 1000000000)
    );
  }

  discoverJournal(key, label) {
    return this._discover("journal", key, label, false);
  }

  discoverTitan(key) {
    if (!TITAN_IDS.has(key)) return false;
    return this._discover("titans", key, null, false);
  }

  hasDiscoveredTitan(key) {
    return this.data.discoveries.titans.includes(key);
  }

  getDiscoveredTitans() {
    return [...this.data.discoveries.titans];
  }

  activateChestCritBuff(nowMs) {
    const now = Number.isFinite(nowMs) ? nowMs : 0;
    this.chestCritBuffUntil = Math.max(
      this.chestCritBuffUntil,
      now + TREASURE_CHEST_CONFIG.critBuff.durationMs
    );
    return this.chestCritBuffUntil;
  }

  setChestCritBuffUntil(untilMs) {
    this.chestCritBuffUntil = Math.max(0, Number(untilMs) || 0);
  }

  getChestCritBuffRemaining(nowMs) {
    return Math.max(0, this.chestCritBuffUntil - (Number(nowMs) || 0));
  }

  getChestCritDamageBonus(nowMs) {
    return this.getChestCritBuffRemaining(nowMs) > 0
      ? TREASURE_CHEST_CONFIG.critBuff.criticalDamageMultiplierBonus
      : 0;
  }

  _setTutorialStage(stage) {
    if (!TUTORIAL_STAGES.includes(stage) || stage === this.data.tutorialStage) return;
    this.data.tutorialStage = stage;
    this.events.push({
      type: RETENTION_EVENT_TYPES.TUTORIAL,
      stage,
      message: RETENTION_CONFIG.tutorial.copy[stage],
    });
  }

  _discover(group, key, label, emit) {
    if (!key || !this.data.discoveries[group]) return false;
    const normalized = String(key);
    if (this.data.discoveries[group].includes(normalized)) return false;
    this.data.discoveries[group].push(normalized);
    if (emit) {
      this.events.push({
        type: RETENTION_EVENT_TYPES.DISCOVERY,
        group,
        key: normalized,
        label: String(label || normalized),
      });
    }
    return true;
  }

  _advanceObjective(event, amount) {
    if (this._objective.complete || this._objective.event !== event) return;
    this._objective.progress = Math.min(
      this._objective.target,
      this._objective.progress + Math.max(0, Number(amount) || 0)
    );
    if (this._objective.progress < this._objective.target) return;
    this._objective.complete = true;
    this.events.push({
      type: RETENTION_EVENT_TYPES.OBJECTIVE_COMPLETE,
      objective: { ...this._objective },
    });
  }

  onFirstTileBroken() {
    if (this.data.tutorialStage === "mine") this._setTutorialStage("sell");
  }

  getTutorialPromise() {
    return RETENTION_CONFIG.tutorial.copy[this.data.tutorialStage] || "";
  }

  getObjective() {
    return { ...this._objective };
  }

  getBestDepth() {
    return this.data.stats.bestDepth;
  }

  getDepthChase() {
    const target = this._sessionBestTarget;
    if (target < RETENTION_CONFIG.depth.expeditionStartMeters) return null;
    const current = this.data.stats.currentDepth;
    const delta = target - current;
    const range = RETENTION_CONFIG.depth.personalBestApproachMeters;
    if (delta > range || delta < -range) return null;
    if (delta > 0) return { state: "approaching", current, target, remaining: delta };
    if (delta === 0) return { state: "matching", current, target, remaining: 0 };
    return { state: "beaten", current, target, amount: Math.abs(delta) };
  }

  hasDiscoveredMaterial(key) {
    return this.data.discoveries.materials.includes(key);
  }

  getJournalSnapshot() {
    return {
      stats: { ...this.data.stats },
      discoveries: {
        materials: [...this.data.discoveries.materials],
        portals: [...this.data.discoveries.portals],
        journal: [...this.data.discoveries.journal],
        titans: [...this.data.discoveries.titans],
      },
      tutorialStage: this.data.tutorialStage,
      objective: this.getObjective(),
      lastExpedition: this.data.lastExpedition ? { ...this.data.lastExpedition } : null,
    };
  }

  drainEvents() {
    const pending = this.events;
    this.events = [];
    return pending;
  }
}
