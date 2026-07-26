import { OpeningFlightTrialView } from "./OpeningFlightTrialView.js";

export class OpeningFlightArtifactView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.artifactRoot = null;
    this.worldArrowRoot = null;
    this.objectiveRoot = null;
    this.objectiveBody = null;
    this.pointerRoot = null;
    this.trialView = new OpeningFlightTrialView(scene, config);
    this._destroyed = false;
  }

  createGuidance(artifactWorld, entranceWorld) {
    if (this._destroyed || this.artifactRoot) return;
    this._createArtifact(artifactWorld);
    this._createWorldArrows(entranceWorld);
    this._createObjective();
    this._createPointer();
  }

  _createArtifact(world) {
    const scene = this.scene;
    const cfg = this.config.worldView;
    const colors = this.config.colors;
    const fonts = this.config.typography;
    const glow = scene.add.circle(
      0, 0, cfg.artifactRadiusPx, colors.cyan, cfg.artifactGlowAlpha,
    );
    const ring = scene.add.circle(0, 0, cfg.artifactRingRadiusPx, colors.cyan, 0)
      .setStrokeStyle(cfg.artifactRingWidthPx, colors.cyanBright, cfg.artifactRingAlpha);
    const gem = scene.add.graphics();
    gem.fillStyle(colors.blue, 1);
    gem.lineStyle(cfg.artifactRingWidthPx, colors.cyanBright, 1);
    gem.beginPath();
    gem.moveTo(0, -cfg.gemHeightPx / 2);
    gem.lineTo(cfg.gemWidthPx / 2, 0);
    gem.lineTo(0, cfg.gemHeightPx / 2);
    gem.lineTo(-cfg.gemWidthPx / 2, 0);
    gem.closePath();
    gem.fillPath();
    gem.strokePath();
    gem.fillStyle(colors.white, cfg.gemHighlight.alpha);
    gem.fillTriangle(
      cfg.gemWidthPx * cfg.gemHighlight.leftXRatio,
      cfg.gemHeightPx * cfg.gemHighlight.topYRatio,
      cfg.gemWidthPx * cfg.gemHighlight.rightXRatio,
      cfg.gemHeightPx * cfg.gemHighlight.rightYRatio,
      cfg.gemWidthPx * cfg.gemHighlight.bottomXRatio,
      cfg.gemHeightPx * cfg.gemHighlight.bottomYRatio,
    );

    const title = scene.add.text(0, cfg.artifactLabelOffsetYPx, this.config.copy.artifactLabel, {
      fontFamily: fonts.titleFontFamily,
      fontSize: cfg.artifactTitleFontSize,
      fontStyle: fonts.titleFontStyle,
      color: colors.artifactTitle,
      stroke: colors.textStroke,
      strokeThickness: cfg.artifactRingWidthPx,
    }).setOrigin(0.5);
    const body = scene.add.text(0, cfg.artifactSubLabelOffsetYPx, this.config.copy.artifactSubLabel, {
      fontFamily: fonts.bodyFontFamily,
      fontSize: cfg.artifactBodyFontSize,
      color: colors.artifactBody,
      stroke: colors.textStroke,
      strokeThickness: cfg.artifactRingWidthPx,
    }).setOrigin(0.5);

    this.artifactRoot = scene.add.container(world.x, world.y, [glow, ring, gem, title, body])
      .setDepth(cfg.depth);
    scene.tweens.add({
      targets: [glow, ring],
      alpha: { from: cfg.pulseAlphaFrom, to: cfg.pulseAlphaTo },
      scaleX: { from: cfg.pulseScaleFrom, to: cfg.pulseScaleTo },
      scaleY: { from: cfg.pulseScaleFrom, to: cfg.pulseScaleTo },
      duration: cfg.pulseDurationMs,
      yoyo: true,
      repeat: -1,
      ease: cfg.pulseEase,
    });
  }

  _createWorldArrows(world) {
    const scene = this.scene;
    const cfg = this.config.worldView;
    const colors = this.config.colors;
    const fonts = this.config.typography;
    const graphics = scene.add.graphics();
    graphics.fillStyle(colors.gold, 1);
    graphics.lineStyle(cfg.artifactRingWidthPx, colors.ink, 0.9);
    for (let index = 0; index < cfg.arrowCount; index += 1) {
      const y = index * cfg.arrowGapPx;
      graphics.fillTriangle(
        -cfg.arrowWidthPx / 2,
        y - cfg.arrowHeightPx / 2,
        cfg.arrowWidthPx / 2,
        y - cfg.arrowHeightPx / 2,
        0,
        y + cfg.arrowHeightPx / 2,
      );
      graphics.strokeTriangle(
        -cfg.arrowWidthPx / 2,
        y - cfg.arrowHeightPx / 2,
        cfg.arrowWidthPx / 2,
        y - cfg.arrowHeightPx / 2,
        0,
        y + cfg.arrowHeightPx / 2,
      );
    }
    const label = scene.add.text(0, cfg.arrowLabelOffsetYPx, this.config.copy.artifactLabel, {
      fontFamily: fonts.titleFontFamily,
      fontSize: cfg.arrowLabelFontSize,
      fontStyle: fonts.titleFontStyle,
      color: colors.artifactTitle,
      stroke: colors.textStroke,
      strokeThickness: cfg.artifactRingWidthPx,
    }).setOrigin(0.5);
    this.worldArrowRoot = scene.add.container(world.x, world.y, [graphics, label])
      .setDepth(cfg.depth);
    scene.tweens.add({
      targets: this.worldArrowRoot,
      y: world.y + cfg.bobDistancePx,
      duration: cfg.bobDurationMs,
      yoyo: true,
      repeat: -1,
      ease: cfg.bobEase,
    });
  }

  _createObjective() {
    const scene = this.scene;
    const cfg = this.config.screenView;
    const colors = this.config.colors;
    const fonts = this.config.typography;
    const centerX = (scene.scale?.width || scene.config.viewportWidth) / 2;
    const panel = scene.add.rectangle(
      0, 0, cfg.objectiveWidthPx, cfg.objectiveHeightPx, colors.panel, cfg.panelAlpha,
    ).setStrokeStyle(cfg.panelStrokeWidthPx, colors.panelStroke, cfg.panelStrokeAlpha);
    const title = scene.add.text(0, cfg.objectiveTitleOffsetYPx, this.config.copy.objectiveTitle, {
      fontFamily: fonts.titleFontFamily,
      fontSize: cfg.objectiveTitleFontSize,
      fontStyle: fonts.titleFontStyle,
      color: colors.objectiveTitle,
    }).setOrigin(0.5);
    this.objectiveBody = scene.add.text(0, cfg.objectiveBodyOffsetYPx, this.config.copy.objectiveSurface, {
      fontFamily: fonts.bodyFontFamily,
      fontSize: cfg.objectiveBodyFontSize,
      color: colors.objectiveBody,
    }).setOrigin(0.5);
    this.objectiveRoot = scene.add.container(centerX, cfg.objectiveY, [panel, title, this.objectiveBody])
      .setScrollFactor(0)
      .setDepth(cfg.depth);
  }

  _createPointer() {
    const scene = this.scene;
    const cfg = this.config.screenView;
    const colors = this.config.colors;
    const arrow = scene.add.graphics();
    arrow.fillStyle(colors.gold, 1);
    arrow.lineStyle(cfg.panelStrokeWidthPx, colors.ink, 0.95);
    arrow.fillTriangle(
      cfg.pointerArrowLengthPx / 2,
      0,
      -cfg.pointerArrowLengthPx / 2,
      -cfg.pointerArrowWidthPx / 2,
      -cfg.pointerArrowLengthPx / 2,
      cfg.pointerArrowWidthPx / 2,
    );
    arrow.strokeTriangle(
      cfg.pointerArrowLengthPx / 2,
      0,
      -cfg.pointerArrowLengthPx / 2,
      -cfg.pointerArrowWidthPx / 2,
      -cfg.pointerArrowLengthPx / 2,
      cfg.pointerArrowWidthPx / 2,
    );
    this.pointerRoot = scene.add.container(0, 0, [arrow])
      .setScrollFactor(0)
      .setDepth(cfg.depth);
  }

  setMiningObjective(isMining) {
    this.objectiveBody?.setText(
      isMining ? this.config.copy.objectiveMine : this.config.copy.objectiveSurface,
    );
  }

  updateGuidance(playerWorld, waypointWorld) {
    if (!this.pointerRoot?.active) return;
    const camera = this.scene.cameras?.main;
    const width = this.scene.scale?.width || this.scene.config.viewportWidth;
    const height = this.scene.scale?.height || this.scene.config.viewportHeight;
    const zoom = camera?.zoom || 1;
    const cameraX = camera?.x || 0;
    const cameraY = camera?.y || 0;
    const toScreen = (world) => ({
      x: (world.x - (camera?.scrollX || 0)) * zoom + cameraX,
      y: (world.y - (camera?.scrollY || 0)) * zoom + cameraY,
    });
    const player = toScreen(playerWorld);
    const target = toScreen(waypointWorld);
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / length;
    const ny = dy / length;
    const cfg = this.config.screenView;
    const travel = Math.max(
      cfg.pointerPlayerClearancePx,
      Math.min(
        length - cfg.pointerRadiusPx,
        Math.min(width, height) * cfg.pointerMaxTravelViewportRatio,
      ),
    );
    const x = Math.max(
      cfg.pointerEdgeMarginPx,
      Math.min(width - cfg.pointerEdgeMarginPx, player.x + nx * travel),
    );
    const y = Math.max(
      cfg.pointerEdgeMarginPx,
      Math.min(height - cfg.pointerEdgeMarginPx, player.y + ny * travel),
    );
    this.pointerRoot.setPosition(x, y);
    this.pointerRoot.setRotation(Math.atan2(dy, dx));
  }

  transitionToTrial(flyKey) {
    this.hideGuidance();
    this.trialView.show(flyKey);
  }

  updateTrial(remainingMs, started, flyKey) {
    this.trialView.update(remainingMs, started, flyKey);
  }

  showCollectionBurst(world) {
    const cfg = this.config.collectionFx;
    const colors = [this.config.colors.cyan, this.config.colors.gold, this.config.colors.violet];
    for (let index = 0; index < cfg.sparkCount; index += 1) {
      const angle = (index / cfg.sparkCount) * Math.PI * 2;
      const distanceStep = index % cfg.distanceSteps;
      const distance = cfg.travelMinPx
        + (cfg.travelMaxPx - cfg.travelMinPx)
          * (distanceStep / (cfg.distanceSteps - 1));
      const spark = this.scene.add.circle(
        world.x, world.y, cfg.sparkRadiusPx, colors[index % colors.length], cfg.startAlpha,
      ).setDepth(this.config.worldView.depth + 1);
      this.scene.tweens.add({
        targets: spark,
        x: world.x + Math.cos(angle) * distance,
        y: world.y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: cfg.endScale,
        scaleY: cfg.endScale,
        duration: cfg.durationMs,
        ease: cfg.ease,
        onComplete: () => spark.destroy(),
      });
    }
  }

  hideTrial() {
    this.trialView.hide();
  }

  hideGuidance() {
    [this.artifactRoot, this.worldArrowRoot, this.objectiveRoot, this.pointerRoot]
      .forEach(target => {
        this.scene.tweens?.killTweensOf(target);
        target?.destroy(true);
      });
    this.artifactRoot = null;
    this.worldArrowRoot = null;
    this.objectiveRoot = null;
    this.objectiveBody = null;
    this.pointerRoot = null;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.hideGuidance();
    this.trialView.destroy();
    this.trialView = null;
    this.scene = null;
  }
}
