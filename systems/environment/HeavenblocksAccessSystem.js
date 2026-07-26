import { ARC_CORE_UPGRADE_ID } from "../../values/arcCoreConfig.js";
import {
  HEAVENBLOCKS_ACCESS_CONFIG,
  resolveHeavenblocksGameplayEnabled,
} from "../../values/heavenblocksAccessConfig.js";

const distanceTiles = (a, b) => Math.hypot(a.tx - b.tx, a.ty - b.ty);

export class HeavenblocksAccessSystem {
  constructor(scene, {
    worldModel,
    playerController,
    progressionSystem,
    ancientRelicSystem,
    upgradeSystem,
    presentationSystem,
    onChanged = null,
    config = HEAVENBLOCKS_ACCESS_CONFIG,
  }) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.playerController = playerController;
    this.progressionSystem = progressionSystem;
    this.ancientRelicSystem = ancientRelicSystem;
    this.upgradeSystem = upgradeSystem;
    this.presentationSystem = presentationSystem;
    this.onChanged = typeof onChanged === "function" ? onChanged : null;
    this.config = config;
    this.enabled = resolveHeavenblocksGameplayEnabled(config);
    this.currentInteraction = null;
    this.inTransit = false;
  }

  create() {
    if (!this.enabled) return;
    this.presentationSystem?.create?.();
    this._redrawAltars(true);
  }

  update(playerTile) {
    if (!this.enabled || !playerTile || this.inTransit) return;
    const eligibility = this.progressionSystem?.syncRelicEligibility?.(
      this.ancientRelicSystem?.getCount?.() || 0,
    );
    if (eligibility?.changed) {
      this.scene.hudSystem?.flashStatus?.(
        "THREE RELICS RESONATE  •  The Sky Altar is awake",
        "#f3c969",
        2600,
      );
      this.onChanged?.("relic-milestone");
    }
    this._redrawAltars();
    this.currentInteraction = this._findInteraction(playerTile);
    this._syncPrompt();
  }

  handleInteract() {
    if (!this.enabled || this.inTransit || !this.currentInteraction) {
      return { success: false, reason: this.inTransit ? "transit-in-progress" : "out-of-range" };
    }
    const interaction = this.currentInteraction;
    if (interaction.type === "surface-gate") return this._useSurfaceGate(interaction);
    if (interaction.type === "return-altar") return this._transitToSurface(interaction.region);
    if (interaction.type === "reward-shrine") return this._useRewardShrine(interaction.region);
    return { success: false, reason: "unknown-interaction" };
  }

  _useSurfaceGate(interaction) {
    const { gate, region } = interaction;
    const wasActivated = this.progressionSystem.isSkyGateActivated();
    if (!wasActivated && gate === this.config.surfaceGates[0]) {
      const activation = this.progressionSystem.activateSkyGate(
        this.ancientRelicSystem?.getCount?.() || 0,
      );
      if (!activation.success) {
        this._notifyLockedRelics();
        return { success: true, type: "heavenblock-gate-locked", reason: activation.reason };
      }
      if (activation.changed) this.onChanged?.("sky-gate-activated");
    }
    if (!this.progressionSystem.isRegionUnlocked(region.id)) {
      this.scene.hudSystem?.flashStatus?.(
        `${region.label.toUpperCase()}  •  Complete the Cloud Reef first`,
        "#aeb7c6",
        1800,
      );
      return { success: true, type: "heavenblock-region-locked", regionId: region.id };
    }
    return this._transitToRegion(region, !wasActivated);
  }

  _useRewardShrine(region) {
    if (!this.progressionSystem.isRegionCompleted(region.id)) {
      const discovered = this.progressionSystem.discoverPart(region.partId);
      const installed = this.progressionSystem.installPart(region.partId);
      const completed = this.progressionSystem.completeRegion(region.id);
      if (!discovered.success || !installed.success || !completed.success) {
        return { success: false, reason: "component-progression-failed", regionId: region.id };
      }
      this._playComponentClaimFx(region);
      this.scene.hudSystem?.flashStatus?.(
        `${region.partLabel.toUpperCase()} ATTUNED  •  ${region.label} complete`,
        `#${region.color.toString(16).padStart(6, "0")}`,
        3000,
      );
      this.onChanged?.("region-completed");
      this._redrawAltars(true);
      return {
        success: true,
        type: "heavenblock-component",
        regionId: region.id,
        partId: region.partId,
        newlyUnlockedRegionIds: completed.newlyUnlockedRegionIds || [],
      };
    }

    const ownsArcCore = (this.upgradeSystem?.getUpgradeLevel?.(ARC_CORE_UPGRADE_ID) || 0) > 0;
    if (!ownsArcCore) {
      this.scene.hudSystem?.flashStatus?.(this.config.copy.vaultLocked, "#aeb7c6", 1600);
      return { success: true, type: "heavenblock-vault-locked", regionId: region.id };
    }
    const vault = this.progressionSystem.openOmegaVault(region.vaultId);
    if (!vault.success) return { success: false, reason: vault.reason, regionId: region.id };
    if (vault.changed) {
      this._playVaultFx(region, vault.zenithKeystoneGranted === true);
      this.onChanged?.("omega-vault-opened");
    }
    return {
      success: true,
      type: "heavenblock-omega-vault",
      regionId: region.id,
      ...vault,
    };
  }

  _transitToRegion(region, firstUnlock) {
    const delay = this._transitionDelay(firstUnlock);
    this.presentationSystem?.playTransit?.(
      this._interactionWorldPoint(),
      region.color,
      firstUnlock,
      delay,
    );
    this._scheduleTeleport(delay, region.arrival, () => {
      const visited = this.progressionSystem.visitRegion(region.id);
      if (visited.changed) this.onChanged?.("region-visited");
      this.scene.hudSystem?.flashStatus?.(
        region.label.toUpperCase(),
        `#${region.color.toString(16).padStart(6, "0")}`,
        1800,
      );
    });
    return { success: true, type: "heavenblock-ascent", regionId: region.id, firstUnlock };
  }

  _transitToSurface(region) {
    const delay = this._transitionDelay(false);
    this.presentationSystem?.playTransit?.(
      this._interactionWorldPoint(),
      region.color,
      false,
      delay,
    );
    this._scheduleTeleport(delay, this.config.surfaceReturn, () => {
      this.scene.hudSystem?.flashStatus?.("SKY ALTAR  •  Routes stabilized", "#f3c969", 1400);
    });
    return { success: true, type: "heavenblock-return", regionId: region.id };
  }

  _scheduleTeleport(delay, target, afterTeleport) {
    this.inTransit = true;
    this.presentationSystem?.hidePrompt?.();
    this.playerController?.setControlsEnabled?.(false);
    this.scene.time.delayedCall(delay, () => {
      this.playerController?.teleportToTile?.(target.tx, target.ty);
      this.scene.earthquakeFeedbackUI?.clearEscapeObjective?.();
      this.scene.earthquakeHazardOverlay?.clear?.();
      this.scene.cameras?.main?.flash?.(
        this.config.presentation.transitFlashDurationMs,
        232,
        244,
        255,
      );
      this.playerController?.setControlsEnabled?.(true);
      this.inTransit = false;
      afterTeleport?.();
    });
  }

  _playComponentClaimFx(region) {
    this.presentationSystem?.playComponentClaim?.(region);
  }

  _playVaultFx(region, keystoneGranted) {
    this.presentationSystem?.playVault?.(region, keystoneGranted);
    this.scene.hudSystem?.flashStatus?.(
      keystoneGranted ? "ZENITH KEYSTONE FORGED" : "ARC VAULT RESONANCE CAPTURED",
      keystoneGranted ? "#ffffff" : `#${region.color.toString(16).padStart(6, "0")}`,
      2800,
    );
  }

  _findInteraction(playerTile) {
    const radius = this.config.interactionRadiusTiles;
    for (const gate of this.config.surfaceGates) {
      if (distanceTiles(playerTile, gate) > radius) continue;
      const region = this.config.regions.find((entry) => entry.id === gate.regionId);
      if (region) return { type: "surface-gate", gate, region };
    }
    for (const region of this.config.regions) {
      if (!this.progressionSystem.isRegionUnlocked(region.id)) continue;
      if (distanceTiles(playerTile, region.rewardShrine) <= radius) {
        return { type: "reward-shrine", region };
      }
      if (distanceTiles(playerTile, region.returnAltar) <= radius) {
        return { type: "return-altar", region };
      }
    }
    return null;
  }

  _syncPrompt() {
    const interaction = this.currentInteraction;
    if (!interaction) {
      this.presentationSystem?.hidePrompt?.();
      return;
    }
    let label = "";
    let anchor = interaction.gate || interaction.region.returnAltar;
    if (interaction.type === "surface-gate") {
      const count = this.ancientRelicSystem?.getCount?.() || 0;
      const unlocked = this.progressionSystem.isRegionUnlocked(interaction.region.id);
      if (!this.progressionSystem.isSkyGateActivated() && interaction.gate === this.config.surfaceGates[0]) {
        label = this.progressionSystem.isSkyGateEligible()
          ? this.config.copy.activate
          : this.config.copy.locked
            .replace("{count}", count)
            .replace("{required}", this.config.requiredRelics);
      } else {
        label = unlocked
          ? this.config.copy.ascend.replace("{label}", interaction.region.label)
          : "Route sealed  •  Complete the Cloud Reef";
      }
    } else if (interaction.type === "return-altar") {
      label = this.config.copy.return;
    } else {
      anchor = interaction.region.rewardShrine;
      if (!this.progressionSystem.isRegionCompleted(interaction.region.id)) {
        label = this.config.copy.claimPart.replace("{part}", interaction.region.partLabel);
      } else if (this.progressionSystem.isOmegaVaultOpened(interaction.region.vaultId)) {
        label = "Arc Vault opened";
      } else {
        label = (this.upgradeSystem?.getUpgradeLevel?.(ARC_CORE_UPGRADE_ID) || 0) > 0
          ? this.config.copy.openVault
          : this.config.copy.vaultLocked;
      }
    }
    this.presentationSystem?.setPrompt?.(anchor, label);
  }

  _redrawAltars(force = false) {
    this.presentationSystem?.redrawAltars?.(this.progressionSystem, force);
  }

  _notifyLockedRelics() {
    const count = this.ancientRelicSystem?.getCount?.() || 0;
    this.scene.hudSystem?.flashStatus?.(
      `SKY ALTAR SEALED  •  ${count}/${this.config.requiredRelics} Ancient Relics`,
      "#aeb7c6",
      1800,
    );
  }

  _interactionWorldPoint() {
    const anchor = this.currentInteraction?.gate
      || this.currentInteraction?.region?.returnAltar
      || this.currentInteraction?.region?.rewardShrine;
    return anchor ? this.worldModel.tileToWorld(anchor.tx, anchor.ty) : null;
  }

  _transitionDelay(firstUnlock) {
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (reducedMotion) return this.config.presentation.reducedMotionDelayMs;
    return firstUnlock
      ? this.config.presentation.firstUnlockDelayMs
      : this.config.presentation.revisitDelayMs;
  }

  getHealthSnapshot() {
    const saveData = this.progressionSystem?.getSaveData?.();
    const layout = this.worldModel?.getHeavenblocksLayoutHealth?.();
    return {
      enabled: this.enabled,
      promptReady: !this.enabled
        || this.presentationSystem?.getHealthSnapshot?.()?.promptReady === true,
      layoutReady: !this.enabled || layout?.platformsReady === true,
      progressionReady: !this.enabled || (
        saveData?.version === this.progressionSystem?.config?.version
        && Array.isArray(saveData?.unlockedRegionIds)
        && Array.isArray(saveData?.installedPartIds)
      ),
      inTransit: this.inTransit,
      missingFloorCells: layout?.missingFloorCells || [],
    };
  }

  destroy() {
    this.presentationSystem?.hidePrompt?.();
    this.currentInteraction = null;
    this.inTransit = false;
  }
}

export default HeavenblocksAccessSystem;
