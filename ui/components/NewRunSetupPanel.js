import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  HARDCORE_MODE_CONFIG,
  resolveHardcoreModeFromSearch,
} from "../../values/hardcoreMode.js";
import { OPENING_FLIGHT_TUTORIAL_CHOICES } from "../../values/openingFlightArtifact.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";

const DEPTH = 5100;
const COLORS = Object.freeze({
  title: "#fff0b8",
  body: "#c7d9e5",
  selected: 0xffd46a,
  normal: 0xffffff,
  warning: "#ff9c78",
  success: "#9de3a1",
});

export class NewRunSetupPanel {
  constructor(scene, { onConfirm, onCancel } = {}) {
    this.scene = scene;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.mode = resolveHardcoreModeFromSearch(
      globalThis.window?.location?.search || "",
    ) || HARDCORE_MODE_CONFIG.modes.hardcore;
    this.tutorialChoice = OPENING_FLIGHT_TUTORIAL_CHOICES.guided;
    this.skipConfirmation = "";
    this.hiddenSequence = "";
    this.cards = {};
    this.container = scene.add.container(0, 0).setDepth(DEPTH);
    this._build();
    // The panel is constructed by StartMenuScene's Space key handler. Wait one
    // Phaser tick before accepting keys so that opening press cannot also
    // confirm the default choices in the same emitter dispatch.
    this._keyboardReady = false;
    this._keyboardReadyTimer = scene.time.delayedCall(0, () => {
      this._keyboardReady = true;
      this._keyboardReadyTimer = null;
    });
    this._onKeyDown = (event) => this._handleKeyDown(event);
    scene.input.keyboard.on("keydown", this._onKeyDown);
  }

