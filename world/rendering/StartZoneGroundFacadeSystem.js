import { ASSET_KEYS } from "../../values/assetKeys.js";
import { START_ZONE_SCENIC_BACKGROUND, resolveStartZoneScenicBackgroundEnabled } from "../../values/startZoneScenicBackground.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { getDamageStage } from "./tileRenderMap.js";

const RESOURCE_RECOGNITION = Object.freeze({
  [TILE_TYPES.COPPER]: ASSET_KEYS.ui.lootPickups.copper,
  [TILE_TYPES.BRONZE]: ASSET_KEYS.ui.lootPickups.bronze,
  [TILE_TYPES.STEEL]: ASSET_KEYS.ui.lootPickups.steel,
  [TILE_TYPES.IRON]: ASSET_KEYS.ui.lootPickups.iron,
  [TILE_TYPES.SILVER]: ASSET_KEYS.ui.lootPickups.silver,
  [TILE_TYPES.GOLD]: ASSET_KEYS.ui.lootPickups.gold,
  [TILE_TYPES.OBSIDIAN]: ASSET_KEYS.ui.lootPickups.obsidian,
  [TILE_TYPES.EMBER_ORE]: ASSET_KEYS.ui.lootPickups.emberOre,
  [TILE_TYPES.MAGMA_CRYSTAL]: ASSET_KEYS.ui.lootPickups.magmaCrystal,
});

const SPECIAL_RECOGNITION = Object.freeze({
  [TILE_TYPES.BEDROCK]: ASSET_KEYS.tiles.bedrock,
  [TILE_TYPES.TELEPORT_TILE]: ASSET_KEYS.tiles.teleportTile,
  [TILE_TYPES.GAMBLE_TILE]: ASSET_KEYS.tiles.gambleTile,
  [TILE_TYPES.SKY_TILE]: ASSET_KEYS.tiles.skyIslandTop,
  [TILE_TYPES.GEM_POWER_BLOCK]: ASSET_KEYS.tiles.gemPowerBlock,
  [TILE_TYPES.SPEED_BLOCK]: ASSET_KEYS.tiles.speedBlock,
  [TILE_TYPES.XP_BLOCK]: ASSET_KEYS.tiles.xpBlock,
  [TILE_TYPES.BERSERK_BLOCK]: ASSET_KEYS.tiles.berserkBlock,
  [TILE_TYPES.COMBO_BLOCK]: ASSET_KEYS.tiles.comboBlock,
  [TILE_TYPES.LEGEND_BLOCK]: ASSET_KEYS.tiles.legendBlock,
  [TILE_TYPES.ABILITY_BLOCK]: ASSET_KEYS.tiles.abilityBlock,
  [TILE_TYPES.CAVE_WALL]: ASSET_KEYS.tiles.caveWall,
  [TILE_TYPES.GEODE_INTERIOR]: ASSET_KEYS.tiles.geodeInterior,
  [TILE_TYPES.GEODE_WALL]: ASSET_KEYS.tiles.treasureStone,
  [TILE_TYPES.CHEST]: ASSET_KEYS.tiles.chestNormal,
  [TILE_TYPES.ANCIENT_RELIC_CACHE]: ASSET_KEYS.tiles.ancientRelicCache,
});

function getRecognition(type, facade) {
  const resourceTexture = RESOURCE_RECOGNITION[type];
  if (resourceTexture) {
    return { textureKey: resourceTexture, scale: facade.resourceRecognitionScale };
  }
  const specialTexture = SPECIAL_RECOGNITION[type];
  if (specialTexture) {
    return { textureKey: specialTexture, scale: facade.specialRecognitionScale };
  }
  return null;
}

