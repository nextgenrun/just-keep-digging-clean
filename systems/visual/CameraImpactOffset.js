import { MINING_IMPACT_POLISH_CONFIG as CONFIG } from "../../values/miningImpactPolish.js";

/** A render-only world offset after camera follow/deadzone; HUD and input stay unshaken. */
export class CameraImpactOffset {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras?.main;
    this.offset = { x: 0, y: 0 };
    this.saved = null;
    this.ready = typeof this.camera?.preRender === "function" && Boolean(scene.events?.on);
    if (!this.ready) return;
    this.original = this.camera.preRender;
    this.hadOwnPreRender = Object.hasOwn(this.camera, "preRender");
    const owner = this;
    this.wrapped = function(...args) {
      owner.restore();
      const result = owner.original.apply(this, args);
      owner.apply();
      return result;
    };
    this.camera.preRender = this.wrapped;
    this._restore = () => this.restore();
    scene.events.on(CONFIG.events.render, this._restore);
    scene.events.on(CONFIG.events.preUpdate, this._restore);
  }

  set(x, y) { this.offset = { x, y }; }

  apply() {
    const camera = this.camera;
    if (!camera || (!this.offset.x && !this.offset.y)) return;
    // The renderer applies native density later. Divide only by camera zoom,
    // so one logical screen pixel remains one logical screen pixel at 1080p/4K.
    const x = this.offset.x / (camera.zoomX || camera.zoom || 1);
    const y = this.offset.y / (camera.zoomY || camera.zoom || 1);
    this.saved = { x: camera.scrollX, y: camera.scrollY,
      viewX: camera.worldView?.x, viewY: camera.worldView?.y,
      midX: camera.midPoint?.x, midY: camera.midPoint?.y };
    camera.scrollX += x;
    camera.scrollY += y;
    if (camera.worldView) { camera.worldView.x += x; camera.worldView.y += y; }
    if (camera.midPoint) { camera.midPoint.x += x; camera.midPoint.y += y; }
  }

  restore() {
    if (!this.saved || !this.camera) return;
    const camera = this.camera, saved = this.saved;
    camera.scrollX = saved.x;
    camera.scrollY = saved.y;
    if (camera.worldView) { camera.worldView.x = saved.viewX; camera.worldView.y = saved.viewY; }
    if (camera.midPoint) { camera.midPoint.x = saved.midX; camera.midPoint.y = saved.midY; }
    this.saved = null;
  }

  clear() { this.restore(); this.set(0, 0); }

  destroy() {
    this.clear();
    this.scene?.events?.off(CONFIG.events.render, this._restore);
    this.scene?.events?.off(CONFIG.events.preUpdate, this._restore);
    if (this.camera?.preRender === this.wrapped) {
      if (this.hadOwnPreRender) this.camera.preRender = this.original;
      else delete this.camera.preRender;
    }
    this.camera = null;
    this.scene = null;
    this.ready = false;
  }
}
