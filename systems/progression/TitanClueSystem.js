import {
  TITAN_CLUE_CATALOG_CONFIG,
  calculateTitanClueCost,
  getTitanClueJournalIndex,
  getTitanClueJournalKey,
  resolveTitanCluesEnabled,
} from "../../values/titanClueCatalog.js";
import { TITAN_DEFINITIONS } from "../../values/titanDiscoveries.js";

export class TitanClueSystem {
  constructor(options = {}, config = TITAN_CLUE_CATALOG_CONFIG) {
    this.config = config;
    this.enabled = resolveTitanCluesEnabled(config);
    this.retention = options.retention || null;
    this.wallet = options.wallet || null;
    this.onStateChanged = options.onStateChanged || null;
    this.definitions = options.definitions || TITAN_DEFINITIONS;
    this.definitionById = new Map(
      this.definitions.map(definition => [definition.id, definition])
    );
    this.definitionByIndex = new Map(
      this.definitions.map(definition => [definition.index, definition])
    );
    this.activeTitanId = null;
  }

  _getJournalEntries() {
    return this.retention
      ?.getJournalSnapshot?.()
      ?.discoveries
      ?.journal || [];
  }

  getPurchasedClueIds() {
    const seen = new Set();
    const ids = [];
    for (const key of this._getJournalEntries()) {
      const index = getTitanClueJournalIndex(key, this.config);
      const definition = this.definitionByIndex.get(index);
      if (!definition || seen.has(definition.id)) continue;
      seen.add(definition.id);
      ids.push(definition.id);
    }
    return ids;
  }

  hasPurchasedClue(titanId) {
    return this.getPurchasedClueIds().includes(titanId);
  }

  _isDiscovered(titanId) {
    return this.retention?.hasDiscoveredTitan?.(titanId) === true;
  }

  getActiveClueId() {
    if (!this.enabled) return null;
    const available = this.getPurchasedClueIds().filter(
      titanId => !this._isDiscovered(titanId)
    );
    if (available.includes(this.activeTitanId)) return this.activeTitanId;
    this.activeTitanId = available[available.length - 1] || null;
    return this.activeTitanId;
  }

  getClueState(titanId) {
    const definition = this.definitionById.get(titanId) || null;
    const purchasedIds = this.getPurchasedClueIds();
    const purchased = purchasedIds.includes(titanId);
    const discovered = definition ? this._isDiscovered(titanId) : false;
    const walletMoney = Math.max(
      0,
      Number(this.wallet?.getMoney?.()) || 0
    );
    const cost = definition
      ? calculateTitanClueCost(definition, purchasedIds.length, this.config)
      : 0;
    return {
      enabled: this.enabled,
      definition,
      purchased,
      discovered,
      active: purchased && this.getActiveClueId() === titanId,
      purchasedCount: purchasedIds.length,
      cost,
      walletMoney,
      canAfford: Boolean(
        this.enabled
        && definition
        && !purchased
        && !discovered
        && walletMoney >= cost
      ),
    };
  }

  purchaseClue(titanId) {
    const results = this.config.results;
    if (!this.enabled) return { success: false, reason: results.disabled };
    const state = this.getClueState(titanId);
    if (!state.definition) {
      return { success: false, reason: results.unknownTitan };
    }
    if (state.discovered) {
      return { success: false, reason: results.alreadyDiscovered };
    }
    if (state.purchased) {
      this.activeTitanId = titanId;
      return {
        success: true,
        purchased: false,
        reason: results.tracked,
        titanId,
      };
    }
    if (!this.retention?.discoverJournal || !this.wallet?.spendMoney) {
      return { success: false, reason: results.unavailable };
    }
    if (!state.canAfford || !this.wallet.spendMoney(state.cost)) {
      return {
        success: false,
        reason: results.notEnoughMoney,
        needed: Math.max(0, state.cost - state.walletMoney),
        cost: state.cost,
      };
    }

    const walletBefore = state.walletMoney;
    const journalKey = getTitanClueJournalKey(state.definition, this.config);
    const persisted = this.retention.discoverJournal(
      journalKey,
      `${this.config.copy.journalEntryPrefix} #${state.definition.index}`
    );
    if (!persisted) {
      if (this.wallet?.setMoney) this.wallet.setMoney(walletBefore);
      else this.wallet?.addMoney?.(state.cost);
      return { success: false, reason: results.unavailable };
    }

    this.activeTitanId = titanId;
    this.onStateChanged?.(this.getSnapshot());
    return {
      success: true,
      purchased: true,
      reason: results.purchased,
      titanId,
      cost: state.cost,
      walletMoney: this.wallet.getMoney?.() || 0,
    };
  }

  trackClue(titanId) {
    const results = this.config.results;
    if (
      !this.enabled
      || !this.hasPurchasedClue(titanId)
      || this._isDiscovered(titanId)
    ) {
      return { success: false, reason: results.unavailable };
    }
    this.activeTitanId = titanId;
    return {
      success: true,
      purchased: false,
      reason: results.tracked,
      titanId,
    };
  }

  completeClue(titanId) {
    if (this.activeTitanId !== titanId) return false;
    this.activeTitanId = null;
    return true;
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      purchased: this.getPurchasedClueIds(),
      active: this.getActiveClueId(),
    };
  }

  destroy() {
    this.activeTitanId = null;
    this.retention = null;
    this.wallet = null;
    this.onStateChanged = null;
  }
}
