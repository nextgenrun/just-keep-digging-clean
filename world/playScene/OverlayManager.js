/**
 * Manages overlay dialogs and UI overlays for PlayScene
 * Handles title screen, death screen, dialog overlays
 */
import { USER_SETTINGS } from "../../systems/UserSettings.js";

export class OverlayManager {
  constructor(scene) {
    this.scene = scene;
  }

  createOverlay() {
    const W = this.scene.config.viewportWidth;
    const H = this.scene.config.viewportHeight;
    const cx = W * 0.5;
    const cy = H * 0.5;
    const PANEL_W = 820;
    const PANEL_H = 270;

    // Lighter backdrop so game atmosphere shows through
    this.overlayBackdrop = this.scene.add
      .rectangle(cx, cy, W, H, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false)
      .setInteractive();
    this.overlayBackdrop.on('pointerdown', () => {
      if (!this.overlayBackdrop.visible) return;
      if (this.scene.gameState === "title") {
        this.scene.startRun();
      } else if (this.scene.gameState === "dialog") {
        this.hideOverlay();
        this.scene.gameState = "playing";
      }
    });

    // Centered panel
    this.overlayPanel = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(2001)
      .setVisible(false)
      .setAlpha(0);
    this._drawPanel(PANEL_W, PANEL_H);

    // Separator line inside panel (below title)
    this.overlaySep = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(2002)
      .setVisible(false)
      .setAlpha(0);
    this.overlaySep.lineStyle(1, 0x2a3a4a, 0.6);
    this.overlaySep.lineBetween(cx - PANEL_W / 2 + 30, cy - PANEL_H / 2 + 58, cx + PANEL_W / 2 - 30, cy - PANEL_H / 2 + 58);

    // Title text
    this.overlayTitle = this.scene.add
      .text(cx, cy - PANEL_H / 2 + 32, "", {
        fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
        fontSize: "25px",
        color: "#f7f0df",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2002)
      .setVisible(false)
      .setAlpha(0);

    // Body text
    this.overlayBody = this.scene.add
      .text(cx, cy - PANEL_H / 2 + 72, "", {
        fontFamily: "Consolas, monospace",
        fontSize: "18px",
        color: "rgb(230, 235, 240)",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2002)
      .setVisible(false)
      .setAlpha(0);

    this._panelW = PANEL_W;
    this._panelH = PANEL_H;
  }

  _drawPanel(w, h) {
    if (!this.overlayPanel) return;
    const W = this.scene.config.viewportWidth;
    const H = this.scene.config.viewportHeight;
    const cx = W * 0.5;
    const cy = H * 0.5;
    this.overlayPanel.clear();
    this.overlayPanel.fillStyle(0x0d1117, 0.97);
    this.overlayPanel.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
    this.overlayPanel.lineStyle(2, 0x2a3a4a, 1);
    this.overlayPanel.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
  }

  showOverlay(title, body) {
    const targets = [this.overlayBackdrop, this.overlayPanel, this.overlaySep, this.overlayTitle, this.overlayBody];
    targets.forEach(o => {
      if (o) {
        this.scene.tweens.killTweensOf(o);
        o.setVisible(true);
      }
    });

    this.overlayTitle.setText(title);
    this.overlayBody.setText(body);

    // Set start alpha
    this.overlayBackdrop.setAlpha(0);
    this.overlayPanel.setAlpha(0);
    this.overlaySep.setAlpha(0);
    this.overlayTitle.setAlpha(0);
    this.overlayBody.setAlpha(0);

    // Backdrop fades to 0.75
    this.scene.tweens.add({ targets: this.overlayBackdrop, alpha: 0.75, duration: 250, ease: 'Power2.out' });
    // Panel and text fade in slightly after
    this.scene.tweens.add({
      targets: [this.overlayPanel, this.overlaySep, this.overlayTitle, this.overlayBody],
      alpha: 1,
      duration: 260,
      ease: 'Power2.out',
      delay: 45,
    });
  }

  hideOverlay() {
    const targets = [this.overlayBackdrop, this.overlayPanel, this.overlaySep, this.overlayTitle, this.overlayBody].filter(Boolean);
    targets.forEach(o => this.scene.tweens.killTweensOf(o));
    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: 200,
      ease: 'Power1.in',
      onComplete: () => targets.forEach(o => o?.setVisible(false)),
    });
  }

