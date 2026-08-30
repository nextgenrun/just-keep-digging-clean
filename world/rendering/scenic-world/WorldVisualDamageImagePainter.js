import {
  WORLD_VISUAL_DAMAGE,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageFrame,
  resolveWorldVisualDamageMixProfile,
  resolveWorldVisualDamagePresentation,
  resolveWorldVisualDamageResponseFrame,
  resolveWorldVisualDamageResponseTier,
  resolveWorldVisualDamageTransform,
} from "../../../values/worldVisualDamage.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionFamily,
  resolveTileDestructionTint,
} from "../../../values/tileDestructionFx.js";

function resolveBlendMode(name) {
  return globalThis.Phaser?.BlendModes?.[name] ?? name;
}

export class WorldVisualDamageImagePainter {
  constructor(
    scene,
    geometryMask,
    depth,
    config = WORLD_VISUAL_DAMAGE,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.geometryMask = geometryMask;
    this.depth = depth;
    this.config = config;
    this.search = search;
    this.atlas = resolveWorldVisualDamageAtlas(config, search);
    this.mixProfile = resolveWorldVisualDamageMixProfile(config, search);
    this.layered = this.mixProfile;
    this.primaryLayer = this.layered?.fractureShadow || Object.freeze({
      alpha: config.imagegen.alpha,
      blendMode: "NORMAL",
      depthOffset: config.imagegen.depthOffset,
    });
    this.responseAtlas = this.layered?.response?.atlas || null;
    this.responseProfileIndex = this.layered?.response?.mode === "tile"
      ? new Map(TILE_DESTRUCTION_FX_CONFIG.responseProfileTileTypes.map(
        (tileType, index) => [tileType, index],
      ))
      : null;
    this.defaultResponseProfileIndex = this.responseProfileIndex?.get(
      TILE_DESTRUCTION_FX_CONFIG.defaultResponseProfileTileType,
    ) ?? 0;
    this.pool = [];
    this.rimPool = [];
    this.responsePool = [];
    this.activeCount = 0;
  }

  create() {
    this._installFrames(
      this.atlas,
      this.atlas.rasterTiers * this.atlas.variants,
    );
    if (this.responseAtlas) {
      this._installFrames(
        this.responseAtlas,
        this.responseAtlas.frameCount,
      );
    }
    return true;
  }

  clear() {
    this.activeCount = 0;
    this.pool.forEach(image => image.setVisible(false));
    this.rimPool.forEach(image => image.setVisible(false));
    this.responsePool.forEach(image => image.setVisible(false));
  }

  draw(tx, ty, damage, size, variationTx = tx, variationTy = ty, tileType = null) {
    const frameIndex = resolveWorldVisualDamageFrame(
      variationTx,
      variationTy,
      damage,
      this.config,
      this.search,
      this.atlas,
    );
    if (!Number.isInteger(frameIndex)) return false;
    const presentation = resolveWorldVisualDamagePresentation(
      damage,
      this.config,
      this.search,
      this.mixProfile,
    );
    const transform = resolveWorldVisualDamageTransform(
      variationTx,
      variationTy,
      this.config,
      this.search,
      this.atlas,
    );
    const atlas = this.atlas;
    const image = this.pool[this.activeCount]
      || this._createImage(this.pool, atlas, this.primaryLayer);
    this._showImage(
      image, atlas, frameIndex, tx, ty, size, this.primaryLayer,
      presentation, transform,
    );
    if (this.layered) {
      const rim = this.rimPool[this.activeCount]
        || this._createImage(this.rimPool, atlas, this.layered.fractureRim);
      this._showImage(
        rim, atlas, frameIndex, tx, ty, size, this.layered.fractureRim,
        presentation, transform,
      );
      if (
        this.layered.fractureRim.tintFill
        && typeof rim.setTintFill === "function"
      ) {
        rim.setTintFill(this.layered.fractureRim.tint);
      } else {
        rim.setTint?.(this.layered.fractureRim.tint);
      }
      this._showMaterialResponse(
        tx, ty, damage, size, tileType, presentation, transform,
        variationTx, variationTy,
      );
    }
    this.activeCount += 1;
    return true;
  }

