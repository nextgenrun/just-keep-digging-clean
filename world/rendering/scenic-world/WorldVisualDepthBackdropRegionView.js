function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function mixColor(from, to, amount) {
  const t = clamp01(amount);
  const channel = shift => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function sourceSize(scene, asset, videoConfig) {
  if (asset.type === "video") {
    return { width: videoConfig.widthPx, height: videoConfig.heightPx };
  }
  const texture = scene.textures.get(asset.key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualDepthBackdropRegionView] Missing source: ${asset.key}`);
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

  sync(bounds, lighting, force = false, cameraOffset = null) {
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
    this.update(this.scene.time?.now || 0, lighting, cameraOffset);
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
    const { segment, render } = config;
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
    const resolveCardGeometry = asset => {
      const source = sourceSize(this.scene, asset, config.motion.smoothVideo);
      const cropWidth = Math.round(source.width * cropRatioX);
      const cropHeight = Math.round(source.height * cropRatioY);
      const cropX = flipX ? source.width - cropWidth : 0;
      const cropY = flipY ? source.height - cropHeight : 0;
      return { cropX, cropY, cropWidth, cropHeight };
    };
    const applyCardGeometry = (card, cardGeometry) => card
      .setCrop(
        cardGeometry.cropX,
        cardGeometry.cropY,
        cardGeometry.cropWidth,
        cardGeometry.cropHeight
      )
      .setDisplaySize(fullWidth, fullHeight)
      .setFlipX(flipX)
      .setFlipY(flipY);
    const makeImageCard = (asset, depth, name) => {
      const cardGeometry = resolveCardGeometry(asset);
      const card = this.scene.add.image(baseX, baseY, asset.key)
        .setOrigin(0)
        .setDepth(depth);
      applyCardGeometry(card, cardGeometry);
      card.name = name;
      return card;
    };
    const makeVideoCard = (asset, depth, name) => {
      const cardGeometry = resolveCardGeometry(asset);
      const card = this.scene.add.video(baseX, baseY, asset.key)
        .setOrigin(0)
        .setDepth(depth)
        .setVisible(false);
      card.name = name;
      card.once("created", () => {
        applyCardGeometry(card, cardGeometry);
        card.setVisible(true);
        card.setPaused(!this.motionEnabled);
      });
      card.play(config.motion.smoothVideo.loop);
      return card;
    };
    const name = `world-visual-depth-${region.id}-${column}-${row}`;
    const isSmoothVideo = backwallAsset.type === "video";
    const backwall = isSmoothVideo
      ? makeVideoCard(backwallAsset, render.backwallDepth, name)
      : makeImageCard(backwallAsset, render.backwallDepth, name);
    return {
      backwall, baseX, baseY, column, row,
      isSmoothVideo,
      videoPaused: !this.motionEnabled,
      widthPx: fullWidth,
      heightPx: fullHeight,
      centerTileY: startTileY + heightTiles / 2,
    };
  }

  update(time, lighting, cameraOffset = null) {
    if (!lighting) return;
    const { region } = this;
    const { lighting: grade } = region;
    const depthSpan = region.bottomTileExclusive - region.topTile;
    const cameraX = Number(cameraOffset?.x) || 0;
    const cameraY = Number(cameraOffset?.y) || 0;
    const pauseVideo = !this.motionEnabled
      || Number(this.scene.game?.loop?.actualFps) < this.config.motion.smoothVideo.pauseBelowFps;
    for (const segment of this.segments.values()) {
      segment.backwall.setPosition(segment.baseX + cameraX, segment.baseY + cameraY);
      if (segment.isSmoothVideo && segment.videoPaused !== pauseVideo) {
        segment.backwall.setPaused(pauseVideo);
        segment.videoPaused = pauseVideo;
      }
      const depthRatio = clamp01((segment.centerTileY - region.topTile) / depthSpan);
      const tintMix = grade.surfaceTintMix + (grade.deepTintMix - grade.surfaceTintMix) * depthRatio;
      const gradedTint = mixColor(lighting.farTint, grade.deepTint, tintMix);
      const lightningMix = lighting.lightning * grade.lightningTintMix;
      segment.backwall.setTint(lightningMix > 0
        ? mixColor(gradedTint, grade.lightningTint, lightningMix)
        : gradedTint);
    }
  }

  _prune(needed) {
    for (const [id, segment] of this.segments) {
      if (needed.has(id)) continue;
      if (segment.isSmoothVideo) segment.backwall.stop();
      segment.backwall.destroy();
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
