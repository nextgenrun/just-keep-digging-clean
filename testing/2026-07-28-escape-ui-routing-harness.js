import { GameInputHandler } from "../world/playScene/GameInputHandler.js";

const state = {
  ui: "inventory",
  pauseOpens: 0,
  closeCalls: 0,
  legacyCloseCalls: 0,
  frameConsumes: 0,
  history: [],
};

let sceneRef = null;
let hardEscapeRef = null;

function snapshot() {
  return {
    ready: Boolean(sceneRef),
    ui: state.ui,
    gameState: sceneRef?.gameState || null,
    pauseOpens: state.pauseOpens,
    closeCalls: state.closeCalls,
    legacyCloseCalls: state.legacyCloseCalls,
    frameConsumes: state.frameConsumes,
    history: [...state.history],
  };
}

function setInventoryOpen() {
  if (!sceneRef) return false;
  sceneRef.uiInventoryPopup.isOpen = true;
  sceneRef._pausePanel = null;
  sceneRef.gameState = "playing";
  state.ui = "inventory";
  state.history.push("inventory-open");
  return true;
}

function createEscapeEvent(type) {
  const event = new KeyboardEvent(type, {
    key: "Escape",
    code: "Escape",
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "keyCode", { get: () => 27 });
  Object.defineProperty(event, "which", { get: () => 27 });
  return event;
}

function dispatchEscapePress() {
  window.dispatchEvent(createEscapeEvent("keydown"));
  window.setTimeout(() => {
    window.dispatchEvent(createEscapeEvent("keyup"));
    // Synthetic KeyboardEvents do not always clear Phaser's Key state in
    // automated browsers. Reset after several render frames to model the real
    // physical key-up edge without touching the just-down frame under test.
    hardEscapeRef?.reset?.();
  }, 2000);
}

class EscapeRoutingHarnessScene extends Phaser.Scene {
  constructor() {
    super("EscapeRoutingHarnessScene");
  }

  create() {
    const hardEscape = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    hardEscapeRef = hardEscape;
    const keys = {
      escape: hardEscape,
      hardEscape,
    };
    const inputHandler = {
      getKeys: () => keys,
    };

    this.gameState = "playing";
    this._settingsKeyCaptureActive = false;
    this._pausePanel = null;
    this.uiInventoryPopup = { isOpen: true };
    this.thunderStrikeActionRuntime = { cancel: () => false };

    this.closeTopOverlay = () => {
      state.closeCalls += 1;
      if (this.uiInventoryPopup.isOpen) {
        this.uiInventoryPopup.isOpen = false;
        state.ui = "none";
        state.history.push("central-close-inventory");
        return true;
      }
      if (this.gameState === "dialog") {
        this.gameState = "playing";
        state.ui = "none";
        state.history.push("central-close-dialog");
        return true;
      }
      if (this._pausePanel || this.gameState === "paused") {
        this._pausePanel = null;
        this.gameState = "playing";
        state.ui = "none";
        state.history.push("central-close-pause");
        return true;
      }
      return false;
    };

    this.showPauseMenu = () => {
      state.pauseOpens += 1;
      this._pausePanel = {};
      this.gameState = "paused";
      state.ui = "pause";
      state.history.push("open-pause");
      return true;
    };

    this.escapeHandler = new GameInputHandler(this, inputHandler, {});

    // This deliberately mirrors the old race: a UI-specific listener is
    // registered after the shared handler on the same Phaser Key object.
    hardEscape.on("down", () => {
      if (!this.uiInventoryPopup.isOpen) return;
      state.legacyCloseCalls += 1;
      this.uiInventoryPopup.isOpen = false;
      state.ui = "none";
      state.history.push("legacy-close-inventory");
    });

    this.status = this.add.text(24, 24, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      color: "#dcebf4",
      lineSpacing: 9,
    });
    this.add.text(24, 212, "Press ESC: close UI → open Pause → close Pause", {
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
      color: "#86aec4",
    });

    sceneRef = this;
    state.history.push("inventory-open");
  }

  update() {
    if (this.escapeHandler?.handleEscapeInput()) {
      state.frameConsumes += 1;
    }
    this.status.setText([
      "ESCAPE ROUTING LIVE TEST",
      `UI: ${state.ui}`,
      `Game state: ${this.gameState}`,
      `Pause opens: ${state.pauseOpens}`,
      `Central closes: ${state.closeCalls}`,
      `Legacy closes: ${state.legacyCloseCalls}`,
      `Frame consumes: ${state.frameConsumes}`,
    ]);
  }
}

window.__escapeUiHarness = {
  dispatchEscapePress,
  snapshot,
  setInventoryOpen,
};
document.getElementById("press-escape")?.addEventListener(
  "click",
  dispatchEscapePress,
);

new Phaser.Game({
  type: Phaser.CANVAS,
  width: 620,
  height: 270,
  backgroundColor: "#101d27",
  parent: "escape-routing-game",
  banner: false,
  audio: { noAudio: true },
  scene: EscapeRoutingHarnessScene,
});
