export class RuntimeAssetActivationScheduler {
  constructor(scene, config, {
    requestIdle = globalThis.requestIdleCallback?.bind(globalThis) || null,
    cancelIdle = globalThis.cancelIdleCallback?.bind(globalThis) || null,
    waitForActivation = null,
  } = {}) {
    this.scene = scene;
    this.config = config;
    this.requestIdle = requestIdle;
    this.cancelIdle = cancelIdle;
    this.waitForActivation = waitForActivation;
    this.activationTail = Promise.resolve();
    this.loaderWaiters = new Set();
    this.renderWaiters = new Set();
    this.idleWaiters = new Set();
    this.externalLoaderWaits = 0;
    this.destroyed = false;
  }

  waitForActivationWindow() {
    const scheduled = this.activationTail.then(
      () => this._waitForActivationWindow()
    );
    this.activationTail = scheduled.catch(() => {});
    return scheduled;
  }

  async _waitForActivationWindow() {
    await this.waitForLoaderIdle();
    if (this.waitForActivation) {
      await this.waitForActivation();
      return;
    }
    await this.waitForRenderedFrames(this.config.scheduling.framesBetweenActivations);
    await this.waitForIdle();
    await this.waitForLoaderIdle();
  }

  defer(callback) {
    this.waitForRenderedFrames(this.config.scheduling.framesBetweenActivations)
      .then(() => {
        if (!this.destroyed) callback();
      });
  }

  waitForLoaderIdle() {
    const loader = this.scene.load;
    if (this.destroyed || !loader?.isLoading?.()) return Promise.resolve();
    this.externalLoaderWaits += 1;
    return new Promise(resolve => {
      const waiter = {
        loader,
        resolve: () => {
          this.loaderWaiters.delete(waiter);
          resolve();
        },
        handler: null,
      };
      waiter.handler = () => {
        if (this.destroyed || !loader.isLoading?.()) {
          waiter.resolve();
          return;
        }
        loader.once?.(this.config.phaserLoader.completeEvent, waiter.handler);
      };
      this.loaderWaiters.add(waiter);
      loader.once?.(this.config.phaserLoader.completeEvent, waiter.handler);
    });
  }

  waitForRenderedFrames(count) {
    const emitter = this.scene.game?.events;
    if (this.destroyed || count <= 0 || !emitter?.once) return Promise.resolve();
    return new Promise(resolve => {
      const waiter = {
        emitter,
        remaining: count,
        resolve: () => {
          this.renderWaiters.delete(waiter);
          resolve();
        },
        handler: null,
      };
      waiter.handler = () => {
        waiter.remaining -= 1;
        if (this.destroyed || waiter.remaining <= 0) {
          waiter.resolve();
          return;
        }
        emitter.once(this.config.scheduling.postRenderEvent, waiter.handler);
      };
      this.renderWaiters.add(waiter);
      emitter.once(this.config.scheduling.postRenderEvent, waiter.handler);
    });
  }

  waitForIdle() {
    if (this.destroyed || !this.requestIdle) return Promise.resolve();
    return new Promise(resolve => {
      const waiter = {
        handle: null,
        resolve: () => {
          this.idleWaiters.delete(waiter);
          resolve();
        },
      };
      waiter.handle = this.requestIdle(
        waiter.resolve,
        { timeout: this.config.bitmapDecode.idleTimeoutMs }
      );
      this.idleWaiters.add(waiter);
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const waiter of this.loaderWaiters) {
      waiter.loader.off?.(this.config.phaserLoader.completeEvent, waiter.handler);
      waiter.resolve();
    }
    for (const waiter of this.renderWaiters) {
      waiter.emitter.off?.(this.config.scheduling.postRenderEvent, waiter.handler);
      waiter.resolve();
    }
    for (const waiter of this.idleWaiters) {
      this.cancelIdle?.(waiter.handle);
      waiter.resolve();
    }
    this.loaderWaiters.clear();
    this.renderWaiters.clear();
    this.idleWaiters.clear();
  }
}
