import { SleepingJackpotModalOverlay } from "../../ui/overlays/SleepingJackpotModalOverlay.js";
import { RANDOM_WORLD_EVENT_CONFIG } from "../../values/randomWorldEvents.js";
import { createZeroResourceTotals } from "../../values/resourceTypes.js";
import { SleepingJackpotWorldSupport } from "./SleepingJackpotWorldSupport.js";
import {
  buildSleepingJackpotQuote,
  createSealedJackpotRecord,
  formatJackpotResourceChanges,
  isSleepingJackpotCandidate,
  resolveJackpotResources,
  summarizeJackpotEscrow,
} from "../../systems/events/SleepingJackpotRules.js";
import { JackpotSaveTransaction } from "../../systems/events/JackpotSaveTransaction.js";

const cfg = RANDOM_WORLD_EVENT_CONFIG.sleepingJackpot;
const formatMoney = value => `${Math.floor(Number(value) || 0).toLocaleString()} M`;

export class SleepingJackpotBridge {
  constructor(scene, director, flags) {
    this.scene = scene;
    this.director = director;
    this.flags = flags;
    this.modal = new SleepingJackpotModalOverlay(scene);
    this.transaction = new JackpotSaveTransaction(scene, director);
    this.worldSupport = new SleepingJackpotWorldSupport(scene, director, flags);
    this.resolving = false;
  }

  get record() { return this.director.state.sleepingJackpot; }

  reconcileAfterLoad() { return this.worldSupport.reconcileAfterLoad(); }

  getChestPrompt(tile) {
    if (!tile) return null;
    const record = this.record;
    if (!this.flags.master) {
      return record?.chest?.key === tile.key ? "JACKPOT PAUSED  •  RE-ENABLE RANDOM EVENTS" : null;
    }
    if (record?.chest?.key === tile.key) {
      this._showCue(record.chest, record.phase);
      return record.phase === "awake"
        ? RANDOM_WORLD_EVENT_CONFIG.copy.awakePrompt
        : RANDOM_WORLD_EVENT_CONFIG.copy.sealedPrompt(record.targetDepth);
    }
    if (record || !this._isEligibleCandidate(tile)) return null;
    this._showCue(tile, "candidate");
    return RANDOM_WORLD_EVENT_CONFIG.copy.sleepingPrompt;
  }

  handleChestInteract(tile) {
    if (!tile || this.resolving) return null;
    const record = this.record;
    if (!this.flags.master) {
      const paused = record?.chest?.key === tile.key;
      if (paused) this.scene.uiNotifications?.info?.(
        "JACKPOT PAUSED BY ROLLBACK  •  CHEST KEPT SAFE",
        { key: "sleeping-jackpot-paused", priority: 6 },
      );
      return paused ? { success: true, type: "sleepingJackpotPaused" } : null;
    }
    if (record?.chest?.key === tile.key) {
      if (record.phase === "sealed") {
        this.scene.uiNotifications?.info?.(
          `SLEEPING JACKPOT  •  ${Math.max(0, record.targetDepth - this._currentDepth())}M TO MATURITY`,
          { key: "sleeping-jackpot-sealed", priority: 4 },
        );
        return { success: true, type: "sleepingJackpotSealed" };
      }
      this._resolveAwake(record);
      return { success: true, type: "sleepingJackpotAwake" };
    }
    if (record || !this._isEligibleCandidate(tile)) return null;
    const quote = this._buildQuote(tile);
    this.modal.showChoice({
      quote,
      onCancel: () => this._syncCueFromRecord(),
      onConfirm: choice => this._commitChoice(tile, quote, choice),
    });
    return { success: true, type: "sleepingJackpotChoice" };
  }

  _isEligibleCandidate(tile) {
    const seed = this.scene.worldModel.config.seed;
    if (!isSleepingJackpotCandidate(tile, seed)) return false;
    const quote = this._buildQuote(tile);
    if (!quote.maturity.targetDepth) return false;
    return quote.immediate.enabled || quote.maturity.enabled;
  }

  _buildQuote(tile) {
    const targetDepth = this.scene.milestoneBoardSystem?.getNextMilestone?.()?.depth;
    return buildSleepingJackpotQuote({
      tile,
      wallet: this.scene.upgradeSystem?.getMoney?.() || 0,
      resources: this.scene.digSystem?.getResourceTotals?.() || {},
      targetDepth,
      seed: this.scene.worldModel.config.seed,
    });
  }

