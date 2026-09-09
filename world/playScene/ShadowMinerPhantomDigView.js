function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveShadowMinerDigTargetOffset(pose) {
  if (
    Number.isFinite(pose?.actionTargetOffsetX)
    && Number.isFinite(pose?.actionTargetOffsetY)
    && (pose.actionTargetOffsetX !== 0 || pose.actionTargetOffsetY !== 0)
  ) {
    return Object.freeze({
      x: Math.round(pose.actionTargetOffsetX),
      y: Math.round(pose.actionTargetOffsetY),
      source: "recorded-target",
    });
  }
  if (
    Number.isFinite(pose?.actionDirectionX)
    && Number.isFinite(pose?.actionDirectionY)
    && (pose.actionDirectionX !== 0 || pose.actionDirectionY !== 0)
  ) {
    return Object.freeze({
      x: Math.sign(pose.actionDirectionX),
      y: Math.sign(pose.actionDirectionY),
      source: "recorded-direction",
    });
  }

  const key = String(pose?.animationKey || "").toLowerCase();
  const horizontal = key.includes("left")
    ? -1
    : key.includes("right")
      ? 1
      : pose?.flipX === true ? -1 : 1;
  const sideways = key.includes("side") || key.includes("left") || key.includes("right");
  if (key.includes("down")) {
    return Object.freeze({ x: sideways ? horizontal : 0, y: 1, source: "animation" });
  }
  if (key.includes("up")) {
    return Object.freeze({ x: sideways ? horizontal : 0, y: -1, source: "animation" });
  }
  return Object.freeze({ x: horizontal, y: 0, source: "facing" });
}

export function resolveShadowMinerDigStage(elapsedMs, config) {
  const stages = config?.damageStageCount || 0;
  if (stages <= 0) return -1;
  return Math.min(
    stages - 1,
    Math.max(0, Math.floor(finite(elapsedMs) / config.crackStepMs)),
  );
}

