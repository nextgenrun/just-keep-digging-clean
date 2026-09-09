import { addBrandLogo } from "./BrandLogoView.js";
import { MENU_ASSET_KEYS } from "../../values/menuAssetKeys.js";
import { BRAND_CONFIG } from "../../values/branding.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

import { MENU_ATMOSPHERE } from "../../values/menuAtmosphere.js";
import { addMenuBackground } from "./MenuBackgroundView.js";
export {
  MENU_BACKGROUND_ASSETS, MENU_BACKGROUND_KEYS, addMenuBackground,
  getSelectedMenuBackgroundKey, setSelectedMenuBackgroundKey, getSelectedMenuBackgroundAsset,
} from "./MenuBackgroundView.js";

import { MENU_LOADING_PRESENTATION as CFG } from "../../values/menuLoadingPresentation.js";
import { createMenuLoadingPanel } from "./MenuLoadingPanel.js";

const COL = { shadow: UI_COLORS.dim, title: UI_COLORS.title };

function addLogoOrTitle(scene, objects, W, options) {
  if (options.preferLogo && scene.textures.exists(MENU_ASSET_KEYS.logo)) {
    const logo = addBrandLogo(scene, W / 2, CFG.logo.y, { loading: true });
    const scale = Math.min(CFG.logo.width / logo.width, CFG.logo.height / logo.height);
    logo.setScale(scale);
    objects.push(logo);
    return;
  }

  const title = options.title ?? BRAND_CONFIG.name;
  const titleShadow = scene.add.text(W / 2 + 3, 183, title, {
    fontFamily: UI_FONTS.display,
    fontSize: "76px",
    fontStyle: "bold",
    color: COL.shadow,
  }).setOrigin(0.5).setAlpha(0.42);

  const titleText = scene.add.text(W / 2, 180, title, {
    fontFamily: UI_FONTS.display,
    fontSize: "76px",
    fontStyle: "bold",
    color: COL.title,
  }).setOrigin(0.5);

  objects.push(titleShadow, titleText);
}

export function createMenuLoadingScreen(scene, options = {}) {
  const W = scene.scale?.width ?? scene.cameras.main.width;
  const H = scene.scale?.height ?? scene.cameras.main.height;
  const objects = [];
  let retryHandler = typeof options.onRetry === "function" ? options.onRetry : null;
  let inFailureState = false;
  let progress = 0;
  let destroyed = false;

  const bg = scene.add.rectangle(W / 2, H / 2, W, H, UI_COLORS.bg);
  objects.push(bg);
  addMenuBackground(scene, {
    objects, width: W, height: H, motion: false,
    key: options.backgroundKey,
    videoPath: options.backgroundVideoPath,
    loopOverlapMs: options.backgroundLoopOverlapMs,
    bufferedLoops: options.backgroundBufferedLoops,
    videoMix: options.backgroundVideoMix,
    replacePoster: options.backgroundReplacePoster,
    alpha: options.backgroundAlpha ?? MENU_ATMOSPHERE.alpha,
  });
  const vignette = scene.add.graphics();
  vignette.fillStyle(UI_COLORS.overlay, options.overlayAlpha ?? CFG.overlayAlpha);
  vignette.fillRect(0, 0, W, H);
  objects.push(vignette);
  addLogoOrTitle(scene, objects, W, options);

  const panel = createMenuLoadingPanel(scene, options);
  // A normal scene object lets portal containers own the foreground fade too.
  objects.push(panel.anchor);
  const setProgress = (value) => {
    progress = Phaser.Math.Clamp(Number(value) || 0, 0, 1);
    panel.setProgress(progress);
  };
  const retry = () => {
    if (destroyed || !inFailureState || !retryHandler) return;
    const handler = retryHandler;
    retryHandler = null;
    updateRetryUi();
    handler();
  };
  const updateRetryUi = () => panel.setRetryHandler(retry, inFailureState && Boolean(retryHandler));
  const setRetryHandler = handler => {
    retryHandler = typeof handler === "function" ? handler : null;
    updateRetryUi();
  };
  const showFailure = (message = CFG.copy.failure) => {
    inFailureState = true;
    panel.labelText.setText(CFG.copy.failureTitle);
    panel.detailText.setText(CFG.copy.failureDetail);
    panel.setFailure(message);
    updateRetryUi();
  };
  const clearFailure = () => {
    inFailureState = false;
    panel.clearFailure();
    panel.setProgress(progress);
    updateRetryUi();
  };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    scene.events.off("shutdown", destroy);
    panel.destroy();
    objects.forEach(object => object?.destroy());
  };
  scene.events.once("shutdown", destroy);
  updateRetryUi();
  setProgress(options.progress ?? 0);

  return {
    objects,
    labelText: panel.labelText,
    detailText: panel.detailText,
    pctText: panel.pctText,
    setProgress,
    setLabel: text => panel.labelText.setText(text),
    setDetail: text => panel.detailText.setText(text),
    setFailure: showFailure,
    clearFailure,
    setRetryHandler,
    fadeOut(duration = CFG.fadeMs, onComplete) {
      if (destroyed) return;
      scene.tweens.add({
        targets: objects, alpha: 0, duration, ease: "Power1.in",
        onComplete: () => { destroy(); onComplete?.(); },
      });
    },
    destroy,
  };
}
