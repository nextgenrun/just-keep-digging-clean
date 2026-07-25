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
      // Option C temporarily powers both walk and run. Matching the physical
      // gait prevents a cadence drop at the run threshold until run gets its
      // own reviewed source clip.
      strideTilesPerCycle: 1.55,
      minTimeScale: 0.75,
      maxTimeScale: 2.8,
    }),
    climb: Object.freeze({
      strideTilesPerCycle: 1,
      minTimeScale: 0.75,
      maxTimeScale: 2.5,
    }),
  }),

  airborne: Object.freeze({
    fallingEnterVyPxPerSec: 70,
    fallingExitVyPxPerSec: 24,
  }),
});
