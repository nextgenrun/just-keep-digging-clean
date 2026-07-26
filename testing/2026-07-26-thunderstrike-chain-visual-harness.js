import { USER_SETTINGS } from "../systems/UserSettings.js";
import { ThunderStrikeTimingBarSystem } from "../systems/visual/ThunderStrikeTimingBarSystem.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
  getThunderStrikeStage,
} from "../values/thunderStrikeChain.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function createTimingSnapshot(stageIndex, progress) {
  const stage = getThunderStrikeStage(stageIndex);
  const target = stage.timing.targetProgress;
  const halfWindow = (stage.timing.windowMs / stage.timing.durationMs) / 2;
  return {
    phase: THUNDER_STRIKE_CHAIN_PHASES.TIMING,
    currentStageIndex: stageIndex - 1,
    completedStageIndex: stageIndex - 1,
    challengeStageIndex: stageIndex,
    progress: clamp01(progress),
    targetProgress: target,
    windowStartProgress: clamp01(target - halfWindow),
    windowEndProgress: clamp01(target + halfWindow),
    lastTimingErrorMs: null,
    successfulContinuations: stageIndex - 1,
    stages: THUNDER_STRIKE_CHAIN_CONFIG.stages,
  };
}

class ThunderStrikeChainReviewScene extends Phaser.Scene {
  constructor() {
    super("ThunderStrikeChainReviewScene");
  }

  preload() {
    this.load.image(
      ASSET_KEYS.ui.thunderStrikeChainFrame,
      `../${THUNDER_STRIKE_CHAIN_CONFIG.timingBar.assetPath}`,
    );
  }

  create() {
    this.stageIndex = 1;
    this.progress = getThunderStrikeStage(this.stageIndex).timing.targetProgress;
    this.running = false;
    this.reviewStartedAtMs = 0;
    this.timingBar = new ThunderStrikeTimingBarSystem(this);
    this._renderReview();

    this.input.keyboard.on("keydown-SPACE", () => {
      this.running = !this.running;
      this.reviewStartedAtMs = this.time.now;
    });
    this.input.keyboard.on("keydown-R", () => {
      this.progress = 0;
      this.running = false;
      this._renderReview();
    });
    this.input.keyboard.on("keydown-TWO", () => this._setStage(1));
    this.input.keyboard.on("keydown-THREE", () => this._setStage(2));

    globalThis.__thunderStrikeChainReview = {
      ready: true,
      setStage: (stageNumber) => this._setStage(Math.max(1, stageNumber) - 1),
      setProgress: (progress) => {
        this.progress = clamp01(progress);
        this.running = false;
        this._renderReview();
      },
      getState: () => ({
        stageNumber: this.stageIndex + 1,
        progress: this.progress,
        scale: this.timingBar.view.root?.scaleX || 0,
        key: USER_SETTINGS.getKeyLabel("thunderStrike"),
      }),
    };
    document.body.dataset.reviewReady = "true";
  }

  update(time) {
    if (!this.running) return;
    const duration = getThunderStrikeStage(this.stageIndex).timing.durationMs;
    this.progress = ((time - this.reviewStartedAtMs) % duration) / duration;
    this._renderReview();
  }

  _setStage(stageIndex) {
    this.stageIndex = Math.max(1, Math.min(2, Math.trunc(stageIndex)));
    this.progress = getThunderStrikeStage(this.stageIndex).timing.targetProgress;
    this.running = false;
    this._renderReview();
    return this.stageIndex + 1;
  }

  _renderReview() {
    this.timingBar.update(
      createTimingSnapshot(this.stageIndex, this.progress),
      this.time.now,
    );
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "review-root",
  width: 1280,
  height: 720,
  backgroundColor: "#03060b",
  transparent: false,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ThunderStrikeChainReviewScene],
});
