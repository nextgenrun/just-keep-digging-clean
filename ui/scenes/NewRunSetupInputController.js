import { HARDCORE_MODE_CONFIG } from "../../values/hardcoreMode.js";
import { TOWN_TUTORIAL_CHOICES } from "../../values/retentionConfig.js";

export class NewRunSetupInputController {
  constructor(owner) {
    this.owner = owner;
    this.scene = owner.scene;
    this.attachTimer = null;
    this.keyHandler = event => this._handleKey(event);
  }

  attach() {
    this.detach();
    this.attachTimer = this.scene.time.delayedCall(0, () => {
      this.attachTimer = null;
      if (this.owner?.isVisible) {
        this.scene.input.keyboard.on("keydown", this.keyHandler);
      }
    });
  }

  detach() {
    this.attachTimer?.remove?.(false);
    this.attachTimer = null;
    this.scene?.input?.keyboard?.off?.("keydown", this.keyHandler);
  }

  _handleKey(event) {
    const owner = this.owner;
    if (!owner?.isVisible) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const key = String(event?.key || "");
    const lower = key.toLowerCase();
    if (lower === "escape") return owner.close(true);
    if (lower === "enter" || key === " ") return owner._confirm();
    if (lower === "backspace" && owner.tutorialChoice === TOWN_TUTORIAL_CHOICES.NO) {
      owner.skipConfirmation = owner.skipConfirmation.slice(0, -1);
      owner._refresh();
      return;
    }
    const letter = /^[a-z]$/i.test(key) ? key.toUpperCase() : "";
    if (
      letter
      && owner.tutorialChoice === TOWN_TUTORIAL_CHOICES.NO
      && owner.skipConfirmation.length < owner.copy.skipConfirmation.length
    ) {
      owner.skipConfirmation += letter;
      owner._refresh();
      return;
    }
    if (lower === "arrowup" || lower === "w") {
      owner.focusRow = "mode";
      owner._refresh();
      return;
    }
    if (lower === "arrowdown" || lower === "s") {
      owner.focusRow = "tutorial";
      owner._refresh();
      return;
    }
    if (["arrowleft", "arrowright", "a", "d"].includes(lower)) {
      this._handleHorizontal(lower === "arrowleft" || lower === "a");
      return;
    }
    if (!letter) return;
    if (
      owner.mode === HARDCORE_MODE_CONFIG.modes.hardcore
      && owner.tutorialChoice === TOWN_TUTORIAL_CHOICES.YES
    ) {
      this._advanceHiddenSequence(letter);
      return;
    }
  }

  _handleHorizontal(left) {
    const owner = this.owner;
    if (owner.focusRow === "mode") {
      owner._setMode(left
        ? HARDCORE_MODE_CONFIG.modes.casual
        : HARDCORE_MODE_CONFIG.modes.hardcore);
      return;
    }
    owner._setTutorial(left
      ? TOWN_TUTORIAL_CHOICES.YES
      : TOWN_TUTORIAL_CHOICES.NO);
  }

  _advanceHiddenSequence(letter) {
    const owner = this.owner;
    const target = owner.copy.hiddenSequence;
    const candidate = `${owner.hiddenSequence}${letter}`;
    owner.hiddenSequence = target.startsWith(candidate)
      ? candidate
      : letter === target[0] ? letter : "";
    if (owner.hiddenSequence !== target) return;
    owner.mode = HARDCORE_MODE_CONFIG.modes.oneLifeHardcore;
    owner.hiddenSequence = "";
    owner._refresh();
  }

  destroy() {
    this.detach();
    this.owner = null;
    this.scene = null;
  }
}
