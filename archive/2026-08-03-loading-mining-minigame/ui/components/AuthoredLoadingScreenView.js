import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import {
  getLoadingScreenPresentationAssets,
  LOADING_SCREEN_PRESENTATION,
} from "../../values/loadingScreenPresentation.js";
import {
  getLoadingMiningMinigamePreloadAssets,
  LOADING_MINING_MINIGAME_CONFIG,
} from "../../values/loadingMiningMinigame.js";
import { createAuthoredLoadingMiningMinigame } from
  "./AuthoredLoadingMiningMinigame.js";
import { AuthoredLoadingFailureView } from
  "./AuthoredLoadingFailureView.js";
import { AuthoredLoadingProgressMeters } from
  "./AuthoredLoadingProgressMeters.js";

function addText(scene, root, x, y, value, style, origin = 0.5) {
  const text = scene.add.text(x, y, value, style).setOrigin(origin);
  root.add(text);
  return text;
}

export function hasAuthoredLoadingScreenAssets(
  scene,
  presentation = LOADING_SCREEN_PRESENTATION,
  minigame = LOADING_MINING_MINIGAME_CONFIG,
  search = globalThis.location?.search || "",
) {
  const presentationAssets = getLoadingScreenPresentationAssets(presentation);
  const minigameAssets = getLoadingMiningMinigamePreloadAssets(
    minigame,
    search,
  );
  const assets = [
    ...presentationAssets,
    ...minigameAssets,
  ];
  return scene?.textures?.exists?.(ASSET_KEYS.branding.logo)
    && minigameAssets.length > 0
    && assets.every(asset => scene.textures.exists(asset.key));
}

export class AuthoredLoadingScreenView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.config = options.presentationConfig
      ?? LOADING_SCREEN_PRESENTATION;
    this.minigameConfig = options.minigameConfig
      ?? LOADING_MINING_MINIGAME_CONFIG;
    this.destroyed = false;
    this._build();
  }

  _build() {
    const { layout, typography, copy, assets } = this.config;
    const viewportWidth = this.scene.scale?.width
      ?? this.scene.cameras.main.width;
    const viewportHeight = this.scene.scale?.height
      ?? this.scene.cameras.main.height;
    const scale = Math.min(
      viewportWidth / layout.referenceWidth,
      viewportHeight / layout.referenceHeight,
    );
    const offsetX = (viewportWidth - layout.referenceWidth * scale) / 2;
    const offsetY = (viewportHeight - layout.referenceHeight * scale) / 2;
    const colors = typography.colors;
    const outlined = {
      fontFamily: UI_FONTS.mono,
      stroke: colors.shadow,
      strokeThickness: typography.strokeThickness,
    };

    this.root = this.scene.add.container(offsetX, offsetY).setScale(scale);
    this.foundation = this.scene.add.image(
      layout.foundation.x,
      layout.foundation.y,
      assets.foundation.key,
    ).setDisplaySize(layout.foundation.width, layout.foundation.height);
    this.root.add(this.foundation);

    const logo = this.scene.add.image(
      layout.logo.x,
      layout.logo.y,
      ASSET_KEYS.branding.logo,
    );
    logo.setScale(Math.min(
      layout.logo.maxWidth / logo.width,
      layout.logo.maxHeight / logo.height,
    ));
    this.root.add(logo);
    this.subtitle = addText(
      this.scene,
      this.root,
      layout.logo.x,
      layout.logo.subtitleY,
      this.options.subtitle ?? "A L P H A",
      {
        ...outlined,
        fontSize: typography.subtitleSize,
        color: colors.amber,
        letterSpacing: typography.letterSpacing,
      },
    );

    this.meters = new AuthoredLoadingProgressMeters(
      this.scene,
      this.root,
      this.config,
    );
    this.labelText = this.meters.labelText;
    this.detailText = this.meters.detailText;
    this.pctText = this.meters.overallPercent;
    this.meters.setLabel(this.options.label ?? copy.loadingFallback);
    this.meters.setDetail(this.options.detail ?? copy.detailFallback);

    const minigameTextStyle = {
      ...outlined,
      fontSize: typography.instructionSize,
      color: colors.body,
      align: "center",
    };
    addText(
      this.scene,
      this.root,
      layout.minigame.headingX,
      layout.minigame.headingY,
      copy.minigameHeading,
      {
        ...minigameTextStyle,
        fontSize: typography.minigameHeadingSize,
        fontStyle: "bold",
        color: colors.title,
        letterSpacing: typography.letterSpacing,
      },
    );
    addText(
      this.scene,
      this.root,
      layout.minigame.headingX,
      layout.minigame.instructionY,
      copy.minigameInstruction,
      minigameTextStyle,
    );
    addText(
      this.scene,
      this.root,
      layout.minigame.headingX,
      layout.minigame.optionalY,
      copy.optional,
      {
        ...minigameTextStyle,
        fontSize: typography.optionalSize,
        color: colors.muted,
      },
    );
    addText(
      this.scene,
      this.root,
      layout.minigame.headingX,
      layout.minigame.toolHeadingY,
      copy.toolHeading,
      {
        ...minigameTextStyle,
        fontSize: typography.optionalSize,
        color: colors.amber,
        letterSpacing: 1,
      },
    );

    this.minigame = createAuthoredLoadingMiningMinigame(this.scene, {
      config: this.minigameConfig,
      search: this.options.search,
    });
    this.failureView = new AuthoredLoadingFailureView(
      this.scene,
      this.root,
      this.config,
    );
    this.failureView.setRetryHandler(this.options.onRetry);
    this.setProgress(this.options.progress ?? 0);
    this.layout = Object.freeze({
      viewportWidth,
      viewportHeight,
      logicalWidth: layout.referenceWidth,
      logicalHeight: layout.referenceHeight,
      scale,
      offsetX,
      offsetY,
      presentation: "imagegen-v1",
      visibleUiSource: "authored-bitmaps",
      meterCount: 2,
      progressPlacement: "dual-left",
      progressFrameSource: "loading-screen-v1",
      minigameBottomBar: false,
      toolSlots: this.minigameConfig.assets.pickaxeTiers.length,
      overlapFree: true,
      noProceduralVisuals: true,
    });
  }

  setProgress(value) {
    this.meters.setProgress(value);
  }

  setLabel(value) {
    this.meters.setLabel(value);
  }

  setDetail(value) {
    this.meters.setDetail(value);
  }

  setRetryHandler(handler) {
    this.failureView.setRetryHandler(handler);
  }

  setFailure(message = "Loading failed.") {
    this.minigame?.setVisible(false);
    this.failureView.show(message);
    this.setLabel("Loading stopped");
    this.setDetail("The real loader reported an error.");
  }

  clearFailure() {
    this.failureView.hide();
    this.minigame?.setVisible(true);
  }

  fadeOut(duration = this.config.timing.fadeOutMs, onComplete) {
    this.meters.destroy();
    this.minigame?.setPaused(true);
    this.scene.tweens.add({
      targets: [this.root, this.minigame?.root].filter(Boolean),
      alpha: 0,
      duration,
      ease: "Power1.in",
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.meters?.destroy();
    this.minigame?.destroy();
    this.root?.destroy(true);
  }
}

export function createAuthoredLoadingScreenView(scene, options = {}) {
  return new AuthoredLoadingScreenView(scene, options);
}
