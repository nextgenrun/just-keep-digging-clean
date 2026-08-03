import { UI_FONTS } from "../../values/uiLayout.js";

function clampProgress(value) {
  return Phaser.Math.Clamp(Number(value) || 0, 0, 1);
}

function addText(scene, root, x, y, value, style, originX = 0) {
  const text = scene.add.text(x, y, value, style).setOrigin(originX, 0.5);
  root.add(text);
  return text;
}

function createFill(scene, root, asset, x, y, width, height) {
  const image = scene.add.image(x, y, asset.key).setOrigin(0, 0.5);
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  image.setDisplaySize(width, height);
  const fullScaleX = image.scaleX;
  const fullScaleY = image.scaleY;
  root.add(image);

  return {
    image,
    setProgress(value) {
      const progress = clampProgress(value);
      image.setVisible(progress > 0);
      if (progress <= 0) return;
      image
        .setCrop(0, 0, Math.max(1, sourceWidth * progress), sourceHeight)
        .setScale(fullScaleX, fullScaleY);
    },
  };
}

function resolvePhase(phases, progress) {
  const phase = phases.find(entry => progress < entry.end)
    || phases[phases.length - 1];
  const span = Math.max(Number.EPSILON, phase.end - phase.start);
  return {
    ...phase,
    progress: clampProgress((progress - phase.start) / span),
  };
}

export class AuthoredLoadingProgressMeters {
  constructor(scene, root, config) {
    this.scene = scene;
    this.root = root;
    this.config = config;
    this.progress = 0;
    this._build();
    this.setProgress(0);
  }

  _build() {
    const { layout, typography, copy, assets, timing } = this.config;
    const meters = layout.meters;
    const colors = typography.colors;
    const headingStyle = {
      fontFamily: UI_FONTS.mono,
      fontSize: typography.meterHeadingSize,
      fontStyle: "bold",
      color: colors.title,
      letterSpacing: typography.letterSpacing,
      stroke: colors.shadow,
      strokeThickness: typography.strokeThickness,
    };
    const percentStyle = {
      ...headingStyle,
      fontSize: typography.meterPercentSize,
      color: colors.amber,
      letterSpacing: 0,
    };
    const bodyStyle = {
      fontFamily: UI_FONTS.mono,
      fontSize: typography.statusSize,
      color: colors.body,
      stroke: colors.shadow,
      strokeThickness: typography.strokeThickness,
      align: "center",
    };
    const detailStyle = {
      ...bodyStyle,
      fontSize: typography.detailSize,
      color: colors.cyan,
    };

    this.overallHeading = addText(
      this.scene,
      this.root,
      meters.left,
      meters.overall.headingY,
      copy.overallHeading,
      headingStyle,
    );
    this.overallPercent = addText(
      this.scene,
      this.root,
      meters.percentX,
      meters.overall.headingY,
      "0%",
      percentStyle,
      1,
    );
    this.overallFill = createFill(
      this.scene,
      this.root,
      assets.overallFill,
      meters.left,
      meters.overall.fillY,
      meters.width,
      meters.height,
    );
    this.labelText = addText(
      this.scene,
      this.root,
      meters.left + meters.width / 2,
      meters.overall.statusY,
      copy.loadingFallback,
      bodyStyle,
      0.5,
    ).setWordWrapWidth(meters.width);

    this.phaseHeading = addText(
      this.scene,
      this.root,
      meters.left,
      meters.phase.headingY,
      copy.phaseHeading,
      headingStyle,
    );
    this.phasePercent = addText(
      this.scene,
      this.root,
      meters.percentX,
      meters.phase.headingY,
      "0%",
      { ...percentStyle, color: colors.cyan },
      1,
    );
    this.phaseFill = createFill(
      this.scene,
      this.root,
      assets.phaseFill,
      meters.left,
      meters.phase.fillY,
      meters.width,
      meters.height,
    );
    this.detailText = addText(
      this.scene,
      this.root,
      meters.left + meters.width / 2,
      meters.phase.statusY,
      copy.detailFallback,
      detailStyle,
      0.5,
    ).setWordWrapWidth(meters.width);
    this.phaseTween = this.scene.tweens.add({
      targets: this.phaseFill.image,
      alpha: { from: 0.78, to: 1 },
      duration: timing.phasePulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  setProgress(value) {
    this.progress = clampProgress(value);
    const phase = resolvePhase(this.config.phases, this.progress);
    this.overallFill.setProgress(this.progress);
    this.phaseFill.setProgress(phase.progress);
    this.overallPercent.setText(`${Math.floor(this.progress * 100)}%`);
    this.phasePercent.setText(`${Math.floor(phase.progress * 100)}%`);
    this.phaseHeading.setText(phase.label);
  }

  setLabel(value) {
    this.labelText.setText(String(value ?? this.config.copy.loadingFallback));
  }

  setDetail(value) {
    this.detailText.setText(String(value ?? this.config.copy.detailFallback));
  }

  getSnapshot() {
    return {
      progress: this.progress,
      overallPercent: this.overallPercent.text,
      phasePercent: this.phasePercent.text,
      phaseLabel: this.phaseHeading.text,
    };
  }

  destroy() {
    this.phaseTween?.stop();
  }
}
