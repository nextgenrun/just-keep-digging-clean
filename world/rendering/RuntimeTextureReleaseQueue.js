const POST_RENDER_EVENT = "postrender";

export class RuntimeTextureReleaseQueue {
  constructor(scene, { canRelease = () => false, release = () => {} } = {}) {
    this.scene = scene;
    this.canRelease = canRelease;
    this.release = release;
    this.pending = new Map();
    this.destroyed = false;
  }

  schedule(key, asset) {
    if (!key || this.destroyed || this.pending.has(key)) return false;
    const emitter = this.scene.game?.events || this.scene.sys?.game?.events;
    const entry = { asset, callback: null, emitter, timer: null };
    entry.callback = () => {
      if (this.pending.get(key) !== entry) return;
      this.pending.delete(key);
      if (this.destroyed || !this.canRelease(key, entry.asset)) return;
      this.release(key, entry.asset);
    };
    this.pending.set(key, entry);
    if (emitter?.once) emitter.once(POST_RENDER_EVENT, entry.callback);
    else if (this.scene.time?.delayedCall) {
      entry.timer = this.scene.time.delayedCall(0, entry.callback);
    } else entry.callback();
    return true;
  }

  cancel(key) {
    const entry = this.pending.get(key);
    if (!entry) return false;
    this.pending.delete(key);
    entry.emitter?.off?.(POST_RENDER_EVENT, entry.callback);
    entry.timer?.remove?.(false);
    return true;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const key of [...this.pending.keys()]) this.cancel(key);
  }
}
