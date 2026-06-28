import { UI_COLORS } from "../../values/uiColors.js";

const GATES = Object.freeze([
  {
    threshold: 100,
    title: "DEPTH WARNING: 100M",
    message: "You are entering the first deep layer. Dangers and tile strength increase from here.",
  },
  {
    threshold: 300,
    title: "DEPTH WARNING: 300M",
    message: "You are pushing into a harsher depth band. Hazards become more frequent below 300m.",
  },
  {
    threshold: 1000,
    title: "DEPTH WARNING: 1000M",
    message: "You are moving beyond the known mining range. Continue only if you are ready for extreme danger.",
  },
]);

function normalizeGateThreshold(value) {
  if (value === 999) return 1000;
  return GATES.some(gate => gate.threshold === value) ? value : null;
}

export class DepthGateSystem {
  constructor(scene) {
    this.scene = scene;
    this.accepted = new Set();
    this.activeGate = null;
    this.root = null;
    this.buttons = [];
    this.selectedIndex = 0;
    this._previousGameState = "playing";
    this._keyHandler = event => this._handleKeydown(event);
    document.addEventListener("keydown", this._keyHandler, true);
  }

  update() {
    if (this.activeGate) return true;
    const tile = this.scene.playerController?.getPlayerTile();
    if (!tile) return false;
    const depth = Math.max(0, tile.ty - this.scene.config.topAirRows + 1);
    const gate = GATES.find(item => depth >= item.threshold && !this.accepted.has(item.threshold));
    if (!gate) return false;
    this._open(gate);
    return true;
  }

  isOpen() {
    return Boolean(this.activeGate);
  }

  getSaveData() {
    return { acceptedThresholds: [...this.accepted].sort((a, b) => a - b) };
  }

  loadSaveData(data) {
    const values = Array.isArray(data?.acceptedThresholds) ? data.acceptedThresholds : [];
    this.accepted = new Set(
      values
        .map(normalizeGateThreshold)
        .filter(value => value !== null)
    );
  }

  destroy() {
    document.removeEventListener("keydown", this._keyHandler, true);
    this.root?.remove();
    this.root = null;
    this.activeGate = null;
    this.buttons = [];
  }

  _open(gate) {
    this.activeGate = gate;
    this._previousGameState = this.scene.gameState && this.scene.gameState !== "depth-warning"
      ? this.scene.gameState
      : "playing";
    this.scene.gameState = "depth-warning";
    this.scene.playerController?.setControlsEnabled(false);
    this.scene.earthquakeSystem?.setPaused(true);
    this._renderDecision();
  }

  _renderDecision(status = "") {
    const gate = this.activeGate;
    if (!gate) return;
    this._buildModal(gate, status);
    this._addButton("Yes - Continue", () => this._accept(), true);
    this._addButton("No - Return", () => this._decline(), false);
    this._selectButton(0);
  }

