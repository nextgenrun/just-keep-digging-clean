import { FIRST_FIVE_MINUTES_CONFIG } from "../../values/firstFiveMinutes.js";

// Demonstrates the next route independently from live player input.
export class TutorialPortalGhostGuide {
  constructor(scene, config = FIRST_FIVE_MINUTES_CONFIG.portalGhostGuide) {
    this.scene = scene;
    this.config = config;
    this.ghost = null;
    this.travelTween = null;
    this.restartTimer = null;
    this.active = false;
    this.stage = null;
    this.routePhase = null;
    this.routeX = null;
    this.approachX = null;
    this.startY = null;
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
    this.stage = stage;
    this._syncReachableTarget();
    this._ensureRouteMotion();
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

    this.routeX = (portal.tx + 0.5) * tileSize;
    this.approachX = this.routeX
      + this.config.approachOffsetTiles * tileSize;
    this.startY = this._spriteYForStandingTile(
      topAirRows + this.config.startDepthMeters,
    );
    this.ghost = this.scene.add.sprite(
      this.approachX,
      this.startY,
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
    this.routePhase = "approach";
    this.stage = stage;
  }

  _syncReachableTarget() {
    if (!this.ghost?.active) return false;
    const reachable = this._findReachableTile();
    if (!reachable) return false;
    this.reachableTy = reachable.ty;
    this.blockedByTy = reachable.blockedByTy;
    if (this.targetTy === reachable.ty) return false;
    this.targetTy = reachable.ty;
    return true;
  }

  _ensureRouteMotion() {
    if (!this.ghost?.active || this.travelTween || this.restartTimer) return;
    if (this.routePhase === "approach") {
      this._applyStagePose("approach");
      this.travelTween = this._addTween({
        x: this.routeX,
        y: this.startY,
        duration: this.config.approachMoveMs,
        onComplete: () => this._advanceRoute("descend"),
      });
      return;
    }
    if (this.routePhase === "descend") {
      const destinationY = this._spriteYForStandingTile(this.targetTy);
      const tileSize = this.scene?.config?.tileSize;
      const distanceTiles = tileSize > 0
        ? Math.abs(destinationY - this.ghost.y) / tileSize
        : 1;
      if (distanceTiles < 0.05) {
        this._advanceRoute("demonstrate");
        return;
      }
      this._applyStagePose("descend");
      this.travelTween = this._addTween({
        y: destinationY,
        duration: Math.max(
          this.config.minimumMoveMs,
          distanceTiles * this.config.moveMsPerTile,
        ),
        onComplete: () => this._advanceRoute("demonstrate"),
      });
      return;
    }
    this._applyStagePose(
      this.stage === "portal" && this.blockedByTy !== null
        ? "dig-down"
        : "descend",
    );
    this.restartTimer = this.scene?.time?.delayedCall?.(
      this.config.demonstrationHoldMs,
      () => {
        this.restartTimer = null;
        if (!this.ghost?.active) return;
        this.ghost.setPosition(this.approachX, this.startY);
        this.routePhase = "approach";
        this._ensureRouteMotion();
      },
    ) || null;
  }

  _addTween(config) {
    return this.scene?.tweens?.add?.({
      targets: this.ghost,
      ease: "Sine.easeInOut",
      ...config,
    }) || null;
  }

  _advanceRoute(nextPhase) {
    this.travelTween = null;
    this.routePhase = nextPhase;
    this._ensureRouteMotion();
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

  _applyStagePose(demonstration) {
    if (!this.ghost?.active) return;
    const profile = this.scene?.playerAssetProfile;
    if (this.demonstration === demonstration) return;
    this.demonstration = demonstration;
    const animationKey = demonstration === "approach"
      ? profile?.flightTravelLoopAnim || profile?.flyAnim || profile?.walkAnim
      : demonstration === "dig-down"
        ? profile?.digDownAnim
        : profile?.fallingAnim;
    if (animationKey && this.scene?.anims?.exists?.(animationKey)) {
      this.ghost.play(animationKey, true);
    }
  }

  _clear() {
    this.scene?.tweens?.killTweensOf?.(this.ghost);
    this.travelTween?.remove?.();
    this.restartTimer?.remove?.();
    this.travelTween = null;
    this.restartTimer = null;
    this.ghost?.destroy?.();
    this.ghost = null;
    this.active = false;
    this.stage = null;
    this.routePhase = null;
    this.routeX = null;
    this.approachX = null;
    this.startY = null;
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
