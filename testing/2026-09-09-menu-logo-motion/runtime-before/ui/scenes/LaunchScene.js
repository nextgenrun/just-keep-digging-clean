import { MENU_ASSET_KEYS } from "../../values/menuAssetKeys.js";
import { BRAND_CONFIG } from "../../values/branding.js";
import { MENU_LOADING_PRESENTATION as CFG } from "../../values/menuLoadingPresentation.js";
import { installStartupImageVariants } from "../../systems/visual/StartupImageVariants.js";
import { createMenuLoadingScreen, getSelectedMenuBackgroundAsset } from "../components/LoadingScreenView.js";

// Paint the approved loading presentation before downloading the full scene graph.
export class LaunchScene extends Phaser.Scene {
  constructor() { super("LaunchScene"); }

  preload() {
    installStartupImageVariants(this);
    const background = getSelectedMenuBackgroundAsset();
    this.load.image(MENU_ASSET_KEYS.logo, BRAND_CONFIG.logoAssetPath);
    this.load.image(BRAND_CONFIG.backing.key, BRAND_CONFIG.backing.path);
    this.load.image(background.key, background.path);
  }

  create() {
    this.loadingUi = createMenuLoadingScreen(this, {
      preferLogo: true,
      label: CFG.copy.launchLabel,
      detail: CFG.copy.launchDetail,
      onRetry: () => globalThis.location.reload(),
    });
    // Start the download after the first authored frame has reached the canvas.
    this.game.events.once("postrender", () => this.loadRuntime());
  }

  async loadRuntime() {
    try {
      const { registerRuntimeScenes } = await import("./RuntimeScenes.js");
      if (!this.sys.isActive()) return;
      registerRuntimeScenes(this.game);
      // Keep this screen alive while Boot fetches its remaining mini-preload art.
      this.scene.launch("BootScene");
    } catch (error) {
      if (!this.sys.isActive()) return;
      this.loadingUi.setFailure(CFG.copy.launchFailure);
      console.warn("[LaunchScene] Runtime download failed:", error);
    }
  }
}
