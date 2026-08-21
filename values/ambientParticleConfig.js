/**
 * Ambient atmosphere particles — floating dust motes underground,
 * occasional falling debris. Pooled, capped, FPS-guarded.
 */
export const AMBIENT_PARTICLE_CONFIG = Object.freeze({
  enabled: true,
  minDepthMeters: 4,        // only underground
  suppressInBuildings: true,
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
  // Presentation-only depth identities. These never alter world generation or
  // rewards; they keep the ambient pass legible as the material palette changes.
  depthBands: Object.freeze([
    Object.freeze({
      id: "shallow-earth",
      minDepthMeters: 4,
      moteColor: 0xd8cfa8,
      debrisColor: 0x6e5a44,
      alphaScale: 1,
      driftScale: 1,
      debrisChanceScale: 0.85,
    }),
    Object.freeze({
      id: "mineral-veins",
      minDepthMeters: 320,
      moteColor: 0xd2b37f,
      debrisColor: 0x76543d,
      alphaScale: 1.08,
      driftScale: 0.9,
      debrisChanceScale: 1,
    }),
    Object.freeze({
      id: "deep-forge",
      minDepthMeters: 1000,
      moteColor: 0xc27a5d,
      debrisColor: 0x774437,
      alphaScale: 1.14,
      driftScale: 0.72,
      debrisChanceScale: 1.15,
    }),
    Object.freeze({
      id: "abyssal-crystal",
      minDepthMeters: 2200,
      moteColor: 0x9d8ac7,
      debrisColor: 0x514764,
      alphaScale: 1.2,
      driftScale: 0.58,
      debrisChanceScale: 0.72,
    }),
  ]),
});

export function resolveAmbientParticleDepthBand(
  depthMeters,
  config = AMBIENT_PARTICLE_CONFIG,
) {
  const depth = Math.max(0, Number(depthMeters) || 0);
  const bands = Array.isArray(config?.depthBands) ? config.depthBands : [];
  let active = null;
  for (const band of bands) {
    if (depth >= (Number(band?.minDepthMeters) || 0)) active = band;
  }
  return active;
}
