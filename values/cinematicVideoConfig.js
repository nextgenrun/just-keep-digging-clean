const CINEMATIC_ASSET_ROOT = "sprites/cinematics/understar-cinematics-v1";
const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled"]);

const cinematicAsset = ({
  id,
  key,
  filename,
  posterFilename,
  durationSeconds,
}) => Object.freeze({
  id,
  key,
  path: `${CINEMATIC_ASSET_ROOT}/${filename}`,
  posterKey: `${key}-poster`,
  posterPath: `${CINEMATIC_ASSET_ROOT}/${posterFilename}`,
  durationSeconds,
});

export const CINEMATIC_VIDEO_IDS = Object.freeze({
  OPENING: "understar-opening",
  MOSSBACK_DISCOVERY: "mossback-discovery",
});

const OPENING_CINEMATIC = cinematicAsset({
  id: CINEMATIC_VIDEO_IDS.OPENING,
  key: "cinematic-understar-opening-v1",
  filename: "understar-opening-v1.mp4",
  posterFilename: "understar-opening-v1-poster.png",
  durationSeconds: 25,
});

const MOSSBACK_DISCOVERY_CINEMATIC = cinematicAsset({
  id: CINEMATIC_VIDEO_IDS.MOSSBACK_DISCOVERY,
  key: "cinematic-mossback-discovery-v1",
  filename: "mossback-discovery-v1.mp4",
  posterFilename: "mossback-discovery-v1-poster.png",
  durationSeconds: 15,
});

export const CINEMATIC_VIDEO_CONFIG = Object.freeze({
  enabledByDefault: true,
  query: Object.freeze({
    enabledParam: "cinematics",
    previewParam: "cinematic",
    mossbackPreviewValue: "mossback",
    disabledValues: DISABLED_QUERY_VALUES,
  }),
  scenes: Object.freeze({
    opening: "OpeningCinematicScene",
    next: "MainMenuScene",
    menuAudio: "MenuAudioScene",
  }),
  assets: Object.freeze({
    opening: OPENING_CINEMATIC,
    mossbackDiscovery: MOSSBACK_DISCOVERY_CINEMATIC,
  }),
  uiAssets: Object.freeze({
    holdFrame: Object.freeze({
      key: "ui-hud-approved-xp",
      path: "sprites/UI/hud-approved-v1/xp-frame.png",
    }),
  }),
  discovery: Object.freeze({
    firstTitanId: "mossback-wanderer",
  }),
  playback: Object.freeze({
    volume: 1,
    startupTimeoutMs: 12000,
    completionGraceMs: 5000,
    skipInputDelayMs: 0,
    skipHoldDurationMs: 2000,
    skipKeyCodes: Object.freeze(["Space", "Escape", "Enter", "NumpadEnter"]),
    preStartSkipKeyCodes: Object.freeze(["Escape"]),
  }),
  presentation: Object.freeze({
    backgroundColor: 0x000000,
    depth: 12000,
    videoDepthOffset: 1,
    promptDepthOffset: 2,
    posterAlpha: 1,
    veilAlpha: 0.34,
    centerRatio: 0.5,
    startPromptYRatio: 0.88,
    skipPromptYRatio: 0.945,
    holdBarYRatio: 0.907,
    holdBarWidthRatio: 0.34,
    holdBarMaxWidthPx: 520,
    holdBarMinWidthPx: 260,
    holdBarViewportMaxRatio: 0.88,
    holdFrameAspectRatio: 13.18,
    holdFillWidthRatio: 0.94,
    holdFillHeightRatio: 0.24,
    holdFillColor: 0xf2d52b,
    holdFillAlpha: 0.92,
    startFontSize: "20px",
    skipFontSize: "14px",
    startColor: "#f6d98a",
    skipColor: "#d6eaf0",
    textStrokeColor: "#061015",
    startStrokeThickness: 5,
    skipStrokeThickness: 4,
  }),
  copy: Object.freeze({
    start: "CLICK OR PRESS ANY KEY TO BEGIN",
    loading: "AWAKENING THE MINE...",
    locked: "CLICK OR PRESS ANY KEY FOR SOUND",
    stalled: "THE MINE IS REMEMBERING...",
    skip: "HOLD SPACE / ENTER / ESC FOR 2 SECONDS TO SKIP",
    hold: "KEEP HOLDING  •  {percent}%",
  }),
  health: Object.freeze({
    globalKey: "__jkdCinematicVideo",
    states: Object.freeze({
      ready: "ready",
      waiting: "waiting-for-gesture",
      loading: "loading",
      playing: "playing",
      complete: "complete",
      skipped: "skipped",
      failed: "failed",
      destroyed: "destroyed",
    }),
  }),
});

export function resolveCinematicVideosEnabled(
  config = CINEMATIC_VIDEO_CONFIG,
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(config.query.enabledParam)
    ?.trim()
    .toLowerCase();
  if (!value) return config.enabledByDefault;
  return !config.query.disabledValues.includes(value);
}

export function resolveOpeningCinematicAsset(
  config = CINEMATIC_VIDEO_CONFIG,
  search = globalThis.location?.search || "",
) {
  const preview = globalThis.__DIG_GAME_PRODUCTION__ !== true
    ? new URLSearchParams(search).get(config.query.previewParam)?.trim().toLowerCase()
    : "";
  return preview === config.query.mossbackPreviewValue
    ? config.assets.mossbackDiscovery
    : config.assets.opening;
}

export function getCinematicImagePreloadAssets(config = CINEMATIC_VIDEO_CONFIG) {
  return Object.freeze([
    ...Object.values(config.assets).map(asset => Object.freeze({
      key: asset.posterKey,
      path: asset.posterPath,
    })),
    config.uiAssets.holdFrame,
  ]);
}

export function getTitanDiscoveryCinematic(
  titanId,
  config = CINEMATIC_VIDEO_CONFIG,
) {
  return titanId === config.discovery.firstTitanId
    ? config.assets.mossbackDiscovery
    : null;
}
