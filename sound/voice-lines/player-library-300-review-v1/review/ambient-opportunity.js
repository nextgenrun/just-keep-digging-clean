/** Review model of an active-play ambient opportunity; not wired to gameplay. */
export class AmbientOpportunity {
  constructor(config, random = Math.random) {
    this.config = config; this.random = random; this.activeMs = 0;
    this.nextDueMs = this.draw(); this.lastResult = "not-due";
  }
  draw() { return this.config.minActiveMs + this.random() * (this.config.maxActiveMs - this.config.minActiveMs); }
  advance(deltaMs, context = {}) {
    if (context.gameplay !== false && context.visible !== false && !context.paused) this.activeMs += Math.max(0,deltaMs);
    if (this.activeMs > this.nextDueMs + this.config.eligibleWindowMs) {
      this.nextDueMs = this.activeMs + this.draw();
      return this.lastResult = "missed-window-no-backlog";
    }
    if (this.activeMs < this.nextDueMs) return this.lastResult = "not-due";
    if (context.paused || context.gameplay === false || context.visible === false) return this.lastResult = "held-inactive";
    if (context.npcDialogue || context.narration || context.speechBusy) return this.lastResult = "held-other-voice";
    if (context.danger) return this.lastResult = "held-danger";
    if (context.pendingEvent) return this.lastResult = "held-event";
    if ((context.quietMs ?? Infinity) < this.config.quietBeforeMs
      || (context.sincePlayerMs ?? Infinity) < this.config.minimumAfterAnyPlayerMs) return this.lastResult = "held-quiet-gap";
    return this.lastResult = "eligible";
  }
  markStarted() {
    this.nextDueMs = this.activeMs + this.draw();
    this.lastResult = "started";
  }
  snapshot() { return {activeMs:this.activeMs,nextDueMs:this.nextDueMs,remainingMs:Math.max(0,this.nextDueMs-this.activeMs),result:this.lastResult}; }
}
