import assert from "node:assert/strict";
import { ScreenRecordSystem } from "../systems/visual/ScreenRecordSystem.js";

class MockEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    this.listeners.set(event, handler);
  }

  off(event, handler) {
    if (this.listeners.get(event) === handler) this.listeners.delete(event);
  }

  emit(event) {
    this.listeners.get(event)?.();
  }
}

class MockMediaRecorder {
  static isTypeSupported(type) {
    return type === "video/webm";
  }

  constructor(stream, options = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || "video/webm";
    this.state = "inactive";
    this.listeners = new Map();
  }

  addEventListener(event, handler) {
    this.listeners.set(event, handler);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.listeners.get("stop")?.();
  }
}

function displayObject({ depth, scrollFactor = 0 }) {
  return {
    active: true,
    visible: true,
    depth,
    scrollFactorX: scrollFactor,
    scrollFactorY: scrollFactor,
    getData() { return false; },
    setVisible(visible) { this.visible = visible; },
  };
}

function createHarness(width, height) {
  const events = new MockEmitter();
  const sourceCanvas = { width, height, captureStream() {} };
  const hud = displayObject({ depth: 1000 });
  const atmosphere = displayObject({ depth: 60 });
  const draws = [];
  const context = {
    fillStyle: "",
    fillRect() {},
    drawImage(...args) { draws.push(args); },
  };
  const track = { stopped: false, stop() { this.stopped = true; } };
  const stream = {
    addTrack() {},
    getTracks() { return [track]; },
  };
  const recordingCanvas = {
    width: 0,
    height: 0,
    getContext() { return context; },
    captureStream() { return stream; },
  };
  const scene = {
    children: { list: [hud, atmosphere] },
    game: { canvas: sourceCanvas, events },
    uiNotifications: {},
  };
  return { atmosphere, draws, events, hud, recordingCanvas, scene, track };
}

const priorGlobals = {
  document: globalThis.document,
  mediaRecorder: globalThis.MediaRecorder,
  prompt: globalThis.prompt,
  window: globalThis.window,
};

const gameRoot = {
  children: [],
  appendChild(element) {
    this.children.push(element);
    element.parentElement = this;
  },
};
let nextRecordingCanvas = null;
globalThis.document = {
  body: gameRoot,
  fullscreenElement: null,
  createElement() {
    if (nextRecordingCanvas) {
      const canvas = nextRecordingCanvas;
      nextRecordingCanvas = null;
      return canvas;
    }
    return {
      parentElement: null,
      style: {},
      setAttribute() {},
      remove() { this.parentElement = null; },
    };
  },
  querySelector() { return gameRoot; },
};
globalThis.MediaRecorder = MockMediaRecorder;

try {
  const shortHarness = createHarness(1920, 1080);
  nextRecordingCanvas = shortHarness.recordingCanvas;
  globalThis.prompt = () => "short";
  globalThis.window = { setTimeout };
  const shortRecorder = new ScreenRecordSystem(shortHarness.scene);
  assert.equal(await shortRecorder.toggle(), true);
  assert.equal(shortRecorder.activeMode, "short");
  assert.equal(shortHarness.recordingCanvas.width, 720);
  assert.equal(shortHarness.recordingCanvas.height, 1280);
  assert.equal(shortHarness.hud.visible, false);
  assert.equal(shortHarness.atmosphere.visible, true);
  shortHarness.events.emit("prerender");
  shortHarness.events.emit("postrender");
  assert.equal(shortHarness.draws.length, 1);
  assert.deepEqual(shortHarness.draws[0].slice(1), [-437, 0, 2276, 1280]);
  shortRecorder.destroy();
  assert.equal(shortHarness.hud.visible, true);
  assert.equal(shortHarness.track.stopped, true);

  const broadHarness = createHarness(2560, 1440);
  nextRecordingCanvas = broadHarness.recordingCanvas;
  globalThis.prompt = () => "broad";
  let fullscreen = false;
  globalThis.window = {
    __isGameFullscreen: () => fullscreen,
    __toggleGameFullscreen: async () => {
      fullscreen = true;
      globalThis.document.fullscreenElement = gameRoot;
      return true;
    },
    setTimeout(callback) { callback(); },
  };
  const broadRecorder = new ScreenRecordSystem(broadHarness.scene);
  assert.equal(await broadRecorder.toggle(), true);
  assert.equal(fullscreen, true);
  assert.equal(broadRecorder.activeMode, "broad");
  assert.equal(broadHarness.recordingCanvas.width, 2560);
  assert.equal(broadHarness.recordingCanvas.height, 1440);
  assert.equal(broadHarness.hud.visible, true);
  assert.deepEqual(broadHarness.draws[0].slice(1), [0, 0, 2560, 1440]);
  broadRecorder.destroy();
} finally {
  globalThis.document = priorGlobals.document;
  globalThis.MediaRecorder = priorGlobals.mediaRecorder;
  globalThis.prompt = priorGlobals.prompt;
  globalThis.window = priorGlobals.window;
}

console.log("screen-record modes contract: ok");
