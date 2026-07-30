import { TILE_TYPES } from "../../values/tileTypes.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { TILED_BACKGROUND_OBJECTS } from "../../values/tiledBackgroundObjects.js";
import {
  TELEPORT_PORTAL_CONFIG,
  getTeleportPortalLabel,
} from "../../values/teleportPortalConfig.js";
import { TREASURE_CHEST_CONFIG } from "../../values/treasureChestConfig.js";
import { STAR_CONSTELLATION_CONFIG } from "../../values/starConstellations.js";
import { hash01 } from "../../values/deterministicMath.js";
import { V11_SKY_ISLAND_LAYOUT } from "../../values/v11SkyIslandLayout.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { createZeroResourceTotals } from "../../values/resourceTypes.js";
import { GAMBLE_TILE_CONFIG } from "../../values/gambleTileConfig.js";

export class SpecialTileSystem {
  constructor(scene, worldModel, playerController, floatingTextSystem) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.playerController = playerController;
    this.floatingTextSystem = floatingTextSystem;

    this.usedGambleTiles = new Set();
    this.openedChestKeys = new Set();
    this.pairedTeleporters = new Map();
    this.skyToDungeonMap = new Map();
    this.portalOrder = [];
    this.skyPortalSlots = this._buildSkyPortalSlots();

