import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanGuidanceEnabled,
} from "../../values/titanDiscoveryExperience.js";

function distanceToAxis(value, minimum, maximumExclusive) {
  if (value < minimum) return minimum - value;
  if (value >= maximumExclusive) return value - maximumExclusive + 1;
  return 0;
}

function getZoneDistances(playerTile, zone) {
  return {
    horizontal: distanceToAxis(
      playerTile.tx,
      zone.left,
      zone.rightExclusive
    ),
    vertical: distanceToAxis(
      playerTile.ty,
      zone.top,
      zone.bottomExclusive
    ),
  };
}

export class TitanDiscoveryGuidance {
  constructor(scene, config = TITAN_DISCOVERY_EXPERIENCE) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveTitanGuidanceEnabled(config);
    this.nextUpdateAt = 0;
    this.lastTargetId = "";
    this.lastMessage = "";
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
    const candidates = zoneViews
      .filter(view => !discovered.has(view.definition.id))
      .map(view => ({
        view,
        distances: getZoneDistances(playerTile, view.zone),
      }))
      .filter(candidate => (
        candidate.distances.vertical <= guidance.verticalRangeTiles
      ))
      .sort((left, right) => (
        left.distances.vertical - right.distances.vertical
        || left.distances.horizontal - right.distances.horizontal
        || left.view.definition.index - right.view.definition.index
      ));
    const target = candidates[0];
    if (!target) {
      this.lastTargetId = "";
      this.lastMessage = "";
      return null;
    }

    const message = this._formatMessage(
      playerTile,
      target.view.zone,
      target.distances
    );
    this.lastTargetId = target.view.definition.id;
    this.lastMessage = message;
    this.scene.uiNotifications.info(message, {
      key: guidance.notificationKey,
      durationMs: guidance.messageDurationMs,
      priority: guidance.notificationPriority,
      noDedupe: true,
    });
    return target.view.definition;
  }

  _formatMessage(playerTile, zone, distances) {
    const guidance = this.config.guidance;
    if (distances.horizontal === 0 && distances.vertical === 0) {
      return guidance.insideCopy;
    }
    const distance = Math.hypot(distances.horizontal, distances.vertical);
    const parts = [
      distance <= guidance.nearDistanceTiles
        ? guidance.nearbyCopy
        : guidance.resonanceCopy,
    ];
    if (distances.horizontal > 0) {
      const direction = playerTile.tx < zone.left
        ? guidance.eastCopy
        : guidance.westCopy;
      parts.push(
        `${distances.horizontal} ${guidance.tileUnitCopy} ${direction}`
      );
    }
    if (distances.vertical > 0) {
      const direction = playerTile.ty < zone.top
        ? guidance.belowCopy
        : guidance.aboveCopy;
      parts.push(
        `${distances.vertical}${guidance.meterUnitCopy} ${direction}`
      );
    }
    return parts.join(guidance.separatorCopy);
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
    };
  }

  destroy() {
    this.destroyed = true;
    this.lastTargetId = "";
    this.lastMessage = "";
    this.scene = null;
  }
}
