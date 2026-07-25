import { TILE_TYPES } from "../../../values/tileTypes.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../../../values/worldVisualSemanticAssets.js";

function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualBedrockMaterialLayer] Missing source: ${key}`);
  }
  return { width: source.width, height: source.height };
}

function isBedrock(type) {
  return type === TILE_TYPES.BEDROCK || type === TILE_TYPES.CAVE_WALL;
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
    this.planes = new Map();
    this.activeBounds = null;
  }

  create() {
    const material = this.config.bedrock.material;
    if (!this.scene.textures.exists(material.key)) {
      throw new Error(`[WorldVisualBedrockMaterialLayer] Required bedrock material was not preloaded: ${material.key}`);
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
        if (!isBedrock(this.worldModel.getTileType(tx, ty))) continue;
        this.maskGraphics.fillRect(tx * tileSize, ty * tileSize, tileSize + 0.5, tileSize + 0.5);
        visibleCells += 1;
      }
    }
    this._syncPlanes(bounds, visibleCells > 0);
    this.setLighting(lighting);
  }

  _syncPlanes(bounds, hasBedrock) {
    const needed = new Set();
    if (hasBedrock) {
      const key = this.config.bedrock.material.key;
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
          if (this.planes.has(id)) continue;
          const image = this.scene.add.image(column * size.width, row * size.height, key)
            .setOrigin(0)
            .setDepth(this.config.render.bedrockDepth)
            .setMask(this.geometryMask)
            .setAlpha(this.config.bedrock.alpha);
          image.name = `world-visual-semantic-bedrock-${id}`;
          this.planes.set(id, image);
        }
      }
    }
    for (const [id, image] of this.planes) {
      if (needed.has(id)) continue;
      image.destroy();
      this.planes.delete(id);
    }
  }

  setLighting(lighting) {
    const terrainTint = lighting?.terrainTint || 0xffffff;
    const lifted = mixColor(terrainTint, 0xffffff, this.config.bedrock.lightingLift);
    const tint = mixColor(lifted, this.config.bedrock.coolTint, this.config.bedrock.coolTintStrength);
    this.planes.forEach(image => image.setTint(tint).setAlpha(this.config.bedrock.alpha));
  }

  invalidateCell(tx, ty, lighting) {
    const bounds = this.activeBounds;
    if (!bounds || tx < bounds.left || tx >= bounds.right || ty < bounds.top || ty >= bounds.bottom) return;
    this.sync(bounds, lighting);
  }

  destroy() {
    this.planes.forEach(image => image.destroy());
    this.planes.clear();
    this.geometryMask?.destroy();
    this.maskGraphics?.destroy();
    this.geometryMask = null;
    this.maskGraphics = null;
    this.activeBounds = null;
  }
}
