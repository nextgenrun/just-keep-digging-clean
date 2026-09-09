import { SHADOW_MINER_WORK as cfg } from "../../values/shadowMinerWork.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as fallbackProfile } from "../../values/playerAssetProfiles.js";

// Bounded ordinary-terrain work, using resident player animation frames.
// No inventory, GP, special-block or reward authority.
export class ShadowMinerWorkLoop {
  constructor(runtime) { this.runtime = runtime; this.reset(); }
  reset() {
    this.cycleStartedAt = null;
    this.target = null;
    this.didContact = false;
    this.blocksMined = 0;
    this.animationReady = false;
    this.lastResult = null;
    this.frameChanges = 0;
    this.lastFrame = null;
  }
  limitTravel(pose, delta, fleeing = false) {
    const anchor = this.runtime.view.anchor;
    if (!anchor || !pose) return pose;
    const speed = fleeing ? cfg.fleeTilesPerSecond : cfg.approachTilesPerSecond;
    const maximum = speed * this.runtime.scene.config.tileSize * Math.max(0, delta) / 1000;
    const dx = pose.x - anchor.x, dy = pose.y - anchor.y;
    const ratio = Math.min(1, maximum / Math.max(Number.EPSILON, Math.hypot(dx, dy)));
    return { ...pose, x: anchor.x + dx * ratio, y: anchor.y + dy * ratio };
  }
  _target() {
    const scene = this.runtime.scene, anchor = this.runtime.view.anchor;
    if (!anchor || !scene.worldModel) return null;
    const ts = scene.config.tileSize;
    const tx = Math.floor(anchor.x / ts), ty = Math.floor((anchor.y - 1) / ts);
    const player = scene.playerController?.getPlayerTile?.();
    for (const [dx, dy] of cfg.targetOffsets) {
      const tile = { tx: tx + dx, ty: ty + dy, dx, dy };
      if (tile.ty <= scene.config.topAirRows || !scene.worldModel.inBounds(tile.tx, tile.ty)) continue;
      if (player && Math.hypot(tile.tx - player.tx, tile.ty - player.ty) < cfg.minimumPlayerDistanceTiles) continue;
      if (!cfg.mutableTypes.includes(scene.worldModel.getTileType(tile.tx, tile.ty))) continue;
      if (scene.randomEventBridge?.shouldProtectMineTarget?.(tile)) continue;
      return tile;
    }
    return null;
  }
  _frames(action) {
    const scene = this.runtime.scene;
    const profile = scene.playerController?.assetProfile || scene.playerAssetProfile || fallbackProfile;
    const keys = action
      ? this.target?.dy > 0 ? [profile.digDownAnim] : [profile.digSidewaysAnim, profile.digSidewaysHitAnims?.[0]]
      : [profile.idleAnim, this.runtime.view.currentPose?.animationKey];
    for (const key of keys) {
      const frames = scene.anims?.get?.(key)?.frames;
      if (frames?.length && frames.every(frame => scene.textures?.exists?.(frame.textureKey))) return { key, frames };
    }
    return null;
  }
  update(time) {
    const runtime = this.runtime, view = runtime.view;
    if (!view.anchor || !view.currentPose) return;
    if (this.cycleStartedAt === null || time - this.cycleStartedAt >= cfg.cycleMs) {
      this.cycleStartedAt = time;
      this.target = this.blocksMined < cfg.maximumBlocks ? this._target() : null;
      this.didContact = false;
    }
    const elapsed = time - this.cycleStartedAt;
    const action = Boolean(this.target) && elapsed < cfg.actionMs;
    const clip = this._frames(action);
    this.animationReady = Boolean(clip);
    if (!clip) { this.lastResult = "animation unavailable"; return; }
    const ratio = action ? Math.min(1, elapsed / cfg.actionMs) : (elapsed % cfg.actionMs) / cfg.actionMs;
    const frame = clip.frames[Math.min(clip.frames.length - 1, Math.floor(ratio * clip.frames.length))];
    const frameKey = frame.textureKey + ":" + frame.textureFrame;
    if (frameKey !== this.lastFrame) this.frameChanges += 1;
    this.lastFrame = frameKey;
    const ts = runtime.scene.config.tileSize;
    view.applyPose({
      ...view.currentPose, x: view.anchor.x, y: view.anchor.y,
      textureKey: frame.textureKey, frameName: frame.textureFrame,
      animationKey: clip.key, action: false,
      tileX: Math.floor(view.anchor.x / ts), tileY: Math.floor((view.anchor.y - 1) / ts),
      flipX: this.target?.dx ? this.target.dx < 0 : view.currentPose.flipX,
    });
    if (action && !this.didContact && elapsed >= cfg.actionMs * cfg.contactRatio) {
      this.didContact = true;
      this._contact();
    }
  }
  _contact() {
    const scene = this.runtime.scene, tile = this.target, world = scene.worldModel;
    const type = world.getTileType(tile.tx, tile.ty);
    if (!cfg.mutableTypes.includes(type) || scene.randomEventBridge?.shouldProtectMineTarget?.(tile)) {
      this.lastResult = "target changed or protected"; return;
    }
    const result = world.damageTile(tile.tx, tile.ty, Math.max(1, world.getTileHp(tile.tx, tile.ty)));
    if (!result?.destroyed) { this.lastResult = "terrain refused damage"; return; }
    this.blocksMined += 1;
    this.lastResult = "ordinary block mined";
    scene.worldRenderer?.applyTileUpdate?.(tile.tx, tile.ty);
    const ts = scene.config.tileSize;
    scene._applyDestroyParticles?.((tile.tx + 0.5) * ts, (tile.ty + 0.5) * ts, type);
    scene.soundSystem?.playTileBreak?.();
    scene.queueDugTilesSave?.();
  }
  snapshot() {
    return { animationReady: this.animationReady, frameChanges: this.frameChanges,
      blocksMined: this.blocksMined, maximumBlocks: cfg.maximumBlocks,
      target: this.target ? { ...this.target } : null, lastResult: this.lastResult };
  }
}