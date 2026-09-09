// Authored tree selection, docked inspection, and short purchase feedback.
const asset = id => Object.freeze({
  key: `ui-celestial-focus-${id}-v1`,
  path: `sprites/UI/celestial-focus-v1/${id}.png`,
  bakedCopy: true,
});
export const CELESTIAL_FOCUS_ASSETS = Object.freeze({
  selector: asset("selector"), wayward: asset("wayward"),
  hollow: asset("hollow"), lance: asset("lance"),
  controls: asset("controls"), feedback: asset("feedback"), free: asset("free"),
});
const control = (id, rect) => Object.freeze({
  ...CELESTIAL_FOCUS_ASSETS.controls, frame: id,
  rect: Object.freeze(rect),
});
export const CELESTIAL_FOCUS_CONTROLS = Object.freeze({
  free: Object.freeze({ ...CELESTIAL_FOCUS_ASSETS.free, frame: "free-unlock", rect: Object.freeze([0, 0, 1848, 851]) }),
  unlock: control("unlock", [18, 18, 744, 294]),
  upgrade: control("upgrade", [776, 18, 744, 294]),
  locked: control("locked", [18, 318, 744, 304]),
  mastered: control("mastered", [776, 318, 744, 304]),
  ranks: Object.freeze([control("rank-0", [64, 626, 660, 170]),
    control("rank-1", [816, 626, 660, 170]),
    control("rank-2", [64, 810, 660, 178]),
    control("rank-3", [816, 810, 660, 178])]),
});
const effect = (id, rect) => Object.freeze({
  ...CELESTIAL_FOCUS_ASSETS.feedback, frame: id,
  rect: Object.freeze(rect),
});
export const CELESTIAL_FOCUS_FEEDBACK = Object.freeze({
  flash: effect("flash", [20, 60, 590, 630]),
  ring: effect("ring", [627, 60, 618, 630]),
  unlock: effect("awakened", [18, 810, 596, 248]),
  upgrade: effect("rank-up", [640, 810, 596, 248]),
  durationMs: 680, reducedDurationMs: 420, flashDurationMs: 280,
  ringDurationMs: 460, flashStartSize: 75, flashEndSize: 230,
  ringStartSize: 95, ringEndSize: 235,
  plaqueWidth: 370, plaqueHeight: 130, plaqueXFraction: 0.805,
  plaqueYFraction: 0.735, plaqueEnterMs: 90, plaqueFadeDelayMs: 400,
  plaqueFadeMs: 280, audioId: "levelUpShort", audioGain: 1.35, audioRate: 1.12,
});
export const CELESTIAL_FOCUS_LAYOUT = Object.freeze({
  width: 1536, height: 1024, viewportInset: 8,
  selectorCenters: Object.freeze([0.185, 0.5, 0.815]),
  selectorRects: Object.freeze([[54,179,452,710],[541,179,452,710],[1030,179,452,710]].map(Object.freeze)),
  cardSelectedTint: 0xffffff, cardIdleTint: 0xb5bfcd, selectorCloseY: 0.066,
  selectorCardY: 0.535, selectorCardWidth: 440, selectorCardHeight: 706,
  selectorFocusY: 0.475, selectorFocusSize: 180,
  backX: 0.088, backY: 0.081, backWidth: 200, backHeight: 64,
  closeX: 0.96, closeY: 0.03, closeWidth: 96, closeHeight: 52,
  titleX: 0.326, titleY: 0.176, titleWidth: 400, titleHeight: 40,
  headerXs: Object.freeze([0.681, 0.795, 0.912]), headerY: 0.099,
  headerWidth: 150, headerHeight: 30, headerFontSize: 25,
  treeX: 0.32, laneStep: 0.18,
  rowYs: Object.freeze([0.819, 0.706, 0.593, 0.367, 0.255]), bridgeY: 0.48,
  nodeSizes: Object.freeze({ ability: 102, upgrade: 86, capstone: 90, apex: 94 }),
  nodeHitWidth: 126, nodeHitHeight: 110, nodeRankWidth: 112, nodeRankHeight: 36,
  nodeRankGap: 2,
  detailX: 0.802, portraitY: 0.255, portraitSize: 96,
  cardY: 0.467, cardWidth: 428, cardHeight: 278,
  rankY: 0.648, rankWidth: 240, rankHeight: 60,
  statusY: 0.725, statusWidth: 406, statusHeight: 80,
  actionY: 0.817, actionWidth: 440, actionHeight: 96,
  priceXOffset: -40, priceYOffset: 21, priceWidth: 58, priceHeight: 23,
  priceFontSize: 24,
  priceWellSource: Object.freeze([914, 207, 224, 52]), priceWellInset: 0.86,
  valueColor: "#E8C984", invisibleHitAlpha: 0.001,
  transitionMs: 160, selectedAlpha: 1, idleAlpha: 0.72,
});
export const CELESTIAL_FOCUS_BRANCH_ASSETS = Object.freeze({
  "wayward-star": CELESTIAL_FOCUS_ASSETS.wayward,
  "hollow-sun": CELESTIAL_FOCUS_ASSETS.hollow,
  "comet-engine": CELESTIAL_FOCUS_ASSETS.lance,
});
export function celestialFocusPoint(x, y) {
  return { x: (x - 0.5) * CELESTIAL_FOCUS_LAYOUT.width,
    y: (y - 0.5) * CELESTIAL_FOCUS_LAYOUT.height };
}