  showGameDialog(title, body) {
    this.scene.shopOverlay?.hide();
    
    // For long text dialogs like Bobo's wisdom, use a taller panel
    const lineCount = body.split('\n').length;
    const needsMoreHeight = lineCount > 12;
    
    if (needsMoreHeight) {
      // Rebuild panel taller for wisdom/long dialogs
      const W = this.scene.config.viewportWidth;
      const H = this.scene.config.viewportHeight;
      const cx = W * 0.5;
      const cy = H * 0.5;
      const PANEL_W = 820;
      const PANEL_H = 500; // Taller for long text
      
      this.overlayPanel.clear();
      this.overlayPanel.fillStyle(0x0d1117, 0.97);
      this.overlayPanel.fillRoundedRect(cx - PANEL_W / 2, cy - PANEL_H / 2, PANEL_W, PANEL_H, 8);
      this.overlayPanel.lineStyle(2, 0x2a3a4a, 1);
      this.overlayPanel.strokeRoundedRect(cx - PANEL_W / 2, cy - PANEL_H / 2, PANEL_W, PANEL_H, 8);
      
      this.overlaySep.clear();
      this.overlaySep.lineStyle(1, 0x2a3a4a, 0.6);
      this.overlaySep.lineBetween(cx - PANEL_W / 2 + 30, cy - PANEL_H / 2 + 58, cx + PANEL_W / 2 - 30, cy - PANEL_H / 2 + 58);
      
      this.overlayBody.setY(cy - PANEL_H / 2 + 72);
      
      this._panelH = PANEL_H;
      
      // Make font smaller for long text to fit better
      this.overlayBody.setFontSize(16);
    } else {
      // Standard panel size with larger font
      this.overlayBody.setFontSize(18);
    }
    
    this.showOverlay(title, body);
  }

  showTitleOverlay() {
    this.hideOverlay();
    this.showOverlay(
      "Dig Game Alpha v1",
      this._buildTitleCopy()
    );
  }

  _buildTitleCopy() {
    if (!USER_SETTINGS.getDisplay().showControlHints) {
      return "Press ENTER, click, or any movement key to start\n\n";
    }
    return [
      "Press ENTER, click, or any movement key to start",
      `${USER_SETTINGS.getKeyLabel("moveLeft")}/${USER_SETTINGS.getKeyLabel("moveRight")} move and aim, ${USER_SETTINGS.getKeyLabel("fly")} fly, ${USER_SETTINGS.getKeyLabel("dig")} dig`,
      `${USER_SETTINGS.getKeyLabel("inventory")} inventory  |  ${USER_SETTINGS.getKeyLabel("interact")} interact  |  ${USER_SETTINGS.getKeyLabel("pause")} pause`,
      "",
    ].join("\n");
  }

  refreshOverlayCopy() {
    if (this.scene.gameState === "title" && this.overlayBody?.visible) {
      this.overlayBody.setText(this._buildTitleCopy());
    }
  }

  showDeathOverlay(depth, resources, tilesBroken) {
    const body = [
      `You reached crush depth at ${depth} tiles.`,
      `Broken: ${tilesBroken}  Dirt: ${resources.dirt}  Stone: ${resources.stone}  Copper: ${resources.copper}`,
      `Press ${USER_SETTINGS.getKeyLabel("restart")} to restart instantly.`,
    ].join("\n");

    this.showOverlay("Run Over", body);
  }

  destroy() {
    [this.overlayBackdrop, this.overlayPanel, this.overlaySep, this.overlayTitle, this.overlayBody]
      .forEach(o => o?.destroy());
  }
}
