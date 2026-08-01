import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../../values/starlightTalentTree.js";

function scaledFont(base, minimum, scale) {
  return Math.max(minimum, Math.round(base * scale));
}

export function createStarlightPauseTalentChrome(view) {
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const isPause = view.mode === "pause";
  const titleCopy = isPause ? "PAUSED" : "STAR PILLAR";
  const subtitleCopy = isPause
    ? "Run controls, progression, and settings"
    : cfg.copy.pillarHint;
  const root = view.scene.add.container(0, 0);
  const centerX = bounds.x + bounds.width / 2;

  const title = view.scene.add.text(
    centerX,
    bounds.y + layout.pauseHeaderTitleOffsetYPx * scale,
    titleCopy,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.pauseHeaderTitleFontSizePx,
        layout.pauseHeaderTitleMinimumFontSizePx,
        scale,
      )}px`,
      fontStyle: "bold",
      color: UI_COLORS.title,
      align: "center",
      letterSpacing: layout.pauseHeaderTitleLetterSpacingPx * scale,
      stroke: "#02060A",
      strokeThickness: Math.max(2, Math.round(3 * scale)),
      shadow: {
        offsetX: 0,
        offsetY: Math.max(1, Math.round(2 * scale)),
        color: "#000000",
        blur: Math.max(2, Math.round(4 * scale)),
        fill: true,
      },
    },
  ).setOrigin(0.5);
  const subtitle = view.scene.add.text(
    centerX,
    bounds.y + layout.pauseHeaderSubtitleOffsetYPx * scale,
    subtitleCopy,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.pauseHeaderSubtitleFontSizePx,
        layout.pauseHeaderSubtitleMinimumFontSizePx,
        scale,
      )}px`,
      color: UI_COLORS.body,
      align: "center",
      stroke: "#02060A",
      strokeThickness: 1,
    },
  ).setOrigin(0.5);
  root.add([title, subtitle]);
  view.root.add(root);

  if (isPause && view.onPauseMenu) {
    title.setInteractive({ useHandCursor: true });
    title.on("pointerover", () => {
      subtitle.setText("Click PAUSED to return to the ESC menu");
      subtitle.setColor(UI_COLORS.gold);
    });
    title.on("pointerout", () => {
      subtitle.setText(subtitleCopy);
      subtitle.setColor(UI_COLORS.body);
    });
    title.on("pointerdown", () => view.onPauseMenu?.());
  }

  return {
    root,
    title,
    subtitle,
    destroy() {
      title.removeAllListeners?.();
      root.destroy(true);
    },
  };
}
