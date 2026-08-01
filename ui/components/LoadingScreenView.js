import { ASSET_KEYS } from "../../values/assetKeys.js";
import { BRAND_CONFIG } from "../../values/branding.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { LOADING_MINING_MINIGAME_CONFIG } from "../../values/loadingMiningMinigame.js";
import {
  createLoadingMiningMinigame,
  hasLoadingMiningMinigameAssets,
} from "./LoadingMiningMinigame.js";
import {
  createAuthoredLoadingScreenView,
  hasAuthoredLoadingScreenAssets,
} from "./AuthoredLoadingScreenView.js";

const MENU_BACKGROUND_BASE_PATH = "exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026/sprites/backgrounds/background-database/";

export const MENU_BACKGROUND_ASSETS = Object.freeze([
  {
    key: ASSET_KEYS.background.dbImage1,
    path: `${MENU_BACKGROUND_BASE_PATH}ChatGPT Image Jun 29, 2026, 07_32_45 PM.png`,
  },
  {
    key: ASSET_KEYS.background.dbImage2,
    path: `${MENU_BACKGROUND_BASE_PATH}ChatGPT Image Jun 29, 2026, 07_32_49 PM.png`,
  },
  {
    key: ASSET_KEYS.background.dbImage3,
    path: `${MENU_BACKGROUND_BASE_PATH}ChatGPT Image Jun 29, 2026, 07_32_52 PM.png`,
  },
  {
    key: ASSET_KEYS.background.dbImage4,
    path: `${MENU_BACKGROUND_BASE_PATH}ChatGPT Image Jun 29, 2026, 07_32_58 PM.png`,
  },
  {
    key: ASSET_KEYS.background.dbImage5,
    path: `${MENU_BACKGROUND_BASE_PATH}ChatGPT Image Jun 29, 2026, 07_33_03 PM.png`,
  },
  {
    key: ASSET_KEYS.background.dbImage6,
    path: `${MENU_BACKGROUND_BASE_PATH}ChatGPT Image Jun 29, 2026, 07_40_41 PM (1).png`,
  },
]);

export const MENU_BACKGROUND_KEYS = Object.freeze(MENU_BACKGROUND_ASSETS.map((asset) => asset.key));

let selectedMenuBackgroundKey = null;

const COL = Object.freeze({
  bg: UI_COLORS.bg,
  overlay: UI_COLORS.overlay,
  panel: UI_COLORS.cardBase,
  panelHi: 0xffffff,
  borderDim: UI_COLORS.borderDim,
  borderBright: UI_COLORS.borderSel,
  gold: UI_COLORS.gold,
  fill: UI_COLORS.gold,
  title: UI_COLORS.title,
  shadow: UI_COLORS.dim,
  dim: "#8899aa",
  hint: "#4a5a6a",
  pct: UI_COLORS.gold,
});

export function getSelectedMenuBackgroundKey() {
  if (!selectedMenuBackgroundKey) {
    selectedMenuBackgroundKey = MENU_BACKGROUND_KEYS[Math.floor(Math.random() * MENU_BACKGROUND_KEYS.length)];
  }
  return selectedMenuBackgroundKey;
}

export function setSelectedMenuBackgroundKey(key) {
  if (MENU_BACKGROUND_KEYS.includes(key)) selectedMenuBackgroundKey = key;
  return getSelectedMenuBackgroundKey();
}

export function getSelectedMenuBackgroundAsset() {
  const key = getSelectedMenuBackgroundKey();
  return MENU_BACKGROUND_ASSETS.find((asset) => asset.key === key) ?? MENU_BACKGROUND_ASSETS[0];
}

export function addMenuBackground(scene, options = {}) {
  const W = options.width ?? scene.scale?.width ?? scene.cameras.main.width;
  const H = options.height ?? scene.scale?.height ?? scene.cameras.main.height;
  const preferredKey = options.key ?? getSelectedMenuBackgroundKey();
  const availableKey = scene.textures.exists(preferredKey)
    ? preferredKey
    : MENU_BACKGROUND_KEYS.find((key) => scene.textures.exists(key));

  if (!availableKey) return null;

  const img = scene.add.image(W / 2, H / 2, availableKey);
  img.setScale(Math.max(W / img.width, H / img.height)).setAlpha(options.alpha ?? 0.24);
  options.objects?.push?.(img);
  return img;
}

