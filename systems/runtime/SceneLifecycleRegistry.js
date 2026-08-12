function resolveDisposer(resource, explicitDisposer) {
  if (typeof explicitDisposer === "function") return () => explicitDisposer(resource);
  if (typeof resource === "function") return resource;
  for (const method of ["dispose", "destroy", "cancel", "abort", "unsubscribe"]) {
    if (typeof resource?.[method] === "function") return () => resource[method]();
  }
  throw new TypeError("Lifecycle resources need a disposer or disposable method");
}

export class SceneLifecycleRegistry {
  constructor({ onDisposeError = null } = {}) {
    this._entries = [];
    this._disposed = false;
    this._onDisposeError = typeof onDisposeError === "function" ? onDisposeError : null;
  }

  get disposed() { return this._disposed; }
  get size() { return this._entries.length; }

  register(resource, { id = "anonymous", dispose = null } = {}) {
    if (this._disposed) throw new Error("SceneLifecycleRegistry is already disposed");
    const entry = {
      id: String(id),
      resource,
      dispose: resolveDisposer(resource, dispose),
      active: true,
    };
    this._entries.push(entry);
    return resource;
  }

  listen(target, eventName, listener, context = undefined, id = `${eventName}-listener`) {
    if (typeof target?.on !== "function" || typeof target?.off !== "function") {
      throw new TypeError("Lifecycle listener target must expose on/off");
    }
    target.on(eventName, listener, context);
    this.register(() => target.off(eventName, listener, context), { id });
    return listener;
  }

  interval(callback, delayMs, timerApi = globalThis, id = "interval") {
    const handle = timerApi.setInterval(callback, delayMs);
    this.register(() => timerApi.clearInterval(handle), { id });
    return handle;
  }

  timeout(callback, delayMs, timerApi = globalThis, id = "timeout") {
    const handle = timerApi.setTimeout(callback, delayMs);
    this.register(() => timerApi.clearTimeout(handle), { id });
    return handle;
  }

  disposeOne(resource) {
    const entry = this._entries.find(candidate => candidate.resource === resource && candidate.active);
    if (!entry) return false;
    this._disposeEntry(entry);
    return true;
  }

  dispose() {
    if (this._disposed) return Object.freeze([]);
    this._disposed = true;
    const errors = [];
    for (let index = this._entries.length - 1; index >= 0; index -= 1) {
      const error = this._disposeEntry(this._entries[index]);
      if (error) errors.push(error);
    }
    this._entries.length = 0;
    return Object.freeze(errors);
  }

  _disposeEntry(entry) {
    if (!entry.active) return null;
    entry.active = false;
    try {
      entry.dispose();
      return null;
    } catch (error) {
      const finding = Object.freeze({ id: entry.id, error });
      this._onDisposeError?.(finding);
      return finding;
    }
  }
}
