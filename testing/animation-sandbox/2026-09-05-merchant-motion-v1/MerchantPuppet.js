import { MERCHANT_MOTION_SANDBOX as C } from '../../../values/merchantMotionSandbox.js';
import { MerchantMotionRenderer } from '../../../systems/visual/MerchantMotionRenderer.js';

// The sandbox adds only layout and inspection labels to the production renderer.
export class MerchantPuppet extends MerchantMotionRenderer {
  constructor(...args) {
    super(...args);
    this.canvas.dataset.joints = String(this.rig.length);
    this.canvas.dataset.ready = 'true';
  }
  draw(time, actionTime, gameSize) {
    const { canvas } = this;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height || this.lost) return;
    const ratio = Math.min(devicePixelRatio || 1, C.maxPixelRatio);
    const backingWidth = Math.round(width * ratio), backingHeight = Math.round(height * ratio);
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth; canvas.height = backingHeight;
    }
    const size = gameSize || Math.min(height * C.fitFraction, width * C.widthFraction);
    const origin = [width / 2 - size / 2, height * C.stageGroundFraction - this.foot * size / C.referenceSize];
    super.draw(time, actionTime, { width, height, size, origin });
    canvas.dataset.time = time.toFixed(3);
    canvas.dataset.action = actionTime.toFixed(3);
    canvas.dataset.blink = this.lastPose.blink.toFixed(3);
    canvas.dataset.spriteSize = size.toFixed(2);
  }
}
