import {
  PLAYER_CONTACT_SHADOW_CONFIG,
  resolvePlayerContactShadowEnabled,
} from "../../values/playerContactShadow.js";
import { resolveCaveCompositionEnabled } from "../../values/caveVisualComposition.js";

const clamp01 = value => Math.max(0, Math.min(1, value));
const lerp = (from, to, amount) => from + (to - from) * amount;

export class PlayerContactShadowSystem {
  constructor(scene, player, controller, config = PLAYER_CONTACT_SHADOW_CONFIG,
    search = globalThis.location?.search || "") {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.config = config;
    this.compositionEnabled = resolveCaveCompositionEnabled(search);
    this.outer = null;
    this.inner = null;
  }

  create() {
    if (!resolvePlayerContactShadowEnabled(undefined, this.config) || !this.scene?.add) return false;
    this.outer = this.scene.add.ellipse(
      0,
      0,
      this.config.outerWidthPx,
      this.config.outerHeightPx,
      this.config.color,
      1,
    ).setDepth(this.config.depth).setAlpha(0).setVisible(false);
    this.inner = this.scene.add.ellipse(
      0,
      0,
      this.config.innerWidthPx,
      this.config.innerHeightPx,
      this.config.color,
      1,
    ).setDepth(this.config.depth + 0.01).setAlpha(0).setVisible(false);
    return true;
  }

  update(deltaMs = 16.67) {
    if (!this.outer || !this.inner || !this.player) return;
    const body = this.compositionEnabled
      ? this.controller?.physicsBody || this.player.body
      : this.player.body || this.controller?.physicsBody;
    const bodyEnabled = body?.enable !== false;
    const grounded = this.controller?.isGrounded?.()
      ?? body?.blocked?.down
      ?? body?.touching?.down
      ?? false;
    const playerVisible = this.player.visible !== false && (this.player.alpha ?? 1) > 0.02;
    const shouldShow = Boolean(bodyEnabled && grounded && playerVisible);
    const response = 1 - Math.exp(
      -Math.min(50, Math.max(0, deltaMs)) * this.config.responsePerMs,
    );
    const width = body?.w ?? body?.width;
    const height = body?.h ?? body?.height;
    const customCenterX = this.compositionEnabled && Number.isFinite(body?.x)
      && Number.isFinite(width) ? body.x + width / 2 : this.player.x;
    const x = Number.isFinite(body?.center?.x) ? body.center.x : customCenterX;
    const spriteBottom = this.player.y + (this.player.displayHeight || 0)
      * (this.compositionEnabled ? 1 - (this.player.originY ?? 0.5) : 0.5);
    const bodyBottom = Number.isFinite(body?.bottom)
      ? body.bottom
      : this.compositionEnabled && Number.isFinite(body?.y) && Number.isFinite(height)
        ? body.y + height : spriteBottom;
    const y = bodyBottom + this.config.groundedOffsetYPx;
    const speedRatio = clamp01(
      Math.abs(body?.velocity?.x ?? (this.compositionEnabled ? body?.vx || 0 : 0))
        / this.config.speedReferencePxPerSecond,
    );
    const targetScaleX = 1 + speedRatio * this.config.maxHorizontalStretch;
    const targetScaleY = 1 - speedRatio * this.config.maxVerticalCompression;

    for (const [shadow, targetAlpha] of [
      [this.outer, shouldShow ? this.config.outerAlpha : 0],
      [this.inner, shouldShow ? this.config.innerAlpha : 0],
    ]) {
      if (shouldShow) shadow.setVisible(true);
      shadow.setPosition(x, y);
      shadow.setScale(
        lerp(shadow.scaleX, targetScaleX, response),
        lerp(shadow.scaleY, targetScaleY, response),
      );
      shadow.setAlpha(lerp(shadow.alpha, targetAlpha, response));
      if (!shouldShow && shadow.alpha <= this.config.hiddenAlphaThreshold) {
        shadow.setVisible(false).setAlpha(0);
      }
    }
  }

  destroy() {
    this.outer?.destroy();
    this.inner?.destroy();
    this.outer = null;
    this.inner = null;
    this.scene = null;
    this.player = null;
    this.controller = null;
  }
}
