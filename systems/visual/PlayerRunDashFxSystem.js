import { PLAYER_RUN_DASH_FX as CONFIG } from "../../values/playerRunDashFx.js";

/** Animates a bounded trail of custom ImageGen dashes during grounded running. */
export class PlayerRunDashFxSystem {
  constructor(scene, player, controller) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.live = [];
    this.distance = 0;
    this.sequence = 0;
    this.destroyed = false;
    this.enabled = CONFIG.enabled && !["0", "off", "false"].includes(
      new URLSearchParams(globalThis.location?.search || "").get(CONFIG.rollbackQuery),
    );
    this.motionPreference = globalThis.matchMedia?.(CONFIG.reducedMotionQuery);
    this._postUpdate = (_time, delta) => this.update(delta);
    this.readyPromise = this.enabled ? this._load() : Promise.resolve(false);
    this.scene.events.on(CONFIG.postUpdateEvent, this._postUpdate);
  }

  async _load() {
    if (this.scene.textures.exists(CONFIG.textureKey)) return true;
    const image = new Image();
    image.src = CONFIG.texturePath;
    try {
      await image.decode();
      if (this.destroyed) return false;
      if (!this.scene.textures.exists(CONFIG.textureKey)) this.scene.textures.addImage(CONFIG.textureKey, image);
      return true;
    } catch (error) {
      if (!this.destroyed) console.warn("[RunDashes] Could not load authored texture:", error);
      return false;
    }
  }

  isRunning() {
    return this.enabled && !this.destroyed && !this.motionPreference?.matches
      && this.controller.isRunning() && this.controller.isGrounded()
      && Math.abs(this.controller.physicsBody?.vx || 0) >= CONFIG.minimumSpeed
      && this.player.visible && this.player.active
      && (!this.scene.gameState || this.scene.gameState === "playing");
  }

  update(deltaMs) {
    if (this.destroyed) return;
    const dt = Math.min(CONFIG.maxDeltaMs, Math.max(0, Number(deltaMs) || 0));
    for (const dash of this.live) {
      dash.age += dt;
      const progress = Math.min(1, dash.age / CONFIG.lifetimeMs);
      dash.image.setAlpha(CONFIG.alpha * Math.sin(Math.PI * progress) * (1 - progress));
      dash.image.x = dash.x - dash.direction * dash.tileSize * CONFIG.driftTiles * progress;
      dash.image.displayWidth = dash.width * (1 + CONFIG.stretch * progress);
      if (progress === 1) dash.image.destroy();
    }
    this.live = this.live.filter(dash => dash.age < CONFIG.lifetimeMs);
    if (!this.isRunning() || !this.scene.textures.exists(CONFIG.textureKey)) {
      this.distance = 0;
      return;
    }
    const body = this.controller.physicsBody;
    const tileSize = this.controller.config.tileSize;
    this.distance += Math.abs(body.vx) * dt / 1000;
    if (this.distance < tileSize * CONFIG.spacingTiles || this.live.length >= CONFIG.maxLive) return;
    this.distance %= tileSize * CONFIG.spacingTiles;
    const direction = Math.sign(body.vx);
    const height = CONFIG.bodyHeightRatios[this.sequence++ % CONFIG.bodyHeightRatios.length];
    const x = body.x + body.w / 2 - direction * tileSize * CONFIG.trailOffsetTiles;
    const y = body.y + body.h * height;
    const width = tileSize * CONFIG.widthTiles;
    const image = this.scene.add.image(x, y, CONFIG.textureKey)
      .setOrigin(direction > 0 ? 1 : 0, 0.5).setFlipX(direction < 0)
      .setDisplaySize(width, tileSize * CONFIG.heightTiles)
      .setBlendMode(CONFIG.blendMode).setAlpha(0)
      .setDepth(this.player.depth + CONFIG.depthOffset);
    this.live.push({ image, x, direction, width, tileSize, age: 0 });
  }

  destroy() {
    this.destroyed = true;
    this.scene?.events?.off(CONFIG.postUpdateEvent, this._postUpdate);
    for (const dash of this.live) dash.image.destroy();
    this.live = [];
  }
}