function addCornerFrame(g, W, H) {
  const inset = 44;
  const short = 80;
  const long = 160;

  g.lineStyle(1, COL.borderDim, 0.72);
  g.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

  g.lineStyle(2, COL.borderBright, 0.8);
  g.lineBetween(inset, inset, inset + long, inset);
  g.lineBetween(inset, inset, inset, inset + short);
  g.lineBetween(W - inset, inset, W - inset - long, inset);
  g.lineBetween(W - inset, inset, W - inset, inset + short);
  g.lineBetween(inset, H - inset, inset + long, H - inset);
  g.lineBetween(inset, H - inset, inset, H - inset - short);
  g.lineBetween(W - inset, H - inset, W - inset - long, H - inset);
  g.lineBetween(W - inset, H - inset, W - inset, H - inset - short);

  g.lineStyle(1, COL.gold, 0.55);
  g.lineBetween(inset + 12, inset + 12, inset + 92, inset + 12);
  g.lineBetween(W - inset - 12, inset + 12, W - inset - 92, inset + 12);
  g.lineBetween(inset + 12, H - inset - 12, inset + 92, H - inset - 12);
  g.lineBetween(W - inset - 12, H - inset - 12, W - inset - 92, H - inset - 12);
}

function addLogoOrTitle(scene, objects, W, options) {
  const centerX = options.logoX ?? W / 2;
  if (options.preferLogo && scene.textures.exists(ASSET_KEYS.branding.logo)) {
    const logo = scene.add.image(centerX, options.logoY ?? 138, ASSET_KEYS.branding.logo);
    const scale = Math.min(
      (options.logoMaxWidth ?? 520) / logo.width,
      (options.logoMaxHeight ?? 160) / logo.height,
    );
    logo.setScale(scale);
    objects.push(logo);
    return;
  }

  const title = options.title ?? BRAND_CONFIG.name;
  const titleY = options.titleY ?? 180;
  const titleShadow = scene.add.text(centerX + 3, titleY + 3, title, {
    fontFamily: UI_FONTS.display,
    fontSize: "76px",
    fontStyle: "bold",
    color: COL.shadow,
  }).setOrigin(0.5).setAlpha(0.42);

  const titleText = scene.add.text(centerX, titleY, title, {
    fontFamily: UI_FONTS.display,
    fontSize: "76px",
    fontStyle: "bold",
    color: COL.title,
  }).setOrigin(0.5);

  objects.push(titleShadow, titleText);
}

function createLoadingParticles(scene, W, H, objects) {
  // Small floating spark particles above/below the loading bar
  const particleCount = 8;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const x = 120 + Math.random() * (W - 240);
    const y = 340 + Math.random() * 120;
    const size = 1.5 + Math.random() * 2.5;
    const alpha = 0.15 + Math.random() * 0.25;
    const dot = scene.add.circle(x, y, size, 0xffd700, alpha);
    objects.push(dot);
    particles.push({ dot, baseY: y, speed: 0.15 + Math.random() * 0.25, offset: Math.random() * Math.PI * 2 });
  }

  // Add a slow floating tween to each particle
  const particleTween = scene.tweens.addCounter({
    from: 0,
    to: Math.PI * 2,
    duration: 3000 + Math.random() * 2000,
    repeat: -1,
    onUpdate: (tween) => {
      const progress = tween.getValue();
      particles.forEach((p, idx) => {
        const phase = progress + p.offset;
        p.dot.y = p.baseY + Math.sin(phase * 0.7) * 8;
        p.dot.alpha = 0.12 + Math.sin(phase * 0.5) * 0.15 + 0.15;
      });
    },
  });

  return particleTween;
}

