import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { ARC_CORE_VISUAL_CONFIG } from "../../../values/arcCoreVisualConfig.js";

const REVIEW_TILE = Object.freeze({
  AIR: 0,
  DIRT: 1,
  STONE: 2,
  FLOOR: 3,
  BEDROCK: 4,
});

function validateTargetTextures(scene) {
  const textures = ARC_CORE_VISUAL_CONFIG.reviewStage.targetTextures;
  for (const texture of Object.values(textures)) {
    if (!scene.textures.exists(texture.key)) {
      throw new Error(`Arc Core review target texture is missing: ${texture.key}`);
    }
  }
}

function obtainTile(state, index) {
  if (state.tiles[index]) return state.tiles[index];
  const tile = state.scene.add.image(0, 0, state.targetTextures.dirt.key)
    .setOrigin(0.5)
    .setDepth(state.targetTileDepth)
    .setVisible(false);
  state.tiles[index] = tile;
  return tile;
}

function resolveTileStyle(state, type) {
  if (type === REVIEW_TILE.DIRT) {
    return {
      texture: state.targetTextures.dirt,
      tint: state.targetTileTints.dirt,
    };
  }
  if (type === REVIEW_TILE.STONE) {
    return {
      texture: state.targetTextures.stone,
      tint: state.targetTileTints.stone,
    };
  }
  if (type === REVIEW_TILE.FLOOR) {
    return {
      texture: state.targetTextures.stone,
      tint: state.targetTileTints.floor,
    };
  }
  if (type === REVIEW_TILE.BEDROCK) {
    return {
      texture: state.targetTextures.stone,
      tint: state.targetTileTints.bedrock,
    };
  }
  return null;
}

export function createArcCorePiskelStage(scene, artwork) {
  if (!scene.textures.exists(ASSET_KEYS.vehicles.arcCore.reviewStage)) {
    throw new Error("Approved Arc Core Piskel review background is missing");
  }
  const depth = artwork?.meta?.reviewStage?.depth;
  if (!Number.isFinite(depth)) {
    throw new Error("Arc Core Piskel review background depth is missing");
  }
  validateTargetTextures(scene);
  const stageConfig = ARC_CORE_VISUAL_CONFIG.reviewStage;
  return {
    scene,
    tiles: [],
    targetTextures: stageConfig.targetTextures,
    targetTileDepth: stageConfig.targetTileDepth,
    targetTileAlpha: stageConfig.targetTileAlpha,
    targetTileTints: stageConfig.targetTileTints,
    tileCullPaddingTiles: stageConfig.tileCullPaddingTiles,
    background: scene.add.image(
      0,
      0,
      ASSET_KEYS.vehicles.arcCore.reviewStage,
    ).setOrigin(0.5)
      .setDepth(depth)
      .setVisible(false),
  };
}

export function hideArcCorePiskelStage(state) {
  if (!state) return;
  state.background.setVisible(false);
  for (const tile of state.tiles) tile.setVisible(false);
}

export function drawArcCorePiskelStage(state, options) {
  const cameraView = options?.camera?.worldView;
  if (!state || !cameraView) return false;
  state.background
    .setPosition(cameraView.centerX, cameraView.centerY)
    .setDisplaySize(cameraView.width, cameraView.height)
    .setVisible(true);
  let visibleTileCount = 0;
  const world = options.world || [];
  const tileSize = options.tileSize;
  const padding = state.tileCullPaddingTiles;
  const firstRow = Math.max(0, Math.floor(cameraView.top / tileSize) - padding);
  const lastRow = Math.min(
    world.length - 1,
    Math.ceil(cameraView.bottom / tileSize) + padding,
  );
  const maxColumns = world[0]?.length || 0;
  const firstColumn = Math.max(0, Math.floor(cameraView.left / tileSize) - padding);
  const lastColumn = Math.min(
    maxColumns - 1,
    Math.ceil(cameraView.right / tileSize) + padding,
  );
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const type = world[row][column];
      const style = resolveTileStyle(state, type);
      if (!style) continue;
      obtainTile(state, visibleTileCount)
        .setTexture(style.texture.key)
        .setPosition((column + 0.5) * tileSize, (row + 0.5) * tileSize)
        .setDisplaySize(tileSize, tileSize)
        .setAlpha(state.targetTileAlpha)
        .setTint(style.tint)
        .setVisible(true);
      visibleTileCount += 1;
    }
  }
  for (let index = visibleTileCount; index < state.tiles.length; index += 1) {
    state.tiles[index].setVisible(false);
  }
  return true;
}
