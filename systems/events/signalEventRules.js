import { SIGNAL_TRAP } from "../../values/signalRisk.js";
import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
import { SIGNAL_SURVIVORS } from "../../values/signalSurvivors.js";
import { RESOURCE_KEYS } from "../../values/resourceTypes.js";
import { hash01 } from "../../values/deterministicMath.js";

export function createSignalPayload(seed, serial, anchor, options = {}) {
  const available = SIGNAL_SURVIVORS.filter(s => !options.miaRescued || s.id !== "mia");
  const index = Math.floor(hash01(seed, serial, cfg.survivorSalt, 1) * available.length);
  // Forced cases are deterministic; natural Signals include the trap in the 35% occupied camps.
  const explosive = options.kind === "explosive" || (!options.kind
    && hash01(seed, serial, SIGNAL_TRAP.salt, 1) < SIGNAL_TRAP.chance);
  const survivorId = explosive ? SIGNAL_TRAP.survivorId
    : available.some(s => s.id === options.survivorId) ? options.survivorId : available[index].id;
  const safeChance = (cfg.realChance - SIGNAL_TRAP.chance) / (1 - SIGNAL_TRAP.chance);
  return { anchors: [anchor], signal: {
    survivorId, explosive, blastPhase: "dormant", fuseRemainingMs: SIGNAL_TRAP.fuseMs, blastFatal: false,
    real: explosive || (options.kind ? options.kind === "survivor" : hash01(seed, serial, cfg.sourceSalt, 1) < safeChance),
    fatal: options.outcome ? options.outcome === "loss" : hash01(seed, serial, cfg.fatalSalt, 1) < cfg.fatalChance,
    callInMs: cfg.firstCallMs, callSerial: 0, discovered: false,
  } };
}
export function sanitizeSignal(value) {
  if (!value || !SIGNAL_SURVIVORS.some(s => s.id === value.survivorId)
    || typeof value.real !== "boolean" || typeof value.fatal !== "boolean") return null;
  const explosive = value.real && value.survivorId === SIGNAL_TRAP.survivorId && value.explosive === true;
  return { survivorId: value.survivorId, real: value.real, fatal: value.fatal,
    explosive, blastPhase: explosive && SIGNAL_TRAP.phases.includes(value.blastPhase) ? value.blastPhase : "dormant",
    fuseRemainingMs: explosive && Number.isFinite(value.fuseRemainingMs)
      ? Math.max(0, Math.min(SIGNAL_TRAP.fuseMs, value.fuseRemainingMs)) : SIGNAL_TRAP.fuseMs,
    blastFatal: explosive && value.blastFatal === true,
    deathSource: value.deathSource === SIGNAL_TRAP.deathSource ? SIGNAL_TRAP.deathSource : cfg.type,
    callInMs: Math.max(0, Math.min(cfg.callGapMaxMs + cfg.cinema.minimumLineMs * 4, Number(value.callInMs) || 0)),
    callSerial: Math.max(0, Math.min(1000, Math.floor(Number(value.callSerial) || 0))),
    discovered: value.discovered === true, pendingDeath: value.pendingDeath === true };
}
export function quoteSignalGift(owned, selected) {
  if (!selected || typeof selected !== "object" || Array.isArray(selected)) throw new Error(cfg.copy.giftInvalid);
  const resources = { ...owned }, given = {};
  let count = 0;
  for (const [key, amount] of Object.entries(selected)) {
    if (!RESOURCE_KEYS.includes(key) || !Number.isSafeInteger(amount) || amount < 0
      || amount > Math.max(0, Math.floor(Number(owned[key]) || 0))) throw new Error(cfg.copy.giftInvalid);
    if (amount > 0) { resources[key] -= amount; given[key] = amount; count += amount; }
  }
  if (!count) throw new Error(cfg.copy.giftEmpty);
  return { resources, given, count };
}
export function signalDistance(a, b) { return Math.hypot(a.tx - b.tx, a.ty - b.ty); }
export function selectSignalLine(distance, serial, survivor = null) {
  const band = distance <= cfg.nearDistance ? "near" : distance <= cfg.middleDistance ? "middle" : "far";
  const pool = survivor?.calls?.[band] || (survivor ? cfg.calls[band] : null);
  if (pool) return pool[serial % pool.length];
  if (distance <= cfg.nearDistance) return "near";
  if (distance <= cfg.middleDistance) return "middle";
  return serial % 2 ? "farB" : "farA";
}
export function nextSignalGap(seed, serial) {
  return cfg.callGapMinMs + hash01(seed, serial, cfg.cadenceSalt, 1) * (cfg.callGapMaxMs - cfg.callGapMinMs);
}
