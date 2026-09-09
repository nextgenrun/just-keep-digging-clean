import { PLAYER_HINT_CONFIG as CONFIG } from "../../values/playerHints.js";
import { GAME_WIKI } from "../../values/gameWiki.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { getPlayerHintEntries } from "../../systems/onboarding/playerHintContext.js";
import { openGameWiki } from "../../systems/visual/gameWikiLink.js";
import { createButton } from "../PhaserUiKit.js";

// A paged, keyboard-accessible field guide on the existing approved pause art.
export function createHintsPanelContent(scene, options) {
  const { x, y, width, height, parent, onControlsChanged, onFocus } = options;
  const layout = CONFIG.layout;
  const entries = getPlayerHintEntries(scene);
  const root = scene.add.container(0, 0);
  parent.add(root);
  const rows = Math.max(1, Math.min(layout.maxRows, Math.floor(
    (height - layout.headerHeight - layout.footerHeight) / (layout.rowHeight + layout.rowGap),
  )));
  const pages = Math.ceil(entries.length / rows);
  const listWidth = Math.min(layout.listMaxWidth, width * layout.listRatio);
  const detailX = x + listWidth + layout.gap;
  const detailWidth = width - listWidth - layout.gap - layout.inset;
  let page = 0;
  let selected = 0;
  let controls = [];

  function text(tx, ty, value, size, color, wrapWidth) {
    const object = scene.add.text(tx, ty, value, {
      fontFamily: UI_FONTS.body, fontSize: `${size}px`, color,
      wordWrap: { width: wrapWidth }, lineSpacing: layout.lineSpacing,
    });
    root.add(object);
    return object;
  }

  function button(bx, by, bw, label, action, selectedButton = false) {
    const index = controls.length;
    const control = createButton(scene, {
      x: bx, y: by, width: bw, height: layout.buttonHeight,
      label, skinKey: CONFIG.skinKey, autoIcon: false,
      fontSize: `${layout.listSize}px`, parent: root, depth: layout.depth,
      selected: selectedButton, onClick: action, onFocus: () => onFocus?.(index),
    });
    controls.push(control);
    return control;
  }

  function render(focusIndex = 0) {
    root.removeAll(true);
    controls = [];
    const hint = entries[selected];
    text(x + layout.inset, y, CONFIG.copy.title, layout.titleSize, UI_COLORS.gold, width);
    text(x + layout.inset, y + layout.bodyGap, CONFIG.copy.subtitle, layout.smallSize, UI_COLORS.info, width);
    const listY = y + layout.headerHeight;
    entries.slice(page * rows, (page + 1) * rows).forEach((entry, index) => {
      const entryIndex = page * rows + index;
      button(x + listWidth / 2, listY + index * (layout.rowHeight + layout.rowGap) + layout.buttonHeight / 2,
        listWidth, entry.title, () => { selected = entryIndex; render(index); }, selected === entryIndex);
    });
    const footerY = y + height - layout.buttonHeight / 2;
    const pageButtonWidth = (listWidth - layout.gap) / 2;
    button(x + pageButtonWidth / 2, footerY, pageButtonWidth, CONFIG.copy.previous, () => {
      page = (page + pages - 1) % pages; selected = page * rows; render();
    });
    button(x + listWidth - pageButtonWidth / 2, footerY, pageButtonWidth, CONFIG.copy.next, () => {
      page = (page + 1) % pages; selected = page * rows; render();
    });
    text(detailX, listY, hint.score >= CONFIG.recommendedScore ? CONFIG.copy.relevant : hint.category.toUpperCase(),
      layout.smallSize, UI_COLORS.gold, detailWidth);
    const title = text(detailX, listY + layout.bodyGap, hint.title, layout.titleSize, UI_COLORS.title, detailWidth);
    const bodyY = title.y + title.height + layout.bodyGap;
    const body = text(detailX, bodyY, hint.body, layout.bodySize, UI_COLORS.body, detailWidth);
    const availableHeight = footerY - layout.footerHeight - bodyY;
    if (body.height > availableHeight) {
      const scale = Math.max(layout.minTextScale, availableHeight / body.height);
      body.setFontSize(layout.bodySize * scale);
    }
    const reasonY = Math.min(body.y + body.height + layout.bodyGap, footerY - layout.footerHeight);
    if (hint.reason) text(detailX, reasonY, hint.reason, layout.smallSize, UI_COLORS.info, detailWidth);
    const pageCopy = CONFIG.copy.page.replace("{page}", page + 1).replace("{pages}", pages);
    text(detailX, footerY - layout.buttonHeight / 2, pageCopy, layout.smallSize, UI_COLORS.info, detailWidth);
    const wikiWidth = Math.min(listWidth, detailWidth - layout.footerHeight);
    button(detailX + detailWidth - wikiWidth / 2, footerY, wikiWidth, CONFIG.copy.wiki, () => {
      const anchor = hint.id === "current-step" ? "quick-start" : `hint-${hint.id}`;
      openGameWiki(globalThis.open, { ...GAME_WIKI, url: `${GAME_WIKI.url}#${anchor}` });
    });
    onControlsChanged?.(controls, focusIndex);
  }
  render();
  return {
    root,
    getControls: () => controls,
    getHealthSnapshot: () => ({ page, pages, selectedId: entries[selected]?.id,
      recommendedIds: entries.filter(entry => entry.score >= CONFIG.recommendedScore).map(entry => entry.id),
      entryCount: entries.length }),
    destroy: () => root.destroy(true),
  };
}
