import { hashUint } from "../../values/deterministicMath.js";
import { RESOURCE_KEYS } from "../../values/resourceTypes.js";
import {
  SLEEPING_JACKPOT_CONFIG,
  createEmptySleepingJackpotResources,
} from "../../values/sleepingJackpot.js";

const clone = value => JSON.parse(JSON.stringify(value));
const finiteInt = (value, fallback = 0) => Number.isFinite(Number(value))
  ? Math.floor(Number(value))
  : fallback;
const boundedInt = (value, min, max, fallback = min) => Math.min(
  max,
  Math.max(min, finiteInt(value, fallback)),
);

function sanitizeEscrow(value) {
  const result = createEmptySleepingJackpotResources();
  const max = SLEEPING_JACKPOT_CONFIG.sleepingJackpot.maxSafeResourceStack;
  for (const key of RESOURCE_KEYS) result[key] = boundedInt(value?.[key], 0, max, 0);
  return result;
}

export function sanitizeSleepingJackpotRecord(value) {
  if (!value || !["sealed", "awake"].includes(value.phase)) return null;
  const tx = finiteInt(value.chest?.tx, Number.NaN);
  const ty = finiteInt(value.chest?.ty, Number.NaN);
  if (!Number.isFinite(tx) || !Number.isFinite(ty) || typeof value.chest?.key !== "string") return null;
  return {
    version: 1,
    phase: value.phase,
    chest: {
      key: value.chest.key.slice(0, 64),
      tx,
      ty,
      depth: boundedInt(value.chest.depth, 0, 100000, 0),
    },
    targetDepth: boundedInt(value.targetDepth, 1, 100000, 1),
    escrow: sanitizeEscrow(value.escrow),
    oddsBps: boundedInt(value.oddsBps, 1, 9999, 5000),
    multiplier: SLEEPING_JACKPOT_CONFIG.sleepingJackpot.resourceMultiplier,
    outcomeSeed: boundedInt(value.outcomeSeed, 0, 0xffffffff, 0) >>> 0,
    outcomeRoll: Math.max(0, Math.min(0.999999999, Number(value.outcomeRoll) || 0)),
    outcome: value.outcome === "win" ? "win" : "loss",
    committedAt: boundedInt(value.committedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    awakenedAt: boundedInt(value.awakenedAt, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

export function sanitizeSleepingJackpotData(value, seed = 0) {
  const legacyRecord = value?.sleepingJackpot || value?.record || value;
  return {
    version: SLEEPING_JACKPOT_CONFIG.version,
    seed: boundedInt(value?.seed, 0, 0xffffffff, seed) >>> 0,
    sleepingJackpot: sanitizeSleepingJackpotRecord(legacyRecord),
  };
}

export class SleepingJackpotState {
  constructor(seed = 0) {
    this.state = sanitizeSleepingJackpotData(null, seed);
  }

  loadSaveData(value) {
    this.state = sanitizeSleepingJackpotData(value, this.state.seed);
    return this.getSaveData();
  }

  getSaveData() { return clone(this.state); }
  getSnapshot() { return this.getSaveData(); }

  setSleepingJackpot(record) {
    this.state.sleepingJackpot = sanitizeSleepingJackpotRecord(record);
    return this.state.sleepingJackpot;
  }

  clearSleepingJackpot() {
    const previous = this.state.sleepingJackpot;
    this.state.sleepingJackpot = null;
    return previous;
  }

  createOutcomeSeed(tx, ty, salt) {
    return hashUint(tx, ty, this.state.seed, salt) >>> 0;
  }
}

