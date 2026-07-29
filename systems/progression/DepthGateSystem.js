import { DEPTH_GATE_CONFIG } from "../../values/depthGateConfig.js";

function normalizeGateThreshold(value) {
  const normalized = DEPTH_GATE_CONFIG.legacyThresholdAliases[value] ?? value;
  return DEPTH_GATE_CONFIG.gates.some(gate => gate.threshold === normalized)
    ? normalized
    : null;
}

export class DepthGateSystem {
  constructor(scene, typedConfirmationModal = null) {
    if (typeof typedConfirmationModal?.showConfirmation !== "function") {
      throw new Error("[DepthGateSystem] Typed Phaser confirmation modal is required.");
    }
    this.scene = scene;
    this.modal = typedConfirmationModal;
    this.accepted = new Set();
    this.activeGate = null;
    this._previousGameState = "playing";
  }

  update() {
    if (this.activeGate) return true;
    const tile = this.scene.playerController?.getPlayerTile();
    if (!tile) return false;
    const depth = Math.max(0, tile.ty - this.scene.config.topAirRows + 1);
    const gate = DEPTH_GATE_CONFIG.gates.find(
      item => depth >= item.threshold && !this.accepted.has(item.threshold),
    );
    if (!gate) return false;
    return this._open(gate);
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
    if (this.activeGate && this.modal?.isVisible) {
      this.modal.close?.();
    }
    this.activeGate = null;
    this.modal = null;
    this.scene = null;
  }

  _open(gate) {
    if (!gate || this.activeGate || this.modal.isVisible) return false;

    this.activeGate = gate;
    this._previousGameState = this.scene.gameState && this.scene.gameState !== "depth-warning"
      ? this.scene.gameState
      : "playing";
    this.scene.gameState = "depth-warning";
    this.scene.playerController?.setControlsEnabled(false);
    this.scene.earthquakeSystem?.setPaused(true);
    const opened = this.modal.showConfirmation({
      title: gate.title,
      subtitle: DEPTH_GATE_CONFIG.confirmation.subtitle,
      body: gate.message,
      footer: DEPTH_GATE_CONFIG.confirmation.footer,
      confirmationWord: gate.confirmationWord,
      typedInstruction: gate.typedInstruction,
      onCancel: () => this._decline({ fromModal: true }),
      onConfirm: () => this._accept(),
    });
    if (opened) return true;

    this.activeGate = null;
    this._resumeScene();
    return false;
  }

  _accept() {
    if (!this.activeGate) return false;
    this.accepted.add(this.activeGate.threshold);
    this.scene.queueDugTilesSave?.();
    this._closeAndResume();
    return true;
  }

  _decline({ fromModal = false } = {}) {
    if (!this.activeGate) return false;
    if (!fromModal && this.modal?.isVisible) {
      return this.modal.close?.({ cancelled: true }) === true;
    }

    this.scene.earthquakeSystem?.cancelActiveHazards();
    this.scene._resetPlayerToSpawn?.();
    this._closeAndResume();
    return true;
  }

  _closeAndResume() {
    this.activeGate = null;
    this._resumeScene();
  }

  _resumeScene() {
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

