// ==================== STAR COLOUR IDENTITY LIBRARY ====================
// 250 authored Star identities. Rarity owns rewards; identity owns art,
// colour, flavour, and bounded light character.

import { STAR_IDENTITY_EXPANSION_V2 } from "./starIdentityExpansionV2.js";

const asset = (key, path) => Object.freeze({ key, path });
const atlas = (id, columns, rows, frameCount) => Object.freeze({
  id,
  ...asset(
    `star-identities-${id}-atlas-v2`,
    `sprites/environment/star-identities-v2/star-identities-${id}-atlas-v2.png?v=20260730-250`,
  ),
  columns,
  rows,
  frameCount,
  frameSizePx: STAR_IDENTITY_EXPANSION_V2.frameSizePx,
  framePrefix: `star-identity-${id}-`,
});

const STAR_IDENTITY_ATLASES = Object.freeze(
  STAR_IDENTITY_EXPANSION_V2.rarityIds.map((id, rarityIndex) => {
    const frameCount = STAR_IDENTITY_EXPANSION_V2.totalRarityCounts[rarityIndex];
    const columns = STAR_IDENTITY_EXPANSION_V2.atlasColumns;
    return atlas(id, columns, Math.ceil(frameCount / columns), frameCount);
  }),
);

const STAR_IDENTITY_LIGHT_FRAME_SIZE_PX = 192;
const STAR_IDENTITY_LIGHT_ATLAS_COLUMNS = 10;
const lightAtlas = (id, frameCount) => {
  const rows = Math.ceil(frameCount / STAR_IDENTITY_LIGHT_ATLAS_COLUMNS);
  return Object.freeze({
    id,
    ...asset(
      `star-identity-lights-${id}-atlas-v1`,
      `sprites/environment/star-identity-lights-v1/star-identity-lights-${id}-atlas-v1.png?v=20260730-250-light-v1`,
    ),
    columns: STAR_IDENTITY_LIGHT_ATLAS_COLUMNS,
    rows,
    frameCount,
    frameSizePx: STAR_IDENTITY_LIGHT_FRAME_SIZE_PX,
    framePrefix: `star-identity-light-${id}-`,
    decodedBytes: STAR_IDENTITY_LIGHT_ATLAS_COLUMNS
      * rows * STAR_IDENTITY_LIGHT_FRAME_SIZE_PX ** 2 * 4,
  });
};
const STAR_IDENTITY_LIGHT_ATLASES = Object.freeze(
  STAR_IDENTITY_EXPANSION_V2.rarityIds.map((id, rarityIndex) => (
    lightAtlas(id, STAR_IDENTITY_EXPANSION_V2.totalRarityCounts[rarityIndex])
  )),
);

