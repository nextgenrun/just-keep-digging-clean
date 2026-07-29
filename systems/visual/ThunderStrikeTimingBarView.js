import { USER_SETTINGS } from "../UserSettings.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  THUNDER_STRIKE_CHAIN_PHASES,
  formatThunderStrikeMultiplier,
  getThunderStrikeStage,
  resolveThunderStrikeEffectiveDamageMultiplier,
  resolveThunderStrikeSuccessDamageBonusPercent,
  resolveThunderStrikeTimingBarScale,
} from "../../values/thunderStrikeChain.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const toCssColor = (value, fallback) => Number.isFinite(value)
  ? `#${Math.max(0, Math.min(0xffffff, Math.trunc(value)))
    .toString(16).padStart(6, "0")}`
  : value || fallback;

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
    const art = ui.indicatorArt;
    const textureKey = ASSET_KEYS.ui.thunderStrikeChainFrame;
    const targetKey = ASSET_KEYS.ui.thunderStrikeTargetGate;
    const needleKey = ASSET_KEYS.ui.thunderStrikeNeedle;
    const indicatorKeys = ASSET_KEYS.ui.thunderStrikeIndicator;
    const requiredTextureKeys = [
      textureKey,
      targetKey,
      needleKey,
      ...Object.values(indicatorKeys),
    ];
    if (
      !scene?.add?.container
      || !scene.add.image
      || !scene.add.text
      || !scene.textures?.exists?.(textureKey)
      || requiredTextureKeys.some((key) => !scene.textures.exists(key))
    ) return;

    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(ui.depth)
      .setVisible(false);
    this.frame = scene.add.image(0, 0, textureKey)
      .setOrigin(0.5, 0)
      .setDisplaySize(ui.assetWidth, ui.assetHeight);
    this.titlePlate = this._image(
      0,
      ui.titleY,
      indicatorKeys.stagePlate,
      art.titlePlate,
    );
    this.milestoneRings = ui.stageCentersX.map((x) => this._image(
      x,
      ui.stageCenterY,
      indicatorKeys.milestoneDormant,
      { width: art.milestoneSize, height: art.milestoneSize },
    ));
    const glyphKeys = [
      indicatorKeys.glyphI,
      indicatorKeys.glyphV,
      indicatorKeys.glyphX,
    ];
    this.milestoneGlyphs = ui.stageCentersX.map((x, index) => this._image(
      x,
      ui.stageCenterY,
      glyphKeys[index],
      art.glyphSizes[index],
    ));
    this.milestoneChecks = ui.stageCentersX.map((x) => this._image(
      x + art.checkOffsetX,
      ui.stageCenterY + art.checkOffsetY,
      indicatorKeys.milestoneCheck,
      { width: art.checkWidth, height: art.checkHeight },
    ).setVisible(false));
    this.milestoneValuePlates = ui.stageCentersX.map((x) => this._image(
      x,
      ui.stageValueY,
      indicatorKeys.badgePlate,
      art.milestoneValuePlate,
    ));
    this.targetGate = scene.add.image(0, 0, targetKey)
      .setOrigin(0.5)
      .setVisible(false);
    this.needle = scene.add.image(0, 0, needleKey)
      .setOrigin(0.5)
      .setVisible(false);
    this.promptPlate = this._image(
      0,
      ui.promptY,
      indicatorKeys.promptPlate,
      art.promptPlate,
    );
    this.slamPlate = this._image(
      0,
      ui.slamY,
      indicatorKeys.stagePlate,
      art.slamPlate,
    );
    this.badgePlate = this._image(
      0,
      ui.badgeY,
      indicatorKeys.badgePlate,
      art.badgePlate,
    );
    this.title = this._text(0, ui.titleY, "THUNDERSTRIKE CHAIN", {
      fontFamily: ui.titleFont,
      fontSize: ui.titleFontSize,
      color: ui.titleColor,
      strokeThickness: ui.overlay.titleStrokeThickness,
    });
    this.stageValues = ui.milestones.map((milestone, index) => {
      const entry = getThunderStrikeStage(milestone.stageIndex);
      const multiplier = resolveThunderStrikeEffectiveDamageMultiplier(entry.damageMultiplier, milestone.stageIndex);
      return this._text(ui.stageCentersX[index], ui.stageValueY,
        `${formatThunderStrikeMultiplier(multiplier)}×  ${milestone.suffix}`, {
          fontFamily: ui.bodyFont,
          fontSize: ui.bodyFontSize,
          color: index === 0 ? ui.titleColor : ui.freeColor,
          strokeThickness: ui.overlay.bodyStrokeThickness,
        });
    });
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
      this.frame, this.titlePlate, ...this.milestoneValuePlates,
      this.promptPlate, this.slamPlate, this.badgePlate,
      ...this.milestoneRings, ...this.milestoneGlyphs, ...this.milestoneChecks,
      this.targetGate, this.needle, this.title, ...this.stageValues,
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

  _image(x, y, key, { width, height, alpha = 1 }) {
    return this.scene.add.image(x, y, key)
      .setOrigin(0.5)
      .setDisplaySize(width, height)
      .setAlpha(alpha);
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
    this._drawStages(snapshot);
    this._drawTrack(snapshot, timing);
    this._drawCopy(snapshot, timing, feedbackText, feedbackColor);
  }

  _drawStages(snapshot) {
    const ui = this.config.timingBar;
    const art = ui.indicatorArt;
    const indicatorKeys = ASSET_KEYS.ui.thunderStrikeIndicator;
    const initialCastFree = snapshot.initialCastFree === true;
    const focusStageIndex = snapshot.challengeStageIndex ?? snapshot.currentStageIndex;
    let nextMilestoneIndex = ui.milestones.findIndex(
      (milestone) => milestone.stageIndex >= focusStageIndex);
    if (nextMilestoneIndex < 0) nextMilestoneIndex = ui.milestones.length - 1;
    ui.milestones.forEach((milestone, index) => {
      const completed = milestone.stageIndex <= snapshot.completedStageIndex;
      const challenged = index === nextMilestoneIndex && !completed;
      const active = completed || challenged;
      const ringKey = completed
        ? indicatorKeys.milestoneCompleted
        : challenged
          ? indicatorKeys.milestoneChallenge
          : indicatorKeys.milestoneDormant;
      this.milestoneRings[index]
        .setTexture(ringKey)
        .setDisplaySize(art.milestoneSize, art.milestoneSize)
        .setAlpha(active ? 1 : art.dormantAlpha);
      this.milestoneGlyphs[index].setAlpha(active ? 1 : art.dormantAlpha);
      this.milestoneChecks[index].setVisible(completed);
      this.milestoneValuePlates[index].setAlpha(
        art.milestoneValuePlate.alpha * (active ? 1 : art.dormantAlpha),
      );
      const castFree = milestone.stageIndex > 0 || initialCastFree;
      const valueSuffix = milestone.stageIndex === 0
        ? (castFree ? "FREE" : "PAID") : milestone.suffix;
      this.stageValues[index]
        .setText(`${this.stageValues[index].text.split("×")[0]}×  ${valueSuffix}`)
        .setColor(castFree ? ui.freeColor : ui.titleColor);
    });
  }

  _drawTrack(snapshot, timing) {
    const ui = this.config.timingBar;
    this.presentedTimingSnapshot = null;
    this.targetGate.setVisible(false);
    this.needle.setVisible(false);
    if (!timing) return;

    const progress = clamp01(snapshot.progress);
    const needleX = ui.trackX + progress * ui.trackWidth;
    const targetX = ui.trackX + snapshot.windowStartProgress * ui.trackWidth;
    const targetWidth = Math.max(
      1,
      (snapshot.windowEndProgress - snapshot.windowStartProgress) * ui.trackWidth,
    );
    this.targetGate
      .setVisible(true)
      .setPosition(targetX + targetWidth / 2, ui.trackY + ui.trackHeight / 2)
      .setDisplaySize(targetWidth, ui.targetArtHeight)
      .setAlpha(ui.targetArtAlpha);
    this.needle
      .setVisible(true)
      .setPosition(needleX, ui.trackY + ui.trackHeight / 2)
      .setDisplaySize(ui.needleArtWidth, ui.needleArtHeight);
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
    const failed = feedbackText === this.config.feedback.chainBrokenText;
    const stageIndex = timing
      ? snapshot.challengeStageIndex
      : failed && Number.isInteger(snapshot.challengeStageIndex)
        ? snapshot.challengeStageIndex
        : snapshot.currentStageIndex;
    const stageNumber = Math.max(1, Math.min(this.config.stages.length, stageIndex + 1));
    const successCount = Math.max(0, Number(snapshot.successfulContinuations) || 0);
    const successBuffPercent = resolveThunderStrikeSuccessDamageBonusPercent(successCount);
    this.slamLabel.setText(
      `${failed ? "FAILED" : "SLAM"} ${stageNumber}/${this.config.stages.length}`,
    );
    if (timing) {
      const nextBuffPercent = resolveThunderStrikeSuccessDamageBonusPercent(successCount + 1);
      this.prompt.setColor(ui.titleColor).setText(
        `PRESS ${key} IN THE FLASH  •  ${this.config.feedback.cancelHintText}`,
      );
      this._drawBadge(`HIT = +${nextBuffPercent}% DMG`, ui.freeColor);
    } else if (feedbackText) {
      const resolvedFeedbackColor = toCssColor(feedbackColor, ui.titleColor);
      this.prompt.setColor(resolvedFeedbackColor).setText(feedbackText);
      const cancelled = feedbackText === this.config.feedback.cancelledText;
      const badgeText = cancelled
        ? "CONTROL RESTORED"
        : failed
          ? "CHAIN ENDED"
          : `DAMAGE +${successBuffPercent}%`;
      this._drawBadge(badgeText, resolvedFeedbackColor);
    } else {
      const copy = snapshot.phase === THUNDER_STRIKE_CHAIN_PHASES.CHARGE
        ? `CALLING THE STORM  •  ${this.config.feedback.cancelHintText}`
        : "THUNDER IMPACT";
      this.prompt.setColor(ui.titleColor).setText(copy);
      const badgeText = stageNumber === 1
        ? snapshot.initialCastFree ? "FREE CAST" : "ONE PAID CAST"
        : `DAMAGE +${successBuffPercent}%`;
      this._drawBadge(badgeText, ui.freeColor);
    }
  }

  _drawBadge(text, color) {
    this.badge.setColor(color).setText(text);
  }

  destroy() {
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
