import { HARDCORE_MODE_CONFIG } from "../../values/hardcoreMode.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { HardcoreDeathRecapView } from "./HardcoreDeathRecapView.js";
import { createHardcoreModalView } from "./HardcoreModalViewFactory.js";

export class HardcoreModalOverlay {
  constructor(scene, config = HARDCORE_MODE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.panel = null;
    this.confirmationRoot = null;
    this.deathView = null;
    this.title = null;
    this.subtitle = null;
    this.body = null;
    this.instruction = null;
    this.typed = null;
    this.footer = null;
    this.mode = null;
    this.buffer = "";
    this.confirmationWord = this.config.unstuck.confirmationWord;
    this.busy = false;
    this.onConfirm = null;
    this.onCancel = null;
    this._keyHandler = event => this._handleKey(event);
    this._create();
  }

  get isVisible() {
    return this.root?.visible === true;
  }

  _create() {
    Object.assign(this, createHardcoreModalView(this.scene, this.config));
  }

  _ensureDeathView() {
    this.deathView ||= new HardcoreDeathRecapView(this.scene, this.root);
    return this.deathView;
  }

  showConfirmation({
    title,
    subtitle = "IRREVERSIBLE CONFIRMATION",
    body,
    footer = "ESC  CANCEL",
    footerColor = UI_COLORS.dim,
    confirmationWord = this.config.unstuck.confirmationWord,
    typedInstruction = this.config.copy.typedInstruction,
    onConfirm,
    onCancel,
  }) {
    if (this.isVisible) return false;
    const normalizedWord = String(confirmationWord || "").trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(normalizedWord)) {
      throw new Error("[HardcoreModalOverlay] Confirmation phrase must be alphanumeric.");
    }
    this.mode = "confirmation";
    this.buffer = "";
    this.confirmationWord = normalizedWord;
    this.busy = false;
    this.onConfirm = typeof onConfirm === "function" ? onConfirm : null;
    this.onCancel = typeof onCancel === "function" ? onCancel : null;
    this.deathView?.hide();
    this.confirmationRoot.setVisible(true);
    this.title.setText(title || "");
    this.subtitle.setText(subtitle);
    this.body.setText(body || "");
    this.instruction.setText(typedInstruction);
    this.typed
      .setText(this.confirmationWord.replace(/./g, "_").split("").join(" "))
      .setColor(UI_COLORS.danger);
    this.footer.setText(footer).setColor(footerColor);
    this.root.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 180,
      ease: "Power2.out",
    });
    this.scene.input.keyboard.on("keydown", this._keyHandler);
    return true;
  }

  showDeath({ reason, depth, pages, onRetry, onReturn, presentation }) {
    const deathView = this._ensureDeathView();
    this._showRecap("death", true, () => deathView.show({
      reason,
      depth,
      pages,
      presentation,
      onRetry: () => this._finishRecap(onRetry),
      onReturn: () => this._finishRecap(onReturn),
    }));
  }

  showMemorial({ reason, depth, slotId, pages, onClose }) {
    if (this.isVisible) return false;
    const deathView = this._ensureDeathView();
    this._showRecap("memorial", false, () => deathView.showMemorial({
      reason,
      depth,
      slotId,
      pages,
      onClose: () => this._finishRecap(onClose),
    }));
    return true;
  }

  _showRecap(mode, busy, present) {
    this.mode = mode;
    this.buffer = "";
    this.busy = busy;
    this.onConfirm = null;
    this.onCancel = null;
    this.confirmationRoot.setVisible(false);
    present();
    this.root.setVisible(true).setAlpha(1);
    this.scene.input.keyboard.on("keydown", this._keyHandler);
  }

  setDeathReady(detail = "", presentation = null) {
    if (this.mode !== "death") return;
    this.busy = false;
    this.deathView.setReady(detail, presentation);
    this.scene.tweens.add({
      targets: this.panel,
      alpha: { from: 0.7, to: 1 },
      duration: this.deathView.config.recap.readyPanelPulseMs,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });
  }

  setDeathSaving(presentation = null) {
    if (this.mode !== "death") return;
    this.busy = true;
    this.deathView.setSaving(presentation);
  }

  setError(message) {
    if (!this.isVisible) return;
    this.busy = false;
    if (this.mode === "death") {
      this.deathView.setError(message);
      return;
    }
    this.instruction.setText(String(message || "ACTION FAILED"));
    this.instruction.setColor(UI_COLORS.danger);
  }

  close({ cancelled = false } = {}) {
    if (!this.isVisible || this.mode === "death") return false;
    if (this.mode === "memorial") return this.deathView.requestClose();
    const onCancel = this.onCancel;
    this._resetAndHide();
    if (cancelled) onCancel?.();
    return true;
  }

  _handleKey(event) {
    if (!this.isVisible) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const key = String(event?.key || "");

    if (this.mode === "death" || this.mode === "memorial") {
      this.deathView.handleKey(event);
      return;
    }
    if (this.busy) return;
    if (key === "Escape") {
      this.close({ cancelled: true });
      return;
    }
    if (key === "Backspace") {
      this.buffer = this.buffer.slice(0, -1);
      this._refreshTypedValue();
      return;
    }
    if (key === "Enter") {
      if (this.buffer !== this.confirmationWord) {
        this.scene.soundSystem?.playUiSelect?.();
        this.typed.setColor(UI_COLORS.danger);
        return;
      }
      this._commitConfirmation();
      return;
    }
    if (/^[a-z0-9]$/i.test(key) && this.buffer.length < this.confirmationWord.length) {
      this.buffer += key.toUpperCase();
      this._refreshTypedValue();
    }
  }

  _refreshTypedValue() {
    const expectedLength = this.confirmationWord.length;
    const padded = this.buffer.padEnd(expectedLength, "_").split("").join(" ");
    this.typed.setText(padded);
    this.typed.setColor(
      this.buffer === this.confirmationWord
        ? UI_COLORS.success
        : UI_COLORS.danger,
    );
    this.scene.soundSystem?.playUiSelect?.();
  }

  async _commitConfirmation() {
    if (this.busy) return;
    this.busy = true;
    this.instruction.setText("COMMITTING...");
    this.typed.setText("");
    try {
      const result = await this.onConfirm?.();
      if (result === false) {
        this.busy = false;
        this.instruction.setText("ACTION COULD NOT BE COMPLETED");
        return;
      }
      this._resetAndHide();
    } catch (error) {
      this.busy = false;
      this.setError(error?.message || "ACTION FAILED");
    }
  }

  _finishRecap(callback) {
    this._resetAndHide();
    if (typeof callback === "function") callback();
  }

  _resetAndHide() {
    this.scene.input.keyboard.off("keydown", this._keyHandler);
    this.root.setVisible(false).setAlpha(1);
    this.deathView?.hide();
    this.confirmationRoot.setVisible(true);
    this.instruction.setColor(UI_COLORS.gold);
    this.footer.setColor(UI_COLORS.dim);
    this.mode = null;
    this.buffer = "";
    this.confirmationWord = this.config.unstuck.confirmationWord;
    this.busy = false;
    this.onConfirm = null;
    this.onCancel = null;
  }

  destroy() {
    this.scene?.input?.keyboard?.off?.("keydown", this._keyHandler);
    this.deathView?.destroy();
    this.deathView = null;
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