  _buildModal(gate, status = "") {
    this.root?.remove();
    this.buttons = [];
    this.selectedIndex = 0;

    const root = document.createElement("div");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", gate.title);
    root.tabIndex = -1;
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "rgba(0, 0, 0, 0.74)",
      fontFamily: "Consolas, monospace",
    });
    const panel = document.createElement("div");
    panel.dataset.depthContent = "true";
    Object.assign(panel.style, {
      position: "relative",
      width: "min(680px, 92vw)",
      padding: "32px 36px 28px",
      color: UI_COLORS.title,
      textAlign: "center",
      background: "linear-gradient(180deg, #111923 0%, #090d13 100%)",
      border: "2px solid #c9a227",
      borderRadius: "8px",
      boxShadow: "0 18px 70px rgba(0,0,0,.78), inset 0 0 0 1px rgba(201,162,39,.2)",
      boxSizing: "border-box",
    });

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "X";
    close.setAttribute("aria-label", "Return to spawn");
    Object.assign(close.style, {
      position: "absolute",
      top: "12px",
      right: "12px",
      width: "32px",
      height: "32px",
      color: UI_COLORS.muted,
      background: "#101720",
      border: "1px solid #2a3a4a",
      borderRadius: "4px",
      font: "900 15px Consolas, monospace",
      cursor: "pointer",
    });
    close.addEventListener("pointerenter", () => {
      close.style.color = UI_COLORS.white;
      close.style.borderColor = "#c9a227";
    });
    close.addEventListener("pointerleave", () => {
      close.style.color = UI_COLORS.muted;
      close.style.borderColor = "#2a3a4a";
    });
    close.addEventListener("click", () => this._decline());

    const title = document.createElement("div");
    title.textContent = gate.title;
    Object.assign(title.style, {
      color: UI_COLORS.gold,
      fontSize: "24px",
      fontWeight: "900",
      letterSpacing: "2px",
      marginBottom: "10px",
      textTransform: "uppercase",
    });

    const subtitle = document.createElement("div");
    subtitle.textContent = "Progression confirmation";
    Object.assign(subtitle.style, {
      color: UI_COLORS.muted,
      fontSize: "13px",
      fontWeight: "700",
      letterSpacing: "1.5px",
      marginBottom: "18px",
      textTransform: "uppercase",
    });

    const body = document.createElement("div");
    body.textContent = gate.message;
    Object.assign(body.style, {
      color: UI_COLORS.body,
      fontSize: "18px",
      lineHeight: "1.55",
      margin: "0 auto",
      maxWidth: "560px",
      marginBottom: status ? "12px" : "22px",
    });

    panel.append(close, title, subtitle, body);

    if (status) {
      const statusText = document.createElement("div");
      statusText.textContent = status;
      Object.assign(statusText.style, {
        minHeight: "24px",
        marginBottom: "14px",
        color: UI_COLORS.danger,
        fontSize: "15px",
        fontWeight: "700",
      });
      panel.appendChild(statusText);
    }

    const buttons = document.createElement("div");
    buttons.dataset.depthButtons = "true";
    Object.assign(buttons.style, {
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: "12px",
      marginTop: "6px",
    });
    panel.appendChild(buttons);

    const hints = document.createElement("div");
    hints.textContent = "Y / Enter: Continue    N / ESC: Return    Arrows: Select";
    Object.assign(hints.style, {
      color: UI_COLORS.muted,
      fontSize: "13px",
      fontWeight: "700",
      letterSpacing: ".4px",
      marginTop: "18px",
    });
    panel.appendChild(hints);

    root.appendChild(panel);
    root.addEventListener("pointerdown", event => {
      if (event.target === root) event.preventDefault();
    });
    document.body.appendChild(root);
    this.root = root;
    requestAnimationFrame(() => root.focus());
  }

  _addButton(label, callback, primary) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      minWidth: "150px",
      padding: "11px 18px",
      color: primary ? "#0d1117" : UI_COLORS.white,
      background: primary ? UI_COLORS.gold : "#131c26",
      border: `2px solid ${primary ? UI_COLORS.gold : "#2a3a4a"}`,
      borderRadius: "5px",
      font: "700 16px Consolas, monospace",
      cursor: "pointer",
      transition: "background .12s ease, border-color .12s ease, transform .08s ease",
    });
    button.addEventListener("pointerenter", () => {
      this._selectButton(this.buttons.findIndex(item => item.element === button));
    });
    button.addEventListener("pointerleave", () => {
      button.style.transform = "scale(1)";
    });
    button.addEventListener("pointerdown", () => {
      button.style.transform = "scale(.97)";
    });
    button.addEventListener("pointerup", () => {
      button.style.transform = "scale(1)";
    });
    button.addEventListener("click", callback);
    this.root.querySelector("[data-depth-buttons]").appendChild(button);
    this.buttons.push({ element: button, callback, primary });
    this._syncButtonStyles();
    if (primary) requestAnimationFrame(() => button.focus());
  }

  _handleKeydown(event) {
    if (!this.activeGate) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    const key = event.key;
    const lower = key.toLowerCase();

    if (key === "Escape" || lower === "n") {
      this._decline();
      return;
    }

    if (lower === "y") {
      this._accept();
      return;
    }

    if (key === "Enter" || key === " " || key === "Spacebar" || key === "Space") {
      this._activateSelected();
      return;
    }

    if (key === "ArrowLeft" || key === "ArrowUp" || lower === "a" || lower === "w") {
      this._selectButton(this.selectedIndex - 1);
      return;
    }

    if (key === "ArrowRight" || key === "ArrowDown" || lower === "d" || lower === "s" || key === "Tab") {
      this._selectButton(this.selectedIndex + (event.shiftKey ? -1 : 1));
    }
  }

  _activateSelected() {
    const selected = this.buttons[this.selectedIndex];
    selected?.callback?.();
  }

  _selectButton(index) {
    if (!this.buttons.length) return;
    const count = this.buttons.length;
    this.selectedIndex = ((index % count) + count) % count;
    this._syncButtonStyles();
    this.buttons[this.selectedIndex]?.element?.focus();
  }

  _syncButtonStyles() {
    this.buttons.forEach(({ element, primary }, index) => {
      const selected = index === this.selectedIndex;
      element.style.background = primary
        ? (selected ? "#e1b83a" : UI_COLORS.gold)
        : (selected ? "#1a2840" : "#131c26");
      element.style.borderColor = primary
        ? (selected ? "#f6df80" : UI_COLORS.gold)
        : (selected ? "#c9a227" : "#2a3a4a");
      element.style.boxShadow = selected
        ? "0 0 0 3px rgba(201,162,39,.24), 0 8px 22px rgba(0,0,0,.28)"
        : "none";
      element.style.outline = "none";
    });
  }

  _accept() {
    if (!this.activeGate) return;
    this.accepted.add(this.activeGate.threshold);
    this.scene.queueDugTilesSave?.();
    this._closeAndResume();
  }

  _decline() {
    if (!this.activeGate) return;
    this.scene.earthquakeSystem?.cancelActiveHazards();
    this.scene._resetPlayerToSpawn?.();
    this._closeAndResume();
    this.scene.hudSystem?.flashStatus("Returned safely to spawn", "#e4ba78", 2200);
  }

  _closeAndResume() {
    this.root?.remove();
    this.root = null;
    this.activeGate = null;
    this.scene.gameState = this._previousGameState === "playing" ? "playing" : this._previousGameState;
    this.scene.playerController?.setControlsEnabled(this.scene.gameState === "playing");
    this.scene.earthquakeSystem?.setPaused(false);
    this._resetKeyboardState();
  }

  _resetKeyboardState() {
    const keyboard = this.scene.input?.keyboard;
    if (typeof keyboard?.resetKeys === "function") {
      keyboard.resetKeys();
      return;
    }

    const keys = this.scene.inputHandler?.getKeys?.();
    if (!keys) return;
    Object.values(keys).forEach(key => key?.reset?.());
  }
}
