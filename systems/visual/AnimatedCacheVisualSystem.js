import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  INTERACTIVE_WORLD_STATES,
  getInteractiveWorldStateAsset,
  getInteractiveWorldStateBiome,
  getInteractiveWorldStateFrameName,
  resolveInteractiveWorldStateFeature,
} from "../../values/interactiveWorldStates.js";

export class AnimatedCacheVisualSystem {
  constructor(
    scene,
    worldModel,
    textureBank,
    config = INTERACTIVE_WORLD_STATES,
    search = globalThis.location?.search || "",
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.textureBank = textureBank;
    this.config = config;
    this.feature = config.animatedCaches;
    this.enabled = resolveInteractiveWorldStateFeature(this.feature, search);
    this.records = new Map();
    this.knownOpenedKeys = new Set();
    this.openedBaselineCaptured = false;
  }

  update(timeMs, playerTile) {
    if (!this.enabled || !playerTile) return;
    const openedKeys = this.scene.specialTileSystem?.openedChestKeys || new Set();
    if (!this.openedBaselineCaptured) {
      this.knownOpenedKeys = new Set(openedKeys);
      this.openedBaselineCaptured = true;
    }

    const bounds = this._getCameraBounds(playerTile);
    const revision = this.worldModel.tileTypeRevision;
    const previous = this.discoveryBounds;
    const changed = !Number.isFinite(revision) || !previous
      || bounds.left !== previous.left || bounds.right !== previous.right
      || bounds.top !== previous.top || bounds.bottom !== previous.bottom
      || revision !== this.discoveryRevision
      || openedKeys !== this.discoveryOpenedKeys || openedKeys.size !== this.discoveryOpenedCount;
    if (changed) {
      this.needed = this._collectNeeded(openedKeys, playerTile, bounds);
      this.discoveryBounds = bounds;
      this.discoveryRevision = revision;
      this.discoveryOpenedKeys = openedKeys;
      this.discoveryOpenedCount = openedKeys.size;
    }
    const needed = this.needed;
    for (const [key, entry] of needed) {
      const newlyOpened = entry.opened && !this.knownOpenedKeys.has(key);
      this._syncRecord(key, entry, playerTile, timeMs, newlyOpened);
    }
    for (const [key, record] of this.records) {
      if (needed.has(key)) continue;
      this._destroyRecord(record);
      this.records.delete(key);
    }
    if (changed) this.knownOpenedKeys = new Set(openedKeys);
  }

  _collectNeeded(openedKeys, playerTile, bounds = this._getCameraBounds(playerTile)) {
    const needed = new Map();
    for (let tileY = bounds.top; tileY <= bounds.bottom; tileY += 1) {
      for (let tileX = bounds.left; tileX <= bounds.right; tileX += 1) {
        const key = `${tileX},${tileY}`;
        const opened = openedKeys.has(key);
        if (
          !opened
          && this.worldModel.getTileType(tileX, tileY) !== TILE_TYPES.CHEST
        ) {
          continue;
        }
        const biome = getInteractiveWorldStateBiome(tileY);
        const asset = biome
          ? getInteractiveWorldStateAsset(biome.id, this.feature.familyId)
          : null;
        if (asset) {
          needed.set(key, { tileX, tileY, opened, asset });
        }
      }
    }
    return needed;
  }

  _getCameraBounds(playerTile) {
    const tileSize = this.worldModel.tileSize;
    const padding = this.feature.cameraPaddingTiles;
    const view = this.scene.cameras?.main?.worldView;
    const fallbackHalfWidth = padding;
    const fallbackHalfHeight = padding;
    const left = view?.width > 0
      ? Math.floor(view.x / tileSize) - padding
      : playerTile.tx - fallbackHalfWidth;
    const right = view?.width > 0
      ? Math.ceil((view.x + view.width) / tileSize) + padding
      : playerTile.tx + fallbackHalfWidth;
    const top = view?.height > 0
      ? Math.floor(view.y / tileSize) - padding
      : playerTile.ty - fallbackHalfHeight;
    const bottom = view?.height > 0
      ? Math.ceil((view.y + view.height) / tileSize) + padding
      : playerTile.ty + fallbackHalfHeight;
    return {
      left: Math.max(0, left),
      right: Math.min(this.worldModel.widthTiles - 1, right),
      top: Math.max(0, top),
      bottom: Math.min(this.worldModel.depthTiles - 1, bottom),
    };
  }

