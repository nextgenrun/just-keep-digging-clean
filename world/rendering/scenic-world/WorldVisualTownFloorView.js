import {
  clearTintIfChanged,
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";

function getSource(scene, key) {
  const texture = scene.textures.get(key);
  const image = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!image?.width || !image?.height) {
    throw new Error(`[WorldVisualTownFloorView] Missing source: ${key}`);
  }
  return { texture, width: image.width, height: image.height };
}

function installFrame(texture, config) {
  if (texture.has(config.frameName)) return;
  texture.add(
    config.frameName,
    0,
    config.sourceRect.x,
    config.sourceRect.y,
    config.sourceRect.width,
    config.sourceRect.height,
  );
}

export function resolveTownFloorGeometry(pack, beautyGeometry, tileSize, surfaceTileY) {
  const config = pack.floor;
  const sourcePixelsPerWorldPixel = config.sourceRect.width / beautyGeometry.width;
  const positiveValues = [
    beautyGeometry.width,
    tileSize,
    config.sourceRect.width,
    config.sourceRect.height,
  ];
  if (
    positiveValues.some(value => !Number.isFinite(value) || value <= 0)
    || !Number.isFinite(surfaceTileY)
    || !Number.isFinite(config.surfaceOffsetSourcePx)
    || config.surfaceOffsetSourcePx < 0
  ) {
    throw new Error(`[WorldVisualTownFloorView] ${pack.id} has invalid floor geometry`);
  }
  if (sourcePixelsPerWorldPixel < config.minSourcePixelsPerWorldPixel) {
    throw new Error(`[WorldVisualTownFloorView] ${pack.id} floor violates its density contract`);
  }

  const worldPixelsPerSourcePixel = 1 / sourcePixelsPerWorldPixel;
  return Object.freeze({
    x: pack.worldAnchor.leftTile * tileSize,
    y: surfaceTileY * tileSize
      - config.surfaceOffsetSourcePx * worldPixelsPerSourcePixel,
    width: beautyGeometry.width,
    height: config.sourceRect.height * worldPixelsPerSourcePixel,
    sourcePixelsPerWorldPixel,
  });
}

export class WorldVisualTownFloorView {
  constructor(scene, pack, beautyGeometry) {
    this.scene = scene;
    this.pack = pack;
    this.beautyGeometry = beautyGeometry;
    this.base = null;
    this.wet = null;
    this.lightning = null;
    this.terrainMask = null;
  }

  create(terrainMask) {
    if (!terrainMask || this.base) return false;
    const config = this.pack.floor;
    const source = getSource(this.scene, config.asset.key);
    if (
      source.width !== config.expectedSource.width
      || source.height !== config.expectedSource.height
    ) {
      throw new Error(
        `[WorldVisualTownFloorView] ${this.pack.id} floor source changed: `
        + `${source.width}x${source.height}; expected `
        + `${config.expectedSource.width}x${config.expectedSource.height}`,
      );
    }
    const sourceRight = config.sourceRect.x + config.sourceRect.width;
    const sourceBottom = config.sourceRect.y + config.sourceRect.height;
    if (
      config.sourceRect.x < 0
      || config.sourceRect.y < 0
      || sourceRight > source.width
      || sourceBottom > source.height
    ) {
      throw new Error(`[WorldVisualTownFloorView] ${this.pack.id} floor crop is out of bounds`);
    }

    installFrame(source.texture, config);
    const tileSize = this.scene.config.tileSize;
    const geometry = resolveTownFloorGeometry(
      this.pack,
      this.beautyGeometry,
      tileSize,
      this.scene.config.topAirRows,
    );
    const makeImage = (depth, blendMode = null) => {
      const image = this.scene.add.image(
        geometry.x,
        geometry.y,
        config.asset.key,
        config.frameName,
      ).setOrigin(0)
        .setDepth(depth)
        .setDisplaySize(geometry.width, geometry.height)
        .setMask(terrainMask);
      if (blendMode !== null) image.setBlendMode(blendMode);
      return image;
    };

    this.terrainMask = terrainMask;
    this.base = makeImage(config.depth);
    this.base.name = `world-visual-surface-pack-${this.pack.id}-town-floor`;
    this.wet = makeImage(config.depth + config.effectDepthStep, Phaser.BlendModes.SCREEN)
      .setAlpha(0);
    this.lightning = makeImage(
      config.depth + config.effectDepthStep * 2,
      Phaser.BlendModes.SCREEN,
    ).setAlpha(0);
    return true;
  }

  update(lighting) {
    if (!lighting || !this.base) return;
    const effects = this.pack.effects;
    clearTintIfChanged(this.base);
    setTintIfChanged(this.wet, effects.wetGroundTint);
    setAlphaIfChanged(this.wet, lighting.wet * effects.wetGroundAlpha);
    clearTintIfChanged(this.lightning);
    setAlphaIfChanged(
      this.lightning,
      lighting.lightning * effects.lightningGroundAlpha
    );
  }

  destroy() {
    for (const image of [this.base, this.wet, this.lightning]) {
      image?.clearMask?.(false);
      image?.destroy?.();
    }
    this.base = null;
    this.wet = null;
    this.lightning = null;
    this.terrainMask = null;
  }
}
