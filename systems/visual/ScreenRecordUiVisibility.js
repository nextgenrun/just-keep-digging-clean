export function isShortCaptureUiObject(gameObject, config) {
  if (!gameObject || gameObject.visible !== true) return false;
  if (typeof gameObject.setVisible !== "function") return false;

  const keepVisible = gameObject.getData?.(config.keepVisibleDataKey) === true;
  if (keepVisible) return false;

  const fixedToCamera = Number(gameObject.scrollFactorX) === 0
    && Number(gameObject.scrollFactorY) === 0;
  const depth = Number(gameObject.depth);
  return fixedToCamera && Number.isFinite(depth) && depth >= config.minimumDepth;
}

/**
 * Temporarily removes screen-space Phaser UI from short-format capture frames.
 * Every object hidden here is restored when recording stops or fails.
 */
export class ScreenRecordUiVisibility {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.hiddenObjects = new Set();
  }

  hide() {
    const displayList = this.scene?.children?.list || [];
    displayList.forEach(gameObject => {
      if (!isShortCaptureUiObject(gameObject, this.config)) return;
      this.hiddenObjects.add(gameObject);
      gameObject.setVisible(false);
    });
  }

  restore() {
    this.hiddenObjects.forEach(gameObject => {
      if (gameObject?.active === false || typeof gameObject?.setVisible !== "function") return;
      gameObject.setVisible(true);
    });
    this.hiddenObjects.clear();
  }
}
