import { FIRST_FIVE_MINUTES_CONFIG } from "../../values/firstFiveMinutes.js";

// Demonstrates the next route independently from live player input.
export class TutorialPortalGhostGuide {
  constructor(scene, config = FIRST_FIVE_MINUTES_CONFIG.portalGhostGuide) {
    this.scene = scene;
    this.config = config;
    this.ghost = null;
    this.travelTween = null;
    this.active = false;
    this.targetTy = null;
    this.reachableTy = null;
    this.blockedByTy = null;
  }

  sync(stage) {
    const shouldBeActive = this.config.activeStages.includes(stage);
    if (!shouldBeActive) {
      this._clear();
      return false;
    }
    if (!this.ghost?.active) this._create(stage);
    this._applyStagePose(stage);
    this._syncReachableTarget();
    this.active = this.ghost?.active === true;
    return this.active;
  }

  update(stage) {
    if (!this.sync(stage)) return;
  }

  getHealthSnapshot() {
    return {
      active: this.active,
      visible: this.ghost?.visible === true,
      textureKey: this.ghost?.texture?.key || null,
      x: this.ghost?.x ?? null,
      y: this.ghost?.y ?? null,
      targetTy: this.targetTy,
      reachableTy: this.reachableTy,
      blockedByTy: this.blockedByTy,
      demonstration: this.demonstration || null,
    };
  }

  _create(stage) {
    const source = this.scene?.playerController?.sprite;
    const tileSize = this.scene?.config?.tileSize;
    const topAirRows = this.scene?.config?.topAirRows;
    const portal = this.scene?.firstSessionPortalSystem?.getPortalTile?.();
    if (!source?.texture?.key || !(tileSize > 0) || !portal
      || !Number.isInteger(topAirRows)) return;

    const x = (portal.tx + 0.5) * tileSize;
    this.ghost = this.scene.add.sprite(
      x,
      this._spriteYForStandingTile(
        topAirRows + this.config.startDepthMeters,
      ),
      source.texture.key,
      source.frame?.name,
    );
    this.ghost
      .setOrigin(source.originX, source.originY)
      .setDepth(this.config.depth)
      .setAlpha(this.config.alpha)
      .setTint(this.config.tint);
    const blendMode = globalThis.Phaser?.BlendModes?.ADD;
    if (blendMode !== undefined) this.ghost.setBlendMode(blendMode);
    this._applyDemonstrationPose(source);
    this._applyStagePose(stage);
  }

  _syncReachableTarget() {
    if (!this.ghost?.active) return false;
    const reachable = this._findReachableTile();
    if (!reachable) return false;
    this.reachableTy = reachable.ty;
    this.blockedByTy = reachable.blockedByTy;
    if (this.targetTy === reachable.ty) return false;

    const tileSize = this.scene?.config?.tileSize;
    const currentTy = Number.isFinite(this.ghost.y) && tileSize > 0
      ? Math.round(this.ghost.y / tileSize) - 1
      : reachable.ty;
    const distanceTiles = Math.max(1, Math.abs(reachable.ty - currentTy));
    this.scene?.tweens?.killTweensOf?.(this.ghost);
    this.travelTween?.remove?.();
    this.targetTy = reachable.ty;
    this.travelTween = this.scene?.tweens?.add?.({
      targets: this.ghost,
      y: this._spriteYForStandingTile(reachable.ty),
      duration: Math.max(
        this.config.minimumMoveMs,
        distanceTiles * this.config.moveMsPerTile,
      ),
      ease: "Sine.easeInOut",
    }) || null;
    return true;
  }

  _findReachableTile() {
    const world = this.scene?.worldModel;
    const topAirRows = this.scene?.config?.topAirRows;
    const portal = this.scene?.firstSessionPortalSystem?.getPortalTile?.();
    if (!world || !portal || !Number.isInteger(topAirRows)) return null;

    const startTy = topAirRows + this.config.startDepthMeters;
    const destinationTy = portal.ty + this.config.destinationDepthOffsetMeters;
    let reachableTy = startTy;
    let blockedByTy = null;
    for (let ty = startTy + 1; ty <= destinationTy; ty += 1) {
      if (world.inBounds?.(portal.tx, ty) === false
        || world.isSolid?.(portal.tx, ty) !== false) {
        blockedByTy = ty;
        break;
      }
      reachableTy = ty;
    }
    return { ty: reachableTy, blockedByTy };
  }

  _spriteYForStandingTile(ty) {
    const tileSize = this.scene?.config?.tileSize;
    return Number.isFinite(tileSize) ? (ty + 1) * tileSize : 0;
  }

  _applyDemonstrationPose(source) {
    if (!source?.texture?.key || !this.ghost?.active) return;
    this.ghost
      .setOrigin(source.originX, source.originY)
      .setFlipX(false)
      .setDisplaySize(
        source.displayWidth * this.config.displayScaleRatio,
        source.displayHeight * this.config.displayScaleRatio,
      );
  }

  _applyStagePose(stage) {
    if (!this.ghost?.active) return;
    const profile = this.scene?.playerAssetProfile;
    const demonstration = stage === "portal" ? "dig-down" : "descend";
    if (this.demonstration === demonstration) return;
    this.demonstration = demonstration;
    const animationKey = demonstration === "dig-down"
      ? profile?.digDownAnim
      : profile?.fallingAnim;
    if (animationKey && this.scene?.anims?.exists?.(animationKey)) {
      this.ghost.play(animationKey, true);
    }
  }

  _clear() {
    this.scene?.tweens?.killTweensOf?.(this.ghost);
    this.travelTween?.remove?.();
    this.travelTween = null;
    this.ghost?.destroy?.();
    this.ghost = null;
    this.active = false;
    this.targetTy = null;
    this.reachableTy = null;
    this.blockedByTy = null;
    this.demonstration = null;
  }

  destroy() {
    this._clear();
    this.scene = null;
    this.config = null;
  }
}
