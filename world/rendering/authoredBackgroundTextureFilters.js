import { AUTHORED_BACKGROUND_ASSET_OVERRIDES } from "../../values/authoredBackgroundAssetOverrides.js";

export function applyAuthoredBackgroundTextureFilter(scene, textureKey, rawFilename) {
  if (!AUTHORED_BACKGROUND_ASSET_OVERRIDES.smoothFiltering) return;

  const filename = getBasename(rawFilename);
  const isOverride = Boolean(AUTHORED_BACKGROUND_ASSET_OVERRIDES.byFilename[normalizeFilename(filename)]);
  const isProp = /^prop_\d+_.+\.(webp|png)$/i.test(filename);
  if (!isOverride && !isProp) return;

  const texture = scene.textures.get(textureKey);
  const filterMode = globalThis.Phaser?.Textures?.FilterMode?.LINEAR;
  if (texture?.setFilter && filterMode !== undefined) {
    texture.setFilter(filterMode);
  }
}

function getBasename(filename) {
  const cleaned = String(filename || "").trim();
  return cleaned.split(/[\\/]/).pop() || cleaned;
}

function normalizeFilename(filename) {
  try {
    return decodeURIComponent(filename).toLowerCase();
  } catch (_) {
    return String(filename).toLowerCase();
  }
}
