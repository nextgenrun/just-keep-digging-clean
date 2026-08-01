import {
  RANDOM_EVENT_TYPES,
  RANDOM_WORLD_EVENT_CONFIG,
} from "../../values/randomWorldEvents.js";
import { getResourceDisplayName } from "../../values/resourceTypes.js";
import { tileManhattanDistance } from "./RandomEventPlanner.js";

const cfg = RANDOM_WORLD_EVENT_CONFIG;

export class RandomEventActiveRuntime {
  constructor(scene, director, view) {
    this.scene = scene;
    this.director = director;
    this.view = view;
    this.nearestInteraction = null;
    this.choirCueTimers = [];
    this.choirInputLocked = false;
  }

  updateActive(time, playerTile) {
    const active = this.director.state.active;
    if (!active) return;
    if (active.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR && !this._validateChoir(active)) return;
    if (active.type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) this._updateBlackoutLight(active);
    else this.scene.lightSystem?.setRandomEventPresentation?.(null);
    if (active.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) this._showChoirPrompt(active, playerTile);
    else if (active.type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) this._showBlackoutPrompt(active, playerTile);
    else this.view.hidePrompt();
  }

  _validateChoir(active) {
    if ((active.anchors || []).every(anchor => this.scene.worldModel.isDiggable(anchor.tx, anchor.ty))) {
      return true;
    }
    this.scene.uiNotifications?.warning?.("CRYSTAL CHOIR FADES  •  ITS CHAMBER CHANGED", {
      key: "crystal-choir-interrupted",
    });
    this.finish({ interrupted: true });
    return false;
  }

  _updateBlackoutLight(active) {
    const elapsed = cfg.blackoutBloom.durationMs - active.remainingMs;
    let progress = 1;
    if (elapsed < cfg.blackoutBloom.contractionMs) {
      progress = Math.max(0, elapsed / cfg.blackoutBloom.contractionMs);
    } else if (active.remainingMs < cfg.blackoutBloom.restoreMs) {
      progress = Math.max(0, active.remainingMs / cfg.blackoutBloom.restoreMs);
    }
    const ambientScale = 1 - progress * (1 - cfg.blackoutBloom.minimumAmbientScale);
    this.scene.lightSystem?.setRandomEventPresentation?.({ ambientVisibilityScale: ambientScale });
  }

  shouldProtectMineTarget(tile) {
    const active = this.director.state.active;
    return Boolean(active
      && active.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR
      && active.anchors?.some(anchor => anchor.tx === tile?.tx && anchor.ty === tile?.ty));
  }

  shouldConsumeMineTarget(tile) {
    return Boolean(!this.director.state.active?.suspended && this.shouldProtectMineTarget(tile));
  }

  handleMineContact(tile) {
    const active = this.director.state.active;
    if (this.choirInputLocked) return true;
    if (!this.shouldConsumeMineTarget(tile) || !active) return false;
    const index = active.anchors.findIndex(anchor => anchor.tx === tile.tx && anchor.ty === tile.ty);
    const expected = active.sequence[active.progress];
    if (index !== expected) {
      this.director.setProgress(0);
      this.scene.queueDugTilesSave?.();
      this.scene.soundSystem?.playSfx?.("dig-star-0", 0.5, { rate: 0.68 });
      this.scene.uiNotifications?.info?.("CHOIR RESET  •  LISTEN, THEN STRIKE AGAIN", {
        key: "crystal-choir-reset",
        priority: 3,
      });
      this.replayChoir(active);
      return true;
    }
    const nextProgress = active.progress + 1;
    this.director.setProgress(nextProgress);
    this.scene.queueDugTilesSave?.();
    const rate = cfg.crystalChoir.cueRates[index] || 1;
    this.scene.soundSystem?.playSfx?.("dig-star-0", 0.8, { rate });
    if (nextProgress >= active.sequence.length) {
      const reward = cfg.crystalChoir.rewardMoneyBase
        + active.startedDepth * cfg.crystalChoir.rewardMoneyPerDepth;
      this.scene.upgradeSystem?.addMoney?.(reward);
      this.scene.uiNotifications?.success?.(`CRYSTAL CHOIR CACHE  •  +${reward.toLocaleString()}M`, {
        key: "crystal-choir-result",
        priority: 6,
      });
      this.finish();
    }
    return true;
  }

  cancelChoirReplay() {
    this.choirCueTimers.forEach(timer => timer?.remove?.());
    this.choirCueTimers = [];
    this.choirInputLocked = false;
  }

