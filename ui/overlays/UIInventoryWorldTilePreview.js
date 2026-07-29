import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../../values/worldVisualSemanticAssets.js";

function requireTexture(scene, key, owner) {
  if (!key || !scene.textures.exists(key)) {
    throw new Error(`[${owner}] Required production texture was not preloaded: ${key}`);
  }
  return scene.textures.get(key);
}

function addTileBorder(scene, parent, x, y, size) {
  const border = scene.add.graphics();
  border.fillStyle(0x05080b, 1);
  border.fillRoundedRect(x - size / 2 - 3, y - size / 2 - 3, size + 6, size + 6, 5);
  border.lineStyle(1, UI_COLORS.borderDim, 1);
  border.strokeRoundedRect(x - size / 2 - 3, y - size / 2 - 3, size + 6, size + 6, 5);
  parent.add(border);
}

export function installInventoryResourceFrames(scene) {
  const atlas = WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas;
  const texture = requireTexture(scene, atlas.key, "UIInventoryWorldTilePreview");
  for (let index = 0; index < atlas.frameCount; index += 1) {
    const frameName = `${atlas.framePrefix}${index}`;
    if (texture.has(frameName)) continue;
    texture.add(
      frameName,
      0,
      (index % atlas.columns) * atlas.frameSizePx,
      Math.floor(index / atlas.columns) * atlas.frameSizePx,
      atlas.frameSizePx,
      atlas.frameSizePx
    );
  }
  return atlas;
}

function addWorldGroundLayers(scene, parent, groundSlot, typeIndex, x, y, size) {
  const soil = ASSET_KEYS.tiles.dynamicSoil;
  const groundKey = soil[groundSlot.group]?.[groundSlot.band]?.[groundSlot.variant];
  requireTexture(scene, groundKey, "UIInventoryWorldTilePreview");
  const layers = [scene.add.image(x, y, groundKey).setDisplaySize(size, size)];
  if (typeIndex > 0) {
    const shadeAlpha = typeIndex === 1 ? 0.17 : 0.34;
    layers.push(scene.add.rectangle(x, y, size, size, 0x050409, shadeAlpha));
    const hardnessKey = typeIndex === 1 ? soil.hardness.compact : soil.hardness.strong;
    requireTexture(scene, hardnessKey, "UIInventoryWorldTilePreview");
    layers.push(scene.add.image(x, y, hardnessKey).setDisplaySize(size, size));
  }
  const intactCrackKey = soil.cracks[4];
  requireTexture(scene, intactCrackKey, "UIInventoryWorldTilePreview");
  layers.push(scene.add.image(x, y, intactCrackKey).setDisplaySize(size, size));
  parent.add(layers);
  return layers;
}

export function addInventoryWorldTile(scene, parent, options) {
  const {
    atlas,
    resourceKey = null,
    variant = 0,
    groundSlot,
    groundTypeIndex = 0,
    x,
    y,
    size,
  } = options;
  addTileBorder(scene, parent, x, y, size);
  const groundLayers = addWorldGroundLayers(
    scene,
    parent,
    groundSlot,
    groundTypeIndex,
    x,
    y,
    size
  );
  let resource = null;
  if (resourceKey) {
    const frameStart = WORLD_VISUAL_SEMANTIC_ASSETS.resources.frameStarts[resourceKey];
    if (!Number.isInteger(frameStart)) {
      throw new Error(`[UIInventoryWorldTilePreview] Unknown production resource: ${resourceKey}`);
    }
    resource = scene.add.image(
      x,
      y,
      atlas.key,
      `${atlas.framePrefix}${frameStart + variant}`
    ).setDisplaySize(size, size);
    parent.add(resource);
  }
  return { groundLayers, resource };
}

export function addInventoryLavaDirtTile(scene, parent, options) {
  const { stage, x, y, size } = options;
  const textureKey = ASSET_KEYS.tiles[`lavaDirtHp${stage}`];
  requireTexture(scene, textureKey, "UIInventoryWorldTilePreview");
  addTileBorder(scene, parent, x, y, size);
  const image = scene.add.image(x, y, textureKey).setDisplaySize(size, size);
  parent.add(image);
  return image;
}
