import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
} from "../../values/celestialEngines.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../../values/starlightTalentTree.js";
import { createButton } from "../PhaserUiKit.js";

const ENGINE_TEXTURES = Object.freeze({
  [CELESTIAL_ENGINE_IDS.WAYWARD_STAR]: ASSET_KEYS.ui.starlightTalentTree.waywardStar,
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN]: ASSET_KEYS.ui.starlightTalentTree.hollowSun,
  [CELESTIAL_ENGINE_IDS.COMET_ENGINE]: ASSET_KEYS.ui.starlightTalentTree.cometEngine,
});

function fitImage(image, maxWidth, maxHeight) {
  const width = Math.max(1, image.width || image.displayWidth || 1);
  const height = Math.max(1, image.height || image.displayHeight || 1);
  image.setScale(Math.min(maxWidth / width, maxHeight / height));
  return image;
}

function scaledFont(base, minimum, scale) {
  return Math.max(minimum, Math.round(base * scale));
}

export function createStarlightEngineOptionCard({
  scene,
  parent,
  engineId,
  index,
  x,
  y,
  width,
  height,
  layoutScale = 1,
  snapshot,
  onPress,
}) {
  const layout = STARLIGHT_TALENT_TREE_CONFIG.layout;
  const copy = STARLIGHT_TALENT_TREE_CONFIG.copy;
  const textures = ASSET_KEYS.ui.starlightTalentTree;
  const definition = CELESTIAL_ENGINE_CONFIG.engines[engineId];
  const owned = snapshot.godMode || snapshot.unlockedEngines.includes(engineId);
  const equipped = snapshot.selectedEngine === engineId;
  const available = snapshot.godMode || snapshot.availableHearts > 0;
  const status = equipped
    ? copy.engineEquipped
    : snapshot.godMode
      ? copy.engineGodMode
      : owned
        ? copy.engineOwned
        : available
          ? copy.engineAvailable
          : copy.engineLocked;
  const button = createButton(scene, {
    x,
    y,
    width,
    height,
    label: "",
    autoIcon: false,
    accent: definition.accent,
    visibleChrome: false,
    parent,
    onClick: () => onPress?.(engineId, index),
  });

  const artY = layout.engineArtOffsetYPx * layoutScale;
  const selectedHalo = fitImage(
    scene.add.image(0, artY, textures.nodeSelected),
    layout.engineSelectionHaloPx * layoutScale,
    layout.engineSelectionHaloPx * layoutScale,
  ).setVisible(equipped).setAlpha(equipped ? 0.55 : 0);
  const art = fitImage(
    scene.add.image(0, artY, ENGINE_TEXTURES[engineId]),
    layout.engineArtMaxPx * layoutScale,
    layout.engineArtMaxPx * layoutScale,
  ).setAlpha(owned || available ? 1 : layout.engineLockedAlpha);
  if (!owned && !available) art.setTint(layout.engineLockedTint);
  const ribbon = fitImage(
    scene.add.image(
      0,
      layout.engineRibbonOffsetYPx * layoutScale,
      textures.talentRibbonIdle,
    ),
    layout.engineRibbonWidthPx * layoutScale,
    layout.engineRibbonHeightPx * layoutScale,
  );
  const name = scene.add.text(
    0,
    layout.engineNameOffsetYPx * layoutScale,
    definition.shortName,
    {
      fontFamily: UI_FONTS.display,
      fontSize: `${scaledFont(
        layout.engineNameFontSizePx,
        layout.engineNameMinimumFontSizePx,
        layoutScale,
      )}px`,
      fontStyle: "bold",
      color: owned || available ? UI_COLORS.title : UI_COLORS.dim,
      align: "center",
      stroke: "#02060A",
      strokeThickness: Math.max(1, Math.round(2 * layoutScale)),
    },
  ).setOrigin(0.5);
  const roleAndState = scene.add.text(
    0,
    layout.engineStatusOffsetYPx * layoutScale,
    `${definition.role}  •  ${status}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: `${scaledFont(
        layout.engineStatusFontSizePx,
        layout.engineStatusMinimumFontSizePx,
        layoutScale,
      )}px`,
      color: equipped
        ? UI_COLORS.gold
        : owned
          ? UI_COLORS.success
          : definition.cssAccent,
      align: "center",
      stroke: "#02060A",
      strokeThickness: 1,
    },
  ).setOrigin(0.5);
  button.root.add([selectedHalo, art, ribbon, name, roleAndState]);
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
  button.engineId = engineId;
  button.setSelected = value => {
    const selected = Boolean(value);
    setButtonSelected(selected);
    selectedHalo.setVisible(selected || equipped);
    selectedHalo.setAlpha(selected ? 1 : equipped ? 0.55 : 0);
    ribbon.setTexture(
      selected ? textures.talentRibbonSelected : textures.talentRibbonIdle,
    ).setDisplaySize(
      layout.engineRibbonWidthPx * layoutScale,
      layout.engineRibbonHeightPx * layoutScale,
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
    roleAndState.setVisible(centered);
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
    scene.tweens?.killTweensOf?.(selectedHalo);
    destroyButton();
  };
  return button;
}