export class ShadowMinerPhantomDigView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config.visual.phantomDig;
    this.reducedMotion = globalThis.matchMedia?.(
      config.visual.reducedMotionMediaQuery,
    )?.matches === true;
    this.block = null;
    this.glow = null;
    this.crack = null;
    this.blockState = null;
    this.actionLatched = false;
    this.breakCount = 0;
    this.lastStartFailure = null;
    this.lastAttemptTileType = null;
    this.lastBlockArtAvailable = null;
    this.lastBlockArtSource = null;
    this.activeFx = new Set();
    this.activeTweens = new Set();
  }

  applyPose(pose, time = this.scene?.time?.now || 0) {
    if (!this.config.enabled || pose?.action !== true) {
      this.actionLatched = false;
      return false;
    }
    if (this.actionLatched) return false;
    this.actionLatched = true;
    return this._startBlock(pose, time);
  }

  update(time) {
    if (!this.block || !this.blockState) return;
    const elapsedMs = Math.max(0, time - this.blockState.startedAtMs);
    const stageIndex = resolveShadowMinerDigStage(elapsedMs, this.config);
    if (stageIndex !== this.blockState.stageIndex) {
      this.blockState.stageIndex = stageIndex;
      this._applyDamageStage(stageIndex);
    }
    if (this.glow && !this.reducedMotion) {
      const phase = (time / this.config.glowPulseCycleMs) * Math.PI * 2;
      const pulse = Math.sin(phase);
      this.glow.setAlpha?.(
        this.config.glowAlpha + pulse * this.config.glowPulseAlpha,
      );
      const scale = this.config.glowScale + pulse * this.config.glowPulseScale;
      this.glow.setDisplaySize?.(
        this.blockState.displaySize * scale,
        this.blockState.displaySize * scale,
      );
    }
    if (elapsedMs >= this.config.breakAtMs) this._breakBlock();
  }

  cancelAction({ breakBlock = false } = {}) {
    this.actionLatched = false;
    if (!this.block) return;
    if (breakBlock) this._breakBlock();
    else this._releaseActiveBlock();
  }

  clear() {
    for (const tween of this.activeTweens) {
      tween.stop?.();
      tween.remove?.();
    }
    this.activeTweens.clear();
    this._releaseActiveBlock();
    for (const object of this.activeFx) object.destroy?.();
    this.activeFx.clear();
    this.actionLatched = false;
  }

  getSnapshot() {
    return Object.freeze({
      activeBlock: Boolean(this.block && this.block.active !== false),
      actionLatched: this.actionLatched,
      target: this.blockState?.target || null,
      targetSource: this.blockState?.targetSource || null,
      stageIndex: this.blockState?.stageIndex ?? null,
      textureKey: this.block?.texture?.key || null,
      crackTextureKey: this.crack?.texture?.key || null,
      renderIndex: this.blockState?.renderIndex ?? null,
      breakCount: this.breakCount,
      lastStartFailure: this.lastStartFailure,
      lastAttemptTileType: this.lastAttemptTileType,
      blockArtAvailable: this.lastBlockArtAvailable,
      blockArtSource: this.lastBlockArtSource,
      activeFxSprites: this.activeFx.size,
      authority: "visual-only",
    });
  }

  destroy() {
    this.clear();
    this.scene = null;
  }

  _startBlock(pose, time) {
    const tileType = this._pickTileType(pose);
    const blockArt = this._resolveBlockArt(tileType);
    const textureAvailable = Boolean(blockArt.texture);
    this.lastAttemptTileType = tileType;
    this.lastBlockArtAvailable = textureAvailable;
    this.lastBlockArtSource = blockArt.source;
    if (!Number.isFinite(tileType) || !textureAvailable) {
      this.lastStartFailure = !Number.isFinite(tileType)
        ? "missing-stage-tile-type"
        : "missing-phantom-block-art";
      return false;
    }
    this.lastStartFailure = null;
    this._releaseActiveBlock();
    const targetOffset = resolveShadowMinerDigTargetOffset(pose);
    const tileSize = this.scene?.config?.tileSize || 1;
    const target = Object.freeze({
      x: pose.x + targetOffset.x * tileSize,
      y: pose.y + (this.config.anchorYOffsetTiles + targetOffset.y) * tileSize,
    });
    const displaySize = tileSize * this.config.displayTiles;
    this.block = this.scene.add.image(target.x, target.y, blockArt.texture)
      .setOrigin(0.5)
      .setDisplaySize(displaySize, displaySize)
      .setDepth(this.config.depth)
      .setAlpha(this.config.alpha)
      .setTint(this.config.tint);
    this.glow = this.scene.add.image(target.x, target.y, blockArt.texture)
      .setOrigin(0.5)
      .setDisplaySize(
        displaySize * this.config.glowScale,
        displaySize * this.config.glowScale,
      )
      .setDepth(this.config.glowDepth)
      .setAlpha(this.config.glowAlpha)
      .setTintFill(this.config.glowTint)
      .setBlendMode("ADD");
    this.crack = this.scene.add.image(target.x, target.y, blockArt.crackTexture)
      .setOrigin(0.5)
      .setDisplaySize(displaySize, displaySize)
      .setDepth(this.config.crackDepth)
      .setAlpha(this.config.crackAlpha)
      .setTintFill(this.config.crackTint)
      .setBlendMode("ADD");
    this.blockState = {
      startedAtMs: time,
      stageIndex: 0,
      tileType,
      renderIndex: null,
      displaySize,
      target,
      targetSource: targetOffset.source,
    };
    this._applyDamageStage(0);
    return true;
  }

  _resolveBlockArt(tileType) {
    const textureKey = this.config.stageTextureKeysByTileType?.[tileType];
    const crackTexture = this.config.crackTextureKeys?.[0];
    if (
      textureKey
      && crackTexture
      && this.scene?.textures?.exists?.(textureKey) === true
      && this.scene?.textures?.exists?.(crackTexture) === true
    ) {
      return {
        texture: this.scene.textures.get?.(textureKey) || textureKey,
        crackTexture: this.scene.textures.get?.(crackTexture) || crackTexture,
        source: "dedicated-project-art",
      };
    }
    return { texture: null, crackTexture: null, source: null };
  }

  _pickTileType(pose) {
    const tileTypes = this.config.stageTileTypes || [];
    if (tileTypes.length === 0) return null;
    const tx = Math.round(finite(pose?.tileX, finite(pose?.x)));
    const ty = Math.round(finite(pose?.tileY, finite(pose?.y)));
    const index = Math.abs(Math.imul(tx, 31) + Math.imul(ty, 17)) % tileTypes.length;
    return tileTypes[index];
  }

  _applyDamageStage(stageIndex) {
    if (!this.blockState) return false;
    const crackTexture = this.config.crackTextureKeys?.[stageIndex];
    if (!crackTexture || this.scene?.textures?.exists?.(crackTexture) !== true) {
      return false;
    }
    this.blockState.renderIndex = stageIndex;
    this.crack?.setTexture?.(crackTexture);
    this.block?.setDisplaySize?.(
      this.blockState.displaySize,
      this.blockState.displaySize,
    );
    this.glow?.setDisplaySize?.(
      this.blockState.displaySize * this.config.glowScale,
      this.blockState.displaySize * this.config.glowScale,
    );
    this.crack?.setDisplaySize?.(
      this.blockState.displaySize,
      this.blockState.displaySize,
    );
    return true;
  }

  _breakBlock() {
    if (!this.block || !this.blockState) return;
    const block = this.block;
    const glow = this.glow;
    const crack = this.crack;
    const { target, displaySize } = this.blockState;
    this.block = null;
    this.glow = null;
    this.crack = null;
    this.blockState = null;
    this.breakCount += 1;
    this._spawnBreakFx(target, displaySize);
    this.activeFx.add(block);
    if (glow) this.activeFx.add(glow);
    if (crack) this.activeFx.add(crack);
    this._fadeAndRelease(block, this.config.breakScale, this.config.breakFadeMs);
    this._fadeAndRelease(glow, this.config.breakScale, this.config.breakFadeMs);
    this._fadeAndRelease(crack, this.config.breakScale, this.config.breakFadeMs);
  }

  _spawnBreakFx(target, displaySize) {
    if (!target) return;
    this._spawnCore(target, displaySize);
    for (let index = 0; index < this.config.breakShardFrames.length; index += 1) {
      if (this.activeFx.size >= this.config.maximumFxSprites) break;
      this._spawnShard(target, index);
    }
  }

  _spawnCore(target, displaySize) {
    const key = this.config.breakCoreTextureKey;
    if (!this.scene?.textures?.exists?.(key)) return;
    const core = this.scene.add.image(
      target.x,
      target.y,
      key,
      this.config.breakCoreFrame,
    ).setOrigin(0.5)
      .setDisplaySize(
        displaySize * this.config.breakCoreDisplayTiles,
        displaySize * this.config.breakCoreDisplayTiles,
      )
      .setDepth(this.config.depth + 0.02)
      .setAlpha(this.config.breakCoreAlpha)
      .setTintFill(this.config.glowTint)
      .setBlendMode("ADD");
    this.activeFx.add(core);
    this._fadeAndRelease(core, 1, this.config.breakFadeMs);
  }

  _spawnShard(target, index) {
    const key = this.config.breakShardTextureKey;
    if (!this.scene?.textures?.exists?.(key)) return;
    const tileSize = this.scene?.config?.tileSize || 1;
    const frame = this.config.breakShardFrames[index];
    const shard = this.scene.add.image(target.x, target.y, key, frame)
      .setOrigin(0.5)
      .setDisplaySize(
        tileSize * this.config.breakShardDisplayTiles,
        tileSize * this.config.breakShardDisplayTiles,
      )
      .setDepth(this.config.depth + 0.03 + index * 0.01)
      .setAlpha(this.config.alpha)
      .setTintFill(this.config.tint);
    this.activeFx.add(shard);
    const direction = index - (this.config.breakShardFrames.length - 1) / 2;
    this._tween({
      targets: shard,
      x: target.x + direction * tileSize * this.config.breakShardTravelTiles,
      y: target.y - tileSize * this.config.breakShardLiftTiles
        + Math.abs(direction) * tileSize * this.config.breakShardLiftTiles,
      alpha: 0,
      rotation: direction * 0.55,
      duration: this.reducedMotion
        ? this.config.breakFadeMs
        : this.config.breakShardFadeMs,
      ease: "Quad.Out",
      onComplete: () => this._releaseFx(shard),
    });
  }

  _fadeAndRelease(object, scale, duration) {
    if (!object) return;
    this._tween({
      targets: object,
      alpha: 0,
      scaleX: finite(object.scaleX, 1) * scale,
      scaleY: finite(object.scaleY, 1) * scale,
      duration,
      ease: "Sine.Out",
      onComplete: () => this._releaseFx(object),
    });
  }

  _releaseActiveBlock() {
    this.block?.destroy?.();
    this.glow?.destroy?.();
    this.crack?.destroy?.();
    this.block = null;
    this.glow = null;
    this.crack = null;
    this.blockState = null;
  }

  _releaseFx(object) {
    this.activeFx.delete(object);
    object?.destroy?.();
  }

  _tween(config) {
    if (!this.scene?.tweens?.add || config.duration <= 0) {
      config.onComplete?.();
      return null;
    }
    let tween = null;
    const onComplete = config.onComplete;
    tween = this.scene.tweens.add({
      ...config,
      onComplete: (...args) => {
        this.activeTweens.delete(tween);
        onComplete?.(...args);
      },
    });
    this.activeTweens.add(tween);
    return tween;
  }
}
