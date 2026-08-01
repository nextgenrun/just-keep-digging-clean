const image = (key, path) => Object.freeze({ key, path });

const PHASES = Object.freeze([
  Object.freeze({
    id: "survey",
    label: "SURVEYING THE DESCENT",
    start: 0,
    end: 0.2,
  }),
  Object.freeze({
    id: "supply",
    label: "PACKING EXPEDITION GEAR",
    start: 0.2,
    end: 0.46,
  }),
  Object.freeze({
    id: "calibration",
    label: "CALIBRATING MINE SYSTEMS",
    start: 0.46,
    end: 0.74,
  }),
  Object.freeze({
    id: "access",
    label: "OPENING THE MINE",
    start: 0.74,
    end: 1,
  }),
]);

export const LOADING_SCREEN_PRESENTATION = Object.freeze({
  revision: "loading-screen-imagegen-v1-20260731",
  assets: Object.freeze({
    foundation: image(
      "ui-loading-screen-foundation-v1",
      "sprites/UI/loading-screen-v1/loading-screen-foundation-v1.webp",
    ),
    overallFill: image(
      "ui-loading-progress-amber-v1",
      "sprites/UI/loading-screen-v1/loading-progress-amber-v1.webp",
    ),
    phaseFill: image(
      "ui-loading-progress-cyan-v1",
      "sprites/UI/loading-screen-v1/loading-progress-cyan-v1.webp",
    ),
    retryPlate: image(
      "ui-loading-retry-plate-v1",
      "sprites/UI/loading-screen-v1/loading-retry-plate-v1.webp",
    ),
  }),
  layout: Object.freeze({
    referenceWidth: 1280,
    referenceHeight: 720,
    foundation: Object.freeze({
      x: 640,
      y: 360,
      width: 1280,
      height: 720,
    }),
    logo: Object.freeze({
      x: 260,
      y: 145,
      maxWidth: 270,
      maxHeight: 72,
      subtitleY: 226,
    }),
    meters: Object.freeze({
      left: 82,
      width: 320,
      height: 18,
      percentX: 393,
      overall: Object.freeze({
        headingY: 330,
        fillY: 380,
        statusY: 410,
      }),
      phase: Object.freeze({
        headingY: 487,
        fillY: 540,
        statusY: 569,
        optionalY: 590,
      }),
    }),
    minigame: Object.freeze({
      headingX: 845,
      headingY: 82,
      instructionY: 466,
      optionalY: 492,
      toolHeadingY: 582,
    }),
    failure: Object.freeze({
      x: 845,
      messageY: 245,
      messageMaxWidth: 520,
      retryY: 342,
      retryWidth: 300,
      retryHeight: 60,
      retryHintY: 392,
    }),
  }),
  typography: Object.freeze({
    subtitleSize: "15px",
    meterHeadingSize: "12px",
    meterPercentSize: "14px",
    statusSize: "13px",
    detailSize: "11px",
    minigameHeadingSize: "15px",
    instructionSize: "11px",
    optionalSize: "9px",
    failureSize: "15px",
    retrySize: "14px",
    letterSpacing: 2,
    colors: Object.freeze({
      title: "#f0dfc2",
      amber: "#f2c56b",
      cyan: "#86dfff",
      body: "#c8dae8",
      muted: "#7894aa",
      failure: "#ff9b7d",
      shadow: "#02060a",
    }),
    strokeThickness: 3,
  }),
  timing: Object.freeze({
    phasePulseMs: 900,
    readyHoldMs: 180,
    fadeOutMs: 300,
  }),
  copy: Object.freeze({
    overallHeading: "EXPEDITION READINESS",
    phaseHeading: "CURRENT LOAD PHASE",
    minigameHeading: "MINE THE SEAM",
    minigameInstruction: "CLICK OR HOLD A BLOCK  ·  ARROWS + SPACE",
    optional: "OPTIONAL ACTIVITY  ·  LOADING CONTINUES  ·  NO SAVE REWARDS",
    toolHeading: "PICKAXE PATH  ·  BUILD A BREAK CHAIN",
    retry: "RETRY",
    retryHint: "Retry becomes available only after a real load failure.",
    loadingFallback: "Preparing the expedition...",
    detailFallback: "Loading the mine without interrupting your session.",
  }),
  phases: PHASES,
  assetBudgetBytes: 900000,
});

export function getLoadingScreenPresentationAssets(
  config = LOADING_SCREEN_PRESENTATION,
) {
  return Object.freeze(
    Object.values(config.assets)
      .map(({ key, path }) => Object.freeze({ key, path })),
  );
}
