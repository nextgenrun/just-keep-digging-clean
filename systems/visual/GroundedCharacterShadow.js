/** Soft occlusion belongs to the supporting floor and visible sole, never the airborne sprite. */
export class GroundedCharacterShadow {
  constructor(scene, player, controller, config) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.config = config.grounded;
    this.depth = config.depth;
    this.wasGrounded = false;
    this.previousFallSpeed = 0;
    this.landing = 0;
    this._onPostUpdate = (_time, delta) => this.update(delta);
  }
  create() {
    const c = this.config;
    if (!this.scene.textures.exists(c.textureKey)) {
      const texture = this.scene.textures.createCanvas(c.textureKey, c.textureWidth, c.textureHeight);
      const ctx = texture.context;
      ctx.scale(c.textureWidth / 2, c.textureHeight / 2);
      const gradient = ctx.createRadialGradient(1, 1, 0, 1, 1, 1);
      gradient.addColorStop(0, "rgba(3,6,10,1)");
      gradient.addColorStop(0.35, "rgba(3,6,10,0.65)");
      gradient.addColorStop(1, "rgba(3,6,10,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 2);
      texture.refresh();
    }
    const make = (width, height, depth) => this.scene.add.image(0, 0, c.textureKey)
      .setDisplaySize(width, height).setDepth(depth).setAlpha(0).setVisible(false);
    this.outer = make(c.outerWidth, c.outerHeight, this.depth);
    this.inner = make(c.innerWidth, c.innerHeight, this.depth + 0.01);
    this.feet = [make(c.footWidth, c.footHeight, this.depth + 0.02), make(c.footWidth, c.footHeight, this.depth + 0.02)];
    this.scene.events.on("postupdate", this._onPostUpdate);
    return true;
  }
  supported(x, floor) {
    const world = this.scene.worldModel;
    const size = this.scene.config.tileSize;
    return world?.isSolid?.(Math.floor(x / size), Math.floor((floor + this.config.floorInsetPx) / size)) === true;
  }
  update(delta = 16.67) {
    const p = this.player, b = this.controller?.physicsBody, c = this.config;
    if (!p || !b) return;
    const floor = b.y + b.h;
    const center = b.x + b.w / 2;
    const grounded = this.controller.isGrounded() && p.visible !== false && p.alpha > 0.02;
    if (grounded && !this.wasGrounded) this.landing = Math.min(1, this.previousFallSpeed / c.landingSpeedReference);
    this.wasGrounded = grounded;
    this.previousFallSpeed = grounded ? 0 : Math.max(0, b.vy || 0);
    this.landing *= Math.exp(-Math.max(0, delta) / c.landingSettleMs);
    const sheet = this.scene.playerAssetProfile.groundingContacts?.[p.texture.key];
    const frame = sheet?.feet?.[String(p.frame.name)];
    const anchors = ["l", "r"].map(side => {
      const marker = frame?.[side];
      if (!marker) return null;
      const x = p.x + (p.flipX ? -1 : 1) * (marker.x - sheet.size * p.originX) * Math.abs(p.scaleX);
      const lift = Math.max(0, floor - (p.y + (marker.bottom - sheet.size * p.originY) * Math.abs(p.scaleY)));
      return { x, lift, supported: grounded && this.supported(x, floor) };
    });
    const supported = grounded && this.supported(center, floor);
    const response = 1 - Math.exp(-Math.min(80, Math.max(0, delta)) * c.fadeResponsePerSecond / 1000);
    for (const [shadow, alpha] of [[this.outer, c.outerAlpha], [this.inner, c.innerAlpha + this.landing * c.landingExtraAlpha]]) {
      // Retain the last floor position during the short fade after takeoff.
      if (supported) shadow.setPosition(center, floor - c.floorInsetPx);
      shadow.setAlpha(shadow.alpha + ((supported ? alpha : 0) - shadow.alpha) * response);
      shadow.setVisible(shadow.alpha > 0.003);
    }
    this.feet.forEach((shadow, index) => {
      const a = anchors[index];
      const alpha = a?.supported ? c.footAlpha * Math.max(0, 1 - a.lift / c.footLiftFadePx) : 0;
      if (a?.supported) shadow.setPosition(a.x, floor - c.floorInsetPx);
      shadow.setAlpha(alpha).setVisible(alpha > 0.003);
    });
  }
  destroy() {
    this.scene?.events?.off("postupdate", this._onPostUpdate);
    for (const shadow of [this.outer, this.inner, ...(this.feet || [])]) shadow?.destroy();
    this.scene = null;
    this.player = null;
    this.controller = null;
  }
}
