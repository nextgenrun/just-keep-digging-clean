import { createButton } from "../PhaserUiKit.js";
import { createModalShell } from "../UiModalShell.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { RECOVERY_COPY } from "../../values/playerFacingCopy.js";

export class PlaySceneRecoveryOverlay {
  constructor(scene) {
    this.scene = scene;
    this.shell = null;
    this.body = null;
    this.reloadButton = null;
    this.menuButton = null;
  }

  show() {
    this._ensureCreated();
    this.body.setText(RECOVERY_COPY.body);
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
      title: RECOVERY_COPY.title,
      subtitle: RECOVERY_COPY.subtitle,
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
      label: RECOVERY_COPY.reload,
      icon: "save",
      parent: this.shell.content,
      onClick: () => scene.restartFromLastValidSave?.(),
    });
    this.menuButton = createButton(scene, {
      x: rect.left + rect.width * 0.72,
      y: buttonY,
      width: 210,
      label: RECOVERY_COPY.mainMenu,
      icon: "home",
      parent: this.shell.content,
      accent: UI_COLORS.danger,
      onClick: () => scene.returnToMenuFromRecovery?.(),
    });
  }
}
