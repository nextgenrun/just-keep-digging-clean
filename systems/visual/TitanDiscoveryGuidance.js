import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanGuidanceEnabled,
} from "../../values/titanDiscoveryExperience.js";
import {
  describeTitanDirection,
  getTitanZoneDistances,
} from "./titanDirection.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { TitanGuidanceIndicator } from "./TitanGuidanceIndicator.js";

export class TitanDiscoveryGuidance {
  constructor(scene, config = TITAN_DISCOVERY_EXPERIENCE) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveTitanGuidanceEnabled(config);
    this.nextUpdateAt = 0;
    this.lastTargetId = "";
    this.lastMessage = "";
    this.lastSource = "";
    this.lastTargetView = null;
    this.lastDirection = null;
    this.indicator = new TitanGuidanceIndicator(scene, config);
    this.destroyed = false;
  }

  update(time, playerTile, zoneViews, discoveredIds) {
    if (this.destroyed) return null;
    if (
      !this.enabled
      || !playerTile
    ) {
      this.indicator.hide();
      return null;
    }
    const discovered = discoveredIds instanceof Set
      ? discoveredIds
      : new Set(discoveredIds || []);
    const guidance = this.config.guidance;
    const activeClueId = this.scene.titanClueSystem?.getActiveClueId?.() || null;
    const displayedClueId = this.lastSource === guidance.clueSourceId
      ? this.lastTargetId
      : null;
    const trackingChanged = activeClueId !== displayedClueId
      && Boolean(activeClueId || displayedClueId);
    const shouldResolve = (
      time >= this.nextUpdateAt
      || !this.lastTargetView
      || discovered.has(this.lastTargetId)
      || trackingChanged
    );
    if (!shouldResolve) {
      this._updateIndicator(time, playerTile);
      return this.lastTargetView?.definition || null;
    }

    this.nextUpdateAt = time + guidance.refreshIntervalMs;
    const clueView = activeClueId
      ? zoneViews.find(view => (
        view.definition.id === activeClueId
        && !discovered.has(view.definition.id)
      ))
      : null;
    const target = clueView
      ? {
        view: clueView,
        distances: getTitanZoneDistances(playerTile, clueView.zone),
        source: guidance.clueSourceId,
      }
      : zoneViews
        .filter(view => !discovered.has(view.definition.id))
        .map(view => ({
          view,
          distances: getTitanZoneDistances(playerTile, view.zone),
          source: guidance.resonanceSourceId,
        }))
        .map(candidate => ({
          ...candidate,
          distanceTiles: Math.hypot(
            candidate.distances.horizontal,
            candidate.distances.vertical,
          ),
        }))
        .filter(candidate => (
          candidate.distanceTiles <= guidance.proximityRangeTiles
        ))
        .sort((left, right) => (
          left.distanceTiles - right.distanceTiles
          || left.distances.vertical - right.distances.vertical
          || left.distances.horizontal - right.distances.horizontal
          || left.view.definition.index - right.view.definition.index
        ))[0];
    if (!target) {
      this._clearTarget();
      return null;
    }

    const direction = describeTitanDirection(
      playerTile,
      target.view.zone,
      target.source === guidance.clueSourceId ? guidance.clueCopy : null,
      this.config
    );
    this.lastTargetId = target.view.definition.id;
    this.lastMessage = direction.message;
    this.lastSource = target.source;
    this.lastTargetView = target.view;
    this.lastDirection = direction;
    this._updateIndicator(time, playerTile);
    return target.view.definition;
  }

  _updateIndicator(time, playerTile) {
    if (!this.lastTargetView) {
      this.indicator.hide();
      return;
    }
    const guidance = this.config.guidance;
    const zone = this.lastTargetView.zone;
    const direction = describeTitanDirection(
      playerTile,
      zone,
      this.lastSource === guidance.clueSourceId
        ? guidance.clueCopy
        : null,
      this.config
    );
    if (!direction) {
      this._clearTarget();
      return;
    }
    this.lastDirection = direction;
    this.lastMessage = direction.message;
    if (
      this.lastSource === guidance.resonanceSourceId
      && direction.distanceTiles > guidance.proximityRangeTiles
    ) {
      this._clearTarget();
      return;
    }
    const tileSize = Number(this.scene?.config?.tileSize)
      || GAME_CONFIG.tileSize;
    const inside = (
      direction.distances.horizontal === 0
      && direction.distances.vertical === 0
    );
    if (inside) {
      this.indicator.hide();
      return;
    }
    const centerXTile = Number.isFinite(zone.centerXTile)
      ? zone.centerXTile
      : (zone.left + zone.rightExclusive) / 2;
    const centerYTile = Number.isFinite(zone.centerYTile)
      ? zone.centerYTile
      : (zone.top + zone.bottomExclusive) / 2;
    this.indicator.show({
      time,
      playerWorld: {
        x: (playerTile.tx + 0.5) * tileSize,
        y: (playerTile.ty + 0.5) * tileSize,
      },
      targetWorld: {
        x: centerXTile * tileSize,
        y: centerYTile * tileSize,
      },
      source: this.lastSource,
    });
  }

  _clearTarget() {
    this.lastTargetId = "";
    this.lastMessage = "";
    this.lastSource = "";
    this.lastTargetView = null;
    this.lastDirection = null;
    this.indicator.hide();
  }

  announceDiscovery(definition) {
    if (!this.enabled || this.destroyed || !definition) return;
    if (definition.id === this.lastTargetId) this._clearTarget();
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      target: this.lastTargetId,
      message: this.lastMessage,
      source: this.lastSource,
      indicator: this.indicator.getSnapshot(),
    };
  }

  destroy() {
    this.destroyed = true;
    this._clearTarget();
    this.indicator.destroy();
    this.scene = null;
  }
}
