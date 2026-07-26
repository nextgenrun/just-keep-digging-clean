export class OpeningFlightTrialView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.body = null;
    this.barFill = null;
  }

  show(flyKey) {
    if (this.root?.active) return;
    const scene = this.scene;
    const cfg = this.config.screenView;
    const colors = this.config.colors;
    const fonts = this.config.typography;
    const centerX = (scene.scale?.width || scene.config.viewportWidth) / 2;
    const y = (scene.scale?.height || scene.config.viewportHeight) - cfg.trialYFromBottomPx;
    const panel = scene.add.rectangle(
      0, 0, cfg.trialWidthPx, cfg.trialHeightPx, colors.panel, cfg.panelAlpha,
    ).setStrokeStyle(cfg.panelStrokeWidthPx, colors.panelStroke, cfg.panelStrokeAlpha);
    const title = scene.add.text(0, cfg.trialTitleOffsetYPx, this.config.copy.trialTitle, {
      fontFamily: fonts.titleFontFamily,
      fontSize: cfg.trialTitleFontSize,
      fontStyle: fonts.titleFontStyle,
      color: colors.trialTitle,
    }).setOrigin(0.5);
    this.body = scene.add.text(0, cfg.trialBodyOffsetYPx, "", {
      fontFamily: fonts.bodyFontFamily,
      fontSize: cfg.trialBodyFontSize,
      color: colors.trialBody,
    }).setOrigin(0.5);
    const barBg = scene.add.rectangle(
      0,
      cfg.trialBarOffsetYPx,
      cfg.trialBarWidthPx,
      cfg.trialBarHeightPx,
      colors.ink,
      cfg.trialBarBgAlpha,
    );
    this.barFill = scene.add.rectangle(
      -cfg.trialBarWidthPx / 2,
      cfg.trialBarOffsetYPx,
      cfg.trialBarWidthPx,
      cfg.trialBarHeightPx,
      colors.cyan,
      cfg.trialBarFillAlpha,
    ).setOrigin(0, 0.5);
    this.root = scene.add.container(centerX, y, [
      panel, title, this.body, barBg, this.barFill,
    ]).setScrollFactor(0).setDepth(cfg.depth);
    this.update(this.config.trialDurationMs, false, flyKey);
  }

  update(remainingMs, started, flyKey) {
    if (!this.root?.active) this.show(flyKey);
    const seconds = (Math.max(0, remainingMs) / 1000).toFixed(1);
    const template = started
      ? this.config.copy.trialActiveLine
      : this.config.copy.trialReadyLine;
    this.body?.setText(
      template.replace("{flyKey}", flyKey).replace("{seconds}", seconds),
    );
    const ratio = Math.max(0, Math.min(1, remainingMs / this.config.trialDurationMs));
    this.barFill?.setScale(ratio, 1);
  }

  hide() {
    this.scene?.tweens?.killTweensOf(this.root);
    this.root?.destroy(true);
    this.root = null;
    this.body = null;
    this.barFill = null;
  }

  destroy() {
    this.hide();
    this.scene = null;
  }
}
