import { TILE_TYPES } from "../../values/tileTypes.js";
import { HEAVENBLOCKS_WORLD_CONFIG } from "../../values/heavenblocksWorldConfig.js";

function hash01(seed, tx, ty, salt = 0) {
  let value = Math.imul((seed | 0) ^ salt, 0x45d9f3b);
  value ^= Math.imul(tx | 0, 0x27d4eb2d);
  value ^= Math.imul(ty | 0, 0x165667b1);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function clearRegion(model, region) {
  for (let ty = region.bounds.top; ty <= region.bounds.bottom; ty += 1) {
    for (let tx = region.bounds.left; tx <= region.bounds.right; tx += 1) {
      model.setTile(tx, ty, TILE_TYPES.AIR, 0);
      const index = model.index(tx, ty);
      model.rootOverlay[index] = 0;
      model.skyTileOriginalType[index] = 0;
      model.skyTileRarity[index] = 0;
    }
  }
}

function resolveSurfaceRow(region, tx) {
  const wave = Math.sin(tx * region.surface.frequency + region.surface.phase);
  return Math.round(region.surface.baseRow + wave * region.surface.waveAmplitude);
}

function resolveThickness(region, tx) {
  const halfWidth = Math.max(1, (region.bounds.right - region.bounds.left) * 0.5);
  const normalized = Math.min(1, Math.abs(tx - region.centerTileX) / halfWidth);
  const taper = 1 - Math.pow(normalized, region.body.taperPower);
  return Math.round(
    region.body.minThickness
    + (region.body.maxThickness - region.body.minThickness) * taper
  );
}

function chooseMaterial(model, region, tx, ty) {
  const seed = model.config.seed || 0;
  const roll = hash01(seed, tx, ty, region.ore.salt);
  const neighborRoll = hash01(seed, tx >> 1, ty >> 1, region.ore.salt + 91);
  const clusteredChance = neighborRoll < region.ore.clusterChance
    ? region.ore.chance * 2.35
    : region.ore.chance;
  return roll < clusteredChance ? region.oreTileType : region.baseTileType;
}

function fillIslandBody(model, region) {
  for (let tx = region.bounds.left; tx <= region.bounds.right; tx += 1) {
    const surfaceTy = Math.max(region.bounds.top, resolveSurfaceRow(region, tx));
    const bottomTy = Math.min(
      region.bounds.bottom,
      surfaceTy + resolveThickness(region, tx)
    );
    for (let ty = surfaceTy; ty <= bottomTy; ty += 1) {
      const type = chooseMaterial(model, region, tx, ty);
      model.setTile(tx, ty, type, model.getTileMaxHp(tx, ty, type));
    }
  }
}

function carveRect(model, rect) {
  for (let ty = rect.top; ty < rect.top + rect.height; ty += 1) {
    for (let tx = rect.left; tx < rect.left + rect.width; tx += 1) {
      model.setTile(tx, ty, TILE_TYPES.AIR, 0);
    }
  }
}

function prepareStandingArea(model, region, tx, floorTy, halfWidth = 2) {
  for (let x = tx - halfWidth; x <= tx + halfWidth; x += 1) {
    for (let y = floorTy - 3; y < floorTy; y += 1) {
      model.setTile(x, y, TILE_TYPES.AIR, 0);
    }
    const type = chooseMaterial(model, region, x, floorTy);
    model.setTile(x, floorTy, type, model.getTileMaxHp(x, floorTy, type));
  }
}

function preparePortalSlots(model, region, slots) {
  for (const slot of slots) {
    for (let tx = slot.leftTile - 1; tx <= slot.leftTile + slot.widthTiles; tx += 1) {
      for (let ty = slot.bottomTile - slot.heightTiles - 1; ty < slot.bottomTile; ty += 1) {
        model.setTile(tx, ty, TILE_TYPES.AIR, 0);
      }
      const type = chooseMaterial(model, region, tx, slot.bottomTile);
      model.setTile(
        tx,
        slot.bottomTile,
        type,
        model.getTileMaxHp(tx, slot.bottomTile, type)
      );
    }
  }
}

function placeRelicCache(model, region) {
  const { tx, ty } = region.relicCache;
  model.setTile(
    tx,
    ty,
    TILE_TYPES.ANCIENT_RELIC_CACHE,
    model.getTileMaxHp(tx, ty, TILE_TYPES.ANCIENT_RELIC_CACHE)
  );
}

function placeBarrier(model, region) {
  if (!region.barrier) return;
  for (let offset = 0; offset < region.barrier.height; offset += 1) {
    const ty = region.barrier.topTy + offset;
    model.setTile(region.barrier.tx, ty, TILE_TYPES.HEAVEN_BARRIER, 0);
  }
}

function buildRegion(model, region, level) {
  clearRegion(model, region);
  fillIslandBody(model, region);
  region.rooms.forEach((rect) => carveRect(model, rect));
  region.corridors.forEach((rect) => carveRect(model, rect));
  preparePortalSlots(
    model,
    region,
    level.portalSlots.filter((slot) => slot.regionId === region.id)
  );
  // Arrival and shrine floors are authoritative safety geometry. Apply them
  // after every carve so portal apertures cannot erase a configured landing.
  prepareStandingArea(
    model,
    region,
    region.arrivalTile.tx,
    region.arrivalTile.ty + 1,
    3
  );
  prepareStandingArea(model, region, region.shrine.tx, region.shrine.floorTy, 3);
  placeRelicCache(model, region);
  placeBarrier(model, region);
}

export function applyHeavenblocksWorld(model, config = HEAVENBLOCKS_WORLD_CONFIG) {
  if (!config.enabled) return { applied: false, regions: 0, solidTiles: 0 };
  for (const region of config.regions) {
    const level = config.levels.find((entry) => entry.levelId === region.levelId);
    if (!level) continue;
    buildRegion(model, region, level);
  }
  let solidTiles = 0;
  for (const region of config.regions) {
    for (let ty = region.bounds.top; ty <= region.bounds.bottom; ty += 1) {
      for (let tx = region.bounds.left; tx <= region.bounds.right; tx += 1) {
        if (model.getType(tx, ty) !== TILE_TYPES.AIR) solidTiles += 1;
      }
    }
  }
  return { applied: true, regions: config.regions.length, solidTiles };
}
