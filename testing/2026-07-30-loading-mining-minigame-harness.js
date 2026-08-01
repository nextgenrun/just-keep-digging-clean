import { ASSET_KEYS } from "../values/assetKeys.js";
import { BRAND_CONFIG } from "../values/branding.js";
import {
  getLoadingMiningMinigamePreloadAssets,
  LOADING_MINING_MINIGAME_CONFIG,
} from "../values/loadingMiningMinigame.js";
import {
  getLoadingScreenPresentationAssets,
  LOADING_SCREEN_PRESENTATION,
} from "../values/loadingScreenPresentation.js";
import {
  createMenuLoadingScreen,
  getSelectedMenuBackgroundAsset,
} from "../ui/components/LoadingScreenView.js";

const params = new URLSearchParams(globalThis.location.search);
const durationMs = Phaser.Math.Clamp(
  Number(params.get("duration")) || 30000,
  8000,
  120000,
);
const density = Phaser.Math.Clamp(Number(params.get("density")) || 1, 1, 2);
const reviewWidth = Math.round(
  LOADING_MINING_MINIGAME_CONFIG.layout.referenceWidth * density,
);
const reviewHeight = Math.round(
  LOADING_MINING_MINIGAME_CONFIG.layout.referenceHeight * density,
);
const rootPath = assetPath => `../${assetPath}`;

class LoadingMiningMinigameHarnessScene extends Phaser.Scene {
  constructor() {
    super("LoadingMiningMinigameHarnessScene");
  }

  preload() {
    this.menuBackground = getSelectedMenuBackgroundAsset();
    this.load.image(
      ASSET_KEYS.branding.logo,
      rootPath(BRAND_CONFIG.logoAssetPath),
    );
    this.load.image(
      this.menuBackground.key,
      rootPath(this.menuBackground.path),
    );
    for (const asset of getLoadingScreenPresentationAssets()) {
      this.load.image(asset.key, rootPath(asset.path));
    }
    for (const asset of getLoadingMiningMinigamePreloadAssets()) {
      this.load.image(asset.key, rootPath(asset.path));
    }
  }

  create() {
    this.progress = 0;
    this.loadingUi = createMenuLoadingScreen(this, {
      preferLogo: true,
      backgroundKey: this.menuBackground.key,
      subtitle: "L O A D I N G   M I N E",
      label: "Loading the world...",
      detail: "Mine while the real loader continues independently.",
    });
    this.startedAt = this.time.now;
    this.progressTimer = this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        this.progress = Phaser.Math.Clamp(
          (this.time.now - this.startedAt) / durationMs,
          0,
          1,
        );
        this.loadingUi.setProgress(this.progress);
        if (this.progress >= 1) {
          this.loadingUi.setLabel("World ready");
          this.loadingUi.setDetail("Harness stays open so the mining feel remains testable.");
          this.progressTimer.remove();
        }
      },
    });

    globalThis.__loadingMiningHarness = {
      ready: true,
      scene: this,
      screen: this.loadingUi,
      snapshot: () => ({
        progress: this.progress,
        layout: this.loadingUi.layout,
        label: {
          text: this.loadingUi.labelText.text,
          width: this.loadingUi.labelText.width,
          maxWidth: LOADING_SCREEN_PRESENTATION.layout.meters.width,
        },
        meters: this.loadingUi.meters?.getSnapshot?.() || null,
        minigame: this.loadingUi.minigame
          ? globalThis[LOADING_MINING_MINIGAME_CONFIG.diagnostics.globalKey]
          : null,
        loadedAssets: getLoadingMiningMinigamePreloadAssets()
          .filter(asset => this.textures.exists(asset.key)).length,
        keyboardRightListeners: this.input.keyboard.listenerCount("keydown-RIGHT"),
      }),
      cellScreenPosition: (row, column) => {
        const view = this.loadingUi.minigame?.cells[row]?.[column];
        const canvas = this.game.canvas;
        if (!view || !canvas) return null;
        const point = view.root.getWorldTransformMatrix().transformPoint(0, 0);
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + point.x * (rect.width / canvas.width),
          y: rect.top + point.y * (rect.height / canvas.height),
        };
      },
    };
    document.body.dataset.reviewReady = "true";
    document.body.dataset.minigameActive = String(Boolean(this.loadingUi.minigame));
  }
}

globalThis.__loadingMiningHarnessGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "review-root",
  width: reviewWidth,
  height: reviewHeight,
  backgroundColor: "#02060a",
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LoadingMiningMinigameHarnessScene],
});
