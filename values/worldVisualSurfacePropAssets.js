const asset = (
  heightMeters,
  sourceWidth,
  sourceHeight,
  visualInfluenceRadiusTiles,
  clearOpeningMeters = null,
) => Object.freeze({
  heightMeters,
  expectedSource: Object.freeze({ width: sourceWidth, height: sourceHeight }),
  visualInfluenceRadiusTiles,
  ...(Number.isFinite(clearOpeningMeters) ? { clearOpeningMeters } : {}),
});

const LEVEL_ONE = Object.freeze({
  well: asset(2.50, 340, 357, 2.10),
  wagon: asset(2.35, 469, 292, 2.35),
  pergola: asset(2.40, 380, 333, 2.20, 2.20),
  bench: asset(0.95, 357, 214, 1.55),
  handcart: asset(1.10, 350, 188, 1.65),
  supplies: asset(1.10, 395, 208, 1.75),
  fence: asset(0.78, 332, 188, 1.55),
  plants: asset(0.68, 339, 218, 1.35),
  lantern: asset(2.25, 131, 256, 1.65),
});

const LEVEL_TWO = Object.freeze({
  well: asset(2.50, 323, 343, 2.10),
  wagon: asset(2.35, 463, 311, 2.35),
  pergola: asset(2.40, 385, 310, 2.20, 2.20),
  bench: asset(0.95, 368, 211, 1.55),
  handcart: asset(1.10, 418, 182, 1.65),
  supplies: asset(1.10, 427, 179, 1.75),
  fence: asset(0.78, 392, 210, 1.55),
  plants: asset(0.68, 367, 215, 1.35),
  lantern: asset(2.25, 131, 313, 1.65),
  forgeShelter: asset(3.10, 886, 651, 3.15, 2.20),
  campKitchen: asset(2.70, 948, 650, 3.10, 2.20),
  herbStation: asset(1.65, 1024, 525, 2.65),
  timberGantry: asset(3.30, 723, 649, 3.25, 2.35),
  observatory: asset(2.00, 1024, 577, 2.85),
  surveyStation: asset(1.90, 1024, 526, 2.75),
  expeditionShelter: asset(3.20, 820, 649, 3.45, 2.20),
});

export const WORLD_VISUAL_SURFACE_PROP_ASSETS = Object.freeze({
  level1: LEVEL_ONE,
  level2: LEVEL_TWO,
});
