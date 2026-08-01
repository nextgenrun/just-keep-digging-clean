import {
  addPauseLoadingCrop,
  addPauseLoadingText,
  clampPauseLoadingProgress,
} from "./pauseFeatureLoadingArt.js";

export class PauseFeatureLoadingProgress {
  constructor(scene, root, config, loadingConfig, theme, onPhase) {
    this.scene = scene;
    this.root = root;
    this.config = config;
    this.loadingConfig = loadingConfig;
    this.theme = theme;
    this.onPhase = onPhase;
    this.displayProgress = 0;
    this.targetProgress = 0;
    this.phaseIndex = -1;
    this._buildTrack();
    this._buildStages();
    this._renderFill(0);
  }

  _buildTrack() {
    const layout = this.config.layout;
    const style = this.config.presentation;
    const screen = this.loadingConfig.layout.screen;
    const crop = screen.progressFrameCrop;
    this.progressBase = addPauseLoadingCrop(
      this.scene,
      0,
      layout.progressYpx,
      this.loadingConfig.assets.boardFrame.key,
      crop,
      layout.progressWidthPx,
      layout.progressHeightPx,
    ).setAlpha(style.progressBaseAlpha);

    const scaleX = layout.progressWidthPx / screen.progressFrameWidth;
    const scaleY = layout.progressHeightPx / screen.progressFrameHeight;
    this.barWidth = screen.progressBarWidth * scaleX;
    this.barHeight = screen.progressBarHeight * scaleY;
    this.barX = screen.progressBarOffsetX * scaleX;
    this.barY = layout.progressYpx
      + (screen.progressBarY - screen.progressPanelY) * scaleY
      + layout.progressEnergyOffsetYpx;
    this.progressSegments = Array.from(
      { length: layout.progressSegmentCount },
      (_, index) => this.scene.add.image(
        this.barX - this.barWidth / 2
          + this.barWidth * (index + 0.5) / layout.progressSegmentCount,
        this.barY,
        this.loadingConfig.assets.target.key,
      )
        .setDisplaySize(
          layout.progressSegmentSizePx,
          layout.progressSegmentSizePx,
        )
        .setTint(style.progressFillTint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(layout.progressSegmentAngleDeg)
        .setAlpha(style.progressSegmentFutureAlpha),
    );
    const socketAsset = this.config.assets[this.theme.socketAsset];
    this.progressSpark = this.scene.add.image(
      this.barX - this.barWidth / 2,
      this.barY,
      socketAsset?.key || this.loadingConfig.assets.target.key,
    )
      .setDisplaySize(layout.progressSparkSizePx, layout.progressSparkSizePx)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.countText = addPauseLoadingText(
      this.scene,
      this.config,
      layout.progressCountXpx,
      layout.progressCountYpx,
      "",
      style.progressFontSizePx,
      style.countColor,
      "mono",
    );
    this.percentText = addPauseLoadingText(
      this.scene,
      this.config,
      layout.progressPercentOffsetXpx,
      layout.progressPercentYpx,
      "0%",
      style.progressFontSizePx,
      style.percentColor,
      "mono",
      true,
    );
    this.root.add([
      this.progressBase,
      ...this.progressSegments,
      this.progressSpark,
      this.countText,
      this.percentText,
    ]);
  }

  _buildStages() {
    const layout = this.config.layout;
    const style = this.config.presentation;
    const socketAsset = this.config.assets[this.theme.socketAsset];
    this.stageViews = this.theme.stages.map((label, index) => {
      const root = this.scene.add.container(
        layout.stageXpx[index],
        0,
      );
      const socketTarget = this.scene.add.image(
        0,
        layout.apertureYpx,
        this.loadingConfig.assets.target.key,
      )
        .setDisplaySize(layout.apertureSizePx, layout.apertureSizePx)
        .setTint(style.apertureTint)
        .setAlpha(style.targetAlpha);
      const socketFlare = this.scene.add.image(
        0,
        layout.apertureYpx,
        socketAsset?.key || this.loadingConfig.assets.target.key,
      )
        .setDisplaySize(layout.flareSizePx, layout.flareSizePx)
        .setBlendMode(Phaser.BlendModes.ADD);
      const frame = this.scene.add.image(
        0,
        layout.stagesYpx,
        this.loadingConfig.assets.counterFrame.key,
      ).setDisplaySize(layout.stageWidthPx, layout.stageHeightPx);
      const text = addPauseLoadingText(
        this.scene,
        this.config,
        0,
        layout.stagesYpx,
        label,
        style.stageFontSizePx,
        style.countColor,
        "mono",
        true,
      );
      root.add([socketTarget, socketFlare, frame, text]);
      this.root.add(root);
      return { root, frame, socketTarget, socketFlare };
    });
    this.stageAmbienceTweens = this.stageViews.flatMap((view, index) => {
      const motion = this.config.motion;
      const flareScaleX = view.socketFlare.scaleX;
      const flareScaleY = view.socketFlare.scaleY;
      return [
        this.scene.tweens.add({
          targets: view.socketTarget,
          angle: 360,
          duration: motion.apertureSpinMs,
          delay: index * motion.stageFlareStaggerMs,
          repeat: -1,
          ease: "Linear",
        }),
        this.scene.tweens.add({
          targets: view.socketFlare,
          alpha: { from: motion.flareMinAlpha, to: motion.flareMaxAlpha },
          scaleX: {
            from: flareScaleX * motion.flareMinScale,
            to: flareScaleX * motion.flareMaxScale,
          },
          scaleY: {
            from: flareScaleY * motion.flareMinScale,
            to: flareScaleY * motion.flareMaxScale,
          },
          duration: motion.flarePulseMs,
          delay: index * motion.stageFlareStaggerMs,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        }),
      ];
    });
  }

  _phaseFor(progress) {
    let index = 0;
    this.theme.phases.forEach((candidate, candidateIndex) => {
      if (progress >= candidate.at) index = candidateIndex;
    });
    return { index, phase: this.theme.phases[index] };
  }

  _applyPhase(progress) {
    const { index, phase } = this._phaseFor(progress);
    if (index === this.phaseIndex) return;
    this.phaseIndex = index;
    this.onPhase?.(phase);
    this.stageViews.forEach((view, stageIndex) => {
      const state = stageIndex < phase.stageIndex
        ? "past"
        : stageIndex === phase.stageIndex
          ? "active"
          : "future";
      this._applyStage(view, state);
    });
  }

  _applyStage(view, state) {
    const style = this.config.presentation;
    const motion = this.config.motion;
    const alpha = style[`stage${state[0].toUpperCase()}${state.slice(1)}Alpha`];
    const tint = style[`stage${state[0].toUpperCase()}${state.slice(1)}Tint`];
    const scale = state === "active"
      ? motion.stageActiveScale
      : motion.stageIdleScale;
    view.frame.setTint(tint);
    this.scene.tweens.killTweensOf(view.root);
    this.scene.tweens.add({
      targets: view.root,
      alpha,
      scaleX: scale,
      scaleY: scale,
      duration: motion.stageTweenMs,
      ease: "Sine.easeOut",
    });
  }

  _renderFill(progress) {
    const clamped = clampPauseLoadingProgress(progress);
    const style = this.config.presentation;
    this.progressSegments.forEach((segment, index) => {
      const threshold = (index + 1) / this.progressSegments.length;
      segment.setAlpha(
        clamped >= threshold
          ? style.progressSegmentAlpha
          : style.progressSegmentFutureAlpha,
      );
    });
    this.progressSpark
      .setX(this.barX - this.barWidth / 2 + this.barWidth * clamped)
      .setVisible(clamped > 0 && clamped < 1);
    this.displayProgress = clamped;
  }

  setSnapshot(snapshot, immediate = false) {
    const progress = clampPauseLoadingProgress(snapshot.progress);
    this.countText.setText(
      `${snapshot.loadedAssets} / ${snapshot.totalAssets} ${this.theme.countNoun}`,
    );
    this.percentText.setText(`${Math.round(progress * 100)}%`);
    this._applyPhase(progress);
    if (!immediate && progress === this.targetProgress) return;
    this.targetProgress = progress;
    this.fillTween?.stop?.();
    if (immediate) {
      this._renderFill(progress);
      return;
    }
    this.fillTween = this.scene.tweens.addCounter({
      from: this.displayProgress,
      to: progress,
      duration: this.config.motion.fillEaseMs,
      ease: "Sine.easeOut",
      onUpdate: tween => this._renderFill(tween.getValue()),
    });
  }

  setReady(totalAssets) {
    this.fillTween?.stop?.();
    this._renderFill(1);
    this.countText.setText(
      `${totalAssets} / ${totalAssets} ${this.theme.countNoun}`,
    );
    this.percentText.setText("100%");
    this.stageViews.forEach(view => this._applyStage(view, "past"));
    this.progressSpark.setVisible(false);
  }

  destroy() {
    this.fillTween?.stop?.();
    this.stageAmbienceTweens?.forEach(tween => tween?.stop?.());
    this.stageViews.forEach(view => this.scene.tweens.killTweensOf(view.root));
  }
}
