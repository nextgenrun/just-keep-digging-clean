// Shared presentation values for the six existing boot/menu scenery paintings.
export const MENU_ATMOSPHERE_VERSIONS = Object.freeze({
  v6: Object.freeze({ bufferedLoops: false, loopOverlapMs: 400, videoBase: "sprites/backgrounds/menu-atmosphere-v6/", alpha: 1, videoMix: 1, replacePoster: true, loadingOverlayAlpha: 0, menuOverlayAlpha: 0 }),
  v5: Object.freeze({ bufferedLoops: false, loopOverlapMs: 400, videoBase: "sprites/backgrounds/menu-atmosphere-v5/", alpha: 1, videoMix: 1, replacePoster: true, loadingOverlayAlpha: 0, menuOverlayAlpha: 0 }),
  v4: Object.freeze({ bufferedLoops: true, loopOverlapMs: 1800, videoBase: "sprites/backgrounds/menu-atmosphere-v4/", alpha: 1, videoMix: 1, replacePoster: true, loadingOverlayAlpha: 0, menuOverlayAlpha: 0 }),
  v1: Object.freeze({ bufferedLoops: true, loopOverlapMs: 1800, videoBase: "sprites/backgrounds/menu-atmosphere-v1/", alpha: 0.44, videoMix: 0.64, replacePoster: false, loadingOverlayAlpha: 0.34, menuOverlayAlpha: 0.30 }),
  v2: Object.freeze({ bufferedLoops: true, loopOverlapMs: 1800, videoBase: "sprites/backgrounds/menu-atmosphere-v2/", alpha: 0.44, videoMix: 1, replacePoster: false, loadingOverlayAlpha: 0.34, menuOverlayAlpha: 0.30 }),
  v3: Object.freeze({ bufferedLoops: true, loopOverlapMs: 1800, videoBase: "sprites/backgrounds/menu-atmosphere-v3/", alpha: 0.68, videoMix: 1, replacePoster: true, loadingOverlayAlpha: 0.34, menuOverlayAlpha: 0.30 }),
});

export const MENU_ATMOSPHERE = Object.freeze({
  imageBase: "exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026/sprites/backgrounds/background-database/",
  ...MENU_ATMOSPHERE_VERSIONS.v6,
  revealMs: 1800,
  loopHeadroomMs: 150,
  resizeDebounceMs: 100,
  readyTimeoutMs: 12000,
  query: "menuMotion",
  reducedMotionQuery: "(prefers-reduced-motion: reduce)",
  progress: Object.freeze({ glowAlpha: 0.075 }),
});

export const MENU_SCENERY = Object.freeze([
  { id: "aurora", name: "Aurora sanctuary", image: "ChatGPT Image Jun 29, 2026, 07_32_45 PM.png" },
  { id: "starfall", name: "Distant starfall", image: "ChatGPT Image Jun 29, 2026, 07_32_49 PM.png" },
  { id: "lantern-forest", name: "Lantern forest", image: "ChatGPT Image Jun 29, 2026, 07_32_52 PM.png" },
  { id: "luminous-grotto", name: "Luminous grotto", image: "ChatGPT Image Jun 29, 2026, 07_32_58 PM.png" },
  { id: "ember-reaches", name: "Ember reaches", image: "ChatGPT Image Jun 29, 2026, 07_33_03 PM.png" },
  { id: "quiet-foundry", name: "Quiet foundry", image: "ChatGPT Image Jun 29, 2026, 07_40_41 PM (1).png" },
].map(Object.freeze));