  async _commitChoice(tile, quote, choice) {
    if (choice === "maturity") return this._commitMaturity(tile, quote.maturity);
    return this._commitImmediate(tile, quote.immediate);
  }

  async _commitImmediate(tile, quote) {
    const before = Math.floor(this.scene.upgradeSystem?.getMoney?.() || 0);
    if (!quote.enabled || before < quote.wager) throw new Error("WALLET CHANGED — REOPEN THE JACKPOT");
    const after = quote.outcome === "win"
      ? before + quote.possibleGain
      : before - quote.wager;
    if (!Number.isSafeInteger(after) || after < 0) throw new Error("RESULT WOULD EXCEED SAFE WALLET BOUNDS");
    const snapshot = this.transaction.capture({ chest: tile });
    const consumed = this.scene.specialTileSystem?.consumeChestForEvent?.(tile);
    if (!consumed?.success) throw new Error("THE JACKPOT CHEST IS NO LONGER AVAILABLE");
    this.scene.upgradeSystem.setMoney(after);
    this.scene.retentionProgressSystem?.recordChest?.({ money: 0, star: false });
    this.scene.journeySystem?.recordJackpot?.({
      phase: "gamble",
      chestDepth: tile.depth,
      targetDepth: tile.depth,
      oddsBps: quote.oddsBps,
      outcomeSeed: quote.outcomeSeed,
      source: tile.key,
      detail: quote.outcome === "win"
        ? `Wager ${formatMoney(quote.wager)}; gained ${formatMoney(quote.possibleGain)}.`
        : `Lost wager ${formatMoney(quote.wager)}.`,
    });
    await this.transaction.commit(snapshot);
    this._clearCue();
    this.scene.soundSystem?.playSfx?.(quote.outcome === "win" ? "reward" : "mine-hit");
    return {
      title: quote.outcome === "win" ? "JACKPOT WON" : "JACKPOT LOST",
      kind: quote.outcome === "win" ? "success" : "danger",
      body: [
        `WAGER  ${formatMoney(quote.wager)}`,
        quote.outcome === "win"
          ? `GAIN  +${formatMoney(quote.possibleGain)}`
          : `LOSS  −${formatMoney(quote.wager)}`,
        `NEW WALLET  ${formatMoney(after)}`,
        `COMMITTED ODDS  ${(quote.oddsBps / 100).toFixed(0)}%`,
      ].join("\n"),
    };
  }

  async _commitMaturity(tile, quote) {
    if (!quote.enabled) throw new Error(quote.reason || "MATURITY IS UNAVAILABLE");
    const current = this.scene.digSystem?.getResourceTotals?.() || {};
    const changed = Object.keys(quote.escrow).some(key => current[key] !== quote.escrow[key]);
    if (changed) throw new Error("INVENTORY CHANGED — REOPEN THE JACKPOT");
    const record = createSealedJackpotRecord({
      ...tile,
      depth: Math.max(0, tile.ty - this.scene.config.topAirRows + 1),
    }, quote, Date.now());
    const snapshot = this.transaction.capture();
    this.scene.digSystem.setResourceTotals(createZeroResourceTotals());
    this.director.setSleepingJackpot(record);
    this.scene.journeySystem?.recordJackpot?.({
      phase: "sealed",
      chestDepth: record.chest.depth,
      targetDepth: record.targetDepth,
      oddsBps: record.oddsBps,
      source: record.chest.key,
      outcomeSeed: record.outcomeSeed,
      detail: `Escrow sealed: ${summarizeJackpotEscrow(record.escrow)}.`,
    });
    this.scene.uiResourceBar?.setResources?.(this.scene.digSystem.getResourceTotals());
    await this.transaction.commit(snapshot);
    this._syncCueFromRecord();
    this.scene.soundSystem?.playSfx?.("reward");
    return {
      title: "THE JACKPOT SLEEPS",
      body: [
        `ALL LISTED RESOURCES ARE SEALED UNTIL ${record.targetDepth}M.`,
        `WIN RETURNS ×${record.multiplier} EACH STAKED STACK.`,
        "LOSS DESTROYS THE SEALED STACKS.",
        "THE OUTCOME IS ALREADY COMMITTED.",
      ].join("\n\n"),
    };
  }

