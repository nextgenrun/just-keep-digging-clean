import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
const fields = new Set(C.dataFields);
export function safeSessionFields(input, depth = 0) {
  if (!input || typeof input !== 'object' || depth > C.maxFieldDepth) return {};
  const result = {};
  for (const [key, value] of Object.entries(input).slice(0, C.maxFields)) {
    if (!fields.has(key)) continue;
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = Math.round(value * 100) / 100;
    else if (typeof value === 'boolean') result[key] = value;
    else if (typeof value === 'string') result[key] = value.replace(/[^a-zA-Z0-9_.:/ -]/g, '').slice(0, C.maxStringLength);
    else if (value && typeof value === 'object' && !Array.isArray(value)) result[key] = safeSessionFields(value, depth + 1);
  }
  return result;
}
export class SessionRecorder {
  constructor({ now = () => performance.now(), startedAt = Date.now(), sessionId = crypto.randomUUID() } = {}) {
    this.now = now; this.startedAt = startedAt; this.sessionId = sessionId;
    this.sequence = 0; this.events = []; this.dropped = 0;
    this.scene = 'page'; this.phase = 'loading'; this.visible = true; this.focused = true;
    this.held = new Map(); this.lastAccounted = this.now(); this.lastInput = this.lastAccounted;
    this.totals = { gameplay: 0, idle: 0, menu: 0, loading: 0, pausedTime: 0, hidden: 0, unfocused: 0, unknown: 0 };
    this.record('page_open', { elapsedMs: this.lastAccounted });
  }
  record(type, detail = {}) {
    if (!/^[a-z][a-z0-9_]{0,47}$/.test(type)) return;
    if (this.events.length >= C.maxMemoryEvents) { this.events.shift(); this.dropped++; }
    this.events.push({ seq: ++this.sequence, elapsedMs: Math.round(this.now()), type,
      scene: this.scene, phase: this.phase, detail: safeSessionFields(detail) });
  }
  account() {
    const now = this.now(), elapsed = Math.max(0, now - this.lastAccounted);
    let bucket = !this.visible ? 'hidden' : !this.focused ? 'unfocused'
      : this.phase === 'gameplay' ? 'gameplay' : this.phase === 'paused' ? 'pausedTime' : this.phase;
    if (!(bucket in this.totals)) bucket = 'menu';
    if (elapsed > C.unknownGapAfterMs && this.visible && this.focused) this.totals.unknown += elapsed;
    else if (bucket === 'gameplay' && !this.held.size) {
      const active = Math.min(elapsed, Math.max(0, this.lastInput + C.idleAfterMs - this.lastAccounted));
      this.totals.gameplay += active; this.totals.idle += elapsed - active;
    } else this.totals[bucket] += elapsed;
    this.lastAccounted = now;
  }
  setState({ scene = this.scene, phase = this.phase, visible = this.visible, focused = this.focused } = {}) {
    this.account();
    const changed = scene !== this.scene || phase !== this.phase || visible !== this.visible || focused !== this.focused;
    Object.assign(this, { scene, phase, visible, focused });
    if (!visible || !focused) this.releaseAll('focus_lost');
    if (changed) this.record('session_state', { visible, focused });
  }
  input(action, down, detail = {}) {
    this.account(); const at = this.now(); this.lastInput = at;
    if (down) {
      if (this.held.has(action)) return;
      this.held.set(action, at); this.record('input_down', { action, ...detail });
    } else {
      const start = this.held.get(action); this.held.delete(action);
      if (start !== undefined) this.record('input_up', { action, heldMs: at - start, ...detail });
    }
  }
  activity() { this.account(); this.lastInput = this.now(); }
  releaseAll(reason) {
    for (const [action, start] of this.held) this.record('input_up', { action, heldMs: this.now() - start, synthetic: true, reason });
    this.held.clear();
  }
  takeBatch(playerId, build) {
    if (!this.events.length) return null;
    const batch = { schema: C.schemaVersion, kind: 'events', id: crypto.randomUUID(), session: this.sessionId,
      player: playerId, startedAt: this.startedAt, createdAt: Date.now(), build, dropped: this.dropped, events: [] };
    while (this.events.length && batch.events.length < C.maxBatchEvents) {
      batch.events.push(this.events[0]);
      if (new TextEncoder().encode(JSON.stringify(batch)).byteLength > C.maxBatchBytes) { batch.events.pop(); break; }
      this.events.shift();
    }
    return batch.events.length ? batch : null;
  }
  snapshot() {
    return { session: this.sessionId, scene: this.scene, phase: this.phase, queuedEvents: this.events.length,
      dropped: this.dropped, totals: { ...this.totals }, recent: this.events.slice(-C.maxBatchEvents) };
  }
}
