// Offline import settings for the neutral, modular Sanctuary tree artwork.
export const WORLDROOT_SANCTUARY_ART = Object.freeze({
  version: 3,
  date: "2026-09-03",
  compressionLevel: 9,
  checkerMinimum: 218,
  checkerChromaMaximum: 18,
  checkerFringeRadiusPx: 2,
  fringeMinimum: 160,
  fringeChromaMaximum: 24,
  fringeAlpha: 0,
  alphaCutoff: 20,
  edgeRadius: 2,
  foregroundRadius: 4,
  foregroundMinimum: 150,
  // Neutral carrier pixels are absent from the authored green/brown/charcoal palette.
  assets: Object.freeze([
    Object.freeze({ name: "trunk", source: "source/trunk.png" }),
    Object.freeze({ name: "foliage-living", source: "source/foliage-living.png" }),
    Object.freeze({ name: "foliage-consumed", source: "source/foliage-consumed.png" }),
  ]),
});
