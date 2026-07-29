import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../../values/starlightTalentTree.js";
import { createButton } from "../PhaserUiKit.js";

function fitImage(image, maxWidth, maxHeight) {
  const sourceWidth = Math.max(1, image.width || image.displayWidth || 1);
  const sourceHeight = Math.max(1, image.height || image.displayHeight || 1);
  image.setScale(Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight));
  return image;
}

function scaledFont(base, minimum, scale) {
  return Math.max(minimum, Math.round(base * scale));
}

export function createStarlightTalentNode({
  scene,
  parent,
  x,
  y,
  width,
  height,
  layoutScale = 1,
  resourceType,
  textureKey,
  accent,
  status,
  index,
  onPress,
}) {
  const layout = STARLIGHT_TALENT_TREE_CONFIG.layout;
  const resource = STARLIGHT_TALENT_TREE_CONFIG.resources[resourceType];
  const mastered = status.state === "mastered";
  const locked = status.state === "locked" || status.abilityLocked;
  const textures = ASSET_KEYS.ui.starlightTalentTree;
  const frameKey = status.abilityLocked
    ? textures.nodeLocked
    : status.abilityId === "thunderstrike"
      ? textures.nodeThunderstrike
      : textures.nodeQuickslash;
  const button = createButton(scene, {
    x,
    y,
    width,
    height,
    label: "",
    autoIcon: false,
    accent,
    visibleChrome: false,
    parent,
    onClick: () => onPress?.(index),
  });

  const selectedHalo = fitImage(
    scene.add.image(0, 0, textures.nodeSelected),
    width + layout.nodeSelectionPaddingPx * layoutScale,
    height + layout.nodeSelectionPaddingPx * layoutScale,
  ).setVisible(false);
  const frame = fitImage(scene.add.image(0, 0, frameKey), width, height);
  const art = fitImage(
    scene.add.image(0, layout.nodeArtOffsetYPx * layoutScale, textureKey),
    layout.nodeArtMaxWidthPx * layoutScale,
    layout.nodeArtMaxHeightPx * layoutScale,
  );
  art.setAlpha(status.abilityLocked ? 0.2 : mastered ? 1 : status.hasAny ? 0.78 : 0.3);
  if (locked) art.setTint(0x526478);

  const lockIcon = status.abilityLocked
    ? fitImage(
        scene.add.image(
          layout.nodeLockOffsetXPx,
          layout.nodeLockOffsetYPx * layoutScale,
          textures.boboLock,
        ),
        layout.nodeLockSizePx * layoutScale,
        layout.nodeLockSizePx * layoutScale,
      )
    : null;
  const ribbon = fitImage(
    scene.add.image(
      0,
      layout.nodeRibbonOffsetYPx * layoutScale,
      textures.talentRibbonIdle,
    ),
    layout.nodeRibbonWidthPx * layoutScale,
    layout.nodeRibbonHeightPx * layoutScale,
  );
  const name = scene.add.text(
    0,
    layout.nodeNameOffsetYPx * layoutScale,
    resource.shortName,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.nodeNameFontSizePx,
        layout.nodeNameMinimumFontSizePx,
        layoutScale,
      )}px`,
      fontStyle: "bold",
      color: status.abilityLocked
        ? UI_COLORS.danger
        : locked
          ? UI_COLORS.dim
          : status.cssColor,
      align: "center",
      stroke: layout.nodeTextStrokeColor,
      strokeThickness: Math.max(
        1,
        Math.round(layout.nodeTextStrokeThicknessPx * layoutScale),
      ),
    },
  ).setOrigin(0.5);
  const progress = scene.add.text(
    0,
    layout.nodeProgressOffsetYPx * layoutScale,
    status.shortLabel,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.nodeProgressFontSizePx,
        layout.nodeProgressMinimumFontSizePx,
        layoutScale,
      )}px`,
      color: status.statusColor,
      align: "center",
      stroke: layout.nodeTextStrokeColor,
      strokeThickness: Math.max(
        1,
        Math.round(layout.nodeTextStrokeThicknessPx * layoutScale),
      ),
    },
  ).setOrigin(0.5);

  button.root.add([
    selectedHalo,
    frame,
    art,
    lockIcon,
    ribbon,
    name,
    progress,
  ].filter(Boolean));
  button.root.setVisible(false).setAlpha(0);

  let pageVisible = false;
  let carouselVisible = false;
  let laidOut = false;
  let effectiveVisible = false;

  function syncVisibility() {
    const visible = pageVisible && carouselVisible;
    if (visible === effectiveVisible) return;
    effectiveVisible = visible;
    button.root.setVisible(visible);
    button.hit.disableInteractive();
    if (visible) button.hit.setInteractive({ useHandCursor: true });
  }

  const destroyButton = button.destroy.bind(button);
  const setButtonSelected = button.setSelected.bind(button);
  button.resourceType = resourceType;
  button.setSelected = value => {
    const selected = Boolean(value);
    setButtonSelected(selected);
    selectedHalo.setVisible(selected);
    ribbon.setTexture(
      selected ? textures.talentRibbonSelected : textures.talentRibbonIdle,
    ).setDisplaySize(
      layout.nodeRibbonWidthPx * layoutScale,
      layout.nodeRibbonHeightPx * layoutScale,
    );
  };
  button.setCarouselSlot = slot => {
    carouselVisible = Boolean(slot?.visible);
    syncVisibility();
    scene.tweens?.killTweensOf?.(button.root);
    if (!carouselVisible) {
      button.root.setAlpha(0);
      return;
    }
    const centered = Boolean(slot.centered);
    ribbon.setAlpha(centered ? 1 : layout.carouselFlankLabelAlpha);
    name.setAlpha(centered ? 1 : layout.carouselFlankLabelAlpha);
    progress.setVisible(centered);
    if (!laidOut || slot.immediate) {
      button.root
        .setPosition(slot.x, slot.y)
        .setScale(slot.scale)
        .setAlpha(slot.alpha);
      laidOut = true;
      return;
    }
    scene.tweens.add({
      targets: button.root,
      x: slot.x,
      y: slot.y,
      scaleX: slot.scale,
      scaleY: slot.scale,
      alpha: slot.alpha,
      duration: layout.carouselTweenMs,
      ease: "Sine.Out",
    });
  };
  button.setPageVisible = value => {
    const nextVisible = Boolean(value);
    if (pageVisible === nextVisible) return;
    pageVisible = nextVisible;
    syncVisibility();
  };
  button.destroy = () => {
    scene.tweens?.killTweensOf?.(button.root);
    scene.tweens?.killTweensOf?.(art);
    if (lockIcon) scene.tweens?.killTweensOf?.(lockIcon);
    destroyButton();
  };
  return button;
}