const BASE_IDENTITIES_V1 = Object.freeze([
  ["glacier-blue", "Glacier Blue", 0, 0, "Ice Blue", "#77C9FF", "#EAF8FF", "A quiet shard of winter sky that sheds snow-bright dust.", "snow-dust halo"],
  ["cloud-cyan", "Cloud Cyan", 0, 1, "Pale Cyan", "#73F2FF", "#E9FFFF", "Its light opens like two vapor wings in still air.", "vapor-wing glow"],
  ["moonwhite", "Moonwhite", 0, 2, "Pearl White", "#F4F0E8", "#FFFFFF", "A small moon-memory wrapped in a patient silver bloom.", "moon bloom"],
  ["seafoam", "Seafoam", 0, 3, "Blue Green", "#5DE8D1", "#DBFFF8", "Cool tidal mist circles a crystal that never feels wet.", "tidal mist"],
  ["skyglass", "Skyglass", 0, 4, "Clear Azure", "#58AFFF", "#DDF2FF", "Thin glass rays chime silently when the mine grows dark.", "glass-ray fan"],
  ["frost-lilac", "Frost Lilac", 0, 5, "Cool Lilac", "#C49CFF", "#F4E8FF", "Lilac frost petals gather and vanish around its points.", "frost-petal aura"],
  ["dawn-peach", "Dawn Peach", 0, 6, "Dawn Peach", "#FFB38E", "#FFF0DF", "A pocket sunrise with the warmth of first light underground.", "dawn haze"],
  ["mint-whisper", "Mint Whisper", 0, 7, "Soft Mint", "#86F7C8", "#E6FFF4", "Tiny leaflike motes orbit it as if listening for roots.", "mint mote orbit"],
  ["rose-mist", "Rose Mist", 0, 8, "Dusty Rose", "#F2A3B9", "#FFE8EF", "A rose-coloured veil folds around a cool crystal heart.", "rose veil"],
  ["soft-amber", "Soft Amber", 0, 9, "Honey Amber", "#F5B94C", "#FFF0B8", "Its lantern haze makes old stone briefly feel inhabited.", "lantern haze"],
  ["periwinkle", "Periwinkle", 0, 10, "Blue Violet", "#818BFF", "#E8E9FF", "Feathered blue-violet rays drift without choosing a wind.", "feathered rays"],
  ["silver-rain", "Silver Rain", 0, 11, "Cold Silver", "#D7E8F2", "#FFFFFF", "Fine silver sparks fall forever but never reach the floor.", "falling spark trails"],

  ["orchid-tide", "Orchid Tide", 1, 0, "Orchid Purple", "#B968FF", "#F1D7FF", "Purple tides curl inward as though guarding a secret shore.", "tidal ribbons"],
  ["jade-pulse", "Jade Pulse", 1, 1, "Rich Jade", "#29D77D", "#D8FFE9", "Each jade pulse unfurls like a living leaf in deep earth.", "leaf-wave wisps"],
  ["coral-veil", "Coral Veil", 1, 2, "Coral Pink", "#FF557B", "#FFDCE5", "Warm coral veils bend around the star without touching it.", "coral veil folds"],
  ["electric-iris", "Electric Iris", 1, 3, "Electric Indigo", "#675CFF", "#E2DEFF", "An iris of blue lightning blinks open around the crystal.", "iris lightning"],
  ["citrine-bloom", "Citrine Bloom", 1, 4, "Citrine Yellow", "#FFD33D", "#FFF3B0", "Golden pollen blooms wherever its sharp light settles.", "pollen bloom"],
  ["aqua-lantern", "Aqua Lantern", 1, 5, "Lantern Aqua", "#34D9F2", "#D8FAFF", "Small hanging lights answer it from an unseen ceiling.", "suspended lanterns"],
  ["raspberry-halo", "Raspberry Halo", 1, 6, "Raspberry", "#E93D88", "#FFD6E8", "Broken raspberry petals keep rebuilding an imperfect halo.", "broken petal halo"],
  ["verdant-comet", "Verdant Comet", 1, 7, "Verdant Green", "#4DDE4F", "#E1FFE2", "A short green comet tail points toward forgotten tunnels.", "comet filaments"],
  ["indigo-drift", "Indigo Drift", 1, 8, "Deep Indigo", "#394BCE", "#DCE1FF", "Indigo nebula feathers drift beyond the pull of gravity.", "nebula feathers"],
  ["copper-aurora", "Copper Aurora", 1, 9, "Aurora Copper", "#DB7439", "#FFDCC8", "Copper curtains fold through teal afterlight like slow music.", "aurora curtains"],

  ["solar-gold", "Solar Gold", 2, 0, "Sun Gold", "#FFB000", "#FFF0A6", "A captive sun throws elegant prominences into the dark.", "solar prominences"],
  ["ruby-crown", "Ruby Crown", 2, 1, "Crown Ruby", "#F22F2F", "#FFD0C8", "Ember arcs rise into a crown no miner could ever wear.", "crown ember arcs"],
  ["sapphire-flare", "Sapphire Flare", 2, 2, "Sapphire Blue", "#1685FF", "#D6EBFF", "Long sapphire ribbons sweep outward like a frozen flare.", "sapphire flare ribbons"],
  ["emerald-nova", "Emerald Nova", 2, 3, "Nova Emerald", "#39E639", "#DFFFF0", "Faceted emerald dust marks a nova held at its first breath.", "faceted nova dust"],
  ["amethyst-ray", "Amethyst Ray", 2, 4, "Ray Amethyst", "#A447F5", "#F0D8FF", "A diagonal fan of amethyst light cuts cleanly through gloom.", "diagonal ray fan"],
  ["pearl-prism", "Pearl Prism", 2, 5, "Prismatic Pearl", "#FFF4DE", "#FFFFFF", "Pearl light fractures into colours too fine to name.", "spectral prism shards"],
  ["topaz-lightning", "Topaz Lightning", 2, 6, "Lightning Topaz", "#FFB51B", "#FFF0B8", "Amber branches crackle once, then hang motionless in time.", "branching lightning"],
  ["rosegold-choir", "Rosegold Choir", 2, 7, "Rose Gold", "#F39A9D", "#FFE8D8", "Layered waves gather around it like a wordless choir.", "harmonic wave petals"],
  ["scarlet-sun", "Scarlet Sun", 2, 8, "Solar Scarlet", "#FF2D18", "#FFD4C6", "Its restrained red corona feels hotter than flame.", "scarlet corona"],
  ["arctic-diamond", "Arctic Diamond", 2, 9, "Arctic Diamond", "#7DE7FF", "#F0FDFF", "Diamond-blue shards remember an aurora beneath ancient ice.", "aurora crystal dust"],

  ["inferno-tangerine", "Inferno Tangerine", 3, 0, "Inferno Orange", "#FF6A00", "#FFE0A8", "Fire plumes coil around it without consuming a single spark.", "coiling fire plumes"],
  ["plasma-pink", "Plasma Pink", 3, 1, "Plasma Pink", "#FF22A7", "#FFD4F0", "Fluid plasma ribbons move as if the star were breathing.", "fluid plasma ribbons"],
  ["void-azure", "Void Azure", 3, 2, "Void Azure", "#145CFF", "#CCE1FF", "A dark lens opens inside the blue crystal and stares back.", "void-lens light"],
  ["acid-lime", "Acid Lime", 3, 3, "Acid Lime", "#B9FF00", "#F1FFC4", "Jagged lime vapor bites at the edges of nearby shadow.", "energetic vapor"],
  ["royal-ultraviolet", "Royal Ultraviolet", 3, 4, "Ultraviolet", "#7F20FF", "#E7D2FF", "Regal ray fans unfold with the weight of a sealed decree.", "regal ray fans"],
  ["molten-crimson", "Molten Crimson", 3, 5, "Molten Crimson", "#E81F11", "#FFD0B8", "Liquid crimson arcs orbit a heart that never cools.", "molten arcs"],
  ["storm-teal", "Storm Teal", 3, 6, "Storm Teal", "#12C9C7", "#D5FFFF", "A pocket storm rolls around the crystal in perfect silence.", "storm-cloud lightning"],
  ["eclipse-bronze", "Eclipse Bronze", 3, 7, "Eclipse Bronze", "#C77A32", "#FFE0B7", "A bronze corona outlines an eclipse that should not fit here.", "eclipse corona"],

  ["dragon-jade", "Dragon Jade", 4, 0, "Dragon Jade", "#00C96B", "#CFFFF0", "Serpentine light guards it with the patience of old stone.", "serpentine ribbons"],
  ["phoenix-white", "Phoenix White", 4, 1, "Phoenix White", "#FFF3C4", "#FFFFFF", "White-gold featherfire rises, falls, and rises unchanged.", "phoenix featherfire"],
  ["abyssal-turquoise", "Abyssal Turquoise", 4, 2, "Abyss Turquoise", "#00C8DF", "#CFFBFF", "Bioluminescent tendrils reach from an ocean with no surface.", "abyssal tendrils"],
  ["chrono-magenta", "Chrono Magenta", 4, 3, "Chrono Magenta", "#F313C8", "#FFD5F8", "Offset arcs show the star a heartbeat before and after now.", "time-echo arcs"],
  ["celestial-obsidian", "Celestial Obsidian", 4, 4, "Prismatic Black", "#5E4A8A", "#E4D6FF", "Rainbow edges reveal a black crystal bending nearby dust.", "gravitational dust"],
  ["auric-ghost", "Auric Ghost", 4, 5, "Spectral Gold", "#EEC66A", "#FFF3D0", "Pale ancestral flames gather without forming a face.", "ancestral flame wisps"],

  ["eventide-spectrum", "Eventide Spectrum", 5, 0, "Eventide Spectrum", "#4D5CFF", "#D9F8FF", "Twilight opens into every colour at the edge of night.", "spectral aurora fan"],
  ["singularity-violet", "Singularity Violet", 5, 1, "Singularity Violet", "#9C35FF", "#F1D7FF", "A violet star calmly orbits the absence at its own center.", "gravitational lens arcs"],
  ["heavenfire-opal", "Heavenfire Opal", 5, 2, "Heavenfire Opal", "#FFF2D0", "#FFFFFF", "Opal heavenfire carries colours that appear only in motion.", "prismatic heavenfire"],
  ["first-light-prism", "First-Light Prism", 5, 3, "First-Light Prism", "#80F4FF", "#FFF7DA", "The first dawn fractures here into four impossible directions.", "primordial light ribbons"],
]);

