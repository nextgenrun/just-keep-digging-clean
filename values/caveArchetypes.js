import { TILE_TYPES } from "./tileTypes.js";
import { WORLD_VISUAL_RUNTIME } from "./worldVisualRuntime.js";

const caveFeature = (id, slot, chance, tileTypes) => Object.freeze({
  id,
  slot,
  chance,
  tileTypes: Object.freeze(tileTypes),
});

const cavePalette = (backdrop, shadow, accent, glow, strata) => Object.freeze({
  backdrop,
  shadow,
  accent,
  glow,
  strata,
});

const caveArchetype = ({
  id,
  adjective,
  journalLabel,
  minDepth,
  weight,
  motif,
  hint,
  palette,
  features,
}) => Object.freeze({
  id,
  adjective,
  journalLabel,
  minDepth,
  weight,
  motif,
  hint,
  palette,
  features: Object.freeze(features),
});

export const CAVE_ARCHETYPE_CONFIG = Object.freeze({
  enabled: true,
  salts: Object.freeze({
    identity: 0x0c4a3e11,
    identityRoll: 0x25f87d09,
    featureChance: 0x4f1bbcdc,
    featureType: 0x6da3e91f,
    visual: 0x73c9a541,
  }),
  forms: Object.freeze([
    Object.freeze({ maxRadiusX: 4, label: "Pocket" }),
    Object.freeze({ maxRadiusX: 10, label: "Crawl" }),
    Object.freeze({ maxRadiusX: 22, label: "Gallery" }),
    Object.freeze({ maxRadiusX: Number.POSITIVE_INFINITY, label: "Longreach" }),
  ]),
  discovery: Object.freeze({
    notificationDurationMs: 3000,
    hintDurationMs: 2200,
    journalKeyPrefix: "cave-identity:",
  }),
  render: Object.freeze({
    rangeTiles: 58,
    updateIntervalMs: 90,
    backdropDepth: WORLD_VISUAL_RUNTIME.render.caveBackdropDepth + 0.08,
    detailDepth: WORLD_VISUAL_RUNTIME.render.caveBackdropDepth + 0.16,
    motionDepth: WORLD_VISUAL_RUNTIME.render.caveBackdropDepth + 0.24,
    backdropAlpha: 0.92,
    shadowAlpha: 0.36,
    strataAlpha: 0.25,
    accentAlpha: 0.42,
    motionAlpha: 0.62,
    seamGlintMaxPerZone: 5,
    seamGlintAlpha: 0.68,
    seamGlintRadiusTiles: 0.085,
    seamGlintPulseSpeed: 0.0024,
    seamGlintRingScale: 2.6,
    revealDurationMs: 1050,
    maxVisibleZones: 14,
  }),
  archetypes: Object.freeze([
    caveArchetype({
      id: "echo-gallery",
      adjective: "Echoing",
      journalLabel: "Echo Galleries",
      minDepth: 0,
      weight: 30,
      motif: "echo",
      hint: "Resonant stone favors long mining chains.",
      palette: cavePalette(0x101b26, 0x071018, 0x5bb7e8, 0x9be8ff, 0x2f5268),
      features: [
        caveFeature("resonant-node", "floor", 0.46, [
          TILE_TYPES.COMBO_BLOCK,
          TILE_TYPES.XP_BLOCK,
        ]),
      ],
    }),
    caveArchetype({
      id: "rootbound-hollow",
      adjective: "Rootbound",
      journalLabel: "Rootbound Hollows",
      minDepth: 0,
      weight: 25,
      motif: "roots",
      hint: "Ancient matter gathers where the deep roots broke through.",
      palette: cavePalette(0x172019, 0x090d09, 0x83a65d, 0xbde889, 0x41533b),
      features: [
        caveFeature("root-cache", "floor", 0.42, [
          TILE_TYPES.GEM_POWER_BLOCK,
          TILE_TYPES.GEM_POWER_BLOCK,
          TILE_TYPES.ANCIENT_RELIC_CACHE,
        ]),
      ],
    }),
    caveArchetype({
      id: "prism-nursery",
      adjective: "Prismatic",
      journalLabel: "Prism Nurseries",
      minDepth: 80,
      weight: 20,
      motif: "crystal",
      hint: "Crystal growths mark unusually charged seams.",
      palette: cavePalette(0x17142b, 0x090817, 0x9e72ed, 0x68edff, 0x4a3b78),
      features: [
        caveFeature("crystal-crown", "ceiling", 0.86, [TILE_TYPES.GLOW_CRYSTAL]),
        caveFeature("prism-node", "floor", 0.44, [
          TILE_TYPES.CRIT_BLOCK,
          TILE_TYPES.XP_BLOCK,
        ]),
      ],
    }),
    caveArchetype({
      id: "storm-scar",
      adjective: "Stormscarred",
      journalLabel: "Storm Scars",
      minDepth: 320,
      weight: 13,
      motif: "storm",
      hint: "Charged rock can yield speed, power, or critical energy.",
      palette: cavePalette(0x0d1b2c, 0x050a12, 0x3f8cff, 0x8ff7ff, 0x31558b),
      features: [
        caveFeature("storm-crystal", "ceiling", 0.58, [TILE_TYPES.GLOW_CRYSTAL]),
        caveFeature("charged-node", "floor", 0.66, [
          TILE_TYPES.SPEED_BLOCK,
          TILE_TYPES.CRIT_BLOCK,
          TILE_TYPES.GEM_POWER_BLOCK,
        ]),
      ],
    }),
    caveArchetype({
      id: "gilded-burrow",
      adjective: "Gilded",
      journalLabel: "Gilded Burrows",
      minDepth: 180,
      weight: 11,
      motif: "vault",
      hint: "Gold light can betray a buried one-time vault.",
      palette: cavePalette(0x251c0b, 0x110c04, 0xdcae42, 0xffe28a, 0x6e5120),
      features: [
        caveFeature("vault-glint", "ceiling", 0.28, [TILE_TYPES.GLOW_CRYSTAL]),
        caveFeature("buried-vault", "floor", 0.72, [TILE_TYPES.CHEST]),
      ],
    }),
    caveArchetype({
      id: "ember-fault",
      adjective: "Emberlit",
      journalLabel: "Ember Faults",
      minDepth: 800,
      weight: 11,
      motif: "ember",
      hint: "Volatile seams concentrate berserk and legend blocks.",
      palette: cavePalette(0x2a120d, 0x120604, 0xef6036, 0xffc15c, 0x77311f),
      features: [
        caveFeature("ember-crystal", "ceiling", 0.46, [TILE_TYPES.GLOW_CRYSTAL]),
        caveFeature("volatile-node", "floor", 0.64, [
          TILE_TYPES.BERSERK_BLOCK,
          TILE_TYPES.COMBO_BLOCK,
          TILE_TYPES.LEGEND_BLOCK,
        ]),
      ],
    }),
  ]),
});

export function getCaveArchetype(archetypeId, config = CAVE_ARCHETYPE_CONFIG) {
  return config.archetypes.find(archetype => archetype.id === archetypeId)
    || config.archetypes[0];
}
