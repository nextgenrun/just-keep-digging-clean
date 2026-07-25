/**
 * XP Progress Bar UI Component
 * Always visible at the bottom of the screen
 */

import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { hasApprovedHudSkin } from "../../systems/visual/ApprovedHudSkin.js";

export class XPProgressBar {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.approved = hasApprovedHudSkin(scene);

    if (this.approved) {
      this.frame = scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.xp)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudDepth - 1);
    }

    // Create graphics objects for the bar
    this.barBg = scene.add.graphics();
    this.barFill = scene.add.graphics();
    this.levelText = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold"
    });
    this.xpText = scene.add.text(0, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "14px",
      color: "#aaddff"
    });

    // Set depths and fix to camera
    this.barBg.setDepth(HUD_LAYOUT.hudDepth).setScrollFactor(0);
    this.barFill.setDepth(HUD_LAYOUT.hudDepth + 1).setScrollFactor(0);
    this.levelText.setDepth(HUD_LAYOUT.hudDepth + 2).setScrollFactor(0);
    this.xpText.setDepth(HUD_LAYOUT.hudDepth + 2).setScrollFactor(0);

    this._layout();
  }

  _layout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    const layout = APPROVED_HUD_SKIN.layout.xp;
    const reference = APPROVED_HUD_SKIN.referenceViewport;
    const scale = Math.min(width / reference.width, height / reference.height);
    const frameWidth = layout.width * scale;
    const frameHeight = layout.height * scale;
    const frameX = (width - frameWidth) / 2;
    const frameY = height - (layout.bottom + layout.height) * scale;
    const barWidth = this.approved ? layout.barWidth * scale : Math.min(600, width - 40);
    const barHeight = this.approved ? layout.barHeight * scale : 20;
    const barX = this.approved ? frameX + layout.barX * scale : (width - barWidth) / 2;
    const barY = this.approved ? frameY + layout.barY * scale : height - 50;

    this.barWidth = barWidth;
    this.barHeight = barHeight;
    this.barX = barX;
    this.barY = barY;

    if (this.approved) {
      this.frame.setPosition(frameX, frameY).setDisplaySize(frameWidth, frameHeight);
      this.levelText.setPosition(frameX + layout.levelX * scale, frameY + frameHeight / 2).setOrigin(0, 0.5);
      this.xpText.setPosition(frameX + frameWidth - layout.xpRight * scale, frameY + frameHeight / 2).setOrigin(1, 0.5);
      const textStyle = {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${layout.fontSize * scale}px`,
        fontStyle: "bold",
        color: APPROVED_HUD_SKIN.font.color,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      };
      this.levelText.setStyle(textStyle);
      this.xpText.setStyle(textStyle);
    } else {
      this.levelText.setPosition(barX - 100, barY + barHeight / 2).setOrigin(1, 0.5);
      this.xpText.setPosition(barX + barWidth + 10, barY + barHeight / 2).setOrigin(0, 0.5);
    }

    this.visible = true;
    this._draw();
  }

  _draw() {
    if (!this.visible) return;

    // Draw background
    this.barBg.clear();
    this.barBg.fillStyle(0x080e13, this.approved ? 0.96 : 0.9);
    this.barBg.lineStyle(this.approved ? 1 : 2, this.approved ? 0x4c3b24 : 0x5566aa, 1);
    this.barBg.fillRoundedRect(this.barX, this.barY, this.barWidth, this.barHeight, 4);
    this.barBg.strokeRoundedRect(this.barX, this.barY, this.barWidth, this.barHeight, 4);

    // Draw fill
    this._drawFill();
  }

  _drawFill() {
    this.barFill.clear();

    const fillPercent = this._fillPercent ?? 0;
    if (fillPercent <= 0) return;

    const fillWidth = Math.max(this.barWidth * fillPercent, 6);

    let color = 0xf2d52b;
    if (!this.approved) {
      color = fillPercent < 0.3 ? 0x66ff66 : fillPercent < 0.7 ? 0xffff66 : 0xffaa00;
    }

    this.barFill.fillStyle(color, 0.85);
    this.barFill.fillRoundedRect(this.barX, this.barY, fillWidth, this.barHeight, 3);
  }

  /**
   * Update the XP bar with current level and XP
   * @param {number} level - Current level
   * @param {number} currentXP - Current XP for this level
   * @param {number} xpRequired - XP required for next level
   */
  update(level, currentXP, xpRequired) {
    if (level === this.level && currentXP === this.currentXP && xpRequired === this.xpRequired) {
      return;
    }

    this.level = level;
    this.currentXP = currentXP;
    this.xpRequired = xpRequired;

    // Update text
    this.levelText.setText(this.approved ? `LEVEL ${level}` : `Lvl ${level}`);
    this.xpText.setText(`${currentXP.toLocaleString()} / ${xpRequired.toLocaleString()} XP`);

    // Animate fill smoothly
    const newPct = xpRequired > 0 ? Math.min(currentXP / xpRequired, 1.0) : 0;
    const oldPct = this._fillPercent ?? 0;
    if (Math.abs(newPct - oldPct) > 0.004) {
      this.scene.tweens.killTweensOf(this._xpTweenProxy = this._xpTweenProxy || { v: oldPct });
      this._xpTweenProxy.v = oldPct;
      this.scene.tweens.add({
        targets: this._xpTweenProxy,
        v: newPct,
        duration: 400,
        ease: 'Power2.out',
        onUpdate: () => { this._fillPercent = this._xpTweenProxy.v; this._drawFill(); },
      });
    }
    this._fillPercent = newPct;
  }

  /**
   * Handle resize events
   */
  resize() {
    this._layout();
    this.update(this.level || 1, this.currentXP || 0, this.xpRequired || 100);
  }

  /**
   * Show the XP bar
   */
  show() {
    this.visible = true;
    this.barBg.setVisible(true);
    this.barFill.setVisible(true);
    this.levelText.setVisible(true);
    this.xpText.setVisible(true);
    this.frame?.setVisible(true);
    this._draw();
  }

  /**
   * Hide the XP bar
   */
  hide() {
    this.visible = false;
    this.barBg.setVisible(false);
    this.barFill.setVisible(false);
    this.levelText.setVisible(false);
    this.xpText.setVisible(false);
    this.frame?.setVisible(false);
  }

  /**
   * Clean up
   */
  destroy() {
    this.barBg.destroy();
    this.barFill.destroy();
    this.levelText.destroy();
    this.xpText.destroy();
    this.frame?.destroy();
  }
}
