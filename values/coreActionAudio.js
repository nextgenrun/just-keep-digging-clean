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
    coinPickup: Object.freeze(["freesound-573361", "freesound-573354"]),
    coinReward: Object.freeze(["freesound-573353", "freesound-573352"]),
  }),
  gain: Object.freeze({ footstepDirt: 0.3, mineEarth: 0.74, mineStone: 0.82, mineMetal: 0.85, crystalBreak: 0.75, coinPickup: 0.28, coinReward: 0.18 }),
  swingGain: 0.55,
  fallbackContactGain: 0.7,
  breakGain: 0.68,
  // Retain the two short sole contacts; the longer third clip was over 12 dB louder.
  hardFootsteps: Object.freeze([
    Object.freeze({
      key: "footsteps-1",
      path: "sound/soundEffects/costume-sounds/footsteps/footstep-3.ogg",
      gain: 0.113719,
      peak: 0.1026587,
      duration: 0.127729,
      activeRmsDb: -32.15,
    }),
    Object.freeze({
      key: "footsteps-2",
      path: "sound/soundEffects/costume-sounds/footsteps/footstep-4.ogg",
      gain: 0.12945,
      peak: 0.09018639,
      duration: 0.206083,
      activeRmsDb: -38.557,
    }),
  ]),
  // Ground contacts stay secondary to mining, with no sub-quarter-second chatter.
  minFootstepMs: 240,
  pickups: Object.freeze({
    resourceGain: 0.225,
    specialResourceGain: 0.3,
    pickupGapMs: 850,
    shopGapMs: 700,
    purchaseFallbackGain: 0.16,
    rewardFallbackGain: 0.13,
  }),
  minWalkSpeed: 12,
  // Landing is a quiet sole contact at every speed, never block destruction.
  landingMinimumStrength: 0.3,
  landingFootstepGain: 0.8,
});
