import { PLAYER_SKELETAL_RUN as CONFIG, isSkeletalRunEnabled } from "../values/playerSkeletalRun.js";

/** Draws Standard Walk for walking and the retained jog for Ctrl running. */
export class PlayerSkeletalRunPresentation {
  constructor(scene, player, controller, profile) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.profile = profile;
    this.active = false;
    this.ready = false;
    this.destroyed = false;
    this._postUpdate = (_time, delta) => this.update(delta);
    this._originalWebGL = player.renderWebGL;
    this._originalCanvas = player.renderCanvas;
    this.readyPromise = isSkeletalRunEnabled(profile)
      ? this._load().catch(error => {
        if (!this.destroyed) console.warn("[SkeletalRun] Could not load live run:", error);
        this.error = String(error);
        this.destroy();
        return false;
      })
      : Promise.resolve(false);
  }

  async _load() {
    const { SkeletalRunMeshRenderer } = await import("./SkeletalRunMeshRenderer.js");
    if (this.destroyed) return false;
    this.mesh = new SkeletalRunMeshRenderer();
    if (!await this.mesh.load() || this.destroyed) return false;
    this.textureKey = `${CONFIG.texturePrefix}-${this.scene.sys.settings.key}`;
    this.texture = this.scene.textures.createCanvas(this.textureKey, CONFIG.resolution, CONFIG.resolution);
    this.image = this.scene.make.image({ key: this.textureKey, add: false });
    this.image.setOrigin(0.5, 0.5 + CONFIG.cameraTargetHeight / CONFIG.cameraExtent);
    const owner = this;
    this._webGL = function(renderer, source, camera, parentMatrix) {
      if (owner.active && owner.image) return owner.image.renderWebGL(renderer, owner.image, camera, parentMatrix);
      return owner._originalWebGL.call(this, renderer, source, camera, parentMatrix);
    };
    this._canvas = function(renderer, source, camera, parentMatrix) {
      if (owner.active && owner.image) return owner.image.renderCanvas(renderer, owner.image, camera, parentMatrix);
      return owner._originalCanvas.call(this, renderer, source, camera, parentMatrix);
    };
    this.player.renderWebGL = this._webGL;
    this.player.renderCanvas = this._canvas;
    this.scene.events.on(CONFIG.postUpdateEvent, this._postUpdate);
    this.ready = true;
    return true;
  }

  isLocomotionPose() {
    const key = this.player.anims?.currentAnim?.key;
    return [this.profile.walkLoopAnim, this.profile.walkRunAnim].some(baseKey => {
      if (!baseKey) return false;
      const torchKey = this.profile.heldTorchAnimationByBaseAnimation?.[baseKey];
      return key === baseKey || Boolean(torchKey && key === torchKey);
    });
  }

  isAnimatingLocomotion() {
    const body = this.controller.physicsBody;
    const speed = Math.abs(body?.vx || 0);
    return this.ready && !this.destroyed
      && this.controller.isGrounded()
      && this.isLocomotionPose() && speed > CONFIG.minimumSpeed
      && this.player.visible && this.player.active
      && (!this.scene.gameState || this.scene.gameState === "playing");
  }

  isAnimatingRun() {
    return this.controller.isRunning() && this.isAnimatingLocomotion();
  }

  update(deltaMs) {
    this.active = this.isAnimatingLocomotion();
    if (!this.active) return;
    const speed = Math.abs(this.controller.physicsBody.vx);
    const tileSize = this.controller.config.tileSize;
    const canvas = this.mesh.render(deltaMs, speed, tileSize, !this.controller.isRunning());
    this.texture.context.clearRect(0, 0, CONFIG.resolution, CONFIG.resolution);
    this.texture.context.drawImage(canvas, 0, 0);
    this.texture.refresh();
    if (this.mesh.footstep) {
      const sound = this.scene.soundSystem || this.scene.originScene?.soundSystem;
      sound?.playFootstep?.({ controller: this.controller, worldModel: this.scene.worldModel });
    }
    const size = tileSize * CONFIG.visibleHeightTiles * CONFIG.cameraExtent;
    this.image.setPosition(this.player.x, this.player.y);
    this.image.setDisplaySize(size, size);
    this.image.setFlipX(this.player.flipX);
    this.image.setRotation(this.player.rotation);
    this.image.setAlpha(this.player.alpha);
    this.image.setTint(this.player.tintTopLeft, this.player.tintTopRight,
      this.player.tintBottomLeft, this.player.tintBottomRight);
    this.image.setScrollFactor(this.player.scrollFactorX, this.player.scrollFactorY);
    this.image.setDepth(this.player.depth);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.active = false;
    this.ready = false;
    this.scene?.events?.off(CONFIG.postUpdateEvent, this._postUpdate);
    if (this.player?.renderWebGL === this._webGL) this.player.renderWebGL = this._originalWebGL;
    if (this.player?.renderCanvas === this._canvas) this.player.renderCanvas = this._originalCanvas;
    this.image?.destroy();
    if (this.textureKey) this.scene?.textures?.remove(this.textureKey);
    this.mesh?.dispose();
    this.image = null;
    this.texture = null;
  }
}
