import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createModalShell } from "../../ui/UiModalShell.js";

export class OverlayManager {
  constructor(scene) {
    this.scene = scene;
  }

  createOverlay() {
    this.shell = createModalShell(this.scene, {
      title: "",
      subtitle: "",
      icon: "journal",
      maxWidth: 900,
      maxHeight: 390,
      depth: 2000,
      showClose: false,
    });
    this.overlayBackdrop = this.shell.backdrop;
    this.overlayPanel = this.shell.panel;
    this.overlayTitle = this.shell.titleText;
    this.overlayBody = this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.body,
      fontSize: "17px",
      color: UI_COLORS.body,
      align: "center",
      lineSpacing: 8,
      wordWrap: { width: 780, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    this.shell.content.add(this.overlayBody);
    this.overlaySep = null;

    this.overlayBackdrop.on("pointerdown", () => {
      if (!this.overlayBackdrop.visible) return;
      if (this.scene.gameState === "title") {
        this.scene.startRun();
      } else if (this.scene.gameState === "dialog") {
        this.hideOverlay();
        this.scene.gameState = "playing";
      }
    });
  }

  _layoutBody() {
    const rect = this.shell.getContentRect();
    this.overlayBody.setWordWrapWidth(rect.width - 36);
    this.overlayBody.setPosition(rect.left + rect.width / 2, rect.top + 8);
  }

  showOverlay(title, body) {
    const lines = String(body || "").split("\n").length;
    const targetHeight = lines > 12 ? 620 : lines > 7 ? 500 : 370;
    this.shell.setMaxSize(900, targetHeight);
    this.shell.setHeader(title, "GAME MESSAGE");
    this.overlayBody.setFontSize(lines > 12 ? 15 : 17);
    this.overlayBody.setText(body || "");
    this._layoutBody();
    this.shell.show();
  }

  hideOverlay() {
    this.shell?.hide?.();
  }

  showGameDialog(title, body) {
    this.scene.shopOverlay?.hide();
    this.showOverlay(title, body);
  }

  showTitleOverlay() {
    this.hideOverlay();
    this.shell.setIcon("play");
    this.showOverlay("DIG GAME ALPHA V1", this._buildTitleCopy());
  }

  _buildTitleCopy() {
    if (!USER_SETTINGS.getDisplay().showControlHints) {
      return "Press ENTER, click, or any movement key to start";
    }
    const flightUnlocked = this.scene.openingFlightArtifactSystem
      ?.isArtifactCollected?.() === true;
    const flightCopy = flightUnlocked
      ? USER_SETTINGS.getKeyLabel("fly") + " fly"
      : "flight is the reward for learning the town loop";
    return [
      "Press ENTER, click, or any movement key to start",
      "",
      USER_SETTINGS.getKeyLabel("moveLeft") + "/" + USER_SETTINGS.getKeyLabel("moveRight") +
        " move    " + USER_SETTINGS.getKeyLabel("aimDown") + " aim down    " +
        USER_SETTINGS.getKeyLabel("dig") + " dig",
      flightCopy,
      USER_SETTINGS.getKeyLabel("inventory") + " inventory    " +
        USER_SETTINGS.getKeyLabel("interact") + " interact    " +
        USER_SETTINGS.getKeyLabel("pause") + " pause",
    ].join("\n");
  }

  refreshOverlayCopy() {
    if (this.scene.gameState === "title" && this.overlayBody?.visible) {
      this.overlayBody.setText(this._buildTitleCopy());
      this._layoutBody();
    }
  }

  showDeathOverlay(depth, resources, tilesBroken) {
    this.shell.setIcon("health");
    const body = [
      "You reached crush depth at " + depth + " tiles.",
      "",
      "Tiles broken: " + tilesBroken,
      "Dirt: " + resources.dirt + "    Stone: " + resources.stone + "    Copper: " + resources.copper,
      "",
      "Press " + USER_SETTINGS.getKeyLabel("restart") + " to restart instantly.",
    ].join("\n");
    this.showOverlay("RUN OVER", body);
  }

  destroy() {
    this.shell?.destroy?.();
    this.shell = null;
  }
}

