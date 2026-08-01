import { hashUint } from "../../values/deterministicMath.js";
import { RANDOM_WORLD_EVENT_CONFIG } from "../../values/randomWorldEvents.js";
import {
  RESOURCE_KEYS,
  createZeroResourceTotals,
  getResourceDisplayName,
} from "../../values/resourceTypes.js";

const cfg = RANDOM_WORLD_EVENT_CONFIG.sleepingJackpot;
const safeCount = value => Number.isSafeInteger(value) && value >= 0;

export function isSleepingJackpotCandidate(tile, seed) {
  if (!tile) return false;
  return hashUint(tile.tx, tile.ty, seed, cfg.rareChestSalt) % cfg.rareChestDivisor === 0;
}

export function buildSleepingJackpotQuote({ tile, wallet, resources, targetDepth, seed }) {
  const safeWallet = Math.max(0, Math.floor(Number(wallet) || 0));
  const wager = Math.min(
    safeWallet,
    cfg.maxWager,
    Math.max(cfg.minWager, Math.floor(safeWallet * cfg.wagerWalletFraction)),
  );
  const possibleGain = Math.floor(wager * cfg.immediateNetGainMultiplier);
  const walletWinSafe = safeCount(safeWallet) && Number.isSafeInteger(safeWallet + possibleGain);
  const escrow = createZeroResourceTotals();
  let escrowTotal = 0;
  let escrowSafe = true;
  for (const key of RESOURCE_KEYS) {
    const amount = Math.max(0, Math.floor(Number(resources?.[key]) || 0));
    escrow[key] = amount;
    escrowTotal += amount;
    if (!safeCount(amount) || amount > cfg.maxSafeResourceStack) escrowSafe = false;
  }
  const immediateSeed = hashUint(tile.tx, tile.ty, seed, cfg.outcomeSalt);
  const maturitySeed = hashUint(tile.tx, tile.ty, seed, cfg.outcomeSalt + 1);
  return {
    immediate: {
      enabled: safeWallet >= cfg.minWallet && wager > 0 && Number.isSafeInteger(possibleGain) && walletWinSafe,
      reason: safeWallet < cfg.minWallet ? `NEEDS AT LEAST ${cfg.minWallet.toLocaleString()} M` : "WALLET QUOTE IS NOT SAFE",
      wager,
      possibleGain,
      oddsBps: cfg.immediateOddsBps,
      outcomeSeed: immediateSeed,
      outcomeRoll: immediateSeed / 0x100000000,
      outcome: immediateSeed / 0x100000000 < cfg.immediateOddsBps / 10000 ? "win" : "loss",
    },
    maturity: {
      enabled: Number.isFinite(targetDepth) && escrowTotal > 0 && escrowSafe,
      reason: !Number.isFinite(targetDepth)
        ? "NO DEEPER CANONICAL MILESTONE"
        : escrowTotal <= 0 ? "NO RESOURCES TO STAKE" : "A RESOURCE STACK IS TOO LARGE TO MULTIPLY SAFELY",
      targetDepth: Number.isFinite(targetDepth) ? Math.floor(targetDepth) : null,
      escrow,
      escrowTotal,
      multiplier: cfg.resourceMultiplier,
      oddsBps: cfg.maturityOddsBps,
      outcomeSeed: maturitySeed,
      outcomeRoll: maturitySeed / 0x100000000,
      outcome: maturitySeed / 0x100000000 < cfg.maturityOddsBps / 10000 ? "win" : "loss",
    },
  };
}

export function createSealedJackpotRecord(tile, quote, nowMs = 0) {
  return {
    version: 1,
    phase: "sealed",
    chest: {
      key: tile.key || `${tile.tx},${tile.ty}`,
      tx: tile.tx,
      ty: tile.ty,
      depth: tile.depth,
    },
    targetDepth: quote.targetDepth,
    escrow: { ...quote.escrow },
    oddsBps: quote.oddsBps,
    multiplier: quote.multiplier,
    outcomeSeed: quote.outcomeSeed,
    outcomeRoll: quote.outcomeRoll,
    outcome: quote.outcome,
    committedAt: Math.max(0, Math.floor(Number(nowMs) || 0)),
    awakenedAt: 0,
  };
}

export function resolveJackpotResources(currentResources, record) {
  const next = createZeroResourceTotals();
  const deltas = createZeroResourceTotals();
  for (const key of RESOURCE_KEYS) {
    const current = Math.max(0, Math.floor(Number(currentResources?.[key]) || 0));
    const escrow = Math.max(0, Math.floor(Number(record?.escrow?.[key]) || 0));
    const award = record?.outcome === "win" ? escrow * cfg.resourceMultiplier : 0;
    if (!safeCount(current) || !safeCount(award) || !Number.isSafeInteger(current + award)) {
      return { success: false, reason: `${getResourceDisplayName(key)} would exceed safe inventory bounds.` };
    }
    next[key] = current + award;
    deltas[key] = record?.outcome === "win" ? award : -escrow;
  }
  return { success: true, next, deltas };
}

export function formatJackpotResourceChanges(deltas) {
  return RESOURCE_KEYS
    .filter(key => Number(deltas?.[key]) !== 0)
    .map(key => {
      const value = Number(deltas[key]);
      const sign = value > 0 ? "+" : "−";
      return `${getResourceDisplayName(key).toUpperCase()}  ${sign}${Math.abs(value).toLocaleString()}`;
    })
    .join("\n");
}

export function summarizeJackpotEscrow(escrow) {
  return RESOURCE_KEYS
    .filter(key => (escrow?.[key] || 0) > 0)
    .map(key => `${getResourceDisplayName(key)} ${escrow[key].toLocaleString()}`)
    .join(", ");
}
