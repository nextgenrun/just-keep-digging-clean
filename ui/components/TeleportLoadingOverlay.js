import { createMenuLoadingScreen } from "./LoadingScreenView.js";
import { WORLD_LOAD_COPY } from "../../values/playerFacingCopy.js";
import { TELEPORT_TRANSITION_CONFIG } from
  "../../values/teleportTransition.js";

export class TeleportLoadingOverlay {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.config = options.config || TELEPORT_TRANSITION_CONFIG;
    this.getProgress = options.getProgress || (() => null);
    this.destroyed = false;
    this.completing = false;

    const width = scene.scale?.width || scene.cameras?.main?.width || 1280;
    const height = scene.scale?.height || scene.cameras?.main?.height || 720;
    this.root = scene.add.container(0, 0)
      .setDepth(this.config.overlayDepth)
      .setScrollFactor(0);
    this.blocker = scene.add.rectangle(
      0,
      0,
      width,
      height,
      this.config.backdropColor,
      this.config.backdropAlpha,
    ).setOrigin(0).setInteractive();
    this.root.add(this.blocker);
    this.loadingView = createMenuLoadingScreen(scene, {
      label: WORLD_LOAD_COPY.loadingAssets,
      detail: WORLD_LOAD_COPY.preparingNearbyWorld,
      preferLogo: true,
      progress: 0,
    });
    if (!this.loadingView) {
      this.destroy();
      return;
    }
    const loadingObjects = new Set(this.loadingView.objects || []);
    const orderedLoadingObjects = scene.children?.list
      ?.filter(object => loadingObjects.has(object))
      || this.loadingView.objects
      || [];
    this.root.add(orderedLoadingObjects);
    this.available = true;
    this._onResize = gameSize => this._resize(gameSize);
    scene.scale?.on?.("resize", this._onResize);
    this.refresh();
  }

  _resize(gameSize = {}) {
    if (this.destroyed) return;
    const width = Number(gameSize.width) || this.scene.scale?.width || 1280;
    const height = Number(gameSize.height) || this.scene.scale?.height || 720;
    this.blocker?.setSize(width, height);
  }

  refresh() {
    const progress = this.getProgress?.() || {};
    const value = Math.max(0, Math.min(1, Number(progress.progress) || 0));
    this.loadingView?.setProgress?.(value);
    if (value >= 1 || progress.status === "ready") {
      this.loadingView?.setLabel?.(WORLD_LOAD_COPY.enteringMine);
      this.loadingView?.setDetail?.(WORLD_LOAD_COPY.almostReady);
      return;
    }
    this.loadingView?.setLabel?.(WORLD_LOAD_COPY.loadingAssets);
    this.loadingView?.setDetail?.(WORLD_LOAD_COPY.preparingNearbyWorld);
  }

  complete(onComplete) {
    if (this.destroyed || this.completing) return;
    this.completing = true;
    this.loadingView?.setProgress?.(1);
    this.loadingView?.setLabel?.(WORLD_LOAD_COPY.enteringMine);
    this.loadingView?.setDetail?.(WORLD_LOAD_COPY.almostReady);
    const fade = this.scene.tweens?.add?.({
      targets: this.root,
      alpha: 0,
      duration: 140,
      ease: "Sine.easeOut",
      onComplete,
    });
    if (!fade) onComplete?.();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene?.scale?.off?.("resize", this._onResize);
    this.scene?.tweens?.killTweensOf?.(this.root);
    this.loadingView?.destroy?.();
    this.root?.destroy?.(true);
    this.loadingView = null;
    this.root = null;
    this.blocker = null;
    this.scene = null;
  }
}

export function createTeleportLoadingOverlay(scene, options = {}) {
  const overlay = new TeleportLoadingOverlay(scene, options);
  if (overlay.available) return overlay;
  overlay.destroy();
  return null;
}
