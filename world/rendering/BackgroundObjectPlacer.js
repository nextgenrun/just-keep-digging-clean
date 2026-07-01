/**
 * Consumes the authored background object data from TILED_BACKGROUND_OBJECTS.
 * Places background sprite objects at their authored positions with correct depth ordering.
 */
export class BackgroundObjectPlacer {
  constructor(scene, ASSET_KEYS) {
    this.scene = scene;
    this.ASSET_KEYS = ASSET_KEYS;
    this.placedObjects = [];
  }

  /**
   * Place all authored background objects from the TMX.
   * Must be called AFTER textures are available.
   */
  placeObjects(tiledBgData, opts = {}) {
    if (!tiledBgData?.enabled || !tiledBgData?.layers) {
      console.warn('[BackgroundObjectPlacer] No authored background data to place');
      return;
    }

    const tilePx = tiledBgData.tilePx || 94;
    const layers = tiledBgData.layers;
    const layerOrder = tiledBgData.layerOrder || Object.keys(layers);
    const layerMeta = tiledBgData.layerMeta || {};
    const worldBounds = this.getWorldBounds(tiledBgData, tilePx);

    const baseDepth = -12.0;
    const depthStep = 0.05;

    let placedCount = 0;
    let skippedOffWorld = 0;
    let hiddenLayerCount = 0;
    let visibleLayerCount = 0;
    let diagonalFlipCount = 0;
    const missingTextures = new Set();
    const layerSummaries = [];
    this._textureFilenameIndex = null;

    layerOrder.forEach((layerKey, layerIndex) => {
      const objects = layers[layerKey];
      const meta = layerMeta[layerKey] || {};
      const layerName = meta.name || layerKey;
      if (meta.visible === false) {
        hiddenLayerCount++;
        layerSummaries.push({ layer: layerName, visible: false, placed: 0, total: Array.isArray(objects) ? objects.length : 0 });
        return;
      }
      if (!Array.isArray(objects)) return;

      visibleLayerCount++;
      const layerDepth = baseDepth + (layerIndex * depthStep);
      const layerAlpha = this.clampAlpha(meta.opacity);
      const offsetX = Number(meta.offsetX) || 0;
      const offsetY = Number(meta.offsetY) || 0;
      const scrollFactor = 1.0;
      let layerPlacedCount = 0;

      for (const obj of objects) {
        const rawGid = Number(obj.gidRaw ?? obj.gid) || 0;
        if (!rawGid || rawGid === 0) continue;

        const rect = this.getObjectRect(obj, tilePx, offsetX, offsetY);
        if (!this.rectOverlapsWorld(rect, worldBounds)) {
          skippedOffWorld++;
          continue;
        }

        const objectAlpha = this.clampAlpha(obj.opacity);
        const spriteAlpha = layerAlpha * objectAlpha;
        const textureKey = this.findTextureForObject(obj);
        if (!textureKey) {
          const missingName = obj.sourcePath || obj.properties?.sourcePath || obj.name || `gid:${rawGid}`;
          missingTextures.add(missingName);
          if (opts.debug) {
            const placeholder = this.scene.add.rectangle(rect.cx, rect.cy, rect.w, rect.h, 0xff00ff, 0.3 * spriteAlpha);
            placeholder.setDepth(layerDepth);
            placeholder.setScrollFactor(scrollFactor);
            this.placedObjects.push(placeholder);
            placedCount++;
            layerPlacedCount++;
          }
          continue;
        }

        const img = this.scene.add.image(rect.left, rect.bottom, textureKey);
        img.setOrigin(0, 1);
        img.setDepth(layerDepth);
        img.setScrollFactor(scrollFactor);
        img.setAlpha(spriteAlpha);

        const tex = this.scene.textures.get(textureKey);
        const texFrame = tex?.get();
        if (texFrame) {
          const naturalW = texFrame.width;
          const naturalH = texFrame.height;
          if (naturalW > 0 && naturalH > 0) {
            const cropH = this.getStripCardVisibleHeight(obj, naturalH);
            if (cropH && cropH < naturalH) {
              img.setCrop(0, 0, naturalW, cropH);
            }
            img.setDisplaySize(rect.w, rect.h);
          }
        }

        if (obj.rotation && obj.rotation !== 0) {
          img.setAngle(obj.rotation);
        }

        const flip = obj.flip || {};
        if (flip.horizontal || (rawGid & 0x80000000)) img.setFlipX(true);
        if (flip.vertical || (rawGid & 0x40000000)) img.setFlipY(true);
        if (flip.diagonal || (rawGid & 0x20000000)) diagonalFlipCount++;

        this.placedObjects.push(img);
        placedCount++;
        layerPlacedCount++;
      }
      layerSummaries.push({ layer: layerName, visible: true, placed: layerPlacedCount, total: objects.length });
    });

    const missingCount = missingTextures.size;
    console.log(
      `[BackgroundObjectPlacer] ${tiledBgData.source || 'TMX'} rendered ${visibleLayerCount} visible layers`
      + ` (${hiddenLayerCount} hidden skipped); placed ${placedCount} authored background objects`
      + ` (${skippedOffWorld} off-world skipped, ${missingCount} missing textures)`
    );
    if (opts.debug) {
      console.table(layerSummaries);
    }
    if (diagonalFlipCount > 0) {
      console.warn(`[BackgroundObjectPlacer] ${diagonalFlipCount} diagonal Tiled flips were detected; diagonal flips are not rendered yet.`);
    }
    if (missingCount > 0) {
      console.warn(
        "[BackgroundObjectPlacer] Missing authored background textures:",
        [...missingTextures].slice(0, 20)
      );
    }
  }