const RAW_IDENTITIES = Object.freeze([
  ...BASE_IDENTITIES_V1,
  ...STAR_IDENTITY_EXPANSION_V2.rawIdentities,
]);

const IDENTITIES = Object.freeze(RAW_IDENTITIES.map((entry, index) => {
  const [
    id,
    name,
    rarityIndex,
    frame,
    colourName,
    primary,
    secondary,
    flavour,
    lightStyle,
  ] = entry;
  const atlasEntry = STAR_IDENTITY_ATLASES[rarityIndex];
  const lightAtlasEntry = STAR_IDENTITY_LIGHT_ATLASES[rarityIndex];
  return Object.freeze({
    index,
    id,
    name,
    rarityIndex,
    frame,
    atlasId: atlasEntry.id,
    atlasKey: atlasEntry.key,
    frameName: `${atlasEntry.framePrefix}${frame}`,
    lightAtlasId: lightAtlasEntry.id,
    lightAtlasKey: lightAtlasEntry.key,
    lightFrameName: `${lightAtlasEntry.framePrefix}${frame}`,
    colourName,
    primary,
    secondary,
    flavour,
    light: Object.freeze({
      style: lightStyle,
      radiusScale: 0.88 + ((index * 7) % 9) * 0.035,
      opacityScale: 0.9 + ((index * 5) % 7) * 0.025,
      verticalScale: 0.9 + ((index * 3) % 5) * 0.035,
      pulsePeriodMs: 2200 + ((index * 173) % 1700),
      pulseRange: 0.035 + ((index * 11) % 8) * 0.006,
      rotationAmplitudeRadians: 0.015 + ((index * 13) % 6) * 0.006,
      rotationSpeedRadiansPerMs: 0.000018 + ((index * 17) % 7) * 0.000003,
    }),
  });
}));

