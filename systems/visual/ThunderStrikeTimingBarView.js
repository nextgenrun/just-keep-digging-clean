import { ASSET_KEYS } from "../../values/assetKeys.js";
import { resolveThunderStrikeTimingBarScale } from "../../values/thunderStrikeChain.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));

/** Presents only the authored Thunderstrike timing rail and its live targets. */
export class ThunderStrikeTimingBarView {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.root = null;
    this.presentedTimingSnapshot = null;
    this._resizeHandler = () => this._layout();
    this._create();
  }

  _create() {
    const scene = this.scene;
    const ui = this.config.timingBar;
    const textureKey = ASSET_KEYS.ui.thunderStrikeChainFrame;
    const targetKey = ASSET_KEYS.ui.thunderStrikeTargetGate;
    const needleKey = ASSET_KEYS.ui.thunderStrikeNeedle;
    const requiredTextureKeys = [textureKey, targetKey, needleKey];
    if (
      !scene?.add?.container
      || !scene.add.image
      || requiredTextureKeys.some(key => !scene.textures?.exists?.(key))
    ) return;

    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(ui.depth)
      .setVisible(false);
    this.frame = scene.add.image(
      0,
      -ui.frameCrop.centerOffsetY,
      textureKey,
    ).setOrigin(0.5)
      .setDisplaySize(ui.assetWidth, ui.assetHeight)
      .setCrop(
        ui.frameCrop.x,
        ui.frameCrop.y,
        ui.frameCrop.width,
        ui.frameCrop.height,
      );
    this.targetGate = scene.add.image(0, 0, targetKey)
      .setOrigin(0.5)
      .setVisible(false);
    this.needle = scene.add.image(0, 0, needleKey)
      .setOrigin(0.5)
      .setVisible(false);
    this.root.add([this.frame, this.targetGate, this.needle]);
    this._layout();
    scene.scale?.on?.("resize", this._resizeHandler);
  }

  _layout() {
    if (!this.root) return;
    const ui = this.config.timingBar;
    const width = this.scene.scale?.width
      || this.scene.config?.viewportWidth
      || this.scene.game?.config?.width
      || ui.visibleWidth;
    const height = this.scene.scale?.height
      || this.scene.config?.viewportHeight
      || this.scene.game?.config?.height
      || ui.visibleHeight;
    const scale = resolveThunderStrikeTimingBarScale(width, height);
    this.root
      .setScale(scale)
      .setPosition(width / 2, ui.top + ui.visibleHeight * scale / 2);
  }

  getPresentedTimingSnapshot(stageIndex) {
    if (this.presentedTimingSnapshot?.challengeStageIndex !== stageIndex) return null;
    return { ...this.presentedTimingSnapshot };
  }

  setVisible(visible) {
    this.root?.setVisible(visible);
    if (!visible) this.presentedTimingSnapshot = null;
  }

  render(snapshot) {
    if (!this.root) return;
    const ui = this.config.timingBar;
    const progress = clamp01(snapshot.progress);
    const needleX = ui.trackX + progress * ui.trackWidth;
    const targetX = ui.trackX + snapshot.windowStartProgress * ui.trackWidth;
    const targetWidth = Math.max(
      1,
      (snapshot.windowEndProgress - snapshot.windowStartProgress) * ui.trackWidth,
    );

    this.root.setVisible(true);
    this.targetGate
      .setVisible(true)
      .setPosition(targetX + targetWidth / 2, ui.trackCenterY)
      .setDisplaySize(targetWidth, ui.targetArtHeight)
      .setAlpha(ui.targetArtAlpha);
    this.needle
      .setVisible(true)
      .setPosition(needleX, ui.trackCenterY)
      .setDisplaySize(ui.needleArtWidth, ui.needleArtHeight);
    this.presentedTimingSnapshot = {
      challengeStageIndex: snapshot.challengeStageIndex,
      progress,
      windowStartProgress: snapshot.windowStartProgress,
      windowEndProgress: snapshot.windowEndProgress,
    };
  }

  destroy() {
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
