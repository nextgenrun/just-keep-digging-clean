/**
 * Ambient atmosphere particles — floating dust motes underground,
 * occasional falling debris. Pooled, capped, FPS-guarded.
 */
export const AMBIENT_PARTICLE_CONFIG = Object.freeze({
  enabled: true,
  minDepthMeters: 4,        // only underground
  maxParticles: 26,         // hard cap on live motes
  spawnIntervalMs: 240,     // one mote per tick when under cap
  disableBelowFps: 42,
  // Dust motes — tiny, slow, additive drift
  mote: Object.freeze({
    sizeMin: 0.8,
    sizeMax: 2.2,
    alphaMin: 0.12,
    alphaMax: 0.34,
    color: 0xd8cfa8,
    driftXMin: -8,          // px/s
    driftXMax: 8,
    driftYMin: -14,         // gentle upward float
    driftYMax: 4,
    lifeMinMs: 2600,
    lifeMaxMs: 5200,
    depth: 33,              // under fx (35), above tiles
  }),
  // Falling debris trickle — rare grit falling from cave ceilings
  debris: Object.freeze({
    enabled: true,
    chancePerSpawn: 0.12,   // chance a spawn tick emits debris instead
    sizeMin: 1.2,
    sizeMax: 2.6,
    color: 0x6e5a44,
    alpha: 0.55,
    fallSpeedMin: 60,
    fallSpeedMax: 140,
    lifeMinMs: 700,
    lifeMaxMs: 1400,
  }),
});