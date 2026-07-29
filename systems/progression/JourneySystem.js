import {
  JOURNEY_CONFIG,
  JOURNEY_EVENT_TYPES,
  JOURNEY_UPGRADE_STAT_MAP,
} from "../../values/journeyConfig.js";
import { JourneyLedger } from "./JourneyLedger.js";
import { resolveJourneyGoals } from "./JourneyGoalResolver.js";
import { observeJourneyProgress } from "./JourneyProgressObserver.js";

function number(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function formatValue(value, precision = 0) {
  const safe = number(value);
  return precision > 0 ? safe.toFixed(precision) : Math.round(safe).toLocaleString();
}

export class JourneySystem {
  constructor({ snapshotProvider = null, onChanged = null, initialData = null } = {}) {
    this.snapshotProvider = typeof snapshotProvider === "function" ? snapshotProvider : null;
    this.onChanged = typeof onChanged === "function" ? onChanged : null;
    this.ledger = new JourneyLedger(initialData);
    this.baseline = null;
    this.lastPollAt = Number.NEGATIVE_INFINITY;
  }

  captureSnapshot() {
    const snapshot = this.snapshotProvider?.();
    return snapshot && typeof snapshot === "object" ? snapshot : null;
  }

  loadSaveData(value) {
    this.ledger.loadSaveData(value);
    this.baseline = null;
  }

  seedCurrentState() {
    this.baseline = this.captureSnapshot();
    return this.baseline;
  }

  getSaveData() {
    return this.ledger.getSaveData();
  }

  update(nowMs = 0) {
    const now = number(nowMs);
    if (now - this.lastPollAt < JOURNEY_CONFIG.pollIntervalMs) return false;
    this.lastPollAt = now;
    const snapshot = this.captureSnapshot();
    if (!snapshot) return false;
    if (!this.baseline) {
      this.baseline = snapshot;
      return false;
    }
    const changed = observeJourneyProgress(this.baseline, snapshot, this.ledger);
    this.baseline = snapshot;
    if (changed) this.onChanged?.();
    return changed;
  }

  recordUpgradePurchase({
    upgrade,
    beforeSnapshot,
    afterSnapshot,
    beforeLevel = 0,
    afterLevel = 1,
  } = {}) {
    if (!upgrade || !afterSnapshot) return null;
    const rule = upgrade.category === "pickaxes"
      ? {
          statKey: "pickaxePower",
          label: "Pickaxe Power",
          unit: "",
          precision: 0,
        }
      : JOURNEY_UPGRADE_STAT_MAP[upgrade.effectType];
    const beforeValue = rule?.statKey
      ? beforeSnapshot?.stats?.[rule.statKey]
      : beforeSnapshot?.upgradeEffects?.[rule?.effectKey];
    const afterValue = rule?.statKey
      ? afterSnapshot?.stats?.[rule.statKey]
      : afterSnapshot?.upgradeEffects?.[rule?.effectKey];
    const numericChange = Number.isFinite(beforeValue)
      && Number.isFinite(afterValue)
      && beforeValue !== afterValue;
    const event = this.ledger.record({
      type: JOURNEY_EVENT_TYPES.UPGRADE,
      title: numericChange ? rule.label : upgrade.name,
      detail: JOURNEY_CONFIG.eventCopy.upgradeDetail,
      source: upgrade.id,
      before: numericChange ? beforeValue : beforeLevel,
      after: numericChange ? afterValue : afterLevel,
      unit: numericChange ? rule.unit : "level",
      precision: numericChange ? rule.precision : 0,
    });
    this.baseline = afterSnapshot;
    if (event) this.onChanged?.();
    return event;
  }

  recordCraft(result = {}) {
    const recipeName = result.recipe?.name || result.outputUpgradeId || "Forge unlock";
    const event = this.ledger.record({
      type: JOURNEY_EVENT_TYPES.FORGE,
      title: `${recipeName} forged`,
      detail: JOURNEY_CONFIG.eventCopy.forgeDetail,
      source: result.recipe?.id || result.outputUpgradeId || "forge",
      before: 0,
      after: 1,
      unit: "owned",
      precision: 0,
    });
    this.baseline = this.captureSnapshot();
    if (event) this.onChanged?.();
    return event;
  }

  getViewModel() {
    const snapshot = this.captureSnapshot() || this.baseline || {};
    return {
      build: this._buildCards(snapshot),
      goals: resolveJourneyGoals(snapshot),
      history: this.ledger.getEvents(JOURNEY_CONFIG.maxVisibleHistory),
    };
  }

  _buildCards(snapshot) {
    const stats = snapshot.stats || {};
    const progress = snapshot.progress || {};
    const speed = formatValue(stats.movementSpeedPxPerSec);
    const speedBonusValue = number(stats.movementSpeedBonusPxPerSec);
    const speedBonus = formatValue(speedBonusValue);
    const miningRate = formatValue(stats.miningRatePerSecond, 2);
    return [
      {
        label: "MOVEMENT",
        value: `${speed} PX/S`,
        detail: `${speedBonusValue >= 0 ? "+" : ""}${speedBonus} permanent`,
      },
      {
        label: "MINING",
        value: `${formatValue(stats.pickaxePower)} POWER`,
        detail: `${progress.currentPickaxeName || JOURNEY_CONFIG.copy.starterPickaxe} • ${miningRate}/s`,
      },
      {
        label: "GEM POWER",
        value: `${formatValue(stats.gemPowerMax)} CAP`,
        detail: progress.flightUnlocked ? "Flight connected" : "Flight not unlocked",
      },
      {
        label: "PROGRESS",
        value: `${formatValue(progress.bestDepth)}M BEST`,
        detail: `${number(progress.portalLabels?.length)} routes • fire T${number(progress.campfireLevel, 1)}`,
      },
    ];
  }
}