  getWorldBounds(tiledBgData, tilePx) {
    const widthTiles = tiledBgData?.crop?.width ?? this.scene.config?.worldWidthTiles ?? 0;
    const heightTiles = tiledBgData?.crop?.height ?? this.scene.config?.worldDepthTiles ?? 0;
    return {
      left: 0,
      top: 0,
      right: Math.max(0, widthTiles * tilePx),
      bottom: Math.max(0, heightTiles * tilePx),
    };
  }

  getObjectRect(obj, tilePx, offsetX = 0, offsetY = 0) {
    const hasPixelPosition = Number.isFinite(Number(obj.x)) && Number.isFinite(Number(obj.y));
    const x = (hasPixelPosition ? Number(obj.x) : (Number(obj.tx) || 0) * tilePx) + offsetX;
    const bottom = (hasPixelPosition ? Number(obj.y) : (Number(obj.ty) || 0) * tilePx) + offsetY;
    const w = Math.max(1, Number(obj.w) || tilePx);
    const h = Math.max(1, Number(obj.h) || tilePx);
    const top = bottom - h;
    return {
      left: x,
      right: x + w,
      top,
      bottom,
      cx: x + w / 2,
      cy: top + h / 2,
      w,
      h,
    };
  }

  clampAlpha(value) {
    const alpha = Number(value);
    if (!Number.isFinite(alpha)) return 1;
    return Math.max(0, Math.min(1, alpha));
  }

  getStripCardVisibleHeight(obj, naturalH) {
    const filename = this.extractFilename(obj.resolvedFilename || obj.name || '');
    if (!/__(l08|l10)__.+_cards\.png$/i.test(filename)) return null;
    return Math.max(1, Math.round(naturalH * 0.7));
  }

  rectOverlapsWorld(rect, worldBounds) {
    return rect.right >= worldBounds.left
      && rect.left <= worldBounds.right
      && rect.bottom >= worldBounds.top
      && rect.top <= worldBounds.bottom;
  }

