const EMPTY_FOOTPRINT = Object.freeze([]);

export const TITAN_CREATURE_FOOTPRINT_BUILD = Object.freeze({
  version: "titan-creature-alpha-footprint-v2-20260728",
  minimumAlpha: 24,
  minimumOpaquePixelsPerTile: 1,
  projectionAuthority: "TITAN_DISCOVERY_CONFIG.underground.titanFitFraction",
  sourceAuthority: "TITAN_DEFINITIONS.surfaceAsset",
});

export const TITAN_CREATURE_FOOTPRINT_ROWS = Object.freeze({
  "mossback-wanderer": Object.freeze([0, 0, 1984, 4032, 8160, 16352, 16352, 8160, 8176, 8160]),
  "bellhorn-grazer": Object.freeze([512, 1008, 1008, 2016, 4064, 8160, 8160, 8176, 8176]),
  "lantern-jaw": Object.freeze([0, 0, 0, 0, 0, 58336, 130528, 131040, 131040, 131040, 65408, 30592]),
  "archwalker": Object.freeze([0, 0, 1920, 8128, 8160, 8160, 8160, 8176, 4080]),
  "shale-mother": Object.freeze([0, 0, 384, 1984, 4032, 8160, 16352, 16352, 16352, 14304]),
  "ribbon-wyrm": Object.freeze([14336, 31488, 65408, 32736, 32736, 65472, 62400, 65472, 65504, 131040, 131008, 63360]),
  "crowned-mole": Object.freeze([0, 0, 384, 896, 2032, 4080, 4064, 8176, 8176]),
  "hammerhead-pilgrim": Object.freeze([1920, 8064, 3840, 2016, 2032, 2016, 2032, 1776, 1712]),
  "cathedral-stag": Object.freeze([1408, 8128, 8128, 8128, 3840, 3968, 3968, 3968, 4032, 1984]),
  "hollowback-bear": Object.freeze([0, 0, 0, 3968, 16352, 16352, 16352, 16352, 16352, 4064]),
  "silver-strider": Object.freeze([1984, 2016, 2016, 2016, 1984, 1984, 4032, 2880, 2368]),
  "mirror-ray": Object.freeze([0, 96, 96, 16608, 131040, 65472, 65408, 32704, 8160, 1888, 992, 192]),
  "needlecrown": Object.freeze([0, 0, 128, 960, 2032, 2032, 4080, 8160, 16368, 8176]),
  "moon-shell": Object.freeze([0, 0, 0, 896, 14272, 16352, 16352, 16352, 16352, 8160]),
  "veilwing": Object.freeze([0, 224, 49632, 63456, 32704, 32704, 16256, 32704, 65472, 65504, 58336, 49152]),
  "ember-tusk": Object.freeze([0, 0, 0, 3840, 8064, 8064, 16352, 16352, 16352, 16256]),
  "furnace-drake": Object.freeze([0, 0, 0, 0, 384, 8160, 32736, 16352, 8160, 8160, 16352]),
  "ash-colossus": Object.freeze([0, 1920, 4032, 4064, 8160, 16352, 16352, 16368, 16368, 16368]),
  "magma-whale": Object.freeze([0, 0, 0, 0, 0, 192, 15296, 130912, 131040, 32736, 16256, 7936]),
  "cinder-centipede": Object.freeze([0, 0, 0, 192, 480, 480, 480, 7616, 131040, 131040, 131040, 1984]),
  "obsidian-sleeper": Object.freeze([0, 0, 0, 0, 7168, 7936, 8160, 8160, 16352, 11744]),
  "rift-heron": Object.freeze([192, 960, 1984, 1984, 1920, 1920, 1920, 1792, 896]),
  "star-eater": Object.freeze([7936, 32640, 65408, 65408, 32704, 28608, 63424, 63424, 65472, 65472, 32640, 16128]),
  "deep-crown": Object.freeze([0, 0, 448, 2016, 26592, 28640, 32736, 32736, 32736, 8160, 7104]),
  "worldroot-titan": Object.freeze([3840, 32736, 65504, 131008, 130944, 65408, 65408, 65408, 65408, 65408, 131008, 130944]),
});

export function getTitanCreatureFootprintRows(titanId) {
  return TITAN_CREATURE_FOOTPRINT_ROWS[titanId] || EMPTY_FOOTPRINT;
}