export function createMenuLoadingScreen(scene, options = {}) {
  const authoredReady = options.minigame !== false
    && hasAuthoredLoadingScreenAssets(
      scene,
      options.presentationConfig,
      options.minigameConfig,
      options.search,
    );
  if (authoredReady) {
    return createAuthoredLoadingScreenView(scene, options);
  }
  options = { ...options, minigame: false };

  const viewportWidth = scene.scale?.width ?? scene.cameras.main.width;
  const viewportHeight = scene.scale?.height ?? scene.cameras.main.height;
  const objects = [];
  const tweens = [];
  let retryHandler = typeof options.onRetry === "function" ? options.onRetry : null;
  let inFailureState = false;
  const minigameConfig = options.minigameConfig ?? LOADING_MINING_MINIGAME_CONFIG;
  const minigameReady = options.minigame !== false
    && hasLoadingMiningMinigameAssets(scene, minigameConfig, options.search);
  const minigameScreen = minigameConfig.layout.screen;
  const W = minigameReady
    ? minigameConfig.layout.referenceWidth
    : viewportWidth;
  const H = minigameReady
    ? minigameConfig.layout.referenceHeight
    : viewportHeight;
  const layoutScale = minigameReady
    ? Math.min(viewportWidth / W, viewportHeight / H)
    : 1;
  const layoutOffsetX = minigameReady
    ? (viewportWidth - W * layoutScale) / 2
    : 0;
  const layoutOffsetY = minigameReady
    ? (viewportHeight - H * layoutScale) / 2
    : 0;

  const bg = scene.add.rectangle(W / 2, H / 2, W, H, COL.bg);
  objects.push(bg);

  addMenuBackground(scene, {
    objects,
    width: W,
    height: H,
    key: options.backgroundKey,
    alpha: options.backgroundAlpha ?? 0.24,
  });

  const vignette = scene.add.graphics();
  vignette.fillStyle(COL.overlay, options.overlayAlpha ?? 0.34);
  vignette.fillRect(0, 0, W, H);
  objects.push(vignette);

  const frame = scene.add.graphics();
  addCornerFrame(frame, W, H);
  objects.push(frame);

  const logoOptions = minigameReady
    ? {
        ...options,
        logoX: minigameScreen.leftColumnX,
        logoY: minigameScreen.logoY,
        logoMaxWidth: minigameScreen.logoMaxWidth,
        logoMaxHeight: minigameScreen.logoMaxHeight,
      }
    : options;
  addLogoOrTitle(scene, objects, W, logoOptions);

  const loadingColumnX = minigameReady
    ? minigameScreen.leftColumnX
    : W / 2;
  const subtitleY = minigameReady
    ? minigameScreen.subtitleY
    : options.preferLogo ? 258 : 268;
  const subtitle = scene.add.text(loadingColumnX, subtitleY, options.subtitle ?? "A L P H A", {
    fontFamily: UI_FONTS.mono,
    fontSize: "18px",
    color: "#c9a227",
    letterSpacing: 5,
  }).setOrigin(0.5);
  objects.push(subtitle);

  if (!minigameReady) {
    const sep1 = scene.add.graphics();
    sep1.lineStyle(1, COL.borderBright, 0.75);
    sep1.lineBetween(220, 300, W - 220, 300);
    objects.push(sep1);
  }

  const minigame = minigameReady
    ? createLoadingMiningMinigame(scene, { config: minigameConfig, search: options.search })
    : null;
  const barW = options.barWidth
    ?? (minigame ? minigameScreen.progressBarWidth : 600);
  const barH = options.barHeight
    ?? (minigame ? minigameScreen.progressBarHeight : 20);
  const barCenterX = loadingColumnX + (
    minigame ? minigameScreen.progressBarOffsetX : 0
  );
  const barX = barCenterX - barW / 2;
  const barY = options.barY ?? (minigame ? minigameScreen.progressBarY : 405);

  let panel;
  let miningInstructionText = null;
  let optionalMiningText = null;
  if (minigame) {
    const progressCrop = minigameScreen.progressFrameCrop;
    panel = scene.add.image(
      loadingColumnX,
      minigameScreen.progressPanelY,
      minigameConfig.assets.boardFrame.key,
    )
      .setCrop(
        progressCrop.x,
        progressCrop.y,
        progressCrop.width,
        progressCrop.height,
      )
      .setScale(
        minigameScreen.progressFrameWidth / progressCrop.width,
        minigameScreen.progressFrameHeight / progressCrop.height,
      );
    miningInstructionText = scene.add.text(
      loadingColumnX,
      minigameScreen.progressInstructionY,
      `${minigameConfig.copy.instruction} · ${minigameConfig.copy.keyboardInstruction}`,
      {
        fontFamily: UI_FONTS.mono,
        fontSize: minigameScreen.progressInstructionFontSize,
        color: minigameConfig.layout.text.instructionColor,
        stroke: minigameConfig.layout.text.strokeColor,
        strokeThickness: minigameConfig.layout.text.strokeThickness,
      },
    ).setOrigin(0.5);
    optionalMiningText = scene.add.text(
      loadingColumnX,
      minigameScreen.progressOptionalY,
      minigameConfig.copy.optional,
      {
        fontFamily: UI_FONTS.mono,
        fontSize: minigameScreen.progressOptionalFontSize,
        color: minigameConfig.layout.text.materialColor,
        stroke: minigameConfig.layout.text.strokeColor,
        strokeThickness: minigameConfig.layout.text.strokeThickness,
      },
    ).setOrigin(0.5);
  } else {
    const panelWidth = 720;
    const panelTop = barY - 72;
    const panelHeight = 138;
    panel = scene.add.graphics();
    panel.lineStyle(1, COL.borderDim, 0.95);
    panel.fillStyle(COL.panel, 0.94);
    panel.fillRoundedRect(W / 2 - panelWidth / 2, panelTop, panelWidth, panelHeight, 8);
    panel.strokeRoundedRect(W / 2 - panelWidth / 2, panelTop, panelWidth, panelHeight, 8);
    panel.fillStyle(COL.panelHi, 0.035);
    panel.fillRoundedRect(W / 2 - panelWidth / 2 + 4, panelTop + 4, panelWidth - 8, 50, 7);
  }
  objects.push(panel);
  if (miningInstructionText) objects.push(miningInstructionText);
  if (optionalMiningText) objects.push(optionalMiningText);

  const labelY = minigame ? minigameScreen.progressLabelY : barY - 36;
  const labelText = scene.add.text(loadingColumnX, labelY, "", {
    fontFamily: UI_FONTS.mono,
    fontSize: minigame ? minigameScreen.progressLabelFontSize : "16px",
    color: "#c8dae8",
  }).setOrigin(0.5);
  objects.push(labelText);
  const setLoadingLabel = (text) => {
    const fullText = String(text ?? "");
    labelText.setText(fullText);
    if (!minigame) return labelText;

    const maxWidth = minigameScreen.progressFrameWidth - 24;
    let visibleLength = fullText.length;
    while (labelText.width > maxWidth && visibleLength > 8) {
      visibleLength -= 1;
      labelText.setText(
        `${fullText.slice(0, visibleLength).trimEnd()}...`,
      );
    }
    return labelText;
  };
  setLoadingLabel(options.label ?? "Loading...");

  if (!minigame) {
    const barBg = scene.add.graphics();
    barBg.fillStyle(UI_COLORS.cardBase, 1);
    barBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 5);
    barBg.lineStyle(1, COL.borderBright, 0.75);
    barBg.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 5);
    objects.push(barBg);
  }

  const barGlow = scene.add.graphics();
  objects.push(barGlow);

  const barFill = scene.add.graphics();
  objects.push(barFill);

  // Pulsing glow on the progress bar
  const glowTween = scene.tweens.addCounter({
    from: 0.3,
    to: 0.7,
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
    onUpdate: (tween) => {
      const alpha = tween.getValue();
      barGlow.clear();
      barGlow.fillStyle(COL.fill, alpha * 0.25);
      barGlow.fillRoundedRect(barX - 4, barY - 4, barW + 8, barH + 8, 7);
    },
  });
  tweens.push(glowTween);

  const percentX = minigame
    ? loadingColumnX + minigameScreen.progressPercentOffsetX
    : W / 2;
  const percentY = minigame
    ? barY + minigameScreen.progressPercentOffsetY
    : barY + barH + 18;
  const pctText = scene.add.text(percentX, percentY, "0%", {
    fontFamily: UI_FONTS.mono,
    fontSize: minigame ? minigameScreen.progressPercentFontSize : "15px",
    color: COL.pct,
  }).setOrigin(0.5);
  objects.push(pctText);

  const detailY = barY + 76;
  const detailText = scene.add.text(W / 2, detailY, options.detail ?? "", {
    fontFamily: UI_FONTS.mono,
    fontSize: "14px",
    color: "#7a9ab4",
  }).setOrigin(0.5);
  detailText.setVisible(!minigame);
  objects.push(detailText);

  const failureY = minigame ? minigameScreen.failureY : barY + 118;
  const failureText = scene.add.text(W / 2, failureY, "", {
    fontFamily: UI_FONTS.mono,
    fontSize: "14px",
    color: "#ff8f72",
    align: "center",
  }).setOrigin(0.5);
  failureText.setAlpha(0);
  objects.push(failureText);

  const retryY = minigame ? minigameScreen.retryY : barY + 156;
  const retryHintY = minigame ? minigameScreen.retryHintY : barY + 182;
  const retryButton = scene.add.rectangle(W / 2, retryY, 150, 36, 0xe07030, 0.98);
  const retryButtonText = scene.add.text(W / 2, retryY, "RETRY", {
    fontFamily: UI_FONTS.mono,
    fontSize: "14px",
    fontStyle: "bold",
    color: "#ffffff",
  }).setOrigin(0.5);
  const retryHintText = scene.add.text(W / 2, retryHintY, "Press RETRY only when loading has stopped due to an error.", {
    fontFamily: UI_FONTS.mono,
    fontSize: "11px",
    color: "#5a6f80",
  }).setOrigin(0.5);
  retryButton.setInteractive({ useHandCursor: true });
  retryButton.setAlpha(0);
  retryButtonText.setAlpha(0);
  retryHintText.setAlpha(0);
  objects.push(retryButton, retryButtonText, retryHintText);

  const updateRetryUi = () => {
    const isInteractive = inFailureState && Boolean(retryHandler);
    retryButton.setAlpha(isInteractive ? 1 : 0);
    retryButtonText.setAlpha(isInteractive ? 1 : 0);
    retryHintText.setAlpha(isInteractive ? 1 : 0);
  };
  const setRetryHandler = (handler) => {
    retryHandler = typeof handler === "function" ? handler : null;
    updateRetryUi();
  };

  const showFailure = (message = "Loading failed.") => {
    inFailureState = true;
    minigame?.setVisible(false);
    setLoadingLabel("Loading failed");
    detailText.setText("Please fix the issue and retry loading.");
    failureText.setText(String(message));
    failureText.setAlpha(1);
    failureText.setColor("#ff8f72");
    scene.tweens.killTweensOf(failureText);
    updateRetryUi();
    scene.tweens.add({
      targets: failureText,
      alpha: { from: 1, to: 0.9 },
      yoyo: true,
      repeat: -1,
      duration: 220,
    });
  };

  const clearFailure = () => {
    inFailureState = false;
    minigame?.setVisible(true);
    failureText.setAlpha(0);
    failureText.setText("");
    retryButtonText.setText("RETRY");
    scene.tweens.killTweensOf(failureText);
    updateRetryUi();
  };

  retryButton.on("pointerdown", () => {
    if (!inFailureState || !retryHandler) return;
    const nextLabel = "Retrying...";
    retryButtonText.setText(nextLabel);
    retryHintText.setText("Restarting preload...");
    const handler = retryHandler;
    retryHandler = null;
    updateRetryUi();
    handler();
  });

  if (!minigame) {
    const sep2 = scene.add.graphics();
    sep2.lineStyle(1, COL.borderDim, 0.65);
    sep2.lineBetween(80, H - 82, W - 80, H - 82);
    objects.push(sep2);
  }

  // The approved raster board already supplies the loading-screen atmosphere.
  if (!minigame) {
    const particleTween = createLoadingParticles(scene, W, H, objects);
    tweens.push(particleTween);
  }

  // Preserve the legacy procedural ambience only on the legacy loader.
  if (!minigame) {
    const barAreaGlow = scene.add.graphics();
    barAreaGlow.fillStyle(UI_COLORS.cardSel, 0.15);
    barAreaGlow.fillRoundedRect(barX - 20, barY - 60, barW + 40, barH + 100, 12);
    objects.unshift(barAreaGlow);
  }

  if (minigame) {
    for (const object of objects) {
      object.x = layoutOffsetX + object.x * layoutScale;
      object.y = layoutOffsetY + object.y * layoutScale;
      object.scaleX *= layoutScale;
      object.scaleY *= layoutScale;
    }
  }

  const board = minigameConfig.layout.board;
  const presentationScale = minigame ? board.presentationScale : 1;
  const gridWidth = (
    board.columns * board.cellSize
    + (board.columns - 1) * board.cellGap
  );
  const visibleFrameWidth = board.frameCrop
    ? board.width * board.frameCrop.width / board.frameCrop.sourceWidth
    : board.width;
  const horizontalExtent = Math.max(
    visibleFrameWidth / 2,
    board.counterX + board.counterWidth / 2,
    gridWidth / 2,
  ) * presentationScale;
  const verticalExtent = Math.max(
    board.frameCrop
      ? board.height * board.frameCrop.height
        / board.frameCrop.sourceHeight / 2
      : board.height / 2,
    Math.abs(board.counterY) + board.counterHeight / 2,
  ) * presentationScale;
  const leftColumnHalfWidth = Math.max(
    minigameScreen.logoMaxWidth / 2,
    minigameScreen.progressFrameWidth / 2,
  );
  const leftColumnBounds = minigame
    ? Object.freeze({
        left: layoutOffsetX + (
          minigameScreen.leftColumnX - leftColumnHalfWidth
        ) * layoutScale,
        right: layoutOffsetX + (
          minigameScreen.leftColumnX + leftColumnHalfWidth
        ) * layoutScale,
      })
    : null;
  const minigameBounds = minigame
    ? Object.freeze({
        left: layoutOffsetX + (
          board.centerX - horizontalExtent
        ) * layoutScale,
        right: layoutOffsetX + (
          board.centerX + horizontalExtent
        ) * layoutScale,
        top: layoutOffsetY + (
          board.centerY - verticalExtent
        ) * layoutScale,
        bottom: layoutOffsetY + (
          board.centerY + verticalExtent
        ) * layoutScale,
      })
    : null;
  const layout = Object.freeze({
    viewportWidth,
    viewportHeight,
    logicalWidth: W,
    logicalHeight: H,
    scale: layoutScale,
    offsetX: layoutOffsetX,
    offsetY: layoutOffsetY,
    progressPlacement: minigame ? "lower-left" : "legacy",
    progressFrameSource: minigame ? "minigame-board-loading-track" : "legacy",
    minigameBottomBar: false,
    minigameScale: minigame ? layoutScale * presentationScale : null,
    columnGap: minigame
      ? minigameBounds.left - leftColumnBounds.right
      : null,
    leftColumnBounds,
    minigameBounds,
  });

  const setProgress = (value) => {
    const clamped = Phaser.Math.Clamp(value || 0, 0, 1);
    const fillWidth = Math.max(2, barW * clamped);

    // Fill bar
    barFill.clear();
    barFill.fillStyle(COL.fill, 1);
    barFill.fillRoundedRect(barX, barY, fillWidth, barH, 4);

    // Bright leading edge highlight
    barFill.fillStyle(0xf0dfc2, 0.6);
    barFill.fillRoundedRect(barX + fillWidth - 4, barY + 2, Math.min(4, fillWidth), barH - 4, 2);

    pctText.setText(`${Math.floor(clamped * 100)}%`);
  };

  setProgress(options.progress ?? 0);

  return {
    objects,
    labelText,
    detailText,
    pctText,
    setProgress,
    setLabel: setLoadingLabel,
    setDetail: (text) => detailText.setText(text),
    setFailure: showFailure,
    clearFailure,
    setRetryHandler,
    minigame,
    layout,
    fadeOut(duration = 300, onComplete) {
      // Stop all tweens
      tweens.forEach((t) => t?.stop?.());
      minigame?.setPaused(true);
      scene.tweens.add({
        targets: minigame ? [...objects, minigame.root] : objects,
        alpha: 0,
        duration,
        ease: "Power1.in",
        onComplete: () => {
          minigame?.destroy();
          objects.forEach((object) => object?.destroy());
          onComplete?.();
        },
      });
    },
    destroy() {
      tweens.forEach((t) => t?.stop?.());
      minigame?.destroy();
      objects.forEach((object) => object?.destroy());
    },
  };
}

