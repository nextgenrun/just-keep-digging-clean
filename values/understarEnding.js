export const UNDERSTAR_ENDING_STATES = Object.freeze({
  LOCKED: "locked",
  DISCOVERED: "discovered",
  COMPLETED: "completed",
});

const VALID_STATES = new Set(Object.values(UNDERSTAR_ENDING_STATES));

export const UNDERSTAR_ENDING_CONFIG = Object.freeze({
  enabled: true,
  saveVersion: 1,
  triggerDepthMeters: 2000,
  prefetchDepthMeters: 1900,
  interactionRadiusTiles: 10,
  runtimeAsset: Object.freeze({
    owner: "understar-ending",
    priority: 95,
  }),
  world: Object.freeze({
    sourceWidthPx: 1672,
    sourceHeightPx: 941,
    centerOffsetTilesY: -3,
    // The star is a finale light source: it must sit above the hard-black
    // darkness compositor (900) while remaining below the HUD (1000).
    renderDepth: 902,
    revealDurationMs: 1800,
    promptDepth: 1985,
    promptY: 548,
    promptTitleFontSize: "34px",
    promptActionFontSize: "18px",
    promptTitleColor: "#fff4d2",
    promptActionColor: "#bdefff",
    promptStrokeColor: "#090416",
    promptStrokeThickness: 7,
  }),
  overlay: Object.freeze({
    depth: 3600,
    fadeInMs: 1200,
    titleY: 112,
    subtitleY: 162,
    storyY: 218,
    statsY: 304,
    controlsY: 664,
    titleFontSize: "48px",
    subtitleFontSize: "20px",
    storyFontSize: "22px",
    statsFontSize: "18px",
    controlsFontSize: "18px",
    titleColor: "#fff0bd",
    subtitleColor: "#9deaff",
    bodyColor: "#f2f4ff",
    controlsColor: "#c9f5ff",
    textStrokeColor: "#07030f",
    titleStrokeThickness: 9,
    bodyStrokeThickness: 6,
  }),
  copy: Object.freeze({
    promptTitle: "THE UNDERSTAR",
    promptAction: "PRESS INTERACT TO AWAKEN",
    replayAction: "PRESS INTERACT TO WITNESS AGAIN",
    eyebrow: "DEMO COMPLETE  •  2,000 M",
    title: "THE UNDERSTAR AWAKENS",
    story: "You reached the bottom of the mine.\nSomething beneath it has only just awakened.",
    statsLabels: Object.freeze({
      level: "LEVEL",
      tiles: "TILES MINED",
      portals: "PORTALS",
      stars: "STARS",
    }),
    controls: "ENTER  RETURN TO MAIN MENU     •     ESC  CONTINUE EXPLORING",
  }),
});

export function sanitizeUnderstarEndingData(value) {
  const requestedState = VALID_STATES.has(value?.state)
    ? value.state
    : UNDERSTAR_ENDING_STATES.LOCKED;
  const anchorTileX = Number.isInteger(value?.anchorTileX)
    ? Math.max(0, value.anchorTileX)
    : null;
  const state = requestedState === UNDERSTAR_ENDING_STATES.LOCKED || anchorTileX !== null
    ? requestedState
    : UNDERSTAR_ENDING_STATES.LOCKED;
  return Object.freeze({
    version: UNDERSTAR_ENDING_CONFIG.saveVersion,
    state,
    anchorTileX: state === UNDERSTAR_ENDING_STATES.LOCKED ? null : anchorTileX,
  });
}
