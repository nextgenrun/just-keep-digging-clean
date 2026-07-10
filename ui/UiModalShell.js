import { UI_COLORS } from "../values/uiColors.js";
import { UI_FONTS, UI_MODAL_LAYOUT } from "../values/uiLayout.js";
import { createButton } from "./PhaserUiKit.js";
import { createUiIcon } from "./UiIconAtlas.js";

export function getUiViewport(scene) {
  return {
    width: Math.max(320, scene?.scale?.width || scene?.config?.viewportWidth || 1280),
    height: Math.max(240, scene?.scale?.height || scene?.config?.viewportHeight || 720),
  };
}

export function fitUiModal(scene, maxWidth = 980, maxHeight = 640, options = {}) {
  const viewport = getUiViewport(scene);
  const margin = viewport.width < 760 ? UI_MODAL_LAYOUT.compactMargin : UI_MODAL_LAYOUT.margin;
  const width = Math.max(280, Math.min(maxWidth, viewport.width - margin * 2));
  const height = Math.max(220, Math.min(maxHeight, viewport.height - margin * 2));
  const align = options.align || "center";
  const x = align === "left"
    ? margin + width / 2
    : align === "right"
      ? viewport.width - margin - width / 2
      : viewport.width / 2;
  return { x, y: viewport.height / 2, width, height, viewport, margin };
}

function drawShell(shell) {
  const width = shell.width;
  const height = shell.height;
  const left = -width / 2;
  const top = -height / 2;
  const headerBottom = top + UI_MODAL_LAYOUT.headerHeight;

  shell.panel.clear();
  shell.panel.fillStyle(UI_COLORS.bg, 0.985);
  shell.panel.fillRoundedRect(left, top, width, height, UI_MODAL_LAYOUT.cornerRadius);
  shell.panel.fillStyle(UI_COLORS.cardBase, 0.96);
  shell.panel.fillRoundedRect(left + 2, top + 2, width - 4, UI_MODAL_LAYOUT.headerHeight - 2, UI_MODAL_LAYOUT.cornerRadius - 2);
  shell.panel.fillStyle(UI_COLORS.cardSel, 0.28);
  shell.panel.fillRoundedRect(left + 10, top + 10, width - 20, UI_MODAL_LAYOUT.headerHeight - 20, UI_MODAL_LAYOUT.cardRadius);
  shell.panel.lineStyle(2, UI_COLORS.borderSel, 0.96);
  shell.panel.strokeRoundedRect(left, top, width, height, UI_MODAL_LAYOUT.cornerRadius);
  shell.panel.lineStyle(1, UI_COLORS.borderDim, 0.95);
  shell.panel.strokeRoundedRect(left + 7, top + 7, width - 14, height - 14, UI_MODAL_LAYOUT.cardRadius);
  shell.panel.fillStyle(UI_COLORS.gold, 0.95);
  shell.panel.fillRoundedRect(left + 15, top + 17, 5, UI_MODAL_LAYOUT.headerHeight - 34, 3);
  shell.panel.lineStyle(1, UI_COLORS.borderDim, 0.9);
  shell.panel.lineBetween(left + 16, headerBottom, -left - 16, headerBottom);

  const iconOffset = shell.icon ? 62 : 0;
  shell.titleText.setPosition(left + 30 + iconOffset, top + 25);
  shell.subtitleText.setPosition(left + 30 + iconOffset, top + 52);
  shell.icon?.setPosition(left + 52, top + 41);
  shell.closeButton?.root?.setPosition(width / 2 - 42, top + 41);
  shell.content.setPosition(0, 0);
}

export function createIconBadge(scene, iconKey, options = {}) {
  const size = options.size || 52;
  const iconSize = options.iconSize || Math.round(size * 0.78);
  const root = scene.add.container(options.x || 0, options.y || 0);
  const bg = scene.add.graphics();
  bg.fillStyle(UI_COLORS.bg, 1);
  bg.fillRoundedRect(-size / 2, -size / 2, size, size, UI_MODAL_LAYOUT.cardRadius);
  bg.lineStyle(options.selected ? 2 : 1, options.selected ? UI_COLORS.borderSel : UI_COLORS.borderDim, 0.98);
  bg.strokeRoundedRect(-size / 2, -size / 2, size, size, UI_MODAL_LAYOUT.cardRadius);
  const icon = createUiIcon(scene, iconKey, { x: 0, y: 0, size: iconSize, scrollFactor: 0 });
  root.add([bg, icon].filter(Boolean));
  options.parent?.add?.(root);
  return root;
}

