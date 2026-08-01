import {
  getPauseFeatureLoadingPreloadAssets,
  LOADING_MINING_MINIGAME_CONFIG,
} from "../../values/loadingMiningMinigame.js";
import {
  getPauseFeatureLoadingDecorationAssets,
  PAUSE_FEATURE_LOADING_CONFIG,
  resolvePauseFeatureLoadingTheme,
} from "../../values/pauseFeatureLoading.js";
import { PauseFeatureLoadingChrome } from "./PauseFeatureLoadingChrome.js";
import { PauseFeatureLoadingProgress } from "./PauseFeatureLoadingProgress.js";
import { clampPauseLoadingProgress } from "./pauseFeatureLoadingArt.js";

let diagnosticSequence = 0;

export function hasPauseFeatureLoadingAssets(
  scene,
  loadingConfig = LOADING_MINING_MINIGAME_CONFIG,
  config = PAUSE_FEATURE_LOADING_CONFIG,
) {
  return [
    ...getPauseFeatureLoadingPreloadAssets(loadingConfig),
    ...getPauseFeatureLoadingDecorationAssets(config),
  ]
    .every(asset => scene.textures?.exists?.(asset.key));
}

export class PauseFeatureLoadingView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.parent = options.parent;
    this.config = options.config || PAUSE_FEATURE_LOADING_CONFIG;
    this.loadingConfig = options.loadingConfig || LOADING_MINING_MINIGAME_CONFIG;
    this.themeId = options.themeId || "starlight";
    this.theme = resolvePauseFeatureLoadingTheme(this.themeId, this.config);
    this.getProgress = options.getProgress || (() => null);
    this.destroyed = false;
    this.completed = false;
    this.diagnosticId = diagnosticSequence += 1;
    this._build(options);
    this.refresh(true);
    this._startPolling();
    this._publishDiagnostics();
  }

  _build(options) {
    const layout = this.config.layout;
    const motion = this.config.motion;
    const width = options.width || layout.referenceWidthPx;
    const height = options.height || layout.referenceHeightPx;
    const scale = Math.max(
      layout.minimumScale,
      Math.min(width / layout.referenceWidthPx, height / layout.referenceHeightPx),
    );
    const centerX = (options.x || 0) + width / 2;
    const centerY = (options.y || 0) + height / 2;
    this.root = this.scene.add.container(centerX, centerY).setScale(scale);
    this.parent?.add?.(this.root);
    this.chrome = new PauseFeatureLoadingChrome(
      this.scene,
      this.root,
      this.config,
      this.loadingConfig,
      this.theme,
    );
    this.progress = new PauseFeatureLoadingProgress(
      this.scene,
      this.root,
      this.config,
      this.loadingConfig,
      this.theme,
      phase => this.chrome.setPhase(phase),
    );
    const targetY = this.root.y;
    this.root.setY(targetY + motion.enterOffsetYpx).setAlpha(0);
    this.enterTween = this.scene.tweens.add({
      targets: this.root,
      y: targetY,
      alpha: 1,
      duration: motion.enterMs,
      ease: "Sine.easeOut",
    });
  }

  _startPolling() {
    this.pollTimer = this.scene.time.addEvent({
      delay: this.config.motion.pollIntervalMs,
      loop: true,
      callback: () => this.refresh(),
    });
  }

  _normalizeSnapshot(snapshot = {}) {
    const totalAssets = Math.max(0, Number(snapshot.totalAssets) || 0);
    const loadedAssets = Math.max(
      0,
      Math.min(totalAssets, Number(snapshot.loadedAssets) || 0),
    );
    const progress = totalAssets > 0
      ? loadedAssets / totalAssets
      : clampPauseLoadingProgress(snapshot.progress);
    return {
      status: snapshot.status || "loading",
      totalAssets,
      loadedAssets,
      pendingAssets: Math.max(0, totalAssets - loadedAssets),
      progress,
    };
  }

  refresh(immediate = false) {
    if (this.destroyed || this.completed) return;
    this.snapshot = this._normalizeSnapshot(this.getProgress?.());
    this.progress.setSnapshot(this.snapshot, immediate);
    this._publishDiagnostics();
  }

  complete(onComplete) {
    if (this.destroyed || this.completed) return;
    this.completed = true;
    this.pollTimer?.remove();
    const totalAssets = this.snapshot?.totalAssets || 0;
    this.snapshot = {
      status: "ready",
      totalAssets,
      loadedAssets: totalAssets,
      pendingAssets: 0,
      progress: 1,
    };
    this.chrome.setReady();
    this.progress.setReady(totalAssets);
    this._publishDiagnostics();
    this.completeTimer = this.scene.time.delayedCall(
      this.config.motion.completeHoldMs,
      () => {
        if (!this.destroyed) onComplete?.();
      },
    );
  }

  _publishDiagnostics() {
    globalThis[this.config.diagnosticsGlobalKey] = {
      id: this.diagnosticId,
      active: !this.destroyed,
      revision: this.config.revision,
      themeId: this.themeId,
      completed: this.completed,
      phaseIndex: this.progress?.phaseIndex ?? -1,
      ...(this.snapshot || {}),
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pollTimer?.remove();
    this.completeTimer?.remove();
    this.enterTween?.stop?.();
    this.progress?.destroy();
    this.chrome?.destroy();
    this.root?.destroy?.(true);
    if (
      globalThis[this.config.diagnosticsGlobalKey]?.id
      === this.diagnosticId
    ) {
      this._publishDiagnostics();
    }
  }
}

export function createPauseFeatureLoadingView(scene, options = {}) {
  if (!hasPauseFeatureLoadingAssets(
    scene,
    options.loadingConfig,
    options.config,
  )) return null;
  return new PauseFeatureLoadingView(scene, options);
}
