import { ARC_CORE_UPGRADE_ID } from "../../values/arcCoreConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
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
    if (!this.enabled || !playerTile) return;
    this.presentationSystem?.updateObjective?.(playerTile, this.progressionSystem);
    if (this.inTransit) return;
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
    if (interaction.type === "arc-vault") return this._useArcVault(interaction.region);
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
    if (
      region.requiredUpgradeId
      && (this.upgradeSystem?.getUpgradeLevel?.(region.requiredUpgradeId) || 0) <= 0
    ) {
      this.scene.hudSystem?.flashStatus?.(
        this.config.copy.levelLocked.replace("{level}", region.levelId),
        "#aeb7c6",
        1800,
      );
      return { success: true, type: "heavenblock-level-locked", regionId: region.id };
    }
    return this._transitToRegion(
      region,
      !wasActivated || !this.progressionSystem.isRegionVisited(region.id),
    );
  }

  _useArcVault(region) {
    if (!this.progressionSystem.isRegionCompleted(region.id)) {
      return { success: false, reason: "region-incomplete", regionId: region.id };
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
      region,
      firstUnlock,
      delay,
    );
    const scheduled = this._scheduleTeleport(delay, region.arrival, () => {
      const visited = this.progressionSystem.visitRegion(region.id);
      if (visited.changed) this.onChanged?.("region-visited");
      this.scene.hudSystem?.flashStatus?.(
        this.config.copy.arrival
          .replace("{label}", region.label.toUpperCase())
          .replace("{direction}", region.entryDirection)
          .replace("{part}", region.partLabel),
        `#${region.color.toString(16).padStart(6, "0")}`,
        1800,
      );
    });
    if (!scheduled) return { success: false, reason: "no-safe-landing", regionId: region.id };
    return { success: true, type: "heavenblock-ascent", regionId: region.id, firstUnlock };
  }

  _transitToSurface(region) {
    const delay = this._transitionDelay(false);
    this.presentationSystem?.playTransit?.(
      this._interactionWorldPoint(),
      region,
      false,
      delay,
    );
    const scheduled = this._scheduleTeleport(delay, region.surfaceReturn, () => {
      this.scene.hudSystem?.flashStatus?.("SKY ALTAR  •  Routes stabilized", "#f3c969", 1400);
    });
    if (!scheduled) return { success: false, reason: "no-safe-landing", regionId: region.id };
    return { success: true, type: "heavenblock-return", regionId: region.id };
  }

  _scheduleTeleport(delay, target, afterTeleport) {
    const safeTarget = this._findSafeStandingTile(
      target?.tx,
      target?.ty,
      this.config.safeLandingRadiusTiles,
    );
    if (!safeTarget) {
      this.scene.hudSystem?.flashStatus?.("ROUTE BLOCKED  •  No safe landing", "#ff8b8b", 1800);
      return false;
    }
    this.inTransit = true;
    this.presentationSystem?.hidePrompt?.();
    this.playerController?.setControlsEnabled?.(false);
    this.scene.time.delayedCall(delay, () => {
      this.playerController?.teleportToTile?.(safeTarget.tx, safeTarget.ty);
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
    return true;
  }

  _findSafeStandingTile(baseTx, baseTy, maxRadius) {
    if (!Number.isInteger(baseTx) || !Number.isInteger(baseTy)) return null;
    for (let radius = 0; radius <= maxRadius; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const tileX = baseTx + dx;
          const tileY = baseTy + dy;
          if (
            !this.worldModel.inBounds(tileX, tileY)
            || !this.worldModel.inBounds(tileX, tileY + 1)
          ) continue;
          if (!this.worldModel.isSolid(tileX, tileY) && this.worldModel.isSolid(tileX, tileY + 1)) {
            return { tx: tileX, ty: tileY };
          }
        }
      }
    }
    return null;
  }

  handleArtifactMined(artifact) {
    if (!artifact?.success || !artifact.regionId) return false;
    const region = this.config.regions.find((entry) => entry.id === artifact.regionId);
    if (!region) return false;
    if (artifact.changed) {
      this.presentationSystem?.playComponentClaim?.(region);
      this.scene.hudSystem?.flashStatus?.(
        `${region.partLabel.toUpperCase()} ATTUNED  •  ${region.label} complete`,
        `#${region.color.toString(16).padStart(6, "0")}`,
        3000,
      );
      this.onChanged?.("region-completed");
      this._redrawAltars(true);
    }
    return true;
  }

  reconcileMinedArtifacts() {
    const reconciled = [];
    for (const region of this.config.regions) {
      if (this.progressionSystem.isRegionCompleted(region.id)) continue;
      const key = `${region.core.tx},${region.core.ty}`;
      if (
        this.worldModel.getType(region.core.tx, region.core.ty) !== TILE_TYPES.AIR
        || !this.worldModel.dugTiles?.has?.(key)
      ) continue;
      const discovered = this.progressionSystem.discoverPart(region.partId);
      const installed = this.progressionSystem.installPart(region.partId);
      const completed = this.progressionSystem.completeRegion(region.id);
      if (discovered.success && installed.success && completed.success) {
        reconciled.push(region.id);
      }
    }
    if (reconciled.length > 0) {
      this._redrawAltars(true);
      this.onChanged?.("mined-artifacts-reconciled");
    }
    return reconciled;
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
      if (distanceTiles(playerTile, region.returnAltar) <= radius) {
        return { type: "return-altar", region };
      }
      if (
        this.progressionSystem.isRegionCompleted(region.id)
        && distanceTiles(playerTile, region.arcVault) <= radius
      ) {
        return { type: "arc-vault", region };
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
      anchor = interaction.region.arcVault;
      if (this.progressionSystem.isOmegaVaultOpened(interaction.region.vaultId)) {
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
      || this.currentInteraction?.region?.arcVault;
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
      objectiveReady: !this.enabled
        || this.presentationSystem?.getHealthSnapshot?.()?.objectiveReady === true,
      shaftBeaconsReady: !this.enabled
        || this.presentationSystem?.getHealthSnapshot?.()?.shaftBeaconCount
          === this.config.regions.length,
      layoutReady: !this.enabled || (
        layout?.nativeTilesReady === true
        && layout?.levelDistributionReady === true
      ),
      visualReady: !this.enabled
        || this.presentationSystem?.getHealthSnapshot?.()?.worldVisualReady === true,
      progressionReady: !this.enabled || (
        saveData?.version === this.progressionSystem?.config?.version
        && Array.isArray(saveData?.unlockedRegionIds)
        && Array.isArray(saveData?.installedPartIds)
      ),
      inTransit: this.inTransit,
      missingCells: layout?.missingCells || [],
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
