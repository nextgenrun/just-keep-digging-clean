import { MERCHANT_MOTION_CONFIG as C } from '../../values/merchantMotion.js';
import { MERCHANT_ACTIVITY_MOTION as A } from '../../values/merchantActivityMotion.js';
import { NPC_ACTIVITY_CONFIG } from '../../values/npcActivityConfig.js';
import { smooth } from './merchantMotionMath.js';
import { sampleMerchantActivityBlend } from './merchantActivityMotion.js';

// Only gameplay time advances activities, their release, or the shop-opening beat.
export class MerchantMotionPlayback {
  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    this.durationMs = C.actionDuration * C.millisecondsPerSecond;
    this.elapsedMs = 0;
    this._reset();
  }
  _reset() {
    this.activityId = null;
    this.actionElapsedMs = -1;
    this.settleElapsedMs = -1;
    this.shopElapsedMs = -1;
    this.shopStartBlend = 0;
    this.settleBlend = 0;
    this.strength = 1;
  }
  startGesture(activityId = null, durationMs = C.actionDuration * C.millisecondsPerSecond) {
    this._reset();
    this.durationMs = durationMs;
    if (this.reducedMotion) return;
    this.activityId = activityId;
    this.actionElapsedMs = 0;
  }
  startShopIntro(activityId, durationMs) {
    if (this.reducedMotion) return false;
    const visibleBlend = this.activityBlend;
    // A merchant already holding a pose acknowledges us from that pose.
    if (!this.activityId || this.actionElapsedMs < 0) this.startGesture(activityId, durationMs);
    this.shopStartBlend = visibleBlend;
    this.shopElapsedMs = 0;
    this.settleElapsedMs = -1;
    this.strength = 1;
    this.durationMs = Math.max(this.durationMs, this.actionElapsedMs + A.shopIntroMs + A.settleMs);
    return true;
  }
  settle() {
    if (this.actionElapsedMs >= 0 && this.settleElapsedMs < 0) {
      this.settleBlend = this.activityBlend;
      this.settleElapsedMs = 0;
    }
  }
  advance(delta) {
    const step = Math.min(Math.max(delta || 0, 0), NPC_ACTIVITY_CONFIG.performance.maxDeltaMs);
    this.elapsedMs += step;
    if (this.actionElapsedMs < 0) return;
    this.actionElapsedMs += step;
    if (this.shopElapsedMs >= 0) this.shopElapsedMs = Math.min(A.shopIntroMs, this.shopElapsedMs + step);
    if (this.settleElapsedMs >= 0) {
      this.settleElapsedMs += step;
      const releaseMs = this.activityId ? A.settleMs : NPC_ACTIVITY_CONFIG.render.crossfadeOutMs;
      this.strength = 1 - smooth(0, releaseMs, this.settleElapsedMs);
    }
    if (this.actionElapsedMs >= this.durationMs || this.strength <= 0) this._reset();
  }
  get activityBlend() {
    if (!this.activityId || this.actionElapsedMs < 0) return 0;
    if (this.settleElapsedMs >= 0) return this.settleBlend * this.strength;
    if (this.shopElapsedMs >= 0) return this.shopStartBlend + (1 - this.shopStartBlend)
      * smooth(A.shopAnticipationMs, A.shopAnticipationMs + A.shopFadeInMs, this.shopElapsedMs);
    return sampleMerchantActivityBlend(this.actionElapsedMs, this.durationMs);
  }
  get activity() { return { id: this.activityId, blend: this.activityBlend, shopTime: this.shopElapsedMs < 0 ? -1 : this.shopElapsedMs / C.millisecondsPerSecond }; }
  get isSettling() { return this.settleElapsedMs >= 0; }
  get time() { return this.elapsedMs / C.millisecondsPerSecond; }
  get actionTime() { return this.actionElapsedMs < 0 ? -1 : this.actionElapsedMs / C.millisecondsPerSecond; }
}
