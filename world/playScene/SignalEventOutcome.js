import { SIGNAL_TRAP, SIGNAL_REWARDS } from "../../values/signalRisk.js";
import { signalGiftReward } from "../../systems/events/signalRiskRules.js";
import { SIGNAL_MIA } from "../../values/signalMia.js";
import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
import { createZeroResourceTotals } from "../../values/resourceTypes.js";
import { quoteSignalGift } from "../../systems/events/signalEventRules.js";
import { isHardcoreMode } from "../../values/hardcoreMode.js";
import { beginHardcorePermanentDeath } from "./HardcoreDeathBridge.js";

export class SignalEventOutcome {
  constructor(scene, director) { this.scene = scene; this.director = director; this.busy = false; }
  async choose(id, choice, selected = {}) {
    const scene = this.scene, active = this.director.state.active;
    if (this.busy || active?.id !== id || active.type !== cfg.type || !active.signal.real
      || !active.signal.discovered || active.signal.pendingDeath) throw new Error("This encounter has already ended.");
    const blast = choice === "blast";
    if (active.signal.explosive !== blast || (blast && active.signal.blastPhase !== "spent"))
      throw new Error("This camp cannot be approached safely.");
    const mia = active.signal.survivorId === SIGNAL_MIA.id;
    if (choice === "rescue" && !mia || choice === "give" && mia) throw new Error("Choose an available action.");
    if (!["give", "attack", "ignore", "rescue", "blast"].includes(choice)) throw new Error("Unknown survivor choice.");
    const gift = choice === "give" ? quoteSignalGift(scene.digSystem.getResourceTotals(), selected) : null;
    const hardcore = isHardcoreMode(scene._hardcoreRuntime?.system?.state);
    const fatal = blast ? active.signal.blastFatal : choice === "attack" && active.signal.fatal;
    const deathSource = blast ? SIGNAL_TRAP.deathSource : cfg.type;
    const reward = gift ? signalGiftReward(scene.digSystem.getResourceTotals(), gift.given, active.startedDepth) : null;
    const requestedStars = fatal ? 0 : reward?.stars ?? (blast ? SIGNAL_TRAP.rewardStars : choice === "attack" ? cfg.rewardStars : 0);
    let grantedStars = 0;
    const snapshot = {
      upgrades: scene.upgradeSystem?.getUpgradeLevels?.(),
      event: this.director.getSaveData(), resources: scene.digSystem.getResourceTotals(),
      talents: scene.celestialTalentProgressionSystem?.getSaveData?.(),
      player: scene.playerController?.getPersistenceData?.(),
      gp: scene.playerController?.getGemPowerExact?.(),
      hardcore: scene._hardcoreRuntime?.system?.getSaveData?.(),
    };
    const restore = () => {
      this.director.loadSaveData(snapshot.event);
      if (snapshot.upgrades) scene.upgradeSystem.setUpgradeLevels(snapshot.upgrades);
      if (snapshot.hardcore) scene._hardcoreRuntime.system.loadSaveData(snapshot.hardcore);
      scene.digSystem.setResourceTotals(snapshot.resources);
      if (snapshot.talents) scene.celestialTalentProgressionSystem.loadSaveData(snapshot.talents);
      if (snapshot.player) scene.playerController?.restorePersistenceData?.(snapshot.player);
      scene.playerController?.setGemPowerExact?.(snapshot.gp, { silent: true, source: "signal-rollback" });
      scene.uiResourceBar?.setResources?.(snapshot.resources);
    };
    const mutate = () => {
      if (choice === "rescue" && !scene.upgradeSystem?.grantUpgrade?.(SIGNAL_MIA.upgradeId)?.success) throw new Error("Mia rescue unavailable.");
      if (gift) scene.digSystem.setResourceTotals(gift.resources);
      if (requestedStars) {
        if (!scene.celestialTalentProgressionSystem?.grantStars) throw new Error("Star currency is unavailable.");
        grantedStars = scene.celestialTalentProgressionSystem.grantStars(requestedStars,
          { source: cfg.type, survivor: active.signal.survivorId, choice });
      }
      if (reward?.generous) scene.playerController.setGemPowerExact(scene.playerController.getGemPowerMax(),
        { silent: true, source: cfg.type });
      if (fatal && !hardcore) {
        scene.digSystem.setResourceTotals(createZeroResourceTotals());
        scene.playerController.setGemPowerExact(0, { silent: true, source: cfg.type });
        scene.playerController.teleportToTile(
          scene.config.playerSpawnTileX ?? scene.config.spawnTileX,
          scene.config.playerSpawnTileY ?? scene.config.spawnTileY);
        scene.lightSystem?.forceTorchOff?.({ manual: true, showStatus: false });
      }
      const history = this.director.state.signalHistory || [];
      this.director.state.signalHistory = [...history, { id, survivorId: active.signal.survivorId,
        choice, count: gift?.count || 0, fatal }].slice(-cfg.historyLimit);
      if (fatal && hardcore) {
        scene._hardcoreRuntime.system.arm(deathSource);
        scene.playerController.setGemPowerExact(0, { silent: true, source: cfg.type });
        active.signal.pendingDeath = true;
        active.signal.deathSource = deathSource;
      }
      else this.director.finish();
      scene.uiResourceBar?.setResources?.(scene.digSystem.getResourceTotals());
      return true;
    };
    this.busy = true;
    try {
      if (scene.gameSaveCoordinator?.transaction) {
        const committed = await scene.gameSaveCoordinator.transaction({ id: "signal:" + id, reason: cfg.type, mutate, rollback: restore });
        if (!committed || committed.success === false) throw new Error(cfg.copy.savedError);
      } else {
        mutate(); scene.queueDugTilesSave?.();
        if (await scene.flushDugTilesSave?.() === false) throw new Error(cfg.copy.savedError);
      }
    } catch (error) {
      restore(); scene.queueDugTilesSave?.(); throw new Error(cfg.copy.savedError);
    } finally { this.busy = false; }
    return { fatal, stars: grantedStars, generous: reward?.generous === true,
      message: blast ? fatal ? SIGNAL_TRAP.copy.failed : SIGNAL_TRAP.copy.escaped(grantedStars)
        : choice === "rescue" ? SIGNAL_MIA.copy.gift : mia && choice === "ignore" ? SIGNAL_MIA.copy.ignore
        : reward ? (reward.generous ? SIGNAL_REWARDS.copy.generous : SIGNAL_REWARDS.copy.gift)(grantedStars)
        : choice === "ignore" ? cfg.copy.leave : fatal ? cfg.copy.lost : cfg.copy.won(grantedStars),
      afterClose: fatal && hardcore ? () => this.finishDeath(deathSource) : fatal && !blast
        ? () => scene.uiNotifications?.warning?.(cfg.copy.lost, { key: "signal-loss" }) : null };
  }
  finishDeath(source = this.director.state.active?.signal?.deathSource || cfg.type) {
    this.scene._hardcoreRuntime?.system?.arm(source);
    const death = beginHardcorePermanentDeath(this.scene, { source });
    if (this.scene._hardcoreDeathInProgress && this.director.state.active?.signal?.pendingDeath) this.director.finish();
    return death;
  }
}
