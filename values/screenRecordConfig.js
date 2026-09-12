const SHORT_CAPTURE_WIDTH = 720;
const SHORT_CAPTURE_HEIGHT = 1280;

export const SCREEN_RECORD_CONFIG = Object.freeze({
  frameRate: 60,
  captureWidth: SHORT_CAPTURE_WIDTH,
  captureHeight: SHORT_CAPTURE_HEIGHT,
  captureBackground: "#07111f",
  captureFocusX: 0.35,
  defaultMode: "short",
  modePrompt: Object.freeze({
    message: [
      "Choose capture format:",
      "SHORT = clean 9:16 capture without game UI",
      "BROAD = clean wide fullscreen capture without game UI",
    ].join("\n\n"),
    defaultValue: "short",
  }),
  modes: Object.freeze({
    short: Object.freeze({
      id: "short",
      aliases: Object.freeze(["short", "s", "1", "portrait", "vertical"]),
      width: SHORT_CAPTURE_WIDTH,
      height: SHORT_CAPTURE_HEIGHT,
      fit: "cover",
      hideUi: true,
      requireFullscreen: false,
      fileNameToken: "short",
      indicator: "REC • SHORT • F9 TO STOP",
    }),
    broad: Object.freeze({
      id: "broad",
      aliases: Object.freeze(["broad", "b", "2", "wide", "fullscreen", "landscape"]),
      captureSourceSize: true,
      fit: "contain",
      hideUi: true,
      requireFullscreen: true,
      fileNameToken: "broad",
      indicator: "REC • BROAD FULLSCREEN • F9 TO STOP",
    }),
  }),
  shortUi: Object.freeze({
    minimumDepth: 998,
    keepVisibleDataKey: "screenRecordKeepVisible",
  }),
  fullscreen: Object.freeze({
    settleMs: 180,
    gameRootSelector: "#game-root",
  }),
  renderEvents: Object.freeze({
    preRender: "prerender",
    postRender: "postrender",
  }),
  saveToBrowser: globalThis.__DIG_GAME_PRODUCTION__ === true,
  downloadRevokeDelayMs: 60000,
  endpoint: "/screenrecord",
  uploadField: "recording",
  fileNamePrefix: "screenrecord",
  fileExtension: "webm",
  preferredMimeTypes: Object.freeze([
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ]),
  notices: Object.freeze({
    started: "Portrait recording started with game audio",
    stopping: "Saving screen recording...",
    saved: "Screen recording saved: {file}",
    unsupported: "Screen recording is not supported by this browser",
    failed: "Screen recording could not be saved",
    invalidMode: "Choose SHORT or BROAD capture mode",
    fullscreenRequired: "Broad capture needs the game in fullscreen",
  }),
});
