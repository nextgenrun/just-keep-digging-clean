import {
  TITAN_DISCOVERY_CONFIG,
  resolveTitanEnvironmentEnabled,
} from "../../values/titanDiscoveries.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  mixWorldVisualTint,
  resolveWorldVisualDepthBackdropTint,
} from "../../values/worldVisualDepthBackdrops.js";
import {
  distanceToTitanZone,
  fitTitanChamberScale,
} from "./titanChamberGeometry.js?rev=20260729-native-density-v14";
import { resolveTitanEnvironmentAssets } from "./titanEnvironmentAssets.js";
import { TitanEnvironmentTextureBank } from "./TitanEnvironmentTextureBank.js";

export class TitanEnvironmentEnvelopeStream {
  constructor(
    scene,
    worldModel,
    config = TITAN_DISCOVERY_CONFIG,
    onChanged = null,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.onChanged = onChanged;
    this.enabled = resolveTitanEnvironmentEnabled(config, search);
    this.records = new Map();
    this.missingMappings = [];
    this.lastLighting = null;
    this.destroyed = false;
    this.textureBank = new TitanEnvironmentTextureBank(scene, {
      onAssetReady: asset => this._attachReadyAsset(asset),
      onChanged: () => this._notifyChanged(),
    });
  }

  create(zoneViews) {
    const profiles = this.config.environmentEnvelope.layers;
    for (const view of zoneViews) {
      const assignments = resolveTitanEnvironmentAssets(
        view.definition,
        this.config
      );
      const families = new Set(
        assignments.map(assignment => assignment.profile.family)
      );
      for (const profile of profiles) {
        if (!families.has(profile.family)) {
          this.missingMappings.push(
            `${view.definition.id}:${profile.family}`
          );
        }
      }
      const record = {
        view,
        assignments,
        desired: false,
        layers: new Map(),
      };
      this.records.set(view.definition.id, record);
      view.environmentLayers = [];
      for (const assignment of assignments) {
        this.textureBank.register(assignment.asset);
      }
    }
    this._notifyChanged();
    return this.enabled;
  }

  sync(playerTile, lighting = null) {
    if (!this.enabled || this.destroyed) return false;
    if (lighting) this.lastLighting = lighting;
    const stream = this.config.environmentEnvelope;
    const candidates = [...this.records.values()]
      .map(record => ({
        record,
        distance: distanceToTitanZone(playerTile, record.view.zone),
      }))
      .filter(candidate => (
        candidate.distance <= stream.preloadRangeTiles
        || (
          candidate.record.desired
          && candidate.distance <= stream.releaseRangeTiles
        )
      ))
      .sort((a, b) => (
        a.distance - b.distance
        || a.record.view.definition.index - b.record.view.definition.index
      ))
      .slice(0, stream.maxResidentTitans);
    const desiredIds = new Set(
      candidates.map(candidate => candidate.record.view.definition.id)
    );

    this.textureBank.beginSync();
    for (const record of this.records.values()) {
      record.desired = desiredIds.has(record.view.definition.id);
      if (!record.desired) {
        this._detach(record);
        continue;
      }
      for (const assignment of record.assignments) {
        if (this.textureBank.request(assignment.asset)) {
          this._attach(record, assignment);
        }
      }
      this._apply(record);
    }
    this.textureBank.endSync();
    return desiredIds.size > 0;
  }

  _attachReadyAsset(asset) {
    for (const record of this.records.values()) {
      if (!record.desired) continue;
      const assignment = record.assignments.find(candidate => (
        candidate.asset.key === asset.key
      ));
      if (assignment) this._attach(record, assignment);
      this._apply(record);
    }
    this._notifyChanged();
  }

  _attach(record, assignment) {
    const key = assignment.asset.key;
    if (record.layers.has(key) || !this.textureBank.has(key)) return false;
    const image = this.scene.add.image(
      record.view.baseX,
      record.view.chamberCenterY,
      key
    );
    const scale = fitTitanChamberScale(
      image,
      record.view.widthPx * this.config.environmentEnvelope.fitFraction,
      record.view.heightPx * this.config.environmentEnvelope.fitFraction,
      this.config.density.maxSourceScale
    );
    image
      .setDepth(assignment.profile.depth)
      .setScale(scale)
      .setBlendMode(assignment.asset.blendMode)
      .setAlpha(0);
    image.name = (
      `titan-environment-${record.view.definition.id}-`
      + assignment.profile.family
    );
    record.layers.set(key, image);
    record.view.environmentLayers.push(image);
    this.textureBank.addLayer(key);
    return true;
  }

  _apply(record) {
    const view = record.view;
    const stream = this.config.environmentEnvelope;
    const environmentTint = resolveWorldVisualDepthBackdropTint(
      view.zone.centerYTile,
      this.lastLighting,
      WORLD_VISUAL_DEPTH_BACKDROPS
    );
    const tint = mixWorldVisualTint(0xffffff, environmentTint, stream.tintMix);
    const visibility = view.discovered
      ? stream.discoveredAlpha
      : stream.lockedAlpha
        + stream.lockedProgressAlpha * view.coverageProgress;
    for (const assignment of record.assignments) {
      const image = record.layers.get(assignment.asset.key);
      if (!image) continue;
      image
        .setPosition(view.baseX, view.chamberCenterY)
        .setTint(tint)
        .setAlpha(
          assignment.asset.alpha
          * assignment.profile.alphaMultiplier
          * visibility
        );
    }
  }

  _detach(record) {
    if (record.layers.size === 0) return false;
    for (const [key, image] of record.layers.entries()) {
      this.scene.tweens?.killTweensOf?.(image);
      image.destroy?.();
      this.textureBank.removeLayer(key);
    }
    record.layers.clear();
    record.view.environmentLayers = [];
    this._notifyChanged();
    return true;
  }

  _notifyChanged() {
    this.onChanged?.();
  }

  getSnapshot() {
    const records = [...this.records.values()];
    const textureSnapshot = this.textureBank.getSnapshot();
    return {
      enabled: this.enabled,
      ready: !this.enabled || (
        textureSnapshot.failedAssets.length === 0
        && this.missingMappings.length === 0
      ),
      registered: records.length,
      mappedLayers: records.reduce(
        (total, record) => total + record.assignments.length,
        0
      ),
      residentTitans: records.filter(record => record.layers.size > 0).length,
      residentLayers: records.reduce(
        (total, record) => total + record.layers.size,
        0
      ),
      ...textureSnapshot,
      regionIds: [...new Set(
        records.map(record => record.view.definition.regionId)
      )],
      assetVersion: this.config.environmentEnvelope.assetVersion,
      missingMappings: [...this.missingMappings],
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const record of this.records.values()) this._detach(record);
    this.textureBank.destroy();
    this.records.clear();
    this.missingMappings = [];
  }
}

