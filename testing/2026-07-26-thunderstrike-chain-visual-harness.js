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
    this.load.image(
      ASSET_KEYS.ui.thunderStrikeTargetGate,
      `../${THUNDER_STRIKE_CHAIN_CONFIG.timingBar.targetAssetPath}`,
    );
    this.load.image(
      ASSET_KEYS.ui.thunderStrikeNeedle,
      `../${THUNDER_STRIKE_CHAIN_CONFIG.timingBar.needleAssetPath}`,
    );
    Object.entries(
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.indicatorArt.assetPaths,
    ).forEach(([name, path]) => {
      this.load.image(ASSET_KEYS.ui.thunderStrikeIndicator[name], `../${path}`);
    });
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
    const stageKeys = ["TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "ZERO"];
    stageKeys.forEach((key, index) => {
      this.input.keyboard.on(`keydown-${key}`, () => this._setStage(index + 1));
    });
    this.input.keyboard.on("keydown-RIGHT", () => this._setStage(this.stageIndex + 1));
    this.input.keyboard.on("keydown-LEFT", () => this._setStage(this.stageIndex - 1));
    this.input.keyboard.on("keydown-M", () => this._showFailure());

    globalThis.__thunderStrikeChainReview = {
      ready: true,
      setStage: (stageNumber) => this._setStage(Math.max(1, stageNumber) - 1),
      showFailure: () => this._showFailure(),
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
    this.stageIndex = Math.max(
      1,
      Math.min(THUNDER_STRIKE_CHAIN_CONFIG.stages.length - 1, Math.trunc(stageIndex)),
    );
    this.progress = getThunderStrikeStage(this.stageIndex).timing.targetProgress;
    this.running = false;
    this._renderReview();
    return this.stageIndex + 1;
  }

  _showFailure() {
    this.running = false;
    const snapshot = {
      ...createTimingSnapshot(this.stageIndex, this.progress),
      phase: THUNDER_STRIKE_CHAIN_PHASES.FAILED,
    };
    this.timingBar.showFeedback(
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.chainBrokenText,
      THUNDER_STRIKE_CHAIN_CONFIG.timingBar.dangerColor,
      this.time.now,
      THUNDER_STRIKE_CHAIN_CONFIG.feedback.failureLingerMs,
      snapshot,
    );
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