export function createModalShell(scene, options = {}) {
  const shell = {
    scene,
    maxWidth: options.maxWidth || 980,
    maxHeight: options.maxHeight || 640,
    align: options.align || "center",
    depth: options.depth || 3400,
    iconKey: options.icon || null,
  };
  const rect = fitUiModal(scene, shell.maxWidth, shell.maxHeight, { align: shell.align });
  shell.width = rect.width;
  shell.height = rect.height;

  shell.backdrop = scene.add.rectangle(
    rect.viewport.width / 2,
    rect.viewport.height / 2,
    rect.viewport.width,
    rect.viewport.height,
    0x020406,
    UI_MODAL_LAYOUT.backdropAlpha
  ).setScrollFactor(0).setDepth(shell.depth).setVisible(false).setInteractive();

  shell.root = scene.add.container(rect.x, rect.y)
    .setScrollFactor(0)
    .setDepth(shell.depth + 1)
    .setVisible(false);
  shell.panel = scene.add.graphics();
  shell.titleText = scene.add.text(0, 0, options.title || "", {
    fontFamily: UI_FONTS.display,
    fontSize: "24px",
    fontStyle: "bold",
    color: UI_COLORS.title,
    letterSpacing: 1.2,
  }).setOrigin(0, 0.5);
  shell.subtitleText = scene.add.text(0, 0, options.subtitle || "", {
    fontFamily: UI_FONTS.mono,
    fontSize: "12px",
    color: UI_COLORS.body,
    letterSpacing: 0.3,
  }).setOrigin(0, 0.5);
  shell.content = scene.add.container(0, 0);
  shell.root.add([shell.panel, shell.titleText, shell.subtitleText, shell.content]);

  shell.setIcon = key => {
    shell.icon?.destroy?.(true);
    shell.icon = null;
    shell.iconKey = key || null;
    if (shell.iconKey) {
      shell.icon = createIconBadge(scene, shell.iconKey, {
        size: 50,
        iconSize: 41,
        parent: shell.root,
      });
    }
    drawShell(shell);
  };

  shell.closeButton = options.showClose === false ? null : createButton(scene, {
    x: 0,
    y: 0,
    width: 44,
    height: 38,
    label: "X",
    hint: "ESC",
    accent: UI_COLORS.borderDim,
    parent: shell.root,
    fontSize: "13px",
    onClick: () => options.onClose?.(),
  });

  shell.getContentRect = () => {
    const left = -shell.width / 2 + UI_MODAL_LAYOUT.contentPadding;
    const top = -shell.height / 2 + UI_MODAL_LAYOUT.headerHeight + 14;
    const bottom = shell.height / 2 - UI_MODAL_LAYOUT.footerHeight;
    return {
      left,
      top,
      right: shell.width / 2 - UI_MODAL_LAYOUT.contentPadding,
      bottom,
      width: shell.width - UI_MODAL_LAYOUT.contentPadding * 2,
      height: bottom - top,
    };
  };

  shell.setHeader = (title, subtitle = "") => {
    shell.titleText.setText(title || "");
    shell.subtitleText.setText(subtitle || "");
  };

  shell.setMaxSize = (maxWidth, maxHeight) => {
    shell.maxWidth = maxWidth || shell.maxWidth;
    shell.maxHeight = maxHeight || shell.maxHeight;
    shell.layout();
  };

  shell.layout = () => {
    const next = fitUiModal(scene, shell.maxWidth, shell.maxHeight, { align: shell.align });
    shell.width = next.width;
    shell.height = next.height;
    shell.backdrop.setPosition(next.viewport.width / 2, next.viewport.height / 2)
      .setSize(next.viewport.width, next.viewport.height);
    shell.root.setPosition(next.x, next.y);
    drawShell(shell);
    options.onLayout?.(shell);
    return shell.getContentRect();
  };

  shell.show = () => {
    shell.layout();
    scene.tweens?.killTweensOf?.([shell.backdrop, shell.root]);
    shell.backdrop.setVisible(true).setAlpha(0);
    shell.root.setVisible(true).setAlpha(0).setScale(0.985);
    scene.tweens?.add?.({
      targets: shell.backdrop,
      alpha: UI_MODAL_LAYOUT.backdropAlpha,
      duration: UI_MODAL_LAYOUT.enterDurationMs,
      ease: "Power2.out",
    });
    scene.tweens?.add?.({
      targets: shell.root,
      alpha: 1,
      scale: 1,
      duration: UI_MODAL_LAYOUT.enterDurationMs,
      ease: "Power2.out",
    });
  };

  shell.hide = onComplete => {
    scene.tweens?.killTweensOf?.([shell.backdrop, shell.root]);
    scene.tweens?.add?.({
      targets: [shell.backdrop, shell.root],
      alpha: 0,
      duration: UI_MODAL_LAYOUT.exitDurationMs,
      ease: "Power1.in",
      onComplete: () => {
        shell.backdrop.setVisible(false);
        shell.root.setVisible(false);
        onComplete?.();
      },
    });
  };

  shell.destroy = () => {
    scene.tweens?.killTweensOf?.([shell.backdrop, shell.root]);
    shell.backdrop?.destroy?.();
    shell.root?.destroy?.(true);
  };

  if (options.dismissOnBackdrop) {
    shell.backdrop.on("pointerdown", () => options.onClose?.());
  }
  shell.setIcon(shell.iconKey);
  shell.layout();
  return shell;
}
