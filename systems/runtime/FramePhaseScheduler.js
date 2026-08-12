import { FRAME_CRITICALITIES, FRAME_PHASES } from "../../values/sceneRuntime.js";

const PHASE_INDEX = new Map(FRAME_PHASES.map((phase, index) => [phase, index]));
const CRITICALITY_VALUES = new Set(Object.values(FRAME_CRITICALITIES));

export class FramePhaseScheduler {
  constructor({ onPresentationFailure = null, onAuthorityFailure = null } = {}) {
    this._registrations = [];
    this._ids = new Set();
    this._sequence = 0;
    this._blocked = false;
    this._onPresentationFailure = onPresentationFailure;
    this._onAuthorityFailure = onAuthorityFailure;
  }

  get blocked() { return this._blocked; }

  register({ id, phase, criticality, update, dispose = null }) {
    if (!id || this._ids.has(id)) throw new Error(`Duplicate or missing frame system id: ${id}`);
    if (!PHASE_INDEX.has(phase)) throw new RangeError(`Unknown frame phase: ${phase}`);
    if (!CRITICALITY_VALUES.has(criticality)) throw new RangeError(`Unknown frame criticality: ${criticality}`);
    if (typeof update !== "function") throw new TypeError(`Frame system ${id} needs an update function`);
    const registration = {
      id,
      phase,
      criticality,
      update,
      dispose: typeof dispose === "function" ? dispose : null,
      sequence: this._sequence++,
      quarantined: false,
    };
    this._ids.add(id);
    this._registrations.push(registration);
    this._registrations.sort((left, right) => (
      PHASE_INDEX.get(left.phase) - PHASE_INDEX.get(right.phase)
      || left.sequence - right.sequence
    ));
    return () => this.unregister(id);
  }

  unregister(id) {
    const index = this._registrations.findIndex(entry => entry.id === id);
    if (index < 0) return false;
    const [entry] = this._registrations.splice(index, 1);
    this._ids.delete(id);
    entry.quarantined = true;
    entry.dispose?.();
    return true;
  }

  runFrame(time, delta, context = undefined) {
    if (this._blocked) return Object.freeze({ blocked: true, executed: 0 });
    let executed = 0;
    for (const entry of this._registrations) {
      if (entry.quarantined) continue;
      try {
        entry.update(time, delta, context);
        executed += 1;
      } catch (error) {
        const finding = Object.freeze({
          id: entry.id,
          phase: entry.phase,
          criticality: entry.criticality,
          error,
        });
        if (entry.criticality === FRAME_CRITICALITIES.PRESENTATION) {
          entry.quarantined = true;
          try { entry.dispose?.(); } catch (disposeError) {
            this._onPresentationFailure?.({ ...finding, disposeError });
            continue;
          }
          this._onPresentationFailure?.(finding);
          continue;
        }
        this._blocked = true;
        this._onAuthorityFailure?.(finding);
        break;
      }
    }
    return Object.freeze({ blocked: this._blocked, executed });
  }

  resetAuthorityBlock() { this._blocked = false; }

  snapshot() {
    return Object.freeze({
      blocked: this._blocked,
      systems: Object.freeze(this._registrations.map(entry => Object.freeze({
        id: entry.id,
        phase: entry.phase,
        criticality: entry.criticality,
        quarantined: entry.quarantined,
      }))),
    });
  }

  dispose() {
    const entries = [...this._registrations].reverse();
    this._registrations.length = 0;
    this._ids.clear();
    for (const entry of entries) {
      if (!entry.quarantined) entry.dispose?.();
      entry.quarantined = true;
    }
    this._blocked = true;
  }
}