  /**
   * Try to find a Phaser texture key for a background object.
   * Uses the object's name (which contains the filename) to match against loaded textures.
   */
  findTextureForObject(obj) {
    const name = obj.resolvedFilename || obj.sourcePath || obj.properties?.sourcePath || obj.name || '';

    // Extract just the filename from the name (skip numeric prefix like "013: ")
    const filename = this.extractFilename(name);
    if (!filename) return null;

    // Build a set of known texture key -> filename mappings
    // Check if any loaded texture key matches this filename
    const knownFiles = this.getTextureFilenameIndex();

    // Check for direct match
    const lowerFilename = this.normalizeFilename(filename);
    const authoredTextureKey = this.makeAuthoredBackgroundKey(filename);
    if (this.scene.textures.exists(authoredTextureKey)) {
      return authoredTextureKey;
    }

    if (knownFiles.has(lowerFilename)) {
      return knownFiles.get(lowerFilename);
    }

    const runtimeFilename = this.getRuntimeAuthoredLayerFilename(filename);
    const runtimeTextureKey = this.makeAuthoredBackgroundKey(runtimeFilename);
    if (runtimeTextureKey !== authoredTextureKey && this.scene.textures.exists(runtimeTextureKey)) {
      return runtimeTextureKey;
    }

    const canonicalFilename = this.normalizeFilename(runtimeFilename);
    if (canonicalFilename && canonicalFilename !== lowerFilename && knownFiles.has(canonicalFilename)) {
      return knownFiles.get(canonicalFilename);
    }

    // Check for partial match (just the base name)
    const baseName = filename.replace(/\.\w+$/, '').toLowerCase();
    for (const [file, key] of knownFiles) {
      if (file.includes(baseName) || baseName.includes(file.replace(/\.\w+$/, ''))) {
        return key;
      }
    }

    // Check properties for sourcePath
    if (obj.properties?.sourcePath) {
      const sourceFilename = obj.properties.sourcePath.split('/').pop() || '';
      const sourceAuthoredTextureKey = this.makeAuthoredBackgroundKey(sourceFilename);
      if (this.scene.textures.exists(sourceAuthoredTextureKey)) {
        return sourceAuthoredTextureKey;
      }

      const sourceRuntimeFilename = this.getRuntimeAuthoredLayerFilename(sourceFilename);
      const sourceRuntimeTextureKey = this.makeAuthoredBackgroundKey(sourceRuntimeFilename);
      if (sourceRuntimeTextureKey !== sourceAuthoredTextureKey && this.scene.textures.exists(sourceRuntimeTextureKey)) {
        return sourceRuntimeTextureKey;
      }

      const sourceFile = this.normalizeFilename(sourceFilename);
      if (knownFiles.has(sourceFile)) {
        return knownFiles.get(sourceFile);
      }
      // Partial match
      const sourceBase = sourceFile.replace(/\.\w+$/, '');
      for (const [file, key] of knownFiles) {
        if (file.includes(sourceBase) || sourceBase.includes(file.replace(/\.\w+$/, ''))) {
          return key;
        }
      }
    }

    return null;
  }

  getTextureFilenameIndex() {
    if (this._textureFilenameIndex) return this._textureFilenameIndex;

    const textureManager = this.scene.textures;
    const knownFiles = new Map();
    for (const key of textureManager.getTextureKeys()) {
      const tex = textureManager.get(key);
      const source = tex?.getSourceImage();
      if (!source?.src) continue;
      const srcFile = this.normalizeFilename(source.src.split('/').pop()?.split('?')[0] || '');
      if (srcFile) knownFiles.set(srcFile, key);
    }

    this._textureFilenameIndex = knownFiles;
    return knownFiles;
  }

  normalizeFilename(filename) {
    try {
      return decodeURIComponent(filename).toLowerCase();
    } catch (_) {
      return String(filename).toLowerCase();
    }
  }

  /**
   * Extract filename from Tiled object name.
   * Names can be like "013: sky-v3-planet-1.webp" or "bg_046_mechanical_aqueduct_loop.webp"
   */
  extractFilename(name) {
    if (!name) return '';

    // Remove numeric prefix like "013: ", "123: "
    let cleaned = name.replace(/^\d+:\s*/, '');
    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();
    // Keep only the last segment if there are spaces (some names have extra text)
    return cleaned;
  }

  getRuntimeAuthoredLayerFilename(filename) {
    if (!filename) return '';
    return String(filename).trim();
  }

  makeAuthoredBackgroundKey(filename) {
    const runtimeFilename = this.getRuntimeAuthoredLayerFilename(filename);
    const slug = String(runtimeFilename || filename || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return `authored-bg-${slug || "asset"}`;
  }

  /**
   * Clean up all placed objects
   */
  destroy() {
    for (const obj of this.placedObjects) {
      obj.destroy();
    }
    this.placedObjects = [];
  }
}
