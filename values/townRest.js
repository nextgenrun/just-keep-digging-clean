// Town bed, baked presentation, sleep timing and persistence admission.
const BED_GUIDANCE_ASSET = Object.freeze({
  key: 'town-rest-guidance-v1', path: 'sprites/environment/town-rest-v1/guidance-v1.png',
});
export const TOWN_REST = Object.freeze({
  enabled: true,
  assets: Object.freeze([
    { key: 'town-rest-bed-v1', path: 'sprites/environment/town-rest-v1/bed.png' },
    { key: 'town-rest-panel-v1', path: 'sprites/environment/town-rest-v1/blessings.png' },
    { key: 'town-rest-captions-v1', path: 'sprites/environment/town-rest-v1/captions.png' },
    BED_GUIDANCE_ASSET,
  ]),
  bed: Object.freeze({ tileX: 19.3, widthTiles: 1.6, depth: 5.2, groundOverlapPx: 3,
    rangeTiles: 1.1, feetTolerancePx: 10, promptWidth: 150, promptGap: 22 }),
  town: Object.freeze({ minTileX: 0, maxTileX: 32, feetTolerancePx: 12 }),
  guidance: Object.freeze({ asset: BED_GUIDANCE_ASSET, ignoreMs: 8000, fadeMs: 650,
    hintMs: 6000, progressTiles: 0.45, depth: 19990, targetGap: 14,
    referenceWidth: 1280, referenceHeight: 720, badgeHeight: 60, arrowHeight: 82,
    badgeOverlap: 0.28, edgeMarginX: 95, edgeMarginTop: 160, edgeMarginBottom: 150,
    hintWidth: 540, hintWidthRatio: 0.82, hintBottom: 195, hintTop: 210 }),
  timing: Object.freeze({ dozeMs: 1600, sleepMs: 4200, timelapseFadeMs: 320,
    wakeMs: 700, feedbackMs: 2300, sleepHours: 8, hoursPerDay: 24,
    maxFrameMs: 100, simulationStepMs: 1000 }),
  camera: Object.freeze({ focusTileX: 24.5, groundScreenRatio: 0.86, zoom: 1 }),
  ui: Object.freeze({ hudDepth: 1000, depth: 3700, width: 930, maxHeightRatio: 0.90,
    captionWidth: 390, captionTop: 72, sourceWidth: 1536, sourceHeight: 1024,
    captionRows: 4, cardCenters: [462, 1070], cardY: 551, cardWidth: 506,
    cardHeight: 430, statsY: 712, upgradeX: 768, upgradeY: 897,
    upgradeWidth: 620, upgradeHeight: 130, priceY: 922, fontSize: 25,
    textColor: '#ffebbe', shadowColor: '#080b10', shadowWidth: 3,
    inactiveAlpha: 0.65, reducedMotionQuery: '(prefers-reduced-motion: reduce)' }),
  ember: Object.freeze({ count: 9, size: 23, arcHeight: 80, startDelayMs: 40,
    travelMs: 560, sleeperXRatio: -0.23, sleeperYRatio: -0.56 }),
  persistence: Object.freeze({ maxTimerMs: 7200000, maxWetColumns: 512 }),
  copy: Object.freeze({
    bedOnly: 'Sleep in the town bed to save your expedition.',
    ready: 'Ember pouch filled', saveReason: 'town-bed-rest', refillSource: 'town-bed-sleep',
    stats: '+{bonus}%  /  {seconds}s', upgrade: 'Tier {tier}  /  {gold} gold',
    maximum: 'Campfire fully tended', charges: '{charges} Ember Charges',
  }),
});
export function getSleepDayFraction() {
  return TOWN_REST.timing.sleepHours / TOWN_REST.timing.hoursPerDay;
}
export function getSleepTimelapseProgress(elapsedMs) {
  const timing = TOWN_REST.timing;
  return Math.max(0, Math.min(1, (elapsedMs - timing.timelapseFadeMs)
    / (timing.sleepMs - timing.timelapseFadeMs * 2)));
}
