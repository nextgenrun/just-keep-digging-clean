import {
  getPauseFeatureLoadingPreloadAssets,
} from "../values/loadingMiningMinigame.js";
import { getPauseFeatureLoadingDecorationAssets } from
  "../values/pauseFeatureLoading.js";
import { PAUSE_FEATURE_LOADING_CONFIG } from
  "../values/pauseFeatureLoading.js";
import {
  createPauseFeatureLoadingView,
} from "../ui/components/PauseFeatureLoadingView.js";

const REVIEW_WIDTH = 1280;
const REVIEW_HEIGHT = 720;
const CONTENT_BOUNDS = Object.freeze({
  x: 82,
  y: 142,
  width: 1116,
  height: 467,
});
const TOTAL_ASSETS = 41;
const rootPath = assetPath => `../${assetPath}`;

class PauseFeatureLoadingHarnessScene extends Phaser.Scene {
  constructor() {
    super("PauseFeatureLoadingHarnessScene");
  }

  preload() {
    const assets = [
      ...getPauseFeatureLoadingPreloadAssets(),
      ...getPauseFeatureLoadingDecorationAssets(),
    ];
    for (const asset of assets) {
      this.load.image(asset.key, rootPath(asset.path));
    }
  }

  create() {
    this.loadedAssets = 8;
    this.status = "loading";
    this.view = createPauseFeatureLoadingView(this, {
      ...CONTENT_BOUNDS,
      themeId: "starlight",
      getProgress: () => ({
        status: this.status,
        totalAssets: TOTAL_ASSETS,
        loadedAssets: this.loadedAssets,
      }),
    });
    globalThis.__pauseFeatureLoadingHarness = {
      ready: true,
      scene: this,
      view: this.view,
      setLoaded: value => {
        this.loadedAssets = Phaser.Math.Clamp(
          Math.round(Number(value) || 0),
          0,
          TOTAL_ASSETS,
        );
        this.view.refresh();
      },
      complete: () => {
        this.loadedAssets = TOTAL_ASSETS;
        this.status = "ready";
        this.view.refresh(true);
        this.view.complete();
      },
      destroy: () => this.view.destroy(),
      snapshot: () => ({
        loadedAssets: this.loadedAssets,
        status: this.status,
        diagnostic: globalThis[
          PAUSE_FEATURE_LOADING_CONFIG.diagnosticsGlobalKey
        ],
        root: this.view?.root ? {
          x: this.view.root.x,
          y: this.view.root.y,
          scaleX: this.view.root.scaleX,
          scaleY: this.view.root.scaleY,
          alpha: this.view.root.alpha,
        } : null,
        texturesReady: [
          ...getPauseFeatureLoadingPreloadAssets(),
          ...getPauseFeatureLoadingDecorationAssets(),
        ].every(asset => this.textures.exists(asset.key)),
      }),
    };
    document.body.dataset.reviewReady = "true";
  }
}

globalThis.__pauseFeatureLoadingHarnessGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "review-root",
  width: REVIEW_WIDTH,
  height: REVIEW_HEIGHT,
  backgroundColor: "#02060a",
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PauseFeatureLoadingHarnessScene],
});
