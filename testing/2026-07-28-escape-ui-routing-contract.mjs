import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

class FakeKey {
  constructor() {
    this.justDown = false;
    this.listeners = [];
  }

  on(event, callback) {
    if (event === "down") this.listeners.push(callback);
    return this;
  }

  off(event, callback) {
    if (event === "down") {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    }
    return this;
  }

  press() {
    this.justDown = true;
    [...this.listeners].forEach(listener => listener());
  }
}

class FakeSceneEvents {
  once() {}
  off() {}
}

globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown(key) {
        if (!key?.justDown) return false;
        key.justDown = false;
        return true;
      },
    },
  },
  Scenes: {
    Events: {
      SHUTDOWN: "shutdown",
    },
  },
};

const { GameInputHandler } = await import(
  "../world/playScene/GameInputHandler.js"
);
const { hasEscapeClosableUi } = await import(
  "../world/playScene/hasEscapeClosableUi.js"
);

function createFixture() {
  const hardEscape = new FakeKey();
  const pauseKey = hardEscape;
  const keys = {
    escape: pauseKey,
    hardEscape,
    interact: new FakeKey(),
    mainMenuKey: new FakeKey(),
  };
  const calls = {
    close: 0,
    pause: 0,
    thunderCancel: 0,
  };
  const scene = {
    events: new FakeSceneEvents(),
    gameState: "playing",
    _settingsKeyCaptureActive: false,
    _pausePanel: null,
    uiInventoryPopup: { isOpen: false },
    playerController: {
      consumeResetInput: () => false,
    },
    worldMapDiscoverySystem: {
      updatePlayerDiscovery() {},
    },
    thunderStrikeActionRuntime: {
      cancel() {
        calls.thunderCancel += 1;
        return false;
      },
    },
    closeTopOverlay() {
      calls.close += 1;
      if (this.uiInventoryPopup.isOpen) {
        this.uiInventoryPopup.isOpen = false;
        return true;
      }
      if (this._pausePanel || this.gameState === "paused") {
        this._pausePanel = null;
        this.gameState = "playing";
        return true;
      }
      return false;
    },
    showPauseMenu() {
      calls.pause += 1;
      this._pausePanel = {};
      this.gameState = "paused";
      return true;
    },
  };
  const inputHandler = {
    getKeys: () => keys,
  };
  const handler = new GameInputHandler(scene, inputHandler, {});
  return { calls, handler, hardEscape, inputHandler, keys, scene };
}

{
  const fixture = createFixture();
  const { calls, handler, hardEscape, scene } = fixture;

  // This listener represents the old inventory/pause behavior. Phaser invokes
  // Key "down" listeners before the scene's frame-level JustDown processing.
  let legacyCloseCalls = 0;
  hardEscape.on("down", () => {
    if (!scene.uiInventoryPopup.isOpen) return;
    legacyCloseCalls += 1;
    scene.uiInventoryPopup.isOpen = false;
  });

  scene.uiInventoryPopup.isOpen = true;
  hardEscape.press();
  assert.equal(scene.uiInventoryPopup.isOpen, false);
  assert.equal(calls.close, 1, "the shared handler must close the UI first");
  assert.equal(
    legacyCloseCalls,
    0,
    "later UI-specific listeners must see the already-closed surface",
  );
  assert.equal(handler.handleEscapeInput(), true);
  assert.equal(
    calls.pause,
    0,
    "the same physical Escape press must not reopen Pause",
  );

  hardEscape.press();
  assert.equal(handler.handleEscapeInput(), true);
  assert.equal(calls.pause, 1, "a later distinct Escape press should open Pause");
  assert.equal(scene.gameState, "paused");

  hardEscape.press();
  assert.equal(scene.gameState, "playing");
  assert.equal(handler.handleEscapeInput(), true);
  assert.equal(calls.pause, 1, "Escape must close Pause without reopening it");
}

{
  const fixture = createFixture();
  const { calls, handler, hardEscape, scene } = fixture;

  scene._pausePanel = {};
  scene.gameState = "paused";
  scene._settingsKeyCaptureActive = true;
  hardEscape.press();
  assert.ok(scene._pausePanel, "Escape must not close Pause during key capture");

  // The Settings listener cancels capture later in Phaser's event dispatch.
  scene._settingsKeyCaptureActive = false;
  assert.equal(handler.handleEscapeInput(), true);
  assert.ok(
    scene._pausePanel,
    "the capture-cancel press must remain spent after capture closes",
  );
  assert.equal(calls.close, 0);
  assert.equal(calls.pause, 0);
}

{
  const fixture = createFixture();
  const { calls, handler, keys, scene } = fixture;
  keys.escape = new FakeKey();
  scene.uiInventoryPopup.isOpen = true;
  keys.escape.press();

  assert.equal(handler.handleEscapeInput(), true);
  assert.equal(scene.uiInventoryPopup.isOpen, false);
  assert.equal(calls.close, 1);
  assert.equal(calls.pause, 0);
}

const emptyScene = { gameState: "playing" };
assert.equal(hasEscapeClosableUi(emptyScene), false);
assert.equal(hasEscapeClosableUi({ ...emptyScene, _pausePanel: {} }), true);
assert.equal(hasEscapeClosableUi({ ...emptyScene, gameState: "paused" }), true);
assert.equal(
  hasEscapeClosableUi({
    ...emptyScene,
    uiInventoryPopup: { isOpen: true },
  }),
  true,
);
assert.equal(
  hasEscapeClosableUi({
    ...emptyScene,
    starHeartOverlay: { isOpen: () => true },
  }),
  true,
);
assert.equal(
  hasEscapeClosableUi({
    ...emptyScene,
    gameState: "dialog",
    overlayManager: { shell: { root: { visible: true } } },
  }),
  true,
);
assert.equal(
  hasEscapeClosableUi({
    ...emptyScene,
    _hardcoreRuntime: { modal: { isVisible: true } },
  }),
  true,
);

const updateSource = readFileSync(
  new URL("../world/playScene/PlaySceneUpdate.js", import.meta.url),
  "utf8",
);
const uiSource = readFileSync(
  new URL("../world/playScene/PlaySceneUI.js", import.meta.url),
  "utf8",
);
const harnessSource = readFileSync(
  new URL("./2026-07-28-escape-ui-routing-harness.js", import.meta.url),
  "utf8",
);
assert.match(updateSource, /gameInputHandler\.handleEscapeInput\(\)/);
assert.doesNotMatch(updateSource, /const escPressed\s*=/);
assert.match(uiSource, /starHeartOverlay\?\.isOpen\?\.\(\)/);
assert.match(
  uiSource,
  /gameState === "dialog"[\s\S]*?hideOverlay\?\.\(\)[\s\S]*?gameState = "playing"/,
);
assert.ok(
  uiSource.indexOf("starHeartOverlay?.isOpen?.()")
    < uiSource.indexOf("_pillarViewActive && this.starPillarSystem"),
  "Star Heart must close before its underlying Pillar view",
);
assert.match(harnessSource, /new GameInputHandler\(this, inputHandler, \{\}\)/);
assert.match(harnessSource, /hardEscape\.on\("down"/);

console.log("Escape UI routing contract passed.");
