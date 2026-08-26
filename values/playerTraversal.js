export const PLAYER_TRAVERSAL_CONFIG = Object.freeze({
  jump: Object.freeze({
    heightTiles: 1.2,
    momentumEnabledByDefault: true,
    momentumRollbackQuery: "jumpMomentum",
    maxSpeedMultiplier: 1.05,
    accelerationTilesPerSecondSquared: 7,
    reverseAccelerationTilesPerSecondSquared: 10.5,
    releaseDragTilesPerSecondSquared: 1.1,
    stopSpeedPxPerSecond: 4,
    maxDeltaSeconds: 0.05,
  }),

  ledgeAssist: Object.freeze({
    enabledByDefault: true,
    rollbackQuery: "ledgeAssist",
    capture: Object.freeze({
      maxHorizontalGapTiles: 0.28,
      passiveHorizontalGapTiles: 0.1,
      verticalSnapToleranceTiles: 0.42,
      gripBodyHeightRatio: 0.24,
      minimumFallSpeedTilesPerSecond: 0.08,
      velocityDirectionThresholdTilesPerSecond: 0.12,
      wallGapTiles: 0.015,
    }),
    hang: Object.freeze({
      minimumDurationMs: 110,
      dropVelocityTilesPerSecond: 1.6,
      regrabCooldownMs: 260,
    }),
    climb: Object.freeze({
      durationMs: 1167,
      liftEndProgress: 0.68,
      maxDeltaSeconds: 0.05,
    }),
  }),

  flight: Object.freeze({
    maxSpeedMultiplier: 1.35,
    accelerationTilesPerSecondSquared: 10.5,
    reverseAccelerationTilesPerSecondSquared: 16,
    brakingTilesPerSecondSquared: 7.5,
    coastSteeringTilesPerSecondSquared: 4.5,
    coastDragTilesPerSecondSquared: 1.25,
    takeoffImpulseSpeedMultiplier: 0.48,
    takeoffAssistSeconds: 0.28,
    coastStopSpeedPxPerSec: 8,
    maxDeltaSeconds: 0.05,
  }),
});

export function resolvePlayerJumpMomentumEnabled(
  search = globalThis.location?.search || "",
  config = PLAYER_TRAVERSAL_CONFIG.jump,
) {
  const params = new URLSearchParams(search);
  const value = params.get(config.momentumRollbackQuery);
  if (value === "0" || value === "false" || value === "off") return false;
  return config.momentumEnabledByDefault === true;
}

export function resolvePlayerLedgeAssistEnabled(
  search = globalThis.location?.search || "",
  config = PLAYER_TRAVERSAL_CONFIG.ledgeAssist,
) {
  const params = new URLSearchParams(search);
  const value = params.get(config.rollbackQuery);
  if (value === "0" || value === "false" || value === "off") return false;
  return config.enabledByDefault === true;
}