  _build() {
    const centerX = this.scene.scale.width / 2;
    const headerFrame = this.scene.add.image(
      centerX,
      185,
      ASSET_KEYS.ui.approvedHud.notification,
    ).setDisplaySize(760, 96);
    const title = this.scene.add.text(centerX, 169, "NEW EXPEDITION", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: "27px",
      fontStyle: "bold",
      color: COLORS.title,
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: 3,
    }).setOrigin(0.5);
    const subtitle = this.scene.add.text(
      centerX,
      201,
      "Choose once for this save. Existing saves keep their rules.",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: "14px",
        color: COLORS.body,
      },
    ).setOrigin(0.5);
    this.container.add([headerFrame, title, subtitle]);

    this.cards.casual = this._addCard({
      x: 360,
      y: 310,
      title: "CASUAL",
      body: "No life loss  •  no Hardcore Wurm",
      onPress: () => this._setMode(HARDCORE_MODE_CONFIG.modes.casual),
    });
    this.cards.hardcore = this._addCard({
      x: 920,
      y: 310,
      title: "HARDCORE  •  PRIMARY",
      body: "2 lives  •  first revive is free  •  risk events",
      onPress: () => this._setMode(HARDCORE_MODE_CONFIG.modes.hardcore),
    });
    this.cards.guided = this._addCard({
      x: 360,
      y: 445,
      title: "GUIDED OPENING",
      body: "Learn Dig → Flight → Portal on the authored route",
      onPress: () => this._setTutorialChoice(OPENING_FLIGHT_TUTORIAL_CHOICES.guided),
    });
    this.cards.skip = this._addCard({
      x: 920,
      y: 445,
      title: "SKIP TUTORIAL",
      body: "Start with Flight  •  starter cache rewards are skipped",
      onPress: () => this._setTutorialChoice(OPENING_FLIGHT_TUTORIAL_CHOICES.skip),
    });

    const confirmFrame = this.scene.add.image(
      centerX,
      565,
      ASSET_KEYS.ui.approvedHud.buffChip,
    ).setDisplaySize(330, 54).setTint(COLORS.selected);
    const confirmText = this.scene.add.text(centerX, 565, "START EXPEDITION", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: "17px",
      fontStyle: "bold",
      color: "#fff4ca",
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: 2,
    }).setOrigin(0.5);
    const confirmZone = this.scene.add.zone(centerX, 565, 330, 54)
      .setInteractive({ useHandCursor: true });
    confirmZone.on("pointerdown", () => this._confirm());

    const cancelFrame = this.scene.add.image(
      centerX,
      662,
      ASSET_KEYS.ui.approvedHud.buffChip,
    ).setDisplaySize(180, 36);
    const cancelText = this.scene.add.text(centerX, 662, "ESC  •  CANCEL", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: "12px",
      color: COLORS.body,
    }).setOrigin(0.5);
    const cancelZone = this.scene.add.zone(centerX, 662, 180, 36)
      .setInteractive({ useHandCursor: true });
    cancelZone.on("pointerdown", () => this.onCancel?.());

    this.statusText = this.scene.add.text(centerX, 613, "", {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: "14px",
      color: COLORS.body,
    }).setOrigin(0.5);
    this.container.add([
      confirmFrame,
      confirmText,
      confirmZone,
      cancelFrame,
      cancelText,
      cancelZone,
      this.statusText,
    ]);
    this._refresh();
  }

  _addCard({ x, y, title, body, onPress }) {
    const frame = this.scene.add.image(
      x,
      y,
      ASSET_KEYS.ui.approvedHud.worldState,
    ).setDisplaySize(500, 104);
    const titleText = this.scene.add.text(x, y - 17, title, {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: "18px",
      fontStyle: "bold",
      color: COLORS.title,
      stroke: APPROVED_HUD_SKIN.font.shadow,
      strokeThickness: 2,
    }).setOrigin(0.5);
    const bodyText = this.scene.add.text(x, y + 18, body, {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: "13px",
      color: COLORS.body,
    }).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, 500, 104)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerdown", onPress);
    zone.on("pointerover", () => frame.setAlpha(1));
    zone.on("pointerout", () => frame.setAlpha(0.94));
    frame.setAlpha(0.94);
    this.container.add([frame, titleText, bodyText, zone]);
    return { frame, titleText, bodyText };
  }

  _setMode(mode) {
    this.mode = mode;
    this.hiddenSequence = "";
    this._refresh();
  }

  _setTutorialChoice(choice) {
    this.tutorialChoice = choice;
    this.skipConfirmation = "";
    this._refresh();
  }

  _handleKeyDown(event) {
    if (!this._keyboardReady) return;
    const key = String(event?.key || "");
    if (key === "Escape") {
      this.onCancel?.();
      return;
    }
    if (key === "Enter" || key === " ") {
      this._confirm();
      return;
    }

    const letter = key.length === 1 ? key.toUpperCase() : "";
    if (
      this.mode === HARDCORE_MODE_CONFIG.modes.hardcore
      && this.tutorialChoice === OPENING_FLIGHT_TUTORIAL_CHOICES.guided
      && /^[A-Z]$/.test(letter)
    ) {
      const target = "ONELIFE";
      const candidate = `${this.hiddenSequence}${letter}`;
      this.hiddenSequence = target.startsWith(candidate)
        ? candidate
        : (letter === target[0] ? letter : "");
      if (this.hiddenSequence === target) {
        this.mode = HARDCORE_MODE_CONFIG.modes.oneLifeHardcore;
        this.hiddenSequence = "";
        this._refresh();
        return;
      }
    }

    if (this.tutorialChoice !== OPENING_FLIGHT_TUTORIAL_CHOICES.skip) return;
    if (key === "Backspace") {
      this.skipConfirmation = this.skipConfirmation.slice(0, -1);
    } else if (/^[A-Z]$/.test(letter) && this.skipConfirmation.length < 3) {
      this.skipConfirmation += letter;
    } else {
      return;
    }
    this._refresh();
  }

  _confirm() {
    if (
      this.tutorialChoice === OPENING_FLIGHT_TUTORIAL_CHOICES.skip
      && this.skipConfirmation !== "YES"
    ) {
      this.statusText.setColor(COLORS.warning);
      this.statusText.setText(
        `TYPE YES TO CONFIRM TUTORIAL SKIP: ${this.skipConfirmation || "_"}`,
      );
      return;
    }
    this.onConfirm?.({
      mode: this.mode,
      tutorialChoice: this.tutorialChoice,
    });
  }

  _refresh() {
    const riskMode = this.mode !== HARDCORE_MODE_CONFIG.modes.casual;
    this.cards.casual.frame.setTint(riskMode ? COLORS.normal : COLORS.selected);
    this.cards.hardcore.frame.setTint(riskMode ? COLORS.selected : COLORS.normal);
    this.cards.hardcore.titleText.setText(
      this.mode === HARDCORE_MODE_CONFIG.modes.oneLifeHardcore
        ? "ONE-LIFE HARDCORE  •  HIDDEN"
        : "HARDCORE  •  PRIMARY",
    );
    this.cards.hardcore.bodyText.setText(
      this.mode === HARDCORE_MODE_CONFIG.modes.oneLifeHardcore
        ? "1 life  •  no free revive  •  risk events"
        : "2 lives  •  first revive is free  •  risk events",
    );
    const guided = this.tutorialChoice === OPENING_FLIGHT_TUTORIAL_CHOICES.guided;
    this.cards.guided.frame.setTint(guided ? COLORS.selected : COLORS.normal);
    this.cards.skip.frame.setTint(guided ? COLORS.normal : COLORS.selected);
    if (guided) {
      this.statusText.setColor(COLORS.success);
      this.statusText.setText("GUIDED ROUTE SELECTED  •  ENTER OR CLICK START");
    } else {
      this.statusText.setColor(COLORS.warning);
      this.statusText.setText(
        `TYPE YES TO CONFIRM TUTORIAL SKIP: ${this.skipConfirmation || "_"}`,
      );
    }
  }

  destroy() {
    this.scene?.input?.keyboard?.off("keydown", this._onKeyDown);
    this._keyboardReadyTimer?.remove(false);
    this._keyboardReadyTimer = null;
    this.container?.destroy(true);
    this.container = null;
    this.scene = null;
  }
}
