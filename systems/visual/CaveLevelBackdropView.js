/** Covers an expanded cave with native-density, feathered panorama cards. */
function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function maskWeight(index, size, feather, incoming, outgoing) {
  let weight = 1;
  if (incoming && index < feather) weight *= smoothstep((index + 0.5) / feather);
  if (outgoing && index >= size - feather) weight *= smoothstep((size - index - 0.5) / feather);
  return weight;
}

function resolveAxisLayout(span, cardSize, minimumOverlap) {
  if (span <= cardSize) {
    return Object.freeze({
      count: 1,
      stride: 0,
      overlap: 0,
      positions: Object.freeze([0]),
    });
  }
  const preferredStride = Math.max(1, cardSize - minimumOverlap);
  const count = Math.ceil((span - cardSize) / preferredStride) + 1;
  const stride = (span - cardSize) / (count - 1);
  return Object.freeze({
    count,
    stride,
    overlap: cardSize - stride,
    positions: Object.freeze(
      Array.from({ length: count }, (_value, index) => index * stride),
    ),
  });
}

export function resolveNativeCaveBackdropLayout(
  worldWidth,
  worldHeight,
  sourceWidth,
  sourceHeight,
  config,
) {
  const scale = Math.min(config.maxSourceScale, 1);
  const mainWidth = sourceWidth * scale;
  const mainHeight = sourceHeight * scale;
  const mainTop = worldHeight - mainHeight;
  const horizontal = resolveAxisLayout(
    worldWidth,
    mainWidth,
    config.minimumHorizontalOverlapPx * scale,
  );
  const canopyHeight = config.canopy.sourceHeightPx * scale;
  const canopySpan = Math.max(
    0,
    mainTop + config.canopy.mainOverlapPx * scale,
  );
  const vertical = resolveAxisLayout(
    canopySpan,
    canopyHeight,
    config.canopy.minimumVerticalOverlapPx * scale,
  );
  return Object.freeze({
    scale,
    mainWidth,
    mainHeight,
    mainTop,
    horizontal,
    canopy: Object.freeze({
      height: canopyHeight,
      span: canopySpan,
      vertical,
      mainOverlap: Math.max(0, canopySpan - mainTop),
    }),
  });
}

function ensureMaskTexture(scene, config, edges, width, height) {
  const resolution = config.mask.resolutionScale;
  const textureWidth = Math.max(1, Math.round(width * resolution));
  const textureHeight = Math.max(1, Math.round(height * resolution));
  const featherX = Math.max(
    1,
    Math.min(textureWidth, Math.round(edges.featherX * resolution)),
  );
  const featherY = Math.max(
    1,
    Math.min(textureHeight, Math.round(edges.featherY * resolution)),
  );
  const bits = (
    (edges.left ? config.mask.edgeBits.left : 0)
    | (edges.right ? config.mask.edgeBits.right : 0)
    | (edges.top ? config.mask.edgeBits.top : 0)
    | (edges.bottom ? config.mask.edgeBits.bottom : 0)
  );
  const key = [
    config.mask.textureKeyPrefix,
    bits,
    `${textureWidth}x${textureHeight}`,
    `${featherX}x${featherY}`,
  ].join("-");
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, textureWidth, textureHeight);
  const context = texture?.getContext?.() || texture?.context;
  if (!texture || !context) return null;
  const imageData = context.createImageData(textureWidth, textureHeight);
  const pixels = imageData.data;
  for (let y = 0; y < textureHeight; y += 1) {
    const vertical = maskWeight(
      y,
      textureHeight,
      featherY,
      edges.top,
      edges.bottom,
    );
    for (let x = 0; x < textureWidth; x += 1) {
      const alpha = Math.round(
        255 * vertical * maskWeight(
          x,
          textureWidth,
          featherX,
          edges.left,
          edges.right,
        ),
      );
      const offset = (y * textureWidth + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = alpha;
    }
  }
  context.putImageData(imageData, 0, 0);
  texture.refresh();
  return key;
}

function createMask(scene, config, edges, x, y, width, height) {
  if (!edges.left && !edges.right && !edges.top && !edges.bottom) return null;
  const key = ensureMaskTexture(scene, config, edges, width, height);
  if (!key) return null;
  const image = scene.make.image({ x, y, key, add: false })
    .setOrigin(0)
    .setDisplaySize(width, height);
  return Object.freeze({
    image,
    bitmap: image.createBitmapMask(),
  });
}

