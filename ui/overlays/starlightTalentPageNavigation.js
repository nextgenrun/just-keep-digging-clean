import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../../values/starlightTalentTree.js";
import { createButton } from "../PhaserUiKit.js";

const PAGE_ICON_KEYS = Object.freeze({
  quickslash: ASSET_KEYS.constellations.signs.dirt,
  thunderstrike: ASSET_KEYS.constellations.signs.stone,
  engines: ASSET_KEYS.ui.starlightTalentTree.starHeart,
});

function fitImage(image, maxWidth, maxHeight) {
  const width = Math.max(1, image.width || image.displayWidth || 1);
  const height = Math.max(1, image.height || image.displayHeight || 1);
  image.setScale(Math.min(maxWidth / width, maxHeight / height));
  return image;
}

function fontSize(layout, scale) {
  return Math.max(
    layout.pageTabMinimumFontSizePx,
    Math.round(layout.pageTabFontSizePx * scale),
  );
}

export function createStarlightTalentPageNavigation(view) {
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const textures = ASSET_KEYS.ui.starlightTalentTree;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const root = view.scene.add.container(0, 0);
  const entries = cfg.pages.map((page, index) => {
    const x = bounds.x + bounds.width * layout.pageTabXFractions[index];
    const y = bounds.y + layout.pageTabYOffsetPx * scale;
    const button = createButton(view.scene, {
      x,
      y,
      width: layout.pageTabWidthPx * scale,
      height: layout.pageTabHeightPx * scale,
      label: "",
      autoIcon: false,
      visibleChrome: false,
      parent: root,
      onClick: () => view.setPage(index, { notify: true }),
    });
    const plaque = fitImage(
      view.scene.add.image(0, 0, textures.navigationPlaqueIdle),
      layout.pageTabPlaqueWidthPx * scale,
      layout.pageTabPlaqueHeightPx * scale,
    );
    const icon = fitImage(
      view.scene.add.image(
        layout.pageTabIconOffsetXPx * scale,
        0,
        PAGE_ICON_KEYS[page.id],
      ),
      layout.pageTabIconSizePx * scale,
      layout.pageTabIconSizePx * scale,
    );
    const label = view.scene.add.text(
      layout.pageTabLabelOffsetXPx * scale,
      0,
      page.label,
      {
        fontFamily: UI_FONTS.display,
        fontSize: `${fontSize(layout, scale)}px`,
        fontStyle: "bold",
        color: UI_COLORS.body,
        align: "center",
        stroke: "#02060A",
        strokeThickness: Math.max(1, Math.round(2 * scale)),
        shadow: {
          offsetX: 0,
          offsetY: Math.max(1, Math.round(2 * scale)),
          color: "#000000",
          blur: Math.max(1, Math.round(3 * scale)),
          fill: true,
        },
      },
    ).setOrigin(0.5);
    button.root.add([plaque, icon, label]);
    return {
      button,
      plaque,
      plaqueScaleX: plaque.scaleX,
      plaqueScaleY: plaque.scaleY,
      icon,
      iconScaleX: icon.scaleX,
      iconScaleY: icon.scaleY,
      label,
    };
  });
  view.root.add(root);

  let currentActiveIndex = null;
  function setActive(activeIndex) {
    if (currentActiveIndex === activeIndex) return;
    currentActiveIndex = activeIndex;
    entries.forEach((entry, index) => {
      const selected = index === activeIndex;
      entry.button.setSelected(selected);
      entry.plaque.setTexture(
        selected ? textures.navigationPlaqueSelected : textures.navigationPlaqueIdle,
      );
      view.scene.tweens?.killTweensOf?.(entry.plaque);
      view.scene.tweens?.killTweensOf?.(entry.icon);
      entry.label.setColor(selected ? UI_COLORS.title : UI_COLORS.body);
      entry.label.setAlpha(selected ? 1 : layout.pageTabIdleAlpha);
      entry.icon.setAlpha(selected ? 1 : layout.pageTabIdleAlpha);
      entry.plaque.setAlpha(selected ? 1 : layout.pageTabIdleAlpha);
      const stateScale = selected
        ? layout.pageTabSelectedScale
        : layout.pageTabIdleScale;
      view.scene.tweens.add({
        targets: entry.plaque,
        scaleX: entry.plaqueScaleX * stateScale,
        scaleY: entry.plaqueScaleY * stateScale,
        duration: layout.pageTabTweenMs,
        ease: "Sine.Out",
      });
      view.scene.tweens.add({
        targets: entry.icon,
        scaleX: entry.iconScaleX * stateScale,
        scaleY: entry.iconScaleY * stateScale,
        duration: layout.pageTabTweenMs,
        ease: "Sine.Out",
      });
    });
  }

  return {
    root,
    entries,
    setActive,
    destroy() {
      entries.forEach(entry => {
        view.scene.tweens?.killTweensOf?.(entry.plaque);
        view.scene.tweens?.killTweensOf?.(entry.icon);
        entry.button.destroy();
      });
      root.destroy(true);
    },
  };
}
