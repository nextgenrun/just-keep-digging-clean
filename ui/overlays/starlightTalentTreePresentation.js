import { ASSET_KEYS } from "../../values/assetKeys.js";
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
import { createStarlightTalentNode } from "./StarlightTalentNode.js";

function addNode(view, parent, resourceType, x, y, width, height) {
  const status = view.statuses[resourceType];
  const index = STARLIGHT_TALENT_RESOURCE_ORDER.indexOf(resourceType);
  const control = createStarlightTalentNode({
    scene: view.scene,
    parent,
    x,
    y,
    width,
    height,
    layoutScale: view.layoutScale,
    resourceType,
    textureKey: ASSET_KEYS.constellations.signs[resourceType],
    accent: status.lineColor,
    status,
    index,
    onPress: nextIndex => {
      view.selectControl(nextIndex);
      view.onFocus?.(nextIndex);
    },
  });
  view.nodeControls[index] = control;
  view.controls[index] = control;
  return control;
}

export function buildStarlightTalentBranchPage(view, branch, pageIndex, parent) {
  const cfg = STARLIGHT_TALENT_TREE_CONFIG;
  const layout = cfg.layout;
  const scale = view.layoutScale;
  const bounds = view.contentBounds;
  const page = cfg.pages[pageIndex];
  const abilityUnlocked = view.abilityAccess?.[branch.id]?.unlocked === true;
  const firstReveal = Boolean(
    view.firstRevealResource
    && branch.resourceTypes.includes(view.firstRevealResource),
  );

  addStarlightFoundation(view, parent);
  const identity = addStarlightPageIdentity(view, parent, {
    title: `SIGN 1 / ${page.itemCount}`,
    status: firstReveal
      ? cfg.copy.firstStar
      : abilityUnlocked
        ? cfg.copy.abilityOwned
        : cfg.copy.boboLocked,
    titleColor: branch.cssAccent,
    statusColor: firstReveal
      ? UI_COLORS.success
      : abilityUnlocked
        ? UI_COLORS.success
        : UI_COLORS.danger,
  });

  const rowY = bounds.y + layout.nodeRowOffsetYPx * scale;
  const nodeWidth = layout.nodeWidthPx * scale;
  const nodeHeight = layout.nodeHeightPx * scale;
  const controls = branch.resourceTypes.map(resourceType => addNode(
    view,
    parent,
    resourceType,
    bounds.x + bounds.width / 2,
    rowY,
    nodeWidth,
    nodeHeight,
  ));
  const carousel = createStarlightCarouselChrome({
    view,
    parent,
    onMove: direction => {
      const selected = view.moveSelection(direction, 0);
      view.onFocus?.(selected);
    },
  });

  let visibleCardCount = 0;
  let currentSelectedOffset = null;
  const state = {
    branch,
    nodeWidth,
    nodeHeight,
    get visibleCardCount() {
      return visibleCardCount;
    },
    setSelected(selectedOffset, options = {}) {
      if (currentSelectedOffset === selectedOffset && !options.immediate) return;
      currentSelectedOffset = selectedOffset;
      identity.titleText.setText(`SIGN ${selectedOffset + 1} / ${page.itemCount}`);
      visibleCardCount = 0;
      controls.forEach((control, index) => {
        const slotIndex = getCarouselSlot(
          index,
          selectedOffset,
          branch.resourceTypes.length,
        );
        const visible = slotIndex >= 0;
        if (visible) visibleCardCount += 1;
        const centered = slotIndex === layout.carouselCenterSlotIndex;
        control.setSelected(index === selectedOffset);
        control.setCarouselSlot({
          visible,
          x: visible
            ? bounds.x + bounds.width * layout.carouselSlotXFractions[slotIndex]
            : bounds.x + bounds.width / 2,
          y: rowY,
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
  view.branchPageStates[pageIndex] = state;
}
