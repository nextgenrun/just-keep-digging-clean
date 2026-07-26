import { USER_SETTINGS } from "../UserSettings.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { resolveThunderStrikeSuccessDamageBonusPercent, resolveThunderStrikeTimingBarScale } from "../../values/thunderStrikeChain.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class ThunderStrikeTimingBarView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.presentedTimingSnapshot = null;
    this._resizeHandler = () => this._layout();
    this._create();
  }

  _create() {
    const scene = this.scene;
    const ui = this.config.timingBar;
    const textureKey = ASSET_KEYS.ui.thunderStrikeChainFrame;
    if (
      !scene?.add?.container
      || !scene.add.image
      || !scene.add.graphics
      || !scene.add.text
      || !scene.textures?.exists?.(textureKey)
    ) return;

    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(ui.depth)
      .setVisible(false);
    this.frame = scene.add.image(0, 0, textureKey)
      .setOrigin(0.5, 0)
      .setDisplaySize(ui.assetWidth, ui.assetHeight);
    this.accents = scene.add.graphics();
    this.title = this._text(0, ui.titleY, "THUNDERSTRIKE CHAIN", {
      fontFamily: ui.titleFont,
      fontSize: ui.titleFontSize,
      color: ui.titleColor,
      strokeThickness: ui.overlay.titleStrokeThickness,
    });
    this.stageLabels = this.config.stages.map((entry, index) => this._text(
      ui.stageCentersX[index], ui.stageCenterY, entry.visual.label, {
        fontFamily: ui.titleFont,
        fontSize: ui.stageFontSize,
        color: ui.mutedColor,
        strokeThickness: ui.overlay.stageStrokeThickness,
      },
    ));
    this.stageValues = this.config.stages.map((entry, index) => this._text(
      ui.stageCentersX[index], ui.stageValueY,
      index === 0 ? `${entry.damageMultiplier}×  PAID` : `${entry.damageMultiplier}×  FREE`, {
        fontFamily: ui.bodyFont,
        fontSize: ui.bodyFontSize,
        color: index === 0 ? ui.titleColor : ui.freeColor,
        strokeThickness: ui.overlay.bodyStrokeThickness,
      },
    ));
    this.prompt = this._text(0, ui.promptY, "", {
      fontFamily: ui.bodyFont,
      fontSize: ui.promptFontSize,
      color: ui.titleColor,
      strokeThickness: ui.overlay.bodyStrokeThickness,
    });
    this.slamLabel = this._text(0, ui.slamY, "", {
      fontFamily: ui.titleFont,
      fontSize: ui.slamFontSize,
      color: ui.titleColor,
      strokeThickness: ui.overlay.bodyStrokeThickness,
    });
    this.badge = this._text(0, ui.badgeY, "", {
      fontFamily: ui.bodyFont,
      fontSize: ui.badgeFontSize,
      color: ui.freeColor,
      strokeThickness: ui.overlay.bodyStrokeThickness,
    });
    this.root.add([
      this.frame, this.accents, this.title,
      ...this.stageLabels, ...this.stageValues,
      this.prompt, this.slamLabel, this.badge,
    ]);
    this._layout();
    scene.scale?.on?.("resize", this._resizeHandler);
  }

  _text(x, y, value, style) {
    return this.scene.add.text(x, y, value, {
      ...style,
      fontStyle: "bold",
      stroke: "#02040a",
    }).setOrigin(0.5);
  }

  _layout() {
    if (!this.root) return;
    const ui = this.config.timingBar;
    const width = this.scene.scale?.width
      || this.scene.config?.viewportWidth
      || this.scene.game?.config?.width
      || ui.assetWidth;
    const height = this.scene.scale?.height
      || this.scene.config?.viewportHeight
      || this.scene.game?.config?.height
      || ui.assetHeight;
    const scale = resolveThunderStrikeTimingBarScale(width, height);
    this.root
      .setScale(scale)
      .setPosition(width / 2, ui.top - ui.visibleTop * scale);
  }

  getPresentedTimingSnapshot(stageIndex) {
    if (this.presentedTimingSnapshot?.challengeStageIndex !== stageIndex) return null;
    return { ...this.presentedTimingSnapshot };
  }

  setVisible(visible) {
    this.root?.setVisible(visible);
    if (!visible) this.presentedTimingSnapshot = null;
  }

  render(snapshot, { timing = false, feedbackText = "", feedbackColor = null } = {}) {
    if (!this.root) return;
    this.root.setVisible(true);
    this.accents.clear();
    this._drawStages(snapshot);
    this._drawTrack(snapshot, timing);
    this._drawCopy(snapshot, timing, feedbackText, feedbackColor);
  }

  _drawStages(snapshot) {
    const ui = this.config.timingBar;
    const overlay = ui.overlay;
    const initialCastFree = snapshot.initialCastFree === true;
    this.config.stages.forEach((entry, index) => {
      const x = ui.stageCentersX[index];
      const completed = index <= snapshot.completedStageIndex;
      const challenged = index === snapshot.challengeStageIndex;
      const current = index === snapshot.currentStageIndex
        && snapshot.completedStageIndex < index;
      const active = completed || challenged || current;
      const color = completed
        ? ui.completedColor
        : challenged || current
          ? ui.challengeColor
          : ui.upcomingColor;
      if (active) {
        this.accents.fillStyle(color, overlay.stageGlowAlpha);
        this.accents.fillCircle(x, ui.stageCenterY, ui.stageRadius + overlay.stageGlowPadding);
        this.accents.fillStyle(color, overlay.stageFillAlpha);
        this.accents.fillCircle(x, ui.stageCenterY, ui.stageRadius);
      }
      this.accents.lineStyle(
        active ? overlay.stageRingWidth : 1,
        color,
        overlay.stageRingAlpha,
      );
      this.accents.strokeCircle(x, ui.stageCenterY, ui.stageRadius);
      this.stageLabels[index].setColor(active ? entry.visual.accentCss : ui.mutedColor);
      const castFree = index > 0 || initialCastFree;
      this.stageValues[index]
        .setText(`${entry.damageMultiplier}×  ${castFree ? "FREE" : "PAID"}`)
        .setColor(castFree ? ui.freeColor : ui.titleColor);
      if (completed) this._drawCheck(x, ui.stageCenterY);
    });
  }

  _drawCheck(x, y) {
    const ui = this.config.timingBar;
    const overlay = ui.overlay;
    const checkX = x + overlay.checkOffsetX;
    const checkY = y + overlay.checkOffsetY;
    this.accents.lineStyle(overlay.checkWidth, ui.completedColor, 1);
    this.accents.lineBetween(
      checkX - overlay.checkSize,
      checkY,
      checkX - overlay.checkSize / 3,
      checkY + overlay.checkSize / 2,
    );
    this.accents.lineBetween(
      checkX - overlay.checkSize / 3,
      checkY + overlay.checkSize / 2,
      checkX + overlay.checkSize,
      checkY - overlay.checkSize,
    );
  }

  _drawTrack(snapshot, timing) {
    const ui = this.config.timingBar;
    const overlay = ui.overlay;
    this.accents.fillStyle(ui.trackColor, overlay.trackAlpha);
    this.accents.fillRoundedRect(
      ui.trackX, ui.trackY, ui.trackWidth, ui.trackHeight, overlay.trackRadius,
    );
    this.presentedTimingSnapshot = null;
    if (!timing) return;

    const progress = clamp01(snapshot.progress);
    const needleX = ui.trackX + progress * ui.trackWidth;
    if (progress > 0) {
      this.accents.fillStyle(ui.trackFillColor, overlay.progressAlpha);
      this.accents.fillRoundedRect(
        ui.trackX, ui.trackY, Math.max(1, needleX - ui.trackX),
        ui.trackHeight, overlay.trackRadius,
      );
    }
    const targetX = ui.trackX + snapshot.windowStartProgress * ui.trackWidth;
    const targetWidth = Math.max(
      overlay.minimumTargetWidth,
      (snapshot.windowEndProgress - snapshot.windowStartProgress) * ui.trackWidth,
    );
    this.accents.fillStyle(ui.targetGlowColor, overlay.targetGlowAlpha);
    this.accents.fillRoundedRect(
      targetX - overlay.targetGlowPadding,
      ui.trackY - overlay.targetGlowPadding,
      targetWidth + overlay.targetGlowPadding * 2,
      ui.trackHeight + overlay.targetGlowPadding * 2,
      overlay.trackRadius,
    );
    this.accents.fillStyle(ui.targetColor, overlay.targetAlpha);
    this.accents.fillRoundedRect(
      targetX, ui.trackY, targetWidth, ui.trackHeight, overlay.trackRadius,
    );
    this.accents.lineStyle(
      ui.needleWidth + overlay.needleGlowExtraWidth,
      ui.needleColor,
      overlay.needleGlowAlpha,
    );
    this.accents.lineBetween(
      needleX, ui.trackY - ui.needleOverhang,
      needleX, ui.trackY + ui.trackHeight + ui.needleOverhang,
    );
    this.accents.lineStyle(ui.needleWidth, ui.needleColor, 1);
    this.accents.lineBetween(
      needleX, ui.trackY - ui.needleOverhang,
      needleX, ui.trackY + ui.trackHeight + ui.needleOverhang,
    );
    this.presentedTimingSnapshot = {
      challengeStageIndex: snapshot.challengeStageIndex,
      progress,
      windowStartProgress: snapshot.windowStartProgress,
      windowEndProgress: snapshot.windowEndProgress,
    };
  }

  _drawCopy(snapshot, timing, feedbackText, feedbackColor) {
    const ui = this.config.timingBar;
    const key = USER_SETTINGS.getKeyLabel("thunderStrike");
    const stageIndex = timing ? snapshot.challengeStageIndex : snapshot.currentStageIndex;
    const stageNumber = Math.max(1, Math.min(this.config.stages.length, stageIndex + 1));
    const successCount = Math.max(0, Number(snapshot.successfulContinuations) || 0);
    const successBuffPercent = resolveThunderStrikeSuccessDamageBonusPercent(successCount);
    this.slamLabel.setText(`SLAM ${stageNumber}/${this.config.stages.length}`);
    if (timing) {
      const nextBuffPercent = resolveThunderStrikeSuccessDamageBonusPercent(successCount + 1);
      this.prompt.setColor(ui.titleColor).setText(`PRESS ${key} IN THE FLASH`);
      this._drawBadge(`HIT = DAMAGE +${nextBuffPercent}%`, ui.freeColor);
    } else if (feedbackText) {
      this.prompt.setColor(feedbackColor).setText(feedbackText);
      const badgeText = feedbackText.includes("BROKEN")
        ? "MISSED"
        : `DAMAGE +${successBuffPercent}%`;
      this._drawBadge(badgeText, feedbackColor);
    } else {
      const copy = snapshot.phase === "charge" ? "CALLING THE STORM" : "THUNDER IMPACT";
      this.prompt.setColor(ui.titleColor).setText(copy);
      const badgeText = stageNumber === 1
        ? snapshot.initialCastFree ? "FREE CAST" : "ONE PAID CAST"
        : `DAMAGE +${successBuffPercent}%`;
      this._drawBadge(badgeText, ui.freeColor);
    }
  }

  _drawBadge(text, color) {
    const ui = this.config.timingBar;
    const overlay = ui.overlay;
    this.accents.fillStyle(ui.trackColor, overlay.badgeAlpha);
    this.accents.fillRoundedRect(
      -ui.badgeWidth / 2, ui.badgeY - ui.badgeHeight / 2,
      ui.badgeWidth, ui.badgeHeight, overlay.badgeRadius,
    );
    this.accents.lineStyle(overlay.badgeBorderWidth, color, overlay.badgeBorderAlpha);
    this.accents.strokeRoundedRect(
      -ui.badgeWidth / 2, ui.badgeY - ui.badgeHeight / 2,
      ui.badgeWidth, ui.badgeHeight, overlay.badgeRadius,
    );
    this.badge.setColor(color).setText(text);
  }

  destroy() {
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
