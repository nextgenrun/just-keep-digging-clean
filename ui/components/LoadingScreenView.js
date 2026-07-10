import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";

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
  gold: 0xc9a227,
  fill: 0x9de3a1,
  title: UI_COLORS.title,
  shadow: UI_COLORS.dim,
  dim: "#8899aa",
  hint: "#4a5a6a",
  pct: "#9de3a1",
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
  if (options.preferLogo && scene.textures.exists(ASSET_KEYS.branding.logo)) {
    const logo = scene.add.image(W / 2, 138, ASSET_KEYS.branding.logo);
    const scale = Math.min(520 / logo.width, 160 / logo.height);
    logo.setScale(scale);
    objects.push(logo);
    return;
  }

  const title = options.title ?? "Just Keep Digging";
  const titleShadow = scene.add.text(W / 2 + 3, 183, title, {
    fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
    fontSize: "76px",
    fontStyle: "bold",
    color: COL.shadow,
  }).setOrigin(0.5).setAlpha(0.42);

  const titleText = scene.add.text(W / 2, 180, title, {
    fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
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
  const W = scene.scale?.width ?? scene.cameras.main.width;
  const H = scene.scale?.height ?? scene.cameras.main.height;
  const objects = [];
  const tweens = [];
  let retryHandler = typeof options.onRetry === "function" ? options.onRetry : null;
  let inFailureState = false;

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

  addLogoOrTitle(scene, objects, W, options);

  const subtitle = scene.add.text(W / 2, options.preferLogo ? 258 : 268, options.subtitle ?? "A L P H A", {
    fontFamily: "Consolas, monospace",
    fontSize: "18px",
    color: "#c9a227",
    letterSpacing: 5,
  }).setOrigin(0.5);
  objects.push(subtitle);

  const sep1 = scene.add.graphics();
  sep1.lineStyle(1, COL.borderBright, 0.75);
  sep1.lineBetween(220, 300, W - 220, 300);
  objects.push(sep1);

  const barW = options.barWidth ?? 600;
  const barH = options.barHeight ?? 20;
  const barX = W / 2 - barW / 2;
  const barY = options.barY ?? 405;

  const panel = scene.add.graphics();
  panel.lineStyle(1, COL.borderDim, 0.95);
  panel.fillStyle(COL.panel, 0.94);
  panel.fillRoundedRect(W / 2 - 360, barY - 72, 720, 138, 8);
  panel.strokeRoundedRect(W / 2 - 360, barY - 72, 720, 138, 8);
  panel.fillStyle(COL.panelHi, 0.035);
  panel.fillRoundedRect(W / 2 - 356, barY - 68, 712, 50, 7);
  objects.push(panel);

  const labelText = scene.add.text(W / 2, barY - 36, options.label ?? "Loading...", {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: "16px",
    color: "#c8dae8",
  }).setOrigin(0.5);
  objects.push(labelText);

  const barBg = scene.add.graphics();
  barBg.fillStyle(0x1e2a36, 1);
  barBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 5);
  barBg.lineStyle(1, COL.borderBright, 0.75);
  barBg.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 5);
  objects.push(barBg);

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

  const pctText = scene.add.text(W / 2, barY + barH + 18, "0%", {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: "15px",
    color: COL.pct,
  }).setOrigin(0.5);
  objects.push(pctText);

  const detailText = scene.add.text(W / 2, barY + 76, options.detail ?? "", {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: "14px",
    color: "#7a9ab4",
  }).setOrigin(0.5);
  objects.push(detailText);

  const failureText = scene.add.text(W / 2, barY + 118, "", {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: "14px",
    color: "#ff8f72",
    align: "center",
  }).setOrigin(0.5);
  failureText.setAlpha(0);
  objects.push(failureText);

  const retryButton = scene.add.rectangle(W / 2, barY + 156, 150, 36, 0xe07030, 0.98);
  const retryButtonText = scene.add.text(W / 2, barY + 156, "RETRY", {
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: "14px",
    fontStyle: "bold",
    color: "#ffffff",
  }).setOrigin(0.5);
  const retryHintText = scene.add.text(W / 2, barY + 182, "Press RETRY only when loading has stopped due to an error.", {
    fontFamily: "Consolas, 'Courier New', monospace",
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
    labelText.setText("Loading failed");
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

  const sep2 = scene.add.graphics();
  sep2.lineStyle(1, COL.borderDim, 0.65);
  sep2.lineBetween(80, H - 82, W - 80, H - 82);
  objects.push(sep2);

  // Floating spark particles
  const particleTween = createLoadingParticles(scene, W, H, objects);
  tweens.push(particleTween);

  // Subtle pulsing overlay rectangle behind the bar area for extra depth
  const barAreaGlow = scene.add.graphics();
  barAreaGlow.fillStyle(0x1a2a3a, 0.15);
  barAreaGlow.fillRoundedRect(barX - 20, barY - 60, barW + 40, barH + 100, 12);
  objects.unshift(barAreaGlow); // behind everything else

  const setProgress = (value) => {
    const clamped = Phaser.Math.Clamp(value || 0, 0, 1);
    const fillWidth = Math.max(2, barW * clamped);

    // Fill bar
    barFill.clear();
    barFill.fillStyle(COL.fill, 1);
    barFill.fillRoundedRect(barX, barY, fillWidth, barH, 4);

    // Bright leading edge highlight
    barFill.fillStyle(0xc0f0d0, 0.6);
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
    setLabel: (text) => labelText.setText(text),
    setDetail: (text) => detailText.setText(text),
    setFailure: showFailure,
    clearFailure,
    setRetryHandler,
    fadeOut(duration = 300, onComplete) {
      // Stop all tweens
      tweens.forEach((t) => t?.stop?.());
      scene.tweens.add({
        targets: objects,
        alpha: 0,
        duration,
        ease: "Power1.in",
        onComplete: () => {
          objects.forEach((object) => object?.destroy());
          onComplete?.();
        },
      });
    },
    destroy() {
      tweens.forEach((t) => t?.stop?.());
      objects.forEach((object) => object?.destroy());
    },
  };
}
