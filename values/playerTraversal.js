export const PLAYER_TRAVERSAL_CONFIG = Object.freeze({
  jump: Object.freeze({
    heightTiles: 1.2,
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
