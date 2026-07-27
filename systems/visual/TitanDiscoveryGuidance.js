import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanGuidanceEnabled,
} from "../../values/titanDiscoveryExperience.js";
import {
  describeTitanDirection,
  getTitanZoneDistances,
} from "./titanDirection.js";

export class TitanDiscoveryGuidance {
  constructor(scene, config = TITAN_DISCOVERY_EXPERIENCE) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveTitanGuidanceEnabled(config);
    this.nextUpdateAt = 0;
    this.lastTargetId = "";
    this.lastMessage = "";
    this.lastSource = "";
    this.destroyed = false;
  }

  update(time, playerTile, zoneViews, discoveredIds) {
    if (
      !this.enabled
      || this.destroyed
      || !playerTile
      || !this.scene?.uiNotifications
      || time < this.nextUpdateAt
    ) {
      return null;
    }
    const guidance = this.config.guidance;
    this.nextUpdateAt = time + guidance.refreshIntervalMs;
    const discovered = discoveredIds instanceof Set
      ? discoveredIds
      : new Set(discoveredIds || []);
    const activeClueId = this.scene.titanClueSystem?.getActiveClueId?.();
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
        .filter(candidate => (
          candidate.distances.vertical <= guidance.verticalRangeTiles
        ))
        .sort((left, right) => (
          left.distances.vertical - right.distances.vertical
          || left.distances.horizontal - right.distances.horizontal
          || left.view.definition.index - right.view.definition.index
        ))[0];
    if (!target) {
      this.lastTargetId = "";
      this.lastMessage = "";
      this.lastSource = "";
      return null;
    }

    const direction = describeTitanDirection(
      playerTile,
      target.view.zone,
      target.source === guidance.clueSourceId ? guidance.clueCopy : null,
      this.config
    );
    const message = direction.message;
    this.lastTargetId = target.view.definition.id;
    this.lastMessage = message;
    this.lastSource = target.source;
    this.scene.uiNotifications.info(message, {
      key: guidance.notificationKey,
      durationMs: guidance.messageDurationMs,
      priority: guidance.notificationPriority,
      noDedupe: true,
    });
    return target.view.definition;
  }

  announceDiscovery(definition) {
    if (!this.enabled || this.destroyed || !definition) return;
    const guidance = this.config.guidance;
    this.scene.uiNotifications?.success?.(
      `${guidance.discoveredCopy}${guidance.separatorCopy}${definition.name.toUpperCase()}`,
      {
        key: `${guidance.discoveryKeyPrefix}${definition.id}`,
        durationMs: guidance.discoveryDurationMs,
      }
    );
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      target: this.lastTargetId,
      message: this.lastMessage,
      source: this.lastSource,
    };
  }

  destroy() {
    this.destroyed = true;
    this.lastTargetId = "";
    this.lastMessage = "";
    this.lastSource = "";
    this.scene = null;
  }
}
