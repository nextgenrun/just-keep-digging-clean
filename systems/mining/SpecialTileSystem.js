import { TILE_TYPES } from "../../values/tileTypes.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { TILED_BACKGROUND_OBJECTS } from "../../values/tiledBackgroundObjects.js";
import { TELEPORT_PORTAL_CONFIG } from "../../values/teleportPortalConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";

export class SpecialTileSystem {
  constructor(scene, worldModel, playerController, floatingTextSystem) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.playerController = playerController;
    this.floatingTextSystem = floatingTextSystem;

    this.usedGambleTiles = new Set();
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
          const depthTiles = pair.dungeonTy - this.worldModel.config.topAirRows;
          this._showPrompt(tile.tx, tile.ty, `Press ${USER_SETTINGS.getKeyLabel("interact")} to Teleport to Depth ${depthTiles}m`);
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: "teleportSkyReturn", key: tileKey, dungeonKey: dungeonKeyFromSky };
          foundSpecialTile = true;
          break;
        }
      }

      const tileType = this.worldModel.getTileType(tile.tx, tile.ty);
      if (tileType === TILE_TYPES.TELEPORT_TILE) {
        const pair = this.pairedTeleporters.get(tileKey);
        if (pair) {
          const depthTiles = pair.dungeonTy - this.worldModel.config.topAirRows;
          this._showPrompt(
            tile.tx,
            tile.ty,
            `Press ${USER_SETTINGS.getKeyLabel("interact")} to Teleport to Sky Island (depth ${depthTiles}m)`
          );
          this.promptTile = { tx: tile.tx, ty: tile.ty, type: "teleportPaired", key: tileKey };
        } else {
          this._showPrompt(tile.tx, tile.ty, `Press ${USER_SETTINGS.getKeyLabel("interact")} to Teleport to Sky Island`);
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

  handleInteract() {
    if (!this.promptTile) return { success: false, reason: "no-special-tile" };
    if (this.promptTile.type === "teleport" || this.promptTile.type === "teleportPaired") return this._activateTeleport();
    if (this.promptTile.type === "teleportSkyReturn") return this._activateSkyTeleportReturn();
    if (this.promptTile.type === "gamble") return this._activateGamble();
    if (this.promptTile.type === "gambleUsed") return { success: false, reason: "already-used" };
    return { success: false, reason: "unknown-type" };
  }

  _buildSkyPortalSlots() {
    const slots = [];
    const tilePx = TILED_BACKGROUND_OBJECTS?.tilePx || this.worldModel.config.tileSize || TELEPORT_PORTAL_CONFIG.fallbackTilePx;
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

  _reserveGateSlotForNewPortal() {
    if (!this.skyPortalSlots.length) return null;

    const usedSlots = new Set(Array.from(this.pairedTeleporters.values()).map((pair) => String(pair.gateSlotId)));
    const available = this.skyPortalSlots.find((slot) => !usedSlots.has(slot.id));
    if (available) return available;

    const oldestKey = this.portalOrder[0];
    const oldestPair = oldestKey ? this.pairedTeleporters.get(oldestKey) : null;
    const slotToReuse = oldestPair ? this._findSlotById(oldestPair.gateSlotId) : null;
    if (oldestKey) this._removeSkyPortal(oldestKey);
    return slotToReuse || this.skyPortalSlots[0];
  }

  _createPairData(tile, slot) {
    return {
      dungeonTx: tile.tx,
      dungeonTy: tile.ty,
      gateSlotId: slot.id,
      gateObjectId: slot.objectId,
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
    this.pairedTeleporters.delete(dungeonKey);

    const orderIndex = this.portalOrder.indexOf(dungeonKey);
    if (orderIndex !== -1) this.portalOrder.splice(orderIndex, 1);
  }

  _enforceSkyPortalCapacity() {
    while (this.portalOrder.length > TELEPORT_PORTAL_CONFIG.maxActiveSkyPortals) {
      this._removeSkyPortal(this.portalOrder[0]);
    }
  }

  _addSkyPortal(dungeonKey, pairData) {
    this.pairedTeleporters.set(dungeonKey, pairData);
    if (!this.portalOrder.includes(dungeonKey)) this.portalOrder.push(dungeonKey);
    this._registerSkyTeleporterTiles(pairData, dungeonKey);
    this._enforceSkyPortalCapacity();
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

  _activateTeleport() {
    const tile = this.promptTile;
    const tileKey = `${tile.tx},${tile.ty}`;

    if (this.pairedTeleporters.has(tileKey)) {
      return this._teleportToSky(this.pairedTeleporters.get(tileKey), false);
    }

    const slot = this._reserveGateSlotForNewPortal();
    if (!slot) {
      console.warn("[SpecialTileSystem] No authored eclipse gate slots available for teleport activation.");
      return { success: false, reason: "no-sky-portal-slot" };
    }

    const pairData = this._createPairData(tile, slot);
    pairData.skyPortalVisual = this._spawnSkyPortalGlow(slot);
    this._addSkyPortal(tileKey, pairData);
    return this._teleportToSky(pairData, true);
  }

  _teleportToSky(pairData, firstActivation) {
    const safeTile = this._findSafeAdjacentTile(pairData.skyTx, pairData.skyTy)
      || this._findSafeReturnTile(pairData.skyLandingTx, pairData.skyLandingTy);
    const target = safeTile || { tx: pairData.skyLandingTx, ty: pairData.skyLandingTy };
    if (!safeTile) {
      console.warn("[SpecialTileSystem] No safe sky portal landing tile found, using assigned fallback.", pairData.gateSlotId);
    }

    this.playerController.teleportToTile(target.tx, target.ty);
    this._playSound("teleport");

    if (this.floatingTextSystem) {
      const worldPos = this.worldModel.tileToWorld(target.tx, target.ty);
      const depthTiles = pairData.dungeonTy - this.worldModel.config.topAirRows;
      const text = firstActivation
        ? `Teleported to Sky Island! (from depth ${depthTiles}m)`
        : "Teleported to Sky Island!";
      this.floatingTextSystem.showFloatingText(worldPos.x, worldPos.y, text, "#00ffff");
    }

    return { success: true, type: "teleport", target: "skyIsland", pairData };
  }

  _activateSkyTeleportReturn() {
    const tile = this.promptTile;
    const dungeonKey = tile?.dungeonKey || this.skyToDungeonMap.get(tile?.key);
    const pair = dungeonKey ? this.pairedTeleporters.get(dungeonKey) : null;
    if (!pair) return { success: false, reason: "no-paired-teleporter" };

    const fallbackTy = pair.dungeonTy - 1;
    const safeTile = this._findSafeReturnTile(pair.dungeonTx, fallbackTy);
    const target = safeTile || { tx: pair.dungeonTx, ty: fallbackTy };
    if (!safeTile) {
      console.warn("[SpecialTileSystem] No safe return tile found near portal, using fallback destination.", dungeonKey);
    }

    this.playerController.teleportToTile(target.tx, target.ty);
    this._playSound("teleport");

    if (this.floatingTextSystem) {
      const worldPos = this.worldModel.tileToWorld(target.tx, target.ty);
      const depthTiles = pair.dungeonTy - this.worldModel.config.topAirRows;
      this.floatingTextSystem.showFloatingText(worldPos.x, worldPos.y, `Returned to Depth ${depthTiles}m!`, "#00ffff");
    }

    return { success: true, type: "teleport", target: "dungeon" };
  }

  _activateGamble() {
    const digSystem = this.scene.digSystem;
    if (!digSystem) return { success: false, reason: "no-dig-system" };

    this.usedGambleTiles.add(this.promptTile.key);

    const resources = digSystem.getResourceTotals();
    const totalResources = Object.values(resources).reduce((sum, value) => sum + value, 0);
    const worldPos = this.worldModel.tileToWorld(this.promptTile.tx, this.promptTile.ty);

    if (totalResources === 0) {
      this.floatingTextSystem?.showFloatingText(worldPos.x, worldPos.y, "No resources to gamble!", "#ff0000");
      return { success: true, type: "gamble", result: "no-resources" };
    }

    if (Math.random() < 0.5) {
      const newResources = {};
      for (const [resourceKey, value] of Object.entries(resources)) {
        if (value > 0) newResources[resourceKey] = value * 3;
      }
      digSystem.setResourceTotals(newResources);
      this.floatingTextSystem?.showFloatingText(worldPos.x, worldPos.y, "GAMBLE WIN! x3 Resources!", "#00ff00");
      this._playSound("gamble-win");
      return { success: true, type: "gamble", result: "win", multiplied: newResources };
    }

    const emptyResources = {
      dirt: 0,
      stone: 0,
      copper: 0,
      darkDirtNormal: 0,
      darkDirtStrong: 0,
      steel: 0,
      iron: 0,
      bronze: 0,
      silver: 0,
      gold: 0,
    };
    digSystem.setResourceTotals(emptyResources);
    this.floatingTextSystem?.showFloatingText(worldPos.x, worldPos.y, "GAMBLE LOSE! All resources lost!", "#ff0000");
    this._playSound("gamble-lose");
    return { success: true, type: "gamble", result: "lose", lostResources: resources };
  }

  _playSound(type) {
    if (!this.scene.soundSystem) return;
    switch (type) {
      case "gamble-win":
        this.scene.soundSystem.playSfx("reward");
        break;
    }
  }

  _clearSkyPortals() {
    for (const pairData of this.pairedTeleporters.values()) {
      this._destroySkyPortalVisual(pairData);
      this._unregisterSkyTeleporterTiles(pairData);
    }
    this.pairedTeleporters.clear();
    this.skyToDungeonMap.clear();
    this.portalOrder = [];
  }

  getSaveData() {
    return {
      usedGambleTiles: Array.from(this.usedGambleTiles),
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
