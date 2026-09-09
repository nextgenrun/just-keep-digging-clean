import { MERCHANT_MOTION_CONFIG as C, MERCHANT_MOTION_CAST } from '../../values/merchantMotion.js';
import { MERCHANT_MOTION_RIGS } from '../../values/merchantMotionRigs.js';
import { NPC_ACTIVITY_CONFIG } from '../../values/npcActivityConfig.js';
import { MerchantMotionRenderer } from './MerchantMotionRenderer.js';
import { MerchantMotionPlayback } from './MerchantMotionPlayback.js';

// One shared render atlas avoids a GPU readback/context switch per merchant.
export class MerchantMotionSystem {
  constructor(scene) {
    this.scene = scene;
    this.entries = new Map();
    const value = new URLSearchParams(globalThis.location?.search || '').get(C.queryParam)?.toLowerCase();
    this.enabled = C.enabled && !C.disableValues.includes(value);
    this.reducedMotion = globalThis.matchMedia?.(C.reducedMotionQuery)?.matches === true;
    this.textureKey = C.textureKeyPrefix + C.atlasName;
    this.canvas = null;
    this.texture = null;
    this.elapsedMs = 0;
    this.nextFrameAt = 0;
    this.uploadCount = 0;
    this.destroyed = false;
  }
  create(npc) {
    if (!this.enabled || !this.scene.game?.renderer?.gl || typeof document === 'undefined') return null;
    const index = MERCHANT_MOTION_CAST.findIndex(entry => entry.id === npc.merchantId);
    const cast = MERCHANT_MOTION_CAST[index], rig = MERCHANT_MOTION_RIGS[npc.merchantId];
    const merchant = NPC_ACTIVITY_CONFIG.merchants[npc.merchantId];
    if (!cast || !rig || !merchant || !this.scene.textures.exists(npc.assetKey)) return null;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = C.textureSizePx * C.atlasColumns;
      this.canvas.height = C.textureSizePx * Math.ceil(MERCHANT_MOTION_CAST.length / C.atlasColumns);
    }
    const image = this.scene.textures.get(npc.assetKey).getSourceImage();
    const foot = merchant.footBottomYAtReferencePx / NPC_ACTIVITY_CONFIG.render.referenceCanvasSizePx * C.referenceSize;
    let renderer;
    try {
      renderer = new MerchantMotionRenderer(this.canvas, image, cast, rig, foot, false);
      renderer.setActivityImages(Object.fromEntries(Object.entries(npc.activityKeys || {})
        .filter(([, key]) => this.scene.textures.exists(key))
        .map(([id, key]) => [id, this.scene.textures.get(key).getSourceImage()])));
      const origin = [index % C.atlasColumns * C.textureSizePx, Math.floor(index / C.atlasColumns) * C.textureSizePx];
      const layout = { width: this.canvas.width, height: this.canvas.height, size: C.textureSizePx, origin };
      renderer.draw(0, -1, layout, 1, !this.texture);
      if (!this.texture) {
        // WebGL canvas sources use addImage; addCanvas requires a 2D context.
        this.texture = this.scene.textures.addImage(this.textureKey, this.canvas);
        if (!this.texture) throw new Error('Could not register merchant atlas');
        this.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      } else this.texture.source[0].update();
      this.texture.add(npc.merchantId, 0, ...origin, C.textureSizePx, C.textureSizePx);
      this.uploadCount += 1;
      const playback = new MerchantMotionPlayback(this.reducedMotion);
      this.entries.set(npc.merchantId, { npc, renderer, layout, playback,
        sprite: null, frameCount: 1, failed: false, wasVisible: false });
      return { textureKey: this.textureKey, frameName: npc.merchantId, playback };
    } catch (error) {
      renderer?.destroy();
      console.warn('[MerchantMotion] Keeping existing merchant visual:', npc.merchantId, error.message);
      return null;
    }
  }
  attach(merchantId, sprite) {
    const entry = this.entries.get(merchantId);
    if (entry) entry.sprite = sprite;
  }
  update(delta) {
    if (this.destroyed || globalThis.document?.hidden || this.reducedMotion) return;
    const step = Math.min(Math.max(delta || 0, 0), NPC_ACTIVITY_CONFIG.performance.maxDeltaMs);
    this.elapsedMs += step;
    const visible = [];
    for (const entry of this.entries.values()) {
      if (entry.failed) continue;
      entry.playback.advance(step);
      if (entry.renderer.lost) { this._fallback(entry); continue; }
      if (this._isVisible(entry.sprite, this.scene.cameras?.main)) visible.push(entry);
      else entry.wasVisible = false;
    }
    if (!visible.length || !this.texture) return;
    if (this.elapsedMs < this.nextFrameAt && visible.every(entry => entry.wasVisible)) return;
    let rendered = 0;
    for (const entry of visible) {
      try {
        const motion = entry.playback;
        entry.renderer.draw(motion.time, motion.actionTime, entry.layout, motion.strength, rendered === 0, motion.activity);
        entry.frameCount += 1;
        entry.wasVisible = true;
        rendered += 1;
      } catch (error) { this._fallback(entry, error); }
    }
    if (rendered) {
      // All visible frames transfer together, while the canvas pixels are live.
      this.texture.source[0].update();
      this.uploadCount += 1;
    }
    const interval = C.millisecondsPerSecond / C.framesPerSecond;
    if (this.elapsedMs >= this.nextFrameAt) {
      this.nextFrameAt += (Math.floor((this.elapsedMs - this.nextFrameAt) / interval) + 1) * interval;
    }
  }
  _isVisible(sprite, camera) {
    if (!sprite?.active || !sprite.visible || sprite.alpha <= 0) return false;
    const view = camera?.worldView;
    if (!view) return true;
    const margin = C.offscreenMarginPx, halfWidth = sprite.displayWidth / 2;
    return sprite.x + halfWidth >= view.x - margin
      && sprite.x - halfWidth <= view.right + margin
      && sprite.y >= view.y - margin
      && sprite.y - sprite.displayHeight <= view.bottom + margin;
  }
  _restore(entry) {
    const sprite = entry.sprite;
    if (sprite?.scene && sprite.texture?.key === this.textureKey) {
      const width = sprite.displayWidth, height = sprite.displayHeight;
      sprite.setTexture(entry.npc.assetKey).setDisplaySize(width, height);
    }
  }
  _fallback(entry, error = null) {
    entry.failed = true;
    this._restore(entry);
    entry.renderer.destroy();
    console.warn('[MerchantMotion] Restored merchant artwork:', entry.npc.merchantId, error?.message || 'WebGL context lost');
  }
  getHealthSnapshot() {
    return { enabled: this.enabled, reducedMotion: this.reducedMotion, destroyed: this.destroyed,
      actorCount: this.entries.size, uploadCount: this.uploadCount,
      actors: [...this.entries.values()].map(entry => ({
        merchantId: entry.npc.merchantId, ready: !entry.failed,
        textureKey: entry.sprite?.texture?.key, frameName: entry.sprite?.frame?.name,
        frameCount: entry.frameCount, timeMs: entry.playback.elapsedMs,
        actionTime: entry.playback.actionTime,
        activityId: entry.playback.activityId, activityBlend: entry.playback.activityBlend,
        shopTime: entry.playback.activity.shopTime, renderedActivity: entry.renderer.lastActivityId || null,
        activityPoseCount: Object.keys(entry.renderer.activityImages || {}).length,
        visible: this._isVisible(entry.sprite, this.scene.cameras?.main),
      })) };
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const entry of this.entries.values()) { this._restore(entry); entry.renderer.destroy(); }
    if (this.texture) this.scene.textures.remove(this.textureKey);
    this.canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    if (this.canvas) this.canvas.width = this.canvas.height = 0;
    this.entries.clear();
    this.texture = null;
    this.canvas = null;
    this.scene = null;
  }
}
