// Review-only per-chapter background and motion authority for the ground map.

const LIBRARY = "visual-approval-previews/surface-landscape-final-library-v1";
const PACK = "testing/animation-sandbox/2026-08-30-ground-level-world-v1/background-pack";

const freezeList = values => Object.freeze(values.map(value => Object.freeze(value)));

const reference = (chapterId, panel, slug, hash, immutable, plannedMotion) => Object.freeze({
  chapterId,
  renderMode: "approved-reference-static",
  segmentationStatus: "awaiting-independent-layer-pack",
  source: Object.freeze({
    key: `ground-reference-${chapterId}`,
    path: `${LIBRARY}/2026-07-28-${String(panel).padStart(2, "0")}-${slug}.png`,
    width: 1983,
    height: 793,
    sha256: hash,
  }),
  immutable: Object.freeze(immutable),
  activeMotion: Object.freeze([]),
  plannedMotion: Object.freeze(plannedMotion),
});

export const WORLD_VISUAL_GROUND_BACKGROUND_MOTION_REVIEW = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  version: "ground-background-piecemeal-v1-2026-08-31",
  genericFallback: false,
  repeatedBackdropAllowed: false,
  defaultStaticPolicy: "unsegmented-pixels-never-move",
  referenceDisplay: Object.freeze({ width: 1536, height: 614, x: 768, y: 432, depth: -19 }),
  runtimeDisplay: Object.freeze({ width: 1590, height: 896, x: 768, y: 432, depth: -19 }),
  town: Object.freeze({
    chapterId: "merchant-hearth",
    renderMode: "existing-town-video",
    segmentationStatus: "existing-runtime-authority",
    source: null,
    immutable: Object.freeze(["town-buildings", "ground", "merchant-layout"]),
    activeMotion: Object.freeze(["unchanged-town-video"]),
    plannedMotion: Object.freeze(["individual-lanterns", "chimney-smoke", "hearth-flame"]),
  }),
  profiles: freezeList([
    reference("titan-west", 2, "x020-039-titan-walk-west-v1", "9a70b9ea6e0d9283b8960a244d6b1da94fef375a28ba8fbbf7c2c272e9c4ad7d", ["mountains", "forest", "Titans", "plinths", "gate", "ground"], ["thin-valley-clouds", "individual-spirit-flames", "gate-emissive"]),
    reference("titan-east", 3, "x040-059-titan-walk-east-v2", "675330d6b9e9acac849dd7aa26932ec39176af8502763d06c409b7c2478df3dc", ["mountains", "forest", "Titans", "garden", "ground"], ["thin-valley-clouds", "individual-spirit-flames", "garden-foliage", "distant-town-lights"]),
    reference("craftsmen", 4, "x060-079-craftsmen-commons-v1", "29125eac8160b89b7ca6baa25002730d4ea5aebc8d4ef425c026786d603e4902", ["mountains", "forest", "workshop", "carts", "ground"], ["chimney-smoke", "forge-smoke", "individual-lanterns", "campfire-flame"]),
    reference("skywell", 5, "x080-099-skywell-market-v1", "b183c838aaec40904214caa79075734c3ccddc154897e82c2bc8c4517d0683b9", ["mountains", "forest", "market-stalls", "well-structure", "ground"], ["well-water", "portal-emissive", "individual-lanterns", "thin-valley-mist", "stall-cloth"]),
    reference("relic-grove", 6, "x100-119-three-relic-gate-grove-v1", "e2fdf5db83d535ab20e34c1a94f3665201eff17a7ebba2e864b0da7fba96c7cb", ["mountains", "forest", "three-gates", "wagon", "ground"], ["three-gate-emissives", "low-grove-mist", "individual-lanterns", "edge-foliage"]),
    reference("mine-threshold", 7, "x120-139-mine-threshold-drop-seam-v1", "4d358293a600a3cc63a555e3b6e8b79e8934eb3f9e8c79dcd02eaa7544855e6d", ["mountains", "mine-architecture", "bridge", "ground", "drop-seam"], ["threshold-mist", "warning-lights", "distant-valley-cloud", "hanging-cloth"]),
    reference("arrival-forge", 8, "x140-159-level2-arrival-forge-v1", "426500355ad62a6e6c8d8a9e6036b08bf474523694a49cec02974abeb46af5f5", ["mountains", "forge-architecture", "bridge", "ground"], ["forge-smoke", "embers", "forge-flame", "individual-lanterns"]),
    reference("caravan-rest", 9, "x160-179-caravan-rest-v1", "dae079b65e3388786ba2db613bf2758739bf951bf49ebb8ce1bec02e9f917b27", ["mountains", "forest", "wagons", "shelters", "ground"], ["campfire-flame", "campfire-smoke", "wagon-cloth", "individual-lanterns"]),
    reference("starwell-herb", 10, "x180-199-starwell-herb-court-v1", "f4fd4dfc86bad36c0fe624d168b767478d32f931fbf902fc6d50e9b29d3db864", ["mountains", "court-architecture", "planters", "ground"], ["starwell-water", "portal-emissive", "herb-foliage", "individual-lanterns", "low-mist"]),
    reference("timberwright", 11, "x200-219-timberwright-yard-v1", "0bcfa71e2547663b2485c7a7d57ca39f403fbebcdec988f744a0c76331d4ca7c", ["mountains", "yard-buildings", "crane", "timber-stacks", "ground"], ["sawdust", "yard-smoke", "hanging-rope-cloth", "individual-lanterns"]),
    Object.freeze({
      chapterId: "observatory",
      renderMode: "segmented-runtime",
      segmentationStatus: "independent-layer-pack-v1",
      source: Object.freeze({ key: "ground-observatory-static-v1", path: `${PACK}/observatory-static-base-v1.webp`, width: 2048, height: 1152, sha256: "8a245862786cd91477e06f62606e6fa18d574d2df7efca68b85cb58f66d0e441" }),
      immutable: Object.freeze(["moon", "mountains", "forest", "terrain-geometry"]),
      activeMotion: Object.freeze(["individual-stars", "high-cloud-wisps", "valley-mist", "mountain-side-vapor"]),
      plannedMotion: Object.freeze(["individual-practical-lights", "pennants"]),
    }),
    reference("frontier-survey", 13, "x240-259-frontier-survey-garden-v1", "1d5679dd7048b1c306aa06b74932a7ddbd317427bf0ccb021c426020a4304701", ["mountains", "forest", "survey-pavilion", "garden-walls", "ground"], ["garden-foliage", "survey-cloth", "individual-lanterns", "thin-valley-mist"]),
    reference("far-east", 14, "x260-279-far-east-expedition-overlook-v1", "f303cdd076fe3e686874dbb67705c4a297be89c18883f8a01f45348121aae452", ["mountains", "expedition-buildings", "crane", "wagons", "ground"], ["expedition-flags", "brazier-flame", "brazier-smoke", "snow-or-clouds", "individual-lanterns"]),
  ]),
  observatoryAtmosphere: Object.freeze({
    star: Object.freeze({
      key: "ground-observatory-star-ids-v1",
      path: `${PACK}/observatory-star-ids-v1.png`,
      pipelineKey: "ObservatoryAuthoredSkyPipeline",
      cycleSeconds: 173,
      strength: 0.9,
    }),
    resetPaddingPx: 220,
    sprites: freezeList([
      { key: "ground-observatory-atmosphere-01", path: `${PACK}/observatory-atmosphere-01-v1.png`, x: -80, y: 116, scale: 0.40, alpha: 0.24, speed: 3.1, drift: 0.10, phase: 0.13, depth: -18.72 },
      { key: "ground-observatory-atmosphere-02", path: `${PACK}/observatory-atmosphere-02-v1.png`, x: 308, y: 178, scale: 0.34, alpha: 0.19, speed: 4.0, drift: 0.08, phase: 0.31, depth: -18.71 },
      { key: "ground-observatory-atmosphere-03", path: `${PACK}/observatory-atmosphere-03-v1.png`, x: 736, y: 238, scale: 0.30, alpha: 0.17, speed: 4.8, drift: 0.06, phase: 0.47, depth: -18.70 },
      { key: "ground-observatory-atmosphere-04", path: `${PACK}/observatory-atmosphere-04-v1.png`, x: 1192, y: 292, scale: 0.28, alpha: 0.16, speed: 5.4, drift: 0.05, phase: 0.67, depth: -18.69 },
      { key: "ground-observatory-atmosphere-05", path: `${PACK}/observatory-atmosphere-05-v1.png`, x: 94, y: 414, scale: 0.48, alpha: 0.22, speed: 2.3, drift: 0.12, phase: 0.19, depth: -18.58 },
      { key: "ground-observatory-atmosphere-06", path: `${PACK}/observatory-atmosphere-06-v1.png`, x: 462, y: 452, scale: 0.55, alpha: 0.20, speed: 2.8, drift: 0.10, phase: 0.38, depth: -18.57 },
      { key: "ground-observatory-atmosphere-07", path: `${PACK}/observatory-atmosphere-07-v1.png`, x: 846, y: 488, scale: 0.50, alpha: 0.18, speed: 3.4, drift: 0.09, phase: 0.56, depth: -18.56 },
      { key: "ground-observatory-atmosphere-08", path: `${PACK}/observatory-atmosphere-08-v1.png`, x: 1240, y: 516, scale: 0.44, alpha: 0.16, speed: 3.8, drift: 0.07, phase: 0.79, depth: -18.55 },
      { key: "ground-observatory-atmosphere-10", path: `${PACK}/observatory-atmosphere-10-v1.png`, x: 1018, y: 352, scale: 0.34, alpha: 0.18, speed: 2.6, drift: 0.05, phase: 0.26, depth: -18.48 },
      { key: "ground-observatory-atmosphere-11", path: `${PACK}/observatory-atmosphere-11-v1.png`, x: 1388, y: 382, scale: 0.30, alpha: 0.17, speed: 3.0, drift: 0.04, phase: 0.71, depth: -18.47 },
    ]),
  }),
});

export function resolveGroundBackgroundProfile(chapterId) {
  if (chapterId === WORLD_VISUAL_GROUND_BACKGROUND_MOTION_REVIEW.town.chapterId) {
    return WORLD_VISUAL_GROUND_BACKGROUND_MOTION_REVIEW.town;
  }
  return WORLD_VISUAL_GROUND_BACKGROUND_MOTION_REVIEW.profiles.find(profile => profile.chapterId === chapterId) || null;
}

export function getGroundBackgroundPreloadAssets() {
  const config = WORLD_VISUAL_GROUND_BACKGROUND_MOTION_REVIEW;
  const backgrounds = config.profiles.map(profile => profile.source);
  const star = config.observatoryAtmosphere.star;
  return Object.freeze([...backgrounds, star, ...config.observatoryAtmosphere.sprites]);
}
