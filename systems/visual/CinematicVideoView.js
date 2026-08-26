import { UI_FONTS } from "../../values/uiLayout.js";

export class CinematicVideoView {
  constructor(scene, asset, config) {
    this.scene = scene;
    this.asset = asset;
    this.config = config;
    this.backdrop = null;
    this.poster = null;
    this.video = null;
    this.veil = null;
    this.startPrompt = null;
    this.skipPrompt = null;
    this.skipHoldFrame = null;
    this.skipHoldFill = null;
    this.skipHoldProgress = 0;
    this.skipHoldActive = false;
    this.playingPresentation = false;
    this.objects = [];
  }

  create() {
    const cfg = this.config.presentation;
    const { width, height, centerX, centerY } = this._viewport();
    this.backdrop = this.scene.add.rectangle(
      centerX, centerY, width, height, cfg.backgroundColor,
    ).setScrollFactor(0).setDepth(cfg.depth);
    if (this.scene.textures?.exists?.(this.asset.posterKey)) {
      this.poster = this.scene.add.image(centerX, centerY, this.asset.posterKey)
        .setDisplaySize(width, height)
        .setAlpha(cfg.posterAlpha)
        .setScrollFactor(0)
        .setDepth(cfg.depth + cfg.videoDepthOffset);
    }
    this.video = this.scene.cache?.video?.exists?.(this.asset.key)
      ? this.scene.add.video(centerX, centerY, this.asset.key)
      : this.scene.add.video(centerX, centerY).loadURL(this.asset.path, false);
    this.video
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(cfg.depth + cfg.videoDepthOffset);
    this.veil = this.scene.add.rectangle(
      centerX, centerY, width, height, cfg.backgroundColor, cfg.veilAlpha,
    ).setScrollFactor(0).setDepth(cfg.depth + cfg.promptDepthOffset);
    this.startPrompt = this._addPrompt(
      this.config.copy.start,
      cfg.startPromptYRatio,
      cfg.startFontSize,
      cfg.startColor,
      cfg.startStrokeThickness,
    );
    this.skipPrompt = this._addPrompt(
      this.config.copy.skip,
      cfg.skipPromptYRatio,
      cfg.skipFontSize,
      cfg.skipColor,
      cfg.skipStrokeThickness,
    ).setVisible(false);
    const holdFrame = this.config.uiAssets.holdFrame;
    if (this.scene.textures?.exists?.(holdFrame.key)) {
      this.skipHoldFrame = this.scene.add.image(
        centerX,
        height * cfg.holdBarYRatio,
        holdFrame.key,
      ).setVisible(false).setScrollFactor(0)
        .setDepth(cfg.depth + cfg.promptDepthOffset);
      this.skipHoldFill = this.scene.add.rectangle(
        centerX,
        height * cfg.holdBarYRatio,
        1,
        1,
        cfg.holdFillColor,
        cfg.holdFillAlpha,
      ).setOrigin(0, cfg.centerRatio).setVisible(false).setScrollFactor(0)
        .setDepth(cfg.depth + cfg.promptDepthOffset);
    }
    this.objects = [
      this.backdrop,
      this.poster,
      this.video,
      this.veil,
      this.startPrompt,
      this.skipPrompt,
      this.skipHoldFrame,
      this.skipHoldFill,
    ].filter(Boolean);
    this.layout();
    return this;
  }

  showPrompt(copy) {
    this.startPrompt?.setText(copy).setVisible(true);
  }

  showPlaying() {
    this.playingPresentation = true;
    this.video?.setVisible?.(true);
    this.poster?.setVisible?.(false);
    this.veil?.setVisible?.(false);
    this.startPrompt?.setVisible?.(false);
    this.skipPrompt?.setVisible?.(true);
  }

