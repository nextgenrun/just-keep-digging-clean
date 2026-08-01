// Measured visible-alpha bounds for centered, consistently sized talent signs.

function bounds(sourceWidth, sourceHeight, x, y, width, height) {
  return Object.freeze({ sourceWidth, sourceHeight, x, y, width, height });
}

export const STARLIGHT_TALENT_SIGN_ART = Object.freeze({
  dirt: bounds(355, 444, 80, 78, 242, 308),
  stone: bounds(355, 444, 36, 82, 311, 283),
  copper: bounds(354, 444, 20, 135, 309, 215),
  darkDirtNormal: bounds(355, 444, 9, 95, 305, 264),
  steel: bounds(355, 443, 84, 15, 171, 337),
  iron: bounds(354, 443, 33, 38, 321, 308),
  bronze: bounds(355, 443, 70, 36, 241, 309),
  darkDirtStrong: bounds(355, 444, 13, 84, 273, 283),
  silver: bounds(355, 443, 0, 44, 355, 287),
  gold: bounds(355, 443, 0, 42, 286, 278),
});
