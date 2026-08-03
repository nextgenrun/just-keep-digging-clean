import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import {
  INTERACTIVE_WORLD_STATES,
  getInteractiveWorldStateAsset,
  getInteractiveWorldStateFrameName,
  resolveInteractiveWorldStateFeature,
} from "../../values/interactiveWorldStates.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export class MemoryReliquaryWorldSystem {
  constructor(
    scene,
    worldModel,
    textureBank,
    discoverySystem,
    getInteractKeyLabel,
    config = INTERACTIVE_WORLD_STATES,
    search = globalThis.location?.search || "",
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.textureBank = textureBank;
    this.discoverySystem = discoverySystem;
    this.getInteractKeyLabel = getInteractKeyLabel;
    this.config = config;
    this.feature = config.memoryReliquaries;
    this.enabled = resolveInteractiveWorldStateFeature(this.feature, search);
    this.records = new Map();
    this.promptText = null;
    this.activeRecord = null;
    this.interactionAllowed = false;
  }

  create() {
    if (!this.enabled) return false;
    for (const definition of this.feature.definitions) {
      const valid = this._validatePlacement(definition);
      if (!valid) {
        console.warn(
          `[MemoryReliquaryWorldSystem] Omitted unsafe authored anchor ${definition.id}`,
        );
      }
      this.records.set(definition.id, {
        definition,
        valid,
        asset: getInteractiveWorldStateAsset(
          definition.biomeId,
          this.feature.familyId,
        ),
        consumerId: `${this.feature.consumerPrefix}${definition.id}`,
        image: null,
        openingAtMs: null,
        lastFrameIndex: null,
        distance: Number.POSITIVE_INFINITY,
      });
    }
    this._createPrompt();
    return [...this.records.values()].some(record => record.valid);
  }

  update(timeMs, playerTile) {
    if (!this.enabled || !playerTile) return;
    this.discoverySystem.refresh();
    for (const record of this.records.values()) {
      if (!record.valid || !record.asset) continue;
      record.distance = this._distanceTo(record.definition, playerTile);
      if (record.distance > this.feature.preloadRangeTiles) {
        this._releaseRecord(record);
        continue;
      }
      const ready = this.textureBank.ensure(record.asset, record.consumerId);
      if (!ready) continue;
      if (!record.image) record.image = this._createImage(record);
      const frameIndex = this._resolveFrame(record, timeMs);
      if (record.lastFrameIndex !== frameIndex) {
        record.image.setFrame(getInteractiveWorldStateFrameName(frameIndex));
        record.lastFrameIndex = frameIndex;
      }
    }
    this.activeRecord = this._findNearestInteractiveRecord();
    this.setInteractionAllowed(this.interactionAllowed);
  }

  getInteractionDistance(playerTile) {
    if (!this.enabled || !playerTile) return Number.POSITIVE_INFINITY;
    let nearest = Number.POSITIVE_INFINITY;
    for (const record of this.records.values()) {
      if (!record.valid || !record.image) continue;
      const distance = this._distanceTo(record.definition, playerTile);
      if (distance <= this.feature.interactionRangeTiles) {
        nearest = Math.min(nearest, distance);
      }
    }
    return nearest;
  }

  setInteractionAllowed(allowed) {
    this.interactionAllowed = Boolean(allowed && this.activeRecord);
    if (!this.promptText) return;
    if (!this.interactionAllowed) {
      this.promptText.setVisible(false);
      return;
    }
    const definition = this.activeRecord.definition;
    const discovered = this.discoverySystem.isDiscovered(definition);
    const verb = discovered
      ? this.feature.prompt.readVerb
      : this.feature.prompt.openVerb;
    const tileSize = this.worldModel.tileSize;
    this.promptText
      .setPosition(
        (definition.tileX + 0.5) * tileSize,
        (definition.floorTileY - this.feature.prompt.yOffsetTiles) * tileSize,
      )
      .setText(`${this.getInteractKeyLabel()}  •  ${verb}`)
      .setVisible(true);
  }

  handleInteract() {
    if (!this.enabled || !this.interactionAllowed || !this.activeRecord) {
      return { success: false, reason: "no-memory-reliquary" };
    }
    const result = this.discoverySystem.open(this.activeRecord.definition);
    if (!result.success) return result;
    if (result.newlyDiscovered) {
      this.activeRecord.openingAtMs = this.scene.time?.now || 0;
    }
    this._showLore(result.definition, result.newlyDiscovered);
    this.setInteractionAllowed(true);
    return result;
  }

  _validatePlacement(definition) {
    const contract = this.feature.placementContract;
    for (
      let offsetY = contract.clearanceHeightTiles;
      offsetY >= 1;
      offsetY -= 1
    ) {
      const tileY = definition.floorTileY - offsetY;
      for (
        let offsetX = -contract.clearanceHalfWidthTiles;
        offsetX <= contract.clearanceHalfWidthTiles;
        offsetX += 1
      ) {
        if (
          this.worldModel.getTileType(definition.tileX + offsetX, tileY)
          !== TILE_TYPES.AIR
        ) {
          return false;
        }
      }
    }
    for (
      let offsetX = -contract.floorSupportHalfWidthTiles;
      offsetX <= contract.floorSupportHalfWidthTiles;
      offsetX += 1
    ) {
      if (
        this.worldModel.getTileType(
          definition.tileX + offsetX,
          definition.floorTileY,
        ) === TILE_TYPES.AIR
      ) {
        return false;
      }
    }
    return true;
  }

  _createPrompt() {
    if (!this.scene.add?.text) return;
    this.promptText = this.scene.add.text(0, 0, "", {
      fontSize: HUD_LAYOUT.promptFontSize,
      fontFamily: "Consolas, monospace",
      color: UI_COLORS.white,
      backgroundColor: "#131c26",
      padding: { x: HUD_LAYOUT.promptPadX, y: HUD_LAYOUT.promptPadY },
      stroke: "#000000",
      strokeThickness: Math.max(1, HUD_LAYOUT.promptStrokeThickness - 1),
    })
      .setOrigin(0.5, 1)
      .setDepth(HUD_LAYOUT.floatingTextDepth)
      .setVisible(false);
  }

  _createImage(record) {
    const tileSize = this.worldModel.tileSize;
    const displaySize = this.feature.displaySizeTiles * tileSize;
    const discovered = this.discoverySystem.isDiscovered(record.definition);
    const frameIndex = discovered
      ? this.config.states.resolved.index
      : this.config.states.dormant.index;
    const image = this.scene.add.image(
      (record.definition.tileX + 0.5) * tileSize,
      record.definition.floorTileY * tileSize,
      record.asset.key,
      getInteractiveWorldStateFrameName(frameIndex),
    )
      .setOrigin(0.5, 1)
      .setDepth(this.config.render.depth)
      .setDisplaySize(displaySize, displaySize)
      .setAlpha(this.config.render.fullAlpha);
    image.name = `${this.feature.spriteNamePrefix}${record.definition.id}`;
    return image;
  }

  _resolveFrame(record, timeMs) {
    const states = this.config.states;
    if (record.openingAtMs !== null) {
      const elapsedMs = Math.max(0, timeMs - record.openingAtMs);
      const activationDurationMs = states.activation.length
        * this.feature.activationFrameMs;
      if (elapsedMs < activationDurationMs) {
        const index = Math.min(
          states.activation.length - 1,
          Math.floor(elapsedMs / this.feature.activationFrameMs),
        );
        return states.activation[index].index;
      }
      const activeElapsedMs = elapsedMs - activationDurationMs;
      if (activeElapsedMs < this.feature.activeLoopDurationMs) {
        const index = Math.floor(
          activeElapsedMs / this.feature.activeLoopFrameMs,
        ) % states.activeLoop.length;
        return states.activeLoop[index].index;
      }
      if (
        activeElapsedMs
        < this.feature.activeLoopDurationMs + this.feature.resolvedHoldMs
      ) {
        return states.resolved.index;
      }
      record.openingAtMs = null;
    }
    if (this.discoverySystem.isDiscovered(record.definition)) {
      return states.resolved.index;
    }
    return record.distance <= this.feature.interactionRangeTiles
      ? states.proximityReady.index
      : states.dormant.index;
  }

  _distanceTo(definition, playerTile) {
    return Math.abs(playerTile.tx - definition.tileX)
      + Math.abs(playerTile.ty - (definition.floorTileY - 1));
  }

  _findNearestInteractiveRecord() {
    let nearest = null;
    for (const record of this.records.values()) {
      if (
        !record.valid
        || !record.image
        || record.distance > this.feature.interactionRangeTiles
      ) {
        continue;
      }
      if (
        !nearest
        || record.distance < nearest.distance
        || (
          record.distance === nearest.distance
          && record.definition.id < nearest.definition.id
        )
      ) {
        nearest = record;
      }
    }
    return nearest;
  }

  _showLore(definition, newlyDiscovered) {
    const notification = this.feature.notification;
    const sections = [`“${definition.inscription}”`];
    if (newlyDiscovered) sections.push(notification.archiveHint);
    const title = `${notification.titlePrefix} — ${definition.title.toUpperCase()}`;
    const body = sections.join("\n\n");
    if (typeof this.scene.showGameDialog === "function") {
      this.scene.showGameDialog(title, body);
    } else {
      this.scene.hudSystem?.flashStatus?.(
        `${title}  •  ${sections.join('  •  ')}`,
        undefined,
        5000,
      );
    }
  }

  _releaseRecord(record) {
    if (!record.image) return;
    record.image.destroy();
    record.image = null;
    record.lastFrameIndex = null;
    this.textureBank.release(record.asset.key, record.consumerId);
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      authored: this.records.size,
      valid: [...this.records.values()].filter(record => record.valid).length,
      visible: [...this.records.values()].filter(record => record.image).length,
      activeId: this.activeRecord?.definition?.id || null,
      discovered: this.discoverySystem.getSnapshot().count,
    };
  }

  destroy() {
    this.promptText?.destroy?.();
    this.promptText = null;
    for (const record of this.records.values()) this._releaseRecord(record);
    this.records.clear();
    this.activeRecord = null;
    this.scene = null;
    this.worldModel = null;
    this.textureBank = null;
    this.discoverySystem = null;
    this.getInteractKeyLabel = null;
  }
}
