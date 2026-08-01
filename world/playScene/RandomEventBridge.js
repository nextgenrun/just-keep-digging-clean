import { RandomEventDirector } from "../../systems/events/RandomEventDirector.js";
import { RandomEventWorldView } from "../../systems/visual/RandomEventWorldView.js";
import {
  RANDOM_EVENT_TYPES,
  RANDOM_WORLD_EVENT_CONFIG,
  resolveRandomEventFlags,
} from "../../values/randomWorldEvents.js";
import {
  MONEY_MONSTER_RESOURCE_KEYS,
  getResourceDisplayName,
} from "../../values/resourceTypes.js";
import {
  RESOURCE_PRICES_CONFIG,
  getAdjustedResourceUnitPrice,
  getCargoSellValue,
  roundResourceCurrency,
} from "../../values/resourcePrices.js";
import { buildRandomEventPlans } from "./RandomEventPlanner.js";
import { RandomEventActiveRuntime } from "./RandomEventActiveRuntime.js";
import { SleepingJackpotBridge } from "./SleepingJackpotBridge.js";

const cfg = RANDOM_WORLD_EVENT_CONFIG;
const seconds = ms => Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
const clock = ms => {
  const total = seconds(ms);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export class RandomEventBridge {
  constructor(scene) {
    this.scene = scene;
    this.flags = resolveRandomEventFlags();
    this.director = new RandomEventDirector(scene.worldModel.config.seed, this.flags);
    this.view = new RandomEventWorldView(scene);
    this.activeRuntime = new RandomEventActiveRuntime(scene, this.director, this.view);
    this.jackpot = new SleepingJackpotBridge(scene, this.director, this.flags);
    this._lastResources = scene.digSystem?.getResourceTotals?.() || {};
    this._forcedType = null;
    this._installDebugApi();
  }

  loadSaveData(data) {
    const needsMigrationSave = Boolean(data) && Number(data?.version || 0) < cfg.version;
    const hadSerializedActive = Boolean(data?.active);
    this.director.loadSaveData(data);
    const restored = this.director.state.active;
    if (restored && !this._featureEnabled(restored.type)) {
      this.director.finish({ interrupted: true });
      this.scene.queueDugTilesSave?.();
    } else if (needsMigrationSave || (hadSerializedActive && !restored)) {
      this.scene.queueDugTilesSave?.();
    }
    this.jackpot.reconcileAfterLoad();
    const active = this.director.state.active;
    if (active?.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) this._replayChoir(active);
    this._lastResources = this.scene.digSystem?.getResourceTotals?.() || {};
    return this.getSaveData();
  }

  getSaveData() { return this.director.getSaveData(); }
  getSnapshot() { return { flags: { ...this.flags }, ...this.director.getSnapshot() }; }

  update(time, delta, playerTile, { pauseTimer: blockedByUi = false } = {}) {
    if (!this.flags.master || !playerTile) {
      this._clearPresentation();
      return;
    }
    this.jackpot.update(time);
    this._trackResourceGains();
    const safe = this._isMajorHazardSafe(time);
    const active = this.director.state.active;
    if (active) {
      this.director.setSuspended(!safe);
      if (!safe) {
        this._clearPresentation();
        return;
      }
      const tick = this.director.tick(delta, { pauseTimer: blockedByUi });
      if (tick.expired && this.director.state.active) this._expireActive();
      this._updateActive(time, playerTile);
      this._syncPresentation(time, playerTile);
      return;
    }

    this._clearPresentation();
    const tick = this.director.tick(delta);
    if (!tick.ready || !safe || blockedByUi) return;
    const { plans = {}, depth = 0 } = buildRandomEventPlans(this.scene, playerTile, this.director);
    const eligible = Object.entries(plans)
      .filter(([type, plan]) => plan && this._featureEnabled(type))
      .map(([type]) => type);
    const type = this._forcedType && eligible.includes(this._forcedType)
      ? this._forcedType
      : this.director.chooseNextType(eligible);
    this._forcedType = null;
    if (!type) {
      this.director.setRetryCooldown();
      return;
    }
    const payload = { ...plans[type], startedDepth: depth };
    if (type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) {
      payload.targetResource = this.director.selectRushTarget(this._lastResources)
        || MONEY_MONSTER_RESOURCE_KEYS[(this.director.state.serial + depth) % MONEY_MONSTER_RESOURCE_KEYS.length];
    }
    const started = this.director.start(type, payload);
    if (started) {
      this._announceStart(started);
      this.scene.queueDugTilesSave?.();
      this._syncPresentation(time, playerTile);
    }
  }

  _featureEnabled(type) {
    if (type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) return this.flags.crystalChoir;
    if (type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) return this.flags.blackoutBloom;
    if (type === RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH) return this.flags.moneyMonsterRush;
    return false;
  }

  _updateActive(time, playerTile) { return this.activeRuntime.updateActive(time, playerTile); }
  shouldProtectMineTarget(tile) { return this.activeRuntime.shouldProtectMineTarget(tile); }
  shouldConsumeMineTarget(tile) { return this.activeRuntime.shouldConsumeMineTarget(tile); }
  handleMineContact(tile) { return this.activeRuntime.handleMineContact(tile); }
  _cancelChoirReplay() { return this.activeRuntime.cancelChoirReplay(); }
  _replayChoir(active) { return this.activeRuntime.replayChoir(active); }
  getInteractionDistance(playerTile) { return this.activeRuntime.getInteractionDistance(playerTile); }
  handleInteract() { return this.activeRuntime.handleInteract(); }
  _expireActive() { return this.activeRuntime.expire(); }
  _finishActive(options = {}) { return this.activeRuntime.finish(options); }

  _announceStart(active) {
    if (active.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) {
      this.scene.uiNotifications?.info?.(cfg.copy.choirRibbon, { key: "choir-start", priority: 4 });
      this._replayChoir(active);
    } else if (active.type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) {
      this.scene.uiNotifications?.warning?.(cfg.copy.blackoutRibbon, { key: "blackout-start", priority: 6 });
    } else if (active.type === RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH) {
      this.scene.uiNotifications?.success?.(
        cfg.copy.rushStart(getResourceDisplayName(active.targetResource), seconds(active.remainingMs)),
        { key: "money-rush-start", priority: 6 },
      );
    }
  }

  _syncPresentation(time, playerTile) {
    const active = this.director.state.active;
    return this.activeRuntime.syncPresentation(time, playerTile, active ? this._communication(active) : null);
  }

  _communication(active) {
    if (active.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) {
      const completed = new Set(active.sequence.slice(0, active.progress));
      const current = active.sequence[active.progress];
      const states = active.anchors.map((_, index) => (
        completed.has(index) ? "◆" : (index === current ? "◉" : "◇")
      )).join("");
      return {
        title: cfg.copy.choirRibbon,
        detail: `${states}  •  STRIKE, DO NOT BREAK`,
      };
    }
    if (active.type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) return {
      title: cfg.copy.blackoutRibbon,
      detail: `${active.progress}/${cfg.blackoutBloom.anchorCount} BLOOMS  •  ${seconds(active.remainingMs)}S`,
    };
    return {
      title: `RUSH ORDER  •  ${getResourceDisplayName(active.targetResource).toUpperCase()} ×${cfg.moneyMonsterRush.multiplier}`,
      detail: `${clock(active.remainingMs)} ACTIVE PLAY  •  TIMER PAUSES IN SHOP`,
    };
  }

  _isMajorHazardSafe(now) {
    const quake = this.scene.earthquakeSystem?.getStatus?.();
    if (quake && (quake.state !== "idle" || quake.caveIns || quake.fallingRocks || quake.chainPending || quake.rubbleQueue)) return false;
    const wurmPhase = this.scene.graveborerWurmSystem?.phase;
    if (wurmPhase === "warning" || wurmPhase === "burrowing") return false;
    if (this.scene.arcCoreVehicleSystem?.isActive?.() || this.scene.thunderStrikeActionRuntime?.animating) return false;
    const hazard = this.scene.caveHazardSystem;
    if (hazard?.lastFailureAt && now - hazard.lastFailureAt < (hazard.config?.failureCooldownMs || 0)) return false;
    return true;
  }

  _trackResourceGains() {
    const next = this.scene.digSystem?.getResourceTotals?.() || {};
    for (const key of MONEY_MONSTER_RESOURCE_KEYS) {
      if ((next[key] || 0) > (this._lastResources[key] || 0)) this.director.recordRecentResource(key);
    }
    this._lastResources = next;
  }

  getRushSnapshot() {
    const active = this.director.state.active;
    if (!this.flags.master || !this.flags.moneyMonsterRush
      || !active || active.type !== RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH || active.suspended) return null;
    return {
      id: active.id,
      targetResource: active.targetResource,
      multiplier: cfg.moneyMonsterRush.multiplier,
      remainingMs: active.remainingMs,
      bonusMoney: active.bonusMoney,
    };
  }

  quoteSaleUnit(resource, baseAdjustedPrice, merchantId) {
    const rush = this.getRushSnapshot();
    const base = roundResourceCurrency(baseAdjustedPrice);
    const quoted = rush
      && merchantId === cfg.moneyMonsterRush.merchantId
      && resource === rush.targetResource
      ? base * rush.multiplier
      : base;
    return roundResourceCurrency(quoted);
  }

  quoteCargoValue(resources, effects) {
    const baseline = getCargoSellValue(resources, effects);
    const rush = this.getRushSnapshot();
    if (!rush) return baseline;
    const base = RESOURCE_PRICES_CONFIG.basePrices[rush.targetResource] || 0;
    const adjusted = getAdjustedResourceUnitPrice(rush.targetResource, effects, base);
    const count = Math.max(0, Math.floor(resources?.[rush.targetResource] || 0));
    return roundResourceCurrency(
      baseline + adjusted * Math.max(0, rush.multiplier - 1) * count,
    );
  }

  recordRushSale(resource, count, baseAdjustedPrice, paidUnitPrice) {
    const rush = this.getRushSnapshot();
    if (!rush || resource !== rush.targetResource) return;
    this.director.addRushBonus(Math.max(0, paidUnitPrice - baseAdjustedPrice) * count);
  }

  getRushRowStatus(resource, merchantId) {
    const rush = this.getRushSnapshot();
    if (!rush || merchantId !== cfg.moneyMonsterRush.merchantId || rush.targetResource !== resource) return null;
    return `RUSH ×${rush.multiplier}  •  ${clock(rush.remainingMs)}`;
  }

  getShopHeader(merchantId) {
    const rush = this.getRushSnapshot();
    if (!rush || merchantId !== cfg.moneyMonsterRush.merchantId) return null;
    return `RUSH ORDER ACTIVE  •  ${getResourceDisplayName(rush.targetResource).toUpperCase()} ×${rush.multiplier}  •  ${clock(rush.remainingMs)} LEFT`;
  }

  getMerchantPrompt(merchantId) {
    const rush = this.getRushSnapshot();
    if (!rush || merchantId !== cfg.moneyMonsterRush.merchantId) return null;
    return `RUSH BUYER  •  ${getResourceDisplayName(rush.targetResource).toUpperCase()} ×${rush.multiplier}  •  ${clock(rush.remainingMs)}`;
  }

  getNextPromiseOverride() {
    if (!this.flags.master) return null;
    const jackpot = this.jackpot.getNextPromiseOverride();
    if (jackpot) return jackpot;
    const active = this.director.state.active;
    if (!active) return null;
    const communication = this._communication(active);
    return { promise: communication.title, detail: communication.detail };
  }

  checkJackpotMaturity(depth) { return this.jackpot.checkMaturity(depth); }
  getChestPrompt(tile) { return this.jackpot.getChestPrompt(tile); }
  handleChestInteract(tile) { return this.jackpot.handleChestInteract(tile); }

  _clearPresentation() { return this.activeRuntime.clearPresentation(); }

  resize() { this.view.resize(); this.jackpot.resize(); }

  _installDebugApi() {
    if (!this.flags.debug || typeof window === "undefined") return;
    window.__jkdRandomEvents = {
      snapshot: () => this.getSnapshot(),
      force: type => {
        if (!Object.values(RANDOM_EVENT_TYPES).includes(type)) return false;
        if (this.director.state.active) this._finishActive({ interrupted: true });
        this.director.state.cooldownMs = 0;
        this._forcedType = type;
        return true;
      },
      complete: () => Boolean(this._finishActive()),
      cancel: () => Boolean(this._finishActive({ interrupted: true })),
    };
  }

  destroy() {
    if (typeof window !== "undefined" && window.__jkdRandomEvents?.snapshot) delete window.__jkdRandomEvents;
    this.activeRuntime?.destroy();
    this.jackpot?.destroy();
    this.view?.destroy();
    this.activeRuntime = null;
    this.jackpot = null;
    this.view = null;
    this.scene = null;
  }
}
