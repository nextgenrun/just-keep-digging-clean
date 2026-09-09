import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
import { SessionRecorder } from '../../systems/telemetry/SessionRecorder.js';
import { PlayerDataOutbox } from '../../systems/telemetry/PlayerDataOutbox.js';
import { PlayerDataTransport } from '../../systems/telemetry/PlayerDataTransport.js';
import { BrowserSessionInputs } from '../../systems/telemetry/BrowserSessionInputs.js';
import { SessionSaveBackups } from './SessionSaveBackups.js';
import { PhaserSessionObserver } from './PhaserSessionObserver.js';
export function playerDataAllowed(location) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return local ? new URLSearchParams(location.search).get(C.testParameter) === '1'
    : C.productionHosts.includes(location.hostname) && location.protocol === 'https:' && location.pathname.startsWith(C.productionPath);
}
export class PlayerSessionService {
  constructor(globalRef = window) {
    this.global = globalRef; this.allowed = playerDataAllowed(globalRef.location); this.enabled = false;
    if (!this.allowed) return;
    this.recorder = new SessionRecorder({ startedAt: performance.timeOrigin });
    this.outbox = new PlayerDataOutbox();
    this.transport = new PlayerDataTransport(this.outbox, { endpoint: new URL(C.endpoint, globalRef.location.href).href });
    this.backups = new SessionSaveBackups(this);
    this.inputs = new BrowserSessionInputs(this);
    this.flushing = false; this.observer = null; this.identity = null;
    this.ready = this.initialize();
    this.sampleTimer = setInterval(() => {
      try { if (this.enabled) { this.observer?.sample(); this.inputs.sampleGamepads(); this.recorder.account(); } } catch {}
    }, C.sampleIntervalMs);
    this.flushTimer = setInterval(() => { void this.flush(); }, C.flushIntervalMs);
  }
  async initialize() {
    try {
      await this.outbox.open(); this.identity = await this.outbox.identity();
      this.enabled = this.identity.enabled !== false && new URLSearchParams(this.global.location.search).get(C.disableParameter) !== '0';
      this.transport.enabled = this.enabled;
      this.record('client_info', { x: this.global.innerWidth, y: this.global.innerHeight, code: this.global.navigator.maxTouchPoints ? 'touch_capable' : 'pointer' });
      if (!this.enabled) { this.recorder.events.length = 0; await this.outbox.clear(); }
      this.recorder.setState({ visible: document.visibilityState !== 'hidden', focused: document.hasFocus() });
    } catch { this.enabled = false; this.transport.stop(); }
  }
  record(type, detail) { if (this.allowed && this.enabled) { try { this.recorder.record(type, detail); } catch {} } }
  attachGame(game) {
    if (!this.allowed) return;
    try { this.observer?.destroy(); this.observer = new PhaserSessionObserver(this, game); } catch {}
  }
  saveCommitted(detail) { try { if (this.enabled) this.backups.committed(detail); } catch {} }
  async flush(closing = false) {
    if (!this.allowed || this.flushing) return;
    this.flushing = true;
    try {
      await this.ready;
      if (!this.enabled) return;
      this.recorder.account();
      this.record('heartbeat', { totals: this.recorder.totals, dropped: this.outbox.lost });
      let batch;
      while (this.enabled && (batch = this.recorder.takeBatch(this.identity.player, this.global.__DIG_GAME_BUILD_ID__ || 'development')))
        await this.outbox.put(batch);
      await this.backups.flush(closing);
      if (closing) {
        const last = (await this.outbox.list()).filter(item => item.kind === 'events').at(-1);
        this.transport.beacon(last);
      } else void this.transport.drain();
    } catch { /* Best effort, completely outside save and frame authority. */ }
    finally { this.flushing = false; }
  }
  async setEnabled(enabled) {
    if (!this.allowed) return;
    await this.ready;
    this.enabled = !!enabled;
    if (!this.enabled) {
      this.transport.stop(); this.recorder.events.length = 0; this.recorder.held.clear(); this.backups.pending.clear();
      await this.outbox.clear();
    } else {
      this.transport.enabled = true;
      Object.assign(this.recorder, { lastAccounted: performance.now(), lastInput: performance.now(),
        visible: document.visibilityState !== 'hidden', focused: document.hasFocus() });
      this.record('logging_enabled');
    }
    if (this.identity) { this.identity.enabled = this.enabled; await this.outbox.saveIdentity(this.identity); }
  }
  snapshot() {
    return this.allowed ? { allowed: true, enabled: this.enabled, persistentOutbox: this.outbox.persistent,
      delivery: this.transport.lastStatus, acknowledged: this.transport.acknowledged, outboxDropped: this.outbox.lost,
      ...this.recorder.snapshot() } : { allowed: false, enabled: false };
  }
  destroy() {
    if (!this.allowed) return;
    clearInterval(this.sampleTimer); clearInterval(this.flushTimer);
    this.inputs.destroy(); this.observer?.destroy(); this.transport.stop();
  }
}
