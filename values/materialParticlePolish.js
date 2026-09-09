/** Presentation-only refinement of the approved v3 atlases; no new raster assets. */
const response = (travel, gravity, spin, flashScale, fade, scuffAlpha) => Object.freeze({
  travel, gravity, spin, flashScale, fade, scuffAlpha,
});
const EARTH = response(0.78, 1.2, 0.7, 1, 1.2, 0.7);
const ROCK = response(1, 1.12, 1, 0.94, 0.95, 0.54);
const METAL = response(1.12, 1.08, 1.15, 0.9, 0.86, 0.54);
const CRYSTAL = response(1.06, 0.82, 0.72, 0.94, 1.08, 0.54);

export const MATERIAL_PARTICLE_POLISH = Object.freeze({
  enabled: true,
  queryParam: "particlePolish",
  disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  frameSuffix: "detail",
  alphaThreshold: 12,
  framePadding: 2,
  shardsSha256: "7b4d5fb3c4ca70fbcf3bab8eeb0aff80f4b5c88b22f72c1188e374fc38aa9593",
  responses: Object.freeze({
    dirt: EARTH, damp: EARTH, hard: ROCK, copper: METAL, bronze: METAL,
    iron: METAL, steel: METAL, silver: METAL, gold: METAL, lava: EARTH,
    obsidian: ROCK, ember: ROCK, magma: CRYSTAL, crystal: CRYSTAL,
    geode: CRYSTAL, relic: ROCK, special: CRYSTAL,
  }),
  // Exclude piles, mini-explosions and rings from independently tumbling chips.
  chipFrames: Object.freeze(Object.fromEntries(Object.entries({
    dirt: [2, 3, 4, 5], damp: [2, 3, 4, 5], hard: [1, 3, 4],
    copper: [2, 3, 4, 5], bronze: [3, 4, 5], iron: [3, 4, 5],
    steel: [1, 2, 4, 5], silver: [1, 2, 3, 4, 5], gold: [1, 3, 4],
    lava: [2, 3, 4, 5], obsidian: [1, 2, 3, 4, 5], ember: [2, 3, 4, 5],
    magma: [1, 2, 3, 4, 5], crystal: [1, 2, 3, 4, 5], geode: [2, 3, 4, 5],
    relic: [2, 3, 4, 5], special: [2, 3, 4, 5],
  }).map(([key, frames]) => [key, Object.freeze(frames)]))),
  foot: Object.freeze({
    sizeTiles: Object.freeze([0.035, 0.06]), count: 5,
    scuffFrame: "p04", scuffOriginY: 0.79,
    scuffWidthTiles: 0.34, scuffStartScale: 0.9, scuffEndScale: 1.25,
    scuffDriftTiles: 0.055, scuffFadeMs: 280,
    minimumDepth: 38.2, depthOffset: 0.2,
    floorInsetTiles: 0.006, reducedTravel: 0.3,
    postUpdateEvent: "postupdate", presentedEvent: "ground-footstep-presented",
    maxPending: 2,
  }),
  hit: Object.freeze({ sizeTiles: Object.freeze([0.022, 0.047]) }),
  destruction: Object.freeze({
    maxLive: 96, shardDelayMs: 28, reducedShardDelayMs: 12,
    sizeTiles: Object.freeze([0.055, 0.115]), fineScale: 0.48,
    phaseTimesMs: Object.freeze([0, 38, 94, 174]),
    enterMs: 38, enterEase: "Cubic.Out", fadeMs: 165,
    launchMs: Object.freeze([85, 130]), settleMs: Object.freeze([210, 300]),
    cameraScale: 1.12,
  }),
});

// Alpha >= 12 bounds [left, top, right, bottom], before a 2 px sampling gutter.
// Coordinates refer to each ORIGINAL 80 px cell. Runtime art remains byte-identical.
export const MATERIAL_PARTICLE_BOUNDS = Object.freeze({
  dirt: [[9,24,71,55],[23,20,57,59],[25,22,54,58],[34,33,45,47],[35,33,44,47]],
  damp: [[9,23,71,56],[31,29,48,50],[36,34,44,45],[34,31,46,48],[36,36,44,44]],
  hard: [[20,17,60,62],[9,20,71,59],[23,22,57,57],[25,23,55,56],[13,24,67,56]],
  copper: [[15,17,65,63],[22,21,58,58],[26,26,54,53],[27,26,53,54],[27,27,52,52]],
  bronze: [[9,18,71,61],[15,13,65,66],[26,26,53,54],[28,27,51,52],[29,29,50,51]],
  iron: [[14,9,65,71],[15,19,65,60],[20,22,59,58],[26,26,54,53],[26,26,54,53]],
  steel: [[16,11,63,68],[18,19,61,61],[18,19,61,60],[28,29,51,51],[28,29,52,50]],
  silver: [[18,18,61,61],[29,28,51,51],[29,29,51,50],[31,31,49,48],[33,33,47,46]],
  gold: [[20,17,60,62],[9,20,71,59],[23,22,57,57],[25,23,55,56],[13,24,67,56]],
  lava: [[9,30,71,50],[23,22,56,58],[27,26,53,53],[29,29,51,51],[28,29,51,51]],
  obsidian: [[22,16,57,63],[19,21,60,58],[27,28,53,52],[29,28,51,51],[30,28,50,52]],
  ember: [[9,20,71,59],[23,20,57,59],[29,29,51,51],[24,28,55,51],[30,30,49,50]],
  magma: [[27,20,53,59],[26,23,54,56],[25,30,55,50],[30,30,49,50],[31,28,49,51]],
  crystal: [[27,20,53,59],[26,23,54,56],[25,30,55,50],[30,30,49,50],[31,28,49,51]],
  geode: [[9,26,71,53],[24,18,55,61],[28,28,51,52],[30,28,49,51],[31,30,48,50]],
  relic: [[25,9,55,71],[27,22,53,57],[25,24,55,55],[29,29,51,50],[31,28,49,52]],
  special: [[9,24,71,56],[23,27,57,53],[28,29,52,51],[31,31,49,49],[31,31,49,49]],
});

export function isMaterialParticlePolishEnabled(search = globalThis.location?.search || "") {
  const value = new URLSearchParams(search).get(MATERIAL_PARTICLE_POLISH.queryParam)?.trim().toLowerCase();
  return MATERIAL_PARTICLE_POLISH.enabled && !MATERIAL_PARTICLE_POLISH.disabledValues.includes(value);
}

export function materialParticleResponse(family) {
  return MATERIAL_PARTICLE_POLISH.responses[family] || ROCK;
}
