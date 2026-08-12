import { createButton } from "../PhaserUiKit.js";
import { createModalShell } from "../UiModalShell.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export class PlaySceneRecoveryOverlay {
  constructor(scene) {
    this.scene = scene;
    this.shell = null;
    this.body = null;
    this.reloadButton = null;
    this.menuButton = null;
  }

  show(finding = {}) {
    this._ensureCreated();
    const subsystem = finding.id || finding.phase || "gameplay authority";
    this.body.setText([
      "The game stopped input before the failure could spread.",
      "Your previous valid save has not been overwritten.",
      "",
      `FAILED SUBSYSTEM  ${String(subsystem).toUpperCase()}`,
      "",
      "Reload the last valid save or return to the main menu.",
    ]);
    this.shell.show();
    return true;
  }

  destroy() {
    this.reloadButton?.destroy?.();
    this.menuButton?.destroy?.();
    this.shell?.destroy?.();
    this.reloadButton = null;
    this.menuButton = null;
    this.body = null;
    this.shell = null;
    this.scene = null;
  }

  _ensureCreated() {
    if (this.shell) return;
    const scene = this.scene;
    this.shell = createModalShell(scene, {
      title: "RECOVERY MODE",
      subtitle: "Progress protection is active",
      icon: "health",
      maxWidth: 760,
      maxHeight: 430,
      depth: 10000,
      showClose: false,
    });
    const rect = this.shell.getContentRect();
    this.body = scene.add.text(rect.left + 24, rect.top + 18, "", {
      fontFamily: UI_FONTS.body,
      fontSize: "17px",
      color: UI_COLORS.body,
      lineSpacing: 8,
      wordWrap: { width: rect.width - 48, useAdvancedWrap: true },
    });
    this.shell.content.add(this.body);
    const buttonY = rect.bottom - 38;
    this.reloadButton = createButton(scene, {
      x: rect.left + rect.width * 0.3,
      y: buttonY,
      width: 260,
      label: "RELOAD LAST VALID SAVE",
      icon: "save",
      parent: this.shell.content,
      onClick: () => scene.restartFromLastValidSave?.(),
    });
    this.menuButton = createButton(scene, {
      x: rect.left + rect.width * 0.72,
      y: buttonY,
      width: 210,
      label: "MAIN MENU",
      icon: "home",
      parent: this.shell.content,
      accent: UI_COLORS.danger,
      onClick: () => scene.returnToMenuFromRecovery?.(),
    });
  }
}
