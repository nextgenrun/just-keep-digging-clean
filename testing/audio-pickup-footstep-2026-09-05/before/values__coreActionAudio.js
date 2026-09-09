// A recording approval does not make that recording suitable for every action.
// Explicit physical-contact shortlists; the full approved source registry stays intact.
export const CORE_ACTION_AUDIO = Object.freeze({
  context: "core-material",
  banks: Object.freeze({
    footstepDirt: Object.freeze(["freesound-270415", "freesound-270419", "freesound-270418", "freesound-270417"]),
    mineEarth: Object.freeze(["freesound-651292", "freesound-651293"]),
    mineStone: Object.freeze(["freesound-674384", "freesound-674385", "freesound-674386"]),
    // These recordings were incorrectly grouped with stone. They are actual pickaxe contacts.
    mineMetal: Object.freeze(["freesound-728756", "freesound-728757", "freesound-728758", "freesound-728759"]),
    crystalBreak: Object.freeze(["freesound-536921", "freesound-703115"]),
  }),
  gain: Object.freeze({ footstepDirt: 0.76, mineEarth: 0.74, mineStone: 0.82, mineMetal: 0.85, crystalBreak: 0.75 }),
  swingGain: 0.55,
  fallbackContactGain: 0.7,
  breakGain: 0.68,
  // Retain the two short sole contacts; the longer third clip was over 12 dB louder.
  hardFootsteps: Object.freeze([
    Object.freeze({
      key: "footsteps-1",
      gain: 0.288087,
      peak: 0.0725907,
      duration: 0.127729,
      activeRmsDb: -32.15,
    }),
    Object.freeze({
      key: "footsteps-2",
      gain: 0.602351,
      peak: 0.0637714,
      duration: 0.206083,
      activeRmsDb: -38.557,
    }),
  ]),
  minFootstepMs: 165,
  minWalkSpeed: 12,
  hardLandingSpeed: 600,
  hardLandingGain: 0.6,
  landingFootstepGain: 1.2,
});
