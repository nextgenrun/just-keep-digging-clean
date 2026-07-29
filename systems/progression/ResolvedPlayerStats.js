import { PLAYER_STATS_CONFIG } from "../../values/playerStats.js";

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveMovementSpeed({
  baseSpeed = PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
  flatBonus = 0,
  multiplier = 1,
  actionBonus = 0,
  override = null,
} = {}) {
  const resolvedBase = Math.max(0, finite(baseSpeed, PLAYER_STATS_CONFIG.walkSpeedPxPerSec));
  const resolvedFlat = finite(flatBonus);
  const resolvedMultiplier = Math.max(0, finite(multiplier, 1));
  const resolvedAction = finite(actionBonus);
  const permanentSpeed = Number.isFinite(override)
    ? Math.max(0, override)
    : (resolvedBase + resolvedFlat) * resolvedMultiplier;
  return Math.max(0, permanentSpeed + resolvedAction);
}

export function createResolvedMovementSnapshot(options = {}) {
  const baseSpeed = Math.max(
    0,
    finite(options.baseSpeed, PLAYER_STATS_CONFIG.walkSpeedPxPerSec),
  );
  const permanentSpeed = resolveMovementSpeed({
    ...options,
    baseSpeed,
    actionBonus: 0,
  });
  const currentSpeed = resolveMovementSpeed({ ...options, baseSpeed });
  const permanentBonus = permanentSpeed - baseSpeed;
  return Object.freeze({
    baseMovementSpeedPxPerSec: baseSpeed,
    movementSpeedPxPerSec: currentSpeed,
    permanentMovementSpeedPxPerSec: permanentSpeed,
    movementSpeedBonusPxPerSec: permanentBonus,
    movementSpeedBonusPercent: baseSpeed > 0
      ? (permanentBonus / baseSpeed) * 100
      : 0,
  });
}
