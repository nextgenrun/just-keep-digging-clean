import { AUDIO_RUNTIME_LOADING } from "../values/audioConfig.js";

export class RuntimeAudioLoadQueue {
  constructor(scene, config = AUDIO_RUNTIME_LOADING, dependencies = {}) {
    this.scene = scene;
    this.config = config;
    this.waitForSafeWindow = dependencies.waitForSafeWindow || null;
    this.requestIdle = dependencies.requestIdle
      || globalThis.requestIdleCallback?.bind(globalThis)
      || null;
    this.records = new Map();
    this.queue = [];
    this.active = null;
    this.subscriberSequence = 0;
    this.destroyed = false;
  }

  request(asset, { onStart = null, onReady = null, onError = null } = {}) {
    if (this.destroyed || !asset?.key || !asset?.path) return null;
    if (this._exists(asset.key)) {
      onStart?.(asset);
      onReady?.(asset);
      return { cancel: () => false };
    }

    let record = this.records.get(asset.key);
    if (!record) {
      record = {
        asset,
        subscribers: new Map(),
        complete: null,
        error: null,
      };
      this.records.set(asset.key, record);
      this.queue.push(record);
    }
    const subscriberId = this.subscriberSequence += 1;
    record.subscribers.set(subscriberId, { onStart, onReady, onError });
    this._pump();
    return {
      cancel: () => this._cancel(record, subscriberId),
    };
  }

  _cancel(record, subscriberId) {
    if (!record?.subscribers.delete(subscriberId)) return false;
    if (record.subscribers.size === 0 && record !== this.active) {
      this.queue = this.queue.filter(candidate => candidate !== record);
      this.records.delete(record.asset.key);
    }
    return true;
  }

  async _pump() {
    if (this.destroyed || this.active) return;
    let record = this.queue.shift();
    while (record && record.subscribers.size === 0) {
      this.records.delete(record.asset.key);
      record = this.queue.shift();
    }
    if (!record) return;
    this.active = record;
    for (const subscriber of record.subscribers.values()) {
      subscriber.onStart?.(record.asset);
    }

    try {
      await this._waitForSafeWindow();
      if (!this._isCurrent(record) || record.subscribers.size === 0) {
        this._finish(record, null, true);
        return;
      }
      if (this._exists(record.asset.key)) {
        this._finish(record);
        return;
      }
      this._startLoaderRecord(record);
    } catch (error) {
      if (this._isCurrent(record)) this._finish(record, error);
    }
  }

  async _waitForSafeWindow() {
    if (this.waitForSafeWindow) {
      await this.waitForSafeWindow();
      return;
    }
    await this._waitForLoaderIdle();
    await this._waitForRenderedFrames(this.config.fallbackQueue.framesBeforeLoad);
    await this._waitForIdle();
    await this._waitForLoaderIdle();
  }

  _waitForLoaderIdle() {
    const loader = this.scene.load;
    if (this.destroyed || !loader?.isLoading?.()) return Promise.resolve();
    return new Promise(resolve => {
      const onComplete = () => {
        if (this.destroyed || !loader.isLoading?.()) {
          loader.off?.(this.config.fallbackQueue.completeEvent, onComplete);
          resolve();
          return;
        }
        loader.once?.(this.config.fallbackQueue.completeEvent, onComplete);
      };
      loader.once?.(this.config.fallbackQueue.completeEvent, onComplete);
    });
  }

  _waitForRenderedFrames(count) {
    const emitter = this.scene.game?.events;
    if (this.destroyed || count <= 0 || !emitter?.once) return Promise.resolve();
    return new Promise(resolve => {
      let remaining = count;
      const onRender = () => {
        remaining -= 1;
        if (this.destroyed || remaining <= 0) {
          resolve();
          return;
        }
        emitter.once(this.config.fallbackQueue.postRenderEvent, onRender);
      };
      emitter.once(this.config.fallbackQueue.postRenderEvent, onRender);
    });
  }

  _waitForIdle() {
    if (this.destroyed || !this.requestIdle) return Promise.resolve();
    return new Promise(resolve => {
      this.requestIdle(resolve, {
        timeout: this.config.fallbackQueue.idleTimeoutMs,
      });
    });
  }

  _startLoaderRecord(record) {
    const loader = this.scene.load;
    if (!loader?.audio) {
      this._finish(record, new Error(`Audio loader unavailable: ${record.asset.key}`));
      return;
    }
    const eventName = `filecomplete-audio-${record.asset.key}`;
    record.complete = () => {
      this._clearLoaderListeners(record, eventName);
      if (this._exists(record.asset.key)) this._finish(record);
      else this._finish(record, new Error(`Audio was not cached: ${record.asset.key}`));
    };
    record.error = file => {
      if (file?.key !== record.asset.key) return;
      this._clearLoaderListeners(record, eventName);
      this._finish(record, file || new Error(`Audio failed: ${record.asset.key}`));
    };
    loader.once?.(eventName, record.complete);
    loader.on?.(this.config.fallbackQueue.errorEvent, record.error);
    loader.audio(record.asset.key, record.asset.path);
    if (!loader.isLoading?.()) loader.start?.();
  }

  _clearLoaderListeners(record, eventName) {
    const loader = this.scene.load;
    loader?.off?.(eventName, record.complete);
    loader?.off?.(this.config.fallbackQueue.errorEvent, record.error);
    record.complete = null;
    record.error = null;
  }

  _finish(record, error = null, cancelled = false) {
    if (!record || !this.records.has(record.asset.key)) return;
    const eventName = `filecomplete-audio-${record.asset.key}`;
    this._clearLoaderListeners(record, eventName);
    this.records.delete(record.asset.key);
    if (this.active === record) this.active = null;
    for (const subscriber of record.subscribers.values()) {
      if (cancelled) continue;
      if (error) subscriber.onError?.(record.asset, error);
      else subscriber.onReady?.(record.asset);
    }
    record.subscribers.clear();
    queueMicrotask(() => this._pump());
  }

  _exists(key) {
    return Boolean(this.scene.cache?.audio?.exists?.(key));
  }

  _isCurrent(record) {
    return !this.destroyed
      && this.active === record
      && this.records.get(record.asset.key) === record;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.active) {
      this._clearLoaderListeners(
        this.active,
        `filecomplete-audio-${this.active.asset.key}`,
      );
    }
    this.queue.length = 0;
    this.records.clear();
    this.active = null;
  }
}
