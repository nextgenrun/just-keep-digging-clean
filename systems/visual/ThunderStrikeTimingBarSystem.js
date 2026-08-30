import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
} from "../../values/thunderStrikeChain.js";
import { ThunderStrikeTimingBarView } from "./ThunderStrikeTimingBarView.js";

/** Keeps Thunderstrike presentation limited to its live timing interaction. */
export class ThunderStrikeTimingBarSystem {
  constructor(scene, config = THUNDER_STRIKE_CHAIN_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.view = new ThunderStrikeTimingBarView(scene, config);
  }

  get hasPresentation() {
    return Boolean(this.view?.root);
  }

  getPresentedTimingSnapshot(stageIndex) {
    return this.view.getPresentedTimingSnapshot(stageIndex);
  }

  showFeedback() {
    this.view.setVisible(false);
  }

  showInsufficientGp(currentGp, requiredGp) {
    const current = Math.floor(Math.max(0, Number(currentGp) || 0));
    const required = Math.ceil(Math.max(0, Number(requiredGp) || 0));
    this.scene?.hudSystem?.flashStatus?.(
      `${this.config.feedback.insufficientGpText} ${current}/${required}`,
      this.config.timingBar.dangerColor,
      this.config.feedback.insufficientGpLingerMs,
    );
    this.view.setVisible(false);
  }

  clearFeedback() {
    this.view.setVisible(false);
  }

  update(snapshot) {
    if (snapshot?.phase !== THUNDER_STRIKE_CHAIN_PHASES.TIMING) {
      this.view.setVisible(false);
      return;
    }
    this.view.render(snapshot);
  }

  destroy() {
    this.view.destroy();
    this.view = null;
    this.scene = null;
  }
}
