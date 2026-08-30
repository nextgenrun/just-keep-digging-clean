export const PLAYER_KINEMATIC_MOTION_CONFIG = Object.freeze({
  enabled: true,

  anchor: Object.freeze({
    ualGroundedOffsetPx: 0,
    legacyGroundedOffsetPx: 6,
  }),

  sampling: Object.freeze({
    maxDeltaMs: 100,
    maxDisplacementTiles: 1.5,
    responsePerSecond: 18,
    zeroSpeedEpsilonPxPerSec: 4,
  }),

  locomotion: Object.freeze({
    walk: Object.freeze({
      strideTilesPerCycle: 1.55,
      minTimeScale: 0.75,
      maxTimeScale: 2.8,
    }),
    run: Object.freeze({
      // The preserved run animation key carries Mixamo Standard Walk in the
      // Survival profile. Its reviewed stride prevents feet sliding while the
      // gameplay speed remains unchanged.
      strideTilesPerCycle: 1.55,
      minTimeScale: 0.75,
      maxTimeScale: 2.8,
    }),
  }),

  airborne: Object.freeze({
    fallingEnterVyPxPerSec: 70,
    fallingExitVyPxPerSec: 24,
  }),
});
