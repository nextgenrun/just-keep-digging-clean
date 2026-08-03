/**
 * Presentation-only frame pacing for secondary Phaser motion.
 * Values preserve the existing 60 FPS look while making updates independent
 * of how many render frames happen during the same wall-clock interval.
 */
const REFERENCE_FPS = 60;

export const ANIMATION_SMOOTHNESS_CONFIG = Object.freeze({
  referenceFps: REFERENCE_FPS,
  referenceFrameMs: 1000 / REFERENCE_FPS,
  maxCatchUpSteps: 3,

  biome: Object.freeze({
    blendResponsePerReferenceFrame: 0.02,
  }),

  groundEffects: Object.freeze({
    mistAlphaResponsePerReferenceFrame: 0.02,
    fireflyAlphaResponsePerReferenceFrame: 0.03,
    fireflyBoundaryVelocityPerReferenceFrame: 0.1,
    inactiveWindFadePerReferenceFrame: 0.02,
  }),

  lootPickup: Object.freeze({
    rotationRadiansPerReferenceFrame: 0.045,
  }),

  skyStar: Object.freeze({
    rotationDegreesPerReferenceFrame: 0.35,
    rotationDegreesPerRarityPerReferenceFrame: 0.12,
  }),
});
