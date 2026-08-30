import {
  clearTintIfChanged,
  setAlphaIfChanged,
} from "./worldVisualRenderState.js";

function clampFraction(value) {
  return Math.max(0.001, Math.min(0.999, Number(value) || 0));
}

function ensureFeatherTexture(scene, key, topFadeFraction, rightFadeFraction) {
  if (scene.textures.exists(key)) return;
  const size = 256;
  const texture = scene.textures.createCanvas(key, size, size);
  const context = texture.context;
  const vertical = context.createLinearGradient(0, 0, 0, size);
  vertical.addColorStop(0, "rgba(255,255,255,0)");
  vertical.addColorStop(clampFraction(topFadeFraction), "rgba(255,255,255,1)");
  vertical.addColorStop(1, "rgba(255,255,255,1)");
  context.fillStyle = vertical;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = "destination-in";
  const horizontal = context.createLinearGradient(0, 0, size, 0);
  horizontal.addColorStop(0, "rgba(255,255,255,1)");
  horizontal.addColorStop(
    1 - clampFraction(rightFadeFraction),
    "rgba(255,255,255,1)",
  );
  horizontal.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = horizontal;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = "source-over";
  texture.refresh();
}

export class WorldVisualSurfaceMotionView {
  constructor(scene, config, variant, layout) {
    this.scene = scene;
    this.config = config;
    this.variant = variant;
    this.layout = layout;
    this.video = null;
    this.featherObject = null;
    this.featherMask = null;
    this.ready = false;
    this.paused = false;
    this.failed = false;
  }

  create() {
    const asset = this.variant?.asset;
    if (!asset || !this.scene.cache?.video?.exists?.(asset.key)) return false;
    const video = this.scene.add.video(this.layout.x, this.layout.y, asset.key)
      .setOrigin(0, 1)
      .setDepth(this.layout.depth)
      .setVisible(false)
      .setMute(true);
    video.name = `world-visual-surface-motion-${this.variant.id}`;
    video.once("created", (_gameObject, width, height) => {
      const expected = this.config.expectedSource;
      if (width !== expected.width || height !== expected.height) {
        this._fail(`${width}x${height}; expected ${expected.width}x${expected.height}`);
        return;
      }
      video.setDisplaySize(this.layout.width, this.layout.height);
      const maskKey = this.layout.maskKey
        || `world-visual-surface-motion-${this.variant.id}-feather`;
      ensureFeatherTexture(
        this.scene,
        maskKey,
        this.layout.topFadeFraction,
        this.layout.rightFadeFraction,
      );
      this.featherObject = this.scene.make.image({
        x: this.layout.x,
        y: this.layout.y,
        key: maskKey,
        add: false,
      }).setOrigin(0, 1).setDisplaySize(this.layout.width, this.layout.height);
      this.featherMask = this.featherObject.createBitmapMask();
      video.setMask(this.featherMask);
      video.setVisible(true);
      this.ready = true;
      console.info(
        `[WorldVisualSurfaceMotionView] ${this.variant.id} active; `
        + "use ?surfaceMotion=0 for static fallback",
      );
    });
    video.once("error", (_gameObject, error) => this._fail(error?.message || "video error"));
    video.once("unsupported", () => this._fail("unsupported video"));
    this.video = video;
    video.play(this.config.loop);
    return true;
  }

  update(alpha) {
    if (!this.video || !this.ready || this.failed) return false;
    clearTintIfChanged(this.video);
    setAlphaIfChanged(this.video, alpha);
    const shouldPause = alpha <= this.config.pauseBelowAlpha;
    if (shouldPause !== this.paused) {
      this.video.setPaused(shouldPause);
      this.paused = shouldPause;
    }
    return true;
  }

  getSnapshot() {
    return Object.freeze({
      variantId: this.variant?.id || null,
      ready: this.ready,
      failed: this.failed,
      paused: this.paused,
      currentTime: Number(this.video?.getCurrentTime?.()) || 0,
      duration: Number(this.video?.getDuration?.()) || 0,
      displayWidth: Number(this.video?.displayWidth) || 0,
      displayHeight: Number(this.video?.displayHeight) || 0,
    });
  }

  destroy() {
    this.video?.stop?.(false);
    this.video?.clearMask?.(false);
    this.video?.destroy?.();
    this.featherMask?.destroy?.();
    this.featherObject?.destroy?.();
    this.video = null;
    this.featherMask = null;
    this.featherObject = null;
    this.ready = false;
    this.paused = false;
  }

  _fail(reason) {
    this.failed = true;
    this.ready = false;
    this.video?.setVisible?.(false);
    console.warn(
      `[WorldVisualSurfaceMotionView] ${this.variant?.id || "unknown"} unavailable: ${reason}`,
    );
  }
}
