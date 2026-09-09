import {
  RETENTION_CONFIG,
  RETENTION_EVENT_TYPES,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import { TITAN_DEFINITIONS } from "../../values/titanDiscoveries.js";
import { RESOURCE_PRICES_CONFIG } from "../../values/resourcePrices.js";
import { isContextualMechanicTutorialId } from
  "../../values/contextualMechanicTutorials.js";
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

  getTitanClueTrackingState() {
    const state = this.data.titanClueTracking;
    return {
      configured: state?.configured === true,
      activeTitanId: TITAN_IDS.has(state?.activeTitanId)
        ? state.activeTitanId
        : null,
    };
  }

  setTitanClueTrackingId(titanId) {
    if (titanId !== null && !TITAN_IDS.has(titanId)) return false;
    const current = this.getTitanClueTrackingState();
    const changed = (
      !current.configured
      || current.activeTitanId !== titanId
    );
    this.data.titanClueTracking = {
      configured: true,
      activeTitanId: titanId,
    };
    return changed;
  }

  configureTutorialChoice(choice) {
    if (this.data.tutorialChoice !== null) return false;
    const normalized = choice === TOWN_TUTORIAL_CHOICES.YES
      ? TOWN_TUTORIAL_CHOICES.YES
      : TOWN_TUTORIAL_CHOICES.NO;
    this.data.tutorialChoice = normalized;
    this._setTutorialStage(
      normalized === TOWN_TUTORIAL_CHOICES.YES
        ? TOWN_TUTORIAL_STAGES.MOVE
        : TOWN_TUTORIAL_STAGES.SKIPPED,
    );
    return true;
  }

  getTutorialState() {
    return {
      choice: this.data.tutorialChoice,
      stage: this.data.tutorialStage,
      flightTrainingGranted: this.data.tutorialFlightTrainingGranted === true,
      freeFlightRemainingMs: finiteRetentionInt(
        this.data.tutorialFreeFlightRemainingMs,
        0,
        RETENTION_CONFIG.tutorial.flightTraining.freeFlightMs,
      ),
      freeTeleportPassesConsumed: [
        ...this.data.tutorialFreeTeleportPassesConsumed,
      ],
    };
  }

  isTutorialActive() {
    return RETENTION_CONFIG.tutorial.activeStages.includes(this.data.tutorialStage);
  }

  recordTutorialMovement(distanceTiles) {
    if (
      this.data.tutorialStage !== TOWN_TUTORIAL_STAGES.MOVE
      || Number(distanceTiles) < RETENTION_CONFIG.tutorial.moveDistanceTiles
    ) {
      return false;
    }
    this._setTutorialStage(TOWN_TUTORIAL_STAGES.DIG);
    return true;
  }

  claimTutorialFlightTraining() {
    if (this.data.tutorialFlightTrainingGranted === true) return null;
    if (this.data.tutorialChoice === TOWN_TUTORIAL_CHOICES.LEGACY) return null;
    this.data.tutorialFlightTrainingGranted = true;
    const reward = RETENTION_CONFIG.tutorial.flightTraining;
    const freeFlightMs = this.data.tutorialChoice === TOWN_TUTORIAL_CHOICES.YES
      ? reward.freeFlightMs
      : 0;
    this.data.tutorialFreeFlightRemainingMs = Math.max(
      this.data.tutorialFreeFlightRemainingMs,
      freeFlightMs,
    );
    return {
      flightUpgradeId: reward.flightUpgradeId,
      freeFlightMs,
    };
  }

  recordTutorialFlight() {
    if (this.data.tutorialStage !== TOWN_TUTORIAL_STAGES.FLIGHT) return false;
    // The free reserve teaches Flight; it is not a post-tutorial currency.
    this.data.tutorialFreeFlightRemainingMs = 0;
    this._setTutorialStage(TOWN_TUTORIAL_STAGES.PORTAL);
    return true;
  }

  isTutorialFreeFlightActive() {
    return this.data.tutorialStage === TOWN_TUTORIAL_STAGES.FLIGHT
      && this.data.tutorialFreeFlightRemainingMs > 0;
  }

  consumeTutorialFreeFlight(deltaMs) {
    const previous = this.data.tutorialFreeFlightRemainingMs;
    if (previous <= 0) return 0;
    this.data.tutorialFreeFlightRemainingMs = Math.max(
      0,
      previous - Math.max(0, Number(deltaMs) || 0),
    );
    return previous - this.data.tutorialFreeFlightRemainingMs;
  }

  hasTutorialFreeTeleportPass(passId) {
    return RETENTION_CONFIG.tutorial.freeTeleports.passIds.includes(passId)
      && !this.data.tutorialFreeTeleportPassesConsumed.includes(passId);
  }

  consumeTutorialFreeTeleportPass(passId) {
    if (
      this.data.tutorialChoice !== TOWN_TUTORIAL_CHOICES.YES
      || !this.isTutorialActive()
      || !this.hasTutorialFreeTeleportPass(passId)
    ) {
      return false;
    }
    this.data.tutorialFreeTeleportPassesConsumed.push(passId);
    return true;
  }

  hasSeenMechanicTutorial(tutorialId) {
    return isContextualMechanicTutorialId(tutorialId)
      && this.data.mechanicTutorialsSeen.includes(tutorialId);
  }

  recordMechanicTutorialSeen(tutorialId) {
    if (
      !isContextualMechanicTutorialId(tutorialId)
      || this.hasSeenMechanicTutorial(tutorialId)
    ) {
      return false;
    }
    this.data.mechanicTutorialsSeen.push(tutorialId);
    return true;
  }

  getSeenMechanicTutorials() {
    return [...this.data.mechanicTutorialsSeen];
  }

  seedLegacyProgress({
    dugTileKeys = [],
    resources = {},
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
    if (this.data.tutorialStage === TOWN_TUTORIAL_STAGES.SELL) {
      this._setTutorialStage(TOWN_TUTORIAL_STAGES.UPGRADE);
    }
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
    this.pendingUpgradePayoff = {
      upgradeName: String(upgradeName || "Upgrade"),
      beforeHits: finiteRetentionInt(preview?.beforeHits),
      afterHits: finiteRetentionInt(preview?.afterHits),
      beforeDamage: finiteRetentionInt(preview?.beforeDamage),
      afterDamage: finiteRetentionInt(preview?.afterDamage),
    };
    if (this.data.tutorialStage === TOWN_TUTORIAL_STAGES.UPGRADE) {
      this._setTutorialStage(TOWN_TUTORIAL_STAGES.RESUME);
    }
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
    if (this.data.tutorialStage === TOWN_TUTORIAL_STAGES.PORTAL) {
      this._setTutorialStage(TOWN_TUTORIAL_STAGES.SELL);
    }
  }

  recordTutorialPortalResume() {
    if (this.data.tutorialStage !== TOWN_TUTORIAL_STAGES.RESUME) return false;
    this._setTutorialStage(TOWN_TUTORIAL_STAGES.COMPLETE);
    return true;
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

  _setTutorialStage(stage) {
    if (!TUTORIAL_STAGES.includes(stage) || stage === this.data.tutorialStage) return;
    this.data.tutorialStage = stage;
    const copy = RETENTION_CONFIG.tutorial.copy[stage];
    this.events.push({
      type: RETENTION_EVENT_TYPES.TUTORIAL,
      stage,
      message: typeof copy === "string" ? copy : copy?.title || "",
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
    if (this.data.tutorialStage === TOWN_TUTORIAL_STAGES.DIG) {
      this._setTutorialStage(TOWN_TUTORIAL_STAGES.FLIGHT);
    }
  }

  getTutorialPromise() {
    const copy = RETENTION_CONFIG.tutorial.copy[this.data.tutorialStage];
    return typeof copy === "string" ? copy : copy?.title || "";
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
      tutorialChoice: this.data.tutorialChoice,
      tutorialStage: this.data.tutorialStage,
      tutorialFreeFlightRemainingMs: this.data.tutorialFreeFlightRemainingMs,
      tutorialFreeTeleportPassesConsumed: [
        ...this.data.tutorialFreeTeleportPassesConsumed,
      ],
      mechanicTutorialsSeen: this.getSeenMechanicTutorials(),
      titanClueTracking: this.getTitanClueTrackingState(),
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
