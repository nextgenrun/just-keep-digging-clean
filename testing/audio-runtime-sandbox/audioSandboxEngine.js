const dbToGain = (db) => 10 ** (db / 20);

export class AudioSandboxEngine {
  constructor(config, onUpdate = () => {}) {
    this.config = config;
    this.onUpdate = onUpdate;
    this.context = null;
    this.master = null;
    this.buses = new Map();
    this.buffers = new Map();
    this.active = new Set();
    this.loops = new Map();
    this.busLevels = new Map();
    this.loadPromise = null;
    this.lastPlayed = null;
  }

  snapshot() {
    return {
      state: this.context?.state || "locked",
      loaded: this.buffers.size,
      total: Object.keys(this.config.sounds).length,
      activeVoices: this.active.size,
      loops: [...this.loops.keys()],
      lastPlayed: this.lastPlayed
    };
  }

  async unlockAndLoad() {
    this.setupGraph();
    await this.context.resume();
    this.emit("unlocked");
    if (!this.loadPromise) this.loadPromise = this.loadAll();
    await this.loadPromise;
    return this.snapshot();
  }

  setupGraph() {
    if (this.context) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass({ latencyHint: "interactive" });
    this.master = this.context.createGain();
    this.master.gain.value = dbToGain(this.config.buses.master.gainDb);
    this.master.connect(this.context.destination);
    Object.entries(this.config.buses).forEach(([id, definition]) => {
      if (id === "master") return;
      const gain = this.context.createGain();
      gain.gain.value = dbToGain(definition.gainDb);
      gain.connect(this.master);
      this.buses.set(id, gain);
      this.busLevels.set(id, 1);
    });
    this.busLevels.set("master", 1);
  }

  async loadAll() {
    const entries = Object.entries(this.config.sounds);
    let completed = 0;
    const workers = Array.from({ length: 5 }, async (_, workerIndex) => {
      for (let index = workerIndex; index < entries.length; index += 5) {
        const [id, definition] = entries[index];
        const response = await fetch(definition.url);
        if (!response.ok) throw new Error(`Audio fetch failed ${response.status}: ${definition.url}`);
        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(id, buffer);
        completed += 1;
        this.emit("loading", { id, completed, total: entries.length });
      }
    });
    await Promise.all(workers);
    this.emit("ready");
  }

  play(id, options = {}) {
    const definition = this.config.sounds[id];
    const buffer = this.buffers.get(id);
    if (!definition || !buffer || !this.context) return false;
    this.trimVoices();
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner?.();
    const delay = Math.max(0, options.delayMs || 0) / 1000;
    const startAt = this.context.currentTime + delay;
    const finalDb = definition.gainDb + (options.gainDb || 0);
    source.buffer = buffer;
    const rate = Number.isFinite(options.rate) && options.rate > 0 ? options.rate : 1;
    source.playbackRate.value = rate;
    gain.gain.value = dbToGain(finalDb);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, options.pan || 0));
      source.connect(gain).connect(panner).connect(this.buses.get(definition.bus));
    } else {
      source.connect(gain).connect(this.buses.get(definition.bus));
    }
    const voice = { id, source, gain, startedAt: startAt };
    this.active.add(voice);
    source.addEventListener("ended", () => {
      this.active.delete(voice);
      this.emit("voice-ended", { id });
    }, { once: true });
    source.start(startAt);
    this.lastPlayed = { id, bus: definition.bus, lane: definition.lane, rate };
    this.emit("play", { id, bus: definition.bus, lane: definition.lane, rate, delayMs: options.delayMs || 0 });
    return true;
  }

  playPreset(id) {
    const preset = this.config.presets[id] || [];
    preset.forEach((entry) => this.play(entry.id, entry));
    this.emit("preset", { id, layers: preset.length });
    return preset.length;
  }

  startLoop(id, loopKey = id, options = {}) {
    if (this.loops.has(loopKey)) return true;
    const definition = this.config.sounds[id];
    const buffer = this.buffers.get(id);
    if (!definition || !buffer || !this.context) return false;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    const rate = Number.isFinite(options.rate) && options.rate > 0 ? options.rate : 1;
    source.playbackRate.value = rate;
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(dbToGain(definition.gainDb + (options.gainDb || 0)), this.context.currentTime + 0.18);
    source.connect(gain).connect(this.buses.get(definition.bus));
    source.start();
    this.loops.set(loopKey, { id, source, gain });
    this.lastPlayed = { id, bus: definition.bus, lane: definition.lane, rate };
    this.emit("loop-start", { id, loopKey, lane: definition.lane, rate });
    return true;
  }

  stopLoop(loopKey) {
    const loop = this.loops.get(loopKey);
    if (!loop || !this.context) return;
    const now = this.context.currentTime;
    loop.gain.gain.cancelScheduledValues(now);
    loop.gain.gain.setValueAtTime(Math.max(0.0001, loop.gain.gain.value), now);
    loop.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    loop.source.stop(now + 0.16);
    this.loops.delete(loopKey);
    this.emit("loop-stop", { loopKey });
  }

  setBusLevel(id, percent) {
    const normalized = Math.max(0, Math.min(1, Number(percent) / 100));
    const node = id === "master" ? this.master : this.buses.get(id);
    const definition = this.config.buses[id];
    if (!node || !definition || !this.context) return;
    this.busLevels.set(id, normalized);
    node.gain.setTargetAtTime(dbToGain(definition.gainDb) * normalized, this.context.currentTime, 0.025);
    this.emit("bus", { id, percent: Math.round(normalized * 100) });
  }

  stopAll() {
    [...this.loops.keys()].forEach((key) => this.stopLoop(key));
    this.active.forEach((voice) => {
      try { voice.source.stop(); } catch { /* already ended */ }
    });
    this.active.clear();
    this.emit("stop-all");
  }

  trimVoices() {
    while (this.active.size >= this.config.voiceLimit) {
      const voice = this.active.values().next().value;
      try { voice.source.stop(); } catch { /* already ended */ }
      this.active.delete(voice);
    }
  }

  emit(type, detail = {}) {
    this.onUpdate({ type, ...detail, snapshot: this.snapshot() });
  }
}
