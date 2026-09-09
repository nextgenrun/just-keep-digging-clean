import { HEAVENBLOCKS_ACCESS_CONFIG } from "../../values/heavenblocksAccessConfig.js";
import { REGENERATED_HEAVENBLOCK_VISUALS as CONFIG } from "../../values/regeneratedHeavenblockVisuals.js";

// Paints only a fresh transparent rock silhouette at the real platform edge.
export function addRegeneratedHeavenblockImages(owner) {
  const { scene } = owner;
  const key = CONFIG.asset.key;
  if (!scene.textures.exists(key)) {
    console.warn(`[V11SkyIslandVisualSystem] Missing regenerated island texture: ${key}`);
    return;
  }
  const source = scene.textures.get(key)?.getSourceImage?.();
  if (!source?.width || !source?.height) return;
  const sourceContactWidth = source.width - CONFIG.contact.leftPx - CONFIG.contact.rightInsetPx;
  const tileSize = scene.config.tileSize;
  for (const region of HEAVENBLOCKS_ACCESS_CONFIG.regions) {
    const { platform } = region;
    const width = (platform.rightTxExclusive - platform.leftTx) * tileSize;
    const scale = Math.min(CONFIG.maxSourceScale, width / sourceContactWidth);
    const left = platform.leftTx * tileSize + (width - sourceContactWidth * scale) / 2;
    const top = platform.floorTy * tileSize;
    const image = scene.add.image(
      left - CONFIG.contact.leftPx * scale,
      top - CONFIG.contact.topPx * scale,
      key,
    ).setOrigin(0, 0).setDepth(CONFIG.depth).setScale(scale);
    image.name = `${region.id}:${key}`;
    image._regeneratedIslandPlacement = { left, top, width, scale, floorTy: platform.floorTy };
    owner.sprites.push(image);
    owner.heavenblockSprites.set(region.id, [image]);
  }
}