/** Renders one continuous earth image while WorldModel remains authoritative. */
export class StartZoneGroundFacadeSystem {
  constructor(scene, worldModel, config = START_ZONE_SCENIC_BACKGROUND) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.tiles = [];
    this.enabled = false;
    this.nextUpdateAt = 0;
  }

  create() {
    const facade = this.config.groundFacade;
    this.enabled = facade.enabled && resolveStartZoneScenicBackgroundEnabled(this.config);
    const textureKey = ASSET_KEYS.background.startZoneGroundFacade;
    if (!this.enabled || !this.scene.textures.exists(textureKey)) return false;

    const texture = this.scene.textures.get(textureKey);
    const source = texture?.getSourceImage?.();
    if (!source?.width || !source?.height) return false;

    const anchor = this.config.worldAnchor;
    const tileSize = this.scene.config.tileSize;
    const surfaceTileY = this.scene.config.topAirRows;

    for (let row = 0; row < facade.depthTiles; row += 1) {
      for (let column = 0; column < anchor.widthTiles; column += 1) {
        const sourceLeft = Math.round(column * source.width / anchor.widthTiles);
        const sourceRight = Math.round((column + 1) * source.width / anchor.widthTiles);
        const sourceTop = Math.round(row * source.height / facade.depthTiles);
        const sourceBottom = Math.round((row + 1) * source.height / facade.depthTiles);
        const frameName = `npc-town-solid-ground-${column}-${row}`;
        if (!texture.has(frameName)) {
          texture.add(
            frameName,
            0,
            sourceLeft,
            sourceTop,
            sourceRight - sourceLeft,
            sourceBottom - sourceTop
          );
        }

        const tx = anchor.leftTileX + column;
        const ty = surfaceTileY + row;
        const overlap = facade.tileOverlapPx;
        const base = this.scene.add.image(tx * tileSize, ty * tileSize, textureKey, frameName)
          .setOrigin(0)
          .setDepth(facade.renderDepth)
          .setDisplaySize(tileSize + overlap, tileSize + overlap)
          .setVisible(false);
        const crack = this.scene.add.image(tx * tileSize, ty * tileSize, ASSET_KEYS.tiles.dynamicSoil.cracks[0])
          .setOrigin(0)
          .setDepth(facade.crackDepth)
          .setDisplaySize(tileSize + overlap, tileSize + overlap)
          .setVisible(false);
        const recognition = this.scene.add.image(
          (tx + 0.5) * tileSize,
          (ty + 0.5) * tileSize,
          "__WHITE"
        )
          .setDepth(facade.recognitionDepth)
          .setAlpha(facade.recognitionAlpha)
          .setVisible(false);
        this.tiles.push({
          tx,
          ty,
          base,
          recognition,
          crack,
          lastStage: null,
          lastRecognitionKey: null,
        });
      }
    }

    this.update(0, true);
    console.info(`[StartZoneGroundFacadeSystem] ${this.tiles.length} tile-aware scenic cells active`);
    return true;
  }

  update(time = 0, force = false) {
    if (!this.enabled) return;
    if (!force && time < this.nextUpdateAt) return;
    this.nextUpdateAt = time + this.config.groundFacade.updateIntervalMs;

    for (const tile of this.tiles) {
      const type = this.worldModel.getTileType(tile.tx, tile.ty);
      const visible = type !== TILE_TYPES.AIR;
      tile.base.setVisible(visible);
      if (!visible) {
        tile.recognition.setVisible(false);
        tile.crack.setVisible(false);
        tile.lastStage = null;
        tile.lastRecognitionKey = null;
        continue;
      }

      const recognition = getRecognition(type, this.config.groundFacade);
      if (recognition && this.scene.textures.exists(recognition.textureKey)) {
        if (tile.lastRecognitionKey !== recognition.textureKey) {
          tile.recognition
            .setTexture(recognition.textureKey)
            .setDisplaySize(
              this.scene.config.tileSize * recognition.scale,
              this.scene.config.tileSize * recognition.scale
            );
          tile.lastRecognitionKey = recognition.textureKey;
        }
        tile.recognition.setVisible(true);
      } else {
        tile.recognition.setVisible(false);
        tile.lastRecognitionKey = null;
      }

      const hp = this.worldModel.getTileHp(tile.tx, tile.ty);
      const maxHp = this.worldModel.getTileMaxHp(tile.tx, tile.ty, type);
      const stage = getDamageStage(hp, maxHp);
      const crackVisible = hp > 0 && hp < maxHp && stage < 5;
      if (crackVisible && tile.lastStage !== stage) {
        tile.crack.setTexture(ASSET_KEYS.tiles.dynamicSoil.cracks[stage - 1]);
        tile.lastStage = stage;
      }
      tile.crack.setVisible(crackVisible);
    }
  }

  destroy() {
    this.enabled = false;
    for (const tile of this.tiles) {
      tile.base.destroy();
      tile.recognition.destroy();
      tile.crack.destroy();
    }
    this.tiles = [];
  }
}
