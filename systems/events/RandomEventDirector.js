import { hash01, hashUint } from "../../values/deterministicMath.js";
import {
  RANDOM_EVENT_TYPE_ORDER,
  RANDOM_EVENT_TYPES,
  RANDOM_WORLD_EVENT_CONFIG,
  createEmptyRandomEventResources,
} from "../../values/randomWorldEvents.js";
import { MONEY_MONSTER_RESOURCE_KEYS, RESOURCE_KEYS } from "../../values/resourceTypes.js";

const VALID_TYPES = new Set(RANDOM_EVENT_TYPE_ORDER);
const VALID_RESOURCES = new Set(MONEY_MONSTER_RESOURCE_KEYS);
const clone = value => JSON.parse(JSON.stringify(value));
const finiteInt = (value, fallback = 0) => Number.isFinite(Number(value))
  ? Math.floor(Number(value))
  : fallback;
const boundedInt = (value, min, max, fallback = min) => Math.min(
  max,
  Math.max(min, finiteInt(value, fallback)),
);

function sanitizePoint(value) {
  if (!value || !Number.isFinite(Number(value.tx)) || !Number.isFinite(Number(value.ty))) return null;
  return { tx: Math.floor(Number(value.tx)), ty: Math.floor(Number(value.ty)) };
}

function sanitizePoints(value, limit = 32) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).map(sanitizePoint).filter(Boolean);
}

function sanitizeEscrow(value) {
  const result = createEmptyRandomEventResources();
  const max = RANDOM_WORLD_EVENT_CONFIG.sleepingJackpot.maxSafeResourceStack;
  for (const key of RESOURCE_KEYS) result[key] = boundedInt(value?.[key], 0, max, 0);
  return result;
}