export const STAR_IDENTITY_LIBRARY_CONFIG = Object.freeze({
  schemaVersion: 3,
  packageId: "star-identities-v2",
  lightPackageId: "star-identity-lights-v1",
  artSource: "ImageGen",
  identityHashSalt: 0x1d3f7a9,
  atlases: STAR_IDENTITY_ATLASES,
  lightAtlases: STAR_IDENTITY_LIGHT_ATLASES,
  identities: IDENTITIES,
  rarityIdentityCounts: STAR_IDENTITY_EXPANSION_V2.totalRarityCounts,
  visual: Object.freeze({
    worldTileScale: 1,
    worldLightScale: 1.62,
    worldLightAlphaScale: 0.58,
    steadyAuraArtScale: 0.92,
    popupArtAlpha: 0.2,
    popupArtScale: 1.18,
    popupLightAlpha: 0.18,
    popupLightScale: 1.34,
    releaseLightAlpha: 0.24,
    releaseLightDisplayScale: 1.42,
    releaseLightStartScale: 0.8,
    releaseLightPeakScale: 1.04,
    releaseLightEndScale: 1.18,
  }),
  inventory: Object.freeze({
    foundation: asset(
      "star-atlas-foundation-v1",
      "sprites/UI/star-atlas-v1/star-atlas-foundation-v1.png?v=20260730",
    ),
    copy: Object.freeze({
      tabLabel: "STAR ATLAS",
      subtitle: "Every Star colour has one rarity • every rarity can hold many colours",
      libraryRule: "COLOUR IS IDENTITY • RARITY IS REWARD",
      selectHint: "SELECT ANY LIGHT",
      rewardTier: "REWARD TIER",
      signXp: "SIGN XP",
      material: "MATERIAL",
      engine: "ENGINE",
      lightStyle: "LIGHT",
      depthLocked: "FIRST APPEARS",
      surfaceDepth: "ANY DEPTH",
      pageLabel: "LIGHTS",
    }),
    layout: Object.freeze({
      aspectRatio: 1.92,
      maximumWidthPx: 900,
      rarityTabCentersX: Object.freeze([0.09, 0.255, 0.42, 0.585, 0.75, 0.915]),
      rarityTabCenterY: 0.082,
      rarityTabHitWidthRatio: 0.145,
      rarityTabHitHeightRatio: 0.09,
      rarityLabelFontSizePx: 10,
      selectorCentersX: Object.freeze([0.105, 0.225, 0.345, 0.465]),
      selectorCentersY: Object.freeze([0.31, 0.545, 0.775]),
      selectorImageSizeRatio: 0.085,
      selectorHitSizeRatio: 0.105,
      selectorLabelOffsetYRatio: 0.063,
      selectorLabelFontSizePx: 8,
      selectorsPerPage: 12,
      pagePreviousCenterX: 0.105,
      pageLabelCenterX: 0.285,
      pageNextCenterX: 0.465,
      pageControlCenterY: 0.175,
      pageArrowSizeRatio: 0.04,
      pageHitSizeRatio: 0.07,
      pageLabelFontSizePx: 9,
      previewCenterX: 0.715,
      previewCenterY: 0.355,
      previewImageSizeRatio: 0.235,
      previewBadgeX: 0.902,
      previewBadgeY: 0.37,
      previewBadgeFontSizePx: 10,
      nameCenterX: 0.715,
      nameCenterY: 0.605,
      nameFontSizePx: 22,
      colourCenterY: 0.66,
      colourFontSizePx: 11,
      flavourCenterY: 0.72,
      flavourWidthRatio: 0.39,
      flavourFontSizePx: 13,
      lightCenterY: 0.795,
      lightFontSizePx: 10,
      statCentersX: Object.freeze([0.625, 0.75, 0.875]),
      statCenterY: 0.89,
      statFontSizePx: 10,
      ruleCenterX: 0.26,
      ruleCenterY: 0.935,
      ruleFontSizePx: 9,
      selectedScale: 1.16,
      idleAlpha: 0.68,
      selectedAlpha: 1,
      previewPulseScale: 1.035,
      previewPulseDurationMs: 1600,
      previewPulseCycles: 2,
      selectorLightAlpha: 0.2,
      selectorLightScale: 1.16,
      previewLightAlpha: 0.3,
      previewLightScale: 1.28,
    }),
  }),
  health: Object.freeze({
    expectedIdentityCount: 250,
    expectedAtlasCount: 6,
    expectedLightAtlasCount: 6,
    expectedRarityIdentityCounts: STAR_IDENTITY_EXPANSION_V2.totalRarityCounts,
    minimumDistinctPrimaryColours: 250,
    minimumDistinctLightStyles: 250,
    maximumStoredIdentityCount: 256,
    maximumLightDecodedBytes: 6 * 1254 * 1254 * 4,
  }),
});

export function getStarIdentityAtlasAssets(
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  return config.atlases;
}

export function getStarIdentityLightAtlasAssets(
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  return config.lightAtlases;
}

export function getStarIdentityPreloadAssets(
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  return Object.freeze([
    ...config.atlases,
    ...config.lightAtlases,
    config.inventory.foundation,
  ]);
}
