/** Neutral ambient/ground shading in the existing sprite batch; no postFX or edge pass. */
export class PlayerWorldAppearanceSystem {
  constructor(scene, player, config = scene.playerAssetProfile?.characterGroundingPolish?.appearance) {
    this.scene = scene;
    this.player = player;
    this.config = config;
    this.active = false;
    this.ownedTints = null;
    this._onUpdate = (_time, delta) => this.update(delta);
  }
  create() {
    if (!this.config || !this.player?.setTint) return false;
    this.top = this.config.dayTop;
    this.bottom = this.config.dayBottom;
    this.active = true;
    this.scene.events.on("postupdate", this._onUpdate);
    this.update(0);
    return true;
  }
  currentTints() {
    return [this.player.tintTopLeft, this.player.tintTopRight, this.player.tintBottomLeft, this.player.tintBottomRight];
  }
  ownsTints(current) {
    return this.ownedTints && current.every((tint, i) => tint === this.ownedTints[i]);
  }
  update(delta = 16.67) {
    if (!this.active) return;
    const current = this.currentTints();
    // Preserve a combat/status tint until its owner restores the sprite.
    if (!current.every(tint => tint === 0xffffff) && !this.ownsTints(current)) return;
    const night = Math.max(0, Math.min(1, this.scene.dayNightCycle?.getNightAmount?.() || 0));
    const response = 1 - Math.exp(-Math.max(0, delta) * this.config.responsePerSecond / 1000);
    this.top += (this.config.dayTop + (this.config.nightTop - this.config.dayTop) * night - this.top) * response;
    this.bottom += (this.config.dayBottom + (this.config.nightBottom - this.config.dayBottom) * night - this.bottom) * response;
    const gray = value => Math.round(value * 255) * 0x010101;
    const top = gray(this.top), bottom = gray(this.bottom);
    const next = [top, top, bottom, bottom];
    if (current.some((tint, i) => tint !== next[i])) this.player.setTint(...next);
    this.ownedTints = next;
  }
  destroy() {
    this.scene?.events?.off("postupdate", this._onUpdate);
    if (this.player && this.ownsTints(this.currentTints())) this.player.clearTint();
    this.active = false;
    this.scene = null;
    this.player = null;
  }
}
