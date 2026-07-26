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
      || this.scene.levelUpPopup?.visible
    ) return;

    const abilities = this.scene.playerController?.abilities;
    const thunderActive = this.scene._thunderStrikeAnimating || keys?.c?.isDown;
    if (thunderActive) {
      const preview = abilities?.getThunderStrikePreview?.();
      if (preview?.entries?.length) this._drawThunder(preview);
      return;
    }

    if (keys?.q?.isDown && abilities?.isQuickslashUnlocked?.()) {
      this._drawQuickslash(targetTile, abilities);
      return;
    }

    const finalHit = this._getFinalHitPreview(targetTile);
    const heavy = this.scene.digSystem?.getHeavyPunchPreview?.(
      targetTile,
      this.scene.playerController?.getAimLabel?.()
    );
    if (heavy) this._drawHeavyPunch(heavy, !finalHit);
    if (finalHit) this._drawFinalHit(finalHit);
  }

  _getFinalHitPreview(targetTile) {
    const world = this.scene.worldModel;
    if (!world?.isDiggable?.(targetTile.tx, targetTile.ty)) return null;
    const tileType = world.getTileType(targetTile.tx, targetTile.ty);
    const damage = this.scene.digSystem?.getDamagePreview?.(tileType) || 0;
    const hp = world.getTileHp(targetTile.tx, targetTile.ty);
    if (damage <= 0 || hp <= 0 || damage < hp) return null;
    return { ...targetTile, damage, hp };
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

  _drawHeavyPunch(preview, showLabel = true) {
    const position = this._drawTile(preview.tx, preview.ty, this.config.heavyColor);
    if (showLabel) {
      this._setLabel(position, `HEAVY PUNCH  +${preview.damage}`, this.config.heavyColor);
    }
  }

  _drawFinalHit(preview) {
    const color = 0xf6df80;
    const position = this._drawTile(preview.tx, preview.ty, color, 0.18);
    this._setLabel(position, "FINAL HIT  •  BREAK", color);
  }

  _drawQuickslash(targetTile, abilities) {
    const position = this._drawTile(targetTile.tx, targetTile.ty, this.config.quickslashColor);
    const player = this.scene.playerController?.getPlayerPosition?.();
    if (player) {
      this.graphics.lineStyle(this.config.lineWidth, this.config.quickslashColor, 0.8);
      this.graphics.lineBetween(player.x, player.y, position.x, position.y);
    }
    this._setLabel(
      position,
      `${USER_SETTINGS.getKeyLabel("quickslash")} ROUTE  •  ${abilities.getQuickslashCost()} GP`,
      this.config.quickslashColor
    );
  }

  _drawThunder(preview) {
    let last = null;
    preview.entries.forEach(entry => {
      last = this._drawTile(entry.tx, entry.ty, this.config.thunderColor, entry.solid ? 0.18 : 0.07);
    });
    if (last) {
      this._setLabel(
        last,
        `${USER_SETTINGS.getKeyLabel("thunderStrike")} FOOTPRINT  •  ${preview.range} tiles  •  ${preview.cost} GP`,
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
