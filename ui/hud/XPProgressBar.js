/**
 * XP Progress Bar UI Component
 * Always visible at the bottom of the screen
 */

import { HUD_LAYOUT } from "../../values/hudLayout.js";

export class XPProgressBar {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;

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

    // Position at bottom center
    const barWidth = Math.min(600, width - 40);
    const barHeight = 20;
    const barX = (width - barWidth) / 2;
    const barY = height - 50;

    this.barWidth = barWidth;
    this.barHeight = barHeight;
    this.barX = barX;
    this.barY = barY;

    // Position text
    this.levelText.setPosition(barX - 100, barY + barHeight / 2);
    this.levelText.setOrigin(1, 0.5);
    this.xpText.setPosition(barX + barWidth + 10, barY + barHeight / 2);
    this.xpText.setOrigin(0, 0.5);

    this.visible = true;
    this._draw();
  }

  _draw() {
    if (!this.visible) return;

    // Draw background
    this.barBg.clear();
    this.barBg.fillStyle(0x1a1a2e, 0.9);
    this.barBg.lineStyle(2, 0x5566aa, 1);
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

    // Gradient color based on progress
    let color;
    if (fillPercent < 0.3) {
      color = 0x66ff66; // Green
    } else if (fillPercent < 0.7) {
      color = 0xffff66; // Yellow
    } else {
      color = 0xffaa00; // Gold
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
    this.level = level;
    this.currentXP = currentXP;
    this.xpRequired = xpRequired;

    // Update text
    this.levelText.setText(`Lvl ${level}`);
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
  }

  /**
   * Clean up
   */
  destroy() {
    this.barBg.destroy();
    this.barFill.destroy();
    this.levelText.destroy();
    this.xpText.destroy();
  }
}
