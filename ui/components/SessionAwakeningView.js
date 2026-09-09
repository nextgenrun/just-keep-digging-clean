import { SESSION_AWAKENING as C } from "../../values/sessionAwakening.js";

/** Authored eyelid art, temporary camera focus, and the entry HUD reveal. */
export class SessionAwakeningView {
  constructor(scene) {
    this.scene = scene;
    const texture = scene.textures.get(C.art.key);
    const source = texture.getSourceImage();
    const half = Math.floor(source.height / 2);
    if (!texture.has(C.art.upperFrame)) {
      texture.add(C.art.upperFrame, 0, 0, 0, source.width, half);
      texture.add(C.art.lowerFrame, 0, 0, half, source.width, source.height - half);
      texture.add(C.art.coverFrame, 0, 0, 0, C.art.coverCropPx, C.art.coverCropPx);
    }
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(C.art.depth);
    const image = frame => scene.add.image(0, 0, C.art.key, frame).setTint(C.art.tint);
    this.upper = image(C.art.upperFrame).setOrigin(0.5, 0);
    this.lower = image(C.art.lowerFrame).setOrigin(0.5, 1);
    // Two copies of the authored opaque crop remove its very slight alpha.
    this.covers = [image(C.art.coverFrame), image(C.art.coverFrame)];
    this.root.add([this.upper, this.lower, ...this.covers]);
    this.zone = scene.add.zone(0, 0, 1, 1).setScrollFactor(0).setDepth(C.art.depth + 1).setInteractive();
    this.hud = [];
    this.layout();
    this._resize = () => { this.layout(); if (this.frame) this.render(this.frame); };
    scene.scale.on("resize", this._resize);
    this.fullscreenControl = globalThis.document?.getElementById(C.art.nativeFullscreenId);
    this.fullscreenVisibility = this.fullscreenControl?.style.visibility;
    if (this.fullscreenControl) this.fullscreenControl.style.visibility = "hidden";
  }

  begin(selection) {
    this.selection = selection;
    this.camera = this.scene.cameras.main;
    this.cameraBase = { zoom: this.camera.zoom, x: this.camera.followOffset.x, y: this.camera.followOffset.y };
    this.hud = this.scene.children.list.filter(object => object !== this.root && object !== this.zone
      && object.depth >= C.art.hudMinDepth && object.depth < C.art.depth
      && object.scrollFactorX === 0 && object.scrollFactorY === 0
      && typeof object.setAlpha === "function" && Number.isFinite(object.alpha))
      .map(object => ({ object, alpha: object.alpha }));
    if (selection.blurStrength && this.camera.postFX?.addBlur) {
      this.blur = this.camera.postFX.addBlur(C.blurQuality, C.blurRadius, C.blurRadius, 0, 0xffffff, C.blurSteps);
    }
  }

  layout() {
    this.width = this.scene.scale.width;
    this.height = this.scene.scale.height;
    const width = this.width * C.art.widthScale, height = this.height * C.art.heightScale;
    this.upper.setDisplaySize(width, height);
    this.lower.setDisplaySize(width, height);
    for (const cover of this.covers) cover.setPosition(this.width / 2, this.height / 2).setDisplaySize(this.width, this.height);
    this.zone?.setPosition(this.width / 2, this.height / 2).setSize(this.width, this.height);
    if (this.zone?.input) this.zone.input.hitArea.setTo(0, 0, this.width, this.height);
  }

  render(frame) {
    this.frame = frame;
    const y = this.height * (C.art.topInset - C.art.travel * frame.opening);
    const lidAlpha = this.selection?.reduced ? 0 : frame.lidAlpha;
    this.upper.setPosition(this.width / 2, y).setAlpha(lidAlpha);
    this.lower.setPosition(this.width / 2, this.height - y).setAlpha(lidAlpha);
    for (const cover of this.covers) cover.setAlpha(frame.coverAlpha ?? (this.selection?.reduced ? 1 - frame.opening : 0));
    for (const { object, alpha } of this.hud) if (object.scene) object.setAlpha(alpha * frame.hudAlpha);
    if (this.blur) this.blur.strength = frame.blur;
    if (!this.cameraRestored && this.cameraBase) {
      this.camera.setZoom(this.cameraBase.zoom * (1 + frame.cameraZoom));
      this.camera.setFollowOffset(this.cameraBase.x, this.cameraBase.y + frame.cameraY);
    }
  }

  release() {
    this.restoreCamera();
    this.zone?.destroy();
    this.zone = null;
  }

  restoreCamera() {
    if (this.cameraRestored || !this.cameraBase) return;
    this.cameraRestored = true;
    // Phaser may already have destroyed the camera before scene disposal.
    if (this.camera?.scene && this.camera.followOffset) {
      this.camera.setZoom(this.cameraBase.zoom);
      this.camera.setFollowOffset(this.cameraBase.x, this.cameraBase.y);
      if (this.blur) this.camera.postFX?.remove?.(this.blur);
    }
    this.blur = null;
  }

  destroy() {
    this.restoreCamera();
    for (const { object, alpha } of this.hud) if (object.scene) object.setAlpha(alpha);
    this.scene.scale.off("resize", this._resize);
    this.zone?.destroy();
    this.zone = null;
    this.root.destroy();
    if (this.fullscreenControl) this.fullscreenControl.style.visibility = this.fullscreenVisibility;
  }
}

export function createSessionAwakeningView(scene) {
  return scene.textures.exists(C.art.key) ? new SessionAwakeningView(scene) : null;
}

export function queueSessionAwakeningAssets(scene) {
  let queued = false;
  if (!C.enabled || new URLSearchParams(globalThis.location?.search || "").get(C.query) === "0") return queued;
  if (!scene.textures.exists(C.art.key)) { scene.load.image(C.art.key, C.art.path); queued = true; }
  for (const asset of [C.audio.breath, C.audio.heartbeat]) {
    if (!asset?.approved || scene.cache.audio.exists(asset.key)) continue;
    scene.load.audio(asset.key, asset.path);
    queued = true;
  }
  return queued;
}