  setSkipHoldProgress(progress, active) {
    this.skipHoldProgress = Math.max(0, Math.min(1, Number(progress) || 0));
    this.skipHoldActive = active === true;
    if (this.skipHoldActive) {
      const percent = Math.round(this.skipHoldProgress * 100);
      this.startPrompt?.setVisible?.(false);
      this.skipPrompt
        ?.setText?.(this.config.copy.hold.replace("{percent}", String(percent)))
        .setVisible?.(true);
      this.skipHoldFrame?.setVisible?.(true);
      this.skipHoldFill?.setVisible?.(this.skipHoldProgress > 0);
    } else {
      this.skipHoldFrame?.setVisible?.(false);
      this.skipHoldFill?.setVisible?.(false);
      this.skipPrompt?.setText?.(this.config.copy.skip)
        .setVisible?.(this.playingPresentation);
      this.startPrompt?.setVisible?.(!this.playingPresentation);
    }
    this._layoutHoldBar();
  }

  layout() {
    const cfg = this.config.presentation;
    const { width, height, centerX, centerY } = this._viewport();
    this.backdrop?.setPosition?.(centerX, centerY).setSize?.(width, height);
    this.poster?.setPosition?.(centerX, centerY).setDisplaySize?.(width, height);
    this.video?.setPosition?.(centerX, centerY).setDisplaySize?.(width, height);
    this.veil?.setPosition?.(centerX, centerY).setSize?.(width, height);
    this.startPrompt?.setPosition?.(centerX, height * cfg.startPromptYRatio);
    this.skipPrompt?.setPosition?.(centerX, height * cfg.skipPromptYRatio);
    this._layoutHoldBar(width, height, centerX);
  }

  destroy() {
    this.video?.stop?.(false);
    this.objects.forEach(object => object?.destroy?.());
    this.objects = [];
    this.video = null;
    this.skipHoldFrame = null;
    this.skipHoldFill = null;
  }

  _layoutHoldBar(
    viewportWidth = this._viewport().width,
    viewportHeight = this._viewport().height,
    centerX = this._viewport().centerX,
  ) {
    if (!this.skipHoldFrame || !this.skipHoldFill) return;
    const cfg = this.config.presentation;
    const desiredWidth = Math.max(
      cfg.holdBarMinWidthPx,
      viewportWidth * cfg.holdBarWidthRatio,
    );
    const frameWidth = Math.min(
      cfg.holdBarMaxWidthPx,
      viewportWidth * cfg.holdBarViewportMaxRatio,
      desiredWidth,
    );
    const frameHeight = frameWidth / cfg.holdFrameAspectRatio;
    const centerY = viewportHeight * cfg.holdBarYRatio;
    const fillMaxWidth = frameWidth * cfg.holdFillWidthRatio;
    const fillWidth = Math.max(1, fillMaxWidth * this.skipHoldProgress);
    const fillHeight = frameHeight * cfg.holdFillHeightRatio;
    this.skipHoldFrame
      .setPosition(centerX, centerY)
      .setDisplaySize(frameWidth, frameHeight);
    this.skipHoldFill
      .setPosition(centerX - fillMaxWidth / 2, centerY)
      .setDisplaySize(fillWidth, fillHeight);
  }

  _addPrompt(copy, yRatio, fontSize, color, strokeThickness) {
    const cfg = this.config.presentation;
    const { centerX, height } = this._viewport();
    return this.scene.add.text(centerX, height * yRatio, copy, {
      fontFamily: UI_FONTS.display,
      fontSize,
      color,
      stroke: cfg.textStrokeColor,
      strokeThickness,
      align: "center",
    }).setOrigin(cfg.centerRatio).setScrollFactor(0)
      .setDepth(cfg.depth + cfg.promptDepthOffset);
  }

  _viewport() {
    const width = this.scene.cameras?.main?.width || this.scene.scale.width;
    const height = this.scene.cameras?.main?.height || this.scene.scale.height;
    const centerRatio = this.config.presentation.centerRatio;
    return { width, height, centerX: width * centerRatio, centerY: height * centerRatio };
  }
}
