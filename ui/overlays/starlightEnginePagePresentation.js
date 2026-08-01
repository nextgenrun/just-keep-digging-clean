import { CELESTIAL_ENGINE_ORDER } from "../../values/celestialEngines.js";
import { UI_COLORS } from "../../values/uiColors.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../../values/starlightTalentTree.js";
import {
  addStarlightFoundation,
  addStarlightPageIdentity,
  createStarlightCarouselChrome,
  getCarouselSlot,
} from "./starlightCarouselPresentation.js";
import { createStarlightEngineOptionCard } from "./StarlightEngineOptionCard.js";

function getPageStatus(view) {
  if (view.snapshot.godMode) return "GOD MODE";
  if (view.snapshot.allEnginesUnlocked) return "3 / 3 MASTERED";
  if (view.snapshot.availableHearts > 0) {
    return `${view.snapshot.availableHearts} HEART READY`;
  }
  return `${view.snapshot.engineCount || 0} / 3 OWNED`;
}

export function buildStarlightEnginePage(view, parent) {
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const page = cfg.pages[2];
  addStarlightFoundation(view, parent);
  const identity = addStarlightPageIdentity(view, parent, {
    title: `ENGINE 1 / ${page.itemCount}`,
    status: getPageStatus(view),
    titleColor: UI_COLORS.gold,
    statusColor: view.snapshot.godMode || view.snapshot.availableHearts > 0
      ? UI_COLORS.gold
      : UI_COLORS.body,
  });

  const cardY = bounds.y + layout.nodeRowOffsetYPx * scale;
  const cardWidth = layout.engineCardWidthPx * scale;
  const cardHeight = layout.engineCardHeightPx * scale;
  const controls = CELESTIAL_ENGINE_ORDER.map((engineId, index) => {
    const controlIndex = STARLIGHT_TALENT_RESOURCE_ORDER.length + index;
    const control = createStarlightEngineOptionCard({
      scene: view.scene,
      parent,
      engineId,
      index,
      x: bounds.x + bounds.width / 2,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      layoutScale: scale,
      snapshot: view.snapshot,
      onPress: selectedEngineId => {
        const wasCentered = view.selectedControlIndex === controlIndex;
        view.selectControl(controlIndex);
        view.onFocus?.(controlIndex);
        if (wasCentered) view.onEngineAction?.(selectedEngineId);
      },
    });
    view.engineControls[index] = control;
    view.controls[controlIndex] = control;
    return control;
  });
  const carousel = createStarlightCarouselChrome({
    view,
    parent,
    onMove: direction => {
      const selected = view.moveSelection(direction, 0);
      view.onFocus?.(selected);
    },
  });

  let currentSelectedOffset = null;
  view.enginePageState = {
    setSelected(selectedOffset, options = {}) {
      if (currentSelectedOffset === selectedOffset && !options.immediate) return;
      currentSelectedOffset = selectedOffset;
      identity.titleText.setText(`ENGINE ${selectedOffset + 1} / ${page.itemCount}`);
      controls.forEach((control, index) => {
        const slotIndex = getCarouselSlot(
          index,
          selectedOffset,
          CELESTIAL_ENGINE_ORDER.length,
        );
        const centered = slotIndex === layout.carouselCenterSlotIndex;
        control.setSelected(index === selectedOffset);
        control.setCarouselSlot({
          visible: slotIndex >= 0,
          x: bounds.x + bounds.width * layout.carouselSlotXFractions[slotIndex],
          y: cardY,
          scale: centered
            ? layout.carouselCenterScale
            : layout.carouselFlankScale,
          alpha: centered ? 1 : layout.carouselFlankAlpha,
          centered,
          immediate: options.immediate === true,
        });
      });
    },
    destroy() {
      carousel.destroy();
    },
  };
}
