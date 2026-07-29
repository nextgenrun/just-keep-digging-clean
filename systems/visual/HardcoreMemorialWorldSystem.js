import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";

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
    const width = world.widthTiles * tileSize;
    const height = world.heightTiles * tileSize;
    const maximumX = Number.isFinite(this.scene.config?.worldWidthPx)
      ? this.scene.config.worldWidthPx - width / 2
      : baseX + offset;
    const maximumY = Number.isFinite(this.scene.config?.worldDepthPx)
      ? this.scene.config.worldDepthPx
      : baseY;
    const safeX = Math.max(width / 2, Math.min(maximumX, baseX + offset));
    const safeY = Math.max(height, Math.min(maximumY, baseY));
    const root = this.scene.add.container(safeX, safeY)
      .setDepth(world.depth);
    const image = this.scene.add.image(
      0,
      0,
      ASSET_KEYS.environment.hardcoreMemorial,
    )
      .setOrigin(0.5, 1)
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
      this.scene.uiNotifications?.warning?.(
        `${this.config.copy.memorialPrefix}  •  ${record.depth}`
          + `${this.config.copy.meterUpperSuffix}\n`
          + `${record.reason}\n${this.config.copy.memorialInspectHint}`,
        {
          key: `${world.noticeKeyPrefix}${record.id}`,
          durationMs: world.noticeDurationMs,
        },
      );
    });
    return { root, image, pulse, baseX, baseY, record };
  }

  _clearEntries() {
    this.entries.forEach(entry => {
      entry.pulse?.stop?.();
      entry.image?.removeAllListeners?.();
      entry.image?.disableInteractive?.();
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
