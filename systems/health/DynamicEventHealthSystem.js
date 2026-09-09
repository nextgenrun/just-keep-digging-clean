import { DYNAMIC_EVENT_HEALTH as cfg } from "../../values/dynamicEventHealth.js";
import { resolveDynamicEventOutcome } from "./dynamicEventOutcome.js";

// Observe actual lifecycle progress. Gates and missed chance rolls are not faults.
export class DynamicEventHealthSystem {
  constructor() { this.rows = new Map(); this.history = []; this.lastObservedAt = 0; }
  record(id, outcome, reason, time) {
    this.history.push({ id, outcome, reason, time });
    this.history = this.history.slice(-cfg.historyLimit);
  }
  markCancelled(id, time) {
    const row = this.rows.get(id);
    if (row?.active) row.cancelled = true;
    this.record(id, cfg.labels.cancelled, null, time);
  }
  observe(id, input, time) {
    const previous = this.rows.get(id);
    const row = { id, starts: 0, completions: 0, activeSince: time, changedAt: time,
      finishedAt: -Infinity, ...previous, ...input };
    if (!previous || input.phase !== previous.phase) row.phaseSince = time;
    if (input.active && !previous?.active) {
      row.starts += 1; row.activeSince = time; row.cancelled = false;
      row.result = null; row.finishedAt = -Infinity;
      row.countersAtStart = { ...input.source?.health };
      this.record(id, cfg.labels.started, input.phase, time);
    }
    if (!input.active && previous?.active) {
      if (!previous.cancelled) row.completions += 1;
      row.finishedAt = previous.cancelled ? -Infinity : time;
      row.result = previous.cancelled ? null : resolveDynamicEventOutcome(id, input, row.countersAtStart);
      this.record(id, previous.cancelled ? cfg.labels.cancelled : cfg.labels.completed, row.result?.detail || input.phase, time);
    }
    if (!previous || input.pulse !== previous.pulse || input.paused) row.changedAt = time;
    if (input.paused && previous) { const dt = Math.max(0, time - previous.observedAt); row.activeSince += dt; row.phaseSince += dt; }
    const stalled = input.monitor !== false && !input.paused && time - row.changedAt > cfg.stalledMs;
    const overdue = input.active && !input.paused && (time - row.activeSince > cfg.maximumEncounterMs
      || time - row.phaseSince > (cfg.phaseMaximumMs[id]?.[input.phase] || cfg.maximumEncounterMs));
    row.issue = input.issue || (stalled ? cfg.labels.stalled : overdue ? cfg.labels.lifetime : null);
    row.status = row.issue ? cfg.labels.fault : input.active ? cfg.labels.started
      : input.pending ? cfg.labels.queued : input.blocked ? cfg.labels.blocked : cfg.labels.waiting;
    row.observedAt = time;
    this.rows.set(id, row); this.lastObservedAt = time;
    return row;
  }
  snapshot() {
    const events = Object.fromEntries([...this.rows].map(([id, row]) => [id, { ...row }]));
    return { ready: cfg.ids.every(id => events[id] && !events[id].issue),
      events, history: [...this.history], lastObservedAt: this.lastObservedAt };
  }
}