  checkMaturity(depth) {
    const record = this.record;
    if (!this.flags.master || !record || record.phase !== "sealed" || depth < record.targetDepth) return false;
    record.phase = "awake";
    record.awakenedAt = Date.now();
    this.director.setSleepingJackpot(record);
    this._syncCueFromRecord();
    this.scene.uiNotifications?.success?.(
      `THE JACKPOT WAKES  •  RETURN TO ${record.chest.depth}M TO REVEAL FATE`,
      { key: "sleeping-jackpot-awake", priority: 9, duration: 10000 },
    );
    this.scene.queueDugTilesSave?.();
    this.modal.showResult({
      title: "THE JACKPOT WAKES",
      body: `RETURN TO ${record.chest.depth}M AND INTERACT WITH THE GOLDEN CHEST TO REVEAL FATE.`,
    });
    return true;
  }

  async _resolveAwake(record) {
    this.resolving = true;
    this.scene._randomEventModalVisible = true;
    this.scene.uiNotifications?.setPaused?.(true);
    try {
      const resolved = resolveJackpotResources(
        this.scene.digSystem?.getResourceTotals?.() || {},
        record,
      );
      if (!resolved.success) throw new Error(resolved.reason);
      const snapshot = this.transaction.capture({ chest: record.chest });
      const consumed = this.scene.specialTileSystem?.consumeChestForEvent?.(record.chest);
      if (!consumed?.success) throw new Error("THE AWAKENED CHEST IS NO LONGER AVAILABLE");
      this.scene.digSystem.setResourceTotals(resolved.next);
      this.director.clearSleepingJackpot();
      this.scene.retentionProgressSystem?.recordChest?.({ money: 0, star: false });
      this.scene.journeySystem?.recordJackpot?.({
        phase: record.outcome,
        chestDepth: record.chest.depth,
        targetDepth: record.targetDepth,
        oddsBps: record.oddsBps,
        outcomeSeed: record.outcomeSeed,
        source: record.chest.key,
        detail: formatJackpotResourceChanges(resolved.deltas).replaceAll("\n", ", "),
      });
      this.scene.uiResourceBar?.setResources?.(resolved.next);
      await this.transaction.commit(snapshot);
      this._clearCue();
      this.scene.soundSystem?.playSfx?.(record.outcome === "win" ? "reward" : "mine-hit");
      this.modal.showResult({
        title: record.outcome === "win" ? "MATURITY JACKPOT WON" : "MATURITY JACKPOT LOST",
        kind: record.outcome === "win" ? "success" : "danger",
        body: formatJackpotResourceChanges(resolved.deltas)
          || "NO STAKED RESOURCE CHANGES",
      });
    } catch (error) {
      this.scene.uiNotifications?.danger?.(error?.message || "JACKPOT RESOLUTION FAILED", {
        key: "sleeping-jackpot-error",
        priority: 9,
      });
      this._syncCueFromRecord();
    } finally {
      this.resolving = false;
      if (!this.modal?.isVisible) {
        this.scene._randomEventModalVisible = false;
        this.scene.uiNotifications?.setPaused?.(false);
      }
    }
  }

  getNextPromiseOverride() {
    const record = this.record;
    if (!this.flags.master || !record) return null;
    if (record.phase === "awake") {
      return {
        promise: `JACKPOT AWAKE  •  RETURN TO ${record.chest.depth}M`,
        detail: `×${record.multiplier} RESOURCES OR LOSE THE SEALED STAKES`,
      };
    }
    return {
      promise: `SLEEPING JACKPOT  •  ${Math.max(0, record.targetDepth - this._currentDepth())}M TO MATURE`,
      detail: `SEALED AT ${record.chest.depth}M  •  ${Math.round(record.oddsBps / 100)}% WIN CHANCE`,
    };
  }

  update(time) { return this.worldSupport.update(time); }
  _showCue(tile, phase) { return this.worldSupport.showCue(tile, phase); }
  _syncCueFromRecord() { return this.worldSupport.syncCue(); }
  _clearCue() { return this.worldSupport.clearCue(); }

  _currentDepth() {
    const tile = this.scene.playerController?.getPlayerTile?.();
    return tile ? Math.max(0, tile.ty - this.scene.config.topAirRows + 1) : 0;
  }

  resize() { this.modal.resize(); }

  destroy() {
    this.worldSupport?.destroy();
    this.transaction?.destroy();
    this.modal?.destroy();
    this.worldSupport = null;
    this.modal = null;
    this.transaction = null;
    this.scene = null;
    this.director = null;
  }
}
