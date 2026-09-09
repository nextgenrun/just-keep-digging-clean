// Approved Cinder Core presentation. Palette changes are cosmetic only.
export const STELLAR_LANCE_PRESENTATION = Object.freeze({
  speedPxPerSecond: 225, // 85% reduction from the 1500 px/s approved preview.
  displayWidthPx: 64, displayHeightPx: 28,
  frame: Object.freeze({ name: "cinder-core", x: 352, y: 340, width: 772, height: 337 }),
  // Attach the visible flame tail to the fist; the crop has ~1 px of dark rear padding.
  originX: 0.02, originY: 0.52, contactTopLiftFraction: 0.03125,
  alpha: 1,
  rareChance: 0.04, normalPaletteCount: 3, rarePaletteIndex: 3,
  historyLimit: 12,
  postUpdateEvent: "postupdate", minimumTravelMs: 1,
  palettes: Object.freeze([
    Object.freeze({ id: "blue", impactTint: 0x92d9ff }),
    Object.freeze({ id: "purple", impactTint: 0xe2b4ff }),
    Object.freeze({ id: "red", impactTint: 0xffb575 }),
    Object.freeze({ id: "prismatic", impactTint: 0xffffff }),
  ]),
});