function getSource(scene, textureKey) {
  const texture = scene.textures.get(textureKey);
  const image = texture?.getSourceImage?.()
    || texture?.source?.[0]?.image
    || texture?.source?.[0];
  if (!texture || !image?.width || !image?.height) {
    throw new Error(`[CaveLevelBackdropView] Missing source: ${textureKey}`);
  }
  return { texture, width: image.width, height: image.height };
}

export class CaveLevelBackdropView {
  constructor(scene, textureKey, worldWidth, worldHeight, config, depth) {
    this.scene = scene;
    this.textureKey = textureKey;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.config = config;
    this.depth = depth;
    this.images = [];
    this.masks = [];
    this.layout = null;
  }

  create() {
    const source = getSource(this.scene, this.textureKey);
    if (
      source.width !== this.config.expectedSourceWidthPx
      || source.height !== this.config.expectedSourceHeightPx
    ) {
      throw new Error(
        `[CaveLevelBackdropView] ${this.textureKey} source changed: `
        + `${source.width}x${source.height}`,
      );
    }
    this.layout = resolveNativeCaveBackdropLayout(
      this.worldWidth,
      this.worldHeight,
      source.width,
      source.height,
      this.config,
    );
    this._createCanopy(source.texture);
    this._createMainBand();
    return true;
  }

  _createCanopy(texture) {
    const canopy = this.config.canopy;
    if (this.layout.canopy.span <= 0) return;
    if (!texture.has(canopy.frameName)) {
      texture.add(
        canopy.frameName,
        0,
        0,
        canopy.sourceTopPx,
        this.config.expectedSourceWidthPx,
        canopy.sourceHeightPx,
      );
    }
    const horizontal = this.layout.horizontal;
    const vertical = this.layout.canopy.vertical;
    vertical.positions.forEach((y, row) => {
      horizontal.positions.forEach((x, column) => {
        this._addImage(
          x,
          y,
          canopy.frameName,
          this.layout.mainWidth,
          this.layout.canopy.height,
          {
            left: column > 0,
            right: column < horizontal.count - 1,
            top: row > 0,
            bottom: row < vertical.count - 1 || this.layout.canopy.mainOverlap > 0,
            featherX: horizontal.overlap,
            featherY: row === vertical.count - 1
              ? Math.max(vertical.overlap, this.layout.canopy.mainOverlap)
              : vertical.overlap,
          },
          column % 2 === 1,
          row % 2 === 1,
          `canopy-${column}-${row}`,
        );
      });
    });
  }

  _createMainBand() {
    const horizontal = this.layout.horizontal;
    horizontal.positions.forEach((x, column) => {
      this._addImage(
        x,
        this.layout.mainTop,
        undefined,
        this.layout.mainWidth,
        this.layout.mainHeight,
        {
          left: column > 0,
          right: column < horizontal.count - 1,
          top: this.layout.canopy.mainOverlap > 0,
          bottom: false,
          featherX: horizontal.overlap,
          featherY: this.layout.canopy.mainOverlap,
        },
        column % 2 === 1,
        false,
        `main-${column}`,
      );
    });
  }

  _addImage(x, y, frameName, width, height, edges, flipX, flipY, name) {
    const image = this.scene.add.image(x, y, this.textureKey, frameName)
      .setOrigin(0)
      .setDepth(this.depth)
      .setDisplaySize(width, height)
      .setFlipX(flipX)
      .setFlipY(flipY);
    image.name = `cave-level-native-backdrop-${name}`;
    const mask = createMask(
      this.scene,
      this.config,
      edges,
      x,
      y,
      width,
      height,
    );
    if (mask) {
      image.setMask(mask.bitmap);
      this.masks.push(mask);
    }
    this.images.push(image);
  }

  destroy() {
    this.images.forEach(image => {
      image.clearMask?.(false);
      image.destroy?.();
    });
    this.masks.forEach(mask => {
      mask.bitmap?.destroy?.();
      mask.image?.destroy?.();
    });
    this.images = [];
    this.masks = [];
    this.layout = null;
  }
}
