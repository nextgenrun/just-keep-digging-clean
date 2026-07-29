import { TITAN_DISCOVERY_CONFIG } from "./titanDiscoveries.js";
import { WORLD_VISUAL_SURFACE_PROPS } from "./worldVisualSurfaceProps.js";

const placement = (
  id,
  level,
  assetId,
  tileX,
  lane,
  sizeVariant = "standard",
  flipX = false,
) => Object.freeze({
  id,
  level,
  assetId,
  tileX,
  lane,
  sizeVariant,
  flipX,
});

const LEVEL_ONE_PLACEMENTS = Object.freeze([]);

const LEVEL_TWO_PLACEMENTS = Object.freeze([
  // Level 2 arrival forge: one new chapter anchor supported by retained props.
  placement("l2-153-supplies", "level2", "supplies", 152.8, "front", "small"),
  placement("l2-155-forge", "level2", "forgeShelter", 155.2, "rear", "standard"),
  placement("l2-159-handcart", "level2", "handcart", 158.6, "mid", "small", true),
  placement("l2-161-lantern", "level2", "lantern", 160.1, "mid", "small"),

  // Caravan rest.
  placement("l2-164-plants", "level2", "plants", 163.7, "front", "small"),
  placement("l2-167-camp-kitchen", "level2", "campKitchen", 166.8, "rear", "standard"),
  placement("l2-172-wagon", "level2", "wagon", 172.0, "rear", "large"),
  placement("l2-176-bench", "level2", "bench", 176.1, "mid", "small", true),
  placement("l2-179-fence", "level2", "fence", 179.0, "rear", "standard"),

  // Starwell herb court. The Level 2 ground portal at x187..189 stays clear.
  placement("l2-182-pergola", "level2", "pergola", 181.7, "rear", "small"),
  placement("l2-184-lantern", "level2", "lantern", 183.8, "mid", "small", true),
  placement("l2-194-herb-station", "level2", "herbStation", 193.8, "mid", "standard"),
  placement("l2-197-plants", "level2", "plants", 197.1, "front", "large"),
  placement("l2-199-handcart", "level2", "handcart", 199.3, "front", "small"),

  // Timberwright yard.
  placement("l2-203-supplies", "level2", "supplies", 203.0, "front", "standard"),
  placement("l2-208-timber-gantry", "level2", "timberGantry", 207.6, "rear", "large"),
  placement("l2-212-handcart", "level2", "handcart", 211.6, "mid", "standard", true),
  placement("l2-215-fence", "level2", "fence", 215.1, "rear", "small"),
  placement("l2-218-bench", "level2", "bench", 217.7, "mid", "standard"),

  // Heavenblocks observatory: intentionally low-profile through the flight lane.
  placement("l2-224-plants", "level2", "plants", 223.4, "front", "small"),
  placement("l2-230-observatory", "level2", "observatory", 229.8, "mid", "standard"),
  placement("l2-235-bench", "level2", "bench", 235.0, "mid", "small", true),
  placement("l2-239-supplies", "level2", "supplies", 239.0, "front", "small"),

  // Frontier survey garden.
  placement("l2-243-fence", "level2", "fence", 242.8, "rear", "small"),
  placement("l2-245-plants", "level2", "plants", 245.2, "front", "standard"),
  placement("l2-248-survey", "level2", "surveyStation", 248.4, "mid", "standard"),
  placement("l2-253-handcart", "level2", "handcart", 253.0, "mid", "small"),
  placement("l2-257-supplies", "level2", "supplies", 257.2, "front", "large", true),

  // Far-east expedition overlook.
  placement("l2-261-supplies", "level2", "supplies", 260.8, "front", "small"),
  placement("l2-264-wagon", "level2", "wagon", 264.2, "rear", "small", true),
  placement("l2-267-plants", "level2", "plants", 267.4, "front", "standard"),
  placement("l2-272-expedition", "level2", "expeditionShelter", 272.0, "rear", "standard"),
  placement("l2-276-bench", "level2", "bench", 276.2, "mid", "standard"),
  placement("l2-279-fence", "level2", "fence", 278.6, "rear", "small", true),
]);

const gallery = TITAN_DISCOVERY_CONFIG.surfaceGallery;
const galleryHalfWidthTiles = Math.max(
  gallery.maxWidthTiles * gallery.maximumScaleMultiplier,
  gallery.plinthWidthTiles,
) / 2;
export const TITAN_SURFACE_GALLERY_CLEAR_ZONE = Object.freeze({
  id: "titan-walk-gallery",
  levels: Object.freeze(["level1"]),
  leftTile: gallery.startTileX
    - galleryHalfWidthTiles
    - WORLD_VISUAL_SURFACE_PROPS.exclusions.titanGalleryPaddingTiles,
  rightTile: gallery.startTileX
    + (TITAN_DISCOVERY_CONFIG.definitions.length - 1) * gallery.spacingTiles
    + galleryHalfWidthTiles
    + WORLD_VISUAL_SURFACE_PROPS.exclusions.titanGalleryPaddingTiles,
});

export const WORLD_VISUAL_SURFACE_PROP_LAYOUT = Object.freeze({
  version: "surface-props-v5-additive-landscape-chapters",
  requiredSurfaceRanges: Object.freeze([
    Object.freeze({ id: "level1-surface", leftTile: 0, rightTile: 132 }),
    Object.freeze({ id: "level2-surface", leftTile: 132, rightTile: 280 }),
  ]),
  existingVisualCoverageBands: Object.freeze([
    Object.freeze({ id: "approved-town-benchmark", leftTile: 0, rightTile: 23.05 }),
    TITAN_SURFACE_GALLERY_CLEAR_ZONE,
    Object.freeze({ id: "door-bridge-arc-core", leftTile: 116.25, rightTile: 151.50 }),
    Object.freeze({ id: "level2-ground-sky-portal", leftTile: 185.5, rightTile: 190.5 }),
  ]),
  protectedClearZones: Object.freeze([
    Object.freeze({
      id: "town-square-interactions",
      levels: Object.freeze(["level1"]),
      leftTile: 0,
      rightTile: 22.75,
    }),
    TITAN_SURFACE_GALLERY_CLEAR_ZONE,
    Object.freeze({
      id: "level1-ground-sky-portal",
      levels: Object.freeze(["level1"]),
      leftTile: 91.5,
      rightTile: 96.5,
    }),
    Object.freeze({
      id: "heavenblock-surface-gates",
      levels: Object.freeze(["level1"]),
      leftTile: 102.5,
      rightTile: 117.5,
    }),
    Object.freeze({ id: "tunnel-bridge-arc-core", leftTile: 116.25, rightTile: 151.50 }),
    Object.freeze({
      id: "level2-ground-sky-portal",
      levels: Object.freeze(["level2"]),
      leftTile: 185.5,
      rightTile: 190.5,
    }),
  ]),
  lowProfileZones: Object.freeze([
    Object.freeze({
      id: "level2-heavenblock-flight-lane",
      levels: Object.freeze(["level2"]),
      leftTile: 218,
      rightTile: 243,
      maximumRenderedHeightMeters: 2.05,
    }),
  ]),
  placements: Object.freeze([
    ...LEVEL_ONE_PLACEMENTS,
    ...LEVEL_TWO_PLACEMENTS,
  ]),
});
