import {
  addPauseLoadingCrop,
  addPauseLoadingText,
} from "./pauseFeatureLoadingArt.js";

export class PauseFeatureLoadingChrome {
  constructor(scene, root, config, loadingConfig, theme) {
    this.scene = scene;
    this.root = root;
    this.config = config;
    this.loadingConfig = loadingConfig;
    this.theme = theme;
    this.tweens = [];
    this._build();
  }

  _build() {
    const layout = this.config.layout;
    const motion = this.config.motion;
    const style = this.config.presentation;
    const assets = this.loadingConfig.assets;
    const boardCrop = this.loadingConfig.layout.board.frameCrop;

    this.foundationGlow = addPauseLoadingCrop(
      this.scene,
      0,
      0,
      assets.boardFrame.key,
      boardCrop,
      layout.foundationWidthPx,
      layout.foundationHeightPx,
    )
      .setTint(style.foundationGlowTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(
        layout.foundationWidthPx / boardCrop.width
          * layout.foundationGlowScale,
        layout.foundationHeightPx / boardCrop.height
          * layout.foundationGlowScale,
      )
      .setAlpha(motion.foundationMinAlpha);
    this.foundation = addPauseLoadingCrop(
      this.scene,
      0,
      0,
      assets.boardFrame.key,
      boardCrop,
      layout.foundationWidthPx,
      layout.foundationHeightPx,
    ).setAlpha(style.foundationAlpha);
    this.header = this.scene.add.image(
      0,
      layout.headerYpx,
      assets.counterFrame.key,
    ).setDisplaySize(layout.headerWidthPx, layout.headerHeightPx);
    this.eyebrow = addPauseLoadingText(
      this.scene,
      this.config,
      0,
      layout.eyebrowYpx,
      this.theme.eyebrow,
      style.eyebrowFontSizePx,
      style.eyebrowColor,
      "mono",
    );
    this.title = addPauseLoadingText(
      this.scene,
      this.config,
      0,
      layout.titleYpx,
      this.theme.title,
      style.titleFontSizePx,
      style.titleColor,
      "display",
      true,
    );
    this.phaseText = addPauseLoadingText(
      this.scene,
      this.config,
      0,
      layout.phaseYpx,
      "",
      style.phaseFontSizePx,
      style.phaseColor,
      "display",
      true,
    );
    this.detailText = addPauseLoadingText(
      this.scene,
      this.config,
      0,
      layout.detailYpx,
      "",
      style.detailFontSizePx,
      style.detailColor,
    );
    this.footerText = addPauseLoadingText(
      this.scene,
      this.config,
      0,
      layout.footerYpx,
      this.theme.footer,
      style.footerFontSizePx,
      style.footerColor,
      "mono",
    );
    this.root.add([
      this.foundationGlow,
      this.foundation,
      this.header,
      this.eyebrow,
      this.title,
      this.phaseText,
      this.detailText,
      this.footerText,
    ]);
    this._startAmbience();
  }

  _startAmbience() {
    const motion = this.config.motion;
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.foundationGlow,
        alpha: {
          from: motion.foundationMinAlpha,
          to: motion.foundationMaxAlpha,
        },
        duration: motion.foundationPulseMs,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }),
    );
  }

  setPhase(phase) {
    this.phaseText.setText(phase.label);
    this.detailText.setText(phase.detail);
  }

  setReady() {
    this.title.setText(this.theme.readyTitle);
    this.phaseText.setText(this.theme.readyPhase);
    this.detailText.setText(this.theme.readyDetail);
  }

  destroy() {
    this.tweens.forEach(tween => tween?.stop?.());
  }
}
