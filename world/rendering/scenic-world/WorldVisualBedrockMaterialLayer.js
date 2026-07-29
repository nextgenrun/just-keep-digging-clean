import {
  TILE_TYPES,
  isUnbreakableMiningSurface,
} from "../../../values/tileTypes.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../../../values/worldVisualSemanticAssets.js";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";

export function isWorldVisualBedrockMaterialTileType(tileType) {
  return isUnbreakableMiningSurface(tileType)
    && tileType !== TILE_TYPES.FLOOR_TOWN_1
    && tileType !== TILE_TYPES.FLOOR_TOWN_2;
}

function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualBedrockMaterialLayer] Missing source: ${key}`);
  }
  return { width: source.width, height: source.height };
}

function mixColor(from, to, amount) {
  const t = Math.max(0, Math.min(1, Number(amount) || 0));
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  return (
    (Math.round(fr + (tr - fr) * t) << 16)
    | (Math.round(fg + (tg - fg) * t) << 8)
    | Math.round(fb + (tb - fb) * t)
  );
}

export class WorldVisualBedrockMaterialLayer {
  constructor(scene, worldModel, config = WORLD_VISUAL_SEMANTIC_ASSETS) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.maskGraphics = null;
    this.geometryMask = null;
    this.seamPlanes = new Map();
    this.planes = new Map();
    this.activeBounds = null;
  }

  create() {
    const materials = [
      this.config.bedrock.seamMaterial,
      this.config.bedrock.material,
    ].filter(Boolean);
    for (const material of materials) {
      if (!this.scene.textures.exists(material.key)) {
        throw new Error(`[WorldVisualBedrockMaterialLayer] Required bedrock material was not preloaded: ${material.key}`);
      }
    }
    this.maskGraphics = this.scene.make.graphics({ add: false });
    this.geometryMask = this.maskGraphics.createGeometryMask();
  }

  sync(bounds, lighting) {
    if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top) return;
    this.activeBounds = { ...bounds };
    const tileSize = this.scene.config.tileSize;
    let visibleCells = 0;
    this.maskGraphics.clear().fillStyle(0xffffff, 1);
    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        if (!isWorldVisualBedrockMaterialTileType(
          this.worldModel.getTileType(tx, ty),
        )) continue;
        this.maskGraphics.fillRect(tx * tileSize, ty * tileSize, tileSize + 0.5, tileSize + 0.5);
        visibleCells += 1;
      }
    }
    this._syncPlanes(bounds, visibleCells > 0);
    this.setLighting(lighting);
  }

  _syncPlanes(bounds, hasBedrock) {
    this._syncPlaneSet(
      this.seamPlanes,
      this.config.bedrock.seamMaterial,
      bounds,
      hasBedrock,
      this.config.render.bedrockSeamDepth,
      this.config.bedrock.seamAlpha,
      "bedrock-seam"
    );
    this._syncPlaneSet(
      this.planes,
      this.config.bedrock.material,
      bounds,
      hasBedrock,
      this.config.render.bedrockDepth,
      this.config.bedrock.alpha,
      "bedrock-accent"
    );
  }

  _syncPlaneSet(planes, material, bounds, hasBedrock, depth, alpha, name) {
    const needed = new Set();
    if (hasBedrock && material) {
      const key = material.key;
      const size = sourceSize(this.scene, key);
      const tileSize = this.scene.config.tileSize;
      const leftPx = bounds.left * tileSize;
      const rightPx = bounds.right * tileSize;
      const topPx = bounds.top * tileSize;
      const bottomPx = bounds.bottom * tileSize;
      const firstColumn = Math.floor(leftPx / size.width);
      const lastColumn = Math.ceil(rightPx / size.width);
      const firstRow = Math.floor(topPx / size.height);
      const lastRow = Math.ceil(bottomPx / size.height);
      for (let row = firstRow; row < lastRow; row += 1) {
        for (let column = firstColumn; column < lastColumn; column += 1) {
          const id = `${column}:${row}`;
          needed.add(id);
          if (planes.has(id)) continue;
          const image = this.scene.add.image(column * size.width, row * size.height, key)
            .setOrigin(0)
            .setDepth(depth)
            .setMask(this.geometryMask)
            .setAlpha(alpha);
          image.name = `world-visual-semantic-${name}-${id}`;
          planes.set(id, image);
        }
      }
    }
    for (const [id, image] of planes) {
      if (needed.has(id)) continue;
      image.destroy();
      planes.delete(id);
    }
  }

  setLighting(lighting) {
    const terrainTint = lighting?.terrainTint || 0xffffff;
    const lifted = mixColor(terrainTint, 0xffffff, this.config.bedrock.lightingLift);
    const tint = mixColor(lifted, this.config.bedrock.coolTint, this.config.bedrock.coolTintStrength);
    this.seamPlanes.forEach(image => {
      setTintIfChanged(image, tint);
      setAlphaIfChanged(image, this.config.bedrock.seamAlpha);
    });
    this.planes.forEach(image => {
      setTintIfChanged(image, tint);
      setAlphaIfChanged(image, this.config.bedrock.alpha);
    });
  }

  invalidateCell(tx, ty, lighting) {
    const bounds = this.activeBounds;
    if (!bounds || tx < bounds.left || tx >= bounds.right || ty < bounds.top || ty >= bounds.bottom) return;
    this.sync(bounds, lighting);
  }

  destroy() {
    this.seamPlanes.forEach(image => image.destroy());
    this.seamPlanes.clear();
    this.planes.forEach(image => image.destroy());
    this.planes.clear();
    this.geometryMask?.destroy();
    this.maskGraphics?.destroy();
    this.geometryMask = null;
    this.maskGraphics = null;
    this.activeBounds = null;
  }
}
