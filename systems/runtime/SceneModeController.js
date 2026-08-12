import {
  LEGACY_GAME_STATE_BY_PHASE,
  LEGACY_GAME_STATE_BY_SUSPENSION,
  LEGACY_PHASE_BY_GAME_STATE,
  LEGACY_SUSPENSION_BY_GAME_STATE,
  SCENE_BASE_PHASES,
  SCENE_SUSPENSION_KINDS,
} from "../../values/sceneRuntime.js";

const BASE_PHASE_VALUES = new Set(Object.values(SCENE_BASE_PHASES));
const SUSPENSION_VALUES = new Set(Object.values(SCENE_SUSPENSION_KINDS));

export class SceneModeController {
  constructor({ basePhase = SCENE_BASE_PHASES.LOADING, onChanged = null } = {}) {
    this._basePhase = this._validateBasePhase(basePhase);
    this._suspensions = [];
    this._nextTokenId = 0;
    this._onChanged = typeof onChanged === "function" ? onChanged : null;
  }

  get basePhase() { return this._basePhase; }
  get legacyGameState() {
    const activeSuspension = this._suspensions.at(-1);
    return activeSuspension
      ? LEGACY_GAME_STATE_BY_SUSPENSION[activeSuspension.kind]
      : LEGACY_GAME_STATE_BY_PHASE[this._basePhase];
  }
  get isSuspended() { return this._suspensions.length > 0; }
  get isGameplayActive() {
    return this._basePhase === SCENE_BASE_PHASES.ACTIVE && !this.isSuspended;
  }

  setBasePhase(nextPhase, context = {}) {
    const validated = this._validateBasePhase(nextPhase);
    if (validated === this._basePhase) return this.snapshot();
    const previous = this.snapshot();
    this._basePhase = validated;
    this._emit(previous, { type: "base-phase", ...context });
    return this.snapshot();
  }

  acquire(kind, owner = "anonymous") {
    if (!SUSPENSION_VALUES.has(kind)) {
      throw new RangeError(`Unknown scene suspension kind: ${kind}`);
    }
    const entry = Object.freeze({ id: ++this._nextTokenId, kind, owner: String(owner) });
    const previous = this.snapshot();
    this._suspensions.push(entry);
    this._emit(previous, { type: "suspension-acquired", token: entry });
    let released = false;
    return Object.freeze({
      ...entry,
      release: () => {
        if (released) return false;
        released = true;
        return this._release(entry.id);
      },
    });
  }

  enterSafePause(context = {}) {
    const previous = this.snapshot();
    this._basePhase = SCENE_BASE_PHASES.SAFE_PAUSED;
    this._suspensions.length = 0;
    this._emit(previous, { type: "safe-pause", ...context });
    return this.snapshot();
  }

  clearSuspensions() {
    if (this._suspensions.length === 0) return false;
    const previous = this.snapshot();
    this._suspensions.length = 0;
    this._emit(previous, { type: "suspensions-cleared" });
    return true;
  }

  setLegacyState(state, owner = "legacy-adapter") {
    if (LEGACY_PHASE_BY_GAME_STATE[state]) {
      this.clearSuspensions();
      return this.setBasePhase(LEGACY_PHASE_BY_GAME_STATE[state], { owner });
    }
    const kind = LEGACY_SUSPENSION_BY_GAME_STATE[state];
    if (!kind) throw new RangeError(`Unknown legacy game state: ${state}`);
    this.clearSuspensions();
    this.acquire(kind, owner);
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({
      basePhase: this._basePhase,
      gameState: this.legacyGameState,
      isSuspended: this.isSuspended,
      isGameplayActive: this.isGameplayActive,
      suspensions: Object.freeze(this._suspensions.map(entry => ({ ...entry }))),
    });
  }

  _release(id) {
    const index = this._suspensions.findIndex(entry => entry.id === id);
    if (index < 0) return false;
    const previous = this.snapshot();
    const [token] = this._suspensions.splice(index, 1);
    this._emit(previous, { type: "suspension-released", token });
    return true;
  }

  _validateBasePhase(phase) {
    if (!BASE_PHASE_VALUES.has(phase)) throw new RangeError(`Unknown scene base phase: ${phase}`);
    return phase;
  }

  _emit(previous, reason) {
    this._onChanged?.(this.snapshot(), previous, Object.freeze(reason));
  }
}
