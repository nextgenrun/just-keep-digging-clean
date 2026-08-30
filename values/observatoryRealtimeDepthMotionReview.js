export const OBSERVATORY_REALTIME_DEPTH_MOTION_REVIEW = Object.freeze({
  sceneKey: "ObservatoryRealtimeDepthMotionReview",
  pipelineKey: "ObservatoryDepthMotionPipeline",
  viewport: Object.freeze({ width: 1280, height: 720 }),
  loopSeconds: 24,
  source: Object.freeze({
    key: "observatory-source",
    path: "../../../sprites/backgrounds/world-visual-v2/far/sky-cohesion-v1/2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp",
  }),
  depth: Object.freeze({ key: "observatory-depth", path: "./pack/depth-v2-small.png" }),
  domains: Object.freeze({ key: "observatory-domains", path: "./pack/motion-domain-map.png" }),
  defaults: Object.freeze({ motionStrength: 1.4, depthStrength: 0.72, paused: false, view: "split" }),
  motion: Object.freeze({
    upperAmplitudeUv: 0.0105,
    lowerAmplitudeUv: 0.014,
    depthAmplitudeUv: 0.006,
    rigidSuppression: 0.98,
    reliefStrength: 0.11,
  }),
  viewModes: Object.freeze({ source: 0, runtime: 1, split: 2, depth: 3, domains: 4 }),
});
