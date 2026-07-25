// Test-only visual approval values. This file is not imported by the game runtime.
export const V7_VISUAL_APPROVAL = Object.freeze({
  viewport: Object.freeze({ width: 1920, height: 1080 }),
  source: Object.freeze({
    tmx: "exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx",
    cropOffsetTiles: 40,
    label: "visual target mockup—not runtime proof",
  }),
  legacy: Object.freeze({
    key: "v7-approval-legacy-idle",
    path: "sprites/character/character-v8/runtime/legacy-idle-clean-sheet.webp",
    frameWidth: 341,
    frameHeight: 341,
    endFrame: 34,
    frame: 0,
    displaySize: 89,
  }),
  fixtures: Object.freeze({
    deep: Object.freeze({
      id: "deep-v7-cave-1547",
      title: "Deep v7 authored cave",
      playerTile: Object.freeze({ x: 210, y: 1547 }),
      cameraOffsetY: -70,
      palette: Object.freeze({ ambient: 0x101932, bounce: 0x35bfe4, accent: 0xa55cff }),
    }),
    biolum: Object.freeze({
      id: "biolum-v7-cave-890",
      title: "Bioluminescent v7 cave",
      playerTile: Object.freeze({ x: 136, y: 890 }),
      cameraOffsetY: -70,
      palette: Object.freeze({ ambient: 0x0b2430, bounce: 0x37f1d2, accent: 0x8e6cff }),
    }),
    early: Object.freeze({
      id: "early-v7-cave-131",
      title: "Early v7 cave",
      playerTile: Object.freeze({ x: 139, y: 131 }),
      cameraOffsetY: -90,
      palette: Object.freeze({ ambient: 0x24180f, bounce: 0xf0a95a, accent: 0x6db6d9 }),
    }),
    surface: Object.freeze({
      id: "surface-v7-town-64",
      title: "Surface v7 town",
      playerTile: Object.freeze({ x: 28, y: 64 }),
      cameraOffsetY: -120,
      palette: Object.freeze({ ambient: 0x25384d, bounce: 0xf2c879, accent: 0x78c7d9 }),
    }),
  }),
  modes: Object.freeze(["current", "sampling", "lighting", "combined"]),
  compositor: Object.freeze({
    darknessAlpha: 0.46,
    playerLightRadius: 520,
    playerLightCore: 160,
    playerLightOffsetY: -52,
    vignetteAlpha: 0.34,
    particleCount: 34,
    edgeAlpha: 0.48,
  }),
});
