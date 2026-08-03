import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
} from "../../values/thunderStrikeChain.js";
import { ThunderStrikeTimingBarView } from "./ThunderStrikeTimingBarView.js";

export class ThunderStrikeTimingBarSystem {
  constructor(scene, config = THUNDER_STRIKE_CHAIN_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.view = new ThunderStrikeTimingBarView(scene, config);
    this.feedbackUntilMs = 0;
    this.feedbackText = "";
    this.feedbackColor = config.timingBar.titleColor;
    this.feedbackSlamText = "";
    this.feedbackBadgeText = "";
    this.lastSnapshot = null;
  }

  get hasPresentation() {
    return Boolean(this.view?.root);
  }

  getPresentedTimingSnapshot(stageIndex) {
    return this.view.getPresentedTimingSnapshot(stageIndex);
  }

  showFeedback(
    text,
    color,
    nowMs,
    durationMs,
    snapshot = this.lastSnapshot,
    presentation = {},
  ) {
    this.feedbackText = text;
    this.feedbackColor = color;
    this.feedbackSlamText = presentation.slamText || "";
    this.feedbackBadgeText = presentation.badgeText || "";
    this.feedbackUntilMs = nowMs + durationMs;
    this.lastSnapshot = snapshot;
    this.update(snapshot, nowMs);
  }

  showInsufficientGp(currentGp, requiredGp, nowMs, snapshot = this.lastSnapshot) {
    const current = Math.floor(Math.max(0, Number(currentGp) || 0));
    const required = Math.ceil(Math.max(0, Number(requiredGp) || 0));
    this.showFeedback(
      `${this.config.feedback.insufficientGpText} ${current}/${required}`,
      this.config.timingBar.dangerColor,
      nowMs,
      this.config.feedback.insufficientGpLingerMs,
      snapshot,
      {
        slamText: this.config.feedback.insufficientGpSlamText,
        badgeText: this.config.feedback.insufficientGpBadgeText,
      },
    );
  }

  clearFeedback() {
    this.feedbackUntilMs = 0;
    this.feedbackText = "";
    this.feedbackSlamText = "";
    this.feedbackBadgeText = "";
  }

  update(snapshot, nowMs = 0) {
    const chainActive = snapshot?.phase
      && snapshot.phase !== THUNDER_STRIKE_CHAIN_PHASES.IDLE;
    const timing = snapshot?.phase === THUNDER_STRIKE_CHAIN_PHASES.TIMING;
    const feedbackActive = !timing && nowMs < this.feedbackUntilMs;
    if (!chainActive && !feedbackActive) {
      this.view.setVisible(false);
      return;
    }
    if (snapshot) this.lastSnapshot = snapshot;
    const renderSnapshot = snapshot || this.lastSnapshot;
    if (!renderSnapshot) return;
    this.view.render({
      ...renderSnapshot,
      initialCastFree: this.scene?.playerController?.abilities
        ?.getThunderStrikeCost?.() === 0,
    }, {
      timing,
      feedbackText: feedbackActive ? this.feedbackText : "",
      feedbackColor: feedbackActive ? this.feedbackColor : null,
      feedbackSlamText: feedbackActive ? this.feedbackSlamText : "",
      feedbackBadgeText: feedbackActive ? this.feedbackBadgeText : "",
    });
  }

  destroy() {
    this.view.destroy();
    this.view = null;
    this.scene = null;
  }
}
