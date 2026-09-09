const ASSET_ROOT = "sprites/environment/starless-scar-biomes-v1/runtime";

const asset = (paletteId, role) => Object.freeze({
  key: `environment-starless-scar-biome-v1-${paletteId}-${role}`,
  path: `${ASSET_ROOT}/${paletteId}-${role}-v1.webp`,
  type: "image",
});

const palette = (id, parentRegionId) => Object.freeze({
  id,
  parentRegionId,
  assets: Object.freeze({
    ground: asset(id, "ground"),
    center: asset(id, "center"),
    frontier: asset(id, "frontier"),
    props: asset(id, "props"),
  }),
});

const PALETTES = Object.freeze([
  palette("weathered-rootways", "surface-entry"),
  palette("fungal-rainwells", "surface-entry"),
  palette("sunken-orchard", "surface-entry"),
  palette("timber-cisterns", "surface-entry"),
  palette("cobalt-aquifer", "level1-blue"),
  palette("sapphire-grotto", "level1-blue"),
  palette("glacial-waterveil", "level1-blue"),
  palette("drowned-observatory", "level1-blue"),
  palette("amber-silt-fault", "level1-amber"),
  palette("honeyglass-pocket", "level1-amber"),
  palette("resin-archive", "level1-amber"),
  palette("fossil-sun-vault", "level1-amber"),
  palette("mercury-fold", "level1-silver"),
  palette("magnetic-needle-reef", "level1-silver"),
  palette("lunar-mint-galleries", "level1-silver"),
  palette("mirrorstone-convergence", "level1-silver"),
  palette("basalt-emberworks", "level1-magma"),
  palette("obsidian-caldera", "level1-magma"),
  palette("lavawheel-necropolis", "level1-magma"),
  palette("shattered-furnace", "level1-magma"),
]);

const PALETTE_BY_ID = Object.freeze(Object.fromEntries(
  PALETTES.map(entry => [entry.id, entry]),
));

const IDS_BY_REGION = Object.freeze({
  "surface-entry": Object.freeze([
    "weathered-rootways", "fungal-rainwells", "sunken-orchard", "timber-cisterns",
  ]),
  "level1-blue": Object.freeze([
    "cobalt-aquifer", "sapphire-grotto", "glacial-waterveil", "drowned-observatory",
  ]),
  "level1-amber": Object.freeze([
    "amber-silt-fault", "honeyglass-pocket", "resin-archive", "fossil-sun-vault",
  ]),
  "level1-silver": Object.freeze([
    "mercury-fold", "magnetic-needle-reef", "lunar-mint-galleries",
    "mirrorstone-convergence",
  ]),
  "level1-magma": Object.freeze([
    "basalt-emberworks", "obsidian-caldera", "lavawheel-necropolis",
    "shattered-furnace",
  ]),
  "level2-slagworks": Object.freeze([
    "basalt-emberworks", "magnetic-needle-reef", "honeyglass-pocket",
    "lavawheel-necropolis",
  ]),
  "level2-obsidian": Object.freeze([
    "obsidian-caldera", "mirrorstone-convergence", "sapphire-grotto",
    "shattered-furnace",
  ]),
  "level2-foundry": Object.freeze([
    "honeyglass-pocket", "magnetic-needle-reef", "basalt-emberworks",
    "drowned-observatory",
  ]),
  "level2-blackglass": Object.freeze([
    "mirrorstone-convergence", "sapphire-grotto", "obsidian-caldera", "mercury-fold",
  ]),
  "level2-starfire": Object.freeze([
    "lunar-mint-galleries", "shattered-furnace", "sapphire-grotto",
    "fossil-sun-vault",
  ]),
});

export const STARLESS_SCAR_BIOME_PALETTES = Object.freeze({
  enabledByDefault: true,
  queryParam: "scarBiomeLibrary",
  disabledValues: Object.freeze(["0", "false", "off", "disabled", "legacy"]),
  paletteCount: PALETTES.length,
  palettes: PALETTES,
  paletteById: PALETTE_BY_ID,
  paletteIdsByRegion: IDS_BY_REGION,
  fallbackPaletteId: "weathered-rootways",
  propAtlas: Object.freeze({ frameWidthPx: 256, frameHeightPx: 256, frameCount: 4 }),
});

export function resolveStarlessScarBiomeLibraryEnabled(
  config = STARLESS_SCAR_BIOME_PALETTES,
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  return config.enabledByDefault !== false
    && !(value && config.disabledValues.includes(value));
}

export function getStarlessScarBiomePalette(
  paletteId,
  config = STARLESS_SCAR_BIOME_PALETTES,
) {
  return config.paletteById[paletteId] || null;
}

export function resolveStarlessScarRegionPalette(
  regionId,
  stableSeed = 0,
  config = STARLESS_SCAR_BIOME_PALETTES,
) {
  const ids = config.paletteIdsByRegion[regionId]
    || [config.fallbackPaletteId];
  const index = Math.abs(Math.trunc(Number(stableSeed) || 0)) % ids.length;
  return getStarlessScarBiomePalette(ids[index], config)
    || getStarlessScarBiomePalette(config.fallbackPaletteId, config);
}
