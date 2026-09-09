import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { XP_GATHERING_CONFIG } from "../../values/xpGathering.js";
import { hasApprovedHudSkin } from "../../systems/visual/ApprovedHudSkin.js";
import { XPGatheringFxSystem } from "../../systems/visual/XPGatheringFxSystem.js";
import { prepareArt, fitBakedUiImage, fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
export class XPProgressBar {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.approved = hasApprovedHudSkin(scene);
    if (this.approved) {
      const art = prepareArt(scene, { key: ASSET_KEYS.ui.approvedHud.xp, ...APPROVED_HUD_SKIN.frames.xp });
      this.frame = scene.add.image(0, 0, art.key, art.frame)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudDepth - 1);
    }

    this.barBg = scene.add.graphics();
    this.barFill = scene.add.graphics();
    this.barPulse = scene.add.graphics();
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

    this.barBg.setDepth(HUD_LAYOUT.hudDepth).setScrollFactor(0);
    this.barFill.setDepth(HUD_LAYOUT.hudDepth + 1).setScrollFactor(0);
    this.barPulse.setDepth(HUD_LAYOUT.hudDepth + 2).setScrollFactor(0);
    this.levelText.setDepth(HUD_LAYOUT.hudDepth + 2).setScrollFactor(0);
    this.xpText.setDepth(HUD_LAYOUT.hudDepth + 2).setScrollFactor(0);

    this._fillPercent = 0; this._xpTweenProxy = { v: 0 };
    this.gatheringFx = new XPGatheringFxSystem(scene, this);
    this._sceneGatheringHandler = (...args) => this.gatheringFx.queueReward(...args);
    scene.showXpGatheringFeedback = this._sceneGatheringHandler;
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
    this.uiScale = scale;
    this.segmentGap = XP_GATHERING_CONFIG.segments.gapPx * scale;
    this.segmentWidth = (
      barWidth - this.segmentGap * (XP_GATHERING_CONFIG.segments.count - 1)
    ) / XP_GATHERING_CONFIG.segments.count;

    if (this.approved) {
      fitBakedUiImage(this.frame.setPosition(frameX, frameY), frameWidth, frameHeight);
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
      this._fitValues();
    } else {
      this.levelText.setPosition(barX - 100, barY + barHeight / 2).setOrigin(1, 0.5);
      this.xpText.setPosition(barX + barWidth + 10, barY + barHeight / 2).setOrigin(0, 0.5);
    }

    this.visible = true;
    this._draw();
  }

  _draw() {
    if (!this.visible) return;
    const config = XP_GATHERING_CONFIG.segments;
    const radius = config.radiusPx * this.uiScale;
    const borderWidth = (this.approved ? config.borderWidthPx : config.legacyBorderWidthPx)
      * this.uiScale;
    this.barBg.clear();
    if (this.approved) {
      this._drawFill();
      return;
    }
    this.barBg.fillStyle(config.emptyColor, this.approved ? config.emptyAlpha : config.legacyEmptyAlpha);
    this.barBg.lineStyle(
      borderWidth,
      this.approved ? config.borderColor : config.legacyBorderColor,
      config.borderAlpha,
    );
    for (let index = 0; index < config.count; index += 1) {
      const x = this._segmentX(index);
      this.barBg.fillRoundedRect(x, this.barY, this.segmentWidth, this.barHeight, radius);
      this.barBg.strokeRoundedRect(x, this.barY, this.segmentWidth, this.barHeight, radius);
    }
    this._drawFill();
  }

  _drawFill() {
    this.barFill.clear();
    const fillPercent = this._fillPercent ?? 0;
    if (fillPercent <= 0) return;
    const config = XP_GATHERING_CONFIG.segments;
    let color = config.fillColor;
    if (!this.approved) {
      color = fillPercent < config.legacyLowThreshold
        ? config.legacyLowColor
        : fillPercent < config.legacyHighThreshold
          ? config.legacyMidColor
          : config.legacyHighColor;
    }
    const radius = config.radiusPx * this.uiScale;
    const minimumFill = config.minimumFillPx * this.uiScale;
    this.barFill.fillStyle(color, config.fillAlpha);
    for (let index = 0; index < config.count; index += 1) {
      const segmentProgress = Math.max(0, Math.min(fillPercent * config.count - index, 1));
      if (segmentProgress <= 0) continue;
      const fillWidth = segmentProgress >= 1
        ? this.segmentWidth
        : Math.min(this.segmentWidth, Math.max(minimumFill, this.segmentWidth * segmentProgress));
      this.barFill.fillRoundedRect(
        this._segmentX(index),
        this.barY,
        fillWidth,
        this.barHeight,
        radius,
      );
    }
  }

  _segmentX(index) {
    return this.barX + index * (this.segmentWidth + this.segmentGap);
  }

  update(level, currentXP, xpRequired) {
    if (level === this.level && currentXP === this.currentXP && xpRequired === this.xpRequired) {
      return;
    }
    const previousLevel = this.level;
    this.level = level;
    this.currentXP = currentXP;
    this.xpRequired = xpRequired;
    this.levelText.setText(this.approved ? String(level) : `Lvl ${level}`);
    this.xpText.setText(`${currentXP.toLocaleString()} / ${xpRequired.toLocaleString()}${this.approved ? "" : " XP"}`);
    this._fitValues();
    const newPct = xpRequired > 0 ? Math.min(currentXP / xpRequired, 1.0) : 0;
    if (!Number.isFinite(previousLevel)) {
      this._cancelFillMotion();
      this._setFillPercent(newPct);
      return;
    }
    if (level > previousLevel) this._animateLevelAdvance(newPct);
    else this._animateFillTo(newPct, XP_GATHERING_CONFIG.motion.fillDurationMs);
  }

  _animateLevelAdvance(remainder) {
    const motion = XP_GATHERING_CONFIG.motion;
    this._cancelFillMotion();
    this._animateFillTo(1, motion.levelCompleteDurationMs, () => {
      this._fillHoldTimer = this.scene.time.delayedCall(motion.levelResetHoldMs, () => {
        this._fillHoldTimer = null;
        this._setFillPercent(0);
        this._animateFillTo(remainder, motion.levelRemainderDurationMs);
      });
    });
  }

  _fitValues() {
    if (!this.approved) return;
    const layout = APPROVED_HUD_SKIN.layout.xp;
    fitLiveUiText(this.levelText, layout.levelWidth * this.uiScale);
    fitLiveUiText(this.xpText, layout.xpWidth * this.uiScale);
  }

  _animateFillTo(target, duration, onComplete = null) {
    const motion = XP_GATHERING_CONFIG.motion;
    const clampedTarget = Math.max(0, Math.min(Number(target) || 0, 1));
    if (Math.abs(clampedTarget - this._fillPercent) <= motion.changeEpsilon) {
      this._setFillPercent(clampedTarget);
      onComplete?.();
      return;
    }
    this.scene.tweens.killTweensOf(this._xpTweenProxy);
    this._xpTweenProxy.v = this._fillPercent;
    this._fillTween = this.scene.tweens.add({
      targets: this._xpTweenProxy,
      v: clampedTarget,
      duration,
      ease: motion.fillEase,
      onUpdate: () => this._setFillPercent(this._xpTweenProxy.v),
      onComplete: () => {
        this._fillTween = null;
        this._setFillPercent(clampedTarget);
        onComplete?.();
      },
    });
  }

  _setFillPercent(value) {
    this._fillPercent = Math.max(0, Math.min(Number(value) || 0, 1));
    this._drawFill();
  }

  _cancelFillMotion() {
    this.scene.tweens.killTweensOf(this._xpTweenProxy);
    this._fillTween = null;
    this._fillHoldTimer?.remove?.();
    this._fillHoldTimer = null;
  }

  queueGatheringFeedback(entry) {
    this.gatheringFx.queueGain(entry);
  }

  getActiveSegmentIndex() {
    return this._segmentIndexForPercent(this._fillPercent);
  }

  getResolvedSegmentIndex() {
    const resolvedPercent = this.xpRequired > 0
      ? Math.min(this.currentXP / this.xpRequired, 1)
      : this._fillPercent;
    return this._segmentIndexForPercent(resolvedPercent);
  }

  _segmentIndexForPercent(percent) {
    const count = XP_GATHERING_CONFIG.segments.count;
    return Math.min(count - 1, Math.max(0, Math.ceil(percent * count) - 1));
  }

  getGatheringTarget(variationId = "routine") {
    const index = variationId === "levelUp"
      ? XP_GATHERING_CONFIG.segments.count - 1
      : this.getResolvedSegmentIndex();
    return {
      x: this._segmentX(index) + this.segmentWidth / 2,
      y: this.barY + this.barHeight / 2,
      segmentIndex: index,
    };
  }

  pulseGatheringTarget(strength = 0.3, variationId = "routine", targetIndex = null) {
    const motion = XP_GATHERING_CONFIG.motion;
    const index = Number.isInteger(targetIndex)
      ? targetIndex
      : variationId === "levelUp"
        ? XP_GATHERING_CONFIG.segments.count - 1
        : this.getResolvedSegmentIndex();
    this.scene.tweens.killTweensOf(this.barPulse);
    this.barPulse.clear();
    this.barPulse.fillStyle(XP_GATHERING_CONFIG.segments.fillHighlightColor, 1);
    this.barPulse.fillRoundedRect(
      this._segmentX(index),
      this.barY,
      this.segmentWidth,
      this.barHeight,
      XP_GATHERING_CONFIG.segments.radiusPx * this.uiScale,
    );
    this.barPulse.setVisible(this.visible).setAlpha(motion.pulseAlpha * strength);
    this.scene.tweens.add({
      targets: this.barPulse,
      alpha: 0,
      duration: motion.pulseDurationMs,
      ease: motion.pulseEase,
    });
  }

  resize() {
    this._layout();
  }

  show() {
    this.visible = true;
    this.barBg.setVisible(true);
    this.barFill.setVisible(true);
    this.barPulse.setVisible(true);
    this.levelText.setVisible(true);
    this.xpText.setVisible(true);
    this.frame?.setVisible(true);
    this._draw();
  }

  hide() {
    this.visible = false;
    this.barBg.setVisible(false);
    this.barFill.setVisible(false);
    this.barPulse.setVisible(false);
    this.levelText.setVisible(false);
    this.xpText.setVisible(false);
    this.frame?.setVisible(false);
  }

  destroy() {
    this._cancelFillMotion();
    this.scene.tweens.killTweensOf(this.barPulse);
    if (this.scene.showXpGatheringFeedback === this._sceneGatheringHandler) this.scene.showXpGatheringFeedback = null;
    this.gatheringFx.destroy();
    this.barBg.destroy();
    this.barFill.destroy();
    this.barPulse.destroy();
    this.levelText.destroy();
    this.xpText.destroy();
    this.frame?.destroy();
  }
}
