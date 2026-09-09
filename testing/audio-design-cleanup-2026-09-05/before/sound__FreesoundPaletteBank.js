import { FREESOUND_AUDIO as CFG, FREESOUND_AUDIO_ASSETS as ASSETS } from "../values/freesoundAudio.js";

export function audioIdentityHash(value) {
  let hash = CFG.identityHashOffset;
  for (const character of String(value)) hash = Math.imul(hash ^ character.charCodeAt(0), CFG.identityHashMultiplier);
  return hash >>> 0;
}

/** Small creator/pack-matched banks, asynchronous warming, and bounded residency. */
export class FreesoundPaletteBank {
  constructor(system, config = CFG) {
    this.system = system;
    this.config = config;
    this.banks = new Map();
    this.roles = new Map();
    this.states = new Map();
    this.pending = new Map();
    this.resident = new Map();
    this.failed = new Map();
    this.destroyed = false;
    for (const asset of Object.values(ASSETS)) {
      const role = this.roles.get(asset.role) || [];
      role.push(asset);
      this.roles.set(asset.role, role);
    }
    for (const [role, assets] of this.roles) {
      const groups = new Map();
      for (const asset of assets) {
        const list = groups.get(asset.palette) || [];
        list.push(asset);
        groups.set(asset.palette, list);
      }
      const banks = [];
      const singletons = [];
      for (const group of groups.values()) {
        for (let i = 0; i < group.length; i += config.maxBankSize) {
          const chunk = group.slice(i, i + config.maxBankSize);
          if (chunk.length < config.minimumBankSize) singletons.push(...chunk);
          else banks.push(chunk);
        }
      }
      while (singletons.length) banks.push(singletons.splice(0, config.maxBankSize));
      if (banks.length > 1 && banks.at(-1).length < config.minimumBankSize) {
        const last = banks.pop();
        const host = banks.find(bank => bank.length + last.length <= config.maxBankSize);
        if (host) host.push(...last);
        else { last.push(banks.at(-1).pop()); banks.push(last); }
      }
      this.banks.set(role, banks);
    }
  }

  now() { return Number(this.system.reviewedClock?.() ?? this.system.scene.time?.now) || 0; }
  ready(asset) { return Boolean(asset && this.system.scene.cache.audio.exists(asset.key)); }

  stable(role, identity) {
    const assets = this.roles.get(role) || [];
    return assets[audioIdentityHash(identity) % assets.length] || null;
  }

  state(role, context = "default") {
    const banks = this.banks.get(role);
    if (!banks?.length) return null;
    let state = this.states.get(role);
    if (!state || state.context !== context) {
      state = { context, index: audioIdentityHash(`${role}:${context}`) % banks.length,
        cursor: 0, used: 0, since: this.now(), last: state?.last || null };
      this.states.set(role, state);
    }
    if (state.used >= this.config.bankUsesBeforeRotation && this.now() - state.since >= this.config.bankHoldMs) {
      state.index = (state.index + 1) % banks.length;
      state.used = 0;
      state.since = this.now();
      state.cursor = 0;
    }
    return { state, bank: banks[state.index] };
  }

  warmRole(role, context = "default") {
    const current = this.state(role, context);
    if (!current) return;
    for (let i = 0; i < Math.min(this.config.warmAhead, current.bank.length); i++) {
      this.warm(current.bank[(current.state.cursor + i) % current.bank.length]);
    }
  }

  pick(role, context = "default") {
    const current = this.state(role, context);
    if (!current) return null;
    const { state, bank } = current;
    this.warmRole(role, context);
    for (let i = 0; i < bank.length; i++) {
      const cursor = (state.cursor + i) % bank.length;
      const asset = bank[cursor];
      if (!this.ready(asset) || (asset.id === state.last && bank.length > 1)) continue;
      state.last = asset.id;
      state.cursor = (cursor + 1) % bank.length;
      state.used++;
      this.touch(asset);
      return asset;
    }
    return null;
  }

  warm(asset) {
    if (this.destroyed || !asset) return;
    if (this.ready(asset)) { this.touch(asset); return; }
    if (this.pending.has(asset.key) || this.pending.size >= this.config.maxPending
      || this.now() - (this.failed.get(asset.key) ?? -Infinity) < this.config.failedRetryMs) return;
    this.pending.set(asset.key, null);
    const finish = error => {
      this.pending.delete(asset.key);
      if (this.destroyed) return;
      if (error) this.failed.set(asset.key, this.now());
      else this.touch(asset);
    };
    const manager = this.system.reviewedAssetManager || this.system.runtimeAudioAssetManager;
    const handle = manager.ensure(asset, { onReady: () => finish(false), onError: () => finish(true) });
    if (this.pending.has(asset.key)) {
      if (handle) this.pending.set(asset.key, handle);
      else this.pending.delete(asset.key);
    }
  }

  touch(asset) {
    this.resident.delete(asset.key);
    this.resident.set(asset.key, asset);
  }

  trim(extraProtected = []) {
    const playing = this.system.scene.sound.sounds || [];
    const protectedKeys = new Set([...extraProtected,
      ...playing.filter(sound => sound.isPlaying || sound.isPaused).map(sound => sound.key)]);
    for (const [key, asset] of this.resident) if (!this.ready(asset)) this.resident.delete(key);
    let bytes = this.decodedBytes();
    for (const [key, asset] of this.resident) {
      if (this.resident.size <= this.config.maxResident && bytes <= this.config.maxDecodedBytes) break;
      if (protectedKeys.has(key) || this.pending.has(key)) continue;
      this.system.scene.cache.audio.remove?.(key);
      this.resident.delete(key);
      bytes -= this.bytes(asset);
    }
  }

  bytes(asset) { return asset.duration * asset.channels * this.config.sampleRate * this.config.sampleBytes; }
  decodedBytes() { return [...this.resident.values()].reduce((sum, asset) => sum + this.bytes(asset), 0); }
  cancel() { for (const handle of this.pending.values()) handle?.cancel?.(); this.pending.clear(); }
  snapshot() { return { resident: this.resident.size, decodedBytes: Math.round(this.decodedBytes()), pending: this.pending.size, failed: [...this.failed.keys()] }; }
  destroy() {
    this.destroyed = true;
    this.cancel();
    const playing = new Set((this.system.scene.sound.sounds || []).filter(sound => sound.isPlaying || sound.isPaused).map(sound => sound.key));
    for (const key of this.resident.keys()) if (!playing.has(key)) this.system.scene.cache.audio.remove?.(key);
    this.resident.clear();
    this.states.clear();
  }
}
