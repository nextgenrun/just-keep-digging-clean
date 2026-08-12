import { LEVEL_CONFIG } from "./levelConfig.js";
import { PLAYER_PERSISTENCE_CONFIG } from "./playerPersistence.js";

export const PROGRESSION_LIMITS = Object.freeze({
  money: Number.MAX_SAFE_INTEGER,
  resourceTotal: Number.MAX_SAFE_INTEGER,
  gemPower: PLAYER_PERSISTENCE_CONFIG.maximumGemPower,
  coordinatePx: PLAYER_PERSISTENCE_CONFIG.maximumCoordinatePx,
  level: LEVEL_CONFIG.HARDCAP,
  xp: Number.MAX_SAFE_INTEGER,
  cooldownMs: 24 * 60 * 60 * 1000,
  rewardAmount: 1_000_000_000,
});

export function validateBoundedNumber(
  value,
  { name = "value", min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {},
) {
  if (!Number.isFinite(value)) return { ok: false, reason: `${name}-not-finite` };
  if (integer && !Number.isInteger(value)) return { ok: false, reason: `${name}-not-integer` };
  if (value < min || value > max) return { ok: false, reason: `${name}-out-of-range` };
  return { ok: true, value };
}

export function validateMoney(value) {
  return validateBoundedNumber(value, { name: "money", max: PROGRESSION_LIMITS.money });
}

export function validateGemPower(value, maximum = PROGRESSION_LIMITS.gemPower) {
  const max = Math.min(PROGRESSION_LIMITS.gemPower, Number.isFinite(maximum) ? maximum : 0);
  return validateBoundedNumber(value, { name: "gem-power", max });
}

export function validateResourceTotal(value) {
  return validateBoundedNumber(value, {
    name: "resource-total",
    max: PROGRESSION_LIMITS.resourceTotal,
    integer: true,
  });
}

export function validateCooldownMs(value) {
  return validateBoundedNumber(value, {
    name: "cooldown",
    max: PROGRESSION_LIMITS.cooldownMs,
  });
}

export function validateLevel(value) {
  return validateBoundedNumber(value, {
    name: "level",
    min: 1,
    max: PROGRESSION_LIMITS.level,
    integer: true,
  });
}

export function validateRewardMutation(reward) {
  if (!reward || typeof reward !== "object") return { ok: false, reason: "reward-missing" };
  if (typeof reward.id !== "string" || !reward.id.trim() || reward.id.length > 128) {
    return { ok: false, reason: "reward-id-invalid" };
  }
  for (const [name, value] of Object.entries(reward.amounts || {})) {
    const checked = validateBoundedNumber(value, {
      name: `reward-${name}`,
      max: PROGRESSION_LIMITS.rewardAmount,
    });
    if (!checked.ok) return checked;
  }
  return { ok: true, value: reward };
}

export function validateSaveSnapshotIntegrity(snapshot) {
  const issues = [];
  const world = snapshot?.worldIdentity;
  for (const field of ["seed", "width", "depth", "topAirRows"]) {
    if (!Number.isInteger(world?.[field])) issues.push(`world-${field}-invalid`);
  }
  for (const [key, value] of Object.entries(snapshot?.resources || {})) {
    const checked = validateResourceTotal(value);
    if (!checked.ok) issues.push(`resource-${key}-${checked.reason}`);
  }
  const money = validateMoney(snapshot?.upgrades?.money ?? 0);
  if (!money.ok) issues.push(money.reason);
  if (snapshot?.levelData) {
    const level = validateLevel(snapshot.levelData.level);
    if (!level.ok) issues.push(level.reason);
    for (const field of ["currentXP", "totalXP", "automaticMilestoneRewards"]) {
      const checked = validateBoundedNumber(snapshot.levelData[field] ?? 0, {
        name: field,
        max: PROGRESSION_LIMITS.xp,
        integer: true,
      });
      if (!checked.ok) issues.push(checked.reason);
    }
  }
  const player = snapshot?.playerStateData;
  if (player) {
    for (const field of ["bodyX", "bodyY"]) {
      const checked = validateBoundedNumber(player[field], {
        name: field,
        max: PROGRESSION_LIMITS.coordinatePx,
      });
      if (!checked.ok) issues.push(checked.reason);
    }
    const gp = validateGemPower(player.gemPower);
    if (!gp.ok) issues.push(gp.reason);
  }
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}
