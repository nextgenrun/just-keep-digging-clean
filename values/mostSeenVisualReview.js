import { UI_FONTS } from './uiLayout.js';
export const MOST_SEEN_VISUAL_REVIEW = Object.freeze({
  reviewOnly: true, productionChanged: false,
  goal: { x: 180, y: 125, width: 332, height: 48, titleSize: 14, detailSize: 12, lineOffset: 9 },
  utility: { y: 33, wikiX: 847, mapX: 986, menuX: 1139, wikiWidth: 104, mapWidth: 146, menuWidth: 130, height: 36 },
  target: { width: 172, height: 38, rise: 79, fontSize: 14, label: 'DIRT' },
  prompt: { width: 208, height: 48, titleSize: 16, detailSize: 12, detail: 'E  ·  Browse abilities' },
  decorationAlpha: .58,
  font: { family: UI_FONTS.display, ink: '#f5e7c8', secondary: '#b9cbd5', gold: '#f0c765', shadow: '#02060a', stroke: 2 },
  depth: 2050,
  art: { plate: 'ui-hud-approved-buff-chip', keycap: 'ui-hud-approved-inventory-keycap-v1' },
  damage: { x: 236, y: 52, fontSize: 11 },
});
