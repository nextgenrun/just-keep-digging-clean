import { TitanSurfaceInspection } from "./TitanSurfaceInspection.js";

function fitScale(image, maximumWidth, maximumHeight) {
  return Math.min(
    maximumWidth / Math.max(1, image.width || image.displayWidth || 1),
    maximumHeight / Math.max(1, image.height || image.displayHeight || 1)
  );
}

export class TitanSurfaceGallery {
  constructor(
    scene,
    worldModel,
    config,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.inspection = new TitanSurfaceInspection(
      scene,
      worldModel,
      config,
      search
    );
    this.views = new Map();
    this.missingAssets = new Set();
  }

  _textureExists(key) {
    return typeof this.scene.textures?.exists !== "function"
      || this.scene.textures.exists(key);
  }

  sync(discoveredIds, instant = false) {
    const discovered = discoveredIds instanceof Set
      ? discoveredIds
      : new Set(discoveredIds || []);
    for (const definition of this.config.definitions) {
      const view = this._ensureSlot(definition);
      if (view) this._setDiscovered(view, discovered.has(definition.id), instant);
    }
  }

  unlock(definition) {
    const view = this._ensureSlot(definition);
    if (view) this._setDiscovered(view, true, false);
  }

  _ensureSlot(definition) {
    const existing = this.views.get(definition.id);
    if (existing) return existing;
    const gallery = this.config.surfaceGallery;
    const plinthAsset = this.config.assets[gallery.footingAssetId];
    const surfaceAsset = definition.surfaceAsset;
    const missingAssetKey = !plinthAsset || !this._textureExists(plinthAsset.key)
      ? plinthAsset?.key || gallery.footingAssetId
      : !surfaceAsset || !this._textureExists(surfaceAsset.key)
        ? surfaceAsset?.key || `${definition.id}:surface-stance`
        : null;
    if (missingAssetKey) {
      this.missingAssets.add(missingAssetKey);
      return null;
    }

    const tileSize = this.worldModel.tileSize;
    const x = (
      gallery.startTileX + (definition.index - 1) * gallery.spacingTiles
    ) * tileSize;
    const surfaceY = (
      this.worldModel.topAirRows + gallery.baselineOffsetTiles
    ) * tileSize;
    const plinth = this.scene.add.image(x, surfaceY, plinthAsset.key);
    const glow = this.scene.add.image(x, surfaceY, plinthAsset.key);
    const sprite = this.scene.add.image(x, surfaceY, surfaceAsset.key);

    plinth
      .setOrigin(0.5, 1)
      .setDepth(gallery.plinthDepth)
      .setDisplaySize(
        gallery.plinthWidthTiles * tileSize,
        gallery.plinthHeightTiles * tileSize
      );
    glow
      .setOrigin(0.5, 1)
      .setDepth(gallery.plinthGlowDepth)
      .setDisplaySize(
        gallery.plinthWidthTiles * tileSize,
        gallery.plinthHeightTiles * tileSize
      )
      .setTint(definition.glowTint)
      .setBlendMode("ADD")
      .setAlpha(0);
    const requestedScaleMultiplier = Number.isFinite(
      definition.surfaceGalleryScale
    )
      ? definition.surfaceGalleryScale
      : gallery.fallbackScaleMultiplier;
    const scaleMultiplier = Math.min(
      gallery.maximumScaleMultiplier,
      Math.max(gallery.minimumScaleMultiplier, requestedScaleMultiplier)
    );
    const baseScale = fitScale(
      sprite,
      gallery.maxWidthTiles * scaleMultiplier * tileSize,
      gallery.maxHeightTiles * tileSize
    );
    const creatureY = surfaceY
      - gallery.plinthHeightTiles * tileSize
      + gallery.stanceBottomPaddingPx * baseScale
      + gallery.creatureContactInsetTiles * tileSize;
    sprite
      .setOrigin(0.5, 1)
      .setDepth(gallery.spriteDepth)
      .setBlendMode(gallery.spriteBlendMode)
      .setScale(baseScale)
      .setY(creatureY)
      .setAlpha(0);

    const view = {
      definition,
      plinth,
      glow,
      sprite,
      baseY: creatureY,
      baseScale,
      scaleMultiplier,
      discovered: false,
      animating: false,
    };
    this.views.set(definition.id, view);
    return view;
  }

  _setDiscovered(view, discovered, instant) {
    if (view.initialized && view.discovered === discovered) return;
    const gallery = this.config.surfaceGallery;
    view.discovered = discovered;
    view.initialized = true;
    this.inspection.syncView(view, discovered);
    this.scene.tweens?.killTweensOf?.(view.sprite);
    view.animating = false;
    view.plinth.setAlpha(
      discovered ? gallery.plinthDiscoveredAlpha : gallery.plinthLockedAlpha
    );
    view.glow.setAlpha(discovered ? gallery.plinthGlowAlpha : 0);
    if (!discovered) {
      view.sprite
        .setAlpha(0)
        .setScale(view.baseScale * gallery.arrivalStartScale)
        .setY(view.baseY);
      return;
    }
    if (instant || typeof this.scene.tweens?.add !== "function") {
      view.sprite
        .setAlpha(gallery.discoveredAlpha)
        .setScale(view.baseScale)
        .setY(view.baseY);
      return;
    }
    view.animating = true;
    view.sprite
      .setAlpha(0)
      .setScale(view.baseScale * gallery.arrivalStartScale)
      .setY(view.baseY);
    this.scene.tweens.add({
      targets: view.sprite,
      alpha: gallery.discoveredAlpha,
      scaleX: view.baseScale,
      scaleY: view.baseScale,
      duration: gallery.arrivalMs,
      ease: "Back.Out",
      onComplete: () => {
        view.animating = false;
      },
    });
  }

  update(time) {
    const gallery = this.config.surfaceGallery;
    for (const view of this.views.values()) {
      if (!view.discovered || view.animating) continue;
      const phase = time / gallery.bobPeriodMs
        + view.definition.index * gallery.phaseStep;
      const wave = (Math.sin(phase) + 1) / 2;
      view.sprite
        .setY(view.baseY - Math.sin(phase) * gallery.bobPixels)
        .setAlpha(Math.min(1, gallery.discoveredAlpha + wave * gallery.pulseAlpha));
      view.glow.setAlpha(gallery.plinthGlowAlpha * (0.65 + wave * 0.35));
    }
  }

  getInspectionDistance(playerTile) {
    return this.inspection.getDistance(playerTile);
  }

  updateInspection(playerTile, keys, options = {}) {
    return this.inspection.update(playerTile, keys, options);
  }

  getSnapshot() {
    const discovered = [...this.views.values()]
      .filter(view => view.discovered)
      .length;
    return {
      slots: this.views.size,
      discovered,
      ...this.inspection.getSnapshot(),
      ready: this.views.size === this.config.definitions.length
        && this.missingAssets.size === 0,
      missingAssets: [...this.missingAssets],
    };
  }

  destroy() {
    this.inspection.destroy();
    for (const view of this.views.values()) {
      [view.plinth, view.glow, view.sprite].forEach(object => {
        this.scene.tweens?.killTweensOf?.(object);
        object?.destroy?.();
      });
    }
    this.views.clear();
    this.missingAssets.clear();
  }
}
