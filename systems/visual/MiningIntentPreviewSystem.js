import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";

export class MiningIntentPreviewSystem {
  constructor(scene) {
    this.scene = scene;
    this.config = RETENTION_CONFIG.intentPreview;
    this.graphics = scene.add.graphics().setDepth(this.config.depth);
    this.label = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: this.config.labelFontSize,
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "#08121b",
      padding: { x: 6, y: 3 },
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(this.config.depth + 1).setVisible(false);
  }

  update(targetTile, keys) {
    this.graphics.clear();
    this.label.setVisible(false);
    if (
      this.scene.gameState !== "playing"
      || !targetTile
      || this.scene.shopOverlay?.isVisible
    ) return;

    const abilities = this.scene.playerController?.abilities;
    const thunderActive = this.scene._thunderStrikeAnimating || keys?.c?.isDown;
    if (thunderActive) {
      const preview = abilities?.getThunderStrikePreview?.();
      if (preview?.entries?.length) this._drawThunder(preview);
    }
  }

  _drawTile(tx, ty, color, fillAlpha = this.config.fillAlpha) {
    const ts = this.scene.config.tileSize;
    const x = tx * ts;
    const y = ty * ts;
    this.graphics.fillStyle(color, fillAlpha);
    this.graphics.fillRect(x, y, ts, ts);
    this.graphics.lineStyle(this.config.lineWidth, color, 0.92);
    this.graphics.strokeRect(x, y, ts, ts);
    return { x: x + ts / 2, y: y + ts / 2 };
  }

  _setLabel(position, text, color) {
    this.label
      .setPosition(position.x, position.y - this.config.labelOffsetY)
      .setText(text)
      .setColor(`#${color.toString(16).padStart(6, "0")}`)
      .setVisible(true);
  }

  _drawThunder(preview) {
    let last = null;
    preview.entries.forEach(entry => {
      last = this._drawTile(entry.tx, entry.ty, this.config.thunderColor, entry.solid ? 0.18 : 0.07);
    });
    if (last) {
      const footprint = preview.columns > 1
        ? `${preview.columns} × ${preview.range}`
        : `${preview.range}`;
      this._setLabel(
        last,
        `${USER_SETTINGS.getKeyLabel("thunderStrike")} FOOTPRINT  •  ${footprint} tiles  •  ${preview.cost} GP`,
        this.config.thunderColor
      );
    }
  }

  destroy() {
    this.graphics?.destroy();
    this.label?.destroy();
    this.graphics = null;
    this.label = null;
    this.scene = null;
  }
}
