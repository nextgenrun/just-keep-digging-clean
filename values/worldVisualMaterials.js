const material = (key, path) => Object.freeze({ key, path });
const band = (id, materialId, topTile, bottomTileExclusive, tint = 0xffffff) => Object.freeze({
  id,
  materialId,
  topTile,
  bottomTileExclusive,
  tint,
});

export const WORLD_VISUAL_MATERIALS = Object.freeze({
  townEarth: material(
    "world-visual-v2-material-town-earth",
    "sprites/backgrounds/world-visual-v2/materials/town-dark-earth-v1.png"
  ),
  shallowBlue: material(
    "world-visual-v2-material-shallow-blue",
    "sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp"
  ),
  amberCrystal: material(
    "world-visual-v2-material-amber-crystal",
    "sprites/backgrounds/world-scenic-facade-v1/level1-amber-crystal-seamless.webp"
  ),
  silverCore: material(
    "world-visual-v2-material-silver-core",
    "sprites/backgrounds/world-scenic-facade-v1/level1-silver-core-seamless.webp"
  ),
  magma: material(
    "world-visual-v2-material-magma",
    "sprites/backgrounds/world-scenic-facade-v1/level2-current-magma-seamless.webp"
  ),
  obsidian: material(
    "world-visual-v2-material-obsidian",
    "sprites/backgrounds/world-scenic-facade-v1/level2-obsidian-ember-seamless.webp"
  ),
  foundry: material(
    "world-visual-v2-material-foundry",
    "sprites/backgrounds/world-scenic-facade-v1/level2-foundry-heart-seamless.webp"
  ),
  blackglass: material(
    "world-visual-v2-material-blackglass",
    "sprites/backgrounds/world-scenic-facade-v1/level2-future-blackglass-seamless.webp"
  ),
  starfire: material(
    "world-visual-v2-material-starfire",
    "sprites/backgrounds/world-scenic-facade-v1/level2-future-starfire-seamless.webp"
  ),
});

export const WORLD_VISUAL_MATERIAL_BANDS = Object.freeze([
  band("surface-earth", "townEarth", 65, 160),
  band("level1-shallow", "shallowBlue", 160, 520, 0xe8f2ff),
  band("level1-amber", "amberCrystal", 520, 1040),
  band("level1-silver", "silverCore", 1040, 1600),
  band("level1-deep-magma", "magma", 1600, 2065, 0xe9eef2),
  band("level2-magma", "magma", 2065, 2665),
  band("level2-obsidian", "obsidian", 2665, 3265),
  band("level2-foundry", "foundry", 3265, 3865),
  band("level2-blackglass", "blackglass", 3865, 4465),
  band("level2-starfire", "starfire", 4465, 5065),
]);

export function getWorldVisualMaterialAssets() {
  return Object.values(WORLD_VISUAL_MATERIALS);
}

// Only the surface material is required to enter the world. Deeper material
// packs are streamed by WorldVisualMaterialField when the camera crosses a
// band boundary. Keeping them out of BootScene prevents every 2508px source
// texture from being decoded and uploaded at once.
export function getWorldVisualStartupMaterialAssets() {
  return [WORLD_VISUAL_MATERIALS.townEarth];
}

export function getWorldVisualMaterialByKey(key) {
  return Object.values(WORLD_VISUAL_MATERIALS).find(entry => entry.key === key) || null;
}

export function resolveWorldVisualMaterialBand(tileY) {
  if (tileY < WORLD_VISUAL_MATERIAL_BANDS[0].topTile) {
    return WORLD_VISUAL_MATERIAL_BANDS[0];
  }
  return WORLD_VISUAL_MATERIAL_BANDS.find(entry => (
    tileY >= entry.topTile && tileY < entry.bottomTileExclusive
  )) || WORLD_VISUAL_MATERIAL_BANDS[WORLD_VISUAL_MATERIAL_BANDS.length - 1];
}

export function resolveWorldVisualMaterialBands(topTile, bottomTileExclusive) {
  if (bottomTileExclusive <= topTile) return [];
  return WORLD_VISUAL_MATERIAL_BANDS.filter(entry => (
    entry.bottomTileExclusive > topTile && entry.topTile < bottomTileExclusive
  ));
}

export function validateWorldVisualMaterialCoverage(topTile = 65, bottomTileExclusive = 5065) {
  let cursor = topTile;
  for (const entry of WORLD_VISUAL_MATERIAL_BANDS) {
    if (entry.topTile !== cursor || entry.bottomTileExclusive <= entry.topTile) return false;
    if (!WORLD_VISUAL_MATERIALS[entry.materialId]) return false;
    cursor = entry.bottomTileExclusive;
  }
  return cursor === bottomTileExclusive;
}