  replayChoir(active) {
    this.cancelChoirReplay();
    this.choirInputLocked = true;
    active.sequence.forEach((anchorIndex, cueIndex) => {
      const timer = this.scene.time.delayedCall(cueIndex * cfg.crystalChoir.cueSpacingMs, () => {
        if (this.director.state.active?.id !== active.id) return;
        this.scene.soundSystem?.playSfx?.("dig-star-0", 0.42, {
          rate: cfg.crystalChoir.cueRates[anchorIndex] || 1,
        });
      });
      this.choirCueTimers.push(timer);
    });
    const unlock = this.scene.time.delayedCall(
      active.sequence.length * cfg.crystalChoir.cueSpacingMs,
      () => {
        if (this.director.state.active?.id !== active.id) return;
        this.choirInputLocked = false;
      },
    );
    this.choirCueTimers.push(unlock);
  }

  getInteractionDistance(playerTile) {
    this.nearestInteraction = null;
    const active = this.director.state.active;
    if (!active || active.suspended || active.type !== RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) return Infinity;
    for (let index = 0; index < active.anchors.length; index += 1) {
      const anchor = active.anchors[index];
      const value = tileManhattanDistance(playerTile, anchor);
      if (!this.nearestInteraction || value < this.nearestInteraction.distance) {
        this.nearestInteraction = { index, anchor, distance: value };
      }
    }
    return this.nearestInteraction?.distance ?? Infinity;
  }

  handleInteract() {
    const active = this.director.state.active;
    const nearest = this.nearestInteraction;
    if (!active || active.type !== RANDOM_EVENT_TYPES.BLACKOUT_BLOOM || !nearest) return false;
    if (nearest.distance > cfg.eligibility.interactDistanceTiles) return false;
    const resources = this.scene.digSystem.getResourceTotals();
    const key = active.targetResource;
    resources[key] = (resources[key] || 0) + cfg.blackoutBloom.rewardResourceAmount;
    this.scene.digSystem.setResourceTotals(resources);
    active.anchors.splice(nearest.index, 1);
    this.director.setProgress(active.progress + 1);
    this.scene.soundSystem?.playSfx?.("reward");
    this.scene.uiNotifications?.success?.(
      `BLACKOUT BLOOM  •  +${cfg.blackoutBloom.rewardResourceAmount} ${getResourceDisplayName(key).toUpperCase()}`,
      { key: `blackout-bloom-${active.progress}`, priority: 4 },
    );
    this.scene.queueDugTilesSave?.();
    this.nearestInteraction = null;
    if (!active.anchors.length) this.finish();
    else this.view.clear();
    return true;
  }

  expire() {
    const active = this.director.state.active;
    if (!active) return;
    if (active.type === RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH) {
      this.scene.uiNotifications?.info?.(cfg.copy.rushEnd(active.bonusMoney), {
        key: "money-rush-end",
        priority: 6,
      });
    }
    this.finish({ interrupted: active.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR });
  }

  finish(options = {}) {
    const finished = this.director.finish(options);
    if (!finished) return null;
    if (finished.type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR) this.cancelChoirReplay();
    this.clearPresentation();
    this.scene.queueDugTilesSave?.();
    return finished;
  }

  syncPresentation(time, playerTile, communication) {
    const active = this.director.state.active;
    if (!active) return this.clearPresentation();
    this.view.sync(active, time, communication);
    if (active.type === RANDOM_EVENT_TYPES.BLACKOUT_BLOOM) this.getInteractionDistance(playerTile);
  }

  _showChoirPrompt(active, playerTile) {
    const expected = active.anchors[active.sequence[active.progress]];
    if (expected && tileManhattanDistance(playerTile, expected) <= 1) {
      this.view.showPrompt(expected, cfg.copy.choirPrompt);
    } else this.view.hidePrompt();
  }

  _showBlackoutPrompt(active, playerTile) {
    const distance = this.getInteractionDistance(playerTile);
    if (distance <= cfg.eligibility.interactDistanceTiles) {
      this.view.showPrompt(this.nearestInteraction.anchor, cfg.copy.blackoutPrompt);
    } else this.view.hidePrompt();
  }

  clearPresentation() {
    this.view.clear();
    this.scene.lightSystem?.setRandomEventPresentation?.(null);
    this.nearestInteraction = null;
  }

  destroy() {
    this.cancelChoirReplay();
    this.clearPresentation();
    this.scene = null;
    this.director = null;
    this.view = null;
  }
}
