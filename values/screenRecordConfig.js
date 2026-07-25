export const SCREEN_RECORD_CONFIG = Object.freeze({
  frameRate: 60,
  captureWidth: 720,
  captureHeight: 1280,
  captureBackground: "#07111f",
  captureFocusX: 0.35,
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
    started: "Portrait recording started with game audio (F10 stops)",
    stopping: "Saving screen recording...",
    saved: "Screen recording saved: {file}",
    unsupported: "Screen recording is not supported by this browser",
    failed: "Screen recording could not be saved",
  }),
});
