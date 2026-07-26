const clamp01 = value => Math.max(0, Math.min(1, value));

const smoothstep = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function colorToRgba(color, alpha) {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return `rgba(${red},${green},${blue},${clamp01(alpha)})`;
}

function ensureRadialTexture(scene, key, size, stops) {
  if (!scene?.textures || !key || !Number.isFinite(size)) return false;
  if (scene.textures.exists(key)) return true;

  const textureSize = Math.max(1, Math.floor(size));
  const radius = textureSize / 2;
  const texture = scene.textures.createCanvas(key, textureSize, textureSize);
  const context = texture?.getContext?.();
  if (!texture || !context) return false;

  const gradient = context.createRadialGradient(
    radius,
    radius,
    0,
    radius,
    radius,
    radius
  );
  stops.forEach(([position, color, alpha]) => {
    gradient.addColorStop(clamp01(position), colorToRgba(color, alpha));
  });

  context.clearRect(0, 0, textureSize, textureSize);
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureSize, textureSize);
  texture.refresh();
  texture.setFilter?.(Phaser.Textures.FilterMode.LINEAR);
  return true;
}

/**
 * Renders the single active Star Block beacon as a filtered textured wave.
 */
export class SkyBeaconPulseRenderer {
  constructor(scene, visuals) {
    this.scene = scene;
    this.visuals = visuals;
    this._ring = null;
    this._nodes = [];

    if (!visuals?.enabled || !scene?.add?.image) return;

    const ringReady = ensureRadialTexture(
      scene,
      visuals.ringTextureKey,
      visuals.ringTextureSizePx,
      visuals.ringGradientStops
    );
    const nodeReady = ensureRadialTexture(
      scene,
      visuals.nodeTextureKey,
      visuals.nodeTextureSizePx,
      visuals.nodeGradientStops
    );
    if (!ringReady || !nodeReady) return;

    const blendMode = Phaser.BlendModes[visuals.blendMode]
      ?? Phaser.BlendModes.ADD;
    this._ring = this._createImage(
      visuals.ringTextureKey,
      visuals.renderDepth,
      blendMode
    );

    const nodeCount = Math.max(0, Math.floor(visuals.nodeCount || 0));
    for (let index = 0; index < nodeCount; index += 1) {
      this._nodes.push(this._createImage(
        visuals.nodeTextureKey,
        visuals.renderDepth + visuals.nodeDepthOffset,
        blendMode
      ));
    }
  }

  beginFrame() {
    this._hideImage(this._ring);
    this._nodes.forEach(node => this._hideImage(node));
  }

  draw({
    worldX,
    worldY,
    tileSize,
    verticalScale,
    pulseRadiusTiles,
    pulse,
    angleOffset,
  }) {
    const visuals = this.visuals;
    if (!this._ring || !visuals?.enabled || !pulse) return false;

    const easedStrength = smoothstep(pulse.waveStrength || 0);
    const ringAlpha = clamp01(visuals.ringOpacity * easedStrength);
    if (ringAlpha <= visuals.minimumAlpha) return false;

    const radiusX = pulseRadiusTiles * tileSize;
    const radiusY = radiusX * verticalScale;
    const textureScale = visuals.textureScaleCompensation;
    this._ring
      .setPosition(worldX, worldY)
      .setDisplaySize(
        radiusX * 2 * textureScale,
        radiusY * 2 * textureScale
      )
      .setAlpha(ringAlpha)
      .setVisible(true);

    const nodeCount = this._nodes.length;
    for (let index = 0; index < nodeCount; index += 1) {
      const angle = angleOffset + (index / nodeCount) * Math.PI * 2;
      const twinkle = 1 - visuals.nodeTwinkleAmount
        + visuals.nodeTwinkleAmount * (
          0.5 + 0.5 * Math.sin(
            pulse.progress * Math.PI * 2 * visuals.nodeTwinkleCycles
            + index * visuals.nodeTwinklePhaseStepRad
          )
        );
      const nodeAlpha = clamp01(
        visuals.nodeOpacity * easedStrength * twinkle
      );
      const node = this._nodes[index];
      node
        .setPosition(
          worldX + Math.cos(angle) * radiusX,
          worldY + Math.sin(angle) * radiusY
        )
        .setDisplaySize(visuals.nodeSizePx, visuals.nodeSizePx)
        .setAlpha(nodeAlpha)
        .setVisible(nodeAlpha > visuals.minimumAlpha);
    }

    return true;
  }

  destroy() {
    this._ring?.destroy();
    this._nodes.forEach(node => node.destroy());
    this._ring = null;
    this._nodes.length = 0;
    this.scene = null;
    this.visuals = null;
  }

  _createImage(textureKey, depth, blendMode) {
    return this.scene.add.image(0, 0, textureKey)
      .setOrigin(0.5)
      .setDepth(depth)
      .setBlendMode(blendMode)
      .setAlpha(0)
      .setVisible(false);
  }

  _hideImage(image) {
    if (!image) return;
    image.setAlpha(0);
    image.setVisible(false);
  }
}
