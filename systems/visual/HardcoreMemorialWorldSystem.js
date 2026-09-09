import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";

function hasMemorialClearance(worldModel, tileX, supportTileY, clearanceTiles) {
  for (let offset = 1; offset <= clearanceTiles; offset += 1) {
    const tileY = supportTileY - offset;
    if (
      !worldModel.inBounds(tileX, tileY)
      || worldModel.isSolid(tileX, tileY)
    ) {
      return false;
    }
  }
  return true;
}

function isGroundAnchorValid(worldModel, anchor, clearanceTiles) {
  return Boolean(
    anchor
    && worldModel?.inBounds?.(anchor.tileX, anchor.supportTileY)
    && worldModel.isSolid?.(anchor.tileX, anchor.supportTileY)
    && hasMemorialClearance(
      worldModel,
      anchor.tileX,
      anchor.supportTileY,
      clearanceTiles,
    ),
  );
}

export function resolveHardcoreMemorialGroundAnchor(
  worldModel,
  worldX,
  worldY,
  tileSize,
  config = HARDCORE_MEMORIAL_CONFIG,
) {
  if (
    !worldModel
    || typeof worldModel.inBounds !== "function"
    || typeof worldModel.isSolid !== "function"
  ) {
    return null;
  }
  const safeTileSize = Math.max(1, Number(tileSize) || 1);
  const widthTiles = Math.max(
    0,
    Math.floor(Number(worldModel.widthTiles ?? worldModel.width) || 0),
  );
  const depthTiles = Math.max(
    0,
    Math.floor(Number(worldModel.depthTiles ?? worldModel.depth) || 0),
  );
  if (widthTiles === 0 || depthTiles === 0) return null;

  const preferredTileX = Math.max(
    0,
    Math.min(widthTiles - 1, Math.floor(Number(worldX) / safeTileSize)),
  );
  const startTileY = Math.max(
    0,
    Math.min(depthTiles - 1, Math.floor(Number(worldY) / safeTileSize)),
  );
  const offsets = config.world.supportSearchOffsetsTiles;
  const clearance = config.world.airClearanceTiles;

  for (let supportTileY = startTileY; supportTileY < depthTiles; supportTileY += 1) {
    for (const offset of offsets) {
      const tileX = preferredTileX + offset;
      if (
        !worldModel.inBounds(tileX, supportTileY)
        || !worldModel.isSolid(tileX, supportTileY)
        || !hasMemorialClearance(
          worldModel,
          tileX,
          supportTileY,
          clearance,
        )
      ) {
        continue;
      }
      return {
        tileX,
        supportTileY,
        worldX: (tileX + 0.5) * safeTileSize,
        worldY: supportTileY * safeTileSize,
      };
    }
  }
  return null;
}

export class HardcoreMemorialWorldSystem {
  constructor(scene, records = [], config = HARDCORE_MEMORIAL_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.records = [];
    this.entries = [];
    this.ready = scene.textures?.exists?.(
      ASSET_KEYS.environment.hardcoreMemorial,
    ) === true;
    if (!this.ready) {
      console.error(
        "[HardcoreMemorialWorldSystem] Approved memorial art is missing.",
      );
      return;
    }
    this.sync(records);
  }

  sync(records = []) {
    this._clearEntries();
    this.records = Array.isArray(records)
      ? records.slice(-this.config.persistence.maximumRecordsPerSlot)
      : [];
    const placed = [];
    this.records.forEach(record => {
      const entry = this._createEntry(record, placed);
      if (entry) {
        this.entries.push(entry);
        placed.push(entry);
      }
    });
  }

  addRecord(record) {
    this.sync([...this.records, record]);
  }

