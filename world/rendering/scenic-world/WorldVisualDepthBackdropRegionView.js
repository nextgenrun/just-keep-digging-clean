function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function mixColor(from, to, amount) {
  const t = clamp01(amount);
  const channel = shift => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualDepthBackdropRegionView] Missing source: ${key}`);
  }
  return { width: source.width, height: source.height };
}

function resolveSegmentGeometry(segment, tileSize) {
  const widthPx = Math.max(
    1,
    Number(segment.logicalWidthPx) || Number(segment.widthTiles) * tileSize || tileSize
  );
  const heightPx = Math.max(
    1,
    Number(segment.logicalHeightPx) || Number(segment.heightTiles) * tileSize || tileSize
  );
  return {
    widthPx,
    heightPx,
    widthTiles: widthPx / tileSize,
    heightTiles: heightPx / tileSize,
  };
}

export class WorldVisualDepthBackdropRegionView {
  constructor(scene, region, config, backwalls = region.backwalls, motionEnabled = true) {
    this.scene = scene;
    this.region = region;
    this.config = config;
    this.backwalls = backwalls;
    this.motionEnabled = motionEnabled;
    this.segments = new Map();
  }

  sync(bounds, lighting, force = false) {
    if (force) this._destroySegments();
    const range = this._resolveSegmentRange(bounds);
    if (!range) {
      this._destroySegments();
      return false;
    }

    const needed = new Set();
    for (let row = range.firstRow; row <= range.lastRow; row += 1) {
      for (let column = range.firstColumn; column <= range.lastColumn; column += 1) {
        const id = `${column}:${row}`;
        needed.add(id);
        if (!this.segments.has(id)) this.segments.set(id, this._createSegment(column, row));
      }
    }
    this._prune(needed);
    this.update(this.scene.time?.now || 0, lighting);
    return true;
  }

  _resolveSegmentRange(bounds) {
    const { region } = this;
    const { segment } = this.config;
    const geometry = resolveSegmentGeometry(segment, this.scene.config.tileSize);
    if (bounds.right <= region.leftTile || bounds.left >= region.rightTileExclusive
      || bounds.bottom <= region.topTile || bounds.top >= region.bottomTileExclusive) return null;
    const columns = Math.ceil((region.rightTileExclusive - region.leftTile) / geometry.widthTiles);
    const rows = Math.ceil((region.bottomTileExclusive - region.topTile) / geometry.heightTiles);
    const visibleLeft = Math.max(bounds.left, region.leftTile) - region.leftTile;
    const visibleRight = Math.min(bounds.right - 1, region.rightTileExclusive - 1) - region.leftTile;
    const visibleTop = Math.max(bounds.top, region.topTile) - region.topTile;
    const visibleBottom = Math.min(bounds.bottom - 1, region.bottomTileExclusive - 1) - region.topTile;
    return {
      firstColumn: Math.max(0, Math.floor(visibleLeft / geometry.widthTiles) - segment.neighborSegments),
      lastColumn: Math.min(columns - 1, Math.floor(visibleRight / geometry.widthTiles) + segment.neighborSegments),
      firstRow: Math.max(0, Math.floor(visibleTop / geometry.heightTiles) - segment.neighborSegments),
      lastRow: Math.min(rows - 1, Math.floor(visibleBottom / geometry.heightTiles) + segment.neighborSegments),
    };
  }

  _createSegment(column, row) {
    const { region, config } = this;
    const { segment, render, motion } = config;
    const tileSize = this.scene.config.tileSize;
    const geometry = resolveSegmentGeometry(segment, tileSize);
    const startTileX = region.leftTile + column * geometry.widthTiles;
    const startTileY = region.topTile + row * geometry.heightTiles;
    const widthTiles = Math.min(geometry.widthTiles, region.rightTileExclusive - startTileX);
    const heightTiles = Math.min(geometry.heightTiles, region.bottomTileExclusive - startTileY);
    const continuesX = startTileX + widthTiles < region.rightTileExclusive;
    const continuesY = startTileY + heightTiles < region.bottomTileExclusive;
    const contentWidthPx = Math.round(widthTiles * tileSize);
    const contentHeightPx = Math.round(heightTiles * tileSize);
    const fullWidth = contentWidthPx + (continuesX ? segment.overlapPx : 0);
    const fullHeight = contentHeightPx + (continuesY ? segment.overlapPx : 0);
    const baseX = Math.round(startTileX * tileSize);
    const baseY = Math.round(startTileY * tileSize);
    const flipX = (column + row) % 2 === 1;
    const flipY = row % 2 === 1;
    const backwallAsset = this.backwalls[(column + row * 3) % this.backwalls.length];
    const cropRatioX = contentWidthPx / geometry.widthPx;
    const cropRatioY = contentHeightPx / geometry.heightPx;
    const makeCard = (key, depth, name, blendMode = null, fitMode = "fill") => {
      const source = sourceSize(this.scene, key);
      const cropWidth = Math.round(source.width * cropRatioX);
      const cropHeight = Math.round(source.height * cropRatioY);
      const cropX = flipX ? source.width - cropWidth : 0;
      const cropY = flipY ? source.height - cropHeight : 0;
      const widthScale = fullWidth / Math.max(1, cropWidth);
      const displayHeight = fitMode === "fit-width"
        ? Math.min(fullHeight, cropHeight * widthScale)
        : fullHeight;
      const cardY = fitMode === "fit-width"
        ? baseY + Math.max(0, (fullHeight - displayHeight) * 0.5)
        : baseY;
      const card = this.scene.add.image(baseX, cardY, key)
        .setOrigin(0)
        .setDepth(depth)
        .setCrop(cropX, cropY, cropWidth, cropHeight)
        .setDisplaySize(fullWidth, displayHeight)
        .setFlipX(flipX)
        .setFlipY(flipY);
      if (blendMode) card.setBlendMode(blendMode);
      card.name = name;
      return card;
    };

    const backwall = makeCard(
      backwallAsset.key,
      render.backwallDepth,
      `world-visual-depth-${region.id}-${column}-${row}`
    );
    const blendMode = Phaser.BlendModes[region.emissive.blendMode] || Phaser.BlendModes.SCREEN;
    const emissive = makeCard(
      backwallAsset.key,
      render.emissiveDepth,
      `world-visual-depth-emissive-${region.id}-${column}-${row}`,
      blendMode
    );
    const mist = makeCard(
      config.assets.mist.key,
      render.mistDepth,
      `world-visual-depth-mist-${region.id}-${column}-${row}`,
      Phaser.BlendModes.SCREEN,
      "fit-width"
    );
    return {
      backwall, emissive, mist, baseX, baseY, column, row,
      widthPx: fullWidth,
      heightPx: fullHeight,
      emissiveBaseScaleX: emissive.scaleX,
      emissiveBaseScaleY: emissive.scaleY,
      mistBaseX: baseX,
      mistBaseY: baseY + Math.max(0, (fullHeight - mist.displayHeight) * 0.5),
      centerTileY: startTileY + heightTiles / 2,
      phase: (column + row * motion.rowPhaseMultiplier) * motion.phaseStep,
    };
  }

  update(time, lighting) {
    if (!lighting) return;
    const { region, config } = this;
    const { lighting: grade, mist: mistConfig, emissive: glow } = region;
    const { motion } = config;
    const tileSize = this.scene.config.tileSize;
    const depthSpan = region.bottomTileExclusive - region.topTile;
    const animationTime = this.motionEnabled ? (Number(time) || 0) : 0;
    const phase = animationTime / motion.periodMs * Math.PI * 2;
    for (const segment of this.segments.values()) {
      const depthRatio = clamp01((segment.centerTileY - region.topTile) / depthSpan);
      const tintMix = grade.surfaceTintMix + (grade.deepTintMix - grade.surfaceTintMix) * depthRatio;
      const gradedTint = mixColor(lighting.farTint, grade.deepTint, tintMix);
      const lightningMix = lighting.lightning * grade.lightningTintMix;
      segment.backwall.setTint(lightningMix > 0
        ? mixColor(gradedTint, grade.lightningTint, lightningMix)
        : gradedTint);

      const glowPhase = animationTime / glow.periodMs * Math.PI * 2 + segment.phase;
      const glowPulse = this.motionEnabled ? (Math.sin(glowPhase) * 0.5 + 0.5) * glow.pulseAlpha : 0;
      const glowAlpha = glow.baseAlpha + glowPulse
        + lighting.lightning * glow.lightningAlpha;
      const glowMotion = this.motionEnabled ? Math.sin(glowPhase) : 0;
      const glowScale = 1 + glowMotion * motion.emissiveScalePulse;
      const glowShiftX = glowMotion * motion.emissiveShiftPx;
      const glowShiftY = Math.cos(glowPhase * motion.secondaryPeriodScale) * motion.emissiveShiftPx * 0.5;
      segment.emissive
        .setPosition(
          segment.baseX + glowShiftX - segment.widthPx * (glowScale - 1) * 0.5,
          segment.baseY + glowShiftY - segment.heightPx * (glowScale - 1) * 0.5
        )
        .setScale(
          segment.emissiveBaseScaleX * glowScale,
          segment.emissiveBaseScaleY * glowScale
        )
        .setTint(mixColor(glow.tint, grade.lightningTint, lighting.lightning * grade.lightningTintMix))
        .setAlpha(Math.min(glow.maxAlpha, clamp01(glowAlpha)));

      const mistAlpha = mistConfig.baseAlpha + lighting.wet * mistConfig.wetAlpha
        + lighting.fog * mistConfig.fogAlpha + lighting.lightning * mistConfig.lightningAlpha;
      let driftX = this.motionEnabled
        ? Math.sin(phase + segment.phase) * motion.driftTiles * tileSize
        : 0;
      let driftY = this.motionEnabled
        ? Math.cos(phase * motion.secondaryPeriodScale + segment.phase)
          * motion.verticalDriftTiles * tileSize
        : 0;
      if (segment.column === 0) driftX = Math.max(0, driftX);
      if (segment.row === 0) driftY = Math.max(0, driftY);
      segment.mist
        .setPosition(segment.mistBaseX + driftX, segment.mistBaseY + driftY)
        .setTint(mistConfig.tint)
        .setAlpha(Math.min(mistConfig.maxAlpha, clamp01(mistAlpha)));
    }
  }

  _prune(needed) {
    for (const [id, segment] of this.segments) {
      if (needed.has(id)) continue;
      segment.backwall.destroy();
      segment.emissive.destroy();
      segment.mist.destroy();
      this.segments.delete(id);
    }
  }

  _destroySegments() {
    this._prune(new Set());
  }

  destroy() {
    this._destroySegments();
  }
}
