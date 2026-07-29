const POST_RENDER_EVENT = "postrender";

export class TitanChamberTextureReleases {
  constructor(
    scene,
    {
      canRelease = () => false,
      release = () => {},
      onChanged = null,
    } = {}
  ) {
    this.scene = scene;
    this.canRelease = canRelease;
    this.release = release;
    this.onChanged = onChanged;
    this.pending = new Map();
    this.destroyed = false;
  }

  get size() {
    return this.pending.size;
  }

  schedule(record) {
    const key = record?.asset?.key;
    if (!key || this.destroyed || this.pending.has(key)) return false;
    const emitter = this.scene.game?.events || this.scene.sys?.game?.events;
    const pendingRelease = {
      callback: null,
      emitter,
      timer: null,
    };
    const finish = () => {
      if (this.pending.get(key) !== pendingRelease) return;
      this.pending.delete(key);
      if (this.destroyed || !this.canRelease(record)) return;
      this.release(record);
      this.onChanged?.();
    };
    pendingRelease.callback = finish;
    this.pending.set(key, pendingRelease);
    if (emitter?.once) {
      emitter.once(POST_RENDER_EVENT, finish);
    } else if (this.scene.time?.delayedCall) {
      pendingRelease.timer = this.scene.time.delayedCall(0, finish);
    } else {
      finish();
    }
    return true;
  }

  cancel(record) {
    const key = record?.asset?.key;
    const pendingRelease = this.pending.get(key);
    if (!pendingRelease) return false;
    this.pending.delete(key);
    pendingRelease.emitter?.off?.(
      POST_RENDER_EVENT,
      pendingRelease.callback
    );
    pendingRelease.timer?.remove?.(false);
    return true;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const [key, pendingRelease] of this.pending.entries()) {
      pendingRelease.emitter?.off?.(
        POST_RENDER_EVENT,
        pendingRelease.callback
      );
      pendingRelease.timer?.remove?.(false);
      this.pending.delete(key);
    }
  }
}
