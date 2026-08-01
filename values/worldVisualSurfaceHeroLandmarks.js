// Defines the rollback-safe asset, scale, depth, fade, placement, and suppression SSOT for surface hero landmarks V4.
const ROOT = "sprites/environment/surface-hero-landmarks-v4";

const asset = (
  key,
  path,
  width,
  height,
  heightMeters,
  role,
) => Object.freeze({
  key,
  path: `${ROOT}/${path}`,
  expectedSource: Object.freeze({ width, height }),
  heightMeters,
  role,
});

const placement = (
  id,
  assetId,
  tileX,
  chapterId,
  distanceProfile,
  exceptions = {},
) => Object.freeze({
  id,
  assetId,
  level: "level2",
  tileX,
  chapterId,
  distanceProfile,
  allowedProtectedZoneId: exceptions.allowedProtectedZoneId || null,
  allowedLowProfileZoneId: exceptions.allowedLowProfileZoneId || null,
});

export const WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS = Object.freeze({
  arrivalForgeShelter: asset(
    "surface-hero-arrival-forge-shelter-v4",
    "arrival-forge-shelter-v4.png", 1207, 896, 6.2,
    "chapter-scale-arrival-forge",
  ),
  caravanWaystation: asset(
    "surface-hero-caravan-waystation-v4",
    "caravan-waystation-v4.png", 1421, 714, 5.7,
    "chapter-scale-caravan-waystation",
  ),
  starwellPortalFrame: asset(
    "surface-hero-starwell-portal-frame-v4",
    "starwell-portal-frame-v4.png",
    1149,
    1003,
    8.1,
    "live-portal-architectural-frame",
  ),
  timberwrightYard: asset(
    "surface-hero-timberwright-yard-v4",
    "timberwright-yard-v4.png", 1145, 923, 6.4,
    "chapter-scale-timberwright-yard",
  ),
  observatoryTelescope: asset(
    "surface-hero-observatory-telescope-v4",
    "observatory-telescope-v4.png",
    1174,
    1032,
    8.7,
    "chapter-scale-observatory",
  ),
  frontierSurveyPavilion: asset(
    "surface-hero-frontier-survey-pavilion-v4",
    "frontier-survey-pavilion-v4.png", 1406, 905, 5.4,
    "chapter-scale-frontier-survey",
  ),
  threeKingsOverlook: asset(
    "surface-hero-three-kings-overlook-v4",
    "three-kings-overlook-v4.png",
    1344,
    954,
    8.2,
    "rear-depth-three-king-monument",
  ),
});

