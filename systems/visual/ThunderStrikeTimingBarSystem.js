import { USER_SETTINGS } from "../UserSettings.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
} from "../../values/thunderStrikeChain.js";

export class ThunderStrikeTimingBarSystem {
  constructor(scene, config = THUNDER_STRIKE_CHAIN_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.feedbackUntilMs = 0;
    this.feedbackText = "";
    this.feedbackColor = config.timingBar.titleColor;
    this.lastSnapshot = null;
    this._resizeHandler = () => this._layout();
    this._create();
  }

  _create() {
    if (!this.scene?.add?.container || !this.scene.add.graphics || !this.scene.add.text) return;
    const ui = this.config.timingBar;
    this.root = this.scene.add.container(0, ui.top)
      .setScrollFactor(0)
      .setDepth(ui.depth)
      .setVisible(false);
    this.panel = this.scene.add.graphics();
    this.title = this.scene.add.text(0, ui.titleY, "THUNDERSTRIKE CHAIN", {
      fontFamily: ui.titleFont,
      fontSize: ui.titleFontSize,
      color: ui.titleColor,
      fontStyle: "bold",
      stroke: "#02040a",
      strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.freeLabel = this.scene.add.text(0, ui.freeLabelY, this.config.feedback.followUpsFreeText, {
      fontFamily: ui.bodyFont,
      fontSize: ui.bodyFontSize,
      color: ui.freeColor,
      fontStyle: "bold",
    }).setOrigin(0.5, 0);
    this.stageLabels = this.config.stages.map((entry) => this.scene.add.text(
      0,
      ui.stageY,
      `${entry.visual.label}  ${entry.damageMultiplier}×`,
      {
        fontFamily: ui.bodyFont,
        fontSize: ui.bodyFontSize,
        color: ui.mutedColor,
        fontStyle: "bold",
        stroke: "#02040a",
        strokeThickness: 3,
      },
    ).setOrigin(0.5, 0));
    this.prompt = this.scene.add.text(0, ui.promptY, "", {
      fontFamily: ui.bodyFont,
      fontSize: ui.promptFontSize,
      color: ui.titleColor,
      fontStyle: "bold",
      stroke: "#02040a",
      strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.root.add([
      this.panel,
      this.title,
      this.freeLabel,
      ...this.stageLabels,
      this.prompt,
    ]);
    this._layout();
    this.scene.scale?.on?.("resize", this._resizeHandler);
  }

  _layout() {
    if (!this.root) return;
    const width = this.scene.scale?.width
      || this.scene.config?.viewportWidth
      || this.scene.game?.config?.width
      || 1024;
    this.root.setPosition(width / 2, this.config.timingBar.top);
  }

  showFeedback(text, color, nowMs, durationMs, snapshot = this.lastSnapshot) {
    this.feedbackText = text;
    this.feedbackColor = color;
    this.feedbackUntilMs = nowMs + durationMs;
    this.lastSnapshot = snapshot;
    this.update(snapshot, nowMs);
  }

  update(snapshot, nowMs = 0) {
    if (!this.root) return;
    const timing = snapshot?.phase === THUNDER_STRIKE_CHAIN_PHASES.TIMING;
    const feedbackActive = nowMs < this.feedbackUntilMs;
    if (!timing && !feedbackActive) {
      this.root.setVisible(false);
      return;
    }
    if (snapshot) this.lastSnapshot = snapshot;
    const renderSnapshot = snapshot || this.lastSnapshot;
    if (!renderSnapshot) return;
    this.root.setVisible(true);
    this._draw(renderSnapshot, timing ? null : {
      text: this.feedbackText,
      color: this.feedbackColor,
    });
  }

  _draw(snapshot, feedback) {
    const ui = this.config.timingBar;
    const left = -ui.width / 2;
    const stageGap = (ui.width - 104) / (this.config.stages.length - 1);
    this.panel.clear();
    this.panel.fillStyle(ui.panelColor, ui.panelAlpha);
    this.panel.fillRoundedRect(left, 0, ui.width, ui.height, ui.cornerRadius);
    this.panel.lineStyle(2, ui.frameColor, 0.95);
    this.panel.strokeRoundedRect(left, 0, ui.width, ui.height, ui.cornerRadius);
    this.panel.lineStyle(1, ui.frameHighlightColor, 0.55);
    this.panel.strokeRoundedRect(left + 4, 4, ui.width - 8, ui.height - 8, ui.cornerRadius - 3);

    this.config.stages.forEach((entry, index) => {
      const x = left + 52 + stageGap * index;
      const completed = index <= snapshot.completedStageIndex;
      const challenged = index === snapshot.challengeStageIndex;
      const active = completed || challenged;
      this.panel.fillStyle(active ? entry.visual.accent : ui.innerColor, active ? 0.28 : 0.75);
      this.panel.fillCircle(x, ui.stageY + 8, 19);
      this.panel.lineStyle(challenged ? 3 : 1, active ? entry.visual.accent : ui.trackBorderColor, 0.95);
      this.panel.strokeCircle(x, ui.stageY + 8, 19);
      this.stageLabels[index]
        .setPosition(x, ui.stageY)
        .setColor(active ? entry.visual.accentCss : ui.mutedColor)
        .setText(`${entry.visual.label}  ${entry.damageMultiplier}×`);
    });

    const trackLeft = left + ui.trackX;
    this.panel.fillStyle(ui.trackColor, 1);
    this.panel.fillRoundedRect(
      trackLeft,
      ui.trackY,
      ui.trackWidth,
      ui.trackHeight,
      ui.trackHeight / 2,
    );
    this.panel.lineStyle(1, ui.trackBorderColor, 0.9);
    this.panel.strokeRoundedRect(
      trackLeft,
      ui.trackY,
      ui.trackWidth,
      ui.trackHeight,
      ui.trackHeight / 2,
    );

    if (!feedback) {
      const targetX = trackLeft + snapshot.windowStartProgress * ui.trackWidth;
      const targetW = Math.max(
        4,
        (snapshot.windowEndProgress - snapshot.windowStartProgress) * ui.trackWidth,
      );
      this.panel.fillStyle(ui.targetGlowColor, 0.28);
      this.panel.fillRoundedRect(targetX - 4, ui.trackY - 4, targetW + 8, ui.trackHeight + 8, 6);
      this.panel.fillStyle(ui.targetColor, 0.95);
      this.panel.fillRoundedRect(targetX, ui.trackY, targetW, ui.trackHeight, 4);
      const needleX = trackLeft + snapshot.progress * ui.trackWidth;
      this.panel.lineStyle(ui.needleWidth + 5, ui.needleColor, 0.15);
      this.panel.lineBetween(
        needleX,
        ui.trackY - ui.needleOverhang,
        needleX,
        ui.trackY + ui.trackHeight + ui.needleOverhang,
      );
      this.panel.lineStyle(ui.needleWidth, ui.needleColor, 1);
      this.panel.lineBetween(
        needleX,
        ui.trackY - ui.needleOverhang,
        needleX,
        ui.trackY + ui.trackHeight + ui.needleOverhang,
      );
      const key = USER_SETTINGS.getKeyLabel("thunderStrike");
      this.prompt
        .setColor(ui.titleColor)
        .setText(this.config.feedback.timingHintText.replace("{key}", key));
    } else {
      this.panel.fillStyle(ui.frameHighlightColor, 0.75);
      this.panel.fillRoundedRect(trackLeft, ui.trackY, ui.trackWidth, ui.trackHeight, ui.trackHeight / 2);
      this.prompt.setColor(feedback.color).setText(feedback.text);
    }
  }

  destroy() {
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