  _showImage(image, atlas, frameIndex, tx, ty, size, layer, presentation, transform) {
    image.setPosition((tx + 0.5) * size, (ty + 0.5) * size)
      .setTexture(atlas.key, `${atlas.framePrefix}${frameIndex}`)
      .setDisplaySize(
        size * this.config.imagegen.scale * presentation.scale,
        size * this.config.imagegen.scale * presentation.scale,
      )
      .setAlpha(layer.alpha * presentation.alpha)
      .setVisible(true);
    this._applyTransform(image, transform);
  }

  _showMaterialResponse(
    tx,
    ty,
    damage,
    size,
    tileType,
    presentation,
    transform,
    variationTx,
    variationTy,
  ) {
    const response = this.layered.response;
    const tier = resolveWorldVisualDamageResponseTier(
      damage,
      this.config,
      this.search,
      this.mixProfile,
    );
    const profileIndex = response.mode === "tile"
      ? this.responseProfileIndex.get(Number(tileType))
        ?? this.defaultResponseProfileIndex
      : TILE_DESTRUCTION_FX_CONFIG.families[
        resolveTileDestructionFamily(tileType, TILE_DESTRUCTION_FX_CONFIG)
      ];
    if (!Number.isInteger(tier) || !Number.isInteger(profileIndex)) return false;
    const frameIndex = resolveWorldVisualDamageResponseFrame(
      variationTx,
      variationTy,
      tier,
      profileIndex,
      this.config,
      this.search,
      this.mixProfile,
    );
    if (!Number.isInteger(frameIndex)) return false;
    const profileOverride = response.profileOverrides?.[profileIndex] || null;
    const image = this.responsePool[this.activeCount]
      || this._createImage(this.responsePool, response.atlas, response);
    image.setPosition((tx + 0.5) * size, (ty + 0.5) * size)
      .setTexture(response.atlas.key, `${response.atlas.framePrefix}${frameIndex}`)
      .setDisplaySize(
        size * response.scale * presentation.scale,
        size * response.scale * presentation.scale,
      )
      .setAlpha((profileOverride?.alpha ?? response.alpha) * presentation.alpha)
      .setBlendMode(resolveBlendMode(profileOverride?.blendMode || response.blendMode))
      .setTint?.(
        profileOverride?.tint
          ?? resolveTileDestructionTint(tileType, TILE_DESTRUCTION_FX_CONFIG),
      );
    image.setVisible(true);
    this._applyTransform(image, transform);
    return true;
  }

  _applyTransform(image, transform) {
    image.setAngle?.(transform.angle);
    image.setFlip?.(transform.flipX, transform.flipY);
  }

  _createImage(pool, atlas, layer) {
    const image = this.scene.add.image(0, 0, atlas.key)
      .setDepth(this.depth + layer.depthOffset)
      .setBlendMode(resolveBlendMode(layer.blendMode))
      .setVisible(false);
    if (this.geometryMask) image.setMask(this.geometryMask);
    pool.push(image);
    return image;
  }

  _installFrames(atlas, expectedFrameCount) {
    if (!this.scene.textures.exists(atlas.key)) {
      throw new Error(`[WorldVisualDamageImagePainter] Required atlas was not preloaded: ${atlas.key}`);
    }
    if (atlas.frameCount !== expectedFrameCount) {
      throw new Error("[WorldVisualDamageImagePainter] Atlas frame contract mismatch");
    }
    const texture = this.scene.textures.get(atlas.key);
    for (let index = 0; index < atlas.frameCount; index += 1) {
      const name = `${atlas.framePrefix}${index}`;
      if (texture.has(name)) continue;
      texture.add(
        name,
        0,
        (index % atlas.columns) * atlas.frameSizePx,
        Math.floor(index / atlas.columns) * atlas.frameSizePx,
        atlas.frameSizePx,
        atlas.frameSizePx
      );
    }
  }

  setDepth(depth) {
    this.depth = depth;
    this.pool.forEach(image => image.setDepth(depth + this.primaryLayer.depthOffset));
    if (this.layered) {
      this.rimPool.forEach(image => image.setDepth(depth + this.layered.fractureRim.depthOffset));
      this.responsePool.forEach(image => image.setDepth(depth + this.layered.response.depthOffset));
    }
  }

  destroy() {
    this.pool.forEach(image => image.destroy());
    this.rimPool.forEach(image => image.destroy());
    this.responsePool.forEach(image => image.destroy());
    this.pool = [];
    this.rimPool = [];
    this.responsePool = [];
    this.activeCount = 0;
  }
}