    this.promptText = null;
    this.promptTile = null;
    this._initializePrompt();
  }

  _initializePrompt() {
    this.promptText = this.scene.add.text(0, 0, "", {
      fontSize: HUD_LAYOUT.promptFontSize,
      fontFamily: "Consolas, monospace",
      color: UI_COLORS.white,
      backgroundColor: "#131c26",
      padding: { x: HUD_LAYOUT.promptPadX, y: HUD_LAYOUT.promptPadY },
      stroke: "#000000",
      strokeThickness: Math.max(1, HUD_LAYOUT.promptStrokeThickness - 1),
    });
    this.promptText.setDepth(HUD_LAYOUT.floatingTextDepth);
    this.promptText.setVisible(false);
  }

  update() {
    const playerTile = this.playerController.getPlayerTile();
    const adjacentTiles = [
      { tx: playerTile.tx, ty: playerTile.ty - 1 },
      { tx: playerTile.tx, ty: playerTile.ty + 1 },
      { tx: playerTile.tx - 1, ty: playerTile.ty },
      { tx: playerTile.tx + 1, ty: playerTile.ty },
    ];

    let foundSpecialTile = false;

    for (const tile of adjacentTiles) {
      const tileKey = `${tile.tx},${tile.ty}`;
      const dungeonKeyFromSky = this.skyToDungeonMap.get(tileKey);
      if (dungeonKeyFromSky) {
        const pair = this.pairedTeleporters.get(dungeonKeyFromSky);
        if (pair) {
          this._showPrompt(
            tile.tx,
            tile.ty,
            `Press ${USER_SETTINGS.getKeyLabel("interact")} to Return via ${this._getPairLabel(pair)}`
              + this._hardcoreCostSuffix(
                Math.max(0, pair.dungeonTy - this.worldModel.config.topAirRows),
                "skyToDungeon",
              )
          );
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: "teleportSkyReturn", key: tileKey, dungeonKey: dungeonKeyFromSky };
          foundSpecialTile = true;
          break;
        }
      }

      const groundPortalLevel = this._findUnlockedGroundPortalAt(tile.tx, tile.ty);
      if (groundPortalLevel) {
        this._showPrompt(
          tile.tx,
          tile.ty,
          `Press ${USER_SETTINGS.getKeyLabel("interact")} to ${groundPortalLevel.groundPortal.promptLabel}`
            + this._hardcoreCostSuffix(0, "groundToSky")
        );
        this.promptTile = {
          tx: tile.tx,
          ty: tile.ty,
          type: "teleportGroundToSky",
          levelId: groundPortalLevel.levelId,
        };
        foundSpecialTile = true;
        break;
      }

      const tileType = this.worldModel.getTileType(tile.tx, tile.ty);
      if (tileType === TILE_TYPES.CHEST) {
        this._showPrompt(
          tile.tx,
          tile.ty,
          `Press ${USER_SETTINGS.getKeyLabel("interact")} to ${TREASURE_CHEST_CONFIG.interaction.prompt}`
        );
        this.promptTile = { tx: tile.tx, ty: tile.ty, type: "chest", key: tileKey };
        foundSpecialTile = true;
        break;
      }

      if (tileType === TILE_TYPES.TELEPORT_TILE) {
        const pair = this.pairedTeleporters.get(tileKey);
        const fallbackLevel = tile.tx <= V11_SKY_ISLAND_LAYOUT.dividerTileX ? 1 : 2;
        const depthTiles = Math.max(0, tile.ty - this.worldModel.config.topAirRows);
        const label = pair
          ? this._getPairLabel(pair)
          : getTeleportPortalLabel(fallbackLevel, depthTiles);
        if (pair) {
          this._showPrompt(
            tile.tx,
            tile.ty,
            `Press ${USER_SETTINGS.getKeyLabel("interact")} to Use ${label}`
              + this._hardcoreCostSuffix(depthTiles, "undergroundToSky")
          );
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: "teleportPaired", key: tileKey };
        } else {
          this._showPrompt(
            tile.tx,
            tile.ty,
            `Press ${USER_SETTINGS.getKeyLabel("interact")} to Activate ${label}`
              + this._hardcoreCostSuffix(depthTiles, "undergroundToSky")
          );
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: "teleport", key: tileKey };
        }
        foundSpecialTile = true;
        break;
      }

      if (tileType === TILE_TYPES.GAMBLE_TILE) {
        const gambleTileKey = `${tile.tx},${tile.ty}`;
        if (!this.usedGambleTiles.has(gambleTileKey)) {
          this._showPrompt(tile.tx, tile.ty, `Press ${USER_SETTINGS.getKeyLabel("interact")} to Gamble (x3 or Lose All!)`);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: "gamble", key: gambleTileKey };
        } else {
          this._showPrompt(tile.tx, tile.ty, "Gamble Tile Used", true);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: "gambleUsed" };
        }
        foundSpecialTile = true;
        break;
      }
    }

    if (!foundSpecialTile) {
      this.promptText.setVisible(false);
      this.promptTile = null;
    }
  }

  _showPrompt(tx, ty, text, used = false) {
    const worldPos = this.worldModel.tileToWorld(tx, ty);
    this.promptText.setPosition(worldPos.x, worldPos.y - 50);
    this.promptText.setColor(used ? "#888888" : UI_COLORS.white);
    this.promptText.setBackgroundColor(used ? "#101820" : "#131c26");
    this.promptText.setText(text);
    this.promptText.setVisible(true);
  }

  refreshPromptText() {
    if (this.promptTile) this.update();
  }

  getInteractionDistance(playerTile = this.playerController?.getPlayerTile?.()) {
    if (!playerTile || !this.promptTile || this.promptTile.type === "gambleUsed") {
      return Number.POSITIVE_INFINITY;
    }
    return Math.abs(playerTile.tx - this.promptTile.tx)
      + Math.abs(playerTile.ty - this.promptTile.ty);
  }

  handleInteract() {
    if (!this.promptTile) return { success: false, reason: "no-special-tile" };
    if (this.promptTile.type === "teleport" || this.promptTile.type === "teleportPaired") return this._activateTeleport();
    if (this.promptTile.type === "teleportSkyReturn") return this._activateSkyTeleportReturn();
    if (this.promptTile.type === "teleportGroundToSky") return this._activateGroundTeleport();
    if (this.promptTile.type === "chest") return this._activateChest();
    if (this.promptTile.type === "gamble") return this._activateGamble();
    if (this.promptTile.type === "gambleUsed") return { success: false, reason: "already-used" };
    return { success: false, reason: "unknown-type" };
  }

  _getPairLabel(pairData) {
    const depth = Math.max(0, pairData.dungeonTy - this.worldModel.config.topAirRows);
    return getTeleportPortalLabel(pairData.levelId, depth);
  }

  _hardcoreCostSuffix(depth, kind) {
    const cost = this.scene.getHardcoreTeleportCost?.({ depth, kind }) || 0;
    return cost > 0 ? `  •  HARDCORE COST ${cost.toLocaleString()} M` : "";
  }

  _activateChest() {
    const tile = this.promptTile;
    const key = tile?.key || `${tile?.tx},${tile?.ty}`;
    if (!tile || this.openedChestKeys.has(key)) {
      return { success: false, reason: "chest-already-opened" };
    }
    if (this.worldModel.getTileType(tile.tx, tile.ty) !== TILE_TYPES.CHEST) {
      return { success: false, reason: "chest-missing" };
    }

    const depth = Math.max(0, tile.ty - this.worldModel.config.topAirRows);
    const moneyRoll = hash01(
      tile.tx,
      tile.ty,
      this.worldModel.config.seed,
      TREASURE_CHEST_CONFIG.deterministicSalt.money
    );
    const variance = 1 + (moneyRoll * 2 - 1) * TREASURE_CHEST_CONFIG.money.variance;
    const depthBonus = Math.min(
      TREASURE_CHEST_CONFIG.money.maxDepthBonus,
      depth * TREASURE_CHEST_CONFIG.money.perDepthMeter
    );
    const money = Math.max(
      1,
      Math.floor((TREASURE_CHEST_CONFIG.money.base + depthBonus) * variance)
    );
    const starRoll = hash01(
      tile.tx,
      tile.ty,
      this.worldModel.config.seed,
      TREASURE_CHEST_CONFIG.deterministicSalt.star
    );
    const hasStar = starRoll < TREASURE_CHEST_CONFIG.star.chance;

    this.openedChestKeys.add(key);
    this.worldModel.applyDugTileKeys([key]);
    this.scene.worldRenderer?.applyTileUpdate?.(tile.tx, tile.ty);
    this.scene.upgradeSystem?.addMoney?.(money);
    const now = this.scene.time?.now || 0;
    this.scene.retentionProgressSystem?.activateChestCritBuff?.(now);

    const worldPos = this.worldModel.tileToWorld(tile.tx, tile.ty);
    let starType = null;
    if (hasStar) {
      const starTypes = Object.keys(STAR_CONSTELLATION_CONFIG.thresholds);
      starType = starTypes[Math.floor(starRoll * 100000) % starTypes.length] || "dirt";
      this.floatingTextSystem?.grantCollectedStar?.(
        TREASURE_CHEST_CONFIG.star.rarity,
        worldPos.x,
        worldPos.y,
        starType
      );
    }
    this.scene.retentionProgressSystem?.recordChest?.({ money, star: hasStar });
    this.scene.screenFlashSystem?.flashLucky?.();
    this.scene.soundSystem?.playSfx?.("reward");
    this.scene.queueDugTilesSave?.();
    this.promptText.setVisible(false);
    this.promptTile = null;
    return { success: true, type: "chest", money, star: hasStar, starType };
  }

  _buildSkyPortalSlots() {
    const slots = [];
    const tilePx = TILED_BACKGROUND_OBJECTS?.tilePx || this.worldModel.config.tileSize || TELEPORT_PORTAL_CONFIG.fallbackTilePx;
    if (V11_SKY_ISLAND_LAYOUT.enabled) {
      for (const level of V11_SKY_ISLAND_LAYOUT.levels) {
        for (const authoredSlot of level.portalSlots) {
          const rect = {
            left: authoredSlot.leftTile * tilePx,
            right: (authoredSlot.leftTile + authoredSlot.widthTiles) * tilePx,
            bottom: authoredSlot.bottomTile * tilePx,
            top: (authoredSlot.bottomTile - authoredSlot.heightTiles) * tilePx,
            w: authoredSlot.widthTiles * tilePx,
            h: authoredSlot.heightTiles * tilePx,
          };
          const glowX = rect.left + rect.w * TELEPORT_PORTAL_CONFIG.apertureOffsetX;
          const glowY = rect.top + rect.h * TELEPORT_PORTAL_CONFIG.apertureOffsetY;
          const interactionTx = Math.floor(glowX / tilePx);
          const interactionTy = Math.floor(glowY / tilePx);
          const landingTile = this._findSafeAdjacentTile(interactionTx, interactionTy)
            || this._findSafeReturnTile(interactionTx, interactionTy)
            || { tx: interactionTx, ty: interactionTy };
          slots.push({
            id: authoredSlot.id,
            objectId: null,
            levelId: level.levelId,
            regionId: authoredSlot.regionId,
            slotIndex: authoredSlot.slotIndex,
            layerKey: "V11_SPLIT_SKY_ISLAND_PORTALS_V1",
            rect,
            glowX,
            glowY,
            glowRadius: Math.max(1, Math.min(rect.w, rect.h) * TELEPORT_PORTAL_CONFIG.glowRadiusScale),
            interactionTx,
            interactionTy,
            landingTile,
          });
        }
      }
      return slots;
    }
    const layers = TILED_BACKGROUND_OBJECTS?.layers ?? {};
    const layerOrder = TILED_BACKGROUND_OBJECTS?.layerOrder ?? Object.keys(layers);
    const layerMeta = TILED_BACKGROUND_OBJECTS?.layerMeta ?? {};

    for (const layerKey of layerOrder) {
      const objects = layers[layerKey];
      if (!Array.isArray(objects)) continue;

      const meta = layerMeta[layerKey] ?? {};
      const offsetX = Number(meta.offsetX) || 0;
      const offsetY = Number(meta.offsetY) || 0;
      for (const obj of objects) {
        if (!this._isGateObject(obj)) continue;

        const rect = this._getObjectRect(obj, tilePx, offsetX, offsetY);
        const glowX = rect.left + rect.w * TELEPORT_PORTAL_CONFIG.apertureOffsetX;
        const glowY = rect.top + rect.h * TELEPORT_PORTAL_CONFIG.apertureOffsetY;
        const interactionTx = Math.floor(glowX / tilePx);
        const interactionTy = Math.floor(glowY / tilePx);
        const landingTile = this._findSafeAdjacentTile(interactionTx, interactionTy)
          || this._findSafeReturnTile(interactionTx, interactionTy)
          || { tx: interactionTx, ty: interactionTy };

        slots.push({
          id: String(obj.id ?? `${layerKey}:${slots.length}`),
          objectId: obj.id ?? null,
          layerKey,
          rect,
          glowX,
          glowY,
          glowRadius: Math.max(1, Math.min(rect.w, rect.h) * TELEPORT_PORTAL_CONFIG.glowRadiusScale),
          interactionTx,
          interactionTy,
          landingTile,
        });
      }
    }

    slots.sort((a, b) => (a.rect.left - b.rect.left) || (a.rect.top - b.rect.top));
    if (slots.length !== TELEPORT_PORTAL_CONFIG.maxActiveSkyPortals) {
      console.warn(
        `[SpecialTileSystem] Expected ${TELEPORT_PORTAL_CONFIG.maxActiveSkyPortals} authored eclipse gate slots, found ${slots.length}.`
      );
    }
    return slots.slice(0, TELEPORT_PORTAL_CONFIG.maxActiveSkyPortals);
  }

  _isGateObject(obj) {
    const filename = this._extractFilename(obj?.resolvedFilename || obj?.sourcePath || obj?.properties?.sourcePath || obj?.name || "");
    return filename.toLowerCase() === TELEPORT_PORTAL_CONFIG.gateFilename.toLowerCase();
  }

  _extractFilename(path) {
    const cleaned = String(path || "").trim().replace(/^\d+:\s*/, "").replace(/\\/g, "/");
    return cleaned.split("?")[0].split("#")[0].split("/").pop() || "";
  }

  _getObjectRect(obj, tilePx, offsetX = 0, offsetY = 0) {
    const left = (Number.isFinite(Number(obj?.x)) ? Number(obj.x) : (Number(obj?.tx) || 0) * tilePx) + offsetX;
    const bottom = (Number.isFinite(Number(obj?.y)) ? Number(obj.y) : (Number(obj?.ty) || 0) * tilePx) + offsetY;
    const w = Math.max(1, Number(obj?.w) || tilePx);
    const h = Math.max(1, Number(obj?.h) || tilePx);
    return { left, right: left + w, bottom, top: bottom - h, w, h };
  }

  _findSlotById(slotId) {
    return this.skyPortalSlots.find((slot) => slot.id === String(slotId)) || null;
  }

  _hasUnlockedPortalForLevel(levelId) {
    return Array.from(this.pairedTeleporters.values()).some((pair) => pair.levelId === levelId);
  }

  _findUnlockedGroundPortalAt(tx, ty) {
    if (!V11_SKY_ISLAND_LAYOUT.enabled) return null;
    return V11_SKY_ISLAND_LAYOUT.levels.find((level) =>
      this._hasUnlockedPortalForLevel(level.levelId)
      && level.groundPortal?.interactionTiles?.some((tile) => tile.tx === tx && tile.ty === ty)
    ) || null;
  }

  _syncGroundPortalVisuals() {
    for (const level of V11_SKY_ISLAND_LAYOUT.levels) {
      this.scene.heavenblocksArtifactSystem?.setGroundPortalUnlocked(
        level.levelId,
        this._hasUnlockedPortalForLevel(level.levelId)
      );
    }
  }

  _reserveGateSlotForNewPortal(tile, { commit = true } = {}) {
    if (!this.skyPortalSlots.length) return null;

    const levelId = tile.tx <= V11_SKY_ISLAND_LAYOUT.dividerTileX ? 1 : 2;
    const levelSlots = this.skyPortalSlots.filter((slot) => slot.levelId === levelId);
    const usedSlots = new Set(Array.from(this.pairedTeleporters.values()).map((pair) => String(pair.gateSlotId)));
    const available = levelSlots.find((slot) => !usedSlots.has(slot.id));
    if (available) return available;

    const shallowestEntry = this.portalOrder
      .map((key) => ({ key, pair: this.pairedTeleporters.get(key) }))
      .filter(({ pair }) => pair?.levelId === levelId)
      .sort((a, b) => a.pair.dungeonTy - b.pair.dungeonTy)[0];
    const slotToReuse = shallowestEntry ? this._findSlotById(shallowestEntry.pair.gateSlotId) : null;
    if (shallowestEntry && commit) this._removeSkyPortal(shallowestEntry.key);
    return slotToReuse || levelSlots[0] || null;
  }

  _createPairData(tile, slot) {
    return {
      dungeonTx: tile.tx,
      dungeonTy: tile.ty,
      gateSlotId: slot.id,
      gateObjectId: slot.objectId,
      levelId: slot.levelId,
      regionId: slot.regionId,
      skyTx: slot.interactionTx,
      skyTy: slot.interactionTy,
      skyLandingTx: slot.landingTile.tx,
      skyLandingTy: slot.landingTile.ty,
      skyPortalVisual: null,
    };
  }

  _registerSkyTeleporterTiles(pairData, dungeonKey) {
    if (Number.isFinite(pairData?.skyTx) && Number.isFinite(pairData?.skyTy)) {
      this.skyToDungeonMap.set(`${pairData.skyTx},${pairData.skyTy}`, dungeonKey);
    }
  }

  _unregisterSkyTeleporterTiles(pairData) {
    if (Number.isFinite(pairData?.skyTx) && Number.isFinite(pairData?.skyTy)) {
      this.skyToDungeonMap.delete(`${pairData.skyTx},${pairData.skyTy}`);
    }
  }

  _ensureGlowTexture() {
    const key = TELEPORT_PORTAL_CONFIG.glowTextureKey;
    if (this.scene.textures.exists(key)) return key;

    const size = TELEPORT_PORTAL_CONFIG.glowTextureSize;
    const texture = this.scene.textures.createCanvas(key, size, size);
    const ctx = texture.getContext();
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    const rgb = this._hexColorToRgb(TELEPORT_PORTAL_CONFIG.glowColor);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`);
    gradient.addColorStop(0.45, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.48)`);
    gradient.addColorStop(0.78, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    texture.refresh();
    return key;
  }

  _hexColorToRgb(color) {
    return {
      r: (color >> 16) & 255,
      g: (color >> 8) & 255,
      b: color & 255,
    };
  }

  _spawnSkyPortalGlow(slot) {
    if (!slot) return null;
    const glowKey = this._ensureGlowTexture();
    const diameter = slot.glowRadius * 2;
    const baseScale = diameter / TELEPORT_PORTAL_CONFIG.glowTextureSize;
    const glow = this.scene.add.image(slot.glowX, slot.glowY, glowKey);
    glow.setDepth(TELEPORT_PORTAL_CONFIG.glowDepth);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(TELEPORT_PORTAL_CONFIG.glowAlphaMin);
    glow.setScale(baseScale * TELEPORT_PORTAL_CONFIG.glowScaleMin);

    const glowTween = this.scene.tweens.add({
      targets: glow,
      scaleX: baseScale * TELEPORT_PORTAL_CONFIG.glowScaleMax,
      scaleY: baseScale * TELEPORT_PORTAL_CONFIG.glowScaleMax,
      alpha: TELEPORT_PORTAL_CONFIG.glowAlphaMax,
      yoyo: true,
      repeat: -1,
      duration: TELEPORT_PORTAL_CONFIG.glowDurationMs,
      ease: "Sine.easeInOut",
    });

    return { glow, glowTween };
  }

  _destroySkyPortalVisual(pairData) {
    const visual = pairData?.skyPortalVisual;
    if (!visual) return;
    if (visual.glowTween?.remove) visual.glowTween.remove();
    if (visual.glow?.destroy) visual.glow.destroy();
    pairData.skyPortalVisual = null;
  }

  _removeSkyPortal(dungeonKey) {
    const pairData = this.pairedTeleporters.get(dungeonKey);
    if (!pairData) return;

    this._destroySkyPortalVisual(pairData);
    this._unregisterSkyTeleporterTiles(pairData);
    this.scene.heavenblocksArtifactSystem?.setSkyPortalSlotActive?.(
      pairData.gateSlotId,
      false,
    );
    this.pairedTeleporters.delete(dungeonKey);

    const orderIndex = this.portalOrder.indexOf(dungeonKey);
    if (orderIndex !== -1) this.portalOrder.splice(orderIndex, 1);
    this._syncGroundPortalVisuals();
  }

  _enforceSkyPortalCapacity() {
    for (const levelId of [1, 2]) {
      let levelEntries = this.portalOrder
        .map((key) => ({ key, pair: this.pairedTeleporters.get(key) }))
        .filter(({ pair }) => pair?.levelId === levelId);
      while (levelEntries.length > TELEPORT_PORTAL_CONFIG.maxActiveSkyPortalsPerLevel) {
        levelEntries.sort((a, b) => a.pair.dungeonTy - b.pair.dungeonTy);
        this._removeSkyPortal(levelEntries[0].key);
        levelEntries = levelEntries.slice(1);
      }
    }
  }

  _addSkyPortal(dungeonKey, pairData) {
    this.pairedTeleporters.set(dungeonKey, pairData);
    if (!this.portalOrder.includes(dungeonKey)) this.portalOrder.push(dungeonKey);
    this._registerSkyTeleporterTiles(pairData, dungeonKey);
    this.scene.heavenblocksArtifactSystem?.setSkyPortalSlotActive?.(
      pairData.gateSlotId,
      true,
    );
    this._enforceSkyPortalCapacity();
    this._syncGroundPortalVisuals();
  }

  _findSafeAdjacentTile(baseTx, baseTy, maxRadius = TELEPORT_PORTAL_CONFIG.safeReturnRadius) {
    const candidates = [
      [0, 1],
      [0, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ];

    for (let radius = 2; radius <= maxRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          candidates.push([dx, dy]);
        }
      }
    }

    for (const [dx, dy] of candidates) {
      const tx = baseTx + dx;
      const ty = baseTy + dy;
      if (!this.worldModel.inBounds(tx, ty)) continue;
      if (!this.worldModel.isSolid(tx, ty)) return { tx, ty };
    }
    return null;
  }

  _findSafeReturnTile(baseTx, baseTy, maxRadius = TELEPORT_PORTAL_CONFIG.safeReturnRadius) {
    const candidates = [
      [0, 0],
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];

    for (let radius = 2; radius <= maxRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          candidates.push([dx, dy]);
        }
      }
    }

    for (const [dx, dy] of candidates) {
      const tx = baseTx + dx;
      const ty = baseTy + dy;
      if (!this.worldModel.inBounds(tx, ty)) continue;
      if (!this.worldModel.isSolid(tx, ty)) return { tx, ty };
    }
    return null;
  }

  _findSafeStandingTile(baseTx, baseTy, maxRadius = TELEPORT_PORTAL_CONFIG.safeReturnRadius) {
    for (let radius = 0; radius <= maxRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const tx = baseTx + dx;
          const ty = baseTy + dy;
          if (!this.worldModel.inBounds(tx, ty) || !this.worldModel.inBounds(tx, ty + 1)) continue;
          if (!this.worldModel.isSolid(tx, ty) && this.worldModel.isSolid(tx, ty + 1)) return { tx, ty };
        }
      }
    }
    return null;
  }

  _activateTeleport() {
    const tile = this.promptTile;
    const tileKey = `${tile.tx},${tile.ty}`;

    if (this.pairedTeleporters.has(tileKey)) {
      return this._teleportToSky(this.pairedTeleporters.get(tileKey), false);
    }

    const slotCandidate = this._reserveGateSlotForNewPortal(tile, { commit: false });
    if (!slotCandidate) {
      console.warn("[SpecialTileSystem] No authored eclipse gate slots available for teleport activation.");
      return { success: false, reason: "no-sky-portal-slot" };
    }
    const access = this._getHeavenblockAccess(slotCandidate.regionId);
    if (!access.allowed) {
      this._showHeavenblockLocked(slotCandidate.regionId, access);
      return {
        success: false,
        reason: "heavenblock-region-locked",
        regionId: slotCandidate.regionId,
      };
    }
    const depth = Math.max(0, tile.ty - this.worldModel.config.topAirRows);
    const payment = this.scene.tryPayHardcoreTeleport?.({
      depth,
      kind: "undergroundToSky",
    }) || { success: true, cost: 0 };
    if (!payment.success) {
      return { success: false, reason: "hardcore-teleport-cost", cost: payment.cost };
    }

    const slot = this._reserveGateSlotForNewPortal(tile, { commit: true });
    if (!slot) {
      console.warn("[SpecialTileSystem] No authored eclipse gate slots available for teleport activation.");
      return { success: false, reason: "no-sky-portal-slot" };
    }

    const pairData = this._createPairData(tile, slot);
    pairData.skyPortalVisual = this._spawnSkyPortalGlow(slot);
    this._addSkyPortal(tileKey, pairData);
    return this._teleportToSky(pairData, true, { paymentHandled: true, cost: payment.cost });
  }

  _teleportToSky(pairData, firstActivation, options = {}) {
    const access = this._getHeavenblockAccess(pairData.regionId);
    if (!access.allowed) {
      this._showHeavenblockLocked(pairData.regionId, access);
      return {
        success: false,
        reason: "heavenblock-region-locked",
        regionId: pairData.regionId,
      };
    }
    const safeTile = this._findSafeAdjacentTile(pairData.skyTx, pairData.skyTy)
      || this._findSafeReturnTile(pairData.skyLandingTx, pairData.skyLandingTy);
    const target = safeTile || { tx: pairData.skyLandingTx, ty: pairData.skyLandingTy };
    if (!safeTile) {
      console.warn("[SpecialTileSystem] No safe sky portal landing tile found, using assigned fallback.", pairData.gateSlotId);
    }
    const depth = Math.max(0, pairData.dungeonTy - this.worldModel.config.topAirRows);
    const payment = options.paymentHandled
      ? { success: true, cost: options.cost || 0 }
      : this.scene.tryPayHardcoreTeleport?.({
          depth,
          kind: "undergroundToSky",
        }) || { success: true, cost: 0 };
    if (!payment.success) {
      return { success: false, reason: "hardcore-teleport-cost", cost: payment.cost };
    }

    this.playerController.teleportToTile(target.tx, target.ty);
    this.scene.earthquakeFeedbackUI?.clearEscapeObjective?.();
    this.scene.earthquakeHazardOverlay?.clear?.();
    this._playSound("teleport");
    if (firstActivation) this._celebratePortalActivation(pairData, target);

    return {
      success: true,
      type: "teleport",
      target: "skyIsland",
      pairData,
      ...(payment.cost > 0 ? { cost: payment.cost } : {}),
    };
  }

  _activateGroundTeleport() {
    const levelId = Number(this.promptTile?.levelId);
    const level = V11_SKY_ISLAND_LAYOUT.levels.find((entry) => entry.levelId === levelId);
    if (!level?.groundPortal || !this._hasUnlockedPortalForLevel(levelId)) {
      return { success: false, reason: "ground-portal-locked" };
    }
    const regionId = level.portalSlots[0]?.regionId;
    const access = this._getHeavenblockAccess(regionId);
    if (!access.allowed) {
      this._showHeavenblockLocked(regionId, access);
      return {
        success: false,
        reason: "heavenblock-region-locked",
        regionId,
      };
    }

    const arrival = level.groundPortal.skyArrivalTile;
    const target = this._findSafeStandingTile(arrival.tx, arrival.ty);
    if (!target) return { success: false, reason: "no-safe-sky-arrival" };
    const payment = this.scene.tryPayHardcoreTeleport?.({
      depth: 0,
      kind: "groundToSky",
    }) || { success: true, cost: 0 };
    if (!payment.success) {
      return { success: false, reason: "hardcore-teleport-cost", cost: payment.cost };
    }

    this.playerController.teleportToTile(target.tx, target.ty);
    this.scene.earthquakeFeedbackUI?.clearEscapeObjective?.();
    this.scene.earthquakeHazardOverlay?.clear?.();
    this._playSound("teleport");
    return {
      success: true,
      type: "teleport",
      target: "skyIslandGroundPortal",
      levelId,
      ...(payment.cost > 0 ? { cost: payment.cost } : {}),
    };
  }

  _getHeavenblockAccess(regionId) {
    if (!regionId) return { allowed: true, reason: null };
    return this.scene.heavenblocksRegionAccessGuard?.getRegionAccessState?.(
      regionId,
    ) || { allowed: true, reason: null, regionId };
  }

  _showHeavenblockLocked(regionId, access) {
    this.scene.heavenblocksArtifactSystem?.playLockedPortalFeedback?.(
      regionId,
      access,
    );
  }

  _activateSkyTeleportReturn() {
    const tile = this.promptTile;
    const dungeonKey = tile?.dungeonKey || this.skyToDungeonMap.get(tile?.key);
    const pair = dungeonKey ? this.pairedTeleporters.get(dungeonKey) : null;
    if (!pair) return { success: false, reason: "no-paired-teleporter" };

    return this._teleportToDungeonPair(pair, { kind: "skyToDungeon" });
  }

  _teleportToDungeonPair(pair, options = {}) {
    const fallbackTy = pair.dungeonTy - 1;
    const safeTile = this._findSafeReturnTile(pair.dungeonTx, fallbackTy);
    const target = safeTile || { tx: pair.dungeonTx, ty: fallbackTy };
    if (!safeTile) {
      console.warn(
        "[SpecialTileSystem] No safe return tile found near portal, using fallback destination.",
        `${pair.dungeonTx},${pair.dungeonTy}`
      );
    }
    const depth = Math.max(0, pair.dungeonTy - this.worldModel.config.topAirRows);
    const payment = this.scene.tryPayHardcoreTeleport?.({
      depth,
      kind: options.kind || "skyToDungeon",
    }) || { success: true, cost: 0 };
    if (!payment.success) {
      return { success: false, reason: "hardcore-teleport-cost", cost: payment.cost };
    }

    this.playerController.teleportToTile(target.tx, target.ty);
    this.scene.earthquakeFeedbackUI?.clearEscapeObjective?.();
    this._playSound("teleport");

    return {
      success: true,
      type: "teleport",
      target: "dungeon",
      pairData: pair,
      ...(payment.cost > 0 ? { cost: payment.cost } : {}),
    };
  }

  _celebratePortalActivation(pairData, targetTile) {
    const label = this._getPairLabel(pairData);
    const cfg = TELEPORT_PORTAL_CONFIG.activation;
    const worldPos = this.worldModel.tileToWorld(targetTile.tx, targetTile.ty);
    const ring = this.scene.add.circle(worldPos.x, worldPos.y, 18, cfg.color, 0.12)
      .setStrokeStyle(4, cfg.color, 0.95)
      .setDepth(TELEPORT_PORTAL_CONFIG.glowDepth + 1);
    this.scene.tweens.add({
      targets: ring,
      radius: cfg.pulseRadiusPx,
      alpha: 0,
      duration: cfg.durationMs,
      ease: "Power2.out",
      onComplete: () => ring.destroy(),
    });
    this.scene.retentionProgressSystem?.recordPortalActivated?.(label);
    this.scene.uiNotifications?.success?.(
      `NEW RETURN ROUTE UNLOCKED  •  ${label}`,
      { key: "portal-activation", durationMs: cfg.statusDurationMs }
    );
    this.scene.screenFlashSystem?.flashLucky?.();
    this.scene.shakeSystem?.shake?.("misc.depthMilestone", 0.55);
    this.scene.soundSystem?.playSfx?.("reward");
    this.scene.queueDugTilesSave?.();
  }

  getActivatedPortals() {
    return this.portalOrder
      .map(key => {
        const pairData = this.pairedTeleporters.get(key);
        if (!pairData) return null;
        return {
          key,
          pairData,
          levelId: pairData.levelId,
          depth: Math.max(0, pairData.dungeonTy - this.worldModel.config.topAirRows),
          label: this._getPairLabel(pairData),
          tx: pairData.dungeonTx,
          ty: pairData.dungeonTy,
        };
      })
      .filter(Boolean);
  }

  getDeepestPortal() {
    return this.getActivatedPortals()
      .sort((a, b) => (b.depth - a.depth) || (b.levelId - a.levelId))[0]
      || null;
  }

  getNearestPortal(playerTile = this.playerController?.getPlayerTile?.()) {
    if (!playerTile) return null;
    return this.getActivatedPortals()
      .map(portal => ({
        ...portal,
        distance: Math.abs(portal.tx - playerTile.tx) + Math.abs(portal.ty - playerTile.ty),
      }))
      .sort((a, b) => a.distance - b.distance)[0]
      || null;
  }

  quickResumeDeepestPortal() {
    const deepest = this.getDeepestPortal();
    if (!deepest) return { success: false, reason: "no-activated-portal" };
    return this._teleportToDungeonPair(deepest.pairData, { kind: "quickResume" });
  }

  _activateGamble() {
    const digSystem = this.scene.digSystem;
    if (!digSystem) return { success: false, reason: "no-dig-system" };

    this.usedGambleTiles.add(this.promptTile.key);

    const resources = digSystem.getResourceTotals();
    const totalResources = Object.values(resources).reduce((sum, value) => sum + value, 0);
    const feedback = GAMBLE_TILE_CONFIG.feedback;

    if (totalResources === 0) {
      this.scene.uiNotifications?.warning?.(
        feedback.noResources,
        { key: feedback.key, color: feedback.noResourcesColor },
      );
      return { success: true, type: "gamble", result: "no-resources" };
    }

    if (Math.random() < 0.5) {
      const newResources = {};
      for (const [resourceKey, value] of Object.entries(resources)) {
        if (value > 0) newResources[resourceKey] = value * 3;
      }
      digSystem.setResourceTotals(newResources);
      this.scene.uiNotifications?.success?.(
        feedback.win,
        { key: feedback.key, color: feedback.winColor },
      );
      this._playSound("gamble-win");
      return { success: true, type: "gamble", result: "win", multiplied: newResources };
    }

    digSystem.setResourceTotals(createZeroResourceTotals());
    this.scene.uiNotifications?.danger?.(
      feedback.loss,
      { key: feedback.key, color: feedback.lossColor },
    );
    this._playSound("gamble-lose");
    return { success: true, type: "gamble", result: "lose", lostResources: resources };
  }

  _playSound(type) {
    if (!this.scene.soundSystem) return;
    switch (type) {
      case "teleport":
        break;
      case "gamble-win":
        this.scene.soundSystem.playSfx("reward");
        break;
      case "gamble-lose":
        break;
    }
  }

  _clearSkyPortals() {
    for (const pairData of this.pairedTeleporters.values()) {
      this._destroySkyPortalVisual(pairData);
      this._unregisterSkyTeleporterTiles(pairData);
      this.scene.heavenblocksArtifactSystem?.setSkyPortalSlotActive?.(
        pairData.gateSlotId,
        false,
      );
    }
    this.pairedTeleporters.clear();
    this.skyToDungeonMap.clear();
    this.portalOrder = [];
    this._syncGroundPortalVisuals();
  }

  getSaveData() {
    return {
      usedGambleTiles: Array.from(this.usedGambleTiles),
      openedChestKeys: Array.from(this.openedChestKeys),
      pairedTeleporters: this.portalOrder
        .filter((key) => this.pairedTeleporters.has(key))
        .map((key) => {
          const data = this.pairedTeleporters.get(key);
          return {
            key,
            dungeonTx: data.dungeonTx,
            dungeonTy: data.dungeonTy,
            gateSlotId: data.gateSlotId,
            gateObjectId: data.gateObjectId,
            regionId: data.regionId,
            skyTx: data.skyTx,
            skyTy: data.skyTy,
            skyLandingTx: data.skyLandingTx,
            skyLandingTy: data.skyLandingTy,
          };
        }),
      portalOrder: [...this.portalOrder],
    };
  }

  loadSaveData(data) {
    if (!data) return;

    this.usedGambleTiles = new Set(Array.isArray(data.usedGambleTiles) ? data.usedGambleTiles : []);
    this.openedChestKeys = new Set(
      (Array.isArray(data.openedChestKeys) ? data.openedChestKeys : [])
        .filter(key => typeof key === "string")
        .slice(0, 10000)
    );
    const reopened = this.worldModel.applyDugTileKeys(Array.from(this.openedChestKeys));
    reopened.forEach(tile => this.scene.worldRenderer?.applyTileUpdate?.(tile.tx, tile.ty));
    this._clearSkyPortals();
    if (!Array.isArray(data.pairedTeleporters)) return;

    const serializedByKey = new Map();
    const reservedSlotIds = new Set();
    for (const entry of data.pairedTeleporters) {
      if (!entry?.key || !Number.isFinite(entry.dungeonTx) || !Number.isFinite(entry.dungeonTy)) continue;
      const slot = this._resolveSavedSlot(entry, reservedSlotIds);
      if (!slot) continue;
      reservedSlotIds.add(slot.id);
      const pairData = this._createPairData({ tx: entry.dungeonTx, ty: entry.dungeonTy }, slot);
      pairData.skyPortalVisual = this._spawnSkyPortalGlow(slot);
      serializedByKey.set(entry.key, pairData);
    }

    const serializedOrder = Array.isArray(data.portalOrder)
      ? data.portalOrder
      : data.pairedTeleporters.map((entry) => entry.key);

    for (const key of serializedOrder) {
      const pairData = serializedByKey.get(key);
      if (!pairData) continue;
      this._addSkyPortal(key, pairData);
      serializedByKey.delete(key);
    }

    for (const [key, pairData] of serializedByKey.entries()) {
      this._addSkyPortal(key, pairData);
    }
    this._enforceSkyPortalCapacity();
  }

  _resolveSavedSlot(entry, reservedSlotIds = new Set()) {
    const directSlot = entry.gateSlotId != null ? this._findSlotById(entry.gateSlotId) : null;
    if (directSlot && !reservedSlotIds.has(directSlot.id)) return directSlot;

    if (Number.isFinite(entry.skyTx) && Number.isFinite(entry.skyTy)) {
      const closest = this.skyPortalSlots
        .filter((slot) => !reservedSlotIds.has(slot.id))
        .map((slot) => ({
          slot,
          distance: Math.abs(slot.interactionTx - entry.skyTx) + Math.abs(slot.interactionTy - entry.skyTy),
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.slot;
      if (closest) return closest;
    }

    const usedSlots = new Set(Array.from(this.pairedTeleporters.values()).map((pair) => String(pair.gateSlotId)));
    return this.skyPortalSlots.find((slot) => !usedSlots.has(slot.id) && !reservedSlotIds.has(slot.id))
      || this.skyPortalSlots.find((slot) => !reservedSlotIds.has(slot.id))
      || this.skyPortalSlots[0]
      || null;
  }

  destroy() {
    this._clearSkyPortals();
    this.promptText?.destroy();
    this.promptText = null;
    this.promptTile = null;
  }
}
