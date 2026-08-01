import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../../values/starlightTalentTree.js";
import { createButton } from "../PhaserUiKit.js";

function fitImage(image, maxWidth, maxHeight) {
  const width = Math.max(1, image.width || image.displayWidth || 1);
  const height = Math.max(1, image.height || image.displayHeight || 1);
  image.setScale(Math.min(maxWidth / width, maxHeight / height));
  return image;
}

export function addStarlightFoundation(view, parent) {
  const bounds = view.contentBounds;
  const pageBounds = view.pageBounds;
  const layout = STARLIGHT_TALENT_TREE_CONFIG.layout;
  const underlay = layout.foundationUnderlayEnabled
    ? view.scene.add.image(
        pageBounds.x + pageBounds.width / 2,
        pageBounds.y + pageBounds.height / 2,
        ASSET_KEYS.ui.starlightTalentTree.ultrawideFoundation,
      )
    : null;
  underlay?.setCrop(
    underlay.width * layout.foundationUnderlayCropXFraction,
    underlay.height * layout.foundationUnderlayCropYFraction,
    underlay.width * layout.foundationUnderlayCropWidthFraction,
    underlay.height * layout.foundationUnderlayCropHeightFraction,
  ).setDisplaySize(pageBounds.width, pageBounds.height)
    .setAlpha(layout.foundationUnderlayAlpha);
  const background = view.scene.add.image(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    ASSET_KEYS.ui.starlightTalentTree.ultrawideFoundation,
  ).setDisplaySize(bounds.width, bounds.height);
  parent.add([underlay, background].filter(Boolean));
  return { underlay, background };
}

export function addStarlightPageIdentity(
  view,
  parent,
  {
    title,
    status,
    titleColor = UI_COLORS.title,
    statusColor = UI_COLORS.body,
  },
) {
  const layout = STARLIGHT_TALENT_TREE_CONFIG.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const titleText = view.scene.add.text(
    bounds.x + bounds.width * layout.branchHeaderXFraction,
    bounds.y + layout.branchHeaderOffsetYPx * scale,
    title,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${Math.max(
        layout.branchHeaderMinimumFontSizePx,
        Math.round(layout.branchHeaderFontSizePx * scale),
      )}px`,
      fontStyle: "bold",
      color: titleColor,
      align: "center",
      stroke: "#02060A",
      strokeThickness: Math.max(1, Math.round(2 * scale)),
    },
  ).setOrigin(0.5);
  const statusX = bounds.x + bounds.width * layout.branchStatusXFraction;
  const statusY = bounds.y + layout.branchStatusOffsetYPx * scale;
  const statusSeal = layout.branchStatusSealEnabled
    ? fitImage(
        view.scene.add.image(
          statusX,
          statusY,
          ASSET_KEYS.ui.starlightTalentTree.statusSeal,
        ),
        layout.branchStatusWidthPx * scale,
        layout.branchStatusHeightPx * scale,
      )
    : null;
  const statusText = view.scene.add.text(
    statusX,
    statusY,
    status,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${Math.max(
        layout.branchStatusMinimumFontSizePx,
        Math.round(layout.branchStatusFontSizePx * scale),
      )}px`,
      fontStyle: "bold",
      color: statusColor,
      align: "center",
      wordWrap: {
        width: layout.branchStatusWidthPx
          * scale
          * layout.branchStatusTextWidthFraction,
        useAdvancedWrap: true,
      },
      stroke: "#02060A",
      strokeThickness: 1,
    },
  ).setOrigin(0.5);
  parent.add([titleText, statusSeal, statusText].filter(Boolean));
  return { titleText, statusSeal, statusText };
}

export function getCarouselSlot(itemIndex, selectedIndex, itemCount) {
  const forward = (itemIndex - selectedIndex + itemCount) % itemCount;
  if (forward === 0) return 1;
  if (forward === 1) return 2;
  if (forward === itemCount - 1) return 0;
  return -1;
}

export function createStarlightCarouselChrome({
  view,
  parent,
  onMove,
}) {
  const layout = STARLIGHT_TALENT_TREE_CONFIG.layout;
  const textures = ASSET_KEYS.ui.starlightTalentTree;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const arrowY = bounds.y + layout.carouselArrowOffsetYPx * scale;
  const arrowRoots = layout.carouselArrowXFractions.map((fraction, index) => {
    const button = createButton(view.scene, {
      x: bounds.x + bounds.width * fraction,
      y: arrowY,
      width: layout.carouselArrowSizePx * scale,
      height: layout.carouselArrowSizePx * scale,
      label: "",
      autoIcon: false,
      visibleChrome: false,
      parent,
      onClick: () => onMove(index === 0 ? -1 : 1),
    });
    const image = fitImage(
      view.scene.add.image(
        0,
        0,
        index === 0 ? textures.carouselLeft : textures.carouselRight,
      ),
      layout.carouselArrowSizePx * scale,
      layout.carouselArrowSizePx * scale,
    ).setAlpha(layout.carouselArrowIdleAlpha);
    button.root.add(image);
    button.hit.on("pointerover", () => {
      view.scene.tweens.killTweensOf(image);
      view.scene.tweens.add({
        targets: image,
        x: (index === 0 ? -1 : 1)
          * layout.carouselArrowHoverTravelPx
          * scale,
        alpha: 1,
        duration: layout.pageTabTweenMs,
        ease: "Sine.Out",
      });
    });
    button.hit.on("pointerout", () => {
      view.scene.tweens.killTweensOf(image);
      view.scene.tweens.add({
        targets: image,
        x: 0,
        alpha: layout.carouselArrowIdleAlpha,
        duration: layout.pageTabTweenMs,
        ease: "Sine.Out",
      });
    });
    return { button, image };
  });

  return {
    arrowRoots,
    destroy() {
      arrowRoots.forEach(({ button, image }) => {
        view.scene.tweens?.killTweensOf?.(image);
        button.destroy();
      });
    },
  };
}
