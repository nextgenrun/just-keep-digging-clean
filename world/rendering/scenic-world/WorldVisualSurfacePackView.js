function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualSurfacePackView] Missing source: ${key}`);
  }
  return { texture, width: source.width, height: source.height };
}

function installFrame(texture, name, x, y, width, height) {
  if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
}

function splitRange(start, length, count) {
  return Array.from({ length: count }, (_, index) => {
    const left = start + Math.floor(length * index / count);
    const right = start + Math.floor(length * (index + 1) / count);
    return { left, width: right - left };
  });
}

function edgeAlpha(index, count) {
  return 1 - (index + 1) / count;
}

function smoothstep01(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function ensureVerticalFeatherTexture(scene, key, fadeFraction) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, 4, 256);
  const context = texture.context;
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(Math.max(0.01, Math.min(1, fadeFraction)), "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,1)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 256);
  texture.refresh();
}

export function resolveSurfacePackBeautyVisibility(edgeScreenY, viewportHeight, config) {
  if (!Number.isFinite(edgeScreenY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 1;
  const fullAlphaY = viewportHeight * config.fullAlphaEdgeViewportFraction;
  const zeroAlphaY = viewportHeight * config.zeroAlphaEdgeViewportFraction;
  if (edgeScreenY <= fullAlphaY) return 1;
  if (edgeScreenY >= zeroAlphaY || zeroAlphaY <= fullAlphaY) return 0;
  const progress = (edgeScreenY - fullAlphaY) / (zeroAlphaY - fullAlphaY);
  return 1 - smoothstep01(progress);
}

export class WorldVisualSurfacePackView {
  constructor(scene, pack) {
    this.scene = scene;
    this.pack = pack;
    this.beauty = null;
    this.beautyLightning = null;
    this.ground = null;
    this.groundWet = null;
    this.groundLightning = null;
    this.terrainMask = null;
    this.beautyPasses = [];
    this.beautyLightningPasses = [];
    this.beautyFeatherObject = null;
    this.beautyFeatherMask = null;
    this.groundPasses = [];
    this.groundWetPasses = [];
    this.groundLightningPasses = [];
    this.beautyTopWorldY = null;
  }

  create() {
    const cfg = this.pack.beauty;
    const source = sourceSize(this.scene, cfg.asset.key);
    if (source.width !== cfg.expectedSource.width || source.height !== cfg.expectedSource.height) {
      throw new Error(
        `[WorldVisualSurfacePackView] ${this.pack.id} source changed: `
        + `${source.width}x${source.height}; expected ${cfg.expectedSource.width}x${cfg.expectedSource.height}`
      );
    }
    const tileSize = this.scene.config.tileSize;
    const width = this.pack.worldAnchor.widthTiles * tileSize;
    const sourcePixelsPerWorldPixel = source.width / width;
    if (sourcePixelsPerWorldPixel < cfg.minSourcePixelsPerWorldPixel) {
      throw new Error(
        `[WorldVisualSurfacePackView] ${this.pack.id} would upscale below its density contract`
      );
    }
    const height = cfg.sourceGroundY * width / source.width;
    const x = this.pack.worldAnchor.leftTile * tileSize;
    const y = this.scene.config.topAirRows * tileSize;
    const fadeTiles = this.pack.transition.fadeTiles;
    const strips = this.pack.transition.strips;
    const coreTiles = this.pack.worldAnchor.widthTiles - fadeTiles;
    const coreWorldWidth = coreTiles * tileSize;
    const fadeWorldWidth = fadeTiles * tileSize;
    const coreSourceWidth = Math.floor(source.width * coreTiles / this.pack.worldAnchor.widthTiles);
    const sourceSlices = splitRange(coreSourceWidth, source.width - coreSourceWidth, strips);
    const worldSlices = splitRange(0, fadeWorldWidth, strips);
    const frameSpecs = [
      {
        name: `${cfg.frameName}-core`,
        sourceX: 0,
        sourceWidth: coreSourceWidth,
        worldX: x,
        worldWidth: coreWorldWidth,
        alpha: 1,
      },
      ...sourceSlices.map((slice, index) => ({
        name: `${cfg.frameName}-fade-${index}`,
        sourceX: slice.left,
        sourceWidth: slice.width,
        worldX: x + coreWorldWidth + worldSlices[index].left,
        worldWidth: worldSlices[index].width,
        alpha: edgeAlpha(index, strips),
      })),
    ];
    frameSpecs.forEach(spec => {
      installFrame(source.texture, spec.name, spec.sourceX, 0, spec.sourceWidth, cfg.sourceGroundY);
    });
    const makeBeautyLane = (depth, blendMode = null) => frameSpecs.map(spec => {
      const image = this.scene.add.image(spec.worldX, y, cfg.asset.key, spec.name)
        .setOrigin(0, 1)
        .setDepth(depth)
        .setDisplaySize(spec.worldWidth, height)
        .setAlpha(spec.alpha);
      if (blendMode !== null) image.setBlendMode(blendMode);
      image._surfacePackBaseAlpha = spec.alpha;
      return image;
    });
    this.beautyPasses = makeBeautyLane(cfg.depth);
    this.beautyTopWorldY = y - height;
    const featherWorldHeight = cfg.verticalReveal.topFeatherTiles * tileSize;
    const featherTextureKey = `world-visual-surface-pack-${this.pack.id}-vertical-feather`;
    ensureVerticalFeatherTexture(
      this.scene,
      featherTextureKey,
      Math.min(1, featherWorldHeight / height),
    );
    this.beautyFeatherObject = this.scene.make.image({
      x,
      y,
      key: featherTextureKey,
      add: false,
    }).setOrigin(0, 1).setDisplaySize(width, height);
    this.beautyFeatherMask = this.beautyFeatherObject.createBitmapMask();
    this.beautyPasses.forEach(image => image.setMask(this.beautyFeatherMask));
    this.beauty = this.beautyPasses[0];
    this.beauty.name = `world-visual-surface-pack-${this.pack.id}-beauty`;
    this.beautyLightningPasses = makeBeautyLane(cfg.depth + 0.01, Phaser.BlendModes.SCREEN);
    this.beautyLightningPasses.forEach(image => image.setMask(this.beautyFeatherMask));
    this.beautyLightningPasses.forEach(image => image.setAlpha(0));
    this.beautyLightning = this.beautyLightningPasses[0];
    this.beautyLightning.name = `world-visual-surface-pack-${this.pack.id}-lightning`;
    console.info(
      `[WorldVisualSurfacePackView] ${this.pack.id} active at `
      + `${sourcePixelsPerWorldPixel.toFixed(3)} source px/world px; use ?surfacePack=current-v2 to roll back`
    );
    return true;
  }

  bindTerrainMask(terrainMask) {
    if (!terrainMask || this.ground) return false;
    this.terrainMask = terrainMask;
    const cfg = this.pack.ground;
    const source = sourceSize(this.scene, cfg.asset.key);
    const width = cfg.columns * cfg.sourceCellPx;
    const height = cfg.rows * cfg.sourceCellPx;
    if (source.width < width || source.height < height) {
      throw new Error(`[WorldVisualSurfacePackView] ${this.pack.id} ground source is undersized`);
    }
    const tileSize = this.scene.config.tileSize;
    const x = this.pack.worldAnchor.leftTile * tileSize;
    const y = this.scene.config.topAirRows * tileSize;
    const displayWidth = cfg.columns * tileSize;
    const displayHeight = cfg.rows * tileSize;
    const fadeTiles = this.pack.transition.fadeTiles;
    const strips = this.pack.transition.strips;
    const coreColumns = cfg.columns - fadeTiles;
    const coreSourceWidth = coreColumns * cfg.sourceCellPx;
    const sourceSlices = splitRange(coreSourceWidth, width - coreSourceWidth, strips);
    const worldSlices = splitRange(0, fadeTiles * tileSize, strips);
    const frameSpecs = [
      {
        name: `${cfg.frameName}-core`,
        sourceX: 0,
        sourceWidth: coreSourceWidth,
        worldX: x,
        worldWidth: coreColumns * tileSize,
        alpha: 1,
      },
      ...sourceSlices.map((slice, index) => ({
        name: `${cfg.frameName}-fade-${index}`,
        sourceX: slice.left,
        sourceWidth: slice.width,
        worldX: x + coreColumns * tileSize + worldSlices[index].left,
        worldWidth: worldSlices[index].width,
        alpha: edgeAlpha(index, strips),
      })),
    ];
    frameSpecs.forEach(spec => {
      installFrame(source.texture, spec.name, spec.sourceX, 0, spec.sourceWidth, height);
    });
    const makeGroundLane = (depth, blendMode = null) => frameSpecs.map(spec => {
      const image = this.scene.add.image(spec.worldX, y, cfg.asset.key, spec.name)
        .setOrigin(0)
        .setDepth(depth)
        .setDisplaySize(spec.worldWidth, displayHeight)
        .setMask(terrainMask)
        .setAlpha(spec.alpha);
      if (blendMode !== null) image.setBlendMode(blendMode);
      image._surfacePackBaseAlpha = spec.alpha;
      return image;
    });
    this.groundPasses = makeGroundLane(cfg.depth);
    this.ground = this.groundPasses[0];
    this.ground.name = `world-visual-surface-pack-${this.pack.id}-ground`;
    this.groundWetPasses = makeGroundLane(cfg.depth + 0.01, Phaser.BlendModes.SCREEN);
    this.groundWetPasses.forEach(image => image.setAlpha(0));
    this.groundWet = this.groundWetPasses[0];
    this.groundLightningPasses = makeGroundLane(cfg.depth + 0.02, Phaser.BlendModes.SCREEN);
    this.groundLightningPasses.forEach(image => image.setAlpha(0));
    this.groundLightning = this.groundLightningPasses[0];
    return true;
  }

  update(lighting) {
    if (!lighting) return;
    const effects = this.pack.effects;
    const camera = this.scene.cameras?.main;
    const cameraZoom = Number.isFinite(camera?.zoom) ? camera.zoom : 1;
    const edgeScreenY = camera && Number.isFinite(this.beautyTopWorldY)
      ? (this.beautyTopWorldY - camera.scrollY) * cameraZoom
      : Number.NaN;
    const beautyVisibility = resolveSurfacePackBeautyVisibility(
      edgeScreenY,
      camera?.height,
      this.pack.beauty.verticalReveal,
    );
    // The benchmark is an authored moonlit grade. Multiplicative tinting cannot
    // turn it into a quality daylight plate, and would only discard source
    // range. Global day/night and weather systems own the scene grade; this
    // pack owns aligned wetness and lightning response only.
    this.beautyPasses.forEach(image => {
      image.clearTint().setAlpha(image._surfacePackBaseAlpha * beautyVisibility);
    });
    this.beautyLightningPasses.forEach(image => {
      image.setAlpha(
        image._surfacePackBaseAlpha
        * beautyVisibility
        * lighting.lightning
        * effects.lightningBeautyAlpha
      );
    });
    this.groundPasses.forEach(image => image.clearTint());
    this.groundWetPasses.forEach(image => {
      image.setTint(effects.wetGroundTint)
        .setAlpha(image._surfacePackBaseAlpha * lighting.wet * effects.wetGroundAlpha);
    });
    this.groundLightningPasses.forEach(image => {
      image.clearTint()
        .setAlpha(image._surfacePackBaseAlpha * lighting.lightning * effects.lightningGroundAlpha);
    });
  }

  destroy() {
    const groundImages = [
      ...this.groundPasses,
      ...this.groundWetPasses,
      ...this.groundLightningPasses,
    ];
    groundImages.forEach(image => image.clearMask?.(false));
    [...this.beautyPasses, ...this.beautyLightningPasses]
      .forEach(image => image.clearMask?.(false));
    [
      ...this.beautyPasses,
      ...this.beautyLightningPasses,
      ...groundImages,
    ].forEach(image => image.destroy());
    this.beautyFeatherMask?.destroy?.();
    this.beautyFeatherObject?.destroy?.();
    this.beauty = null;
    this.beautyLightning = null;
    this.ground = null;
    this.groundWet = null;
    this.groundLightning = null;
    this.terrainMask = null;
    this.beautyPasses = [];
    this.beautyLightningPasses = [];
    this.beautyFeatherObject = null;
    this.beautyFeatherMask = null;
    this.groundPasses = [];
    this.groundWetPasses = [];
    this.groundLightningPasses = [];
    this.beautyTopWorldY = null;
  }
}