  _syncRecord(key, entry, playerTile, timeMs, newlyOpened) {
    const consumerId = `${this.feature.consumerPrefix}${key}`;
    const ready = this.textureBank.ensure(entry.asset, consumerId);
    let record = this.records.get(key);
    if (!record) {
      record = {
        key,
        entry,
        consumerId,
        image: null,
        openedAtMs: null,
        pendingOpenAnimation: newlyOpened,
        lastFrameIndex: null,
      };
      this.records.set(key, record);
    } else {
      record.entry = entry;
      if (newlyOpened) {
        record.openedAtMs = null;
        record.pendingOpenAnimation = true;
      } else if (!entry.opened) {
        record.openedAtMs = null;
        record.pendingOpenAnimation = false;
      }
    }
    if (!ready) return;
    if (!record.image) record.image = this._createImage(record);
    if (entry.opened && record.pendingOpenAnimation) {
      record.openedAtMs = timeMs;
      record.pendingOpenAnimation = false;
      record.lastFrameIndex = null;
    }
    const frameIndex = this._resolveFrame(record, playerTile, timeMs);
    if (record.lastFrameIndex !== frameIndex) {
      record.image.setFrame(getInteractiveWorldStateFrameName(frameIndex));
      record.lastFrameIndex = frameIndex;
    }
    record.image.setAlpha(
      entry.opened && record.openedAtMs === null
        ? this.feature.spentAlpha
        : this.config.render.fullAlpha,
    );
  }

  _createImage(record) {
    const tileSize = this.worldModel.tileSize;
    const x = (record.entry.tileX + 0.5) * tileSize;
    const y = (record.entry.tileY + 1) * tileSize;
    const displaySize = this.feature.displaySizeTiles * tileSize;
    const initialFrame = record.entry.opened
      ? this.config.states.resolved.index
      : this.config.states.dormant.index;
    const image = this.scene.add.image(
      x,
      y,
      record.entry.asset.key,
      getInteractiveWorldStateFrameName(initialFrame),
    )
      .setOrigin(0.5, 1)
      .setDepth(this.config.render.depth)
      .setDisplaySize(displaySize, displaySize);
    image.name = `${this.feature.spriteNamePrefix}${record.key}`;
    return image;
  }

  _resolveFrame(record, playerTile, timeMs) {
    const states = this.config.states;
    if (!record.entry.opened) {
      const distance = Math.abs(playerTile.tx - record.entry.tileX)
        + Math.abs(playerTile.ty - record.entry.tileY);
      return distance <= this.feature.proximityRangeTiles
        ? states.proximityReady.index
        : states.dormant.index;
    }
    if (record.openedAtMs === null) return states.resolved.index;

    const elapsedMs = Math.max(0, timeMs - record.openedAtMs);
    const activationDurationMs = states.activation.length
      * this.feature.activationFrameMs;
    if (elapsedMs < activationDurationMs) {
      const activationIndex = Math.min(
        states.activation.length - 1,
        Math.floor(elapsedMs / this.feature.activationFrameMs),
      );
      return states.activation[activationIndex].index;
    }

    const activeElapsedMs = elapsedMs - activationDurationMs;
    if (activeElapsedMs < this.feature.activeLoopDurationMs) {
      const loopIndex = Math.floor(
        activeElapsedMs / this.feature.activeLoopFrameMs,
      ) % states.activeLoop.length;
      return states.activeLoop[loopIndex].index;
    }
    if (
      activeElapsedMs
      < this.feature.activeLoopDurationMs + this.feature.resolvedHoldMs
    ) {
      return states.resolved.index;
    }
    record.openedAtMs = null;
    return states.resolved.index;
  }

  _destroyRecord(record) {
    record.image?.destroy?.();
    this.textureBank.release(record.entry.asset.key, record.consumerId);
    record.image = null;
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      visibleCaches: this.records.size,
      openedBaselineCaptured: this.openedBaselineCaptured,
      animatingCaches: [...this.records.values()]
        .filter(record => (
          record.pendingOpenAnimation || record.openedAtMs !== null
        ))
        .length,
    };
  }

  destroy() {
    for (const record of this.records.values()) this._destroyRecord(record);
    this.records.clear();
    this.knownOpenedKeys.clear();
    this.needed?.clear();
    this.discoveryOpenedKeys = null;
    this.scene = null;
    this.worldModel = null;
    this.textureBank = null;
  }
}
