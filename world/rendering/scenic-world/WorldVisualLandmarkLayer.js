import { WORLD_VISUAL_LANDMARKS } from "../../../values/worldVisualLandmarks.js";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function getSourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualLandmarkLayer] Missing source dimensions: ${key}`);
  }
  return { width: source.width, height: source.height };
}

export function resolveWorldVisualLandmarkAnchor(scene, worldModel, entry) {
  const kind = entry.anchor?.kind;
  if (kind === "shallowestSafeCaveMouth" || kind === "shallowestStandaloneCaveMouth") {
    const standaloneOnly = kind === "shallowestStandaloneCaveMouth";
    const zone = (worldModel?.caveZones || [])
      .filter(candidate => candidate?.mouthAnchor && (!standaloneOnly || candidate.standaloneScene))
      .filter(candidate => {
        const entryTile = candidate.entry || {
          tx: Math.ceil(candidate.mouthAnchor.tx),
          ty: candidate.mouthAnchor.ty,
        };
        return !worldModel.isSolid(entryTile.tx, entryTile.ty)
          && worldModel.isSolid(entryTile.tx, entryTile.ty + 1);
      })
      .sort((a, b) => a.mouthAnchor.ty - b.mouthAnchor.ty || a.mouthAnchor.tx - b.mouthAnchor.tx)[0];
    if (!zone) {
      console.warn(`[WorldVisualLandmarkLayer] No safe cave mouth for ${entry.id}; landmark skipped`);
      return null;
    }
    return {
      tileX: zone.mouthAnchor.tx + entry.anchor.xDeltaTiles,
      floorTileY: zone.mouthAnchor.ty + 1 + entry.anchor.floorDeltaTiles,
      zoneId: zone.id,
    };
  }
  throw new Error(`[WorldVisualLandmarkLayer] Unknown anchor kind for ${entry.id}`);
}

export class WorldVisualLandmarkLayer {
  constructor(scene, worldModel, config = WORLD_VISUAL_LANDMARKS) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.instances = [];
  }

  create() {
    for (const asset of Object.values(this.config.assets)) {
      if (!this.scene.textures.exists(asset.key)) {
        throw new Error(`[WorldVisualLandmarkLayer] Required texture was not preloaded: ${asset.key}`);
      }
    }
    for (const entry of this.config.entries) {
      const instance = this._createEntry(entry);
      if (instance) this.instances.push(instance);
    }
  }

  _createEntry(entry) {
    const tileSize = this.scene.config.tileSize;
    const beautyAsset = this.config.assets[entry.beautyAssetId];
    const emissiveAsset = this.config.assets[entry.emissiveAssetId];
    if (!beautyAsset || !emissiveAsset) {
      throw new Error(`[WorldVisualLandmarkLayer] Unknown asset mapping for ${entry.id}`);
    }

    const source = getSourceSize(this.scene, beautyAsset.key);
    const crop = entry.crop;
    if (
      crop.x < 0
      || crop.y < 0
      || crop.x + crop.width > source.width
      || crop.y + crop.height > source.height
    ) {
      throw new Error(`[WorldVisualLandmarkLayer] Crop exceeds ${beautyAsset.key}`);
    }

    const anchor = resolveWorldVisualLandmarkAnchor(this.scene, this.worldModel, entry);
    if (!anchor) return null;
    const x = anchor.tileX * tileSize;
    const y = anchor.floorTileY * tileSize;
    const scale = entry.displayWidthTiles * tileSize / crop.width;
    const originX = (crop.x + crop.width / 2) / source.width;
    const originY = (crop.y + crop.height) / source.height;
    const configure = (image, depth) => image
      .setOrigin(originX, originY)
      .setCrop(crop.x, crop.y, crop.width, crop.height)
      .setScale(scale)
      .setDepth(depth);

    const beauty = configure(
      this.scene.add.image(x, y, beautyAsset.key),
      entry.beautyDepth
    );
    beauty.name = `${entry.id}-beauty`;

    const emissive = configure(
      this.scene.add.image(x, y, emissiveAsset.key),
      entry.emissiveDepth
    ).setBlendMode(Phaser.BlendModes.ADD);
    emissive.name = `${entry.id}-emissive`;

    return { entry, beauty, emissive };
  }

  update(time, lighting) {
    const now = Number(time) || 0;
    for (const instance of this.instances) {
      const { entry, beauty, emissive } = instance;
      const cfg = entry.emissive;
      const phase = now / cfg.pulsePeriodMs * Math.PI * 2 + cfg.phase;
      const pulse = 1 + Math.sin(phase) * cfg.pulseAmount;
      const lightAlpha = (
        cfg.baseAlpha
        + clamp01(lighting.night) * cfg.nightAlpha
        + clamp01(lighting.wet) * cfg.wetAlpha
        + clamp01(lighting.lightning) * cfg.lightningAlpha
      ) * pulse;
      setTintIfChanged(beauty, lighting.farTint);
      setAlphaIfChanged(emissive, clamp01(lightAlpha));
    }
  }

  destroy() {
    for (const { beauty, emissive } of this.instances) {
      beauty.destroy();
      emissive.destroy();
    }
    this.instances = [];
  }
}
