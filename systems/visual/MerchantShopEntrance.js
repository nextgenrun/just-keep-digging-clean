import { hasUiInputPriority } from '../UiInputPriorityRegistry.js';
import { MERCHANT_ACTIVITY_MOTION as A } from '../../values/merchantActivityMotion.js';
import { NPC_ACTIVITY_CONFIG } from '../../values/npcActivityConfig.js';
import { TOWN_SQUARE_CONFIG } from '../../values/townSquareConfig.js';

// One short acknowledgement owns the E press until it opens or is cancelled.
export class MerchantShopEntrance {
  constructor(manager) {
    this.manager = manager; this.scene = manager.scene; this.pending = null;
    this.completedCount = 0; this.cancelledCount = 0; this.cueCount = 0;
    this.lastOpening = null;
    this.onStateCheck = () => { if (this.pending && !this._canOpen(this.pending.npc)) this.cancel(); };
    this.scene.events?.on?.('preupdate', this.onStateCheck);
    globalThis.document?.addEventListener?.('visibilitychange', this.onStateCheck);
  }
  _canOpen(npc) {
    if (globalThis.document?.hidden || !this.manager._isMerchantAvailable(npc.merchantId)) return false;
    if (this.scene.gameState && this.scene.gameState !== 'playing') return false;
    if (hasUiInputPriority(this.scene) || this.scene.sceneModeController?.isGameplayActive === false
      || this.scene.townRestSystem?.isActive()) return false;
    const shop = this.scene.shopOverlay;
    if (shop?.isVisible || shop?.isOperational?.() !== true || typeof shop.show !== 'function') return false;
    if (this.scene.hasEscapeClosableUi?.()) return false;
    const tile = this.scene.playerController?.state?.getPlayerTile?.();
    return Boolean(tile) && Math.abs(tile.tx - npc.tx) + Math.abs(tile.ty - npc.ty) <= TOWN_SQUARE_CONFIG.merchantInteractionRangeTiles;
  }
  request(npc) {
    if (this.pending) return true;
    if (!this._canOpen(npc)) return false;
    if (!this.manager.activitySystem.beginShopIntro?.(npc.merchantId, this.manager.activityTimeMs)) return this._open(npc);
    this.pending = { npc, elapsedMs: 0, cueAttempted: false, cue: null };
    return true;
  }
  update(delta) {
    const pending = this.pending;
    if (!pending) return;
    if (!this._canOpen(pending.npc)) { this.cancel(); return; }
    pending.elapsedMs += Math.min(Math.max(delta || 0, 0), NPC_ACTIVITY_CONFIG.performance.maxDeltaMs);
    if (!pending.cueAttempted && pending.elapsedMs >= A.shopCueAtMs) {
      pending.cueAttempted = true;
      pending.cue = this.scene.soundSystem?.playMerchantWelcome?.() || null;
      if (pending.cue) this.cueCount += 1;
    }
    if (pending.elapsedMs >= A.shopIntroMs) {
      this.pending = null;
      this._open(pending.npc, pending.cue, pending.elapsedMs);
    }
  }
  _open(npc, cue = null, elapsedMs = 0) {
    const opened = this.scene.shopOverlay.show(npc.merchantId, { playOpenSound: !cue });
    this.manager.activitySystem.settleMerchant(npc.merchantId, this.manager.activityTimeMs);
    if (opened !== true) {
      if (cue) this.scene.soundSystem?.stopTrackedSfx?.(cue);
      return false;
    }
    this.completedCount += 1;
    this.lastOpening = { merchantId: npc.merchantId, elapsedMs, cuePlayed: Boolean(cue) };
    this.scene.soundSystem?.playNPCVoiceLine?.(npc.merchantId);
    return true;
  }
  cancel() {
    if (!this.pending) return;
    const pending = this.pending; this.pending = null;
    if (pending.cue) this.scene.soundSystem?.stopTrackedSfx?.(pending.cue);
    this.manager.activitySystem.settleMerchant(pending.npc.merchantId, this.manager.activityTimeMs);
    this.cancelledCount += 1;
  }
  getSnapshot() {
    return { pendingMerchant: this.pending?.npc.merchantId || null, elapsedMs: this.pending?.elapsedMs || 0,
      completedCount: this.completedCount, cancelledCount: this.cancelledCount, cueCount: this.cueCount, lastOpening: this.lastOpening };
  }
  destroy() {
    this.cancel();
    this.scene.events?.off?.('preupdate', this.onStateCheck);
    globalThis.document?.removeEventListener?.('visibilitychange', this.onStateCheck);
  }
}