function sanitizeJackpot(value) {
  if (!value || !["sealed", "awake"].includes(value.phase)) return null;
  const chest = sanitizePoint(value.chest);
  if (!chest || typeof value.chest?.key !== "string") return null;
  return {
    version: 1,
    phase: value.phase,
    chest: {
      key: value.chest.key.slice(0, 64),
      tx: chest.tx,
      ty: chest.ty,
      depth: boundedInt(value.chest.depth, 0, 100000, 0),
    },
    targetDepth: boundedInt(value.targetDepth, 1, 100000, 1),
    escrow: sanitizeEscrow(value.escrow),
    oddsBps: boundedInt(value.oddsBps, 1, 9999, 5000),
    multiplier: RANDOM_WORLD_EVENT_CONFIG.sleepingJackpot.resourceMultiplier,
    outcomeSeed: boundedInt(value.outcomeSeed, 0, 0xffffffff, 0) >>> 0,
    outcomeRoll: Math.max(0, Math.min(0.999999999, Number(value.outcomeRoll) || 0)),
    outcome: value.outcome === "win" ? "win" : "loss",
    committedAt: boundedInt(value.committedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    awakenedAt: boundedInt(value.awakenedAt, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function sanitizeActive(value) {
  if (!value || !VALID_TYPES.has(value.type)) return null;
  const maxDuration = RANDOM_WORLD_EVENT_CONFIG.scheduler.maxPersistedDurationMs;
  const anchors = sanitizePoints(value.anchors);
  const sequence = Array.isArray(value.sequence)
    ? value.sequence.slice(0, 8).map(index => boundedInt(index, 0, 31, 0))
    : [];
  const targetResource = VALID_RESOURCES.has(value.targetResource)
    ? value.targetResource
    : null;
  if (
    (value.type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM
      || value.type === RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH)
    && !targetResource
  ) return null;
  return {
    id: String(value.id || `${value.type}-restored`).slice(0, 80),
    type: value.type,
    remainingMs: boundedInt(value.remainingMs, 0, maxDuration, 0),
    phase: "active",
    suspended: value.suspended === true,
    startedDepth: boundedInt(value.startedDepth, 0, 100000, 0),
    anchors,
    sequence,
    progress: boundedInt(value.progress, 0, Math.max(32, anchors.length), 0),
    targetResource,
    choirId: value.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR && typeof value.choirId === "string"
      ? value.choirId.slice(0, 96) : null,
    bonusMoney: boundedInt(value.bonusMoney, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

export function sanitizeRandomEventData(value, seed = 0) {
  const scheduler = RANDOM_WORLD_EVENT_CONFIG.scheduler;
  const active = sanitizeActive(value?.active);
  const storedCooldownMs = boundedInt(
    value?.cooldownMs, 0, scheduler.maxCooldownMs, scheduler.initialCooldownMs,
  );
  const recentTypes = Array.isArray(value?.recentTypes)
    ? value.recentTypes.filter(type => VALID_TYPES.has(type)).slice(-scheduler.recentTypeLimit)
    : [];
  const recentResources = Array.isArray(value?.recentResources)
    ? [...new Set(value.recentResources.filter(key => VALID_RESOURCES.has(key)))]
      .slice(-scheduler.recentResourceLimit)
    : [];
  const completedChoirs = Array.isArray(value?.completedChoirs)
    ? [...new Set(value.completedChoirs.filter(id => typeof id === "string" && id.length > 0)
      .map(id => id.slice(0, 96)))].slice(-128) : [];
  return {
    version: RANDOM_WORLD_EVENT_CONFIG.version,
    seed: boundedInt(value?.seed, 0, 0xffffffff, seed) >>> 0,
    serial: boundedInt(value?.serial, 0, Number.MAX_SAFE_INTEGER, 0),
    cooldownMs: value?.active && !active
      ? Math.max(storedCooldownMs, scheduler.retryCooldownMs)
      : storedCooldownMs,
    active,
    recentTypes,
    recentResources,
    sleepingJackpot: sanitizeJackpot(value?.sleepingJackpot),
    completedChoirs,
    stats: {
      started: boundedInt(value?.stats?.started, 0, Number.MAX_SAFE_INTEGER, 0),
      completed: boundedInt(value?.stats?.completed, 0, Number.MAX_SAFE_INTEGER, 0),
      interrupted: boundedInt(value?.stats?.interrupted, 0, Number.MAX_SAFE_INTEGER, 0),
    },
  };
}

export class RandomEventDirector {
  constructor(seed = 0, flags = {}) {
    this.flags = flags;
    this.state = sanitizeRandomEventData(null, seed);
  }

  loadSaveData(value) {
    this.state = sanitizeRandomEventData(value, this.state.seed);
    return this.getSaveData();
  }

  getSaveData() { return clone(this.state); }
  getSnapshot() { return this.getSaveData(); }

  recordRecentResource(resourceKey) {
    if (!VALID_RESOURCES.has(resourceKey)) return false;
    this.state.recentResources = this.state.recentResources.filter(key => key !== resourceKey);
    this.state.recentResources.push(resourceKey);
    this.state.recentResources = this.state.recentResources
      .slice(-RANDOM_WORLD_EVENT_CONFIG.scheduler.recentResourceLimit);
    return true;
  }

  selectRushTarget(resources = {}) {
    for (let index = this.state.recentResources.length - 1; index >= 0; index -= 1) {
      return this.state.recentResources[index];
    }
    const carried = MONEY_MONSTER_RESOURCE_KEYS.filter(key => (resources[key] || 0) > 0);
    if (!carried.length) return null;
    const roll = hash01(this.state.seed, this.state.serial, carried.length, 41771);
    return carried[Math.floor(roll * carried.length) % carried.length] || null;
  }

  hasCompletedChoir(choirId) {
    return typeof choirId === "string" && this.state.completedChoirs.includes(choirId);
  }

  chooseNextType(eligibleTypes) {
    const candidates = eligibleTypes.filter(type => VALID_TYPES.has(type));
    if (!candidates.length) return null;
    const withoutLast = candidates.filter(type => type !== this.state.recentTypes.at(-1));
    const pool = withoutLast.length ? withoutLast : candidates;
    const forced = this.flags.debug && VALID_TYPES.has(this.flags.forcedType)
      ? this.flags.forcedType
      : null;
    if (forced && pool.includes(forced)) return forced;
    const roll = hash01(this.state.seed, this.state.serial, pool.length, 88117);
    return pool[Math.floor(roll * pool.length) % pool.length] || pool[0];
  }

  start(type, payload = {}) {
    if (this.state.active || !VALID_TYPES.has(type)) return null;
    const serial = this.state.serial + 1;
    const durationMs = RANDOM_WORLD_EVENT_CONFIG[type]?.durationMs || 0;
    this.state.serial = serial;
    this.state.active = sanitizeActive({
      ...payload,
      id: `${type}-${serial}`,
      type,
      remainingMs: durationMs,
      phase: "active",
      progress: 0,
      bonusMoney: 0,
    });
    this.state.stats.started += 1;
    this.state.recentTypes.push(type);
    this.state.recentTypes = this.state.recentTypes
      .slice(-RANDOM_WORLD_EVENT_CONFIG.scheduler.recentTypeLimit);
    return this.state.active;
  }

  tick(deltaMs, { pauseTimer = false } = {}) {
    const delta = Math.max(0, Number(deltaMs) || 0);
    const active = this.state.active;
    if (!active) {
      this.state.cooldownMs = Math.max(0, this.state.cooldownMs - delta);
      return { ready: this.state.cooldownMs <= 0, expired: false };
    }
    if (!pauseTimer && active.phase === "active" && !active.suspended) {
      active.remainingMs = Math.max(0, active.remainingMs - delta);
    }
    return { ready: false, expired: active.remainingMs <= 0 && active.phase === "active" };
  }

  setSuspended(suspended) {
    if (!this.state.active) return false;
    this.state.active.suspended = suspended === true;
    return true;
  }

  setProgress(progress) {
    if (!this.state.active) return false;
    this.state.active.progress = boundedInt(progress, 0, 64, 0);
    return true;
  }

  addRushBonus(amount) {
    if (this.state.active?.type !== RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH) return false;
    this.state.active.bonusMoney = boundedInt(
      this.state.active.bonusMoney + Math.max(0, Number(amount) || 0),
      0,
      Number.MAX_SAFE_INTEGER,
      0,
    );
    return true;
  }

  finish({ interrupted = false } = {}) {
    const completed = this.state.active ? clone(this.state.active) : null;
    if (!completed) return null;
    this.state.active = null;
    if (!interrupted && completed.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR && completed.choirId) {
      this.state.completedChoirs = [
        ...this.state.completedChoirs.filter(id => id !== completed.choirId),
        completed.choirId,
      ].slice(-128);
    }
    if (interrupted) this.state.stats.interrupted += 1;
    else this.state.stats.completed += 1;
    const range = RANDOM_WORLD_EVENT_CONFIG.scheduler.maxCooldownMs
      - RANDOM_WORLD_EVENT_CONFIG.scheduler.minCooldownMs;
    const roll = hash01(this.state.seed, this.state.serial, completed.progress, 44927);
    this.state.cooldownMs = RANDOM_WORLD_EVENT_CONFIG.scheduler.minCooldownMs
      + Math.floor(roll * Math.max(1, range));
    return completed;
  }

  setRetryCooldown() {
    this.state.cooldownMs = RANDOM_WORLD_EVENT_CONFIG.scheduler.retryCooldownMs;
  }

  setSleepingJackpot(record) {
    this.state.sleepingJackpot = sanitizeJackpot(record);
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
