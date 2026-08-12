const clone = value => JSON.parse(JSON.stringify(value));

export class JackpotSaveTransaction {
  constructor(scene, director) {
    this.scene = scene;
    this.director = director;
    this.sequence = 0;
  }

  capture({ chest = null } = {}) {
    const retention = this.scene.retentionProgressSystem;
    return {
      money: this.scene.upgradeSystem?.getMoney?.() || 0,
      resources: this.scene.digSystem?.getResourceTotals?.() || {},
      eventData: this.director.getSaveData(),
      retentionData: retention?.getSaveData?.() || null,
      retentionExpedition: retention?.expedition ? clone(retention.expedition) : null,
      journeyData: this.scene.journeySystem?.getSaveData?.() || null,
      chest: chest ? {
        key: chest.key || `${chest.tx},${chest.ty}`,
        tx: chest.tx,
        ty: chest.ty,
      } : null,
    };
  }

  async commit(snapshot) {
    if (this.scene.gameSaveCoordinator?.transaction) {
      this.sequence += 1;
      await this.scene.gameSaveCoordinator.transaction({
        id: `sleeping-jackpot:${this.sequence}`,
        reason: "sleeping-jackpot",
        mutate: () => true,
        rollback: () => this.restore(snapshot),
      });
      return true;
    }
    this.scene.queueDugTilesSave?.();
    let saved = true;
    try {
      saved = await this.scene.flushDugTilesSave?.();
    } catch (_) {
      saved = false;
    }
    if (saved !== false) return true;

    this.restore(snapshot);
    this.scene.queueDugTilesSave?.();
    try {
      await this.scene.flushDugTilesSave?.();
    } catch (_) {
      // The authoritative in-memory transaction is already restored. A later
      // normal save can retry the compensating snapshot.
    }
    throw new Error("SAVE FAILED — JACKPOT LEFT UNCHANGED");
  }

  restore(snapshot) {
    if (!snapshot) return false;
    this.scene.upgradeSystem?.setMoney?.(snapshot.money);
    this.scene.digSystem?.setResourceTotals?.(snapshot.resources);
    this.director.loadSaveData(snapshot.eventData);

    const retention = this.scene.retentionProgressSystem;
    if (retention && snapshot.retentionData) {
      retention.loadSaveData(snapshot.retentionData);
      if (snapshot.retentionExpedition) {
        retention.expedition = clone(snapshot.retentionExpedition);
      }
    }
    if (snapshot.journeyData) {
      this.scene.journeySystem?.loadSaveData?.(snapshot.journeyData);
    }
    if (snapshot.chest) {
      this.scene.specialTileSystem?.restoreChestForEvent?.(snapshot.chest);
    }

    const resources = this.scene.digSystem?.getResourceTotals?.() || {};
    this.scene.uiResourceBar?.setResources?.(resources);
    this.scene.uiResourceBar?.setMoney?.(snapshot.money);
    return true;
  }

  destroy() {
    this.scene = null;
    this.director = null;
  }
}
