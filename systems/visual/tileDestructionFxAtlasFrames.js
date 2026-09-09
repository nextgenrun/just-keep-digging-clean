import { MINING_IMPACT_POLISH_CONFIG } from "../../values/miningImpactPolish.js";

const installed = new WeakSet();

function installGridFrames(texture, asset, families, frameNameFor) {
  if (!texture?.add) return false;
  if (installed.has(texture)) return true;
  const filter = globalThis.Phaser?.Textures?.FilterMode?.[MINING_IMPACT_POLISH_CONFIG.texture.linearFilter];
  if (filter !== undefined) texture.setFilter?.(filter);
  for (const [family, row] of Object.entries(families)) {
    for (let column = 0; column < asset.columns; column += 1) {
      const name = frameNameFor(family, column);
      if (texture.has?.(name)) continue;
      texture.add(
        name,
        0,
        column * asset.frameWidth,
        row * asset.frameHeight,
        asset.frameWidth,
        asset.frameHeight,
      );
    }
  }
  installed.add(texture);
  return true;
}

/** Installs the shared named frames used by destruction and grounded-foot FX. */
export function installTileDestructionFxAtlasFrames(scene, config) {
  const textures = scene?.textures;
  const coreAsset = config.assets.core;
  const shardAsset = config.assets.shards;
  if (!textures?.exists?.(coreAsset.key) || !textures.exists(shardAsset.key)) return false;
  const coreReady = installGridFrames(
    textures.get(coreAsset.key),
    coreAsset,
    config.families,
    (family, column) => `${family}-p${String(column + 1).padStart(2, "0")}`,
  );
  const shardsReady = installGridFrames(
    textures.get(shardAsset.key),
    shardAsset,
    config.families,
    (family, column) => `${family}-s${String(column + 1).padStart(2, "0")}`,
  );
  return coreReady && shardsReady;
}