export const WORLD_VISUAL_SURFACE_HERO_LANDMARKS = Object.freeze({
  enabled: true,
  version: "surface-hero-landmarks-v4-seven-chapter-static-2026-07-30",
  designRule: "one-landmark-clear-silhouette-supported-by-authored-prop-clusters",
  query: Object.freeze({
    all: "surfaceHeroLandmarksV4",
    arrivalForgeShelter: "arrivalForgeLandmarkV4",
    caravanWaystation: "caravanLandmarkV4",
    starwellPortalFrame: "starwellLandmarkV4",
    timberwrightYard: "timberwrightLandmarkV4",
    observatoryTelescope: "observatoryLandmarkV4",
    frontierSurveyPavilion: "frontierLandmarkV4",
    threeKingsOverlook: "threeKingsLandmarkV4",
    disabledValue: "0",
  }),
  transformPolicy: "static-bottom-center-physical-scale",
  motion: Object.freeze({
    enabled: false,
    pulse: false,
    bob: false,
    sway: false,
    rotate: false,
    runtimeResize: false,
  }),
  scale: Object.freeze({
    minimumSourcePixelsPerWorldPixel: 2.25,
  }),
  streaming: Object.freeze({
    horizontalMarginTiles: 8,
    surfaceVisibilityMarginRows: 8,
  }),
  distanceProfiles: Object.freeze({
    portalThreshold: Object.freeze({
      distance: "middle",
      depth: 1.7,
      alpha: 0.97,
      fadePercent: 3,
      lightingChannel: "terrainTint",
    }),
    architecturalMiddle: Object.freeze({
      distance: "middle",
      depth: 5.2,
      alpha: 0.95,
      fadePercent: 5,
      lightingChannel: "terrainTint",
    }),
    monumentFar: Object.freeze({
      distance: "far",
      depth: 5,
      alpha: 0.83,
      fadePercent: 17,
      lightingChannel: "farTint",
    }),
  }),
  placements: Object.freeze([
    placement("surface-hero-arrival-forge-shelter-v4", "arrivalForgeShelter", 155.2, "arrival-forge", "architecturalMiddle"),
    placement("surface-hero-caravan-waystation-v4", "caravanWaystation", 166.5, "caravan-rest", "architecturalMiddle"),
    placement(
      "surface-hero-starwell-portal-frame-v4",
      "starwellPortalFrame",
      188,
      "starwell-herb",
      "portalThreshold",
      { allowedProtectedZoneId: "level2-ground-sky-portal" },
    ),
    placement("surface-hero-timberwright-yard-v4", "timberwrightYard", 207.6, "timberwright", "architecturalMiddle"),
    placement(
      "surface-hero-observatory-telescope-v4",
      "observatoryTelescope",
      229.8,
      "observatory",
      "architecturalMiddle",
      { allowedLowProfileZoneId: "level2-heavenblock-flight-lane" },
    ),
    placement("surface-hero-frontier-survey-pavilion-v4", "frontierSurveyPavilion", 248.4, "frontier-survey", "architecturalMiddle"),
    placement(
      "surface-hero-three-kings-overlook-v4",
      "threeKingsOverlook",
      262.8,
      "far-east",
      "monumentFar",
    ),
  ]),
  portalSafety: Object.freeze({
    landmarkId: "surface-hero-starwell-portal-frame-v4",
    protectedZoneId: "level2-ground-sky-portal",
    centerTileX: 188,
    livePortalLeftTile: 187,
    livePortalRightTile: 189,
    livePortalRenderDepth: 2,
  }),
  suppressionByLandmark: Object.freeze({
    arrivalForgeShelter: Object.freeze({
      retained: Object.freeze(["l2-155-forge"]),
      expansion: Object.freeze([
        "surface-v3-authored-forge-scorched-brace",
        "surface-v3-authored-forge-cooling-trough",
      ]),
    }),
    caravanWaystation: Object.freeze({
      retained: Object.freeze(["l2-167-camp-kitchen", "l2-172-wagon"]),
      expansion: Object.freeze([
        "surface-v3-authored-caravan-saddle-rack",
        "surface-v3-authored-caravan-cooking-tripod",
        "surface-v3-authored-caravan-water-keg",
      ]),
    }),
    starwellPortalFrame: Object.freeze({
      retained: Object.freeze([]),
      expansion: Object.freeze([]),
    }),
    timberwrightYard: Object.freeze({
      retained: Object.freeze(["l2-208-timber-gantry"]),
      expansion: Object.freeze([
        "surface-v3-authored-timber-workbench",
        "surface-v3-authored-timber-rope-spool",
      ]),
    }),
    observatoryTelescope: Object.freeze({
      retained: Object.freeze(["l2-230-observatory"]),
      expansion: Object.freeze([
        "surface-v3-authored-observatory-weather-vane",
        "surface-v3-authored-observatory-chart-table",
        "surface-v3-authored-observatory-weights",
        "surface-v3-authored-observatory-star-dial",
      ]),
    }),
    frontierSurveyPavilion: Object.freeze({
      retained: Object.freeze(["l2-248-survey"]),
      expansion: Object.freeze([
        "surface-v3-authored-frontier-irrigation",
        "surface-v3-authored-frontier-tripod",
        "surface-v3-authored-frontier-samples",
      ]),
    }),
    threeKingsOverlook: Object.freeze({
      retained: Object.freeze([
        "l2-261-supplies",
        "l2-264-wagon",
      ]),
      expansion: Object.freeze([
        "surface-v3-authored-far-east-map-cases",
        "surface-v3-authored-far-east-climbing-crate",
      ]),
    }),
  }),
});

function queryEnabled(params, key, disabledValue) {
  return params.get(key) !== disabledValue;
}

export function resolveWorldVisualSurfaceHeroLandmarksEnabled(
  config = WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
  search = globalThis.location?.search || "",
) {
  const disabled = Object.freeze({
    all: false,
    arrivalForgeShelter: false,
    caravanWaystation: false,
    starwellPortalFrame: false,
    timberwrightYard: false,
    observatoryTelescope: false,
    frontierSurveyPavilion: false,
    threeKingsOverlook: false,
  });
  if (!config.enabled) return disabled;
  const params = new URLSearchParams(search);
  const all = queryEnabled(params, config.query.all, config.query.disabledValue);
  if (!all) return disabled;
  return Object.freeze({
    all,
    arrivalForgeShelter: queryEnabled(params, config.query.arrivalForgeShelter, config.query.disabledValue),
    caravanWaystation: queryEnabled(params, config.query.caravanWaystation, config.query.disabledValue),
    starwellPortalFrame: queryEnabled(params, config.query.starwellPortalFrame, config.query.disabledValue),
    timberwrightYard: queryEnabled(params, config.query.timberwrightYard, config.query.disabledValue),
    observatoryTelescope: queryEnabled(params, config.query.observatoryTelescope, config.query.disabledValue),
    frontierSurveyPavilion: queryEnabled(params, config.query.frontierSurveyPavilion, config.query.disabledValue),
    threeKingsOverlook: queryEnabled(params, config.query.threeKingsOverlook, config.query.disabledValue),
  });
}

export function resolveWorldVisualSurfaceHeroLandmarkSuppression(
  config = WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
  search = globalThis.location?.search || "",
) {
  const enabled = resolveWorldVisualSurfaceHeroLandmarksEnabled(config, search);
  const retained = new Set();
  const expansion = new Set();
  for (const assetId of Object.keys(WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS)) {
    if (!enabled[assetId]) continue;
    const suppression = config.suppressionByLandmark[assetId];
    for (const id of suppression.retained) retained.add(id);
    for (const id of suppression.expansion) expansion.add(id);
  }
  return Object.freeze({
    retained: Object.freeze([...retained]),
    expansion: Object.freeze([...expansion]),
  });
}
