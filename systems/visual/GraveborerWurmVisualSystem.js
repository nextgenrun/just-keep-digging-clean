import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
} from "../../values/graveborerWurm.js";

const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, value));

function setBaseDisplaySize(image, width, height) {
  image.setDisplaySize(width, height);
  image._graveborerBaseScaleX = image.scaleX;
  image._graveborerBaseScaleY = image.scaleY;
  return image;
}

/**
 * ImageGen-backed segmented Wurm presentation. Runtime motion is procedural,
 * but every visible creature/warning surface uses authored production art.
 */
export class GraveborerWurmVisualSystem {
  constructor(scene, config = GRAVEBORER_WURM_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.tileSize = scene.config?.tileSize || 32;
    this.ready = this._hasRequiredTextures();
    this.warningContainer = null;
    this.creatureContainer = null;
    this.warningImages = [];
    this.bodyImages = [];
    this.headImage = null;
    this.tailImage = null;
    if (this.ready) this._create();
  }

  _hasRequiredTextures() {
    const keys = ASSET_KEYS.environment.graveborerWurm;
    const required = [keys.head, keys.body, keys.tail, keys.warning];
    const ready = required.every(key => this.scene.textures?.exists?.(key));
    if (!ready) {
      console.warn("[GraveborerWurmVisualSystem] Production Wurm textures are unavailable.");
    }
    return ready;
  }

  _create() {
    const keys = ASSET_KEYS.environment.graveborerWurm;
    const visuals = this.config.visuals;
    this.warningContainer = this.scene.add.container(0, 0)
      .setDepth(visuals.warningDepth)
      .setVisible(false);
    this.warningImages = Array.from(
      { length: this.config.path.warningDecalCount },
      () => setBaseDisplaySize(
        this.scene.add.image(0, 0, keys.warning).setOrigin(0.5),
        visuals.warningWidthTiles * this.tileSize,
        visuals.warningWidthTiles * this.tileSize * (320 / 768),
      ),
    );
    this.warningContainer.add(this.warningImages);

    this.creatureContainer = this.scene.add.container(0, 0)
      .setDepth(visuals.worldDepth)
      .setVisible(false);
    this.tailImage = setBaseDisplaySize(
      this.scene.add.image(0, 0, keys.tail).setOrigin(0.5),
      visuals.tailHeightTiles * this.tileSize * (512 / 384),
      visuals.tailHeightTiles * this.tileSize,
    );
    this.bodyImages = Array.from(
      { length: this.config.path.segmentCount },
      () => setBaseDisplaySize(
        this.scene.add.image(0, 0, keys.body).setOrigin(0.5),
        visuals.bodyWidthTiles * this.tileSize,
        visuals.bodyHeightTiles * this.tileSize,
      ),
    );
    this.headImage = setBaseDisplaySize(
      this.scene.add.image(0, 0, keys.head).setOrigin(0.5),
      visuals.headHeightTiles * this.tileSize * (512 / 384),
      visuals.headHeightTiles * this.tileSize,
    );

    this.creatureContainer.add(this.tailImage);
    [...this.bodyImages].reverse().forEach(image => this.creatureContainer.add(image));
    this.creatureContainer.add(this.headImage);
  }

  update(renderState, timeMs = 0) {
    if (!this.ready) return;
    const visible = renderState?.active === true;
    this.creatureContainer.setVisible(visible);
    this.warningContainer.setVisible(visible);
    if (!visible) return;

    this._updateWarnings(renderState, timeMs);
    this._applyPart(this.headImage, renderState.head, timeMs, 0);
    renderState.bodies.forEach((part, index) => {
      this._applyPart(this.bodyImages[index], part, timeMs, index + 1);
    });
    this._applyPart(
      this.tailImage,
      renderState.tail,
      timeMs,
      this.config.path.segmentCount + 1,
    );
  }

  _updateWarnings(renderState, timeMs) {
    const isWarning = renderState.phase === GRAVEBORER_WURM_PHASES.warning;
    const isEarlyBurrow = renderState.phase === GRAVEBORER_WURM_PHASES.burrowing
      && (renderState.head?.progress || 0) < this.config.visuals.burrowAlphaFadeProgress;
    const phaseAlpha = isWarning
      ? 1
      : isEarlyBurrow
        ? 1 - (renderState.head.progress / this.config.visuals.burrowAlphaFadeProgress)
        : 0;
    const pulseTime = timeMs / 1000 * this.config.visuals.warningPulseHz * TAU;
    this.warningImages.forEach((image, index) => {
      const point = renderState.warningPoints[index];
      if (!point || phaseAlpha <= 0) {
        image.setVisible(false);
        return;
      }
      const staggered = 0.5 + 0.5 * Math.sin(pulseTime - index * 0.74);
      const alpha = (
        this.config.visuals.warningAlphaMin
        + staggered * (
          this.config.visuals.warningAlphaMax - this.config.visuals.warningAlphaMin
        )
      ) * phaseAlpha;
      image
        .setVisible(true)
        .setPosition(
          (point.x + 0.5) * this.tileSize,
          (point.y + 0.5) * this.tileSize,
        )
        .setRotation(point.angle)
        .setAlpha(alpha)
        .setScale(
          image._graveborerBaseScaleX * (0.92 + staggered * 0.12),
          image._graveborerBaseScaleY * (0.88 + staggered * 0.18),
        );
    });
  }

  _applyPart(image, part, timeMs, waveIndex) {
    if (!part?.visible) {
      image.setVisible(false);
      return;
    }
    const visuals = this.config.visuals;
    const edgeFade = Math.max(0.01, visuals.burrowAlphaFadeProgress);
    const alpha = clamp01(Math.min(part.progress / edgeFade, (1 - part.progress) / edgeFade));
    const waveTime = timeMs / 1000 * visuals.bodyWaveHz * TAU;
    const waveAmount = part.kind === "head"
      ? 0
      : Math.sin(waveTime - waveIndex * visuals.bodyWavePhase)
        * visuals.bodyWaveTiles * this.tileSize;
    const normalX = -part.tangentY;
    const normalY = part.tangentX;
    const pulse = part.kind === "head"
      ? 1 + Math.sin(timeMs / 1000 * visuals.headPulseHz * TAU) * visuals.headPulseAmount
      : 1 + Math.sin(waveTime - waveIndex * 0.58) * 0.025;
    image
      .setVisible(true)
      .setPosition(
        (part.x + 0.5) * this.tileSize + normalX * waveAmount,
        (part.y + 0.5) * this.tileSize + normalY * waveAmount,
      )
      .setRotation(part.angle + Math.PI)
      .setAlpha(alpha)
      .setScale(
        image._graveborerBaseScaleX * pulse,
        image._graveborerBaseScaleY * (2 - pulse),
      );
  }

  destroy() {
    this.warningContainer?.destroy(true);
    this.creatureContainer?.destroy(true);
    this.warningContainer = null;
    this.creatureContainer = null;
    this.warningImages = [];
    this.bodyImages = [];
    this.headImage = null;
    this.tailImage = null;
    this.scene = null;
  }
}