  _createEntry(record, placed) {
    const tileSize = Math.max(1, this.scene.config?.tileSize || 1);
    const world = this.config.world;
    const baseX = Number(record?.position?.worldX);
    const baseY = Number(record?.position?.worldY);
    if (!Number.isFinite(baseX) || !Number.isFinite(baseY)) return null;

    const nearbyCount = placed.filter(entry => (
      Math.abs(entry.baseX - baseX) <= world.clusterDistanceTiles * tileSize
      && Math.abs(entry.baseY - baseY) <= world.clusterDistanceTiles * tileSize
    )).length;
    const offset = world.clusterOffsetsTiles[
      nearbyCount % world.clusterOffsetsTiles.length
    ] * tileSize;
    const height = world.heightTiles * tileSize;
    const width = height * world.widthToHeightRatio;
    const worldWidth = Number(
      this.scene.worldModel?.widthPx
      ?? this.scene.config?.worldWidthPx,
    );
    const maximumX = Number.isFinite(worldWidth)
      ? worldWidth - width / 2
      : baseX + offset;
    const preferredX = Math.max(
      width / 2,
      Math.min(maximumX, baseX + offset),
    );
    const anchor = resolveHardcoreMemorialGroundAnchor(
      this.scene.worldModel,
      preferredX,
      baseY,
      tileSize,
      this.config,
    );
    if (!anchor) {
      console.warn(
        `[HardcoreMemorialWorldSystem] No solid ground found for ${record?.id}.`,
      );
      return null;
    }
    const root = this.scene.add.container(anchor.worldX, anchor.worldY)
      .setDepth(world.depth);
    const image = this.scene.add.image(
      0,
      0,
      ASSET_KEYS.environment.hardcoreMemorial,
    )
      .setOrigin(0.5, world.visibleAlphaBottomRatio)
      .setDisplaySize(width, height)
      .setAlpha(world.baseAlpha)
      .setInteractive({
        useHandCursor: true,
        pixelPerfect: true,
        alphaTolerance: world.pixelAlphaTolerance,
      });
    root.add(image);
    const baseScaleX = image.scaleX;
    const baseScaleY = image.scaleY;
    const pulse = this.scene.tweens.add({
      targets: root,
      scaleX: 1 + world.pulseScale,
      scaleY: 1 + world.pulseScale,
      alpha: { from: 1 - world.pulseAlpha, to: 1 },
      duration: world.pulseDurationMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    image.on("pointerover", () => {
      this.scene.tweens.add({
        targets: image,
        scaleX: baseScaleX * world.hoverScale,
        scaleY: baseScaleY * world.hoverScale,
        duration: world.interactionTweenMs,
        ease: "Power2.out",
      });
    });
    image.on("pointerout", () => {
      this.scene.tweens.add({
        targets: image,
        scaleX: baseScaleX,
        scaleY: baseScaleY,
        duration: world.interactionTweenMs,
        ease: "Power2.out",
      });
    });
    image.on("pointerdown", () => {
      this.scene.tweens.add({
        targets: image,
        scaleX: baseScaleX * world.pressScale,
        scaleY: baseScaleY * world.pressScale,
        duration: world.interactionTweenMs,
        yoyo: true,
        ease: "Power2.out",
      });
      this.scene.inspectHardcoreMemorial?.(record);
    });
    return {
      root,
      image,
      pulse,
      baseX,
      baseY,
      preferredX,
      anchor,
      record,
    };
  }

  update() {
    const worldModel = this.scene?.worldModel;
    if (!worldModel) return;
    for (const entry of this.entries) {
      if (
        isGroundAnchorValid(
          worldModel,
          entry.anchor,
          this.config.world.airClearanceTiles,
        )
      ) {
        continue;
      }
      const anchor = resolveHardcoreMemorialGroundAnchor(
        worldModel,
        entry.preferredX,
        entry.baseY,
        this.scene.config?.tileSize,
        this.config,
      );
      entry.anchor = anchor;
      if (!anchor) {
        entry.root.setVisible(false);
        continue;
      }
      entry.root
        .setPosition(anchor.worldX, anchor.worldY)
        .setVisible(true);
    }
  }

  _clearEntries() {
    this.entries.forEach(entry => {
      entry.pulse?.stop?.();
      entry.image?.removeAllListeners?.();
      if (entry.image?.scene?.sys) entry.image.disableInteractive?.();
      entry.root?.destroy?.(true);
    });
    this.entries = [];
  }

  destroy() {
    this._clearEntries();
    this.records = [];
    this.scene = null;
  }
}
